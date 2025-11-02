# app/driver_loans/repository.py

from datetime import date
from decimal import Decimal
from typing import Optional, List, Tuple
from sqlalchemy import and_, or_, func, desc, asc
from sqlalchemy.orm import Session, joinedload

from app.driver_loans.models import (
    DriverLoan, LoanSchedule, LoanStatus, InstallmentStatus
)
from app.utils.logger import get_logger

logger = get_logger(__name__)


class DriverLoanRepository:
    """Repository for DriverLoan operations"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def create(self, loan: DriverLoan) -> DriverLoan:
        """Create a new loan"""
        self.db.add(loan)
        self.db.commit()
        self.db.refresh(loan)
        logger.info(f"Created loan: {loan.loan_id}")
        return loan
    
    def get_by_id(self, loan_id: str) -> Optional[DriverLoan]:
        """Get loan by loan_id"""
        return self.db.query(DriverLoan).filter(
            DriverLoan.loan_id == loan_id
        ).first()
    
    def get_by_id_with_installments(self, loan_id: str) -> Optional[DriverLoan]:
        """Get loan by loan_id with installments loaded"""
        return self.db.query(DriverLoan).options(
            joinedload(DriverLoan.installments)
        ).filter(
            DriverLoan.loan_id == loan_id
        ).first()
    
    def get_by_primary_key(self, pk: int) -> Optional[DriverLoan]:
        """Get loan by primary key"""
        return self.db.query(DriverLoan).filter(DriverLoan.id == pk).first()
    
    def update(self, loan: DriverLoan) -> DriverLoan:
        """Update existing loan"""
        self.db.commit()
        self.db.refresh(loan)
        logger.info(f"Updated loan: {loan.loan_id}")
        return loan
    
    def delete(self, loan: DriverLoan) -> None:
        """Delete loan (use with caution)"""
        self.db.delete(loan)
        self.db.commit()
        logger.warning(f"Deleted loan: {loan.loan_id}")
    
    def generate_loan_id(self, year: int) -> str:
        """Generate next loan_id for given year"""
        prefix = f"DL-{year}-"
        
        # Get last loan ID for this year
        last_loan = self.db.query(DriverLoan).filter(
            DriverLoan.loan_id.like(f"{prefix}%")
        ).order_by(desc(DriverLoan.loan_id)).first()
        
        if last_loan:
            # Extract sequence number and increment
            last_seq = int(last_loan.loan_id.split('-')[-1])
            new_seq = last_seq + 1
        else:
            new_seq = 1
        
        return f"{prefix}{new_seq:04d}"
    
    def find_loans(
        self,
        driver_id: Optional[int] = None,
        lease_id: Optional[int] = None,
        status: Optional[LoanStatus] = None,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
        page: int = 1,
        page_size: int = 50,
        sort_by: Optional[str] = None,
        sort_order: str = "desc"
    ) -> Tuple[List[DriverLoan], int]:
        """
        Find loans with filters and pagination
        
        Returns tuple of (loans, total_count)
        """
        query = self.db.query(DriverLoan)
        
        # Apply filters
        if driver_id:
            query = query.filter(DriverLoan.driver_id == driver_id)
        
        if lease_id:
            query = query.filter(DriverLoan.lease_id == lease_id)
        
        if status:
            query = query.filter(DriverLoan.status == status)
        
        if date_from:
            query = query.filter(DriverLoan.loan_date >= date_from)
        
        if date_to:
            query = query.filter(DriverLoan.loan_date <= date_to)
        
        # Get total count
        total = query.count()
        
        # Apply sorting
        if sort_by:
            order_column = getattr(DriverLoan, sort_by, DriverLoan.created_on)
            if sort_order.lower() == "asc":
                query = query.order_by(asc(order_column))
            else:
                query = query.order_by(desc(order_column))
        else:
            query = query.order_by(desc(DriverLoan.created_on))
        
        # Apply pagination
        offset = (page - 1) * page_size
        loans = query.offset(offset).limit(page_size).all()
        
        return loans, total
    
    def get_statistics(
        self,
        driver_id: Optional[int] = None,
        lease_id: Optional[int] = None,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None
    ) -> dict:
        """Get loan statistics"""
        query = self.db.query(DriverLoan)
        
        # Apply filters
        if driver_id:
            query = query.filter(DriverLoan.driver_id == driver_id)
        
        if lease_id:
            query = query.filter(DriverLoan.lease_id == lease_id)
        
        if date_from:
            query = query.filter(DriverLoan.loan_date >= date_from)
        
        if date_to:
            query = query.filter(DriverLoan.loan_date <= date_to)
        
        # Calculate statistics
        stats = query.with_entities(
            func.count(DriverLoan.id).label('total_loans'),
            func.sum(DriverLoan.loan_amount).label('total_amount_disbursed'),
            func.sum(DriverLoan.total_principal_paid).label('total_principal_collected'),
            func.sum(DriverLoan.total_interest_paid).label('total_interest_collected'),
            func.sum(DriverLoan.outstanding_balance).label('total_outstanding')
        ).first()
        
        # Count by status
        status_counts = query.with_entities(
            DriverLoan.status,
            func.count(DriverLoan.id)
        ).group_by(DriverLoan.status).all()
        
        status_dict = {status.value: count for status, count in status_counts}
        
        return {
            "total_loans": stats.total_loans or 0,
            "active_loans": status_dict.get(LoanStatus.ACTIVE.value, 0),
            "closed_loans": status_dict.get(LoanStatus.CLOSED.value, 0),
            "on_hold_loans": status_dict.get(LoanStatus.ON_HOLD.value, 0),
            "total_amount_disbursed": stats.total_amount_disbursed or Decimal('0.00'),
            "total_amount_collected": (stats.total_principal_collected or Decimal('0.00')) + 
                                     (stats.total_interest_collected or Decimal('0.00')),
            "total_outstanding": stats.total_outstanding or Decimal('0.00'),
            "total_interest_collected": stats.total_interest_collected or Decimal('0.00')
        }


class LoanScheduleRepository:
    """Repository for LoanSchedule operations"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def create(self, installment: LoanSchedule) -> LoanSchedule:
        """Create a new installment"""
        self.db.add(installment)
        self.db.commit()
        self.db.refresh(installment)
        logger.info(f"Created installment: {installment.installment_id}")
        return installment
    
    def create_bulk(self, installments: List[LoanSchedule]) -> List[LoanSchedule]:
        """Create multiple installments"""
        self.db.add_all(installments)
        self.db.commit()
        for inst in installments:
            self.db.refresh(inst)
        logger.info(f"Created {len(installments)} installments")
        return installments
    
    def get_by_id(self, installment_id: str) -> Optional[LoanSchedule]:
        """Get installment by installment_id"""
        return self.db.query(LoanSchedule).filter(
            LoanSchedule.installment_id == installment_id
        ).first()
    
    def get_by_loan_id(self, loan_id: str) -> List[LoanSchedule]:
        """Get all installments for a loan"""
        return self.db.query(LoanSchedule).filter(
            LoanSchedule.loan_id == loan_id
        ).order_by(LoanSchedule.installment_number).all()
    
    def update(self, installment: LoanSchedule) -> LoanSchedule:
        """Update existing installment"""
        self.db.commit()
        self.db.refresh(installment)
        logger.info(f"Updated installment: {installment.installment_id}")
        return installment
    
    def find_unposted_installments(
        self,
        loan_id: Optional[str] = None,
        driver_id: Optional[int] = None,
        lease_id: Optional[int] = None,
        medallion_id: Optional[int] = None,
        vehicle_id: Optional[int] = None,
        period_start: Optional[date] = None,
        period_end: Optional[date] = None,
        status: Optional[InstallmentStatus] = None,
        page: int = 1,
        page_size: int = 50,
        sort_by: Optional[str] = None,
        sort_order: str = "asc"
    ) -> Tuple[List[LoanSchedule], int]:
        """
        Find unposted installments with comprehensive filters
        
        Returns tuple of (installments, total_count)
        """
        query = self.db.query(LoanSchedule).join(
            DriverLoan, LoanSchedule.loan_id == DriverLoan.loan_id
        )
        
        # Base filter: not posted
        query = query.filter(LoanSchedule.posted_to_ledger == False)
        
        # Apply filters
        if loan_id:
            query = query.filter(LoanSchedule.loan_id == loan_id)
        
        if driver_id:
            query = query.filter(DriverLoan.driver_id == driver_id)
        
        if lease_id:
            query = query.filter(DriverLoan.lease_id == lease_id)
        
        if medallion_id:
            # Join with lease table to filter by medallion
            from app.leases.models import Lease
            query = query.join(Lease, DriverLoan.lease_id == Lease.id)
            query = query.filter(Lease.medallion_id == medallion_id)
        
        if vehicle_id:
            # Join with lease table to filter by vehicle
            from app.leases.models import Lease
            if medallion_id is None:  # Avoid duplicate join
                query = query.join(Lease, DriverLoan.lease_id == Lease.id)
            query = query.filter(Lease.vehicle_id == vehicle_id)
        
        if period_start:
            query = query.filter(LoanSchedule.week_start >= period_start)
        
        if period_end:
            query = query.filter(LoanSchedule.week_end <= period_end)
        
        if status:
            query = query.filter(LoanSchedule.status == status)
        
        # Get total count
        total = query.count()
        
        # Apply sorting
        if sort_by:
            order_column = getattr(LoanSchedule, sort_by, LoanSchedule.due_date)
            if sort_order.lower() == "asc":
                query = query.order_by(asc(order_column))
            else:
                query = query.order_by(desc(order_column))
        else:
            query = query.order_by(asc(LoanSchedule.due_date))
        
        # Apply pagination
        offset = (page - 1) * page_size
        installments = query.offset(offset).limit(page_size).all()
        
        return installments, total
    
    def find_installments_for_period(
        self,
        period_start: date,
        period_end: date,
        status: Optional[InstallmentStatus] = None
    ) -> List[LoanSchedule]:
        """Find installments for a specific payment period"""
        query = self.db.query(LoanSchedule).filter(
            and_(
                LoanSchedule.week_start >= period_start,
                LoanSchedule.week_end <= period_end
            )
        )
        
        if status:
            query = query.filter(LoanSchedule.status == status)
        
        return query.order_by(LoanSchedule.due_date).all()
    
    def find_due_unposted_installments(
        self,
        as_of_date: Optional[date] = None
    ) -> List[LoanSchedule]:
        """
        Find installments that are due but not posted to ledger
        
        Args:
            as_of_date: Date to check against (defaults to today)
        """
        if as_of_date is None:
            as_of_date = date.today()
        
        return self.db.query(LoanSchedule).filter(
            and_(
                LoanSchedule.status == InstallmentStatus.DUE,
                LoanSchedule.posted_to_ledger == False,
                LoanSchedule.due_date <= as_of_date
            )
        ).order_by(LoanSchedule.due_date).all()