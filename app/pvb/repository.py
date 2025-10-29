"""
app/pvb/repository.py

Data access layer for PVB module
"""

from datetime import datetime
from typing import List, Optional, Tuple

from sqlalchemy import and_, desc, asc
from sqlalchemy.orm import Session

from app.pvb.models import (
    PVBViolation, PVBImportHistory, PVBSummons, PVBImportFailure,
    MappingMethod, PostingStatus, ViolationStatus, ImportStatus
)


class PVBViolationRepository:
    """Repository for PVB violation operations"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def create(self, violation: PVBViolation) -> PVBViolation:
        """Create new violation"""
        self.db.add(violation)
        self.db.flush()
        return violation
    
    def get_by_id(self, violation_id: int) -> Optional[PVBViolation]:
        """Get violation by ID"""
        return self.db.query(PVBViolation).filter(
            PVBViolation.id == violation_id
        ).first()
    
    def get_by_summons_number(self, summons_number: str) -> Optional[PVBViolation]:
        """Get violation by summons number"""
        return self.db.query(PVBViolation).filter(
            PVBViolation.summons_number == summons_number
        ).first()
    
    def exists_by_summons(self, summons_number: str) -> bool:
        """Check if summons already exists"""
        return self.db.query(
            self.db.query(PVBViolation).filter(
                PVBViolation.summons_number == summons_number
            ).exists()
        ).scalar()
    
    def find_violations(
        self,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
        plate_number: Optional[str] = None,
        driver_id: Optional[int] = None,
        vehicle_id: Optional[int] = None,
        lease_id: Optional[int] = None,
        medallion_id: Optional[int] = None,
        mapping_method: Optional[MappingMethod] = None,
        posting_status: Optional[PostingStatus] = None,
        violation_status: Optional[ViolationStatus] = None,
        posted_to_ledger: Optional[bool] = None,
        import_batch_id: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
        sort_by: str = "issue_date",
        sort_order: str = "desc"
    ) -> Tuple[List[PVBViolation], int]:
        """Find violations with filters"""
        query = self.db.query(PVBViolation)
        
        # Apply filters
        if date_from:
            query = query.filter(PVBViolation.issue_date >= date_from)
        if date_to:
            query = query.filter(PVBViolation.issue_date <= date_to)
        if plate_number:
            query = query.filter(PVBViolation.plate_number.ilike(f"%{plate_number}%"))
        if driver_id:
            query = query.filter(PVBViolation.driver_id == driver_id)
        if vehicle_id:
            query = query.filter(PVBViolation.vehicle_id == vehicle_id)
        if lease_id:
            query = query.filter(PVBViolation.lease_id == lease_id)
        if medallion_id:
            query = query.filter(PVBViolation.medallion_id == medallion_id)
        if mapping_method:
            query = query.filter(PVBViolation.mapping_method == mapping_method)
        if posting_status:
            query = query.filter(PVBViolation.posting_status == posting_status)
        if violation_status:
            query = query.filter(PVBViolation.violation_status == violation_status)
        if posted_to_ledger is not None:
            query = query.filter(PVBViolation.posted_to_ledger == posted_to_ledger)
        if import_batch_id:
            query = query.filter(PVBViolation.import_batch_id == import_batch_id)
        
        # Get total count
        total_count = query.count()
        
        # Apply sorting
        if hasattr(PVBViolation, sort_by):
            column = getattr(PVBViolation, sort_by)
            if sort_order == "desc":
                query = query.order_by(desc(column))
            else:
                query = query.order_by(asc(column))
        
        # Apply pagination
        query = query.limit(limit).offset(offset)
        
        violations = query.all()
        return violations, total_count
    
    def get_unmapped_violations(self, limit: int = 100) -> List[PVBViolation]:
        """Get violations that haven't been mapped to driver"""
        return self.db.query(PVBViolation).filter(
            PVBViolation.mapping_method == MappingMethod.UNKNOWN
        ).order_by(desc(PVBViolation.issue_date)).limit(limit).all()
    
    def get_unposted_violations(self, limit: int = 100) -> List[PVBViolation]:
        """Get violations ready for posting"""
        return self.db.query(PVBViolation).filter(
            and_(
                PVBViolation.posted_to_ledger == False,
                PVBViolation.driver_id.isnot(None),
                PVBViolation.lease_id.isnot(None),
                PVBViolation.amount_due > 0,
                PVBViolation.violation_status.notin_([
                    ViolationStatus.DISPUTED,
                    ViolationStatus.DISMISSED
                ])
            )
        ).order_by(desc(PVBViolation.issue_date)).limit(limit).all()
    
    def update(self, violation: PVBViolation) -> PVBViolation:
        """Update violation"""
        self.db.flush()
        return violation
    
    def bulk_update_posting_status(
        self,
        violation_ids: List[int],
        posting_status: PostingStatus,
        posted_to_ledger: bool
    ):
        """Bulk update posting status"""
        self.db.query(PVBViolation).filter(
            PVBViolation.id.in_(violation_ids)
        ).update({
            PVBViolation.posting_status: posting_status,
            PVBViolation.posted_to_ledger: posted_to_ledger,
            PVBViolation.posted_at: datetime.utcnow() if posted_to_ledger else None
        }, synchronize_session=False)
        self.db.flush()


class PVBImportHistoryRepository:
    """Repository for import history"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def create(self, history: PVBImportHistory) -> PVBImportHistory:
        """Create import history record"""
        self.db.add(history)
        self.db.flush()
        return history
    
    def get_by_batch_id(self, batch_id: str) -> Optional[PVBImportHistory]:
        """Get import history by batch ID"""
        return self.db.query(PVBImportHistory).filter(
            PVBImportHistory.batch_id == batch_id
        ).first()
    
    def find_imports(
        self,
        import_source: Optional[str] = None,
        status: Optional[ImportStatus] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
        limit: int = 50,
        offset: int = 0
    ) -> Tuple[List[PVBImportHistory], int]:
        """Find import history with filters"""
        query = self.db.query(PVBImportHistory)
        
        if import_source:
            query = query.filter(PVBImportHistory.import_source == import_source)
        if status:
            query = query.filter(PVBImportHistory.status == status)
        if date_from:
            query = query.filter(PVBImportHistory.started_at >= date_from)
        if date_to:
            query = query.filter(PVBImportHistory.started_at <= date_to)
        
        total_count = query.count()
        
        query = query.order_by(desc(PVBImportHistory.started_at))
        query = query.limit(limit).offset(offset)
        
        imports = query.all()
        return imports, total_count
    
    def update(self, history: PVBImportHistory) -> PVBImportHistory:
        """Update import history"""
        self.db.flush()
        return history


class PVBSummonsRepository:
    """Repository for summons documents"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def create(self, summons: PVBSummons) -> PVBSummons:
        """Create summons record"""
        self.db.add(summons)
        self.db.flush()
        return summons
    
    def get_by_violation_id(self, violation_id: int) -> List[PVBSummons]:
        """Get all summons for a violation"""
        return self.db.query(PVBSummons).filter(
            PVBSummons.pvb_violation_id == violation_id
        ).order_by(desc(PVBSummons.uploaded_at)).all()
    
    def get_by_id(self, summons_id: int) -> Optional[PVBSummons]:
        """Get summons by ID"""
        return self.db.query(PVBSummons).filter(
            PVBSummons.id == summons_id
        ).first()
    
    def delete(self, summons_id: int):
        """Delete summons record"""
        self.db.query(PVBSummons).filter(
            PVBSummons.id == summons_id
        ).delete()
        self.db.flush()


class PVBImportFailureRepository:
    """Repository for import failures"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def create(self, failure: PVBImportFailure) -> PVBImportFailure:
        """Create failure record"""
        self.db.add(failure)
        self.db.flush()
        return failure
    
    def bulk_create(self, failures: List[PVBImportFailure]):
        """Bulk create failure records"""
        self.db.bulk_save_objects(failures)
        self.db.flush()
    
    def get_by_batch_id(self, batch_id: str) -> List[PVBImportFailure]:
        """Get all failures for a batch"""
        return self.db.query(PVBImportFailure).filter(
            PVBImportFailure.import_batch_id == batch_id
        ).order_by(PVBImportFailure.row_number).all()