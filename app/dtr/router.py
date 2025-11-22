# app/dtr/router.py

from typing import List, Optional
from datetime import date
from io import BytesIO

from fastapi import (
    APIRouter, Depends, HTTPException, Query, status,
    Response
)
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.users.models import User
from app.users.utils import get_current_user
from app.dtr.services import DTRService
from app.dtr.schemas import (
    DTRResponse, DTRGenerationRequest, DTRGenerationSummary,
    BatchDTRGenerationRequest, DTRListResponse, DTRDetailResponse
)
from app.dtr.models import DTRStatus
from app.dtr.exceptions import DTRValidationError, DTRGenerationError, DTRNotFoundError
from app.dtr.exceptions import DTRExportError
from app.utils.logger import get_logger

router = APIRouter(prefix="/dtrs", tags=["DTRs"])
logger = get_logger(__name__)

@router.post("/generate", response_model=DTRResponse, status_code=status.HTTP_201_CREATED)
async def generate_single_dtr(
    request: DTRGenerationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Generate a single DTR for a LEASE.
    
    CORRECTED: No longer requires driver_id - DTR is per lease only.
    
    Request body should contain:
    - lease_id: The lease to generate DTR for
    - period_start_date: Sunday (start of payment period)
    - period_end_date: Saturday (end of payment period)
    - auto_finalize: Optional, whether to auto-finalize
    
    Example:
    ```json
    {
        "lease_id": 123,
        "period_start_date": "2025-08-03",
        "period_end_date": "2025-08-09",
        "auto_finalize": false
    }
    ```
    """
    try:
        service = DTRService(db)
        
        dtr = service.generate_dtr(
            lease_id=request.lease_id,
            period_start=request.period_start_date,
            period_end=request.period_end_date,
            auto_finalize=request.auto_finalize
        )
        
        response_data = dtr.to_dict()
        
        # Add related information
        if dtr.lease:
            response_data["lease_number"] = dtr.lease.lease_id
        if dtr.driver:
            response_data["driver_name"] = f"{dtr.driver.first_name} {dtr.driver.last_name}"
        if dtr.vehicle:
            response_data["vehicle_plate"] = dtr.vehicle.get_active_plate_number()
        if dtr.medallion:
            response_data["medallion_number"] = dtr.medallion.medallion_number

        return response_data

    except DTRValidationError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e
    except DTRGenerationError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        ) from e
    except Exception as e:
        logger.error(f"Unexpected error in generate_single_dtr: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate DTR",
        ) from e


@router.post("/generate-by-period", response_model=DTRGenerationSummary)
async def generate_dtrs_by_period(
    request: BatchDTRGenerationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Generate DTRs for ALL active leases for a given period.
    
    CORRECTED: Generates ONE DTR PER LEASE (not per driver).
    
    This is the main endpoint for weekly batch DTR generation.
    It will iterate through all active leases and generate one DTR per lease.
    
    Parameters:
    - period_start_date: Sunday (start of payment period)
    - period_end_date: Saturday (end of payment period)
    - auto_finalize: Whether to auto-finalize DTRs
    - regenerate_existing: If true, delete and regenerate existing DTRs
    - lease_status_filter: Optional filter by lease status
    
    Returns summary with:
    - total_leases_found: Number of active leases
    - dtrs_generated: Successfully generated
    - dtrs_skipped: Already exist
    - dtrs_failed: Generation failed
    - Detailed lists for each category
    
    Example:
    ```json
    {
        "period_start_date": "2025-08-03",
        "period_end_date": "2025-08-09",
        "auto_finalize": false,
        "regenerate_existing": false,
        "lease_status_filter": "ACTIVE"
    }
    ```
    """
    try:
        logger.info(
            f"Starting batch DTR generation for period {request.period_start_date} to {request.period_end_date}"
        )
        
        service = DTRService(db)
        
        result = service.generate_dtrs_for_period(
            period_start=request.period_start_date,
            period_end=request.period_end_date,
            auto_finalize=request.auto_finalize,
            regenerate_existing=request.regenerate_existing,
            lease_status_filter=request.lease_status_filter
        )
        
        summary = DTRGenerationSummary(
            total_leases_found=result['total_leases'],
            dtrs_generated=result['generated_count'],
            dtrs_skipped=result['skipped_count'],
            dtrs_failed=result['failed_count'],
            period_start=request.period_start_date,
            period_end=request.period_end_date,
            generated_dtrs=result['generated'],
            skipped_dtrs=result['skipped'],
            failed_dtrs=result['failed']
        )
        
        logger.info(
            f"Batch DTR generation completed: {result['generated_count']} generated, "
            f"{result['skipped_count']} skipped, {result['failed_count']} failed"
        )
        
        return summary

    except DTRValidationError as e:
        logger.error(f"Validation error in generate_dtrs_by_period: {str(e)}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e
    except Exception as e:
        logger.error(f"Error in generate_dtrs_by_period: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate DTRs: {str(e)}"
        ) from e


@router.get("/{dtr_id}", response_model=DTRDetailResponse)
async def get_dtr_by_id(
    dtr_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get DTR by ID with full details"""
    try:
        service = DTRService(db)
        dtr = service.repository.get_by_id(dtr_id)
        
        if not dtr:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"DTR with ID {dtr_id} not found"
            )
        
        return dtr.to_dict()
        
    except Exception as e:
        logger.error(f"Error getting DTR {dtr_id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve DTR"
        ) from e


@router.get("/lease/{lease_id}", response_model=List[DTRResponse])
async def get_dtrs_by_lease(
    lease_id: int,
    status: Optional[DTRStatus] = None,
    limit: Optional[int] = Query(None, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get all DTRs for a specific lease.
    
    CORRECTED: Returns all DTRs for the lease, showing consolidated information
    from all drivers.
    """
    try:
        service = DTRService(db)
        dtrs = service.repository.get_dtrs_by_lease(lease_id, status, limit)
        
        return [dtr.to_dict() for dtr in dtrs]
        
    except Exception as e:
        logger.error(f"Error getting DTRs for lease {lease_id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve DTRs"
        ) from e


@router.get("/driver/{driver_id}", response_model=List[DTRResponse])
async def get_dtrs_by_driver(
    driver_id: int,
    status: Optional[DTRStatus] = None,
    limit: Optional[int] = Query(None, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get DTRs where driver is the PRIMARY leaseholder.
    
    NOTE: This only returns DTRs where the driver is the primary driver.
    If the driver is an additional driver, their information is in the
    additional_drivers_detail field of the lease's DTR.
    """
    try:
        service = DTRService(db)
        dtrs = service.repository.get_dtrs_by_driver(driver_id, status, limit)
        
        return [dtr.to_dict() for dtr in dtrs]
        
    except Exception as e:
        logger.error(f"Error getting DTRs for driver {driver_id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve DTRs"
        ) from e


@router.get("/", response_model=DTRListResponse)
async def list_dtrs(
    lease_id: Optional[int] = None,
    driver_id: Optional[int] = None,
    vehicle_id: Optional[int] = None,
    medallion_id: Optional[int] = None,
    status: Optional[DTRStatus] = None,
    period_start_from: Optional[date] = None,
    period_start_to: Optional[date] = None,
    dtr_number: Optional[str] = None,
    receipt_number: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    List DTRs with pagination and filters.
    
    All filters are optional. Returns paginated results.
    """
    try:
        service = DTRService(db)
        
        dtrs, total = service.repository.search_dtrs(
            lease_id=lease_id,
            driver_id=driver_id,
            vehicle_id=vehicle_id,
            medallion_id=medallion_id,
            status=status,
            period_start_from=period_start_from,
            period_start_to=period_start_to,
            dtr_number=dtr_number,
            receipt_number=receipt_number,
            page=page,
            page_size=page_size
        )
        
        return {
            "items": [dtr.to_dict() for dtr in dtrs],
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": (total + page_size - 1) // page_size
        }
        
    except Exception as e:
        logger.error(f"Error listing DTRs: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list DTRs"
        ) from e


@router.post("/{dtr_id}/finalize", response_model=DTRResponse)
async def finalize_dtr(
    dtr_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Finalize a draft DTR.
    
    Changes status from DRAFT to FINALIZED.
    Only draft DTRs can be finalized.
    """
    try:
        service = DTRService(db)
        dtr = service.finalize_dtr(dtr_id)
        
        return dtr.to_dict()
        
    except DTRNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e)) from e
    except DTRValidationError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e
    except Exception as e:
        logger.error(f"Error finalizing DTR {dtr_id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to finalize DTR"
        ) from e


@router.post("/{dtr_id}/void", response_model=DTRResponse)
async def void_dtr(
    dtr_id: int,
    reason: str = Query(..., min_length=10, max_length=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Void a DTR.
    
    Changes status to VOIDED with a reason.
    """
    try:
        service = DTRService(db)
        dtr = service.repository.void_dtr(dtr_id, reason)
        
        return dtr.to_dict()
        
    except Exception as e:
        logger.error(f"Error voiding DTR {dtr_id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to void DTR"
        ) from e


@router.get("/statistics/summary")
async def get_dtr_statistics(
    period_start: Optional[date] = None,
    period_end: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get DTR statistics for reporting.
    
    Returns summary statistics including totals, status counts, and averages.
    """
    try:
        service = DTRService(db)
        stats = service.repository.get_statistics(period_start, period_end)
        
        return stats
        
    except Exception as e:
        logger.error(f"Error getting DTR statistics: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get statistics"
        ) from e


@router.delete("/{dtr_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_dtr(
    dtr_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Delete a DTR.
    
    Only draft DTRs should be deleted. Finalized DTRs should be voided instead.
    """
    try:
        service = DTRService(db)
        
        # Check if DTR exists and is draft
        dtr = service.repository.get_by_id(dtr_id)
        if not dtr:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"DTR with ID {dtr_id} not found"
            )
        
        if dtr.status != DTRStatus.DRAFT:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Only draft DTRs can be deleted. Current status: {dtr.status.value}. Use void endpoint instead."
            )
        
        service.repository.delete(dtr_id)
        db.commit()
        
        return None
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting DTR {dtr_id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete DTR"
        ) from e
