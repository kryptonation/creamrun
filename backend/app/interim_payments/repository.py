"""
app/interim_payments/repository.py

Repository layer for Interim Payments module
Handles all data access operations for payments and allocations
"""

from datetime import date
from decimal import Decimal
from typing import List, Optional, Tuple

from sqlalchemy import and_, func, desc, asc
from sqlalchemy.orm import Session, joinedload

from app.interim_payments.models import (
    InterimPayment, PaymentAllocationDetail,
    PaymentMethod, PaymentStatus, AllocationCategory
)
from app.interim_payments.exceptions import (
    PaymentNotFoundException, AllocationNotFoundException
)


class InterimPaymentRepository:
    """Repository for InterimPayment operations"""

    def __init__(self, db: Session):
        self.db = db

    def create(self, payment: InterimPayment) -> InterimPayment:
        """Create a new interim payment"""
        self.db.add(payment)
        self.db.flush()
        self.db.refresh(payment)
        return payment

    def get_by_id(self, payment_id: int) -> Optional[InterimPayment]:
        """Get payment by ID"""
        return self.db.query(InterimPayment).filter(
            InterimPayment.id == payment_id
        ).first()

    def get_by_payment_id(self, payment_id: str) -> Optional[InterimPayment]:
        """Get payment by payment_id string"""
        return self.db.query(InterimPayment).filter(
            InterimPayment.payment_id == payment_id
        ).first()

    def get_by_id_or_raise(self, payment_id: int) -> InterimPayment:
        """Get payment by ID or raise exception"""
        payment = self.get_by_id(payment_id)
        if not payment:
            raise PaymentNotFoundException(payment_id)
        return payment

    def get_with_allocations(self, payment_id: int) -> Optional[InterimPayment]:
        """Get payment with all allocations loaded"""
        return self.db.query(InterimPayment).options(
            joinedload(InterimPayment.allocations)
        ).filter(InterimPayment.id == payment_id).first()

    def update(self, payment: InterimPayment) -> InterimPayment:
        """Update payment"""
        self.db.flush()
        self.db.refresh(payment)
        return payment

    def delete(self, payment: InterimPayment) -> None:
        """Delete payment (soft delete by voiding is preferred)"""
        self.db.delete(payment)
        self.db.flush()

    def find_all(
        self,
        payment_id: Optional[str] = None,
        driver_id: Optional[int] = None,
        lease_id: Optional[int] = None,
        vehicle_id: Optional[int] = None,
        medallion_id: Optional[int] = None,
        payment_method: Optional[PaymentMethod] = None,
        status: Optional[PaymentStatus] = None,
        posted_to_ledger: Optional[int] = None,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
        receipt_number: Optional[str] = None,
        check_number: Optional[str] = None,
        min_amount: Optional[Decimal] = None,
        max_amount: Optional[Decimal] = None,
        voided: Optional[bool] = None,
        page: int = 1,
        page_size: int = 50,
        sort_by: str = "payment_date",
        sort_order: str = "desc"
    ) -> Tuple[List[InterimPayment], int]:
        """
        Find payments with comprehensive filtering and pagination
        
        Returns: (list of payments, total count)
        """
        query = self.db.query(InterimPayment)

        # Apply filters
        if payment_id:
            query = query.filter(InterimPayment.payment_id.ilike(f"%{payment_id}%"))

        if driver_id is not None:
            query = query.filter(InterimPayment.driver_id == driver_id)

        if lease_id is not None:
            query = query.filter(InterimPayment.lease_id == lease_id)

        if vehicle_id is not None:
            query = query.filter(InterimPayment.vehicle_id == vehicle_id)

        if medallion_id is not None:
            query = query.filter(InterimPayment.medallion_id == medallion_id)

        if payment_method:
            query = query.filter(InterimPayment.payment_method == payment_method)

        if status:
            query = query.filter(InterimPayment.status == status)

        if posted_to_ledger is not None:
            query = query.filter(InterimPayment.posted_to_ledger == posted_to_ledger)

        if date_from:
            query = query.filter(InterimPayment.payment_date >= date_from)

        if date_to:
            query = query.filter(InterimPayment.payment_date <= date_to)

        if receipt_number:
            query = query.filter(InterimPayment.receipt_number.ilike(f"%{receipt_number}%"))

        if check_number:
            query = query.filter(InterimPayment.check_number.ilike(f"%{check_number}%"))

        if min_amount is not None:
            query = query.filter(InterimPayment.total_amount >= min_amount)

        if max_amount is not None:
            query = query.filter(InterimPayment.total_amount <= max_amount)

        if voided is not None:
            if voided:
                query = query.filter(InterimPayment.voided_at.isnot(None))
            else:
                query = query.filter(InterimPayment.voided_at.is_(None))

        # Get total count before pagination
        total = query.count()

        # Apply sorting
        sort_column = getattr(InterimPayment, sort_by, InterimPayment.payment_date)
        if sort_order.lower() == "asc":
            query = query.order_by(asc(sort_column))
        else:
            query = query.order_by(desc(sort_column))

        # Apply pagination
        offset = (page - 1) * page_size
        query = query.offset(offset).limit(page_size)

        payments = query.all()
        return payments, total

    def find_unposted(
        self,
        repair_id: Optional[str] = None,
        driver_id: Optional[int] = None,
        lease_id: Optional[int] = None,
        vehicle_id: Optional[int] = None,
        medallion_id: Optional[int] = None,
        period_start: Optional[date] = None,
        period_end: Optional[date] = None,
        sort_by: str = "payment_date",
        sort_order: str = "asc"
    ) -> List[InterimPayment]:
        """
        Find unposted payments based on various criteria
        Supports filtering by repair_id, driver_id, period, etc.
        """
        query = self.db.query(InterimPayment).filter(
            InterimPayment.posted_to_ledger == 0,
            InterimPayment.status.in_([PaymentStatus.PENDING, PaymentStatus.PARTIALLY_POSTED]),
            InterimPayment.voided_at.is_(None)
        )

        # Apply filters
        if driver_id is not None:
            query = query.filter(InterimPayment.driver_id == driver_id)

        if lease_id is not None:
            query = query.filter(InterimPayment.lease_id == lease_id)

        if vehicle_id is not None:
            query = query.filter(InterimPayment.vehicle_id == vehicle_id)

        if medallion_id is not None:
            query = query.filter(InterimPayment.medallion_id == medallion_id)

        if period_start:
            query = query.filter(InterimPayment.payment_date >= period_start)

        if period_end:
            query = query.filter(InterimPayment.payment_date <= period_end)

        # If repair_id is provided, join with allocations
        if repair_id:
            query = query.join(InterimPayment.allocations).filter(
                and_(
                    PaymentAllocationDetail.category == AllocationCategory.REPAIRS,
                    PaymentAllocationDetail.reference_id.ilike(f"%{repair_id}%")
                )
            )

        # Apply sorting
        sort_column = getattr(InterimPayment, sort_by, InterimPayment.payment_date)
        if sort_order.lower() == "asc":
            query = query.order_by(asc(sort_column))
        else:
            query = query.order_by(desc(sort_column))

        return query.all()

    def get_statistics(
        self,
        driver_id: Optional[int] = None,
        lease_id: Optional[int] = None,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None
    ) -> dict:
        """Get payment statistics"""
        query = self.db.query(InterimPayment)

        # Apply filters
        if driver_id is not None:
            query = query.filter(InterimPayment.driver_id == driver_id)

        if lease_id is not None:
            query = query.filter(InterimPayment.lease_id == lease_id)

        if date_from:
            query = query.filter(InterimPayment.payment_date >= date_from)

        if date_to:
            query = query.filter(InterimPayment.payment_date <= date_to)

        # Exclude voided payments
        query = query.filter(InterimPayment.voided_at.is_(None))

        # Calculate statistics
        stats = query.with_entities(
            func.count(InterimPayment.id).label('total_payments'),
            func.sum(InterimPayment.total_amount).label('total_amount'),
            func.avg(InterimPayment.total_amount).label('average_payment'),
            func.sum(
                func.case((InterimPayment.status == PaymentStatus.PENDING, 1), else_=0)
            ).label('pending_count'),
            func.sum(
                func.case((InterimPayment.status == PaymentStatus.POSTED, 1), else_=0)
            ).label('posted_count'),
            func.sum(
                func.case((InterimPayment.status == PaymentStatus.FAILED, 1), else_=0)
            ).label('failed_count'),
        ).first()

        # Get voided count separately
        voided_count = self.db.query(func.count(InterimPayment.id)).filter(
            InterimPayment.voided_at.isnot(None)
        ).scalar()

        return {
            'total_payments': stats.total_payments or 0,
            'total_amount': stats.total_amount or Decimal("0.00"),
            'average_payment': stats.average_payment or Decimal("0.00"),
            'pending_count': stats.pending_count or 0,
            'posted_count': stats.posted_count or 0,
            'failed_count': stats.failed_count or 0,
            'voided_count': voided_count or 0
        }


class PaymentAllocationRepository:
    """Repository for PaymentAllocationDetail operations"""

    def __init__(self, db: Session):
        self.db = db

    def create(self, allocation: PaymentAllocationDetail) -> PaymentAllocationDetail:
        """Create a new allocation"""
        self.db.add(allocation)
        self.db.flush()
        self.db.refresh(allocation)
        return allocation

    def create_bulk(self, allocations: List[PaymentAllocationDetail]) -> List[PaymentAllocationDetail]:
        """Create multiple allocations at once"""
        self.db.add_all(allocations)
        self.db.flush()
        for allocation in allocations:
            self.db.refresh(allocation)
        return allocations

    def get_by_id(self, allocation_id: int) -> Optional[PaymentAllocationDetail]:
        """Get allocation by ID"""
        return self.db.query(PaymentAllocationDetail).filter(
            PaymentAllocationDetail.id == allocation_id
        ).first()

    def get_by_allocation_id(self, allocation_id: str) -> Optional[PaymentAllocationDetail]:
        """Get allocation by allocation_id string"""
        return self.db.query(PaymentAllocationDetail).filter(
            PaymentAllocationDetail.allocation_id == allocation_id
        ).first()

    def get_by_id_or_raise(self, allocation_id: int) -> PaymentAllocationDetail:
        """Get allocation by ID or raise exception"""
        allocation = self.get_by_id(allocation_id)
        if not allocation:
            raise AllocationNotFoundException(allocation_id)
        return allocation

    def get_by_payment(self, payment_id: int) -> List[PaymentAllocationDetail]:
        """Get all allocations for a payment"""
        return self.db.query(PaymentAllocationDetail).filter(
            PaymentAllocationDetail.payment_id == payment_id
        ).order_by(PaymentAllocationDetail.allocation_sequence).all()

    def get_by_ledger_balance(self, ledger_balance_id: str) -> List[PaymentAllocationDetail]:
        """Get all allocations for a specific ledger balance"""
        return self.db.query(PaymentAllocationDetail).filter(
            PaymentAllocationDetail.ledger_balance_id == ledger_balance_id
        ).all()

    def update(self, allocation: PaymentAllocationDetail) -> PaymentAllocationDetail:
        """Update allocation"""
        self.db.flush()
        self.db.refresh(allocation)
        return allocation

    def delete(self, allocation: PaymentAllocationDetail) -> None:
        """Delete allocation"""
        self.db.delete(allocation)
        self.db.flush()

    def get_unposted_by_reference(
        self,
        category: AllocationCategory,
        reference_id: str
    ) -> List[PaymentAllocationDetail]:
        """Get unposted allocations for a specific reference"""
        return self.db.query(PaymentAllocationDetail).filter(
            and_(
                PaymentAllocationDetail.category == category,
                PaymentAllocationDetail.reference_id == reference_id,
                PaymentAllocationDetail.posted_to_ledger == 0
            )
        ).all()