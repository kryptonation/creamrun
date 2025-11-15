# app/dtr/router.py

import csv
import time
from datetime import date, datetime
from io import BytesIO, StringIO
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.dtr.exceptions import (
    DTRGenerationError, DTRNotFoundError, DTRValidationError,
    DTRExportError
)
from app.dtr.models import DTRStatus
from app.dtr.pdf_generator import DTRPDFGenerator
from app.dtr.schemas import (
    BatchDTRGenerationRequest,
    DTRDetailResponse,
    DTRGenerationRequest,
    DTRMarkAsPaidRequest,
    DTRResponse,
    DTRStatisticsResponse,
    DTRVoidRequest,
    DTRGenerationSummary,
    PeriodDTRGenerationRequest, DTRResponse
)
from app.dtr.html_pdf_generator import DTRHTMLPDFGenerator
from app.dtr.services import DTRService
from app.users.models import User
from app.users.utils import get_current_user
from app.utils.logger import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/dtr", tags=["DTR - Driver Transaction Reports"])


@router.post(
    "/generate", response_model=DTRDetailResponse, status_code=status.HTTP_201_CREATED
)
async def generate_dtr(
    request: DTRGenerationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
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
            auto_finalize=request.auto_finalize,
        )

        # Build detailed response
        response_data = dtr.to_dict()

        # Add related entity information
        response_data["driver_name"] = (
            f"{dtr.driver.first_name} {dtr.driver.last_name}" if dtr.driver else None
        )
        response_data["tlc_license_number"] = (
            dtr.driver.tlc_license.tlc_license_number
            if dtr.driver and dtr.driver.tlc_license
            else None
        )
        response_data["medallion_number"] = (
            dtr.medallion.medallion_number if dtr.medallion else None
        )
        response_data["vehicle_plate"] = (
            dtr.vehicle.plate_number if dtr.vehicle else None
        )
        response_data["lease_number"] = dtr.lease.lease_id if dtr.lease else None

        return response_data

    except DTRValidationError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e
    except DTRGenerationError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        ) from e
    except Exception as e:
        logger.error(f"Unexpected error in generate_dtr: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate DTR",
        ) from e


@router.post(
    "/batch-generate",
    response_model=List[DTRResponse],
    status_code=status.HTTP_201_CREATED,
)
async def batch_generate_dtrs(
    request: BatchDTRGenerationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Generate DTRs for all active leases for the given period
    """
    try:
        service = DTRService(db)
        dtrs = service.batch_generate_dtrs(
            period_start=request.period_start_date,
            period_end=request.period_end_date,
            auto_finalize=request.auto_finalize,
        )

        return [dtr.to_dict() for dtr in dtrs]

    except Exception as e:
        logger.error(f"Error in batch_generate_dtrs: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        ) from e

@router.get("/export")
async def export_dtrs(
    export_format: str = Query("excel", regex="^(excel|pdf)$"),
    driver_id: Optional[int] = None,
    lease_id: Optional[int] = None,
    status: Optional[DTRStatus] = None,
    period_start: Optional[date] = None,
    period_end: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Export DTRs to Excel or PDF format
    Used by frontend Manage Driver Payments page
    Defaults to Excel format if not specified
    """
    try:
        from app.utils.exporter.excel_exporter import ExcelExporter
        from app.utils.exporter.pdf_exporter import PDFExporter

        service = DTRService(db)
        dtrs, _ = service.list_dtrs(
            driver_id=driver_id,
            lease_id=lease_id,
            status=status,
            period_start=period_start,
            period_end=period_end,
            skip=0,
            limit=10000,  # Large limit for export
        )

        if not dtrs:
            raise HTTPException(
                status_code=404, detail="No DTRs found matching the filters"
            )

        # Prepare data for export
        data = []
        for dtr in dtrs:
            driver_name = (
                f"{dtr.driver.first_name} {dtr.driver.last_name}" if dtr.driver else ""
            )
            tlc_license = (
                dtr.driver.tlc_license.tlc_license_number
                if dtr.driver and dtr.driver.tlc_license
                else ""
            )
            medallion = dtr.medallion.medallion_number if dtr.medallion else ""

            data.append(
                {
                    "DTR Number": dtr.dtr_number,
                    "Receipt Number": dtr.receipt_number,
                    "Period Start": dtr.period_start_date.isoformat(),
                    "Period End": dtr.period_end_date.isoformat(),
                    "Driver Name": driver_name,
                    "TLC License": tlc_license,
                    "Medallion": medallion,
                    "Status": dtr.status.value,
                    "Gross CC Earnings": float(dtr.gross_cc_earnings),
                    "Gross Cash Earnings": float(dtr.gross_cash_earnings),
                    "Total Gross Earnings": float(dtr.total_gross_earnings),
                    "Lease Amount": float(dtr.lease_amount),
                    "MTA/TIF Fees": float(dtr.mta_tif_fees),
                    "EZPass Tolls": float(dtr.ezpass_tolls),
                    "Violations": float(dtr.violation_tickets),
                    "TLC Tickets": float(dtr.tlc_tickets),
                    "Repairs": float(dtr.repairs),
                    "Driver Loans": float(dtr.driver_loans),
                    "Misc Charges": float(dtr.misc_charges),
                    "Total Charges": float(dtr.subtotal_charges),
                    "Prior Balance": float(dtr.prior_balance),
                    "Net Earnings": float(dtr.net_earnings),
                    "Total Due": float(dtr.total_due_to_driver),
                    "Payment Method": dtr.driver.pay_to_mode if dtr.driver else None,
                    "Payment Date": dtr.payment_date.isoformat()
                    if dtr.payment_date
                    else "",
                }
            )

        # Generate export file
        if export_format == "excel":
            exporter = ExcelExporter(data)
            file_bytes = exporter.export()
            media_type = (
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            )
            filename = f"dtrs_export_{datetime.now().strftime('%Y%m%d')}.xlsx"
        else:  # pdf
            exporter = PDFExporter(data)
            file_bytes = exporter.export()
            media_type = "application/pdf"
            filename = f"dtrs_export_{datetime.now().strftime('%Y%m%d')}.pdf"

        return StreamingResponse(
            file_bytes if isinstance(file_bytes, BytesIO) else BytesIO(file_bytes),
            media_type=media_type,
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in export_dtrs: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to export DTRs",
        ) from e

@router.get("/{dtr_id}", response_model=DTRDetailResponse)
async def get_dtr(
    dtr_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get detailed DTR by ID
    """
    try:
        service = DTRService(db)
        dtr = service.get_dtr(dtr_id)

        response_data = dtr.to_dict()
        response_data["driver_name"] = (
            f"{dtr.driver.first_name} {dtr.driver.last_name}" if dtr.driver else None
        )
        response_data["tlc_license_number"] = (
            dtr.driver.tlc_license.tlc_license_number
            if dtr.driver and dtr.driver.tlc_license
            else None
        )
        response_data["payment_method"] = (
                dtr.driver.pay_to_mode if dtr.driver else None
            )
        response_data["medallion_number"] = (
            dtr.medallion.medallion_number if dtr.medallion else None
        )
        response_data["vehicle_plate"] = (
            dtr.vehicle.plate_number if dtr.vehicle else None
        )
        response_data["lease_number"] = dtr.lease.lease_id if dtr.lease else None

        return response_data

    except DTRNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e)) from e
    except Exception as e:
        logger.error(f"Error in get_dtr: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve DTR",
        ) from e


@router.get("/number/{dtr_number}", response_model=DTRDetailResponse)
async def get_dtr_by_number(
    dtr_number: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get DTR by DTR number
    """
    try:
        service = DTRService(db)
        dtr = service.get_dtr_by_number(dtr_number)

        response_data = dtr.to_dict()
        response_data["driver_name"] = (
            f"{dtr.driver.first_name} {dtr.driver.last_name}" if dtr.driver else None
        )
        response_data["tlc_license_number"] = (
            dtr.driver.tlc_license.tlc_license_number
            if dtr.driver and dtr.driver.tlc_license
            else None
        )
        response_data["medallion_number"] = (
            dtr.medallion.medallion_number if dtr.medallion else None
        )

        response_data["payment_method"] = (
                dtr.driver.pay_to_mode if dtr.driver else None
            )
        
        response_data["vehicle_plate"] = (
            dtr.vehicle.plate_number if dtr.vehicle else None
        )
        response_data["lease_number"] = dtr.lease.lease_id if dtr.lease else None

        return response_data

    except DTRNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e)) from e
    except Exception as e:
        logger.error(f"Error in get_dtr_by_number: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve DTR",
        ) from e


@router.get("/")
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
    current_user: User = Depends(get_current_user),
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
            limit=page_size,
        )

        total_pages = (total + page_size - 1) // page_size

        # Build list with related entity information
        items = []

        for dtr in dtrs:
            dtr_data = dtr.to_dict()
            # Add related entity information
            dtr_data["driver_name"] = (
                f"{dtr.driver.first_name} {dtr.driver.last_name}"
                if dtr.driver
                else None
            )
            dtr_data["tlc_license_number"] = (
                dtr.driver.tlc_license.tlc_license_number
                if dtr.driver and dtr.driver.tlc_license
                else None
            )
            dtr_data["payment_method"] = (
                dtr.driver.pay_to_mode if dtr.driver else None
            )
            dtr_data["medallion_number"] = (
                dtr.medallion.medallion_number if dtr.medallion else None
            )
            # Get plate number from active vehicle registration
            dtr_data["vehicle_plate"] = (
                dtr.vehicle.get_active_plate_number() if dtr.vehicle else None
            )
            dtr_data["lease_number"] = dtr.lease.lease_id if dtr.lease else None
            items.append(dtr_data)

        return {
            "items": items,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages,
        }

    except Exception as e:
        logger.error(f"Error in list_dtrs: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list DTRs",
        ) from e


@router.post("/{dtr_id}/finalize", response_model=DTRResponse)
async def finalize_dtr(
    dtr_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
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
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
        ) from e
    except Exception as e:
        logger.error(f"Error in finalize_dtr: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to finalize DTR",
        ) from e


@router.post("/{dtr_id}/void", response_model=DTRResponse)
async def void_dtr(
    dtr_id: int,
    request: DTRVoidRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
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
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
        ) from e
    except Exception as e:
        logger.error(f"Error in void_dtr: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to void DTR",
        ) from e


@router.post("/{dtr_id}/mark-paid", response_model=DTRResponse)
async def mark_dtr_paid(
    dtr_id: int,
    request: DTRMarkAsPaidRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
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
            check_number=request.check_number,
        )
        return dtr.to_dict()

    except DTRNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e)) from e
    except DTRValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
        ) from e
    except Exception as e:
        logger.error(f"Error in mark_dtr_paid: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to mark DTR as paid",
        ) from e


@router.get("/statistics/summary", response_model=DTRStatisticsResponse)
async def get_dtr_statistics(
    period_start: Optional[date] = None,
    period_end: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
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
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get statistics",
        ) from e


@router.get("/{dtr_id}/pdf")
async def download_dtr_pdf(
    dtr_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
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
            },
        )

    except DTRNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e)) from e
    except Exception as e:
        logger.error(f"Error in download_dtr_pdf: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate PDF",
        ) from e


@router.get("/export/csv")
async def export_dtrs_csv(
    driver_id: Optional[int] = None,
    lease_id: Optional[int] = None,
    status: Optional[DTRStatus] = None,
    period_start: Optional[date] = None,
    period_end: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
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
            limit=10000,  # Large limit for export
        )

        # Create CSV using StringIO for text-based CSV writing
        output = StringIO()
        writer = csv.writer(output)

        # Headers
        writer.writerow(
            [
                "DTR Number",
                "Receipt Number",
                "Period Start",
                "Period End",
                "Driver Name",
                "TLC License",
                "Medallion",
                "Status",
                "Gross Earnings",
                "Total Charges",
                "Net Earnings",
                "Total Due",
                "Payment Method",
                "Payment Date",
            ]
        )

        # Data rows
        for dtr in dtrs:
            driver_name = (
                f"{dtr.driver.first_name} {dtr.driver.last_name}" if dtr.driver else ""
            )
            tlc_license = (
                dtr.driver.tlc_license.tlc_license_number
                if dtr.driver and dtr.driver.tlc_license
                else ""
            )
            medallion = dtr.medallion.medallion_number if dtr.medallion else ""

            writer.writerow(
                [
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
                    dtr.payment_date.isoformat() if dtr.payment_date else "",
                ]
            )

        # Get the CSV content as string
        csv_content = output.getvalue()
        output.close()

        # Return as StreamingResponse with proper encoding
        return StreamingResponse(
            iter([csv_content]),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=dtrs_export.csv"},
        )

    except Exception as e:
        logger.error(f"Error in export_dtrs_csv: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to export CSV",
        ) from e
    

@router.get("/html/{dtr_id}/pdf")
async def download_html_dtr_pdf(
    dtr_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Download DTR as PDF using HTML template
    
    This endpoint now uses the HTML-based PDF generator instead of ReportLab.
    The PDF is generated from the dtr_format_one.html template using WeasyPrint.
    """
    try:
        service = DTRService(db)
        dtr = service.get_dtr(dtr_id)

        # Generate PDF using HTML template (NEW)
        pdf_generator = DTRHTMLPDFGenerator()
        pdf_bytes = pdf_generator.generate_pdf(dtr)

        # Return as streaming response
        return StreamingResponse(
            BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=DTR_{dtr.dtr_number}.pdf"
            },
        )

    except DTRNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail=str(e)
        ) from e
    except DTRExportError as e:
        logger.error(f"PDF generation failed for DTR {dtr_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate PDF: {str(e)}",
        ) from e
    except Exception as e:
        logger.error(f"Unexpected error in download_dtr_pdf: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate PDF",
        ) from e

@router.post(
    "/generate-by-period",
    response_model=DTRGenerationSummary,
    status_code=status.HTTP_201_CREATED
)
async def generate_dtrs_by_period(
    request: PeriodDTRGenerationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Generate DTRs for all active leases for the specified period.
    
    This endpoint generates DTRs for ALL leases (regardless of driver_id or lease_id)
    that are active during the specified period.
    
    **Parameters:**
    - `period_start_date`: Start date of the period (typically Sunday)
    - `period_end_date`: End date of the period (typically Saturday)
    - `auto_finalize`: If true, automatically finalize generated DTRs (default: false)
    - `regenerate_existing`: If true, regenerate DTRs that already exist for this period (default: false)
    - `lease_status_filter`: Optional filter by lease status (e.g., "ACTIVE")
    
    **Returns:**
    - Summary of generation results including:
        - Total leases found
        - DTRs generated successfully
        - DTRs skipped (already exist)
        - DTRs failed
        - Detailed lists of each category
    
    **Example:**
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
    start_time = time.time()
    
    try:
        logger.info(
            f"Starting DTR generation for period {request.period_start_date} to {request.period_end_date}"
        )
        
        service = DTRService(db)
        
        # Generate DTRs for the period
        result = service.generate_dtrs_for_period(
            period_start=request.period_start_date,
            period_end=request.period_end_date,
            auto_finalize=request.auto_finalize,
            regenerate_existing=request.regenerate_existing,
            lease_status_filter=request.lease_status_filter
        )
        
        generation_time = time.time() - start_time
        
        # Build summary
        summary = DTRGenerationSummary(
            total_leases_found=result['total_leases'],
            dtrs_generated=result['generated_count'],
            dtrs_skipped=result['skipped_count'],
            dtrs_failed=result['failed_count'],
            generation_time_seconds=round(generation_time, 2),
            period_start=request.period_start_date,
            period_end=request.period_end_date,
            generated_dtrs=result['generated'],
            skipped_dtrs=result['skipped'],
            failed_dtrs=result['failed']
        )
        
        logger.info(
            f"DTR generation completed: {result['generated_count']} generated, "
            f"{result['skipped_count']} skipped, {result['failed_count']} failed "
            f"in {generation_time:.2f} seconds"
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