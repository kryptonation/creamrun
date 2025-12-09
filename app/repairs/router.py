### app/repairs/router.py

import math
from datetime import date , datetime
from decimal import Decimal
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
    RepairInstallmentStatus,
    RepairInstallmentListResponse,
    PaginatedRepairInstallmentResponse,
)
from app.repairs.models import RepairInstallment , RepairInvoice
from app.repairs.services import RepairService
from app.leases.services import lease_service
from app.repairs.stubs import create_stub_repair_invoice_response, create_stub_repair_installment_response
from app.users.models import User
from app.users.utils import get_current_user
from app.utils.exporter_utils import ExporterFactory
from app.utils.logger import get_logger
from app.loans.schemas import PostInstallmentRequest , PostInstallmentResponse

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
    from_invoice_date: Optional[date] = Query(None),
    to_invoice_date: Optional[date] = Query(None),
    lease_type: Optional[str] = Query(None),
    workshop_type: Optional[str] = Query(None),
    from_total_amount: Optional[Decimal] = Query(None),
    to_total_amount: Optional[Decimal] = Query(None),
    status: Optional[str] = Query(None),
    driver_name: Optional[str] = Query(None),
    medallion_no: Optional[str] = Query(None),
    lease_id: Optional[str] = Query(None),
    vin: Optional[str] = Query(None),
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
            repair_id=repair_id, invoice_number=invoice_number, from_invoice_date=from_invoice_date,
            to_invoice_date=to_invoice_date, lease_type=lease_type, workshop_type=workshop_type,
            from_total_amount=from_total_amount, to_total_amount=to_total_amount,
            status=status, driver_name=driver_name, medallion_no=medallion_no , lease_id=lease_id,
            vin=vin
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

@router.post("/ledger/post-installment", summary="Manually Post a Due Installment to Ledger")
def post_installment_manually(
    request: PostInstallmentRequest,
    repair_service: RepairService = Depends(get_repair_service),
    current_user: User = Depends(get_current_user),
):
    """
    Manually posts loan installments to the centralized ledger.

    **Example Requests:**
    
    ```json
    // Post specific installments
    {
      "installment_ids": ["DLN-2025-001-01", "DLN-2025-001-02", "DLN-2025-002-01"]
    }
    
    // Post all due installments
    {
      "post_all_due": true
    }
    ```
    """

    # This is a simplified version. A full implementation would check for user permissions.
    logger.info(
        f"User {current_user.id} initiated manual loan installment posting. "
        f"Mode: {'all_due' if request.post_all_due else 'specific_ids'}"
    )
    try:
        # Validate request
        if not request.installment_ids and not request.post_all_due:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Either provide installment_ids or set post_all_due=True"
            )
        
        if request.installment_ids and request.post_all_due:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot specify both installment_ids and post_all_due. Choose one mode."
            )

        result , successful_count , failed_count = repair_service.post_due_installments_to_ledger(
            installment_ids=request.installment_ids,
            post_all_due=request.post_all_due
        )
        
        # Check if the specific installment was posted
        total_processed = successful_count + failed_count
        if failed_count == 0:
            message = f"Successfully posted all {successful_count} installments to ledger."
        elif successful_count == 0:
            message = f"Failed to post all {failed_count} installments"
        else:
            message = f"Posted {successful_count} out of {total_processed} installments. {failed_count} failed."

        logger.info(
            f"Loan installment posting completed. "
            f"Success: {successful_count}, Failed: {failed_count}"
        )

        return PostInstallmentResponse(
            total_processed=total_processed,
            successful_posts=successful_count,
            failed_posts=failed_count,
            results = result,
            message=message,
        )
    except RepairError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        logger.error("Error posting loan installment manually: %s", e, exc_info=True)
        raise e

@router.get("/list/export", summary="Export Vehicle Repairs Data")
def export_repairs(
    export_format: str = Query("excel", enum=["excel", "pdf" , "csv"], alias="format"),
    sort_by: Optional[str] = Query("date"),
    sort_order: str = Query("desc"),
    repair_id: Optional[str] = Query(None),
    invoice_number: Optional[str] = Query(None),
    from_invoice_date: Optional[date] = Query(None),
    to_invoice_date: Optional[date] = Query(None),
    status: Optional[str] = Query(None),
    driver_name: Optional[str] = Query(None),
    medallion_no: Optional[str] = Query(None),
    repair_service: RepairService = Depends(get_repair_service),
    _current_user: User = Depends(get_current_user),
):
    """
    Exports filtered vehicle repair data to the specified format (Excel or PDF).
    """
    try:
        invoices, _ = repair_service.repo.list_invoices(
            page=1, per_page=10000, sort_by=sort_by, sort_order=sort_order,
            repair_id=repair_id, invoice_number=invoice_number,
            from_invoice_date=from_invoice_date, to_invoice_date=to_invoice_date,
            status=status, driver_name=driver_name, medallion_no=medallion_no
        )

        if not invoices:
            raise ValueError("No repair data available for export with the given filters.")

        export_data = [
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
            ).model_dump(exclude={"id"}) for inv in invoices
        ]
        
        filename = f"vehicle_repairs_{date.today()}.{'xlsx' if export_format == 'excel' else export_format}"

        exporter = ExporterFactory.get_exporter(export_format, export_data)
        file_content = exporter.export()

        media_types = {
            "excel": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "pdf": "application/pdf"
        }
        media_type = media_types.get(export_format, "application/octet-stream")

        headers = {"Content-Disposition": f"attachment; filename={filename}"}
        return StreamingResponse(file_content, media_type=media_type, headers=headers)

    except RepairError as e:
        logger.warning("Business logic error during repair export: %s", e)
        raise HTTPException(status_code=400, detail=str(e)) from e

    except Exception as e:
        logger.error("Error exporting repair data: %s", e, exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="An error occurred during the export process.",
        ) from e
    

@router.get("/fetch/installments", response_model=PaginatedRepairInstallmentResponse, summary="List Repair Installments")
def list_repair_installments(
    use_stubs: bool = Query(False, description="Return stubbed data for testing."),
    page: int = Query(1, ge=1, description="Page number for pagination."),
    per_page: int = Query(10, ge=1, le=100, description="Items per page."),
    sort_by: Optional[str] = Query("week_start_date", description="Field to sort by."),
    sort_order: str = Query("asc" , enum=["asc", "desc"]),
    repair_id: Optional[str] = Query(None, description="Filter by Repair ID."),
    lease_id: Optional[int] = Query(None, description="Filter by Lease ID."),
    driver_id: Optional[int] = Query(None, description="Filter by Driver ID."),
    medallion_id: Optional[int] = Query(None, description="Filter by Medallion ID."),
    vehicle_id: Optional[int] = Query(None, description="Filter by Vehicle ID."),
    status: Optional[str] = Query(None, description="Filter by Installment Status."),
    repair_service: RepairService = Depends(get_repair_service),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieves a paginated, sorted, and filtered list of repair installments.
    Supports filtering by repair_id, lease_id, driver_id, medallion_id, vehicle_id, or status.
    """
    if use_stubs:
        return create_stub_repair_installment_response(page, per_page)
    
    try:
        installments, total_items = repair_service.repo.list_installments(
            page=page,
            per_page=per_page,
            sort_by=sort_by,
            sort_order=sort_order,
            repair_id=repair_id,
            lease_id=lease_id,
            driver_id=driver_id,
            medallion_id=medallion_id,
            vehicle_id=vehicle_id,
            status=status,
        )

        # Calculate balance for each installment
        response_items = []
        balance = Decimal('0')
        
        for inst in installments:
            # balance accumulates as we go through installments (assuming sorted by week)
            # Calculate remaining balance: total invoice amount - sum of all paid installments
            total_paid = sum(
                i.principal_amount for i in inst.invoice.installments 
                if i.status != i.week_start_date <= inst.week_start_date
            )
            balance = inst.invoice.total_amount - total_paid
            
            response_items.append(
                RepairInstallmentListResponse(
                    installment_id=inst.installment_id,
                    repair_id=inst.invoice.repair_id,
                    invoice_number=inst.invoice.invoice_number,
                    driver_name=inst.invoice.driver.full_name if inst.invoice.driver else None,
                    medallion_no=inst.invoice.medallion.medallion_number if inst.invoice.medallion else None,
                    lease_id=inst.invoice.lease.lease_id if inst.invoice.lease else None,
                    vehicle_id=inst.invoice.vehicle_id,
                    week_start_date=inst.week_start_date,
                    week_end_date=inst.week_end_date,
                    principal_amount=inst.principal_amount,
                    balance=balance,
                    status=inst.status,
                    posted_on=inst.posted_on.date() if inst.posted_on else None,
                    ledger_posting_ref=inst.ledger_posting_ref,
                    workshop_type=inst.invoice.workshop_type if inst.invoice else None,
                )
            )
        
        total_pages = math.ceil(total_items / per_page) if per_page > 0 else 0

        return PaginatedRepairInstallmentResponse(
            items=response_items,
            total_items=total_items,
            page=page,
            per_page=per_page,
            total_pages=total_pages
        )
    except Exception as e:
        logger.error("Error fetching repair installments: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="An error occurred while fetching repair installments.") from e