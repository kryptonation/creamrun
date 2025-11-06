# app/dtr/router.py

from typing import List, Optional
from datetime import date
from io import BytesIO
import csv

from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.dtr.services import DTRService
from app.dtr.schemas import (
    DTRGenerationRequest, BatchDTRGenerationRequest, DTRResponse,
    DTRDetailResponse, DTRListResponse, DTRStatisticsResponse,
    DTRMarkAsPaidRequest, DTRVoidRequest, ACHBatchRequest,
    ACHBatchResponse, DTRFilterParams
)
from app.dtr.models import DTRStatus
from app.dtr.pdf_generator import DTRPDFGenerator
from app.dtr.exceptions import (
    DTRNotFoundError, DTRValidationError, DTRGenerationError
)
from app.users.utils import get_current_user
from app.users.models import User
from app.utils.logger import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/dtr", tags=["DTR - Driver Transaction Reports"])


@router.post("/generate", response_model=DTRDetailResponse, status_code=status.HTTP_201_CREATED)
async def generate_dtr(
    request: DTRGenerationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Generate a DTR for a specific driver and lease for the given period
    """
    try:
        service = DTRService(db)
        dtr = service.generate_dtr(
            lease_id=request.lease_id,
            driver_id=request.driver_id,
            period_start=request.period_start_date,
            period_end=request.period_end_date,
            auto_finalize=request.auto_finalize
        )
        
        # Build detailed response
        response_data = dtr.to_dict()
        
        # Add related entity information
        response_data['driver_name'] = f"{dtr.driver.first_name} {dtr.driver.last_name}" if dtr.driver else None
        response_data['tlc_license_number'] = dtr.driver.tlc_license_number if dtr.driver else None
        response_data['medallion_number'] = dtr.medallion.medallion_number if dtr.medallion else None
        response_data['vehicle_plate'] = dtr.vehicle.plate_number if dtr.vehicle else None
        response_data['lease_number'] = dtr.lease.lease_id if dtr.lease else None
        
        return response_data
        
    except DTRValidationError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except DTRGenerationError as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error in generate_dtr: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to generate DTR")


@router.post("/batch-generate", response_model=List[DTRResponse], status_code=status.HTTP_201_CREATED)
async def batch_generate_dtrs(
    request: BatchDTRGenerationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Generate DTRs for all active leases for the given period
    """
    try:
        service = DTRService(db)
        dtrs = service.batch_generate_dtrs(
            period_start=request.period_start_date,
            period_end=request.period_end_date,
            auto_finalize=request.auto_finalize
        )
        
        return [dtr.to_dict() for dtr in dtrs]
        
    except Exception as e:
        logger.error(f"Error in batch_generate_dtrs: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/{dtr_id}", response_model=DTRDetailResponse)
async def get_dtr(
    dtr_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get detailed DTR by ID
    """
    try:
        service = DTRService(db)
        dtr = service.get_dtr(dtr_id)
        
        response_data = dtr.to_dict()
        response_data['driver_name'] = f"{dtr.driver.first_name} {dtr.driver.last_name}" if dtr.driver else None
        response_data['tlc_license_number'] = dtr.driver.tlc_license_number if dtr.driver else None
        response_data['medallion_number'] = dtr.medallion.medallion_number if dtr.medallion else None
        response_data['vehicle_plate'] = dtr.vehicle.plate_number if dtr.vehicle else None
        response_data['lease_number'] = dtr.lease.lease_id if dtr.lease else None
        
        return response_data
        
    except DTRNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        logger.error(f"Error in get_dtr: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to retrieve DTR")


@router.get("/number/{dtr_number}", response_model=DTRDetailResponse)
async def get_dtr_by_number(
    dtr_number: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get DTR by DTR number
    """
    try:
        service = DTRService(db)
        dtr = service.get_dtr_by_number(dtr_number)
        
        response_data = dtr.to_dict()
        response_data['driver_name'] = f"{dtr.driver.first_name} {dtr.driver.last_name}" if dtr.driver else None
        response_data['tlc_license_number'] = dtr.driver.tlc_license_number if dtr.driver else None
        response_data['medallion_number'] = dtr.medallion.medallion_number if dtr.medallion else None
        response_data['vehicle_plate'] = dtr.vehicle.plate_number if dtr.vehicle else None
        response_data['lease_number'] = dtr.lease.lease_id if dtr.lease else None
        
        return response_data
        
    except DTRNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        logger.error(f"Error in get_dtr_by_number: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to retrieve DTR")


@router.get("/", response_model=DTRListResponse)
async def list_dtrs(
    driver_id: Optional[int] = None,
    lease_id: Optional[int] = None,
    status: Optional[DTRStatus] = None,
    period_start: Optional[date] = None,
    period_end: Optional[date] = None,
    is_additional_driver: Optional[bool] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List DTRs with optional filters and pagination
    """
    try:
        service = DTRService(db)
        
        skip = (page - 1) * page_size
        dtrs, total = service.list_dtrs(
            driver_id=driver_id,
            lease_id=lease_id,
            status=status,
            period_start=period_start,
            period_end=period_end,
            skip=skip,
            limit=page_size
        )
        
        total_pages = (total + page_size - 1) // page_size
        
        return {
            "items": [dtr.to_dict() for dtr in dtrs],
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages
        }
        
    except Exception as e:
        logger.error(f"Error in list_dtrs: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to list DTRs")


@router.post("/{dtr_id}/finalize", response_model=DTRResponse)
async def finalize_dtr(
    dtr_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Finalize a draft DTR
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
        logger.error(f"Error in finalize_dtr: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to finalize DTR"
        ) from e


@router.post("/{dtr_id}/void", response_model=DTRResponse)
async def void_dtr(
    dtr_id: int,
    request: DTRVoidRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Void a DTR
    """
    try:
        service = DTRService(db)
        dtr = service.void_dtr(dtr_id, request.reason)
        return dtr.to_dict()
        
    except DTRNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e)) from e
    except DTRValidationError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e
    except Exception as e:
        logger.error(f"Error in void_dtr: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to void DTR"
        ) from e


@router.post("/{dtr_id}/mark-paid", response_model=DTRResponse)
async def mark_dtr_paid(
    dtr_id: int,
    request: DTRMarkAsPaidRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Mark DTR as paid
    """
    try:
        service = DTRService(db)
        dtr = service.mark_dtr_as_paid(
            dtr_id=dtr_id,
            payment_method=request.payment_method,
            payment_date=request.payment_date,
            ach_batch_number=request.ach_batch_number,
            check_number=request.check_number
        )
        return dtr.to_dict()
        
    except DTRNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e)) from e
    except DTRValidationError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e
    except Exception as e:
        logger.error(f"Error in mark_dtr_paid: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to mark DTR as paid"
        ) from e


@router.get("/statistics/summary", response_model=DTRStatisticsResponse)
async def get_dtr_statistics(
    period_start: Optional[date] = None,
    period_end: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get DTR statistics for a period
    """
    try:
        service = DTRService(db)
        repo = service.repository
        stats = repo.get_statistics(period_start=period_start, period_end=period_end)
        return stats
        
    except Exception as e:
        logger.error(f"Error in get_dtr_statistics: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to get statistics"
        ) from e


@router.get("/{dtr_id}/pdf")
async def download_dtr_pdf(
    dtr_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Download DTR as PDF
    """
    try:
        service = DTRService(db)
        dtr = service.get_dtr(dtr_id)
        
        # Generate PDF
        pdf_generator = DTRPDFGenerator()
        pdf_bytes = pdf_generator.generate_pdf(dtr)
        
        # Return as streaming response
        return StreamingResponse(
            BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=DTR_{dtr.dtr_number}.pdf"
            }
        )
        
    except DTRNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e)) from e
    except Exception as e:
        logger.error(f"Error in download_dtr_pdf: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to generate PDF"
        ) from e


@router.get("/export/csv")
async def export_dtrs_csv(
    driver_id: Optional[int] = None,
    lease_id: Optional[int] = None,
    status: Optional[DTRStatus] = None,
    period_start: Optional[date] = None,
    period_end: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Export DTRs to CSV
    """
    try:
        service = DTRService(db)
        dtrs, _ = service.list_dtrs(
            driver_id=driver_id,
            lease_id=lease_id,
            status=status,
            period_start=period_start,
            period_end=period_end,
            skip=0,
            limit=10000  # Large limit for export
        )
        
        # Create CSV
        output = BytesIO()
        writer = csv.writer(output)
        
        # Headers
        writer.writerow([
            'DTR Number', 'Receipt Number', 'Period Start', 'Period End',
            'Driver Name', 'TLC License', 'Medallion', 'Status',
            'Gross Earnings', 'Total Charges', 'Net Earnings', 'Total Due',
            'Payment Method', 'Payment Date'
        ])
        
        # Data rows
        for dtr in dtrs:
            driver_name = f"{dtr.driver.first_name} {dtr.driver.last_name}" if dtr.driver else ""
            tlc_license = dtr.driver.tlc_license_number if dtr.driver else ""
            medallion = dtr.medallion.medallion_number if dtr.medallion else ""
            
            writer.writerow([
                dtr.dtr_number,
                dtr.receipt_number,
                dtr.period_start_date.isoformat(),
                dtr.period_end_date.isoformat(),
                driver_name,
                tlc_license,
                medallion,
                dtr.status.value,
                float(dtr.total_gross_earnings),
                float(dtr.subtotal_charges),
                float(dtr.net_earnings),
                float(dtr.total_due_to_driver),
                dtr.payment_method.value if dtr.payment_method else "",
                dtr.payment_date.isoformat() if dtr.payment_date else ""
            ])
        
        output.seek(0)
        
        return StreamingResponse(
            output,
            media_type="text/csv",
            headers={
                "Content-Disposition": "attachment; filename=dtrs_export.csv"
            }
        )
        
    except Exception as e:
        logger.error(f"Error in export_dtrs_csv: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to export CSV"
        ) from e