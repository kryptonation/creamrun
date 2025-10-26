"""
app/ledger/repository.py

Repository layer for database operations
Handles all data access logic for ledger entities
"""

from datetime import datetime
from decimal import Decimal
from typing import List, Optional

from sqlalchemy import and_, desc, asc, func
from sqlalchemy.orm import Session

from app.ledger.models import (
    LedgerPosting, LedgerBalance, PaymentAllocation,
    PostingType, PostingCategory, PostingStatus, BalanceStatus,
)
from app.ledger.exceptions import (
    PostingNotFoundException, BalanceNotFoundException,
    AllocationNotFoundException,
)


# === Ledger Posting Repository ===
class LedgerPostingRepository:
    """Repository for LedgerPosting operations"""

    def __init__(self, db: Session):
        self.db = db

    def create(self, posting: LedgerPosting) -> LedgerPosting:
        """Create a new posting"""
        self.db.add(posting)
        self.db.flush()
        self.db.refresh(posting)
        return posting
    
    def get_by_id(self, posting_id: str) -> Optional[LedgerPosting]:
        """Get posting by posting_id"""
        return self.db.query(LedgerPosting).filter(
            LedgerPosting.posting_id == posting_id
        ).first()
    
    def get_by_id_or_raise(self, posting_id: str) -> LedgerPosting:
        """Get posting by posting_id or raise exception"""
        posting = self.get_by_id(posting_id)
        if not posting:
            raise PostingNotFoundException(posting_id)
        return posting
    
    def exists_by_source(self, source_type: str, source_id: str) -> bool:
        """Check if posting exists for source"""
        return self.db.query(
            self.db.query(LedgerPosting).filter(
                and_(
                    LedgerPosting.source_type == source_type,
                    LedgerPosting.source_id == source_id
                )
            ).exists()
        ).scalar()
    
    def find_all(
        self,
        driver_id: Optional[int] = None,
        lease_id: Optional[int] = None,
        category: Optional[PostingCategory] = None,
        status: Optional[PostingStatus] = None,
        posting_type: Optional[PostingType] = None,
        period_start: Optional[datetime] = None,
        period_end: Optional[datetime] = None,
        limit: int = 100,
        offset: int = 0
    ) -> List[LedgerPosting]:
        """Find postings with filters"""
        query = self.db.query(LedgerPosting)
        
        if driver_id:
            query = query.filter(LedgerPosting.driver_id == driver_id)
        if lease_id:
            query = query.filter(LedgerPosting.lease_id == lease_id)
        if category:
            query = query.filter(LedgerPosting.category == category)
        if status:
            query = query.filter(LedgerPosting.status == status)
        if posting_type:
            query = query.filter(LedgerPosting.posting_type == posting_type)
        if period_start:
            query = query.filter(LedgerPosting.payment_period_start >= period_start)
        if period_end:
            query = query.filter(LedgerPosting.payment_period_end <= period_end)
        
        return query.order_by(desc(LedgerPosting.created_at)).limit(limit).offset(offset).all()
    
    def get_by_source(self, source_type: str, source_id: str) -> Optional[LedgerPosting]:
        """Get posting by source reference"""
        return self.db.query(LedgerPosting).filter(
            and_(
                LedgerPosting.source_type == source_type,
                LedgerPosting.source_id == source_id
            )
        ).first()
    
    def update(self, posting: LedgerPosting) -> LedgerPosting:
        """Update posting (used internally for status changes)"""
        self.db.flush()
        self.db.refresh(posting)
        return posting
    

# === Ledger Balance Repository ===
class LedgerBalanceRepository:
    """Repository for LedgerBalance Operations"""

    def __init__(self, db: Session):
        self.db = db

    def create(self, balance: LedgerBalance) -> LedgerBalance:
        """Create a new balance"""
        self.db.add(balance)
        self.db.flush()
        self.db.refresh(balance)
        return balance
    
    def get_by_id(self, balance_id: str) -> Optional[LedgerBalance]:
        """Get balance by balance_id"""
        return self.db.query(LedgerBalance).filter(
            LedgerBalance.balance_id == balance_id
        ).first()
    
    def get_by_id_or_raise(self, balance_id: str) -> LedgerBalance:
        """Get balance by balance_id or raise exception"""
        balance = self.get_by_id(balance_id)
        if not balance:
            raise BalanceNotFoundException(balance_id)
        return balance
    
    def exists_by_reference(self, reference_type: str, reference_id: str) -> bool:
        """Check if balance exists for reference"""
        return self.db.query(
            self.db.query(LedgerBalance).filter(
                and_(
                    LedgerBalance.reference_type == reference_type,
                    LedgerBalance.reference_id == reference_id
                )
            ).exists()
        ).scalar()
    
    def find_open_balances(
        self,
        driver_id: int,
        lease_id: int,
        category: Optional[PostingCategory] = None
    ) -> List[LedgerBalance]:
        """Find all open balances for driver/lease, ordered by due date (FIFO)"""
        query = self.db.query(LedgerBalance).filter(
            and_(
                LedgerBalance.driver_id == driver_id,
                LedgerBalance.lease_id == lease_id,
                LedgerBalance.status == BalanceStatus.OPEN,
                LedgerBalance.outstanding_balance > 0
            )
        )
        
        if category:
            query = query.filter(LedgerBalance.category == category)
        
        return query.order_by(asc(LedgerBalance.due_date)).all()
    
    def find_all(
        self,
        driver_id: Optional[int] = None,
        lease_id: Optional[int] = None,
        category: Optional[PostingCategory] = None,
        status: Optional[BalanceStatus] = None,
        due_date_from: Optional[datetime] = None,
        due_date_to: Optional[datetime] = None,
        limit: int = 100,
        offset: int = 0
    ) -> List[LedgerBalance]:
        """Find balances with filters"""
        query = self.db.query(LedgerBalance)
        
        if driver_id:
            query = query.filter(LedgerBalance.driver_id == driver_id)
        if lease_id:
            query = query.filter(LedgerBalance.lease_id == lease_id)
        if category:
            query = query.filter(LedgerBalance.category == category)
        if status:
            query = query.filter(LedgerBalance.status == status)
        if due_date_from:
            query = query.filter(LedgerBalance.due_date >= due_date_from)
        if due_date_to:
            query = query.filter(LedgerBalance.due_date <= due_date_to)
        
        return query.order_by(asc(LedgerBalance.due_date)).limit(limit).offset(offset).all()
    
    def get_balance_summary(self, driver_id: int, lease_id: int) -> dict:
        """Get summary of balances by category"""
        summary = self.db.query(
            LedgerBalance.category,
            func.sum(LedgerBalance.original_amount).label("total_obligations"),
            func.sum(LedgerBalance.payment_applied).label("total_paid"),
            func.sum(LedgerBalance.outstanding_balance).label("outstanding_balance"),
            func.count(LedgerBalance.id).label("count")
        ).filter(
            and_(
                LedgerBalance.driver_id == driver_id,
                LedgerBalance.lease_id == lease_id,
                LedgerBalance.status == BalanceStatus.OPEN
            )
        ).group_by(LedgerBalance.category).all()

        return [
            {
                "category": row.category,
                "total_obligations": row.total_obligations or Decimal("0.00"),
                "total_paid": row.outstanding_balance or Decimal("0.00"),
                "open_balance_count": row.count
            }
            for row in summary
        ]
    
    def update(self, balance: LedgerBalance) -> LedgerBalance:
        """Update Balance"""
        self.db.flush()
        self.db.refresh(balance)
        return balance
    

# === Payment Allocation Repository ===
class PaymentAllocationRepository:
    """Repository for PaymentAllocation operations"""

    def __init__(self, db: Session):
        self.db = db

    def create(self, allocation: PaymentAllocation) -> PaymentAllocation:
        """Create a new allocation"""
        self.db.add(allocation)
        self.db.flush()
        self.db.refresh(allocation)
        return allocation

    def get_by_id(self, allocation_id: str) -> Optional[PaymentAllocation]:
        """Get allocation by allocation_id"""
        return self.db.query(PaymentAllocation).filter(
            PaymentAllocation.allocation_id == allocation_id
        ).first()
    
    def get_by_id_or_raise(self, allocation_id: str) -> PaymentAllocation:
        """Get allocation by allocation_id or raise exception"""
        allocation = self.get_by_id(allocation_id)
        if not allocation:
            raise AllocationNotFoundException(allocation_id)
        return allocation
    
    def find_by_balance(self, balance_id: str) -> List[PaymentAllocation]:
        """Find all allocations for a balance"""
        return self.db.query(PaymentAllocation).filter(
            PaymentAllocation.balance_id == balance_id
        ).order_by(desc(PaymentAllocation.allocation_date)).all()
    
    def find_by_payment_posting(self, payment_posting_id: str) -> List[PaymentAllocation]:
        """Find all allocations for a payment posting"""
        return self.db.query(PaymentAllocation).filter(
            PaymentAllocation.payment_posting_id == payment_posting_id
        ).order_by(desc(PaymentAllocation.allocation_date)).all()
