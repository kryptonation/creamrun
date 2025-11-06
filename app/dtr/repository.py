# app/dtr/repository.py

from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, func, desc
from typing import List, Optional, Dict, Any
from datetime import date, datetime
from decimal import Decimal

from app.dtr.models import DTR, DTRStatus, PaymentMethod
from app.dtr.exceptions import DTRNotFoundError
from app.utils.logger import get_logger

logger = get_logger(__name__)


class DTRRepository:
    """
    Repository for DTR data access operations
    """
    
    def __init__(self, db: Session):
        self.db = db
    
    def create(self, dtr_data: Dict[str, Any]) -> DTR:
        """Create a new DTR"""
        dtr = DTR(**dtr_data)
        self.db.add(dtr)
        self.db.flush()
        logger.info(f"Created DTR: {dtr.dtr_number}")
        return dtr
    
    def get_by_id(self, dtr_id: int) -> Optional[DTR]:
        """Get DTR by ID"""
        return self.db.query(DTR).filter(DTR.id == dtr_id).first()
    
    def get_by_dtr_number(self, dtr_number: str) -> Optional[DTR]:
        """Get DTR by DTR number"""
        return self.db.query(DTR).filter(DTR.dtr_number == dtr_number).first()
    
    def get_by_receipt_number(self, receipt_number: str) -> Optional[DTR]:
        """Get DTR by receipt number"""
        return self.db.query(DTR).filter(DTR.receipt_number == receipt_number).first()
    
    def get_by_period(
        self, 
        driver_id: int, 
        lease_id: int, 
        period_start: date, 
        period_end: date
    ) -> Optional[DTR]:
        """Check if DTR exists for given period"""
        return self.db.query(DTR).filter(
            and_(
                DTR.driver_id == driver_id,
                DTR.lease_id == lease_id,
                DTR.period_start_date == period_start,
                DTR.period_end_date == period_end,
                DTR.status != DTRStatus.VOIDED
            )
        ).first()
    
    def list_dtrs(
        self,
        driver_id: Optional[int] = None,
        lease_id: Optional[int] = None,
        status: Optional[DTRStatus] = None,
        period_start: Optional[date] = None,
        period_end: Optional[date] = None,
        is_additional_driver: Optional[bool] = None,
        skip: int = 0,
        limit: int = 100,
        sort_by: str = "generation_date",
        sort_order: str = "desc"
    ) -> tuple[List[DTR], int]:
        """List DTRs with filters"""
        query = self.db.query(DTR)
        
        # Apply filters
        if driver_id is not None:
            query = query.filter(DTR.driver_id == driver_id)
        
        if lease_id is not None:
            query = query.filter(DTR.lease_id == lease_id)
        
        if status is not None:
            query = query.filter(DTR.status == status)
        
        if period_start is not None:
            query = query.filter(DTR.period_start_date >= period_start)
        
        if period_end is not None:
            query = query.filter(DTR.period_end_date <= period_end)
        
        if is_additional_driver is not None:
            query = query.filter(DTR.is_additional_driver_dtr == is_additional_driver)
        
        # Get total count
        total_count = query.count()
        
        # Apply sorting
        if sort_order.lower() == "desc":
            query = query.order_by(desc(getattr(DTR, sort_by, DTR.generation_date)))
        else:
            query = query.order_by(getattr(DTR, sort_by, DTR.generation_date))
        
        # Apply pagination
        query = query.offset(skip).limit(limit)
        
        dtrs = query.all()
        return dtrs, total_count
    
    def get_driver_dtrs_by_period(
        self, 
        driver_id: int, 
        period_start: date, 
        period_end: date
    ) -> List[DTR]:
        """Get all DTRs for a driver in a period"""
        return self.db.query(DTR).filter(
            and_(
                DTR.driver_id == driver_id,
                DTR.period_start_date >= period_start,
                DTR.period_end_date <= period_end,
                DTR.status != DTRStatus.VOIDED
            )
        ).all()
    
    def get_unpaid_dtrs(
        self,
        driver_id: Optional[int] = None,
        lease_id: Optional[int] = None
    ) -> List[DTR]:
        """Get all unpaid DTRs"""
        query = self.db.query(DTR).filter(
            and_(
                DTR.status == DTRStatus.FINALIZED,
                or_(
                    DTR.payment_date.is_(None),
                    DTR.total_due_to_driver > 0
                )
            )
        )
        
        if driver_id is not None:
            query = query.filter(DTR.driver_id == driver_id)
        
        if lease_id is not None:
            query = query.filter(DTR.lease_id == lease_id)
        
        return query.all()
    
    def get_by_ach_batch(self, ach_batch_number: str) -> List[DTR]:
        """Get all DTRs in an ACH batch"""
        return self.db.query(DTR).filter(
            DTR.ach_batch_number == ach_batch_number
        ).all()
    
    def update(self, dtr_id: int, update_data: Dict[str, Any]) -> DTR:
        """Update DTR"""
        dtr = self.get_by_id(dtr_id)
        if not dtr:
            raise DTRNotFoundError(f"DTR with ID {dtr_id} not found")
        
        for key, value in update_data.items():
            if hasattr(dtr, key):
                setattr(dtr, key, value)
        
        self.db.flush()
        logger.info(f"Updated DTR: {dtr.dtr_number}")
        return dtr
    
    def void_dtr(self, dtr_id: int, reason: str) -> DTR:
        """Void a DTR"""
        dtr = self.get_by_id(dtr_id)
        if not dtr:
            raise DTRNotFoundError(f"DTR with ID {dtr_id} not found")
        
        dtr.status = DTRStatus.VOIDED
        dtr.voided_reason = reason
        self.db.flush()
        logger.info(f"Voided DTR: {dtr.dtr_number}, Reason: {reason}")
        return dtr
    
    def finalize_dtr(self, dtr_id: int) -> DTR:
        """Finalize a DTR"""
        dtr = self.get_by_id(dtr_id)
        if not dtr:
            raise DTRNotFoundError(f"DTR with ID {dtr_id} not found")
        
        dtr.status = DTRStatus.FINALIZED
        self.db.flush()
        logger.info(f"Finalized DTR: {dtr.dtr_number}")
        return dtr
    
    def mark_as_paid(
        self, 
        dtr_id: int, 
        payment_method: PaymentMethod,
        payment_date: datetime,
        ach_batch_number: Optional[str] = None,
        check_number: Optional[str] = None
    ) -> DTR:
        """Mark DTR as paid"""
        dtr = self.get_by_id(dtr_id)
        if not dtr:
            raise DTRNotFoundError(f"DTR with ID {dtr_id} not found")
        
        dtr.status = DTRStatus.PAID
        dtr.payment_method = payment_method
        dtr.payment_date = payment_date
        dtr.ach_batch_number = ach_batch_number
        dtr.check_number = check_number
        
        self.db.flush()
        logger.info(f"Marked DTR as paid: {dtr.dtr_number}, Method: {payment_method.value}")
        return dtr
    
    def get_statistics(
        self,
        period_start: Optional[date] = None,
        period_end: Optional[date] = None
    ) -> Dict[str, Any]:
        """Get DTR statistics"""
        query = self.db.query(DTR)
        
        if period_start:
            query = query.filter(DTR.period_start_date >= period_start)
        if period_end:
            query = query.filter(DTR.period_end_date <= period_end)
        
        total_dtrs = query.count()
        draft_dtrs = query.filter(DTR.status == DTRStatus.DRAFT).count()
        finalized_dtrs = query.filter(DTR.status == DTRStatus.FINALIZED).count()
        paid_dtrs = query.filter(DTR.status == DTRStatus.PAID).count()
        voided_dtrs = query.filter(DTR.status == DTRStatus.VOIDED).count()
        
        total_earnings = query.with_entities(
            func.coalesce(func.sum(DTR.total_gross_earnings), 0)
        ).scalar()
        
        total_due = query.with_entities(
            func.coalesce(func.sum(DTR.total_due_to_driver), 0)
        ).scalar()
        
        return {
            "total_dtrs": total_dtrs,
            "draft_dtrs": draft_dtrs,
            "finalized_dtrs": finalized_dtrs,
            "paid_dtrs": paid_dtrs,
            "voided_dtrs": voided_dtrs,
            "total_earnings": float(total_earnings),
            "total_due_to_drivers": float(total_due)
        }
    
    def delete(self, dtr_id: int) -> None:
        """Delete DTR (use with caution - voiding is preferred)"""
        dtr = self.get_by_id(dtr_id)
        if not dtr:
            raise DTRNotFoundError(f"DTR with ID {dtr_id} not found")
        
        self.db.delete(dtr)
        self.db.flush()
        logger.warning(f"Deleted DTR: {dtr.dtr_number}")