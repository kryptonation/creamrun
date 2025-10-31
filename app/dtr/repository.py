"""
app/dtr/repository.py

Data access layer for DTR module
"""

from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import List, Optional, Tuple

from sqlalchemy import and_, func, desc, asc
from sqlalchemy.orm import Session, joinedload

from app.dtr.models import DTR, DTRStatus, DTRPaymentType, DTRGenerationHistory
from app.utils.logger import get_logger

logger = get_logger(__name__)


class DTRRepository:
    """Repository for DTR database operations"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def create(self, dtr: DTR) -> DTR:
        """Create a new DTR"""
        self.db.add(dtr)
        self.db.flush()
        logger.info(f"Created DTR {dtr.dtr_id} for lease {dtr.lease_id}")
        return dtr
    
    def get_by_id(self, dtr_id: str) -> Optional[DTR]:
        """Get DTR by ID"""
        return self.db.query(DTR).filter(DTR.dtr_id == dtr_id).first()
    
    def get_by_receipt_number(self, receipt_number: str) -> Optional[DTR]:
        """Get DTR by receipt number"""
        return self.db.query(DTR).filter(DTR.receipt_number == receipt_number).first()
    
    def get_by_lease_and_period(
        self,
        lease_id: int,
        period_start: date,
        period_end: date
    ) -> Optional[DTR]:
        """Get DTR for specific lease and period"""
        return self.db.query(DTR).filter(
            and_(
                DTR.lease_id == lease_id,
                DTR.period_start == period_start,
                DTR.period_end == period_end,
                DTR.status != DTRStatus.VOIDED
            )
        ).first()
    
    def find_all(
        self,
        dtr_id: Optional[str] = None,
        receipt_number: Optional[str] = None,
        lease_id: Optional[int] = None,
        driver_id: Optional[int] = None,
        medallion_id: Optional[int] = None,
        vehicle_id: Optional[int] = None,
        period_start: Optional[date] = None,
        period_end: Optional[date] = None,
        status: Optional[DTRStatus] = None,
        payment_type: Optional[DTRPaymentType] = None,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
        page: int = 1,
        page_size: int = 20,
        sort_by: str = "period_start",
        sort_order: str = "desc"
    ) -> Tuple[List[DTR], int]:
        """
        Find DTRs with filters, pagination, and sorting
        
        Returns: (list of DTRs, total count)
        """
        query = self.db.query(DTR).options(
            joinedload(DTR.lease),
            joinedload(DTR.driver),
            joinedload(DTR.vehicle),
            joinedload(DTR.medallion)
        )
        
        # Apply filters
        if dtr_id:
            query = query.filter(DTR.dtr_id.ilike(f"%{dtr_id}%"))
        
        if receipt_number:
            query = query.filter(DTR.receipt_number.ilike(f"%{receipt_number}%"))
        
        if lease_id:
            query = query.filter(DTR.lease_id == lease_id)
        
        if driver_id:
            query = query.filter(DTR.driver_id == driver_id)
        
        if medallion_id:
            query = query.filter(DTR.medallion_id == medallion_id)
        
        if vehicle_id:
            query = query.filter(DTR.vehicle_id == vehicle_id)
        
        if period_start:
            query = query.filter(DTR.period_start >= period_start)
        
        if period_end:
            query = query.filter(DTR.period_end <= period_end)
        
        if status:
            query = query.filter(DTR.status == status)
        
        if payment_type:
            query = query.filter(DTR.payment_type == payment_type)
        
        if date_from:
            query = query.filter(DTR.period_start >= date_from)
        
        if date_to:
            query = query.filter(DTR.period_end <= date_to)
        
        # Get total count before pagination
        total = query.count()
        
        # Apply sorting
        sort_column = getattr(DTR, sort_by, DTR.period_start)
        if sort_order.lower() == "asc":
            query = query.order_by(asc(sort_column))
        else:
            query = query.order_by(desc(sort_column))
        
        # Apply pagination
        query = query.offset((page - 1) * page_size).limit(page_size)
        
        dtrs = query.all()
        
        return dtrs, total
    
    def update(self, dtr: DTR) -> DTR:
        """Update a DTR"""
        dtr.updated_on = datetime.utcnow()
        self.db.flush()
        logger.info(f"Updated DTR {dtr.dtr_id}")
        return dtr
    
    def delete(self, dtr: DTR):
        """Delete a DTR (soft delete by voiding)"""
        dtr.status = DTRStatus.VOIDED
        dtr.voided_at = datetime.utcnow()
        dtr.updated_on = datetime.utcnow()
        self.db.flush()
        logger.info(f"Voided DTR {dtr.dtr_id}")
    
    def get_statistics(self) -> dict:
        """Get DTR statistics"""
        total_dtrs = self.db.query(func.count(DTR.dtr_id)).scalar() or 0
        
        pending_dtrs = self.db.query(func.count(DTR.dtr_id)).filter(
            DTR.status == DTRStatus.PENDING
        ).scalar() or 0
        
        generated_dtrs = self.db.query(func.count(DTR.dtr_id)).filter(
            DTR.status == DTRStatus.GENERATED
        ).scalar() or 0
        
        failed_dtrs = self.db.query(func.count(DTR.dtr_id)).filter(
            DTR.status == DTRStatus.FAILED
        ).scalar() or 0
        
        voided_dtrs = self.db.query(func.count(DTR.dtr_id)).filter(
            DTR.status == DTRStatus.VOIDED
        ).scalar() or 0
        
        # Get current week stats
        today = date.today()
        week_start = today - timedelta(days=today.weekday() + 1 if today.weekday() != 6 else 0)
        week_end = week_start + timedelta(days=6)
        
        current_week_stats = self.db.query(
            func.sum(DTR.total_earnings).label('total_earnings'),
            func.sum(DTR.total_deductions).label('total_deductions'),
            func.sum(DTR.net_earnings).label('net_earnings'),
            func.count(DTR.dtr_id).label('count')
        ).filter(
            and_(
                DTR.period_start == week_start,
                DTR.period_end == week_end,
                DTR.status == DTRStatus.GENERATED
            )
        ).first()
        
        total_earnings_current_week = current_week_stats.total_earnings or Decimal('0.00')
        total_deductions_current_week = current_week_stats.total_deductions or Decimal('0.00')
        total_net_earnings_current_week = current_week_stats.net_earnings or Decimal('0.00')
        count_current_week = current_week_stats.count or 0
        
        avg_net_earnings = (
            total_net_earnings_current_week / count_current_week 
            if count_current_week > 0 
            else Decimal('0.00')
        )
        
        return {
            'total_dtrs': total_dtrs,
            'pending_dtrs': pending_dtrs,
            'generated_dtrs': generated_dtrs,
            'failed_dtrs': failed_dtrs,
            'voided_dtrs': voided_dtrs,
            'total_earnings_current_week': total_earnings_current_week,
            'total_deductions_current_week': total_deductions_current_week,
            'total_net_earnings_current_week': total_net_earnings_current_week,
            'avg_net_earnings_per_dtr': avg_net_earnings
        }


class DTRGenerationHistoryRepository:
    """Repository for DTR generation history"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def create(self, history: DTRGenerationHistory) -> DTRGenerationHistory:
        """Create generation history entry"""
        self.db.add(history)
        self.db.flush()
        return history
    
    def get_history(
        self,
        period_start: Optional[date] = None,
        period_end: Optional[date] = None,
        status: Optional[str] = None,
        limit: int = 20
    ) -> List[DTRGenerationHistory]:
        """Get generation history with filters"""
        query = self.db.query(DTRGenerationHistory)
        
        if period_start:
            query = query.filter(DTRGenerationHistory.period_start >= period_start)
        
        if period_end:
            query = query.filter(DTRGenerationHistory.period_end <= period_end)
        
        if status:
            query = query.filter(DTRGenerationHistory.status == status)
        
        query = query.order_by(desc(DTRGenerationHistory.generation_date)).limit(limit)
        
        return query.all()