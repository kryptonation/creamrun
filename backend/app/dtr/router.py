"""
app/dtr/router.py

FastAPI router for DTR endpoints
"""

from math import ceil
from datetime import date, datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse, Response
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.users.models import User
from app.users.utils import get_current_user

from app.dtr.models import DTRStatus, DTRPaymentType
from app.dtr.schemas import (
    GenerateDTRRequest, GenerateDTRResponse,
    UpdateDTRPaymentRequest, VoidDTRRequest,
    DTRSummaryResponse, DTRDetailResponse, PaginatedDTRResponse,
    DTRStatisticsResponse, DTRGenerationHistoryResponse
)
from app.dtr.service import DTRService
from app.dtr.exceptions import (
    DTRNotFoundError, DTRAlreadyExistsError, DTRInvalidPeriodError,
    DTRGenerationError, DTRVoidedError, DTRPaymentUpdateError
)

from app.utils.exporter_utils import ExporterFactory
from app.utils.s3_utils import S3Utils
from app.utils.logger import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/dtr", tags=["DTR"])


# === Generation Endpoints ===

@router.post(
    "/generate",
    response_model=GenerateDTRResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Generate DTRs for Period",
    description="""
    Generate DTRs for all active leases in the specified payment period.
    
    The period must be exactly 7 days, starting on Sunday and ending on Saturday.
    
    Process:
    1. Validates period dates (Sunday to Saturday)
    2. Finds all active leases for the period
    3. Collects financial data from ledger balances
    4. Generates PDF for each DTR
    5. Uploads PDFs to S3
    6. Creates DTR records in database
    
    Use regenerate=True to void and regenerate existing DTRs.
    """
)
def generate_dtrs(
    request: GenerateDTRRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Generate DTRs for a payment period
    
    This is typically called by the scheduled Celery task every Sunday at 05:00 AM,
    but can also be triggered manually by authorized users.
    """
    try:
        service = DTRService(db)
        
        result = service.generate_dtrs_for_period(
            period_start=request.period_start,
            period_end=request.period_end,
            lease_ids=request.lease_ids,
            regenerate=request.regenerate,
            triggered_by="USER",
            triggered_by_user_id=current_user.id
        )
        
        return GenerateDTRResponse(**result)
        
    except DTRInvalidPeriodError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        ) from e
    except DTRGenerationError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        ) from e
    except Exception as e:
        logger.error(f"Failed to generate DTRs: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate DTRs: {str(e)}"
        ) from e


# === Retrieval Endpoints ===

@router.get(
    "/",
    response_model=PaginatedDTRResponse,
    summary="List DTRs",
    description="""
    List DTRs with comprehensive filtering, sorting, and pagination.
    
    Filters:
    - dtr_id: Partial match on DTR ID
    - receipt_number: Partial match on receipt number
    - lease_id: Exact match on lease ID
    - driver_id: Exact match on driver ID
    - medallion_id: Exact match on medallion ID
    - vehicle_id: Exact match on vehicle ID
    - period_start: Filter by period start date
    - period_end: Filter by period end date
    - status: Filter by DTR status
    - payment_type: Filter by payment type
    - date_from: DTRs with period starting on or after this date
    - date_to: DTRs with period ending on or before this date
    
    Sorting:
    - sort_by: Column to sort by (default: period_start)
    - sort_order: asc or desc (default: desc)
    
    Returns paginated list with driver and vehicle information.
    """
)
def list_dtrs(
    dtr_id: Optional[str] = Query(None, description="Filter by DTR ID (partial match)"),
    receipt_number: Optional[str] = Query(None, description="Filter by receipt number (partial match)"),
    lease_id: Optional[int] = Query(None, gt=0, description="Filter by lease ID"),
    driver_id: Optional[int] = Query(None, gt=0, description="Filter by driver ID"),
    medallion_id: Optional[int] = Query(None, gt=0, description="Filter by medallion ID"),
    vehicle_id: Optional[int] = Query(None, gt=0, description="Filter by vehicle ID"),
    period_start: Optional[date] = Query(None, description="Filter by period start"),
    period_end: Optional[date] = Query(None, description="Filter by period end"),
    status: Optional[DTRStatus] = Query(None, description="Filter by status"),
    payment_type: Optional[DTRPaymentType] = Query(None, description="Filter by payment type"),
    date_from: Optional[date] = Query(None, description="DTRs starting on or after this date"),
    date_to: Optional[date] = Query(None, description="DTRs ending on or before this date"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    sort_by: str = Query("period_start", description="Column to sort by"),
    sort_order: str = Query("desc", regex="^(asc|desc)$", description="Sort order"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List DTRs with filters"""
    try:
        service = DTRService(db)
        
        dtrs, total = service.find_dtrs(
            dtr_id=dtr_id,
            receipt_number=receipt_number,
            lease_id=lease_id,
            driver_id=driver_id,
            medallion_id=medallion_id,
            vehicle_id=vehicle_id,
            period_start=period_start,
            period_end=period_end,
            status=status,
            payment_type=payment_type,
            date_from=date_from,
            date_to=date_to,
            page=page,
            page_size=page_size,
            sort_by=sort_by,
            sort_order=sort_order
        )
        
        # Build response with additional info
        items = []
        for dtr in dtrs:
            summary = DTRSummaryResponse.model_validate(dtr)
            
            # Add driver name
            if dtr.driver:
                summary.driver_name = f"{dtr.driver.first_name} {dtr.driver.last_name}"
            
            # Add medallion number
            if dtr.medallion:
                summary.medallion_number = dtr.medallion.medallion_number
            
            # Add TLC license
            if dtr.driver and hasattr(dtr.driver, 'tlc_license_number'):
                summary.tlc_license = dtr.driver.tlc_license_number
            
            items.append(summary)
        
        return PaginatedDTRResponse(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=ceil(total / page_size) if total > 0 else 0
        )
        
    except Exception as e:
        logger.error(f"Failed to list DTRs: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list DTRs: {str(e)}"
        ) from e


@router.get(
    "/{dtr_id}",
    response_model=DTRDetailResponse,
    summary="Get DTR Details",
    description="""
    Get complete details for a specific DTR.
    
    Returns all financial information, payment details, and PDF URL.
    """
)
def get_dtr(
    dtr_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get DTR by ID"""
    try:
        service = DTRService(db)
        dtr = service.get_dtr_by_id(dtr_id)
        
        # Build detailed response
        detail = DTRDetailResponse.model_validate(dtr)
        
        # Add entity information
        if dtr.driver:
            detail.driver_name = f"{dtr.driver.first_name} {dtr.driver.last_name}"
            if hasattr(dtr.driver, 'tlc_license_number'):
                detail.tlc_license = dtr.driver.tlc_license_number
        
        if dtr.medallion:
            detail.medallion_number = dtr.medallion.medallion_number
        
        if dtr.vehicle:
            detail.vehicle_plate = dtr.vehicle.plate_number
            detail.vehicle_vin = dtr.vehicle.vin
        
        return detail
        
    except DTRNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        ) from e
    except Exception as e:
        logger.error(f"Failed to get DTR {dtr_id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get DTR: {str(e)}"
        ) from e


@router.get(
    "/receipt/{receipt_number}",
    response_model=DTRDetailResponse,
    summary="Get DTR by Receipt Number",
    description="Get DTR details using receipt number"
)
def get_dtr_by_receipt(
    receipt_number: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get DTR by receipt number"""
    try:
        service = DTRService(db)
        dtr = service.get_dtr_by_receipt_number(receipt_number)
        
        detail = DTRDetailResponse.model_validate(dtr)
        
        # Add entity information
        if dtr.driver:
            detail.driver_name = f"{dtr.driver.first_name} {dtr.driver.last_name}"
            if hasattr(dtr.driver, 'tlc_license_number'):
                detail.tlc_license = dtr.driver.tlc_license_number
        
        if dtr.medallion:
            detail.medallion_number = dtr.medallion.medallion_number
        
        if dtr.vehicle:
            detail.vehicle_plate = dtr.vehicle.plate_number
            detail.vehicle_vin = dtr.vehicle.vin
        
        return detail
        
    except DTRNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        ) from e
    except Exception as e:
        logger.error(f"Failed to get DTR by receipt {receipt_number}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get DTR: {str(e)}"
        ) from e


@router.get(
    "/{dtr_id}/pdf",
    summary="Download DTR PDF",
    description="""
    Download the PDF for a specific DTR.
    
    Returns the PDF file as a streaming response.
    If PDF is not yet generated, returns 404.
    """
)
def download_dtr_pdf(
    dtr_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Download DTR PDF"""
    try:
        service = DTRService(db)
        dtr = service.get_dtr_by_id(dtr_id)
        
        if not dtr.pdf_s3_key:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="PDF not yet generated for this DTR"
            )
        
        # Download from S3
        s3_utils = S3Utils()
        pdf_bytes = s3_utils.download_file(dtr.pdf_s3_key)
        
        if not pdf_bytes:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="PDF file not found in storage"
            )
        
        from io import BytesIO
        pdf_buffer = BytesIO(pdf_bytes)
        
        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename={dtr_id}.pdf"
            }
        )
        
    except DTRNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        ) from e
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to download PDF for DTR {dtr_id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to download PDF: {str(e)}"
        ) from e


# === Update Endpoints ===

@router.patch(
    "/{dtr_id}/payment",
    response_model=DTRDetailResponse,
    summary="Update Payment Information",
    description="""
    Update payment information for a DTR.
    
    This is typically used after processing ACH batches or issuing checks
    to record the payment method and batch/check number.
    
    DTR must be in GENERATED status to update payment information.
    """
)
def update_payment_info(
    dtr_id: str,
    request: UpdateDTRPaymentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update payment information"""
    try:
        service = DTRService(db)
        
        dtr = service.update_payment_info(
            dtr_id=dtr_id,
            payment_type=request.payment_type,
            batch_number=request.batch_number,
            payment_date=request.payment_date,
            updated_by_user_id=current_user.id
        )
        
        return DTRDetailResponse.model_validate(dtr)
        
    except DTRNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        ) from e
    except (DTRVoidedError, DTRPaymentUpdateError) as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        ) from e
    except Exception as e:
        logger.error(f"Failed to update payment info for DTR {dtr_id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update payment info: {str(e)}"
        ) from e


@router.post(
    "/{dtr_id}/void",
    response_model=DTRDetailResponse,
    summary="Void DTR",
    description="""
    Void a DTR.
    
    Voiding a DTR marks it as invalid. This is typically done when:
    - The DTR was generated with incorrect data
    - The period needs to be regenerated
    - There was an error in the generation process
    
    Voided DTRs are kept for audit purposes but excluded from reports.
    """
)
def void_dtr(
    dtr_id: str,
    request: VoidDTRRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Void a DTR"""
    try:
        service = DTRService(db)
        
        dtr = service.void_dtr(
            dtr_id=dtr_id,
            reason=request.reason,
            voided_by_user_id=current_user.id
        )
        
        return DTRDetailResponse.model_validate(dtr)
        
    except DTRNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        ) from e
    except DTRVoidedError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        ) from e
    except Exception as e:
        logger.error(f"Failed to void DTR {dtr_id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to void DTR: {str(e)}"
        ) from e


# === Statistics and History ===

@router.get(
    "/statistics/summary",
    response_model=DTRStatisticsResponse,
    summary="Get DTR Statistics",
    description="""
    Get aggregate statistics for DTR module.
    
    Includes:
    - Total DTRs by status
    - Current week earnings and deductions
    - Average net earnings per DTR
    """
)
def get_statistics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get DTR statistics"""
    try:
        service = DTRService(db)
        stats = service.get_statistics()
        
        return DTRStatisticsResponse(**stats)
        
    except Exception as e:
        logger.error(f"Failed to get statistics: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get statistics: {str(e)}"
        ) from e


@router.get(
    "/history/generation",
    response_model=List[DTRGenerationHistoryResponse],
    summary="Get Generation History",
    description="""
    Get history of DTR generation runs.
    
    Shows when DTRs were generated, how many succeeded/failed,
    and execution time. Useful for monitoring and debugging.
    """
)
def get_generation_history(
    period_start: Optional[date] = Query(None),
    period_end: Optional[date] = Query(None),
    status: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get DTR generation history"""
    try:
        service = DTRService(db)
        
        history = service.get_generation_history(
            period_start=period_start,
            period_end=period_end,
            status=status,
            limit=limit
        )
        
        return [DTRGenerationHistoryResponse.model_validate(h) for h in history]
        
    except Exception as e:
        logger.error(f"Failed to get generation history: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get generation history: {str(e)}"
        ) from e


# === Export Endpoints ===

@router.get(
    "/export/{format}",
    summary="Export DTRs",
    description="""
    Export DTRs to Excel, PDF, CSV, or JSON format.
    
    Supports all the same filters as the list endpoint.
    Exports all matching records (no pagination).
    
    Formats:
    - excel: XLSX file with formatted columns
    - pdf: PDF report with tabular layout
    - csv: Comma-separated values
    - json: JSON array
    """
)
def export_dtrs(
    format: str,
    dtr_id: Optional[str] = Query(None),
    receipt_number: Optional[str] = Query(None),
    lease_id: Optional[int] = Query(None, gt=0),
    driver_id: Optional[int] = Query(None, gt=0),
    medallion_id: Optional[int] = Query(None, gt=0),
    vehicle_id: Optional[int] = Query(None, gt=0),
    period_start: Optional[date] = Query(None),
    period_end: Optional[date] = Query(None),
    status: Optional[DTRStatus] = Query(None),
    payment_type: Optional[DTRPaymentType] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    sort_by: str = Query("period_start"),
    sort_order: str = Query("desc", regex="^(asc|desc)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Export DTRs to file"""
    try:
        if format.lower() not in ['excel', 'pdf', 'csv', 'json']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid format. Must be one of: excel, pdf, csv, json"
            )
        
        service = DTRService(db)
        
        # Get all DTRs without pagination
        dtrs, total = service.find_dtrs(
            dtr_id=dtr_id,
            receipt_number=receipt_number,
            lease_id=lease_id,
            driver_id=driver_id,
            medallion_id=medallion_id,
            vehicle_id=vehicle_id,
            period_start=period_start,
            period_end=period_end,
            status=status,
            payment_type=payment_type,
            date_from=date_from,
            date_to=date_to,
            page=1,
            page_size=10000,  # Get all records
            sort_by=sort_by,
            sort_order=sort_order
        )
        
        if not dtrs:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No DTRs found matching the criteria"
            )
        
        # Prepare export data
        export_data = []
        for dtr in dtrs:
            driver_name = f"{dtr.driver.first_name} {dtr.driver.last_name}" if dtr.driver else "N/A"
            medallion_number = dtr.medallion.medallion_number if dtr.medallion else "N/A"
            tlc_license = dtr.driver.tlc_license_number if dtr.driver and hasattr(dtr.driver, 'tlc_license_number') else "N/A"
            
            export_data.append({
                "DTR ID": dtr.dtr_id,
                "Receipt Number": dtr.receipt_number,
                "Receipt Date": dtr.receipt_date.strftime("%Y-%m-%d"),
                "Period Start": dtr.period_start.strftime("%Y-%m-%d"),
                "Period End": dtr.period_end.strftime("%Y-%m-%d"),
                "Lease ID": dtr.lease_id,
                "Driver Name": driver_name,
                "TLC License": tlc_license,
                "Medallion": medallion_number,
                "CC Earnings": float(dtr.cc_earnings),
                "Cash Earnings": float(dtr.cash_earnings),
                "Total Earnings": float(dtr.total_earnings),
                "Taxes": float(dtr.taxes_amount),
                "EZPass": float(dtr.ezpass_amount),
                "Lease Amount": float(dtr.lease_amount),
                "PVB": float(dtr.pvb_amount),
                "TLC": float(dtr.tlc_amount),
                "Repairs": float(dtr.repairs_amount),
                "Loans": float(dtr.loans_amount),
                "Misc": float(dtr.misc_amount),
                "Total Deductions": float(dtr.total_deductions),
                "Prior Balance": float(dtr.prior_balance),
                "Net Earnings": float(dtr.net_earnings),
                "Total Due": float(dtr.total_due),
                "Deposit Amount": float(dtr.deposit_amount),
                "Status": dtr.status.value,
                "Payment Type": dtr.payment_type.value,
                "Batch/Check Number": dtr.batch_number or "",
                "Payment Date": dtr.payment_date.strftime("%Y-%m-%d") if dtr.payment_date else "",
                "Generated At": dtr.generated_at.strftime("%Y-%m-%d %H:%M:%S") if dtr.generated_at else ""
            })
        
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
        
        logger.info(f"Exported {len(dtrs)} DTRs to {format} by user {current_user.id}")
        
        return StreamingResponse(
            file_buffer,
            media_type=media_types[format.lower()],
            headers={
                "Content-Disposition": f"attachment; filename=dtr_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.{extensions[format.lower()]}"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to export DTRs: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to export DTRs: {str(e)}"
        ) from e
    
