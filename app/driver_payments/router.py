# app/driver_payments/router.py

"""
Driver Payments Router - Combines DTR and ACH Batch endpoints
"""

from datetime import date, datetime
from typing import Optional, List
import math

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import FileResponse, RedirectResponse, StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.db import get_db
from app.users.models import User
from app.users.utils import get_current_user
from app.dtr.repository import DTRRepository
from app.dtr.schemas import DTRListResponse, DTRListItemResponse
from app.dtr.models import DTRStatus, PaymentMethod
from app.driver_payments.ach_service import ACHBatchService
from app.driver_payments.models import ACHBatchStatus
from app.utils.logger import get_logger
from app.utils.s3_utils import s3_utils

logger = get_logger(__name__)
router = APIRouter(prefix="/payments/driver-payments", tags=["Driver Payments"])


# ===== SCHEMAS =====

class ACHBatchCreateRequest(BaseModel):
    """Request to create ACH batch"""
    dtr_ids: list[int]
    effective_date: Optional[date] = None


class ACHBatchResponse(BaseModel):
    """ACH batch response"""
    id: int
    batch_number: str
    batch_date: datetime
    effective_date: date
    status: ACHBatchStatus
    total_payments: int
    total_amount: float
    nacha_file_path: Optional[str] = None
    nacha_generated_at: Optional[datetime] = None
    is_reversed: bool
    reversed_at: Optional[datetime] = None
    reversal_reason: Optional[str] = None


class ACHBatchDetailResponse(ACHBatchResponse):
    """Detailed batch response with DTRs"""
    dtrs: list[DTRListItemResponse]


class BatchReversalRequest(BaseModel):
    """Request to reverse batch"""
    reason: str


class FilterMetadata(BaseModel):
    """Available filter options and values"""
    statuses: List[str]
    payment_methods: List[str]
    receipt_types: List[str]


class DTRListResponseWithMetadata(BaseModel):
    """DTR list response with filter metadata"""
    items: List[DTRListItemResponse]
    total: int
    page: int
    per_page: int
    total_pages: int
    filters: FilterMetadata


# ===== ENDPOINTS =====

@router.get("/manage", response_model=DTRListResponseWithMetadata)
def list_driver_payments(
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    receipt_number: Optional[str] = Query(None),
    status: Optional[DTRStatus] = Query(None),
    payment_method: Optional[PaymentMethod] = Query(None),
    week_start_date_from: Optional[date] = Query(None),
    week_start_date_to: Optional[date] = Query(None),
    week_end_date_from: Optional[date] = Query(None),
    week_end_date_to: Optional[date] = Query(None),
    ach_batch_number: Optional[str] = Query(None),
    total_due_min: Optional[float] = Query(None, ge=0),
    total_due_max: Optional[float] = Query(None, ge=0),
    receipt_type: Optional[str] = Query(None),
    medallion_number: Optional[str] = Query(None),
    tlc_license: Optional[str] = Query(None),
    driver_name: Optional[str] = Query(None),
    plate_number: Optional[str] = Query(None),
    check_number: Optional[str] = Query(None),
    sort_by: str = Query('generation_date'),
    sort_order: str = Query('desc'),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List all driver payments (DTRs) with comprehensive filtering and sorting.
    
    Enhanced filters:
    - week_start_date_from/to: Date range for week start
    - week_end_date_from/to: Date range for week end
    - ach_batch_number: Filter by ACH batch number
    - total_due_min/max: Range filter for total due to driver
    - receipt_type: Filter by receipt type (currently supports "DTR")
    
    This is the main endpoint for the "Manage Driver Payments" screen.
    """
    try:
        repo = DTRRepository(db)
        
        dtrs, total = repo.list_with_filters(
            page=page,
            per_page=per_page,
            receipt_number=receipt_number,
            status=status,
            payment_method=payment_method,
            week_start_date_from=week_start_date_from,
            week_start_date_to=week_start_date_to,
            week_end_date_from=week_end_date_from,
            week_end_date_to=week_end_date_to,
            ach_batch_number=ach_batch_number,
            total_due_min=total_due_min,
            total_due_max=total_due_max,
            receipt_type=receipt_type,
            medallion_number=medallion_number,
            tlc_license=tlc_license,
            driver_name=driver_name,
            plate_number=plate_number,
            check_number=check_number,
            sort_by=sort_by,
            sort_order=sort_order
        )
        
        # Map to list item response
        items = []
        for dtr in dtrs:
            items.append(DTRListItemResponse(
                id=dtr.id,
                receipt_number=dtr.receipt_number,
                dtr_number=dtr.dtr_number,
                week_start_date=dtr.week_start_date,
                week_end_date=dtr.week_end_date,
                medallion_number=dtr.medallion.medallion_number if dtr.medallion else None,
                tlc_license=dtr.primary_driver.tlc_license.tlc_license_number if dtr.primary_driver else None,
                driver_name=f"{dtr.primary_driver.first_name} {dtr.primary_driver.last_name}" if dtr.primary_driver else None,
                plate_number=(dtr.vehicle.get_active_plate_number() if dtr.vehicle and hasattr(dtr.vehicle, 'get_active_plate_number')
                              else (dtr.vehicle.plate_number if dtr.vehicle and getattr(dtr.vehicle, 'plate_number', None) else None)),
                total_due_to_driver=dtr.total_due_to_driver,
                status=dtr.status,
                payment_method=dtr.payment_method,
                ach_batch_number=dtr.ach_batch_number,
                check_number=dtr.check_number
            ))
        
        total_pages = math.ceil(total / per_page) if total > 0 else 0
        
        # Build filter metadata
        filter_metadata = FilterMetadata(
            statuses=[s.value for s in DTRStatus],
            payment_methods=[m.value for m in PaymentMethod],
            receipt_types=["DTR"]
        )
        
        return DTRListResponseWithMetadata(
            items=items,
            total=total,
            page=page,
            per_page=per_page,
            total_pages=total_pages,
            filters=filter_metadata
        )
        
    except Exception as e:
        logger.error(f"Error listing driver payments: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to list driver payments") from e


@router.get("/ach-batch-mode")
def get_ach_eligible_payments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get DTRs eligible for ACH batch processing.
    
    Returns only FINALIZED, unpaid DTRs with ACH payment method.
    """
    try:
        repo = DTRRepository(db)
        dtrs = repo.get_unpaid_dtrs_for_ach()
        
        # Map to response
        items = []
        for dtr in dtrs:
            items.append({
                'id': dtr.id,
                'receipt_number': dtr.receipt_number,
                'week_start_date': str(dtr.week_start_date),
                'medallion_number': dtr.medallion.medallion_number if dtr.medallion else None,
                'driver_name': f"{dtr.primary_driver.first_name} {dtr.primary_driver.last_name}" if dtr.primary_driver else None,
                'total_due': float(dtr.total_due_to_driver)
            })
        
        total_amount = sum(dtr.total_due_to_driver for dtr in dtrs)
        
        return {
            'eligible_dtrs': items,
            'total_count': len(items),
            'total_amount': float(total_amount)
        }
        
    except Exception as e:
        logger.error(f"Error getting ACH eligible payments: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to get ACH eligible payments") from e


@router.post("/ach-batch", response_model=ACHBatchResponse, status_code=status.HTTP_201_CREATED)
def create_ach_batch(
    request: ACHBatchCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create ACH batch from selected DTRs.
    
    Generates NACHA file and marks DTRs as PAID.
    """
    try:
        service = ACHBatchService(db)
        
        batch = service.create_ach_batch(
            dtr_ids=request.dtr_ids,
            effective_date=request.effective_date
        )
        
        return ACHBatchResponse(
            id=batch.id,
            batch_number=batch.batch_number,
            batch_date=batch.batch_date,
            effective_date=batch.effective_date,
            status=batch.status,
            total_payments=batch.total_payments,
            total_amount=float(batch.total_amount),
            nacha_file_path=batch.nacha_file_path,
            nacha_generated_at=batch.nacha_generated_at,
            is_reversed=batch.is_reversed,
            reversed_at=batch.reversed_at,
            reversal_reason=batch.reversal_reason
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        logger.error(f"Error creating ACH batch: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to create ACH batch") from e


@router.get("/ach-batch")
def list_ach_batches(
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100),
    status: Optional[ACHBatchStatus] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List ACH batches with pagination"""
    try:
        service = ACHBatchService(db)
        
        batches, total = service.list_batches(
            page=page,
            per_page=per_page,
            status=status
        )
        
        items = [
            ACHBatchResponse(
                id=batch.id,
                batch_number=batch.batch_number,
                batch_date=batch.batch_date,
                effective_date=batch.effective_date,
                status=batch.status,
                total_payments=batch.total_payments,
                total_amount=float(batch.total_amount),
                nacha_file_path=batch.nacha_file_path,
                nacha_generated_at=batch.nacha_generated_at,
                is_reversed=batch.is_reversed,
                reversed_at=batch.reversed_at,
                reversal_reason=batch.reversal_reason
            )
            for batch in batches
        ]
        
        total_pages = math.ceil(total / per_page) if total > 0 else 0
        
        return {
            'items': items,
            'total': total,
            'page': page,
            'per_page': per_page,
            'total_pages': total_pages
        }
        
    except Exception as e:
        logger.error(f"Error listing ACH batches: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to list ACH batches") from e


@router.get("/ach-batch/{batch_id}", response_model=ACHBatchDetailResponse)
def get_ach_batch_details(
    batch_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get ACH batch details with included DTRs"""
    try:
        service = ACHBatchService(db)
        
        batch = service.get_batch_by_id(batch_id)
        
        if not batch:
            raise HTTPException(status_code=404, detail="Batch not found")
        
        # Get DTRs in this batch
        from app.dtr.models import DTR
        dtrs = db.query(DTR).filter(DTR.ach_batch_id == batch_id).all()
        
        # Map DTRs to response
        dtr_items = []
        for dtr in dtrs:
            dtr_items.append(DTRListItemResponse(
                id=dtr.id,
                receipt_number=dtr.receipt_number,
                dtr_number=dtr.dtr_number,
                week_start_date=dtr.week_start_date,
                week_end_date=dtr.week_end_date,
                medallion_number=dtr.medallion.medallion_number if dtr.medallion else None,
                tlc_license=dtr.primary_driver.tlc_license.tlc_license_number if dtr.primary_driver else None,
                driver_name=f"{dtr.primary_driver.first_name} {dtr.primary_driver.last_name}" if dtr.primary_driver else None,
                plate_number=(dtr.vehicle.get_active_plate_number() if dtr.vehicle and hasattr(dtr.vehicle, 'get_active_plate_number')
                              else (dtr.vehicle.plate_number if dtr.vehicle and getattr(dtr.vehicle, 'plate_number', None) else None)),
                total_due_to_driver=dtr.total_due_to_driver,
                status=dtr.status,
                payment_method=dtr.payment_method,
                ach_batch_number=dtr.ach_batch_number,
                check_number=dtr.check_number
            ))
        
        return ACHBatchDetailResponse(
            id=batch.id,
            batch_number=batch.batch_number,
            batch_date=batch.batch_date,
            effective_date=batch.effective_date,
            status=batch.status,
            total_payments=batch.total_payments,
            total_amount=float(batch.total_amount),
            nacha_file_path=batch.nacha_file_path,
            nacha_generated_at=batch.nacha_generated_at,
            is_reversed=batch.is_reversed,
            reversed_at=batch.reversed_at,
            reversal_reason=batch.reversal_reason,
            dtrs=dtr_items
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting batch details: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to get batch details") from e


@router.get("/ach-batch/number/{batch_number}", response_model=ACHBatchDetailResponse)
def get_ach_batch_by_number(
    batch_number: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get ACH batch details by batch number with included DTRs"""
    try:
        service = ACHBatchService(db)

        batch = service.get_batch_by_number(batch_number)

        if not batch:
            raise HTTPException(status_code=404, detail="Batch not found")

        # Get DTRs in this batch by batch_number
        from app.dtr.models import DTR
        dtrs = db.query(DTR).filter(DTR.ach_batch_number == batch_number).all()

        # Map DTRs to response
        dtr_items = []
        for dtr in dtrs:
            dtr_items.append(DTRListItemResponse(
                id=dtr.id,
                receipt_number=dtr.receipt_number,
                dtr_number=dtr.dtr_number,
                week_start_date=dtr.week_start_date,
                week_end_date=dtr.week_end_date,
                medallion_number=dtr.medallion.medallion_number if dtr.medallion else None,
                tlc_license=dtr.primary_driver.tlc_license.tlc_license_number if dtr.primary_driver else None,
                driver_name=f"{dtr.primary_driver.first_name} {dtr.primary_driver.last_name}" if dtr.primary_driver else None,
                plate_number=(dtr.vehicle.get_active_plate_number() if dtr.vehicle and hasattr(dtr.vehicle, 'get_active_plate_number')
                              else (dtr.vehicle.plate_number if dtr.vehicle and getattr(dtr.vehicle, 'plate_number', None) else None)),
                total_due_to_driver=dtr.total_due_to_driver,
                status=dtr.status,
                payment_method=dtr.payment_method,
                ach_batch_number=dtr.ach_batch_number,
                check_number=dtr.check_number
            ))

        return ACHBatchDetailResponse(
            id=batch.id,
            batch_number=batch.batch_number,
            batch_date=batch.batch_date,
            effective_date=batch.effective_date,
            status=batch.status,
            total_payments=batch.total_payments,
            total_amount=float(batch.total_amount),
            nacha_file_path=batch.nacha_file_path,
            nacha_generated_at=batch.nacha_generated_at,
            is_reversed=batch.is_reversed,
            reversed_at=batch.reversed_at,
            reversal_reason=batch.reversal_reason,
            dtrs=dtr_items
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting batch details by number: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to get batch details") from e


@router.post("/ach-batch/{batch_id}/reverse", response_model=ACHBatchResponse)
def reverse_ach_batch(
    batch_id: int,
    request: BatchReversalRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Reverse an ACH batch.
    
    Reverts all DTRs to FINALIZED status and marks batch as reversed.
    """
    try:
        service = ACHBatchService(db)
        
        batch = service.reverse_ach_batch(
            batch_id=batch_id,
            reason=request.reason
        )
        
        return ACHBatchResponse(
            id=batch.id,
            batch_number=batch.batch_number,
            batch_date=batch.batch_date,
            effective_date=batch.effective_date,
            status=batch.status,
            total_payments=batch.total_payments,
            total_amount=float(batch.total_amount),
            nacha_file_path=batch.nacha_file_path,
            nacha_generated_at=batch.nacha_generated_at,
            is_reversed=batch.is_reversed,
            reversed_at=batch.reversed_at,
            reversal_reason=batch.reversal_reason
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        logger.error(f"Error reversing batch: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to reverse batch") from e


@router.get("/ach-batch/{batch_id}/download-nacha")
def download_nacha_file(
    batch_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Download NACHA file for ACH batch"""
    try:
        # Query raw batch record to get the stored NACHA key (S3 key or previously-stored path)
        batch = db.query(__import__("app.driver_payments.models", fromlist=["ACHBatch"]).ACHBatch).filter(
            __import__("app.driver_payments.models", fromlist=["ACHBatch"]).ACHBatch.id == batch_id
        ).first()

        if not batch:
            raise HTTPException(status_code=404, detail="Batch not found")

        s3_key_or_path = batch.nacha_file_path
        if not s3_key_or_path:
            raise HTTPException(status_code=404, detail="NACHA file not generated yet")

        # If the stored value is a presigned URL, redirect the client there
        if isinstance(s3_key_or_path, str) and s3_key_or_path.startswith("http"):
            return RedirectResponse(url=s3_key_or_path)

        # Otherwise attempt to download from S3 using the stored key
        try:
            file_bytes = s3_utils.download_file(s3_key_or_path)
        except Exception:
            file_bytes = None

        if file_bytes:
            return StreamingResponse(iter([file_bytes]), media_type="text/plain", headers={
                "Content-Disposition": f"attachment; filename=\"{batch.batch_number}.ach\""
            })

        # As a last resort, if the stored value points to a local path, serve it
        from pathlib import Path
        local_path = Path(s3_key_or_path)
        if local_path.exists():
            return FileResponse(path=local_path, media_type="text/plain", filename=f"{batch.batch_number}.ach")

        raise HTTPException(status_code=404, detail="NACHA file not found on disk or S3")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error downloading NACHA file: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to download NACHA file") from e