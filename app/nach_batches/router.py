# app/nach_batches/router.py
"""
NACH Batch Router

API endpoints for ACH batch management and NACHA file generation.
"""

import math
from io import BytesIO
from datetime import date
from typing import Optional
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.dependencies import get_db_with_current_user
from app.users.models import User
from app.users.utils import get_current_user
from app.nach_batches.service import NACHBatchService
from app.nach_batches.models import ACHBatchStatus
from app.nach_batches.schemas import (
    ACHBatchCreate,
    ACHBatchResponse,
    ACHBatchListResponse,
    ACHBatchListItem,
    ACHBatchDetailResponse,
    NACHAFileGenerateResponse,
    BatchReversalRequest,
    BatchReversalResponse,
    ACHBatchStatistics,
    StubACHBatchResponse
)
from app.nach_batches.exceptions import (
    BatchNotFoundException,
    InvalidBatchStateException,
    InvalidDTRException,
    NACHAFileGenerationException,
    EmptyBatchException
)
from app.utils.logger import get_logger
from app.utils.exporter_utils import ExporterFactory

logger = get_logger(__name__)

router = APIRouter(
    prefix="/nach-batches",
    tags=["NACH Batches"]
)


@router.post(
    "/",
    response_model=ACHBatchResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create ACH Batch",
    description="""
    Create a new ACH batch from selected DTRs.
    
    **Business Rules:**
    - DTRs must be ACH payment type
    - DTRs must not be already paid
    - DTRs must have positive amount due
    - Drivers must have valid bank account information
    - Batch number auto-generated in YYMM-NNN format
    
    **Process:**
    1. Validates all DTRs
    2. Generates unique batch number
    3. Calculates effective date
    4. Assigns batch number to DTRs
    5. Creates batch record
    """
)
def create_ach_batch(
    request: ACHBatchCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db_with_current_user)
):
    """Create a new ACH batch"""
    try:
        logger.info(
            f"Creating ACH batch with {len(request.dtr_ids)} DTRs",
            extra={"user_id": current_user.id, "dtr_count": len(request.dtr_ids)}
        )
        
        service = NACHBatchService(db)
        batch = service.create_ach_batch(
            request=request,
            created_by=current_user.id
        )
        
        logger.info(
            f"ACH batch created: {batch.batch_number}",
            extra={
                "batch_id": batch.id,
                "batch_number": batch.batch_number,
                "total_payments": batch.total_payments
            }
        )
        
        return batch
        
    except InvalidDTRException as e:
        logger.warning(f"Invalid DTR for batch creation: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        ) from e
    except EmptyBatchException as e:
        logger.warning(f"Empty batch creation attempted: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        ) from e
    except Exception as e:
        logger.error(f"Failed to create ACH batch: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create ACH batch: {str(e)}"
        ) from e


@router.get(
    "/",
    response_model=ACHBatchListResponse,
    summary="List ACH Batches",
    description="""
    Get paginated list of ACH batches with filtering and sorting.
    
    **Filters:**
    - Status: Filter by batch status
    - Date range: Filter by batch date
    - Batch number: Search by batch number (partial match)
    - NACHA generated: Filter by file generation status
    - Submitted: Filter by submission status
    
    **Sorting:**
    - Supports sorting by any field
    - Default: batch_date descending
    
    **Stub Mode:**
    - Set use_stub=true to return sample data
    """
)
def list_ach_batches(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    status: Optional[ACHBatchStatus] = Query(None, description="Filter by status"),
    date_from: Optional[date] = Query(None, description="Filter by batch date from"),
    date_to: Optional[date] = Query(None, description="Filter by batch date to"),
    batch_number: Optional[str] = Query(None, description="Search by batch number"),
    nacha_generated: Optional[bool] = Query(None, description="Filter by NACHA file generated"),
    submitted: Optional[bool] = Query(None, description="Filter by submitted to bank"),
    sort_by: str = Query("batch_date", description="Sort field"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$", description="Sort order"),
    use_stub: bool = Query(False, description="Use stub data for testing"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db_with_current_user)
):
    """List ACH batches with pagination and filters"""
    try:
        # Return stub data if requested
        # if use_stub:
        #     return _get_stub_batch_list()
        
        logger.debug(
            f"Listing ACH batches: page={page}, page_size={page_size}",
            extra={"user_id": current_user.id}
        )
        
        service = NACHBatchService(db)
        
        batches, total = service.get_batches_paginated(
            page=page,
            page_size=page_size,
            status=status,
            date_from=date_from,
            date_to=date_to,
            batch_number=batch_number,
            nacha_generated=nacha_generated,
            submitted=submitted,
            sort_by=sort_by,
            sort_order=sort_order
        )
        
        items = [ACHBatchListItem.model_validate(batch) for batch in batches]
        total_pages = math.ceil(total / page_size) if total > 0 else 0
        
        return ACHBatchListResponse(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages
        )
        
    except Exception as e:
        logger.error(f"Failed to list ACH batches: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list ACH batches: {str(e)}"
        ) from e


@router.get(
    "/{batch_id}",
    response_model=ACHBatchDetailResponse,
    summary="Get Batch Detail",
    description="""
    Get detailed information for a specific ACH batch.
    
    **Returns:**
    - Complete batch information
    - List of all payments in the batch
    - Driver and payment details
    """
)
def get_batch_detail(
    batch_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db_with_current_user)
):
    """Get detailed batch information"""
    try:
        logger.debug(f"Getting batch detail for batch_id={batch_id}")
        
        service = NACHBatchService(db)
        detail = service.get_batch_detail(batch_id)
        
        return ACHBatchDetailResponse(**detail)
        
    except BatchNotFoundException as e:
        logger.warning(f"Batch not found: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        ) from e
    except Exception as e:
        logger.error(f"Failed to get batch detail: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get batch detail: {str(e)}"
        ) from e


@router.post(
    "/{batch_id}/generate-nacha",
    response_model=NACHAFileGenerateResponse,
    summary="Generate NACHA File",
    description="""
    Generate NACHA file for an ACH batch.
    
    **Business Rules:**
    - Batch must be in CREATED status
    - NACHA file not already generated
    - All drivers must have valid bank information
    - Routing numbers validated with checksum
    
    **Process:**
    1. Validates batch state
    2. Retrieves all DTRs in batch
    3. Validates driver bank information
    4. Generates NACHA-formatted file
    5. Returns downloadable file
    
    **File Format:**
    - Standard NACHA format (94-character records)
    - Transaction code 22 (Checking Credit)
    - File ready for bank submission
    """
)
def generate_nacha_file(
    batch_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db_with_current_user)
):
    """Generate NACHA file for batch"""
    try:
        logger.info(
            f"Generating NACHA file for batch_id={batch_id}",
            extra={"user_id": current_user.id, "batch_id": batch_id}
        )
        
        service = NACHBatchService(db)
        response, file_bytes = service.generate_nacha_file(batch_id)
        
        logger.info(
            f"NACHA file generated: {response.file_name}",
            extra={
                "batch_id": batch_id,
                "file_size": response.file_size_bytes,
                "payment_count": response.total_payments
            }
        )
        
        # Return file as download
        return StreamingResponse(
            BytesIO(file_bytes),
            media_type="application/octet-stream",
            headers={
                "Content-Disposition": f"attachment; filename={response.file_name}"
            }
        )
        
    except BatchNotFoundException as e:
        logger.warning(f"Batch not found: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        ) from e
    except InvalidBatchStateException as e:
        logger.warning(f"Invalid batch state: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        ) from e
    except NACHAFileGenerationException as e:
        logger.error(f"NACHA file generation failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        ) from e
    except Exception as e:
        logger.error(f"Failed to generate NACHA file: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate NACHA file: {str(e)}"
        ) from e


@router.post(
    "/{batch_id}/reverse",
    response_model=BatchReversalResponse,
    summary="Reverse Batch",
    description="""
    Reverse an ACH batch, unmarking all payments.
    
    **Use Cases:**
    - ACH file generated with errors
    - Need to correct driver information
    - Bank rejected the batch
    - Amounts need adjustment
    
    **Process:**
    1. Validates batch can be reversed
    2. Unmarks all DTRs (sets batch_number to NULL)
    3. Updates batch status to REVERSED
    4. Records reversal reason and timestamp
    
    **Important:**
    - Payments become available for reprocessing
    - Original batch number not reused
    - Reversal cannot be undone
    """
)
def reverse_batch(
    batch_id: int,
    request: BatchReversalRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db_with_current_user)
):
    """Reverse an ACH batch"""
    try:
        logger.info(
            f"Reversing batch_id={batch_id}",
            extra={
                "user_id": current_user.id,
                "batch_id": batch_id,
                "reason": request.reversal_reason
            }
        )
        
        service = NACHBatchService(db)
        result = service.reverse_batch(
            batch_id=batch_id,
            reversed_by=current_user.id,
            reversal_reason=request.reversal_reason
        )
        
        logger.info(
            f"Batch reversed: {result.batch_number}",
            extra={
                "batch_id": batch_id,
                "payments_unmarked": result.payments_unmarked
            }
        )
        
        return result
        
    except BatchNotFoundException as e:
        logger.warning(f"Batch not found: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        ) from e
    except InvalidBatchStateException as e:
        logger.warning(f"Invalid batch state for reversal: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        ) from e
    except Exception as e:
        logger.error(f"Failed to reverse batch: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to reverse batch: {str(e)}"
        ) from e


@router.get(
    "/statistics/summary",
    response_model=ACHBatchStatistics,
    summary="Get Batch Statistics",
    description="""
    Get aggregate statistics for ACH batches.
    
    **Returns:**
    - Total batches created
    - Batches by status
    - Total payments processed
    - Total amount processed
    - Batches pending file generation
    - Batches pending submission
    """
)
def get_batch_statistics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db_with_current_user)
):
    """Get batch statistics"""
    try:
        logger.debug("Getting batch statistics")
        
        service = NACHBatchService(db)
        stats = service.get_batch_statistics()
        
        return ACHBatchStatistics(**stats)
        
    except Exception as e:
        logger.error(f"Failed to get batch statistics: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get batch statistics: {str(e)}"
        ) from e
    
@router.get(
    "/export/{format}",
    summary="Export Batches",
    description="""
    Export ACH batches to Excel, PDF, CSV, or JSON format.
    
    **Supported Formats:**
    - excel: XLSX format with formatting
    - pdf: PDF with professional layout
    - csv: Comma-separated values
    - json: JSON array
    
    **Applies all filters from list endpoint**
    """
)
def export_batches(
    format: str,
    status: Optional[ACHBatchStatus] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    batch_number: Optional[str] = Query(None),
    nacha_generated: Optional[bool] = Query(None),
    submitted: Optional[bool] = Query(None),
    sort_by: str = Query("batch_date"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db_with_current_user)
):
    """Export batches to file"""
    try:
        # Validate format
        if format.lower() not in ['excel', 'pdf', 'csv', 'json']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid format. Must be: excel, pdf, csv, or json"
            )
        
        logger.info(
            f"Exporting batches to {format}",
            extra={"user_id": current_user.id, "format": format}
        )
        
        service = NACHBatchService(db)
        
        # Get all batches matching filters (no pagination for export)
        batches, total = service.get_batches_paginated(
            page=1,
            page_size=10000,  # Large limit for export
            status=status,
            date_from=date_from,
            date_to=date_to,
            batch_number=batch_number,
            nacha_generated=nacha_generated,
            submitted=submitted,
            sort_by=sort_by,
            sort_order=sort_order
        )
        
        # Prepare export data
        export_data = []
        for batch in batches:
            export_data.append({
                "Batch Number": batch.batch_number,
                "Batch Date": batch.batch_date.isoformat(),
                "Effective Date": batch.effective_date.isoformat(),
                "Total Payments": batch.total_payments,
                "Total Amount": float(batch.total_amount),
                "Status": batch.status.value,
                "NACHA Generated": "Yes" if batch.nacha_file_generated else "No",
                "Generated On": batch.nacha_file_generated_on.isoformat() if batch.nacha_file_generated_on else "",
                "Submitted to Bank": "Yes" if batch.submitted_to_bank else "No",
                "Submitted On": batch.submitted_on.isoformat() if batch.submitted_on else "",
                "Bank Confirmation": batch.bank_confirmation_number or "",
                "Reversed": "Yes" if batch.status == ACHBatchStatus.REVERSED else "No",
                "Reversal Reason": batch.reversal_reason or "",
                "Created On": batch.created_on.isoformat()
            })
        
        if not export_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No batches found matching the criteria"
            )
        
        # Generate export file
        exporter = ExporterFactory.get_exporter(format.lower(), export_data)
        file_buffer = exporter.export()
        
        # Set media type and filename
        media_types = {
            'excel': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'pdf': 'application/pdf',
            'csv': 'text/csv',
            'json': 'application/json'
        }
        
        extensions = {
            'excel': 'xlsx',
            'pdf': 'pdf',
            'csv': 'csv',
            'json': 'json'
        }
        
        filename = f"ach_batches_export_{date.today().strftime('%Y%m%d')}.{extensions[format.lower()]}"
        
        logger.info(
            f"Exported {len(batches)} batches to {format}",
            extra={"user_id": current_user.id, "count": len(batches)}
        )
        
        return StreamingResponse(
            file_buffer,
            media_type=media_types[format.lower()],
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to export batches: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to export batches: {str(e)}"
        ) from e


# Stub data helper function
def _get_stub_batch_list() -> StubACHBatchResponse:
    """Generate stub data for testing"""
    from datetime import datetime, timedelta
    
    stub_batches = [
        ACHBatchListItem(
            id=1,
            batch_number="2510-001",
            batch_date=date.today() - timedelta(days=2),
            effective_date=date.today() - timedelta(days=1),
            total_payments=12,
            total_amount=Decimal("5240.50"),
            status=ACHBatchStatus.PROCESSED,
            nacha_file_generated=True,
            submitted_to_bank=True,
            created_on=datetime.now() - timedelta(days=2)
        ),
        ACHBatchListItem(
            id=2,
            batch_number="2510-002",
            batch_date=date.today() - timedelta(days=1),
            effective_date=date.today(),
            total_payments=8,
            total_amount=Decimal("3850.75"),
            status=ACHBatchStatus.FILE_GENERATED,
            nacha_file_generated=True,
            submitted_to_bank=False,
            created_on=datetime.now() - timedelta(days=1)
        ),
        ACHBatchListItem(
            id=3,
            batch_number="2510-003",
            batch_date=date.today(),
            effective_date=date.today() + timedelta(days=1),
            total_payments=15,
            total_amount=Decimal("6920.00"),
            status=ACHBatchStatus.CREATED,
            nacha_file_generated=False,
            submitted_to_bank=False,
            created_on=datetime.now()
        )
    ]
    
    return StubACHBatchResponse(
        message="Using stub data for testing",
        batches=stub_batches
    )