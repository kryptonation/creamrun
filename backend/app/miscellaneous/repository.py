"""
app/miscellaneous/repository.py

Data access layer for Miscellaneous Charges module
Handles all database operations for miscellaneous charges
"""

from datetime import date
from typing import List, Optional, Tuple
from decimal import Decimal

from sqlalchemy import func, desc, asc, and_
from sqlalchemy.orm import Session

from app.miscellaneous.models import (
    MiscellaneousCharge, MiscChargeCategory, MiscChargeStatus
)
from app.miscellaneous.exceptions import MiscChargeNotFoundException
from app.utils.logger import get_logger

logger = get_logger(__name__)


class MiscChargeRepository:
    """Repository for MiscellaneousCharge CRUD operations"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def create(self, charge: MiscellaneousCharge) -> MiscellaneousCharge:
        """Create a new miscellaneous charge"""
        self.db.add(charge)
        self.db.flush()
        logger.info(f"Created miscellaneous charge: {charge.expense_id}")
        return charge
    
    def get_by_id(self, expense_id: str) -> Optional[MiscellaneousCharge]:
        """Get charge by expense ID"""
        return self.db.query(MiscellaneousCharge).filter(
            MiscellaneousCharge.expense_id == expense_id
        ).first()
    
    def get_by_id_or_raise(self, expense_id: str) -> MiscellaneousCharge:
        """Get charge by ID or raise exception"""
        charge = self.get_by_id(expense_id)
        if not charge:
            raise MiscChargeNotFoundException(expense_id)
        return charge
    
    def update(self, charge: MiscellaneousCharge) -> MiscellaneousCharge:
        """Update existing charge"""
        self.db.flush()
        logger.info(f"Updated miscellaneous charge: {charge.expense_id}")
        return charge
    
    def find_charges(
        self,
        expense_id: Optional[str] = None,
        driver_id: Optional[int] = None,
        lease_id: Optional[int] = None,
        vehicle_id: Optional[int] = None,
        medallion_id: Optional[int] = None,
        category: Optional[MiscChargeCategory] = None,
        status: Optional[MiscChargeStatus] = None,
        charge_date_from: Optional[date] = None,
        charge_date_to: Optional[date] = None,
        period_start: Optional[date] = None,
        period_end: Optional[date] = None,
        amount_min: Optional[Decimal] = None,
        amount_max: Optional[Decimal] = None,
        posted_to_ledger: Optional[int] = None,
        reference_number: Optional[str] = None,
        page: int = 1,
        page_size: int = 50,
        sort_by: str = "charge_date",
        sort_order: str = "desc"
    ) -> Tuple[List[MiscellaneousCharge], int]:
        """
        Find charges with comprehensive filtering and pagination
        
        Args:
            expense_id: Filter by expense ID (exact match)
            driver_id: Filter by driver
            lease_id: Filter by lease
            vehicle_id: Filter by vehicle
            medallion_id: Filter by medallion
            category: Filter by charge category
            status: Filter by status
            charge_date_from: Filter charges from this date
            charge_date_to: Filter charges up to this date
            period_start: Filter by payment period start
            period_end: Filter by payment period end
            amount_min: Minimum charge amount
            amount_max: Maximum charge amount
            posted_to_ledger: Filter by posted status (0 or 1)
            reference_number: Filter by reference number (partial match)
            page: Page number (1-indexed)
            page_size: Number of records per page
            sort_by: Field to sort by
            sort_order: Sort order (asc/desc)
        
        Returns:
            Tuple of (list of charges, total count)
        """
        query = self.db.query(MiscellaneousCharge)
        
        # Apply filters
        if expense_id:
            query = query.filter(MiscellaneousCharge.expense_id == expense_id)
        
        if driver_id:
            query = query.filter(MiscellaneousCharge.driver_id == driver_id)
        
        if lease_id:
            query = query.filter(MiscellaneousCharge.lease_id == lease_id)
        
        if vehicle_id:
            query = query.filter(MiscellaneousCharge.vehicle_id == vehicle_id)
        
        if medallion_id:
            query = query.filter(MiscellaneousCharge.medallion_id == medallion_id)
        
        if category:
            query = query.filter(MiscellaneousCharge.category == category)
        
        if status:
            query = query.filter(MiscellaneousCharge.status == status)
        
        if charge_date_from:
            query = query.filter(
                func.date(MiscellaneousCharge.charge_date) >= charge_date_from
            )
        
        if charge_date_to:
            query = query.filter(
                func.date(MiscellaneousCharge.charge_date) <= charge_date_to
            )
        
        if period_start:
            query = query.filter(
                func.date(MiscellaneousCharge.payment_period_start) >= period_start
            )
        
        if period_end:
            query = query.filter(
                func.date(MiscellaneousCharge.payment_period_end) <= period_end
            )
        
        if amount_min is not None:
            query = query.filter(MiscellaneousCharge.charge_amount >= amount_min)
        
        if amount_max is not None:
            query = query.filter(MiscellaneousCharge.charge_amount <= amount_max)
        
        if posted_to_ledger is not None:
            query = query.filter(MiscellaneousCharge.posted_to_ledger == posted_to_ledger)
        
        if reference_number:
            query = query.filter(
                MiscellaneousCharge.reference_number.ilike(f"%{reference_number}%")
            )
        
        # Get total count before pagination
        total = query.count()
        
        # Apply sorting
        sort_column = getattr(MiscellaneousCharge, sort_by, MiscellaneousCharge.charge_date)
        if sort_order.lower() == "desc":
            query = query.order_by(desc(sort_column))
        else:
            query = query.order_by(asc(sort_column))
        
        # Apply pagination
        offset = (page - 1) * page_size
        query = query.offset(offset).limit(page_size)
        
        charges = query.all()
        
        logger.info(
            f"Found {len(charges)} charges (total: {total}) - "
            f"page {page}, size {page_size}"
        )
        
        return charges, total
    
    def find_unposted_charges(
        self,
        driver_id: Optional[int] = None,
        lease_id: Optional[int] = None,
        period_start: Optional[date] = None,
        period_end: Optional[date] = None
    ) -> List[MiscellaneousCharge]:
        """
        Find charges that are PENDING and not posted to ledger
        
        Args:
            driver_id: Optional driver filter
            lease_id: Optional lease filter
            period_start: Optional period start filter
            period_end: Optional period end filter
        
        Returns:
            List of unposted charges
        """
        query = self.db.query(MiscellaneousCharge).filter(
            and_(
                MiscellaneousCharge.status == MiscChargeStatus.PENDING,
                MiscellaneousCharge.posted_to_ledger == 0
            )
        )
        
        if driver_id:
            query = query.filter(MiscellaneousCharge.driver_id == driver_id)
        
        if lease_id:
            query = query.filter(MiscellaneousCharge.lease_id == lease_id)
        
        if period_start:
            query = query.filter(
                func.date(MiscellaneousCharge.payment_period_start) >= period_start
            )
        
        if period_end:
            query = query.filter(
                func.date(MiscellaneousCharge.payment_period_end) <= period_end
            )
        
        query = query.order_by(asc(MiscellaneousCharge.charge_date))
        charges = query.all()
        
        logger.info(f"Found {len(charges)} unposted charges")
        return charges
    
    def get_statistics(
        self,
        driver_id: Optional[int] = None,
        lease_id: Optional[int] = None,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None
    ) -> dict:
        """
        Get statistics for miscellaneous charges
        
        Args:
            driver_id: Optional driver filter
            lease_id: Optional lease filter
            date_from: Optional date range start
            date_to: Optional date range end
        
        Returns:
            Dictionary with statistics
        """
        query = self.db.query(MiscellaneousCharge)
        
        if driver_id:
            query = query.filter(MiscellaneousCharge.driver_id == driver_id)
        
        if lease_id:
            query = query.filter(MiscellaneousCharge.lease_id == lease_id)
        
        if date_from:
            query = query.filter(
                func.date(MiscellaneousCharge.charge_date) >= date_from
            )
        
        if date_to:
            query = query.filter(
                func.date(MiscellaneousCharge.charge_date) <= date_to
            )
        
        # Overall statistics
        total_charges = query.count()
        total_amount = query.with_entities(
            func.sum(MiscellaneousCharge.charge_amount)
        ).scalar() or Decimal('0.00')
        
        # By status
        pending_stats = query.filter(
            MiscellaneousCharge.status == MiscChargeStatus.PENDING
        ).with_entities(
            func.count(MiscellaneousCharge.id),
            func.sum(MiscellaneousCharge.charge_amount)
        ).first()
        
        posted_stats = query.filter(
            MiscellaneousCharge.status == MiscChargeStatus.POSTED
        ).with_entities(
            func.count(MiscellaneousCharge.id),
            func.sum(MiscellaneousCharge.charge_amount)
        ).first()
        
        voided_stats = query.filter(
            MiscellaneousCharge.status == MiscChargeStatus.VOIDED
        ).with_entities(
            func.count(MiscellaneousCharge.id),
            func.sum(MiscellaneousCharge.charge_amount)
        ).first()
        
        # By category
        category_stats = {}
        for category in MiscChargeCategory:
            cat_data = query.filter(
                MiscellaneousCharge.category == category
            ).with_entities(
                func.count(MiscellaneousCharge.id),
                func.sum(MiscellaneousCharge.charge_amount)
            ).first()
            
            if cat_data[0] > 0:
                category_stats[category.value] = {
                    "count": cat_data[0],
                    "amount": cat_data[1] or Decimal('0.00')
                }
        
        return {
            "total_charges": total_charges,
            "total_amount": total_amount,
            "pending_charges": pending_stats[0] or 0,
            "pending_amount": pending_stats[1] or Decimal('0.00'),
            "posted_charges": posted_stats[0] or 0,
            "posted_amount": posted_stats[1] or Decimal('0.00'),
            "voided_charges": voided_stats[0] or 0,
            "voided_amount": voided_stats[1] or Decimal('0.00'),
            "by_category": category_stats
        }
    
    def check_duplicate_reference(
        self, 
        reference_number: str, 
        driver_id: int,
        exclude_expense_id: Optional[str] = None
    ) -> bool:
        """
        Check if a reference number already exists for a driver
        
        Args:
            reference_number: Reference number to check
            driver_id: Driver ID
            exclude_expense_id: Expense ID to exclude from check (for updates)
        
        Returns:
            True if duplicate exists, False otherwise
        """
        query = self.db.query(MiscellaneousCharge).filter(
            and_(
                MiscellaneousCharge.reference_number == reference_number,
                MiscellaneousCharge.driver_id == driver_id,
                MiscellaneousCharge.status != MiscChargeStatus.VOIDED
            )
        )
        
        if exclude_expense_id:
            query = query.filter(MiscellaneousCharge.expense_id != exclude_expense_id)
        
        return query.first() is not None