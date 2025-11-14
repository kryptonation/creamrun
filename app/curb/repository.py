### app/curb/repository.py

from datetime import date, timedelta, datetime
from typing import List, Optional, Tuple

from sqlalchemy import update, or_, func
from sqlalchemy.orm import Session, joinedload

from app.curb.models import CurbTrip, CurbTripStatus
from app.drivers.models import Driver
from app.medallions.models import Medallion
from app.curb.schemas import PaymentType
from app.utils.logger import get_logger

logger = get_logger(__name__)


class CurbRepository:
    """
    Data Access Layer for CURB Trip data.
    Handles all database interactions for the CurbTrip model.
    """

    def __init__(self, db: Session):
        self.db = db

    def get_trip_by_id(self, trip_id: int) -> Optional[CurbTrip]:
        """Fetches a single CURB trip by its internal database primary key."""
        return (
            self.db.query(CurbTrip)
            .options(
                joinedload(CurbTrip.driver).joinedload(Driver.tlc_license),
                joinedload(CurbTrip.medallion),
                joinedload(CurbTrip.vehicle),
            )
            .filter(CurbTrip.id == trip_id)
            .first()
        )

    def get_trip_by_curb_id(self, curb_trip_id: str) -> Optional[CurbTrip]:
        """Fetches a single CURB trip by its unique CURB-provided ID."""
        return self.db.query(CurbTrip).filter(CurbTrip.curb_trip_id == curb_trip_id).first()

    def bulk_insert_or_update(self, trips_data: List[dict]) -> Tuple[int, int]:
        """
        Efficiently inserts new trips and updates existing ones in a single transaction.
        Uses the curb_trip_id as the key for matching.

        Args:
            trips_data: A list of dictionaries, where each dict represents a trip.

        Returns:
            A tuple containing the count of (inserted_records, updated_records).
        """
        inserted_count = 0
        updated_count = 0
        
        # Get all existing trip IDs from the database that are in the incoming batch
        incoming_trip_ids = {trip['curb_trip_id'] for trip in trips_data}
        existing_trips_query = self.db.query(CurbTrip).filter(CurbTrip.curb_trip_id.in_(incoming_trip_ids))
        existing_trips_map = {trip.curb_trip_id: trip for trip in existing_trips_query}

        new_trips_to_add = []
        for trip_data in trips_data:
            curb_trip_id = trip_data['curb_trip_id']
            existing_trip = existing_trips_map.get(curb_trip_id)

            if existing_trip:
                # Update existing record
                for key, value in trip_data.items():
                    setattr(existing_trip, key, value)
                updated_count += 1
            else:
                # This is a new record, prepare for bulk insert
                new_trips_to_add.append(CurbTrip(**trip_data))
                inserted_count += 1
        
        if new_trips_to_add:
            self.db.add_all(new_trips_to_add)

        # The session is flushed and committed by the service layer or db dependency
        return inserted_count, updated_count

    def get_unreconciled_trips(self) -> List[CurbTrip]:
        """Fetches all trips that have not yet been successfully reconciled with CURB."""
        return self.db.query(CurbTrip).filter(CurbTrip.status == CurbTripStatus.UNRECONCILED).all()

    def update_trip_status(self, trip_id: int, status: CurbTripStatus, reconciliation_id: Optional[str] = None):
        """Updates the status and optionally the reconciliation ID of a single trip."""
        stmt = (
            update(CurbTrip)
            .where(CurbTrip.id == trip_id)
            .values(status=status, reconciliation_id=reconciliation_id)
        )
        self.db.execute(stmt)
        
    def get_unposted_credit_card_trips_for_period(self, start_date: date, end_date: date) -> List[CurbTrip]:
        """
        Fetches all reconciled, credit card trips within a specific date range 
        that have not yet been posted to the ledger.
        """
        return (
            self.db.query(CurbTrip)
            .filter(
                CurbTrip.status == CurbTripStatus.RECONCILED,
                CurbTrip.payment_type == 'CREDIT_CARD',
                CurbTrip.start_time >= start_date,
                CurbTrip.end_time <= end_date,
            )
            .all()
        )

    def list_trips(
        self,
        page: int,
        per_page: int,
        sort_by: str,
        sort_order: str,
        trip_id: Optional[str] = None,
        driver_id_tlc: Optional[str] = None,
        medallion_no: Optional[str] = None,
        plate_no: Optional[str] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> Tuple[List[CurbTrip], int]:
        """
        Retrieves a paginated, sorted, and filtered list of CURB trips.
        This is the primary query engine for both 'View Trips' and 'View Curb Data'.
        Supports comma-separated values for driver and medallion filters.
        """
        query = (
            self.db.query(CurbTrip)
            .options(
                joinedload(CurbTrip.driver).joinedload(Driver.tlc_license),
                joinedload(CurbTrip.medallion),
                joinedload(CurbTrip.vehicle),
            )
            .outerjoin(Driver, CurbTrip.driver_id == Driver.id)
            .outerjoin(Medallion, CurbTrip.medallion_id == Medallion.id)
        )

        # Apply filters
        if trip_id:
            query = query.filter(CurbTrip.curb_trip_id.ilike(f"%{trip_id}%"))
        
        # **MODIFICATION START**
        if driver_id_tlc:
            # Handle comma-separated list of driver IDs/TLC numbers
            driver_filters = [f.strip() for f in driver_id_tlc.split(',') if f.strip()]
            if driver_filters:
                query = query.filter(
                    or_(*[CurbTrip.curb_driver_id.ilike(f"%{filt}%") for filt in driver_filters])
                )
        
        if medallion_no:
            # Handle comma-separated list of medallion numbers
            medallion_filters = [f.strip() for f in medallion_no.split(',') if f.strip()]
            if medallion_filters:
                query = query.filter(
                    or_(*[CurbTrip.curb_cab_number.ilike(f"%{filt}%") for filt in medallion_filters])
                )
        # **MODIFICATION END**

        if plate_no:
            query = query.filter(CurbTrip.plate.ilike(f"%{plate_no}%"))
        if start_date:
            start_datetime = datetime.combine(start_date, datetime.min.time())
            query = query.filter(CurbTrip.start_time >= start_datetime)
        if end_date:
            end_datetime = datetime.combine(end_date, datetime.max.time())
            query = query.filter(CurbTrip.start_time <= end_datetime)

        # Determine total items before pagination
        total_items = query.with_entities(func.count(CurbTrip.id)).scalar()

        # Apply sorting
        sort_column_map = {
            "trip_id": CurbTrip.curb_trip_id,
            "driver_id_tlc": CurbTrip.curb_driver_id,
            "cab_no": CurbTrip.curb_cab_number,
            "vehicle_plate": CurbTrip.plate,
            "start_time": CurbTrip.start_time,
            "end_time": CurbTrip.end_time,
            "total_amount": CurbTrip.total_amount,
            "payment_mode": CurbTrip.payment_type,
            "status": CurbTrip.status,
            "medallion_no": CurbTrip.curb_cab_number,
        }
        
        sort_column = sort_column_map.get(sort_by, CurbTrip.start_time)
        if sort_order.lower() == "desc":
            query = query.order_by(sort_column.desc())
        else:
            query = query.order_by(sort_column.asc())

        # Apply pagination
        query = query.offset((page - 1) * per_page).limit(per_page)

        return query.all(), total_items

    def get_trips_by_driver_and_date_range(
        self, driver_id: Optional[str], tlc_license_no: Optional[str], 
        start_date: date, end_date: date
    ) -> List[CurbTrip]:
        """
        Get all trips for a specific driver within a date range.
        Can search by either internal driver_id or TLC license number.
        """
        query = self.db.query(CurbTrip)
        
        if driver_id:
            # Join with driver table to filter by internal driver_id
            query = query.join(Driver, CurbTrip.driver_id == Driver.id).filter(Driver.driver_id == driver_id)
        elif tlc_license_no:
            # Filter by TLC license (curb_driver_id field)
            query = query.filter(CurbTrip.curb_driver_id == tlc_license_no)
        else:
            return []
            
        query = query.filter(
            CurbTrip.start_time >= start_date,
            CurbTrip.end_time < (end_date + timedelta(days=1))
        )
        
        return query.all()

    def get_trips_by_medallion_and_date_range(
        self, medallion_number: str, start_date: date, end_date: date
    ) -> List[CurbTrip]:
        """
        Get all trips for a specific medallion within a date range.
        """
        return (
            self.db.query(CurbTrip)
            .filter(
                CurbTrip.curb_cab_number == medallion_number,
                CurbTrip.start_time >= start_date,
                CurbTrip.end_time < (end_date + timedelta(days=1))
            )
            .all()
        )

    def get_existing_trip_ids_for_filters(
        self, start_date: date, end_date: date,
        driver_ids: Optional[List[str]] = None,
        medallion_numbers: Optional[List[str]] = None
    ) -> List[str]:
        """
        Get existing CURB trip IDs for given filters to avoid re-importing.
        """
        query = self.db.query(CurbTrip.curb_trip_id).filter(
            CurbTrip.start_time >= start_date,
            CurbTrip.end_time < (end_date + timedelta(days=1))
        )
        
        if driver_ids:
            query = query.filter(CurbTrip.curb_driver_id.in_(driver_ids))
        
        if medallion_numbers:
            query = query.filter(CurbTrip.curb_cab_number.in_(medallion_numbers))
            
        return [row[0] for row in query.all()]
    
    def get_mapped_credit_card_trips_for_posting(
        self,
        start_date: date,
        end_date: date,
        lease_id: Optional[int] = None,
        driver_id: Optional[int] = None,
    ) -> List[CurbTrip]:
        """
        Fetches all MAPPED, credit card trips within a specific date range
        that have not yet been posted to the ledger, with optional filters.
        """
        end_datetime = datetime.combine(end_date, datetime.max.time())

        query = self.db.query(CurbTrip).filter(
            CurbTrip.status == CurbTripStatus.MAPPED,
            CurbTrip.payment_type == PaymentType.CREDIT_CARD,
            CurbTrip.start_time >= start_date,
            CurbTrip.start_time <= end_datetime,
        )

        if lease_id:
            query = query.filter(CurbTrip.lease_id == lease_id)
        
        if driver_id:
            query = query.filter(CurbTrip.driver_id == driver_id)

        return query.all()

    def count_trips_by_status_and_filters(
        self, status: CurbTripStatus, start_date: date, end_date: date,
        driver_id: Optional[str] = None, medallion_number: Optional[str] = None
    ) -> int:
        """
        Count trips by status with optional filters for monitoring/reporting.
        """
        query = self.db.query(CurbTrip).filter(
            CurbTrip.status == status,
            CurbTrip.start_time >= start_date,
            CurbTrip.end_time < (end_date + timedelta(days=1))
        )
        
        if driver_id:
            query = query.filter(CurbTrip.curb_driver_id == driver_id)
            
        if medallion_number:
            query = query.filter(CurbTrip.curb_cab_number == medallion_number)
            
        return query.count()
    
    def find_trips_by_status(
        self, status: CurbTripStatus
    ) -> List[CurbTrip]:
        """
        Fetches all trips with the specified status.
        """
        return self.db.query(CurbTrip).filter(CurbTrip.status == status).all()