### app/pvb/router.py

import math
from datetime import date
from io import BytesIO
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.responses import JSONResponse, StreamingResponse
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.dependencies import get_db_with_current_user
from app.pvb.exceptions import PVBError
from app.pvb.schemas import (
    PaginatedPVBViolationResponse,
    PVBViolationResponse,
)
from app.pvb.services import PVBService
from app.pvb.stubs import create_stub_pvb_response
from app.users.models import User
from app.users.utils import get_current_user
from app.utils.exporter.excel_exporter import ExcelExporter
from app.utils.exporter.pdf_exporter import PDFExporter
from app.utils.logger import get_logger
from app.bpm.services import bpm_service

logger = get_logger(__name__)
router = APIRouter(prefix="/trips/pvb", tags=["PVB"])

# Dependency to inject the PVBService
def get_pvb_service(db: Session = Depends(get_db)) -> PVBService:
    """Provides an instance of PVBService with the given database session."""
    return PVBService(db)


@router.post("/upload-csv", summary="Upload and Process PVB CSV", status_code=status.HTTP_202_ACCEPTED)
async def upload_pvb_csv(
    file: UploadFile = File(...),
    pvb_service: PVBService = Depends(get_pvb_service),
    current_user: User = Depends(get_current_user),
):
    """
    Accepts a CSV file of PVB violations, validates it, and triggers a background
    task for processing and association.
    """
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload a CSV file.")

    try:
        file_stream = BytesIO(await file.read())
        result = pvb_service.process_uploaded_csv(
            file_stream, file.filename, current_user.id
        )
        return JSONResponse(content=result, status_code=status.HTTP_202_ACCEPTED)
    except PVBError as e:
        logger.warning("Business logic error during PVB CSV upload: %s", e, exc_info=True)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e
    except Exception as e:
        logger.error("Error processing PVB CSV: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="An unexpected error occurred during file processing.") from e


@router.get("", response_model=PaginatedPVBViolationResponse, summary="List PVB Violations")
def list_pvb_violations(
    use_stubs: bool = Query(False, description="Return stubbed data for testing."),
    page: int = Query(1, ge=1, description="Page number for pagination."),
    per_page: int = Query(10, ge=1, le=100, description="Items per page."),
    sort_by: Optional[str] = Query("issue_date", description="Field to sort by."),
    sort_order: str = Query("desc", enum=["asc", "desc"]),
    plate: Optional[str] = Query(None, description="Filter by Plate Number."),
    state: Optional[str] = Query(None, description="Filter by State."),
    type: Optional[str] = Query(None, description="Filter by violation Type."),
    summons: Optional[str] = Query(None, description="Filter by Summons Number."),
    issue_date: Optional[date] = Query(None, description="Filter by a specific Issue Date."),
    driver_id: Optional[str] = Query(None, description="Filter by associated Driver ID."),
    medallion_no: Optional[str] = Query(None, description="Filter by associated Medallion No."),
    pvb_service: PVBService = Depends(get_pvb_service),
    current_user: User = Depends(get_current_user),
):
    """
    Provides a paginated and filterable view of all imported and manually created
    PVB violations, matching the UI requirements.
    """
    if use_stubs:
        return create_stub_pvb_response(page, per_page)
    
    try:
        violations, total_items = pvb_service.repo.list_violations(
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

        response_items = [
            PVBViolationResponse(
                id=v.id,
                plate=v.plate,
                state=v.state,
                type=v.type,
                summons=v.summons,
                issue_date=v.issue_date,
                issue_time=v.issue_time,
                medallion_no=v.medallion.medallion_number if v.medallion else None,
                driver_id=v.driver.driver_id if v.driver else None,
                posting_date=v.posting_date,
                status=v.status,
                amount=v.amount_due,
            ) for v in violations
        ]
        
        total_pages = math.ceil(total_items / per_page) if per_page > 0 else 0

        return PaginatedPVBViolationResponse(
            items=response_items,
            total_items=total_items,
            page=page,
            per_page=per_page,
            total_pages=total_pages
        )

    except Exception as e:
        logger.error("Error fetching PVB violations: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="An unexpected error occurred while fetching PVB data.")

@router.post("/create-case", summary="Create a New PVB Case", status_code=status.HTTP_201_CREATED)
def create_pvb_case(
    db: Session = Depends(get_db_with_current_user),
    current_user: User = Depends(get_current_user),
):
    """
    Initiates a new BPM workflow for manually creating a PVB violation.
    """
    try:
        new_case = bpm_service.create_case(db, prefix="CRPVB", user=current_user)
        return {
            "message": "New Create PVB case started successfully.",
            "case_no": new_case.case_no
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error("Error creating PVB case: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Could not start a new PVB case.")


@router.get("/export", summary="Export PVB Violation Data")
def export_pvb_violations(
    format: str = Query("excel", enum=["excel", "pdf"]),
    # Pass through all filters from the list endpoint
    sort_by: Optional[str] = Query("issue_date"),
    sort_order: str = Query("desc"),
    plate: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    type: Optional[str] = Query(None),
    summons: Optional[str] = Query(None),
    issue_date: Optional[date] = Query(None),
    driver_id: Optional[str] = Query(None),
    medallion_no: Optional[str] = Query(None),
    pvb_service: PVBService = Depends(get_pvb_service),
    current_user: User = Depends(get_current_user),
):
    """
    Exports filtered PVB violation data to the specified format (Excel or PDF).
    """
    try:
        violations, _ = pvb_service.repo.list_violations(
            page=1,
            per_page=10000,  # A large number to fetch all records
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
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No PVB data available for export with the given filters.",
            )

        # Convert SQLAlchemy models to dictionaries for the exporter
        export_data = [
            PVBViolationResponse.model_validate(v).model_dump() for v in violations
        ]
        
        filename = f"pvb_violations_{date.today()}.{'xlsx' if format == 'excel' else 'pdf'}"
        file_content: BytesIO
        media_type: str

        if format == "excel":
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
        logger.error("Error exporting PVB data: %s", e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred during the export process.",
        )