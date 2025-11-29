### app/curb/router.py

import math
from datetime import date
from io import BytesIO
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import JSONResponse, StreamingResponse
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.curb.exceptions import CurbError, TripProcessingError
from app.curb.schemas import CurbTripResponse, PaginatedCurbTripResponse
from app.curb.services import CurbService
from app.curb.stubs import create_stub_curb_trip_response
from app.users.models import User
from app.users.utils import get_current_user
from app.utils.exporter_utils import ExporterFactory
from app.utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/trips", tags=["Trips"])


# Dependency to inject the CurbService
def get_curb_service(db: Session = Depends(get_db)) -> CurbService:
    """Dependency to get CurbService instance."""
    return CurbService(db)


@router.post(
    "/curb/import-by-medallion",
    summary="Import and Reconcile CURB Data by Medallion",
    status_code=status.HTTP_200_OK,
)
def import_curb_data(
    from_date: Optional[date] = Query(
        None,
        description="Start date for the import (YYYY-MM-DD). Defaults to yesterday.",
    ),
    to_date: Optional[date] = Query(
        None, description="End date for the import (YYYY-MM-DD). Defaults to today."
    ),
    medallion_no: Optional[str] = Query(
        None,
        description="A specific medallion number or a comma-separated list. If omitted, all active medallions are used.",
    ),
    auto_map: bool = Query(
        True,
        description="If True, automatically map reconciled trips to internal entities (driver, lease, medallion)"
    ),
    curb_service: CurbService = Depends(get_curb_service),
    _current_user: User = Depends(get_current_user),
):
    """
    Triggers a direct, synchronous import of trip and transaction data from the
    CURB API. The import is filtered by active medallions in the system.

    - **medallion_no (optional)**: Provide a single medallion or a comma-separated list to limit the import. If not provided, the system will fetch data for ALL medallions currently marked as 'Active'.
    - **from_date (optional)**: The start of the date range to query. Defaults to yesterday.
    - **to_date (optional)**: The end of the date range to query. Defaults to today.
    - **auto_map** (optional): Enable automatic mapping after reconiliation. Defaults to True.
      Set to False if you want to manually trigger mapping later via /curb/map-trips endpoint.
    """
    try:
        result = curb_service.import_and_reconcile_data(
            from_date=from_date,
            to_date=to_date,
            medallion_no=medallion_no,
            auto_map=auto_map
        )
        return JSONResponse(content=result, status_code=status.HTTP_200_OK)
    except CurbError as e:
        logger.error(
            "A business logic error occurred during CURB import: %s", e, exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
        ) from e
    except Exception as e:
        logger.error(
            "An unexpected server error occurred during CURB import: %s",
            e,
            exc_info=True,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred during the import process.",
        ) from e


@router.post(
    "/curb/map-trips",
    summary="Map Reconciled CURB Trips to Internal Entities",
    status_code=status.HTTP_200_OK,
)
def map_reconciled_curb_trips(
    curb_service: CurbService = Depends(get_curb_service),
    _current_user: User = Depends(get_current_user),
):
    """
    Finds all reconciled but unmapped CURB trips and attempts to associate them
    with the correct driver, lease, vehicle, and medallion records in the system.
    """
    try:
        result = curb_service.map_reconciled_trips()
        return JSONResponse(content=result, status_code=status.HTTP_200_OK)
    except Exception as e:
        logger.error(
            "An unexpected error occurred during trip mapping: %s", e, exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred during the mapping process.",
        ) from e


@router.post(
    "/curb/post-earnings-to-ledger",
    summary="Post Mapped CURB Earnings to Ledger",
    status_code=status.HTTP_200_OK,
)
async def post_earnings_to_ledger(
    start_date: date = Query(
        ..., description="Start date of the period to post earnings for (YYYY-MM-DD)."
    ),
    end_date: date = Query(
        ..., description="End date of the period to post earnings for (YYYY-MM-DD)."
    ),
    lease_id: Optional[int] = Query(
        None, description="Optional: Filter to post earnings for a specific lease ID."
    ),
    driver_id: Optional[int] = Query(
        None,
        description="Optional: Filter to post earnings for a specific driver ID (internal primary key).",
    ),
    curb_service: CurbService = Depends(get_curb_service),
    _current_user: User = Depends(get_current_user),
):
    """
    Finds all MAPPED (but not yet posted) credit card trips within a given date range
    and posts the aggregated earnings to the Centralized Ledger. This action is final
    for the selected trips and cannot be undone easily.

    - **start_date & end_date**: Defines the inclusive period for which to find and post earnings.
    - **lease_id (optional)**: Restricts the operation to a single lease.
    - **driver_id (optional)**: Restricts the operation to a single driver.
    """
    try:
        if start_date > end_date:
            raise HTTPException(
                status_code=400, detail="The start_date cannot be after the end_date."
            )

        result = curb_service.post_mapped_earnings_to_ledger(
            start_date=start_date,
            end_date=end_date,
            lease_id=lease_id,
            driver_id=driver_id,
        )

        # Check for partial failures
        if result.get("errors"):
            status_code = status.HTTP_207_MULTI_STATUS
            message = "Posting completed with some errors."
        else:
            status_code = status.HTTP_200_OK
            message = "Earnings posting process completed successfully."

        return JSONResponse(
            content={"message": message, "results": result},
            status_code=status_code,
        )
    except TripProcessingError as e:
        logger.error(
            "A critical error occurred during earnings posting: %s", e, exc_info=True
        )
        raise HTTPException(
            status_code=500, detail=f"A critical ledger error occurred: {e}"
        ) from e
    except Exception as e:
        logger.error(
            "An unexpected server error occurred during earnings posting: %s",
            e,
            exc_info=True,
        )
        raise HTTPException(
            status_code=500,
            detail="An unexpected error occurred during the posting process.",
        ) from e


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
    This view is powered by the imported CURB data.
    """
    if use_stubs:
        return create_stub_curb_trip_response(page, per_page)

    try:
        trips, total_items = curb_service.repo.list_trips(
            page=page,
            per_page=per_page,
            sort_by=sort_by,
            sort_order=sort_order,
            trip_id=trip_id,
            driver_id_tlc=driver_id,
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
    transaction_date: Optional[date] = Query(
        None, description="Filter by transaction date."
    ),
    curb_service: CurbService = Depends(get_curb_service),
    current_user: User = Depends(get_current_user),
):
    """
    Endpoint to view the raw, imported data from the CURB system.
    This serves as the data source for the main 'View Trips' page.
    """
    # This endpoint behaves identically to /view for now, but is kept for logical separation
    # as per the UI design.

    # For transaction_date filtering, pass it through to the service layer
    try:
        trips, total_items = curb_service.repo.list_trips(
            page=page,
            per_page=per_page,
            sort_by=sort_by,
            sort_order=sort_order,
            trip_id=trip_id,
            driver_id_tlc=driver_id,
            medallion_no=medallion_no,
            start_date=start_date,
            end_date=end_date,
            transaction_date=transaction_date,
        )

        response_items = [CurbTripResponse.model_validate(trip) for trip in trips]
        total_pages = math.ceil(total_items / per_page) if per_page > 0 else 0

        return PaginatedCurbTripResponse(
            items=response_items,
            total_items=total_items,
            page=page,
            per_page=per_page,
            total_pages=total_pages,
        )
    except Exception as e:
        logger.error("Error fetching CURB data: %s", e, exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="An unexpected error occurred while fetching CURB data.",
        ) from e


@router.get("/export", summary="Export Trip Data")
def export_trips(
    export_format: str = Query("excel", enum=["excel", "pdf"], alias="format"),
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
        # For exports, fetch up to 1 lakh (100,000) records
        trips, _ = curb_service.repo.list_trips(
            page=1,
            per_page=100000,
            sort_by=sort_by,
            sort_order=sort_order,
            trip_id=trip_id,
            driver_id_tlc=driver_id,
            medallion_no=medallion_no,
            start_date=start_date,
            end_date=end_date,
        )

        if not trips:
            raise ValueError(
                "No trip data available for export with the given filters."
            )

        export_data = [
            CurbTripResponse.model_validate(trip).model_dump() for trip in trips
        ]

        filename = f"trips_export_{date.today()}.{'xlsx' if export_format == 'excel' else export_format}"

        # Use ExporterFactory to get the appropriate exporter
        exporter = ExporterFactory.get_exporter(export_format, export_data)
        file_content = exporter.export()

        # Set media type based on export format
        media_types = {
            "excel": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "pdf": "application/pdf",
        }
        media_type = media_types.get(export_format, "application/octet-stream")

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
