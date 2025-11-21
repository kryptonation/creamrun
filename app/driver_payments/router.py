# app/driver_payments/router.py

import math
from datetime import date, datetime
from io import BytesIO
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.users.models import User
from app.users.utils import get_current_user
from app.utils.logger import get_logger

# Import DTR model from app.dtr
from app.dtr.models import DTRStatus
from app.dtr.services import DTRService
from app.dtr.pdf_generator import DTRPDFGenerator
from app.dtr.schemas import DTRResponse

# Import ACH-specific models from driver_payments
from app.driver_payments.models import (
    ACHBatchStatus, PaymentType
)
from app.driver_payments.ach_batch_service import ACHBatchService
from app.driver_payments.schemas import (
    ACHBatchCreateRequest, ACHBatchResponse, ACHBatchDetailResponse,
    PaginatedACHBatchResponse, CheckPaymentRequest,
    BatchReversalRequest, GenerateDTRsRequest
)
from pydantic import BaseModel
from typing import List
from app.driver_payments.exceptions import (
    ACHBatchNotFoundError, MissingBankInformationError,
    ACHBatchReversalError, CompanyBankConfigError
)

logger = get_logger(__name__)
router = APIRouter(prefix="/payments/driver-payments", tags=["Driver Payments"])


# Local schema for pagination
class PaginatedDTRResponse(BaseModel):
    """Paginated list of DTRs."""
    items: List[DTRResponse]
    total_items: int
    page: int
    per_page: int
    total_pages: int


# Dependencies
def get_dtr_service(db: Session = Depends(get_db)) -> DTRService:
    """Provides DTRService instance"""
    return DTRService(db)


def get_ach_service(db: Session = Depends(get_db)) -> ACHBatchService:
    """Provides ACHBatchService instance"""
    return ACHBatchService(db)


# DTR ENDPOINTS (Using app.dtr.models.DTR)

@router.get("", response_model=PaginatedDTRResponse, summary="List Driver Transaction Receipts")
def list_dtrs(
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=100),
    sort_by: str = Query("period_end_date"),
    sort_order: str = Query("desc", regex="^(asc|desc)$"),
    receipt_number: Optional[str] = Query(None),
    driver_name: Optional[str] = Query(None),
    tlc_license: Optional[str] = Query(None),
    medallion_no: Optional[str] = Query(None),
    plate_number: Optional[str] = Query(None),
    period_start_date: Optional[date] = Query(None),
    period_end_date: Optional[date] = Query(None),
    payment_type: Optional[PaymentType] = Query(None),
    dtr_status: Optional[DTRStatus] = Query(None),
    is_paid: Optional[bool] = Query(None, description="Filter by payment status"),
    ach_batch_number: Optional[str] = Query(None),
    check_number: Optional[str] = Query(None),
    dtr_service: DTRService = Depends(get_dtr_service),
    _current_user: User = Depends(get_current_user),
):
    """
    List all Driver Transaction Receipts with filtering and pagination.
    Uses consolidated DTR model from app.dtr
    """
    try:
        dtrs, total_items = dtr_service.repository.search_dtrs(
            receipt_number=receipt_number,
            driver_name=driver_name,
            tlc_license=tlc_license,
            medallion_no=medallion_no,
            plate_number=plate_number,
            period_start_from=period_start_date,
            period_start_to=period_end_date,
            status=dtr_status,
            ach_batch_number=ach_batch_number,
            check_number=check_number,
            sort_by=sort_by,
            sort_order=sort_order,
            page=page,
            page_size=per_page
        )
        
        # Map DTR to response schema
        response_items = [DTRResponse.model_validate(dtr) for dtr in dtrs]
        
        total_pages = math.ceil(total_items / per_page) if per_page > 0 else 0
        
        return PaginatedDTRResponse(
            items=response_items,
            total_items=total_items,
            page=page,
            per_page=per_page,
            total_pages=total_pages
        )
    
    except Exception as e:
        logger.error("Error fetching DTRs", error=e, exc_info=True)
        raise HTTPException(status_code=500, detail="An error occurred while fetching DTRs.") from e


@router.get("/{dtr_id}", response_model=DTRResponse, summary="Get DTR by ID")
def get_dtr(
    dtr_id: int,
    dtr_service: DTRService = Depends(get_dtr_service),
    _current_user: User = Depends(get_current_user),
):
    """Get a single DTR by ID"""
    try:
        dtr = dtr_service.repository.get_by_id(dtr_id)
        
        if not dtr:
            raise HTTPException(status_code=404, detail=f"DTR with ID {dtr_id} not found")
        
        return DTRResponse.model_validate(dtr)
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error fetching DTR", error=e, exc_info=True)
        raise HTTPException(status_code=500, detail="An error occurred while fetching the DTR.") from e


@router.get("/{dtr_id}/pdf", response_class=StreamingResponse)
def download_dtr_pdf(
    dtr_id: int,
    dtr_service: DTRService = Depends(get_dtr_service),
    _current_user: User = Depends(get_current_user),
):
    """Generate and download DTR as PDF"""
    try:
        dtr = dtr_service.repository.get_by_id(dtr_id)
        
        if not dtr:
            raise HTTPException(status_code=404, detail=f"DTR with ID {dtr_id} not found")
        
        # Generate PDF
        pdf_generator = DTRPDFGenerator()
        pdf_bytes = pdf_generator.generate_pdf(dtr)
        
        # Wrap bytes in BytesIO for streaming
        pdf_buffer = BytesIO(pdf_bytes)
        
        # Return as streaming response
        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=DTR_{dtr.receipt_number}.pdf"
            }
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error generating DTR PDF", error=e, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to generate PDF") from e


@router.post("/generate", status_code=status.HTTP_201_CREATED)
def generate_dtr(
    request: GenerateDTRsRequest,
    dtr_service: DTRService = Depends(get_dtr_service),
    _current_user: User = Depends(get_current_user),
):
    """
    Manually generate DTR for specific criteria.
    Supports filtering by medallion or TLC license.
    """
    try:
        result = dtr_service.generate_dtrs_for_period(
            period_start=request.period_start_date,
            period_end=request.period_end_date,
            medallion_no=request.medallion_no,
            tlc_license_no=request.tlc_license_no,
            auto_finalize=False,
            regenerate_existing=False
        )
        
        return {
            "message": "DTR generation completed",
            "total_generated": result['generated_count'],
            "total_skipped": result['skipped_count'],
            "total_failed": result['failed_count'],
            "details": result
        }
    
    except Exception as e:
        logger.error("Error generating DTRs", error=e, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to generate DTRs") from e


@router.put("/{dtr_id}/check-number")
def update_check_number(
    dtr_id: int,
    request: CheckPaymentRequest,
    dtr_service: DTRService = Depends(get_dtr_service),
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
):
    """Update check number for a DTR"""
    try:
        dtr = dtr_service.repository.get_by_id(dtr_id)
        
        if not dtr:
            raise HTTPException(status_code=404, detail=f"DTR with ID {dtr_id} not found")
        
        # Update check number
        dtr.check_number = request.check_number
        dtr.payment_method = "Check"
        dtr.payment_date = datetime.now()
        dtr.status = DTRStatus.PAID
        
        db.commit()
        db.refresh(dtr)
        
        return {"message": "Check number updated successfully", "dtr_id": dtr.id}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error updating check number", error=e, exc_info=True)
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to update check number") from e


# ACH BATCH ENDPOINTS (Unique to driver_payments module)

@router.post("/ach-batch", response_model=ACHBatchResponse, status_code=status.HTTP_201_CREATED)
def create_ach_batch(
    request: ACHBatchCreateRequest,
    ach_service: ACHBatchService = Depends(get_ach_service),
    _current_user: User = Depends(get_current_user),
):
    """
    Create a new ACH batch from selected DTRs.
    Generates NACHA file for bank processing.
    """
    try:
        batch = ach_service.create_ach_batch(
            dtr_ids=request.dtr_ids,
            effective_date=request.effective_date
        )
        
        return ACHBatchResponse(
            id=batch.id,
            batch_number=batch.batch_number,
            batch_date=batch.batch_date,
            effective_date=batch.effective_date,
            status=batch.status.value,
            total_payments=batch.total_payments,
            total_amount=batch.total_amount,
            nacha_file_path=batch.nacha_file_path,
            nacha_generated_at=batch.nacha_generated_at,
            is_reversed=batch.is_reversed,
            reversed_at=batch.reversed_at,
            reversal_reason=batch.reversal_reason,
            created_on=batch.created_on
        )
    
    except (MissingBankInformationError, CompanyBankConfigError) as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        logger.error("Error creating ACH batch", error=e, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to create ACH batch") from e


@router.get("/ach-batch", response_model=PaginatedACHBatchResponse)
def list_ach_batches(
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=100),
    status_filter: Optional[ACHBatchStatus] = Query(None),
    ach_service: ACHBatchService = Depends(get_ach_service),
    _current_user: User = Depends(get_current_user),
):
    """List all ACH batches with pagination"""
    try:
        batches, total = ach_service.list_ach_batches(
            page=page,
            per_page=per_page,
            status_filter=status_filter
        )
        
        response_items = [
            ACHBatchResponse(
                id=batch.id,
                batch_number=batch.batch_number,
                batch_date=batch.batch_date,
                effective_date=batch.effective_date,
                status=batch.status.value,
                total_payments=batch.total_payments,
                total_amount=batch.total_amount,
                nacha_file_path=batch.nacha_file_path,
                nacha_generated_at=batch.nacha_generated_at,
                is_reversed=batch.is_reversed,
                reversed_at=batch.reversed_at,
                reversal_reason=batch.reversal_reason,
                created_on=batch.created_on
            )
            for batch in batches
        ]
        
        return PaginatedACHBatchResponse(
            items=response_items,
            total_items=total,
            page=page,
            per_page=per_page,
            total_pages=math.ceil(total / per_page) if per_page > 0 else 0
        )
    
    except Exception as e:
        logger.error("Error listing ACH batches", error=e, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to list ACH batches") from e


@router.get("/ach-batch/{batch_id}", response_model=ACHBatchDetailResponse)
def get_ach_batch(
    batch_id: int,
    ach_service: ACHBatchService = Depends(get_ach_service),
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
):
    """Get detailed information about an ACH batch"""
    try:
        batch = ach_service.get_ach_batch_by_id(batch_id)
        
        if not batch:
            raise HTTPException(status_code=404, detail=f"ACH batch with ID {batch_id} not found")
        
        # Query DTRs associated with this batch
        from app.dtr.models import DTR
        dtrs = db.query(DTR).filter(DTR.ach_batch_id == batch_id).all()
        
        return ACHBatchDetailResponse(
            id=batch.id,
            batch_number=batch.batch_number,
            batch_date=batch.batch_date,
            effective_date=batch.effective_date,
            status=batch.status.value,
            total_payments=batch.total_payments,
            total_amount=batch.total_amount,
            nacha_file_path=batch.nacha_file_path,
            nacha_generated_at=batch.nacha_generated_at,
            is_reversed=batch.is_reversed,
            reversed_at=batch.reversed_at,
            reversal_reason=batch.reversal_reason,
            created_on=batch.created_on,
            updated_on=batch.updated_on,
            dtr_ids=[dtr.id for dtr in dtrs]
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error fetching ACH batch", error=e, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch ACH batch") from e


@router.get("/ach-batch/{batch_id}/nacha", response_class=StreamingResponse)
def download_nacha_file(
    batch_id: int,
    ach_service: ACHBatchService = Depends(get_ach_service),
    _current_user: User = Depends(get_current_user),
):
    """Download NACHA file for an ACH batch"""
    try:
        batch = ach_service.get_ach_batch_by_id(batch_id)
        
        if not batch:
            raise HTTPException(status_code=404, detail=f"ACH batch with ID {batch_id} not found")
        
        if not batch.nacha_file_path:
            raise HTTPException(status_code=404, detail="NACHA file not generated yet")
        
        # Read NACHA file content
        with open(batch.nacha_file_path, 'rb') as f:
            nacha_content = f.read()
        
        return StreamingResponse(
            BytesIO(nacha_content),
            media_type="text/plain",
            headers={
                "Content-Disposition": f"attachment; filename={batch.batch_number}.txt"
            }
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error downloading NACHA file", error=e, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to download NACHA file") from e


@router.post("/ach-batch/{batch_id}/reverse")
def reverse_ach_batch(
    batch_id: int,
    request: BatchReversalRequest,
    ach_service: ACHBatchService = Depends(get_ach_service),
    _current_user: User = Depends(get_current_user),
):
    """Reverse an ACH batch"""
    try:
        ach_service.reverse_ach_batch(batch_id, request.reason)
        
        return {"message": "ACH batch reversed successfully", "batch_id": batch_id}
    
    except ACHBatchNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    except ACHBatchReversalError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        logger.error("Error reversing ACH batch", error=e, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to reverse ACH batch") from e


# Export functionality
@router.get("/export/csv")
def export_dtrs_csv(
    period_start_date: Optional[date] = Query(None),
    period_end_date: Optional[date] = Query(None),
    dtr_service: DTRService = Depends(get_dtr_service),
    _current_user: User = Depends(get_current_user),
):
    """Export DTRs to CSV"""
    try:
        dtrs, _ = dtr_service.repository.search_dtrs(
            period_start_from=period_start_date,
            period_start_to=period_end_date,
            page=1,
            page_size=10000  # Get all
        )
        
        # Generate CSV content
        import csv
        from io import StringIO
        
        output = StringIO()
        writer = csv.writer(output)
        
        # Header
        writer.writerow([
            'Receipt Number', 'Driver Name', 'TLC License', 'Medallion', 'Plate Number',
            'Period Start', 'Period End', 'Gross Earnings', 'Total Deductions',
            'Net Earnings', 'Total Due', 'Payment Method', 'Status'
        ])
        
        # Data
        for dtr in dtrs:
            writer.writerow([
                dtr.receipt_number,
                f"{dtr.driver.first_name} {dtr.driver.last_name}" if dtr.driver else '',
                dtr.driver.tlc_license.tlc_license_number if dtr.driver and dtr.driver.tlc_license else '',
                dtr.medallion.medallion_number if dtr.medallion else '',
                dtr.vehicle.get_active_plate_number() if dtr.vehicle else '',
                dtr.period_start_date,
                dtr.period_end_date,
                dtr.total_gross_earnings,
                dtr.subtotal_deductions,
                dtr.net_earnings,
                dtr.total_due_to_driver,
                dtr.payment_method or '',
                dtr.status.value
            ])
        
        output.seek(0)
        
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=dtrs_export.csv"}
        )
    
    except Exception as e:
        logger.error("Error exporting DTRs to CSV", error=e, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to export DTRs") from e