### app/tlc/repository.py

from datetime import date, time, datetime
from typing import List, Optional, Tuple

from sqlalchemy import func, update
from sqlalchemy.orm import Session, joinedload

from app.drivers.models import Driver
from app.medallions.models import Medallion
from app.tlc.models import TLCViolation, TLCViolationType
from app.utils.logger import get_logger

logger = get_logger(__name__)


class TLCRepository:
    """
    Data Access Layer for TLC Violations.
    Handles all database interactions for the TLCViolation model.
    """

    def __init__(self, db: Session):
        self.db = db

    def create_violation(self, violation: TLCViolation) -> TLCViolation:
        """Adds a new TLCViolation record to the session."""
        self.db.add(violation)
        self.db.flush()
        self.db.refresh(violation)
        logger.info("Created new TLCViolation", summons_no=violation.summons_no)
        return violation

    def get_violation_by_id(self, violation_id: int) -> Optional[TLCViolation]:
        """Fetches a single TLC violation by its primary key."""
        return self.db.query(TLCViolation).filter(TLCViolation.id == violation_id).first()

    def get_violation_by_summons(self, summons_no: str) -> Optional[TLCViolation]:
        """Fetches a single TLC violation by its unique summons number."""
        return self.db.query(TLCViolation).filter(TLCViolation.summons_no == summons_no).first()

    def update_violation(self, violation_id: int, updates: dict):
        """Updates specific fields of a single violation record."""
        stmt = (
            update(TLCViolation)
            .where(TLCViolation.id == violation_id)
            .values(**updates)
        )
        self.db.execute(stmt)

    def list_violations(
        self,
        page: int,
        per_page: int,
        sort_by: str,
        sort_order: str,
        plate: Optional[str] = None,
        state: Optional[str] = None,
        type: Optional[str] = None,
        summons: Optional[str] = None,
        issue_date: Optional[date] = None,
        driver_id: Optional[str] = None,
        medallion_no: Optional[str] = None,
    ) -> Tuple[List[TLCViolation], int]:
        """
        Retrieves a paginated, sorted, and filtered list of TLC violations.
        """
        from app.drivers.models import Driver
        
        query = (
            self.db.query(TLCViolation)
            .options(
                joinedload(TLCViolation.driver),
                joinedload(TLCViolation.medallion),
                joinedload(TLCViolation.lease),
            )
            .outerjoin(Driver, TLCViolation.driver_id == Driver.id)
            .outerjoin(Medallion, TLCViolation.medallion_id == Medallion.id)
        )

        # Apply filters
        if plate:
            query = query.filter(TLCViolation.plate.ilike(f"%{plate}%"))
        
        if state:
            query = query.filter(TLCViolation.state.ilike(f"%{state}%"))
        
        if type:
            try:
                type_enum = TLCViolationType[type.upper()]
                query = query.filter(TLCViolation.violation_type == type_enum)
            except KeyError:
                logger.warning(f"Invalid type filter for TLC violations: {type}")
        
        if summons:
            query = query.filter(TLCViolation.summons_no.ilike(f"%{summons}%"))
        
        if issue_date:
            query = query.filter(TLCViolation.issue_date == issue_date)
        
        if driver_id:
            query = query.filter(Driver.driver_id.ilike(f"%{driver_id}%"))
        
        if medallion_no:
            query = query.filter(Medallion.medallion_number.ilike(f"%{medallion_no}%"))

        total_items = query.with_entities(func.count(TLCViolation.id)).scalar()

        # Apply sorting
        sort_column_map = {
            "summons_no": TLCViolation.summons_no,
            "plate": TLCViolation.plate,
            "state": TLCViolation.state,
            "type": TLCViolation.violation_type,
            "issue_date": TLCViolation.issue_date,
            "driver_id": Driver.driver_id,
            "medallion_no": Medallion.medallion_number,
            "amount": TLCViolation.amount,
        }
        
        sort_column = sort_column_map.get(sort_by, TLCViolation.issue_date)
        if sort_order.lower() == "desc":
            query = query.order_by(sort_column.desc())
        else:
            query = query.order_by(sort_column.asc())

        query = query.offset((page - 1) * per_page).limit(per_page)

        return query.all(), total_items