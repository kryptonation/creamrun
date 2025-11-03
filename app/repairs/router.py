### app/repairs/router.py

import math
from datetime import date, timedelta
from decimal import Decimal
from io import BytesIO
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import JSONResponse, StreamingResponse
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.dependencies import get_db_with_current_user
from app.bpm.services import bpm_service
from app.repairs.exceptions import InvoiceNotFoundError, RepairError
from app.repairs.schemas import (
    PaginatedRepairInvoiceResponse,
    RepairInvoiceDetailResponse,
    RepairInvoiceListResponse,
    RepairInstallmentResponse,
    RepairInstallmentStatus
)
from app.repairs.models import RepairInstallment
from app.repairs.services import RepairService
from app.leases.services import lease_service
from app.repairs.stubs import create_stub_repair_invoice_response
from app.users.models import User
from app.users.utils import get_current_user
from app.utils.exporter.excel_exporter import ExcelExporter
from app.utils.exporter.pdf_exporter import PDFExporter
from app.utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/payments/vehicle-repairs", tags=["Vehicle Repairs"])

# Dependency to inject the RepairService
def get_repair_service(db: Session = Depends(get_db)) -> RepairService:
    """Provides an instance of RepairService with the current DB session."""
    return RepairService(db)


@router.get("", response_model=PaginatedRepairInvoiceResponse, summary="List Vehicle Repair Invoices")
def list_repair_invoices(
    use_stubs: bool = Query(False, description="Return stubbed data for testing."),
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=100),
    sort_by: Optional[str] = Query("date"),
    sort_order: str = Query("desc", enum=["asc", "desc"]),
    repair_id: Optional[str] = Query(None),
    invoice_number: Optional[str] = Query(None),
    invoice_date: Optional[date] = Query(None),
    status: Optional[str] = Query(None),
    driver_name: Optional[str] = Query(None),
    medallion_no: Optional[str] = Query(None),
    repair_service: RepairService = Depends(get_repair_service),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieves a paginated and filterable list of all vehicle repair invoices.
    """
    if use_stubs:
        return create_stub_repair_invoice_response(page, per_page)
    
    try:
        invoices, total_items = repair_service.repo.list_invoices(
            page=page, per_page=per_page, sort_by=sort_by, sort_order=sort_order,
            repair_id=repair_id, invoice_number=invoice_number, date=invoice_date,
            status=status, driver_name=driver_name, medallion_no=medallion_no
        )

        response_items = [
            RepairInvoiceListResponse(
                repair_id=inv.repair_id,
                invoice_number=inv.invoice_number,
                invoice_date=inv.invoice_date,
                status=inv.status,
                driver_name=inv.driver.full_name if inv.driver else "N/A",
                medallion_no=inv.medallion.medallion_number if inv.medallion else "N/A",
                lease_type=inv.lease.lease_type if inv.lease else "N/A",
                workshop_type=inv.workshop_type,
                total_amount=inv.total_amount,
            ) for inv in invoices
        ]
        
        total_pages = math.ceil(total_items / per_page) if per_page > 0 else 0

        return PaginatedRepairInvoiceResponse(
            items=response_items, total_items=total_items, page=page,
            per_page=per_page, total_pages=total_pages
        )
    except Exception as e:
        logger.error("Error fetching repair invoices: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="An error occurred while fetching repair invoices.") from e


@router.post("/create-case", summary="Create a New Repair Invoice Case", status_code=status.HTTP_201_CREATED)
def create_repair_invoice_case(
    db: Session = Depends(get_db_with_current_user),
    current_user: User = Depends(get_current_user),
):
    """
    Initiates a new BPM workflow for manually creating a Vehicle Repair Invoice.
    """
    try:
        new_case = bpm_service.create_case(db, prefix="RPRINV", user=current_user)
        return {
            "message": "New Create Repair Invoice case started successfully.",
            "case_no": new_case.case_no,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        logger.error("Error creating repair invoice case: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Could not start a new repair invoice case.") from e


@router.get("/{repair_id}", response_model=RepairInvoiceDetailResponse, summary="View Repair Invoice Details")
def get_repair_invoice_details(
    repair_id: str,
    repair_service: RepairService = Depends(get_repair_service),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieves the detailed view of a single repair invoice, including its payment schedule.
    """
    try:
        invoice = repair_service.repo.get_invoice_by_repair_id(repair_id)
        if not invoice:
            raise InvoiceNotFoundError(repair_id)

        total_paid = sum(
            inst.principal_amount for inst in invoice.installments if inst.status == RepairInstallmentStatus.PAID
        )
        remaining_balance = invoice.total_amount - total_paid
        installments_progress = f"{len([i for i in invoice.installments if i.status == RepairInstallmentStatus.PAID])}/{len(invoice.installments)}"

        # Prepare detailed information cards
        driver_details = {
            "name": invoice.driver.full_name,
            "ssn": f"XXX-XX-{invoice.driver.ssn[-4:]}" if invoice.driver.ssn else "N/A",
            "address": f"{invoice.driver.primary_driver_address.address_line_1}, {invoice.driver.primary_driver_address.city}",
            "phone": invoice.driver.phone_number_1,
            "dob": invoice.driver.dob,
            "dmv_license_no": invoice.driver.dmv_license.dmv_license_number if invoice.driver.dmv_license else "N/A",
            "dmv_expiry": invoice.driver.dmv_license.dmv_license_expiry_date if invoice.driver.dmv_license else "N/A",
            "tlc_license_no": invoice.driver.tlc_license.tlc_license_number if invoice.driver.tlc_license else "N/A",
        }
        
        vehicle_details = {
            "name": f"{invoice.vehicle.year} {invoice.vehicle.make} {invoice.vehicle.model}",
            "vin": invoice.vehicle.vin,
            "entity_name": invoice.vehicle.vehicle_entity.entity_name if invoice.vehicle.vehicle_entity else "N/A",
            "tsp": invoice.vehicle.tsp,
            "security_type": invoice.vehicle.security_type,
            "model": invoice.vehicle.model,
            "make": invoice.vehicle.make,
            "year": invoice.vehicle.year,
            "color": invoice.vehicle.color,
            "cylinder": invoice.vehicle.cylinders,
        }
        
        lease_details = {
            "name": f"Lease - {invoice.lease.lease_type.upper()}",
            "lease_id": invoice.lease.lease_id,
            "type": invoice.lease.lease_type,
            "total_weeks": invoice.lease.duration_in_weeks,
            "start_date": invoice.lease.lease_start_date,
            "end_date": invoice.lease.lease_end_date,
            "weekly_lease": lease_service.get_lease_configurations(repair_service.db, lease_id=invoice.lease_id, lease_breakup_type="lease_amount").lease_limit,
            "repairs": "Driver", # Placeholder, logic to determine this may be needed
        }

        # Prepare payment schedule
        schedule_response = []
        balance = invoice.total_amount
        prior_balance_agg = Decimal("0.0")
        for inst in sorted(invoice.installments, key=lambda x: x.week_start_date):
            balance -= inst.principal_amount
            schedule_response.append(
                RepairInstallmentResponse(
                    installment_id=inst.installment_id,
                    week_period=f"{inst.week_start_date.strftime('%m/%d/%Y')} - {inst.week_end_date.strftime('%m/%d/%Y')}",
                    principal_amount=inst.principal_amount,
                    prior_balance=prior_balance_agg,
                    balance=balance,
                    status=inst.status,
                    posted_on=inst.posted_on.date() if inst.posted_on else None,
                )
            )
            if inst.status == RepairInstallmentStatus.PAID:
                prior_balance_agg += inst.principal_amount


        return RepairInvoiceDetailResponse(
            repair_id=invoice.repair_id,
            total_amount=invoice.total_amount,
            total_paid=total_paid,
            remaining_balance=remaining_balance,
            installments_progress=installments_progress,
            repair_invoice_details={
                "repair_id": invoice.repair_id,
                "invoice_number": invoice.invoice_number,
                "invoice_date": invoice.invoice_date,
                "start_week": invoice.start_week,
                "workshop_type": invoice.workshop_type,
                "notes": invoice.description,
            },
            driver_details=driver_details,
            vehicle_details=vehicle_details,
            lease_details=lease_details,
            payment_schedule=schedule_response,
        )

    except InvoiceNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e)) from e
    except Exception as e:
        logger.error(f"Error fetching details for repair ID {repair_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="An error occurred while fetching repair invoice details.") from e

@router.post("/{repair_id}/post-installment", summary="Manually Post a Due Installment to Ledger")
def post_installment_manually(
    repair_id: str,
    installment_id: str,
    repair_service: RepairService = Depends(get_repair_service),
    current_user: User = Depends(get_current_user),
):
    """
    Manually triggers the posting of a single, due repair installment to the ledger.
    """
    # This is a simplified version. A full implementation would check for user permissions.
    try:
        # The service will handle the logic of finding and posting the specific installment
        # For now, we can simulate this by re-using the main posting logic
        # A more direct method could be added to the service if needed.
        result = repair_service.post_due_installments_to_ledger()
        
        # Check if the specific installment was posted
        installment = repair_service.db.query(RepairInstallment).filter(RepairInstallment.installment_id == installment_id).first()
        if installment and installment.status == RepairInstallmentStatus.POSTED:
             return JSONResponse(content={"message": f"Installment {installment_id} successfully posted to ledger."})
        else:
            raise HTTPException(status_code=400, detail=f"Could not post installment {installment_id}. It may not be due or is already posted.")

    except RepairError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        logger.error(f"Error manually posting installment {installment_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="An error occurred during ledger posting.") from e

@router.get("/export", summary="Export Vehicle Repairs Data")
def export_repairs(
    format: str = Query("excel", enum=["excel", "pdf"]),
    # Pass through all filters from the list endpoint
    sort_by: Optional[str] = Query("date"),
    sort_order: str = Query("desc"),
    repair_id: Optional[str] = Query(None),
    invoice_number: Optional[str] = Query(None),
    date: Optional[date] = Query(None),
    status: Optional[str] = Query(None),
    driver_name: Optional[str] = Query(None),
    medallion_no: Optional[str] = Query(None),
    repair_service: RepairService = Depends(get_repair_service),
    current_user: User = Depends(get_current_user),
):
    """
    Exports filtered vehicle repair data to the specified format.
    """
    try:
        invoices, _ = repair_service.repo.list_invoices(
            page=1, per_page=10000, sort_by=sort_by, sort_order=sort_order,
            repair_id=repair_id, invoice_number=invoice_number, date=date,
            status=status, driver_name=driver_name, medallion_no=medallion_no
        )

        if not invoices:
            raise HTTPException(status_code=404, detail="No repair data available for export with the given filters.")

        export_data = [RepairInvoiceListResponse.model_validate(inv).model_dump() for inv in invoices]
        
        filename = f"vehicle_repairs_{date.today()}.{'xlsx' if format == 'excel' else 'pdf'}"
        
        if format == "excel":
            exporter = ExcelExporter(export_data)
            file_content = exporter.export()
            media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        else: # PDF
            exporter = PDFExporter(export_data)
            file_content = exporter.export()
            media_type = "application/pdf"
        
        headers = {"Content-Disposition": f"attachment; filename={filename}"}
        return StreamingResponse(file_content, media_type=media_type, headers=headers)

    except Exception as e:
        logger.error("Error exporting repair data: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="An error occurred during the export process.") from e