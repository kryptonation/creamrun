"""
app/curb/router.py

FastAPI router for CURB import endpoints
"""

from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.users.models import User
from app.core.dependencies import get_current_user

from app.curb.service import CurbImportService
from app.curb.repository import CurbTripRepository, CurbImportHistoryRepository
from app.curb.schemas import (
    ImportCurbTripsRequest, ImportCurbTripsResponse,
    RemapTripRequest,
    CurbTripResponse, CurbTripDetailResponse,
    CurbImportHistoryResponse, PaginatedTripsResponse,
    TripStatisticsResponse
)
from app.utils.logger import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/curb", tags=["CURB Import"])


# === Import Endpoints ===

@router.post("/import", response_model=ImportCurbTripsResponse)
def import_curb_trips(
    request: ImportCurbTripsRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Import CURB trips and transactions for specified date range
    
    **Process:**
    1. Fetch trips from CURB API (GET_TRIPS_LOG10)
    2. Fetch transactions from CURB API (Get_Trans_By_Date_Cab12)
    3. Import data into database
    4. Associate trips to drivers, medallions, vehicles, and leases
    5. Post earnings and taxes to ledger
    6. Optionally reconcile with CURB system
    
    **Returns:**
    - Import statistics including counts of fetched, imported, mapped, and posted records
    - Batch ID for tracking
    - List of errors if any occurred
    """
    try:
        service = CurbImportService(db)
        
        import_history, errors = service.import_curb_data(
            date_from=request.date_from,
            date_to=request.date_to,
            driver_id=request.driver_id,
            cab_number=request.cab_number,
            perform_association=request.perform_association,
            post_to_ledger=request.post_to_ledger,
            reconcile_with_curb=request.reconcile_with_curb,
            triggered_by="API",
            triggered_by_user_id=current_user.id
        )
        
        return ImportCurbTripsResponse(
            success=import_history.status.value in ['COMPLETED', 'PARTIAL'],
            batch_id=import_history.batch_id,
            message=f"Import completed with status: {import_history.status.value}",
            trips_fetched=import_history.total_trips_fetched,
            trips_imported=import_history.total_trips_imported,
            trips_mapped=import_history.total_trips_mapped,
            trips_posted=import_history.total_trips_posted,
            trips_failed=import_history.total_trips_failed,
            transactions_fetched=import_history.total_transactions_fetched,
            transactions_imported=import_history.total_transactions_imported,
            reconciliation_attempted=import_history.reconciliation_attempted,
            reconciliation_successful=import_history.reconciliation_successful,
            duration_seconds=import_history.duration_seconds,
            errors=errors if errors else None
        )
        
    except Exception as e:
        logger.error(f"Import failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Import failed: {str(e)}"
        ) from e


@router.get("/import/history", response_model=list[CurbImportHistoryResponse])
def get_import_history(
    limit: int = Query(20, ge=1, le=100, description="Number of records to return"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get recent import history
    
    Returns list of recent import batches with statistics
    """
    try:
        repo = CurbImportHistoryRepository(db)
        history = repo.get_recent_imports(limit=limit)
        
        return [CurbImportHistoryResponse.model_validate(h) for h in history]
        
    except Exception as e:
        logger.error(f"Failed to fetch import history: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch import history: {str(e)}"
        ) from e


@router.get("/import/history/{batch_id}", response_model=CurbImportHistoryResponse)
def get_import_by_batch_id(
    batch_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get specific import batch details
    """
    try:
        repo = CurbImportHistoryRepository(db)
        history = repo.get_by_batch_id(batch_id)
        
        if not history:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Import batch {batch_id} not found"
            )
        
        return CurbImportHistoryResponse.model_validate(history)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch import batch: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch import batch: {str(e)}"
        ) from e


# === Trip query endpoints ===

@router.get("/trips", response_model=PaginatedTripsResponse)
def get_trips(
    date_from: Optional[date] = Query(None, description="Filter by start date"),
    date_to: Optional[date] = Query(None, description="Filter by end date"),
    driver_id: Optional[int] = Query(None, description="Filter by driver ID", gt=0),
    medallion_id: Optional[int] = Query(None, description="Filter by medallion ID", gt=0),
    vehicle_id: Optional[int] = Query(None, description="Filter by vehicle ID", gt=0),
    lease_id: Optional[int] = Query(None, description="Filter by lease ID", gt=0),
    payment_type: Optional[str] = Query(None, description="Filter by payment type (CASH, CREDIT_CARD)"),
    posted_to_ledger: Optional[bool] = Query(None, description="Filter by ledger posting status"),
    mapping_method: Optional[str] = Query(None, description="Filter by mapping method"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=500, description="Page size"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get CURB trips with filters and pagination
    
    **Filters:**
    - Date range (date_from, date_to)
    - Entity associations (driver_id, medallion_id, vehicle_id, lease_id)
    - Payment type (CASH, CREDIT_CARD, PRIVATE_CARD)
    - Status (posted_to_ledger, mapping_method)
    
    **Returns:**
    - Paginated list of trips
    - Total count
    - Page information
    """
    try:
        repo = CurbTripRepository(db)
        
        # Parse enums if provided
        from app.curb.models import PaymentType, MappingMethod
        payment_type_enum = None
        if payment_type:
            try:
                payment_type_enum = PaymentType[payment_type]
            except KeyError as ke:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid payment_type: {payment_type}"
                ) from ke
        
        mapping_method_enum = None
        if mapping_method:
            try:
                mapping_method_enum = MappingMethod[mapping_method]
            except KeyError as ke:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid mapping_method: {mapping_method}"
                ) from ke
        
        # Get trips with filters
        trips, total = repo.get_trips_by_filters(
            date_from=date_from,
            date_to=date_to,
            driver_id=driver_id,
            medallion_id=medallion_id,
            vehicle_id=vehicle_id,
            lease_id=lease_id,
            payment_type=payment_type_enum,
            posted_to_ledger=posted_to_ledger,
            mapping_method=mapping_method_enum,
            limit=page_size,
            offset=(page - 1) * page_size
        )
        
        # Calculate total pages
        total_pages = (total + page_size - 1) // page_size
        
        return PaginatedTripsResponse(
            trips=[CurbTripResponse.model_validate(t) for t in trips],
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch trips: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch trips: {str(e)}"
        ) from e


@router.get("/trips/{trip_id}", response_model=CurbTripDetailResponse)
def get_trip_detail(
    trip_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get detailed information for a specific trip
    
    Returns complete trip data including all fields
    """
    try:
        repo = CurbTripRepository(db)
        trip = repo.get_by_id(trip_id)
        
        if not trip:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Trip {trip_id} not found"
            )
        
        return CurbTripDetailResponse.model_validate(trip)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch trip detail: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch trip detail: {str(e)}"
        ) from e


@router.get("/trips/statistics", response_model=TripStatisticsResponse)
def get_trip_statistics(
    date_from: Optional[date] = Query(None, description="Filter by start date"),
    date_to: Optional[date] = Query(None, description="Filter by end date"),
    driver_id: Optional[int] = Query(None, description="Filter by driver ID", gt=0),
    lease_id: Optional[int] = Query(None, description="Filter by lease ID", gt=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get aggregated trip statistics
    
    **Returns:**
    - Total trip count
    - Breakdown by payment type (cash vs credit card)
    - Total earnings and taxes
    - Average trip amount
    - Status counts (posted, mapped, etc.)
    """
    try:
        repo = CurbTripRepository(db)
        
        stats = repo.get_statistics(
            date_from=date_from,
            date_to=date_to,
            driver_id=driver_id,
            lease_id=lease_id
        )
        
        return TripStatisticsResponse(
            date_from=date_from,
            date_to=date_to,
            **stats
        )
        
    except Exception as e:
        logger.error(f"Failed to fetch statistics: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch statistics: {str(e)}"
        ) from e


# === Manual operations ===

@router.post("/trips/{trip_id}/remap", response_model=CurbTripDetailResponse)
def remap_trip(
    trip_id: int,
    request: RemapTripRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Manually remap a trip to different driver/lease
    
    **Use Cases:**
    - Correct mismatched trips
    - Assign trips that couldn't be auto-mapped
    - Handle driver switches or special cases
    
    **Process:**
    1. Validates new driver and lease
    2. Voids existing ledger postings if trip was already posted
    3. Updates trip associations
    4. Creates new ledger postings with correct associations
    
    **Requires:**
    - Reason for manual remapping (audit trail)
    """
    try:
        service = CurbImportService(db)
        
        trip = service.remap_trip_manually(
            trip_id=trip_id,
            driver_id=request.driver_id,
            lease_id=request.lease_id,
            reason=request.reason,
            assigned_by=current_user.id
        )
        
        return CurbTripDetailResponse.model_validate(trip)
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        ) from e
    except Exception as e:
        logger.error(f"Failed to remap trip: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to remap trip: {str(e)}"
        ) from e


@router.get("/trips/unmapped", response_model=list[CurbTripResponse])
def get_unmapped_trips(
    limit: int = Query(100, ge=1, le=500, description="Number of records to return"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get trips that haven't been mapped to entities
    
    These trips require manual review and assignment
    """
    try:
        repo = CurbTripRepository(db)
        trips = repo.get_unmapped_trips(limit=limit)
        
        return [CurbTripResponse.model_validate(t) for t in trips]
        
    except Exception as e:
        logger.error(f"Failed to fetch unmapped trips: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch unmapped trips: {str(e)}"
        ) from e


@router.get("/trips/unposted", response_model=list[CurbTripResponse])
def get_unposted_trips(
    limit: int = Query(100, ge=1, le=500, description="Number of records to return"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get trips that have been mapped but not posted to ledger
    
    These trips are ready to be posted but haven't been processed yet
    """
    try:
        repo = CurbTripRepository(db)
        trips = repo.get_unposted_trips(limit=limit)
        
        return [CurbTripResponse.model_validate(t) for t in trips]
        
    except Exception as e:
        logger.error(f"Failed to fetch unposted trips: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch unposted trips: {str(e)}"
        ) from e