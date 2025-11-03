### app/curb/repository.py

from datetime import date, timedelta
from typing import List, Optional, Tuple

from sqlalchemy import func, update
from sqlalchemy.orm import Session, joinedload

from app.curb.models import CurbTrip, CurbTripStatus
from app.drivers.models import Driver
from app.leases.models import Lease
from app.medallions.models import Medallion
from app.utils.logger import get_logger

logger = get_logger(__name__)


class CurbRepository:
    """
    Data Access Layer for CURB Trip data.
    Handles all database interactions for the CurbTrip model.
    """

    def __init__(self, db: Session):
        self.db = db

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

    def list_curb_data(
        self,
        page: int,
        per_page: int,
        sort_by: str,
        sort_order: str,
        trip_id: Optional[str] = None,
        driver_id: Optional[str] = None,
        medallion_no: Optional[str] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> Tuple[List[CurbTrip], int]:
        """
        Retrieves a paginated, sorted, and filtered list of CURB trips.
        """
        query = (
            self.db.query(CurbTrip)
            .options(
                joinedload(CurbTrip.driver),
                joinedload(CurbTrip.medallion),
                joinedload(CurbTrip.lease),
            )
            .outerjoin(Driver, CurbTrip.driver_id == Driver.id)
            .outerjoin(Medallion, CurbTrip.medallion_id == Medallion.id)
            .outerjoin(Lease, CurbTrip.lease_id == Lease.id)
        )

        # Apply filters
        if trip_id:
            query = query.filter(CurbTrip.curb_trip_id.ilike(f"%{trip_id}%"))
        if driver_id:
            query = query.filter(CurbTrip.curb_driver_id.ilike(f"%{driver_id}%"))
        if medallion_no:
            query = query.filter(CurbTrip.curb_cab_number.ilike(f"%{medallion_no}%"))
        if start_date:
            query = query.filter(CurbTrip.start_time >= start_date)
        if end_date:
            query = query.filter(CurbTrip.end_time < (end_date + timedelta(days=1)))

        # Determine total items before pagination
        total_items_query = query.with_entities(func.count(CurbTrip.id))
        total_items = total_items_query.scalar()

        # Apply sorting
        sort_column_map = {
            "trip_id": CurbTrip.curb_trip_id,
            "driver_id": CurbTrip.curb_driver_id,
            "cab_no": CurbTrip.curb_cab_number,
            "start_time": CurbTrip.start_time,
            "end_time": CurbTrip.end_time,
            "total_amount": CurbTrip.total_amount,
            "payment_mode": CurbTrip.payment_type,
        }
        
        sort_column = sort_column_map.get(sort_by, CurbTrip.start_time)
        if sort_order.lower() == "desc":
            query = query.order_by(sort_column.desc())
        else:
            query = query.order_by(sort_column.asc())

        # Apply pagination
        query = query.offset((page - 1) * per_page).limit(per_page)

        return query.all(), total_items