### app/pvb/repository.py

from datetime import date, datetime, time
from typing import List, Optional, Tuple

from sqlalchemy import func, update
from sqlalchemy.orm import Session, joinedload

from app.drivers.models import Driver
from app.medallions.models import Medallion
from app.pvb.models import (
    PVBImport,
    PVBImportStatus,
    PVBViolation,
    PVBViolationStatus,
)
from app.utils.logger import get_logger

logger = get_logger(__name__)


class PVBRepository:
    """
    Data Access Layer for PVB Imports and Violations.
    """

    def __init__(self, db: Session):
        self.db = db

    def create_import_record(self, file_name: str, total_records: int) -> PVBImport:
        """Creates a new parent record for a CSV import batch."""
        import_record = PVBImport(
            file_name=file_name,
            total_records=total_records,
            status=PVBImportStatus.PROCESSING,
        )
        self.db.add(import_record)
        self.db.flush()
        return import_record

    def update_import_record_status(
        self, import_id: int, status: PVBImportStatus, successful: int, failed: int
    ):
        """Updates the status and counts of an import record upon completion."""
        stmt = (
            update(PVBImport)
            .where(PVBImport.id == import_id)
            .values(
                status=status,
                successful_records=successful,
                failed_records=failed,
                updated_on=datetime.utcnow(),
            )
        )
        self.db.execute(stmt)

    def bulk_insert_violations(self, violations_data: List[dict]):
        """Performs a bulk insert of new PVBViolation records, skipping duplicates."""
        if not violations_data:
            return
            
        incoming_summons = {v['summons'] for v in violations_data}
        existing_summons = {
            res[0] for res in self.db.query(PVBViolation.summons)
            .filter(PVBViolation.summons.in_(incoming_summons))
        }
        
        new_violations = [
            PVBViolation(**data)
            for data in violations_data
            if data['summons'] not in existing_summons
        ]

        if new_violations:
            self.db.add_all(new_violations)
        
        logger.info(f"Prepared {len(new_violations)} new PVB violations for insertion. Skipped {len(existing_summons)} duplicates.")


    def get_violation_by_summons(self, summons: str) -> Optional[PVBViolation]:
        """Fetches a single violation by its unique summons number."""
        return self.db.query(PVBViolation).filter(PVBViolation.summons == summons).first()

    def get_violations_by_status(
        self, status: PVBViolationStatus
    ) -> List[PVBViolation]:
        """Retrieves all violations currently in a specific status."""
        return (
            self.db.query(PVBViolation)
            .filter(PVBViolation.status == status)
            .all()
        )

    def update_violation(self, violation_id: int, updates: dict):
        """Updates specific fields of a single violation record."""
        updates["updated_on"] = datetime.utcnow()
        stmt = (
            update(PVBViolation)
            .where(PVBViolation.id == violation_id)
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
    ) -> Tuple[List[PVBViolation], int]:
        """
        Retrieves a paginated, sorted, and filtered list of PVB violations.
        """
        query = (
            self.db.query(PVBViolation)
            .options(
                joinedload(PVBViolation.driver),
                joinedload(PVBViolation.medallion),
            )
            .outerjoin(Driver, PVBViolation.driver_id == Driver.id)
            .outerjoin(Medallion, PVBViolation.medallion_id == Medallion.id)
        )

        # Apply filters
        if plate:
            query = query.filter(PVBViolation.plate.ilike(f"%{plate}%"))
        if state:
            query = query.filter(PVBViolation.state.ilike(f"%{state}%"))
        if type:
            query = query.filter(PVBViolation.type.ilike(f"%{type}%"))
        if summons:
            query = query.filter(PVBViolation.summons.ilike(f"%{summons}%"))
        if issue_date:
            start_of_day = datetime.combine(issue_date, time.min)
            end_of_day = datetime.combine(issue_date, time.max)
            query = query.filter(PVBViolation.issue_date.between(start_of_day, end_of_day))
        if driver_id:
            query = query.filter(Driver.driver_id.ilike(f"%{driver_id}%"))
        if medallion_no:
            query = query.filter(Medallion.medallion_number.ilike(f"%{medallion_no}%"))

        total_items = query.with_entities(func.count(PVBViolation.id)).scalar()

        # Apply sorting
        sort_column_map = {
            "plate": PVBViolation.plate,
            "state": PVBViolation.state,
            "type": PVBViolation.type,
            "summons": PVBViolation.summons,
            "issue_date": PVBViolation.issue_date,
            "issue_time": PVBViolation.issue_time,
            "medallion_no": Medallion.medallion_number,
            "driver_id": Driver.driver_id,
        }
        
        sort_column = sort_column_map.get(sort_by, PVBViolation.issue_date)
        if sort_order.lower() == "desc":
            query = query.order_by(sort_column.desc())
        else:
            query = query.order_by(sort_column.asc())

        query = query.offset((page - 1) * per_page).limit(per_page)

        return query.all(), total_items