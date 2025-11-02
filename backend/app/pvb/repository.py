"""
app/pvb/repository.py

Data access layer for PVB violations
"""

from datetime import date
from decimal import Decimal
from typing import List, Optional, Tuple

from sqlalchemy import and_, desc, asc, func
from sqlalchemy.orm import Session

from app.pvb.models import (
    PVBViolation, PVBImportHistory, 
    MappingMethod, PostingStatus, ImportStatus
)
from app.pvb.exceptions import (
    PVBViolationNotFoundException, PVBImportHistoryNotFoundException
)


class PVBViolationRepository:
    """Repository for PVB violation operations"""

    def __init__(self, db: Session):
        self.db = db

    def create(self, violation: PVBViolation) -> PVBViolation:
        """Create a new violation record"""
        self.db.add(violation)
        self.db.flush()
        self.db.refresh(violation)
        return violation
    
    def bulk_create(self, violations: List[PVBViolation]) -> None:
        """Bulk insert violations"""
        self.db.bulk_save_objects(violations)
        self.db.flush()
    
    def get_by_id(self, violation_id: int) -> Optional[PVBViolation]:
        """Get violation by ID"""
        return self.db.query(PVBViolation).filter(
            PVBViolation.id == violation_id
        ).first()
    
    def get_by_id_or_raise(self, violation_id: int) -> PVBViolation:
        """Get violation by ID or raise exception"""
        violation = self.get_by_id(violation_id)
        if not violation:
            raise PVBViolationNotFoundException(violation_id)
        return violation
    
    def get_by_summons_number(self, summons_number: str) -> Optional[PVBViolation]:
        """Get violation by summons number"""
        return self.db.query(PVBViolation).filter(
            PVBViolation.summons_number == summons_number
        ).first()
    
    def exists_by_summons_number(self, summons_number: str) -> bool:
        """Check if violation exists by summons number"""
        return self.db.query(
            self.db.query(PVBViolation).filter(
                PVBViolation.summons_number == summons_number
            ).exists()
        ).scalar()
    
    def get_violations_by_filters(
        self,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
        plate_number: Optional[str] = None,
        driver_id: Optional[int] = None,
        vehicle_id: Optional[int] = None,
        lease_id: Optional[int] = None,
        mapping_method: Optional[MappingMethod] = None,
        posting_status: Optional[PostingStatus] = None,
        import_batch_id: Optional[str] = None,
        state: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
        sort_by: str = 'violation_date',
        sort_order: str = 'desc'
    ) -> Tuple[List[PVBViolation], int]:
        """
        Get violations with filters and pagination
        
        Returns: (violations, total_count)
        """
        query = self.db.query(PVBViolation)
        
        # Apply filters
        if date_from:
            query = query.filter(PVBViolation.violation_date >= date_from)
        if date_to:
            query = query.filter(PVBViolation.violation_date <= date_to)
        if plate_number:
            query = query.filter(PVBViolation.plate_number.ilike(f"%{plate_number}%"))
        if driver_id:
            query = query.filter(PVBViolation.driver_id == driver_id)
        if vehicle_id:
            query = query.filter(PVBViolation.vehicle_id == vehicle_id)
        if lease_id:
            query = query.filter(PVBViolation.lease_id == lease_id)
        if mapping_method:
            query = query.filter(PVBViolation.mapping_method == mapping_method)
        if posting_status:
            query = query.filter(PVBViolation.posting_status == posting_status)
        if import_batch_id:
            query = query.filter(PVBViolation.import_batch_id == import_batch_id)
        if state:
            query = query.filter(PVBViolation.state == state)
        
        # Get total count
        total = query.count()
        
        # Apply sorting
        if hasattr(PVBViolation, sort_by):
            sort_column = getattr(PVBViolation, sort_by)
            query = query.order_by(desc(sort_column) if sort_order == 'desc' else asc(sort_column))
        
        # Apply pagination
        violations = query.limit(limit).offset(offset).all()
        
        return violations, total
    
    def get_unmapped_violations(
        self, 
        limit: int = 100
    ) -> Tuple[List[PVBViolation], int]:
        """Get violations that haven't been mapped to drivers"""
        query = self.db.query(PVBViolation).filter(
            PVBViolation.mapping_method == MappingMethod.UNMAPPED
        )
        
        total = query.count()
        violations = query.limit(limit).all()
        
        return violations, total
    
    def get_unposted_violations(
        self,
        limit: int = 100
    ) -> Tuple[List[PVBViolation], int]:
        """Get mapped violations that haven't been posted to ledger"""
        query = self.db.query(PVBViolation).filter(
            and_(
                PVBViolation.mapping_method != MappingMethod.UNMAPPED,
                PVBViolation.posting_status == PostingStatus.NOT_POSTED,
                PVBViolation.driver_id.isnot(None),
                PVBViolation.lease_id.isnot(None)
            )
        )
        
        total = query.count()
        violations = query.limit(limit).all()
        
        return violations, total
    
    def get_statistics(
        self,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
        driver_id: Optional[int] = None,
        lease_id: Optional[int] = None
    ) -> dict:
        """Get aggregated statistics for violations"""
        query = self.db.query(PVBViolation)
        
        if date_from:
            query = query.filter(PVBViolation.violation_date >= date_from)
        if date_to:
            query = query.filter(PVBViolation.violation_date <= date_to)
        if driver_id:
            query = query.filter(PVBViolation.driver_id == driver_id)
        if lease_id:
            query = query.filter(PVBViolation.lease_id == lease_id)
        
        total_violations = query.count()
        total_amount_due = query.with_entities(
            func.sum(PVBViolation.amount_due)
        ).scalar() or Decimal('0.00')
        
        mapped_violations = query.filter(
            PVBViolation.mapping_method != MappingMethod.UNMAPPED
        ).count()
        
        posted_violations = query.filter(
            PVBViolation.posting_status == PostingStatus.POSTED
        ).count()
        
        # Group by state
        by_state = self.db.query(
            PVBViolation.state,
            func.count(PVBViolation.id).label('count'),
            func.sum(PVBViolation.amount_due).label('total_amount')
        ).filter(
            PVBViolation.id.in_(query.with_entities(PVBViolation.id))
        ).group_by(PVBViolation.state).all()
        
        # Group by county
        by_county = self.db.query(
            PVBViolation.county,
            func.count(PVBViolation.id).label('count'),
            func.sum(PVBViolation.amount_due).label('total_amount')
        ).filter(
            PVBViolation.id.in_(query.with_entities(PVBViolation.id))
        ).group_by(PVBViolation.county).all()
        
        return {
            'total_violations': total_violations,
            'total_amount_due': float(total_amount_due),
            'mapped_violations': mapped_violations,
            'unmapped_violations': total_violations - mapped_violations,
            'posted_violations': posted_violations,
            'unposted_violations': total_violations - posted_violations,
            'by_state': {
                str(state): {
                    'count': count,
                    'total_amount': float(total) if total else 0.0
                }
                for state, count, total in by_state
            },
            'by_county': {
                str(county): {
                    'count': count,
                    'total_amount': float(total) if total else 0.0
                }
                for county, count, total in by_county if county
            }
        }
    
    def update(self, violation: PVBViolation) -> PVBViolation:
        """Update violation"""
        self.db.flush()
        self.db.refresh(violation)
        return violation


class PVBImportHistoryRepository:
    """Repository for PVB import history operations"""

    def __init__(self, db: Session):
        self.db = db

    def create(self, import_history: PVBImportHistory) -> PVBImportHistory:
        """Create a new import history record"""
        self.db.add(import_history)
        self.db.flush()
        self.db.refresh(import_history)
        return import_history
    
    def get_by_batch_id(self, batch_id: str) -> Optional[PVBImportHistory]:
        """Get import history by batch ID"""
        return self.db.query(PVBImportHistory).filter(
            PVBImportHistory.batch_id == batch_id
        ).first()
    
    def get_by_batch_id_or_raise(self, batch_id: str) -> PVBImportHistory:
        """Get import history by batch ID or raise exception"""
        history = self.get_by_batch_id(batch_id)
        if not history:
            raise PVBImportHistoryNotFoundException(batch_id)
        return history
    
    def get_recent_imports(
        self,
        limit: int = 20,
        status: Optional[ImportStatus] = None
    ) -> List[PVBImportHistory]:
        """Get recent import history records"""
        query = self.db.query(PVBImportHistory)
        
        if status:
            query = query.filter(PVBImportHistory.status == status)
        
        return query.order_by(desc(PVBImportHistory.started_at)).limit(limit).all()
    
    def update(self, import_history: PVBImportHistory) -> PVBImportHistory:
        """Update import history"""
        self.db.flush()
        self.db.refresh(import_history)
        return import_history
