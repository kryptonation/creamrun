### app/interim_payments/router.py

import math
from datetime import date
from io import BytesIO
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.bpm.services import bpm_service
from app.core.db import get_db
from app.core.dependencies import get_db_with_current_user
from app.interim_payments.exceptions import InterimPaymentError
from app.interim_payments.schemas import (
    InterimPaymentResponse,
    PaginatedInterimPaymentResponse,
)
from app.interim_payments.models import PaymentMethod
from app.interim_payments.services import InterimPaymentService
from app.interim_payments.stubs import create_stub_interim_payments_response
from app.users.models import User
from app.users.utils import get_current_user
from app.utils.exporter.excel_exporter import ExcelExporter
from app.utils.exporter.pdf_exporter import PDFExporter
from app.utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/payments/interim-payments", tags=["Interim Payments"])

# Dependency to inject the InterimPaymentService
def get_interim_payment_service(db: Session = Depends(get_db)) -> InterimPaymentService:
    """Provides an instance of InterimPaymentService with the current DB session."""
    return InterimPaymentService(db)


@router.post("/create-case", summary="Create a New Interim Payment Case", status_code=status.HTTP_201_CREATED)
def create_interim_payment_case(
    db: Session = Depends(get_db_with_current_user),
    current_user: User = Depends(get_current_user),
):
    """
    Initiates a new BPM workflow for creating an Interim Payment.
    """
    try:
        new_case = bpm_service.create_case(db, prefix="INTPAY", user=current_user)
        return {
            "message": "New Interim Payment case started successfully.",
            "case_no": new_case.case_no,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        logger.error("Error creating interim payment case: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Could not start a new interim payment case.") from e


@router.get("", response_model=PaginatedInterimPaymentResponse, summary="List Interim Payments")
def list_interim_payments(
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=100),
    sort_by: Optional[str] = Query("payment_date"),
    sort_order: str = Query("desc", enum=["asc", "desc"]),
    payment_id: Optional[str] = Query(None),
    driver_name: Optional[str] = Query(None),
    tlc_license: Optional[str] = Query(None),
    lease_id: Optional[str] = Query(None),
    medallion_no: Optional[str] = Query(None),
    payment_date: Optional[date] = Query(None),
    # New filters
    category: Optional[str] = Query(None, description="Filter by allocation category"),
    reference_id: Optional[str] = Query(None, description="Filter by allocation reference ID"),
    amount_from: Optional[float] = Query(None, ge=0, description="Filter by minimum amount"),
    amount_to: Optional[float] = Query(None, ge=0, description="Filter by maximum amount"),
    payment_date_from: Optional[date] = Query(None, description="Filter by payment date from"),
    payment_date_to: Optional[date] = Query(None, description="Filter by payment date to"),
    payment_method: Optional[str] = Query(None, description="Filter by payment method"),
    payment_service: InterimPaymentService = Depends(get_interim_payment_service),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieves a paginated and filterable list of all interim payments.
    """
    try:
        # Return stub data for now
        # return create_stub_interim_payments_response(page=page, per_page=per_page)
        
        payments, total_items = payment_service.repo.list_payments(
            page=page, per_page=per_page, sort_by=sort_by, sort_order=sort_order,
            payment_id=payment_id, driver_name=driver_name, tlc_license=tlc_license,
            lease_id=lease_id, medallion_no=medallion_no, payment_date=payment_date,
            # New filters
            category=category, reference_id=reference_id,
            amount_from=amount_from, amount_to=amount_to,
            payment_date_from=payment_date_from, payment_date_to=payment_date_to,
            payment_method=payment_method
        )
        
        # Get available values for dropdowns
        available_categories = payment_service.repo.get_available_categories()
        available_payment_methods = [method.value for method in PaymentMethod]
        
        # Flatten the detailed allocation data for the list view
        response_items = []
        for payment in payments:
            if payment.allocations:
                for alloc in payment.allocations:
                    response_items.append(InterimPaymentResponse(
                        payment_id_display=payment.payment_id,
                        tlc_license=payment.driver.tlc_license.tlc_license_number if payment.driver and payment.driver.tlc_license else "N/A",
                        lease_id=payment.lease.lease_id,
                        category=alloc['category'],
                        reference_id=alloc['reference_id'],
                        amount=alloc['amount'],
                        payment_date=payment.payment_date,
                        payment_method=payment.payment_method,
                    ))
        
        total_pages = math.ceil(total_items / per_page) if per_page > 0 else 0
        
        return PaginatedInterimPaymentResponse(
            items=response_items, total_items=total_items, page=page,
            per_page=per_page, total_pages=total_pages,
            available_categories=available_categories,
            available_payment_methods=available_payment_methods
        )
    except Exception as e:
        logger.error("Error fetching interim payments: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="An error occurred while fetching interim payments.") from e


@router.get("/export", summary="Export Interim Payments Data")
def export_interim_payments(
    export_format: str = Query("excel", enum=["excel", "pdf"]),
    # Pass through all filters from the list endpoint
    sort_by: Optional[str] = Query("payment_date"),
    sort_order: str = Query("desc"),
    payment_id: Optional[str] = Query(None),
    driver_name: Optional[str] = Query(None),
    tlc_license: Optional[str] = Query(None),
    lease_id: Optional[str] = Query(None),
    medallion_no: Optional[str] = Query(None),
    payment_date: Optional[date] = Query(None),
    # New filters
    category: Optional[str] = Query(None, description="Filter by allocation category"),
    reference_id: Optional[str] = Query(None, description="Filter by allocation reference ID"),
    amount_from: Optional[float] = Query(None, ge=0, description="Filter by minimum amount"),
    amount_to: Optional[float] = Query(None, ge=0, description="Filter by maximum amount"),
    payment_date_from: Optional[date] = Query(None, description="Filter by payment date from"),
    payment_date_to: Optional[date] = Query(None, description="Filter by payment date to"),
    payment_method: Optional[str] = Query(None, description="Filter by payment method"),
    payment_service: InterimPaymentService = Depends(get_interim_payment_service),
    current_user: User = Depends(get_current_user),
):
    """
    Exports filtered interim payment data to the specified format.
    """
    try:
        payments, _ = payment_service.repo.list_payments(
            page=1, per_page=10000, sort_by=sort_by, sort_order=sort_order,
            payment_id=payment_id, driver_name=driver_name, tlc_license=tlc_license,
            lease_id=lease_id, medallion_no=medallion_no, payment_date=payment_date,
            # New filters
            category=category, reference_id=reference_id,
            amount_from=amount_from, amount_to=amount_to,
            payment_date_from=payment_date_from, payment_date_to=payment_date_to,
            payment_method=payment_method
        )

        if not payments:
            raise HTTPException(status_code=404, detail="No interim payment data available for export with the given filters.")

        # Flatten the data for export
        export_data = []
        for payment in payments:
            if payment.allocations:
                for alloc in payment.allocations:
                    export_data.append({
                        "Payment ID": payment.payment_id,
                        "TLC License": payment.driver.tlc_license.tlc_license_number if payment.driver and payment.driver.tlc_license else "N/A",
                        "Lease ID": payment.lease.lease_id,
                        "Category": alloc['category'],
                        "Reference ID": alloc['reference_id'],
                        "Amount": float(alloc['amount']),
                        "Payment Date": payment.payment_date.strftime("%Y-%m-%d %H:%M:%S"),
                        "Payment Method": payment.payment_method.value,
                    })
        
        filename = f"interim_payments_{date.today()}.{'xlsx' if export_format == 'excel' else 'pdf'}"
        
        if export_format == "excel":
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
        logger.error("Error exporting interim payment data: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="An error occurred during the export process.") from e