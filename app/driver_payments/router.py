### app/driver_payments/router.py (Part 1)

"""
FastAPI router for Driver Payments module.
Provides all REST API endpoints for DTR management, ACH batches, and NACHA file generation.
"""

import math
from datetime import date, datetime
from io import BytesIO
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse, Response
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.dependencies import get_db_with_current_user
from typing import List
from app.driver_payments.exceptions import (
    DTRNotFoundError, ACHBatchNotFoundError, NACHAGenerationError,
    DuplicatePaymentError, PaymentTypeInvalidError, MissingBankInformationError,
    ACHBatchReversalError, CompanyBankConfigError
)
from app.driver_payments.schemas import (
    DTRResponse, PaginatedDTRResponse, ACHBatchCreateRequest,
    ACHBatchResponse, ACHBatchDetailResponse, PaginatedACHBatchResponse,
    DTRStatus, ACHBatchStatus, GenerateDTRsRequest, CheckPaymentRequest,
    BulkCheckPaymentRequest, BatchReversalRequest
)
from app.driver_payments.models import PaymentType
from app.driver_payments.services import DriverPaymentService
from app.users.models import User
from app.users.utils import get_current_user
from app.utils.exporter.excel_exporter import ExcelExporter
from app.utils.exporter.pdf_exporter import PDFExporter
from app.utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/payments/driver-payments", tags=["Driver Payments"])


# Dependency to inject the DriverPaymentService
def get_payment_service(db: Session = Depends(get_db)) -> DriverPaymentService:
    """Provides an instance of DriverPaymentService with the current DB session."""
    return DriverPaymentService(db)


# ============================================================================
# DTR ENDPOINTS
# ============================================================================

@router.get("", response_model=PaginatedDTRResponse, summary="List Driver Transaction Receipts")
def list_dtrs(
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=100),
    sort_by: str = Query("week_end_date"),
    sort_order: str = Query("desc", regex="^(asc|desc)$"),
    receipt_number: Optional[str] = Query(None),
    driver_name: Optional[str] = Query(None),
    tlc_license: Optional[str] = Query(None),
    medallion_no: Optional[str] = Query(None),
    plate_number: Optional[str] = Query(None),
    week_start_date: Optional[date] = Query(None),
    week_end_date: Optional[date] = Query(None),
    payment_type: Optional[PaymentType] = Query(None),
    dtr_status: Optional[DTRStatus] = Query(None),
    is_paid: Optional[bool] = Query(None, description="Filter by payment status"),
    ach_batch_number: Optional[str] = Query(None),
    check_number: Optional[str] = Query(None),
    payment_service: DriverPaymentService = Depends(get_payment_service),
    _current_user: User = Depends(get_current_user),
):
    """
    Retrieves a paginated and filterable list of all Driver Transaction Receipts (DTRs).
    
    Supports filtering by:
    - Receipt number, driver name, TLC license
    - Medallion number, plate number
    - Week dates, payment type, status
    - Payment status (paid/unpaid), ACH batch number, check number
    """
    try:
        dtrs, total_items = payment_service.list_dtrs(
            page=page,
            per_page=per_page,
            sort_by=sort_by,
            sort_order=sort_order,
            receipt_number=receipt_number,
            driver_name=driver_name,
            tlc_license=tlc_license,
            medallion_no=medallion_no,
            plate_number=plate_number,
            week_start_date=week_start_date,
            week_end_date=week_end_date,
            payment_type=payment_type,
            status=dtr_status,
            is_paid=is_paid,
            ach_batch_number=ach_batch_number,
            check_number=check_number
        )
        
        # Map to response schema
        response_items = []
        for dtr in dtrs:
            driver = dtr.driver
            lease = dtr.lease
            
            response_items.append(DTRResponse(
                id=dtr.id,
                receipt_number=dtr.receipt_number,
                week_start_date=dtr.week_start_date,
                week_end_date=dtr.week_end_date,
                generation_date=dtr.generation_date,
                driver_id=dtr.driver_id,
                driver_name=f"{driver.first_name} {driver.last_name}" if driver else None,
                tlc_license=driver.tlc_license.tlc_license_number if driver and driver.tlc_license else None,
                lease_id=dtr.lease_id,
                lease_number=lease.lease_id if lease else None,
                vehicle_id=dtr.vehicle_id,
                plate_number=dtr.vehicle.plate_number if dtr.vehicle else None,
                medallion_id=dtr.medallion_id,
                medallion_number=dtr.medallion.medallion_number if dtr.medallion else None,
                credit_card_earnings=dtr.credit_card_earnings,
                lease_amount=dtr.lease_amount,
                mta_fees_total=dtr.mta_fees_total,
                mta_fee_mta=dtr.mta_fee_mta,
                mta_fee_tif=dtr.mta_fee_tif,
                mta_fee_congestion=dtr.mta_fee_congestion,
                mta_fee_crbt=dtr.mta_fee_crbt,
                mta_fee_airport=dtr.mta_fee_airport,
                ezpass_tolls=dtr.ezpass_tolls,
                pvb_violations=dtr.pvb_violations,
                tlc_tickets=dtr.tlc_tickets,
                repairs=dtr.repairs,
                driver_loans=dtr.driver_loans,
                misc_charges=dtr.misc_charges,
                subtotal_deductions=dtr.subtotal_deductions,
                net_earnings=dtr.net_earnings,
                total_due_to_driver=dtr.total_due_to_driver,
                status=dtr.status,
                payment_type=PaymentType(driver.pay_to_mode) if driver and driver.pay_to_mode else None,
                ach_batch_number=dtr.ach_batch.batch_number if dtr.ach_batch else None,
                check_number=dtr.check_number,
                payment_date=dtr.payment_date
            ))
        
        total_pages = math.ceil(total_items / per_page) if per_page > 0 else 0
        
        return PaginatedDTRResponse(
            items=response_items,
            total_items=total_items,
            page=page,
            per_page=per_page,
            total_pages=total_pages
        )
    
    except Exception as e:
        logger.error("Error fetching DTRs: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="An error occurred while fetching DTRs.") from e


@router.get("/{dtr_id}", response_model=DTRResponse, summary="Get DTR by ID")
def get_dtr(
    dtr_id: int,
    payment_service: DriverPaymentService = Depends(get_payment_service),
    _current_user: User = Depends(get_current_user),
):
    """Get a single DTR by its ID."""
    try:
        dtr = payment_service.get_dtr_by_id(dtr_id)
        
        if not dtr:
            raise HTTPException(status_code=404, detail=f"DTR with ID {dtr_id} not found")
        
        driver = dtr.driver
        lease = dtr.lease
        
        return DTRResponse(
            id=dtr.id,
            receipt_number=dtr.receipt_number,
            week_start_date=dtr.week_start_date,
            week_end_date=dtr.week_end_date,
            generation_date=dtr.generation_date,
            driver_id=dtr.driver_id,
            driver_name=f"{driver.first_name} {driver.last_name}" if driver else None,
            tlc_license=driver.tlc_license.tlc_license_number if driver and driver.tlc_license else None,
            lease_id=dtr.lease_id,
            lease_number=lease.lease_id if lease else None,
            vehicle_id=dtr.vehicle_id,
            plate_number=dtr.vehicle.plate_number if dtr.vehicle else None,
            medallion_id=dtr.medallion_id,
            medallion_number=dtr.medallion.medallion_number if dtr.medallion else None,
            credit_card_earnings=dtr.credit_card_earnings,
            lease_amount=dtr.lease_amount,
            mta_fees_total=dtr.mta_fees_total,
            mta_fee_mta=dtr.mta_fee_mta,
            mta_fee_tif=dtr.mta_fee_tif,
            mta_fee_congestion=dtr.mta_fee_congestion,
            mta_fee_crbt=dtr.mta_fee_crbt,
            mta_fee_airport=dtr.mta_fee_airport,
            ezpass_tolls=dtr.ezpass_tolls,
            pvb_violations=dtr.pvb_violations,
            tlc_tickets=dtr.tlc_tickets,
            repairs=dtr.repairs,
            driver_loans=dtr.driver_loans,
            misc_charges=dtr.misc_charges,
            subtotal_deductions=dtr.subtotal_deductions,
            net_earnings=dtr.net_earnings,
            total_due_to_driver=dtr.total_due_to_driver,
            status=dtr.status,
            payment_type=PaymentType(driver.pay_to_mode) if driver and driver.pay_to_mode else None,
            ach_batch_number=dtr.ach_batch.batch_number if dtr.ach_batch else None,
            check_number=dtr.check_number,
            payment_date=dtr.payment_date
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error fetching DTR: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="An error occurred while fetching the DTR.") from e


@router.post("/generate", summary="Generate DTRs for a Specific Week", status_code=status.HTTP_202_ACCEPTED)
def generate_dtrs(
    request: GenerateDTRsRequest,
    _db: Session = Depends(get_db_with_current_user),
    _current_user: User = Depends(get_current_user),
):
    """
    Trigger DTR generation for a specific week.
    This is typically done automatically every Sunday, but can be triggered manually.
    
    **Note:** This is an asynchronous operation. It will queue a background task.
    """
    try:
        from app.driver_payments.tasks import generate_dtrs_for_specific_week_task
        
        # Queue the background task
        task = generate_dtrs_for_specific_week_task.delay(request.week_start_date.isoformat())
        
        return {
            "message": f"DTR generation queued for week starting {request.week_start_date}",
            "task_id": task.id,
            "week_start_date": request.week_start_date
        }
    
    except Exception as e:
        logger.error("Error queuing DTR generation: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="An error occurred while queuing DTR generation.") from e
    
@router.get("/ach-eligible", response_model=List[DTRResponse], summary="Get ACH-Eligible DTRs")
def get_ach_eligible_dtrs(
    payment_service: DriverPaymentService = Depends(get_payment_service),
    _current_user: User = Depends(get_current_user),
):
    """
    Get all unpaid DTRs where the driver has ACH as their payment type.
    Used for ACH batch generation.
    """
    try:
        dtrs = payment_service.get_unpaid_ach_eligible_dtrs()
        
        response_items = []
        for dtr in dtrs:
            driver = dtr.driver
            lease = dtr.lease
            
            response_items.append(DTRResponse(
                id=dtr.id,
                receipt_number=dtr.receipt_number,
                week_start_date=dtr.week_start_date,
                week_end_date=dtr.week_end_date,
                generation_date=dtr.generation_date,
                driver_id=dtr.driver_id,
                driver_name=f"{driver.first_name} {driver.last_name}",
                tlc_license=driver.tlc_license.tlc_license_number if driver.tlc_license else None,
                lease_id=dtr.lease_id,
                lease_number=lease.lease_id,
                vehicle_id=dtr.vehicle_id,
                plate_number=dtr.vehicle.plate_number if dtr.vehicle else None,
                medallion_id=dtr.medallion_id,
                medallion_number=dtr.medallion.medallion_number if dtr.medallion else None,
                credit_card_earnings=dtr.credit_card_earnings,
                lease_amount=dtr.lease_amount,
                mta_fees_total=dtr.mta_fees_total,
                mta_fee_mta=dtr.mta_fee_mta,
                mta_fee_tif=dtr.mta_fee_tif,
                mta_fee_congestion=dtr.mta_fee_congestion,
                mta_fee_crbt=dtr.mta_fee_crbt,
                mta_fee_airport=dtr.mta_fee_airport,
                ezpass_tolls=dtr.ezpass_tolls,
                pvb_violations=dtr.pvb_violations,
                tlc_tickets=dtr.tlc_tickets,
                repairs=dtr.repairs,
                driver_loans=dtr.driver_loans,
                misc_charges=dtr.misc_charges,
                subtotal_deductions=dtr.subtotal_deductions,
                net_earnings=dtr.net_earnings,
                total_due_to_driver=dtr.total_due_to_driver,
                status=dtr.status,
                payment_type=PaymentType.ACH,
                ach_batch_number=None,
                check_number=None,
                payment_date=None
            ))
        
        return response_items
    
    except Exception as e:
        logger.error("Error fetching ACH-eligible DTRs: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="An error occurred.") from e


@router.post("/ach-batches", response_model=ACHBatchResponse, summary="Create ACH Batch", status_code=status.HTTP_201_CREATED)
def create_ach_batch(
    request: ACHBatchCreateRequest,
    db: Session = Depends(get_db_with_current_user),
    _current_user: User = Depends(get_current_user),
):
    """
    Create an ACH batch from selected DTRs.
    Generates a batch number in format YYMM-XXX and marks all DTRs as paid.
    """
    try:
        payment_service = DriverPaymentService(db)
        
        batch = payment_service.create_ach_batch(
            dtr_ids=request.dtr_ids,
            effective_date=request.effective_date,
            created_by=_current_user.id
        )
        
        return ACHBatchResponse(
            id=batch.id,
            batch_number=batch.batch_number,
            batch_date=batch.batch_date,
            effective_date=batch.effective_date,
            status=batch.status,
            total_payments=batch.total_payments,
            total_amount=batch.total_amount,
            nacha_file_path=batch.nacha_file_path,
            nacha_generated_at=batch.nacha_generated_at,
            is_reversed=batch.is_reversed,
            reversed_at=batch.reversed_at,
            reversal_reason=batch.reversal_reason,
            created_on=batch.created_on
        )
    
    except (DTRNotFoundError, DuplicatePaymentError, PaymentTypeInvalidError, MissingBankInformationError) as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        logger.error("Error creating ACH batch: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="An error occurred while creating the ACH batch.") from e


@router.get("/ach-batches", response_model=PaginatedACHBatchResponse, summary="List ACH Batches")
def list_ach_batches(
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=100),
    sort_by: str = Query("batch_date"),
    sort_order: str = Query("desc", regex="^(asc|desc)$"),
    batch_status: Optional[ACHBatchStatus] = Query(None),
    batch_number: Optional[str] = Query(None),
    payment_service: DriverPaymentService = Depends(get_payment_service),
    _current_user: User = Depends(get_current_user),
):
    """List all ACH batches with pagination and filtering."""
    try:
        batches, total_items = payment_service.list_ach_batches(
            page=page,
            per_page=per_page,
            sort_by=sort_by,
            sort_order=sort_order,
            status=batch_status,
            batch_number=batch_number
        )
        
        response_items = [
            ACHBatchResponse(
                id=batch.id,
                batch_number=batch.batch_number,
                batch_date=batch.batch_date,
                effective_date=batch.effective_date,
                status=batch.status,
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
        
        total_pages = math.ceil(total_items / per_page) if per_page > 0 else 0
        
        return PaginatedACHBatchResponse(
            items=response_items,
            total_items=total_items,
            page=page,
            per_page=per_page,
            total_pages=total_pages
        )
    
    except Exception as e:
        logger.error("Error listing ACH batches: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="An error occurred.") from e


@router.get("/ach-batches/{batch_id}", response_model=ACHBatchDetailResponse, summary="Get ACH Batch Details")
def get_ach_batch(
    batch_id: int,
    payment_service: DriverPaymentService = Depends(get_payment_service),
    _current_user: User = Depends(get_current_user),
):
    """Get detailed information about an ACH batch including all DTRs."""
    try:
        batch = payment_service.get_ach_batch(batch_id)
        
        if not batch:
            raise HTTPException(status_code=404, detail=f"ACH batch with ID {batch_id} not found")
        
        # Map DTRs to response
        dtr_responses = []
        for dtr in batch.receipts:
            driver = dtr.driver
            lease = dtr.lease
            
            dtr_responses.append(DTRResponse(
                id=dtr.id,
                receipt_number=dtr.receipt_number,
                week_start_date=dtr.week_start_date,
                week_end_date=dtr.week_end_date,
                generation_date=dtr.generation_date,
                driver_id=dtr.driver_id,
                driver_name=f"{driver.first_name} {driver.last_name}",
                tlc_license=driver.tlc_license.tlc_license_number if driver.tlc_license else None,
                lease_id=dtr.lease_id,
                lease_number=lease.lease_id,
                vehicle_id=dtr.vehicle_id,
                plate_number=dtr.vehicle.plate_number if dtr.vehicle else None,
                medallion_id=dtr.medallion_id,
                medallion_number=dtr.medallion.medallion_number if dtr.medallion else None,
                credit_card_earnings=dtr.credit_card_earnings,
                lease_amount=dtr.lease_amount,
                mta_fees_total=dtr.mta_fees_total,
                mta_fee_mta=dtr.mta_fee_mta,
                mta_fee_tif=dtr.mta_fee_tif,
                mta_fee_congestion=dtr.mta_fee_congestion,
                mta_fee_crbt=dtr.mta_fee_crbt,
                mta_fee_airport=dtr.mta_fee_airport,
                ezpass_tolls=dtr.ezpass_tolls,
                pvb_violations=dtr.pvb_violations,
                tlc_tickets=dtr.tlc_tickets,
                repairs=dtr.repairs,
                driver_loans=dtr.driver_loans,
                misc_charges=dtr.misc_charges,
                subtotal_deductions=dtr.subtotal_deductions,
                net_earnings=dtr.net_earnings,
                total_due_to_driver=dtr.total_due_to_driver,
                status=dtr.status,
                payment_type=PaymentType.ACH,
                ach_batch_number=batch.batch_number,
                check_number=None,
                payment_date=dtr.payment_date
            ))
        
        return ACHBatchDetailResponse(
            id=batch.id,
            batch_number=batch.batch_number,
            batch_date=batch.batch_date,
            effective_date=batch.effective_date,
            status=batch.status,
            total_payments=batch.total_payments,
            total_amount=batch.total_amount,
            nacha_file_path=batch.nacha_file_path,
            nacha_generated_at=batch.nacha_generated_at,
            is_reversed=batch.is_reversed,
            reversed_at=batch.reversed_at,
            reversal_reason=batch.reversal_reason,
            created_on=batch.created_on,
            receipts=dtr_responses
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error fetching ACH batch: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="An error occurred.") from e


@router.post("/ach-batches/{batch_id}/reverse", response_model=ACHBatchResponse, summary="Reverse ACH Batch")
def reverse_ach_batch(
    batch_id: int,
    request: BatchReversalRequest,
    db: Session = Depends(get_db_with_current_user),
    _current_user: User = Depends(get_current_user),
):
    """
    Reverse an ACH batch.
    Marks batch as reversed and clears payment info from all DTRs.
    """
    try:
        payment_service = DriverPaymentService(db)
        
        batch = payment_service.reverse_ach_batch(
            batch_id=batch_id,
            reason=request.reason,
            reversed_by=_current_user.id
        )
        
        return ACHBatchResponse(
            id=batch.id,
            batch_number=batch.batch_number,
            batch_date=batch.batch_date,
            effective_date=batch.effective_date,
            status=batch.status,
            total_payments=batch.total_payments,
            total_amount=batch.total_amount,
            nacha_file_path=batch.nacha_file_path,
            nacha_generated_at=batch.nacha_generated_at,
            is_reversed=batch.is_reversed,
            reversed_at=batch.reversed_at,
            reversal_reason=batch.reversal_reason,
            created_on=batch.created_on
        )
    
    except (ACHBatchNotFoundError, ACHBatchReversalError) as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        logger.error("Error reversing ACH batch: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="An error occurred.") from e


# ============================================================================
# NACHA FILE GENERATION
# ============================================================================

@router.post("/ach-batches/{batch_id}/nacha", summary="Generate NACHA File")
def generate_nacha_file(
    batch_id: int,
    payment_service: DriverPaymentService = Depends(get_payment_service),
    _current_user: User = Depends(get_current_user),
):
    """
    Generate NACHA file for an ACH batch.
    Returns the file content for download.
    """
    try:
        nacha_content = payment_service.generate_nacha_file(batch_id)
        
        batch = payment_service.get_ach_batch(batch_id)
        filename = f"{batch.batch_number}.ach"
        
        return Response(
            content=nacha_content.encode('utf-8'),
            media_type="text/plain",
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )
    
    except (ACHBatchNotFoundError, NACHAGenerationError, CompanyBankConfigError) as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        logger.error("Error generating NACHA file: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="An error occurred.") from e


# ============================================================================
# CHECK PAYMENT ENDPOINTS
# ============================================================================

@router.post("/check-payments", summary="Process Check Payment", status_code=status.HTTP_201_CREATED)
def process_check_payment(
    request: CheckPaymentRequest,
    db: Session = Depends(get_db_with_current_user),
    _current_user: User = Depends(get_current_user),
):
    """Mark a DTR as paid by check."""
    try:
        payment_service = DriverPaymentService(db)
        
        dtr = payment_service.process_check_payment(
            dtr_id=request.dtr_id,
            check_number=request.check_number,
            payment_date=request.payment_date
        )
        
        return {
            "message": f"DTR {dtr.receipt_number} marked as paid by check #{request.check_number}",
            "dtr_id": dtr.id,
            "receipt_number": dtr.receipt_number,
            "check_number": request.check_number
        }
    
    except (DTRNotFoundError, DuplicatePaymentError, PaymentTypeInvalidError) as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        logger.error("Error processing check payment: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="An error occurred.") from e


@router.post("/check-payments/bulk", summary="Process Bulk Check Payments", status_code=status.HTTP_201_CREATED)
def process_bulk_check_payments(
    request: BulkCheckPaymentRequest,
    db: Session = Depends(get_db_with_current_user),
    _current_user: User = Depends(get_current_user),
):
    """Process multiple check payments at once."""
    try:
        payment_service = DriverPaymentService(db)
        
        results = {
            "success": [],
            "failed": []
        }
        
        for payment in request.payments:
            try:
                dtr = payment_service.process_check_payment(
                    dtr_id=payment.dtr_id,
                    check_number=payment.check_number,
                    payment_date=payment.payment_date
                )
                results["success"].append({
                    "dtr_id": dtr.id,
                    "receipt_number": dtr.receipt_number,
                    "check_number": payment.check_number
                })
            except (ValueError, HTTPException, AttributeError) as e:
                results["failed"].append({
                    "dtr_id": payment.dtr_id,
                    "error": str(e)
                })
        
        return results
    
    except Exception as e:
        logger.error("Error processing bulk check payments: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="An error occurred.") from e


# ============================================================================
# EXPORT ENDPOINTS
# ============================================================================

@router.get("/export", summary="Export DTRs")
def export_dtrs(
    export_format: str = Query(..., regex="^(excel|pdf|csv)$"),
    week_start_date: Optional[date] = Query(None),
    week_end_date: Optional[date] = Query(None),
    is_paid: Optional[bool] = Query(None),
    payment_service: DriverPaymentService = Depends(get_payment_service),
    _current_user: User = Depends(get_current_user),
):
    """Export DTRs to Excel, PDF, or CSV format."""
    try:
        # Get all DTRs matching filters (no pagination)
        dtrs, _ = payment_service.list_dtrs(
            page=1,
            per_page=10000,
            week_start_date=week_start_date,
            week_end_date=week_end_date,
            is_paid=is_paid
        )
        
        if not dtrs:
            raise HTTPException(status_code=404, detail="No DTRs found matching the filters")
        
        # Prepare data for export
        data = []
        for dtr in dtrs:
            driver = dtr.driver
            data.append({
                "Receipt Number": dtr.receipt_number,
                "Week Start": dtr.week_start_date.isoformat(),
                "Week End": dtr.week_end_date.isoformat(),
                "Driver Name": f"{driver.first_name} {driver.last_name}",
                "TLC License": driver.tlc_license.tlc_license_number if driver.tlc_license else "",
                "Gross Earnings": float(dtr.credit_card_earnings),
                "Total Deductions": float(dtr.subtotal_deductions),
                "Total Due": float(dtr.total_due_to_driver),
                "Payment Type": driver.pay_to_mode or "",
                "Batch/Check No": dtr.ach_batch.batch_number if dtr.ach_batch else (dtr.check_number or ""),
                "Status": dtr.status.value
            })
        
        # Generate export file
        if export_format == "excel":
            exporter = ExcelExporter(data)
            file_bytes = exporter.export()
            media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            filename = f"driver_payments_{datetime.now().strftime('%Y%m%d')}.xlsx"
        elif export_format == "csv":
            import csv
            import io
            output = io.StringIO()
            writer = csv.DictWriter(output, fieldnames=data[0].keys())
            writer.writeheader()
            writer.writerows(data)
            file_bytes = output.getvalue().encode('utf-8')
            media_type = "text/csv"
            filename = f"driver_payments_{datetime.now().strftime('%Y%m%d')}.csv"
        else:  # pdf
            exporter = PDFExporter(data)
            file_bytes = exporter.export()
            media_type = "application/pdf"
            filename = f"driver_payments_{datetime.now().strftime('%Y%m%d')}.pdf"
        
        return StreamingResponse(
            BytesIO(file_bytes if isinstance(file_bytes, bytes) else file_bytes.encode('utf-8')),
            media_type=media_type,
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error exporting DTRs: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="An error occurred during export.") from e