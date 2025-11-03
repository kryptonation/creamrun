### app/curb/router.py

import math
from datetime import date
from io import BytesIO
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import JSONResponse, StreamingResponse
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.curb.exceptions import CurbError
from app.curb.schemas import CurbTripResponse, PaginatedCurbTripResponse
from app.curb.services import CurbService, fetch_and_import_curb_trips_task, post_earnings_to_ledger_task
from app.curb.stubs import create_stub_curb_trip_response
from app.users.models import User
from app.users.utils import get_current_user
from app.utils.exporter.excel_exporter import ExcelExporter
from app.utils.exporter.pdf_exporter import PDFExporter
from app.utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/trips", tags=["Trips"])

# Dependency to inject the CurbService
def get_curb_service(db: Session = Depends(get_db)) -> CurbService:
    """Dependency to get CurbService instance."""
    return CurbService(db)

@router.get("/view", response_model=PaginatedCurbTripResponse, summary="View All Trips")
def view_all_trips(
    use_stubs: bool = Query(False, description="Return stubbed data for testing."),
    page: int = Query(1, ge=1, description="Page number for pagination."),
    per_page: int = Query(10, ge=1, le=100, description="Items per page."),
    sort_by: Optional[str] = Query("start_time", description="Field to sort by."),
    sort_order: str = Query("desc", enum=["asc", "desc"]),
    trip_id: Optional[str] = Query(None, description="Filter by Trip ID."),
    driver_id: Optional[str] = Query(None, description="Filter by Driver ID / TLC No."),
    medallion_no: Optional[str] = Query(None, description="Filter by Medallion Number."),
    start_date: Optional[date] = Query(None, description="Filter by trip start date."),
    end_date: Optional[date] = Query(None, description="Filter by trip end date."),
    curb_service: CurbService = Depends(get_curb_service),
    current_user: User = Depends(get_current_user),
):
    """
    Endpoint to view a consolidated list of all trips from various sources.
    Currently, this view is powered by the imported CURB data.
    """
    if use_stubs:
        return create_stub_curb_trip_response(page, per_page)
    
    try:
        trips, total_items = curb_service.repo.list_curb_data(
            page=page,
            per_page=per_page,
            sort_by=sort_by,
            sort_order=sort_order,
            trip_id=trip_id,
            driver_id=driver_id,
            medallion_no=medallion_no,
            start_date=start_date,
            end_date=end_date,
        )

        response_items = [CurbTripResponse.model_validate(trip) for trip in trips]
        total_pages = math.ceil(total_items / per_page) if per_page > 0 else 0
        
        return PaginatedCurbTripResponse(
            items=response_items,
            total_items=total_items,
            page=page,
            per_page=per_page,
            total_pages=total_pages
        )
    except Exception as e:
        logger.error("Error fetching trips view: %s", e, exc_info=True)
        raise HTTPException(
            status_code=500, detail="An unexpected error occurred while fetching trip data."
        ) from e

@router.get("/view-curb-data", response_model=PaginatedCurbTripResponse, summary="View Raw CURB Data")
def view_curb_data(
    use_stubs: bool = Query(False, description="Return stubbed data for testing."),
    page: int = Query(1, ge=1, description="Page number for pagination."),
    per_page: int = Query(10, ge=1, le=100, description="Items per page."),
    sort_by: Optional[str] = Query("start_time", description="Field to sort by."),
    sort_order: str = Query("desc", enum=["asc", "desc"]),
    trip_id: Optional[str] = Query(None, description="Filter by Trip ID."),
    driver_id: Optional[str] = Query(None, description="Filter by Driver ID / TLC No."),
    medallion_no: Optional[str] = Query(None, description="Filter by Medallion Number."),
    start_date: Optional[date] = Query(None, description="Filter by trip start date."),
    end_date: Optional[date] = Query(None, description="Filter by trip end date."),
    curb_service: CurbService = Depends(get_curb_service),
    current_user: User = Depends(get_current_user),
):
    """
    Endpoint to view the raw, imported data from the CURB system.
    This serves as the data source for the main 'View Trips' page.
    """
    # This endpoint behaves identically to /view for now, but is kept for logical separation
    # as per the UI design.
    return view_all_trips(
        use_stubs=use_stubs,
        page=page,
        per_page=per_page,
        sort_by=sort_by,
        sort_order=sort_order,
        trip_id=trip_id,
        driver_id=driver_id,
        medallion_no=medallion_no,
        start_date=start_date,
        end_date=end_date,
        curb_service=curb_service,
        current_user=current_user,
    )


@router.post("/curb/import", summary="Trigger CURB Data Import & Reconciliation", status_code=status.HTTP_202_ACCEPTED)
async def trigger_curb_import(
    curb_service: CurbService = Depends(get_curb_service),
    current_user: User = Depends(get_current_user),
):
    """
    Manually triggers the Celery task to import and reconcile data from the CURB API for the last 1 day.
    """
    try:
        task = fetch_and_import_curb_trips_task.delay()
        return JSONResponse(
            content={
                "message": "CURB data import and reconciliation task has been initiated.",
                "task_id": task.id,
            },
            status_code=status.HTTP_202_ACCEPTED,
        )
    except Exception as e:
        logger.error("Failed to trigger CURB import task: %s", e, exc_info=True)
        raise HTTPException(
            status_code=500, detail="Could not start the import task."
        ) from e

@router.post("/curb/post-earnings", summary="Trigger Posting of CURB Earnings to Ledger", status_code=status.HTTP_202_ACCEPTED)
async def trigger_post_earnings(
    current_user: User = Depends(get_current_user),
):
    """
    Manually triggers the Celery task to post reconciled CURB earnings to the ledger
    for the most recently completed week.
    """
    try:
        task = post_earnings_to_ledger_task.delay()
        return JSONResponse(
            content={
                "message": "Task to post CURB earnings to the ledger has been initiated.",
                "task_id": task.id,
            },
            status_code=status.HTTP_202_ACCEPTED,
        )
    except Exception as e:
        logger.error("Failed to trigger post earnings task: %s", e, exc_info=True)
        raise HTTPException(
            status_code=500, detail="Could not start the post earnings task."
        ) from e


@router.get("/export", summary="Export Trip Data")
def export_trips(
    format: str = Query("excel", enum=["excel", "pdf"]),
    # Pass through all filters from the list endpoint to the service layer
    sort_by: Optional[str] = Query("start_time"),
    sort_order: str = Query("desc"),
    trip_id: Optional[str] = Query(None),
    driver_id: Optional[str] = Query(None),
    medallion_no: Optional[str] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    curb_service: CurbService = Depends(get_curb_service),
    current_user: User = Depends(get_current_user),
):
    """
    Exports filtered trip data to the specified format (Excel or PDF).
    """
    try:
        trips, _ = curb_service.repo.list_curb_data(
            page=1,
            per_page=10000,  # A large number to fetch all matching records
            sort_by=sort_by,
            sort_order=sort_order,
            trip_id=trip_id,
            driver_id=driver_id,
            medallion_no=medallion_no,
            start_date=start_date,
            end_date=end_date,
        )

        if not trips:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No trip data available for export with the given filters.",
            )

        # Convert SQLAlchemy models to a list of dictionaries for the exporter
        export_data = [CurbTripResponse.model_validate(trip).model_dump() for trip in trips]
        
        filename = f"trips_export_{date.today()}.{'xlsx' if format == 'excel' else format}"
        file_content: BytesIO
        media_type: str

        if format == "excel":
            exporter = ExcelExporter(export_data)
            file_content = exporter.export()
            media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        elif format == "pdf":
            exporter = PDFExporter(export_data)
            file_content = exporter.export()
            media_type = "application/pdf"
        else:
            raise HTTPException(status_code=400, detail="Invalid format specified.")

        headers = {"Content-Disposition": f"attachment; filename={filename}"}
        return StreamingResponse(file_content, media_type=media_type, headers=headers)

    except CurbError as e:
        logger.warning("Business logic error during trip export: %s", e)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e
    except Exception as e:
        logger.error("Error exporting trip data: %s", e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred during the export process.",
        ) from e