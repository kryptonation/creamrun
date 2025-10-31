"""
app/tlc_violations/repository.py

Repository layer for TLC Violations data access
Handles all database operations for violations and documents
"""

from datetime import date
from decimal import Decimal
from typing import List, Optional, Tuple, Dict, Any
from sqlalchemy import func, desc, asc
from sqlalchemy.orm import Session, joinedload

from app.tlc_violations.models import (
    TLCViolation, TLCViolationDocument,
    ViolationStatus, ViolationType, Disposition, 
    Borough, PostingStatus
)


class TLCViolationRepository:
    """Repository for TLC violation operations"""

    def __init__(self, db: Session):
        self.db = db

    def create(self, violation: TLCViolation) -> TLCViolation:
        """Create a new violation"""
        self.db.add(violation)
        self.db.flush()
        self.db.refresh(violation)
        return violation

    def get_by_id(self, violation_id: int) -> Optional[TLCViolation]:
        """Get violation by ID"""
        return self.db.query(TLCViolation).filter(
            TLCViolation.id == violation_id
        ).first()

    def get_by_violation_id(self, violation_id: str) -> Optional[TLCViolation]:
        """Get violation by violation_id string"""
        return self.db.query(TLCViolation).filter(
            TLCViolation.violation_id == violation_id
        ).first()

    def get_by_summons_number(self, summons_number: str) -> Optional[TLCViolation]:
        """Get violation by summons number"""
        return self.db.query(TLCViolation).filter(
            TLCViolation.summons_number == summons_number
        ).first()

    def get_with_details(self, violation_id: int) -> Optional[TLCViolation]:
        """Get violation with all related entities eagerly loaded"""
        return self.db.query(TLCViolation).options(
            joinedload(TLCViolation.driver),
            joinedload(TLCViolation.vehicle),
            joinedload(TLCViolation.medallion),
            joinedload(TLCViolation.lease),
            joinedload(TLCViolation.documents),
            joinedload(TLCViolation.curb_trip),
            joinedload(TLCViolation.ledger_posting),
            joinedload(TLCViolation.ledger_balance)
        ).filter(TLCViolation.id == violation_id).first()

    def update(self, violation: TLCViolation) -> TLCViolation:
        """Update violation"""
        self.db.flush()
        self.db.refresh(violation)
        return violation

    def find_with_filters(
        self,
        summons_number: Optional[str] = None,
        violation_id_str: Optional[str] = None,
        driver_id: Optional[int] = None,
        vehicle_id: Optional[int] = None,
        medallion_id: Optional[int] = None,
        lease_id: Optional[int] = None,
        status: Optional[ViolationStatus] = None,
        violation_type: Optional[ViolationType] = None,
        disposition: Optional[Disposition] = None,
        posting_status: Optional[PostingStatus] = None,
        posted_to_ledger: Optional[bool] = None,
        is_voided: Optional[bool] = None,
        borough: Optional[Borough] = None,
        occurrence_date_from: Optional[date] = None,
        occurrence_date_to: Optional[date] = None,
        hearing_date_from: Optional[date] = None,
        hearing_date_to: Optional[date] = None,
        created_date_from: Optional[date] = None,
        created_date_to: Optional[date] = None,
        mapped_via_curb: Optional[bool] = None,
        fine_amount_min: Optional[Decimal] = None,
        fine_amount_max: Optional[Decimal] = None,
        page: int = 1,
        page_size: int = 50,
        sort_by: str = "occurrence_date",
        sort_order: str = "desc"
    ) -> Tuple[List[TLCViolation], int]:
        """
        Find violations with comprehensive filtering and pagination
        
        Returns:
            Tuple of (violations list, total count)
        """
        query = self.db.query(TLCViolation)

        # Apply filters
        if summons_number:
            query = query.filter(TLCViolation.summons_number.ilike(f"%{summons_number}%"))
        
        if violation_id_str:
            query = query.filter(TLCViolation.violation_id.ilike(f"%{violation_id_str}%"))
        
        if driver_id:
            query = query.filter(TLCViolation.driver_id == driver_id)
        
        if vehicle_id:
            query = query.filter(TLCViolation.vehicle_id == vehicle_id)
        
        if medallion_id:
            query = query.filter(TLCViolation.medallion_id == medallion_id)
        
        if lease_id:
            query = query.filter(TLCViolation.lease_id == lease_id)
        
        if status:
            query = query.filter(TLCViolation.status == status)
        
        if violation_type:
            query = query.filter(TLCViolation.violation_type == violation_type)
        
        if disposition:
            query = query.filter(TLCViolation.disposition == disposition)
        
        if posting_status:
            query = query.filter(TLCViolation.posting_status == posting_status)
        
        if posted_to_ledger is not None:
            query = query.filter(TLCViolation.posted_to_ledger == posted_to_ledger)
        
        if is_voided is not None:
            query = query.filter(TLCViolation.is_voided == is_voided)
        
        if borough:
            query = query.filter(TLCViolation.borough == borough)
        
        if occurrence_date_from:
            query = query.filter(TLCViolation.occurrence_date >= occurrence_date_from)
        
        if occurrence_date_to:
            query = query.filter(TLCViolation.occurrence_date <= occurrence_date_to)
        
        if hearing_date_from:
            query = query.filter(TLCViolation.hearing_date >= hearing_date_from)
        
        if hearing_date_to:
            query = query.filter(TLCViolation.hearing_date <= hearing_date_to)
        
        if created_date_from:
            query = query.filter(func.date(TLCViolation.created_on) >= created_date_from)
        
        if created_date_to:
            query = query.filter(func.date(TLCViolation.created_on) <= created_date_to)
        
        if mapped_via_curb is not None:
            query = query.filter(TLCViolation.mapped_via_curb == mapped_via_curb)
        
        if fine_amount_min:
            query = query.filter(TLCViolation.fine_amount >= fine_amount_min)
        
        if fine_amount_max:
            query = query.filter(TLCViolation.fine_amount <= fine_amount_max)

        # Get total count before pagination
        total = query.count()

        # Apply sorting
        sort_column = getattr(TLCViolation, sort_by, TLCViolation.occurrence_date)
        if sort_order.lower() == "asc":
            query = query.order_by(asc(sort_column))
        else:
            query = query.order_by(desc(sort_column))

        # Apply pagination
        offset = (page - 1) * page_size
        violations = query.offset(offset).limit(page_size).all()

        return violations, total

    def find_unposted(self) -> List[TLCViolation]:
        """Find all violations not posted to ledger"""
        return self.db.query(TLCViolation).filter(
            TLCViolation.posted_to_ledger == False,
            TLCViolation.is_voided == False,
            TLCViolation.status != ViolationStatus.VOIDED
        ).all()

    def find_unmapped(self) -> List[TLCViolation]:
        """Find violations without driver assignment"""
        return self.db.query(TLCViolation).filter(
            TLCViolation.driver_id.is_(None),
            TLCViolation.is_voided == False
        ).all()

    def find_upcoming_hearings(self, days_ahead: int = 30) -> List[TLCViolation]:
        """Find violations with upcoming hearings"""
        from datetime import timedelta
        today = date.today()
        future_date = today + timedelta(days=days_ahead)
        
        return self.db.query(TLCViolation).filter(
            TLCViolation.hearing_date >= today,
            TLCViolation.hearing_date <= future_date,
            TLCViolation.disposition == Disposition.PENDING,
            TLCViolation.is_voided == False
        ).order_by(TLCViolation.hearing_date).all()

    def find_overdue_hearings(self) -> List[TLCViolation]:
        """Find violations with overdue hearings (past date, no disposition)"""
        today = date.today()
        
        return self.db.query(TLCViolation).filter(
            TLCViolation.hearing_date < today,
            TLCViolation.disposition == Disposition.PENDING,
            TLCViolation.is_voided == False
        ).order_by(TLCViolation.hearing_date).all()

    def get_statistics(self) -> Dict[str, Any]:
        """Get violation statistics"""
        stats = {}
        
        # Total violations
        stats["total_violations"] = self.db.query(TLCViolation).filter(
            TLCViolation.is_voided == False
        ).count()
        
        # By status
        status_counts = self.db.query(
            TLCViolation.status,
            func.count(TLCViolation.id)
        ).filter(
            TLCViolation.is_voided == False
        ).group_by(TLCViolation.status).all()
        stats["by_status"] = {status.value: count for status, count in status_counts}
        
        # By violation type
        type_counts = self.db.query(
            TLCViolation.violation_type,
            func.count(TLCViolation.id)
        ).filter(
            TLCViolation.is_voided == False
        ).group_by(TLCViolation.violation_type).all()
        stats["by_violation_type"] = {vtype.value: count for vtype, count in type_counts}
        
        # By disposition
        disposition_counts = self.db.query(
            TLCViolation.disposition,
            func.count(TLCViolation.id)
        ).filter(
            TLCViolation.is_voided == False
        ).group_by(TLCViolation.disposition).all()
        stats["by_disposition"] = {disp.value: count for disp, count in disposition_counts}
        
        # By posting status
        posting_counts = self.db.query(
            TLCViolation.posting_status,
            func.count(TLCViolation.id)
        ).filter(
            TLCViolation.is_voided == False
        ).group_by(TLCViolation.posting_status).all()
        stats["by_posting_status"] = {pstatus.value: count for pstatus, count in posting_counts}
        
        # Financial totals
        fine_totals = self.db.query(
            func.sum(TLCViolation.fine_amount).label("total"),
            func.sum(
                func.case(
                    (TLCViolation.posted_to_ledger == True, TLCViolation.fine_amount),
                    else_=0
                )
            ).label("posted"),
            func.sum(
                func.case(
                    (TLCViolation.posted_to_ledger == False, TLCViolation.fine_amount),
                    else_=0
                )
            ).label("pending")
        ).filter(TLCViolation.is_voided == False).first()
        
        stats["total_fine_amount"] = float(fine_totals.total or 0)
        stats["posted_fine_amount"] = float(fine_totals.posted or 0)
        stats["pending_fine_amount"] = float(fine_totals.pending or 0)
        
        # Hearing counts
        stats["upcoming_hearings_count"] = len(self.find_upcoming_hearings(30))
        stats["overdue_hearings_count"] = len(self.find_overdue_hearings())
        
        # By borough
        borough_counts = self.db.query(
            TLCViolation.borough,
            func.count(TLCViolation.id)
        ).filter(
            TLCViolation.is_voided == False
        ).group_by(TLCViolation.borough).all()
        stats["violations_by_borough"] = {borough.value: count for borough, count in borough_counts}
        
        return stats

    def delete(self, violation: TLCViolation) -> None:
        """Delete violation (use sparingly, prefer voiding)"""
        self.db.delete(violation)
        self.db.flush()


class TLCViolationDocumentRepository:
    """Repository for TLC violation document operations"""

    def __init__(self, db: Session):
        self.db = db

    def create(self, document: TLCViolationDocument) -> TLCViolationDocument:
        """Create a new document"""
        self.db.add(document)
        self.db.flush()
        self.db.refresh(document)
        return document

    def get_by_id(self, document_id: int) -> Optional[TLCViolationDocument]:
        """Get document by ID"""
        return self.db.query(TLCViolationDocument).filter(
            TLCViolationDocument.id == document_id
        ).first()

    def get_by_document_id(self, document_id: str) -> Optional[TLCViolationDocument]:
        """Get document by document_id string"""
        return self.db.query(TLCViolationDocument).filter(
            TLCViolationDocument.document_id == document_id
        ).first()

    def find_by_violation(self, violation_id: int) -> List[TLCViolationDocument]:
        """Get all documents for a violation"""
        return self.db.query(TLCViolationDocument).filter(
            TLCViolationDocument.violation_id == violation_id
        ).order_by(TLCViolationDocument.uploaded_on.desc()).all()

    def update(self, document: TLCViolationDocument) -> TLCViolationDocument:
        """Update document"""
        self.db.flush()
        self.db.refresh(document)
        return document

    def delete(self, document: TLCViolationDocument) -> None:
        """Delete document"""
        self.db.delete(document)
        self.db.flush()