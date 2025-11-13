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
from app.curb.schemas import (
    CurbDateRangeImportRequest,
    CurbDriverImportRequest,
    CurbImportResponse,
    CurbMedallionImportRequest,
    CurbTripResponse,
    PaginatedCurbTripResponse,
)
from app.curb.services import (
    CurbService,
    fetch_and_import_curb_trips_task,
    import_driver_data_task,
    import_filtered_data_task,
    import_medallion_data_task,
    post_earnings_to_ledger_task,
)
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
    use_stubs: bool = Query(False, description="Use stub/demo data for testing."),
    page: int = Query(1, description="Page number for pagination."),
    per_page: int = Query(10, description="Number of items per page."),
    sort_by: str = Query("start_time", description="Field to sort by."),
    sort_order: str = Query("desc", description="Sort order: 'asc' or 'desc'."),
    trip_id: Optional[str] = Query(None, description="Filter by Trip ID."),
    driver_id: Optional[str] = Query(None, description="Filter by Driver ID / TLC No."),
    medallion_no: Optional[str] = Query(
        None, description="Filter by Medallion Number."
    ),
    start_date: Optional[date] = Query(None, description="Filter by trip start date."),
    end_date: Optional[date] = Query(None, description="Filter by trip end date."),
    curb_service: CurbService = Depends(get_curb_service),
    _current_user: User = Depends(get_current_user),
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

        # Build response items with related entity information
        response_items = []
        for trip in trips:
            trip_response = CurbTripResponse.model_validate(trip)
            # Populate tlc_license_no from driver relationship
            if trip.driver and trip.driver.tlc_license:
                trip_response.tlc_license_no = trip.driver.tlc_license.tlc_license_number
            # Get plate number from active vehicle registration
            if trip.vehicle:
                trip_response.vehicle_plate = trip.vehicle.get_active_plate_number()
            response_items.append(trip_response)

        total_pages = math.ceil(total_items / per_page) if per_page > 0 else 0

        return PaginatedCurbTripResponse(
            items=response_items,
            total_items=total_items,
            page=page,
            per_page=per_page,
            total_pages=total_pages,
        )
    except Exception as e:
        logger.error("Error fetching trips view: %s", e, exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="An unexpected error occurred while fetching trip data.",
        ) from e


@router.get(
    "/view-curb-data",
    response_model=PaginatedCurbTripResponse,
    summary="View Raw CURB Data",
)
def view_curb_data(
    use_stubs: bool = Query(False, description="Return stubbed data for testing."),
    page: int = Query(1, ge=1, description="Page number for pagination."),
    per_page: int = Query(10, ge=1, le=100, description="Items per page."),
    sort_by: Optional[str] = Query("start_time", description="Field to sort by."),
    sort_order: str = Query("desc", enum=["asc", "desc"]),
    trip_id: Optional[str] = Query(None, description="Filter by Trip ID."),
    driver_id: Optional[str] = Query(None, description="Filter by Driver ID / TLC No."),
    medallion_no: Optional[str] = Query(
        None, description="Filter by Medallion Number."
    ),
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
        _current_user=current_user,
    )


@router.post(
    "/curb/import",
    summary="Trigger CURB Data Import & Reconciliation",
    status_code=status.HTTP_202_ACCEPTED,
)
async def trigger_curb_import(
    _curb_service: CurbService = Depends(get_curb_service),
    _current_user: User = Depends(get_current_user),
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


@router.post(
    "/curb/post-earnings",
    summary="Trigger Posting of CURB Earnings to Ledger",
    status_code=status.HTTP_202_ACCEPTED,
)
async def trigger_post_earnings(
    _current_user: User = Depends(get_current_user),
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
    export_format: str = Query("excel", enum=["excel", "pdf"], alias="format"),
    # Pass through all filters from the list endpoint to the service layer
    sort_by: Optional[str] = Query("start_time"),
    sort_order: str = Query("desc"),
    trip_id: Optional[str] = Query(None),
    driver_id: Optional[str] = Query(None),
    medallion_no: Optional[str] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    curb_service: CurbService = Depends(get_curb_service),
    _current_user: User = Depends(get_current_user),
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
        export_data = []
        for trip in trips:
            trip_response = CurbTripResponse.model_validate(trip)
            # Populate tlc_license_no from driver relationship
            if trip.driver and trip.driver.tlc_license:
                trip_response.tlc_license_no = trip.driver.tlc_license.tlc_license_number
            # Get plate number from active vehicle registration
            if trip.vehicle:
                trip_response.vehicle_plate = trip.vehicle.get_active_plate_number()
            export_data.append(trip_response.model_dump())

        filename = f"trips_export_{date.today()}.{'xlsx' if export_format == 'excel' else export_format}"
        file_content: BytesIO
        media_type: str

        if export_format == "excel":
            exporter = ExcelExporter(export_data)
            file_content = exporter.export()
            media_type = (
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            )
        elif export_format == "pdf":
            exporter = PDFExporter(export_data)
            file_content = exporter.export()
            media_type = "application/pdf"
        else:
            raise HTTPException(status_code=400, detail="Invalid format specified.")

        headers = {"Content-Disposition": f"attachment; filename={filename}"}
        return StreamingResponse(file_content, media_type=media_type, headers=headers)

    except CurbError as e:
        logger.warning("Business logic error during trip export: %s", e)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
        ) from e
    except Exception as e:
        logger.error("Error exporting trip data: %s", e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred during the export process.",
        ) from e


# ============================================================================
# GRANULAR IMPORT ENDPOINTS
# ============================================================================


@router.post(
    "/curb/import/driver",
    response_model=CurbImportResponse,
    summary="Import CURB Data for Specific Driver",
    status_code=status.HTTP_202_ACCEPTED,
)
async def import_driver_data(
    request: CurbDriverImportRequest,
    _current_user: User = Depends(get_current_user),
):
    """
    Import CURB data for a specific driver within a custom date range.
    You can specify either driver_id (internal system ID) or tlc_license_no.

    This is useful for:
    - Importing missed data for a specific driver
    - Backfilling historical data for a driver
    - Re-importing data after driver information corrections
    """
    try:
        task = import_driver_data_task.delay(
            driver_id=request.driver_id,
            tlc_license_no=request.tlc_license_no,
            start_date_str=request.start_date.strftime("%Y-%m-%d"),
            end_date_str=request.end_date.strftime("%Y-%m-%d"),
        )

        return CurbImportResponse(
            task_id=task.id,
            message=f"CURB driver import task initiated for driver {request.driver_id or request.tlc_license_no}",
            import_type="driver",
            parameters={
                "driver_id": request.driver_id,
                "tlc_license_no": request.tlc_license_no,
                "start_date": request.start_date.isoformat(),
                "end_date": request.end_date.isoformat(),
            },
        )
    except Exception as e:
        logger.error("Failed to trigger driver import task: %s", e, exc_info=True)
        raise HTTPException(
            status_code=500, detail="Could not start the driver import task."
        ) from e


@router.post(
    "/curb/import/medallion",
    response_model=CurbImportResponse,
    summary="Import CURB Data for Specific Medallion",
    status_code=status.HTTP_202_ACCEPTED,
)
async def import_medallion_data(
    request: CurbMedallionImportRequest,
    _current_user: User = Depends(get_current_user),
):
    """
    Import CURB data for a specific medallion within a custom date range.

    This is useful for:
    - Importing data for a specific medallion/taxi
    - Backfilling historical medallion data
    - Re-importing data after medallion information corrections
    """
    try:
        task = import_medallion_data_task.delay(
            medallion_number=request.medallion_number,
            start_date_str=request.start_date.strftime("%Y-%m-%d"),
            end_date_str=request.end_date.strftime("%Y-%m-%d"),
        )

        return CurbImportResponse(
            task_id=task.id,
            message=f"CURB medallion import task initiated for medallion {request.medallion_number}",
            import_type="medallion",
            parameters={
                "medallion_number": request.medallion_number,
                "start_date": request.start_date.isoformat(),
                "end_date": request.end_date.isoformat(),
            },
        )
    except Exception as e:
        logger.error("Failed to trigger medallion import task: %s", e, exc_info=True)
        raise HTTPException(
            status_code=500, detail="Could not start the medallion import task."
        ) from e


@router.post(
    "/curb/import/date-range",
    response_model=CurbImportResponse,
    summary="Import CURB Data for Custom Date Range",
    status_code=status.HTTP_202_ACCEPTED,
)
async def import_date_range_data(
    request: CurbDateRangeImportRequest,
    _current_user: User = Depends(get_current_user),
):
    """
    Import CURB data for a custom date range with optional filters for specific drivers/medallions.

    This is useful for:
    - Backfilling data for specific time periods
    - Importing data for multiple drivers/medallions at once
    - Re-importing data after system corrections

    If no driver_ids or medallion_numbers are provided, all data for the date range will be imported.
    """
    try:
        task = import_filtered_data_task.delay(
            start_date_str=request.start_date.strftime("%Y-%m-%d"),
            end_date_str=request.end_date.strftime("%Y-%m-%d"),
            driver_ids=request.driver_ids,
            medallion_numbers=request.medallion_numbers,
        )

        return CurbImportResponse(
            task_id=task.id,
            message=f"CURB date range import task initiated for {request.start_date} to {request.end_date}",
            import_type="date_range",
            parameters={
                "start_date": request.start_date.isoformat(),
                "end_date": request.end_date.isoformat(),
                "driver_ids": request.driver_ids,
                "medallion_numbers": request.medallion_numbers,
            },
        )
    except Exception as e:
        logger.error("Failed to trigger date range import task: %s", e, exc_info=True)
        raise HTTPException(
            status_code=500, detail="Could not start the date range import task."
        ) from e


@router.get("/curb/import/status/{task_id}", summary="Check Import Task Status")
async def get_import_task_status(
    task_id: str,
    _current_user: User = Depends(get_current_user),
):
    """
    Check the status of a CURB import task using its task ID.

    Returns the current status (PENDING, SUCCESS, FAILURE) and results if available.
    """
    try:
        from app.core.celery_app import app as celery_app

        task_result = celery_app.AsyncResult(task_id)

        response = {
            "task_id": task_id,
            "status": task_result.status,
            "result": task_result.result if task_result.ready() else None,
        }

        if task_result.failed():
            response["error"] = str(task_result.result)

        return response

    except Exception as e:
        logger.error("Failed to get task status: %s", e, exc_info=True)
        raise HTTPException(
            status_code=500, detail="Could not retrieve task status."
        ) from e
