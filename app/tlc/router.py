### app/tlc/router.py

import math
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.bpm.services import bpm_service
from app.core.db import get_db
from app.core.dependencies import get_db_with_current_user
from app.tlc.exceptions import TLCViolationNotFoundError
from app.tlc.schemas import (
    PaginatedTLCViolationResponse,
    TLCViolationListResponse,
)
from app.tlc.services import TLCService
from app.tlc.stubs import create_stub_tlc_response
from app.users.models import User
from app.users.utils import get_current_user
from app.utils.exporter.excel_exporter import ExcelExporter
from app.utils.exporter.pdf_exporter import PDFExporter
from app.utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/violations/tlc", tags=["TLC Violations"])

# Dependency to inject the TLCService
def get_tlc_service(db: Session = Depends(get_db)) -> TLCService:
    """Provides an instance of TLCService with the current DB session."""
    return TLCService(db)


@router.get("", response_model=PaginatedTLCViolationResponse, summary="List TLC Violations")
def list_tlc_violations(
    use_stubs: bool = Query(False, description="Return stubbed data for testing."),
    page: int = Query(1, ge=1, description="Page number for pagination."),
    per_page: int = Query(10, ge=1, le=100, description="Items per page."),
    sort_by: Optional[str] = Query("issue_date", description="Field to sort by."),
    sort_order: str = Query("desc", enum=["asc", "desc"]),
    plate: Optional[str] = Query(None, description="Filter by plate number."),
    state: Optional[str] = Query(None, description="Filter by state."),
    type: Optional[str] = Query(None, description="Filter by violation type (FI, FN, RF)."),
    summons: Optional[str] = Query(None, description="Filter by summons number."),
    issue_date: Optional[date] = Query(None, description="Filter by issue date."),
    driver_id: Optional[str] = Query(None, description="Filter by Driver ID."),
    medallion_no: Optional[str] = Query(None, description="Filter by Medallion Number."),
    tlc_service: TLCService = Depends(get_tlc_service),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieves a paginated and filterable list of all TLC violations.
    Supports filtering by plate, state, type, summons, issue date, driver, and medallion.
    """
    if use_stubs:
        return create_stub_tlc_response(page, per_page)
    
    try:
        violations, total_items = tlc_service.repo.list_violations(
            page=page,
            per_page=per_page,
            sort_by=sort_by,
            sort_order=sort_order,
            plate=plate,
            state=state,
            type=type,
            summons=summons,
            issue_date=issue_date,
            driver_id=driver_id,
            medallion_no=medallion_no,
        )

        response_items = []
        for violation in violations:
            response_items.append(
                TLCViolationListResponse(
                    plate=violation.plate if hasattr(violation, 'plate') else "N/A",
                    state=violation.state if hasattr(violation, 'state') else "NY",
                    type=violation.violation_type,
                    summons_no=violation.summons_no,
                    issue_date=violation.issue_date,
                    issue_time=violation.issue_time,
                    driver_id=violation.driver.driver_id if violation.driver else None,
                    medallion_no=violation.medallion.medallion_number if violation.medallion else None,
                )
            )
        
        total_pages = math.ceil(total_items / per_page) if per_page > 0 else 0

        return PaginatedTLCViolationResponse(
            items=response_items,
            total_items=total_items,
            page=page,
            per_page=per_page,
            total_pages=total_pages
        )
    except Exception as e:
        logger.error("Error fetching TLC violations: %s", e, exc_info=True)
        raise HTTPException(
            status_code=500, 
            detail="An error occurred while fetching TLC violations."
        ) from e


@router.post("/create-case", summary="Create a New TLC Violation Case", status_code=status.HTTP_201_CREATED)
def create_tlc_violation_case(
    db: Session = Depends(get_db_with_current_user),
    current_user: User = Depends(get_current_user),
):
    """
    Initiates a new BPM workflow for manually creating a TLC Violation.
    """
    try:
        new_case = bpm_service.create_case(db, prefix="CRTLC", user=current_user)
        return {
            "message": "New Create TLC Violation case started successfully.",
            "case_no": new_case.case_no,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        logger.error("Error creating TLC violation case: %s", e, exc_info=True)
        raise HTTPException(
            status_code=500, 
            detail="Could not start a new TLC violation case."
        ) from e


@router.get("/{summons_no}", summary="View TLC Violation Details")
def get_tlc_violation_details(
    summons_no: str,
    tlc_service: TLCService = Depends(get_tlc_service),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieves the detailed view of a single TLC violation by summons number.
    """
    try:
        violation = tlc_service.repo.get_violation_by_summons(summons_no)
        if not violation:
            raise TLCViolationNotFoundError(summons_no)

        # Build detailed response
        driver_details = {
            "driver_id": violation.driver.driver_id if violation.driver else None,
            "full_name": violation.driver.full_name if violation.driver else None,
            "tlc_license": violation.driver.tlc_license.tlc_license_number if violation.driver and violation.driver.tlc_license else None,
        }
        
        lease_details = {
            "lease_id": violation.lease.lease_id if violation.lease else None,
            "lease_type": violation.lease.lease_type if violation.lease else None,
        }
        
        medallion_details = {
            "medallion_no": violation.medallion.medallion_number if violation.medallion else None,
        }

        return {
            "summons_no": violation.summons_no,
            "violation_type": violation.violation_type,
            "issue_date": violation.issue_date,
            "issue_time": violation.issue_time,
            "description": violation.description,
            "amount": violation.amount,
            "service_fee": violation.service_fee,
            "total_payable": violation.total_payable,
            "disposition": violation.disposition,
            "status": violation.status,
            "driver_details": driver_details,
            "lease_details": lease_details,
            "medallion_details": medallion_details,
            "original_posting_id": violation.original_posting_id,
            "reversal_posting_id": violation.reversal_posting_id,
            "created_on": violation.created_on,
        }
    except TLCViolationNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e)) from e
    except Exception as e:
        logger.error(f"Error fetching details for TLC violation {summons_no}: {e}", exc_info=True)
        raise HTTPException(
            status_code=500, 
            detail="An error occurred while fetching TLC violation details."
        ) from e


@router.get("/export", summary="Export TLC Violations Data")
def export_tlc_violations(
    format: str = Query("excel", enum=["excel", "pdf"]),
    sort_by: Optional[str] = Query("issue_date"),
    sort_order: str = Query("desc"),
    plate: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    type: Optional[str] = Query(None),
    summons: Optional[str] = Query(None),
    issue_date: Optional[date] = Query(None),
    driver_id: Optional[str] = Query(None),
    medallion_no: Optional[str] = Query(None),
    tlc_service: TLCService = Depends(get_tlc_service),
    current_user: User = Depends(get_current_user),
):
    """
    Exports filtered TLC violation data to the specified format (Excel or PDF).
    """
    try:
        violations, _ = tlc_service.repo.list_violations(
            page=1, 
            per_page=10000, 
            sort_by=sort_by, 
            sort_order=sort_order,
            plate=plate,
            state=state,
            type=type,
            summons=summons,
            issue_date=issue_date,
            driver_id=driver_id,
            medallion_no=medallion_no,
        )

        if not violations:
            raise HTTPException(
                status_code=404, 
                detail="No TLC violation data available for export with the given filters."
            )

        # Prepare export data
        export_data = []
        for violation in violations:
            export_data.append({
                "Summons No": violation.summons_no,
                "Plate": getattr(violation, 'plate', 'N/A'),
                "State": getattr(violation, 'state', 'NY'),
                "Type": violation.violation_type.value,
                "Issue Date": violation.issue_date.strftime("%Y-%m-%d"),
                "Issue Time": violation.issue_time.strftime("%H:%M") if violation.issue_time else "",
                "Driver ID": violation.driver.driver_id if violation.driver else "",
                "Medallion": violation.medallion.medallion_number if violation.medallion else "",
                "Amount": float(violation.amount),
                "Service Fee": float(violation.service_fee),
                "Total": float(violation.total_payable),
                "Disposition": violation.disposition.value,
                "Status": violation.status.value,
            })
        
        filename = f"tlc_violations_{date.today()}.{'xlsx' if format == 'excel' else 'pdf'}"
        
        if format == "excel":
            exporter = ExcelExporter(export_data)
            file_content = exporter.export()
            media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        else:  # PDF
            exporter = PDFExporter(export_data)
            file_content = exporter.export()
            media_type = "application/pdf"
        
        headers = {"Content-Disposition": f"attachment; filename={filename}"}
        return StreamingResponse(file_content, media_type=media_type, headers=headers)

    except Exception as e:
        logger.error("Error exporting TLC violation data: %s", e, exc_info=True)
        raise HTTPException(
            status_code=500, 
            detail="An error occurred during the export process."
        ) from e