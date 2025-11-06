### app/driver_payments/repository.py

"""
Data Access Layer for Driver Payments module.
Handles all database operations for DTRs and ACH batches.
"""

from datetime import date, datetime
from typing import List, Optional, Tuple

from sqlalchemy import and_, or_, desc, asc, func
from sqlalchemy.orm import Session, joinedload

from app.driver_payments.models import (
    DriverTransactionReceipt, ACHBatch, CompanyBankConfiguration,
    DTRStatus, ACHBatchStatus, PaymentType
)
from app.drivers.models import Driver
from app.leases.models import Lease
from app.vehicles.models import Vehicle
from app.medallions.models import Medallion
from app.utils.logger import get_logger

logger = get_logger(__name__)


class DriverPaymentRepository:
    """Repository for Driver Transaction Receipts."""
    
    def __init__(self, db: Session):
        self.db = db
    
    def create_dtr(self, dtr: DriverTransactionReceipt) -> DriverTransactionReceipt:
        """Create a new DTR record."""
        self.db.add(dtr)
        self.db.flush()
        self.db.refresh(dtr)
        return dtr
    
    def get_dtr_by_id(self, dtr_id: int) -> Optional[DriverTransactionReceipt]:
        """Get DTR by ID with relationships loaded."""
        return (
            self.db.query(DriverTransactionReceipt)
            .options(
                joinedload(DriverTransactionReceipt.driver),
                joinedload(DriverTransactionReceipt.lease),
                joinedload(DriverTransactionReceipt.vehicle),
                joinedload(DriverTransactionReceipt.medallion)
            )
            .filter(DriverTransactionReceipt.id == dtr_id)
            .first()
        )
    
    def get_dtr_by_receipt_number(self, receipt_number: str) -> Optional[DriverTransactionReceipt]:
        """Get DTR by receipt number."""
        return (
            self.db.query(DriverTransactionReceipt)
            .options(
                joinedload(DriverTransactionReceipt.driver),
                joinedload(DriverTransactionReceipt.lease)
            )
            .filter(DriverTransactionReceipt.receipt_number == receipt_number)
            .first()
        )
    
    def check_dtr_exists(self, driver_id: int, lease_id: int, week_start_date: date) -> bool:
        """Check if DTR already exists for driver/lease/week."""
        return (
            self.db.query(DriverTransactionReceipt)
            .filter(
                and_(
                    DriverTransactionReceipt.driver_id == driver_id,
                    DriverTransactionReceipt.lease_id == lease_id,
                    DriverTransactionReceipt.week_start_date == week_start_date
                )
            )
            .count() > 0
        )
    
    def list_dtrs(
        self,
        page: int = 1,
        per_page: int = 10,
        sort_by: str = "week_end_date",
        sort_order: str = "desc",
        receipt_number: Optional[str] = None,
        driver_name: Optional[str] = None,
        tlc_license: Optional[str] = None,
        medallion_no: Optional[str] = None,
        plate_number: Optional[str] = None,
        week_start_date: Optional[date] = None,
        week_end_date: Optional[date] = None,
        payment_type: Optional[PaymentType] = None,
        status: Optional[DTRStatus] = None,
        is_paid: Optional[bool] = None,
        ach_batch_number: Optional[str] = None,
        check_number: Optional[str] = None
    ) -> Tuple[List[DriverTransactionReceipt], int]:
        """
        List DTRs with pagination and filtering.
        Returns tuple of (list of DTRs, total count).
        """
        query = (
            self.db.query(DriverTransactionReceipt)
            .join(Driver, DriverTransactionReceipt.driver_id == Driver.id)
            .join(Lease, DriverTransactionReceipt.lease_id == Lease.id)
            .outerjoin(Vehicle, DriverTransactionReceipt.vehicle_id == Vehicle.id)
            .outerjoin(Medallion, DriverTransactionReceipt.medallion_id == Medallion.id)
            .outerjoin(ACHBatch, DriverTransactionReceipt.ach_batch_id == ACHBatch.id)
        )
        
        # Apply filters
        if receipt_number:
            query = query.filter(
                DriverTransactionReceipt.receipt_number.ilike(f"%{receipt_number}%")
            )
        
        if driver_name:
            query = query.filter(
                or_(
                    Driver.first_name.ilike(f"%{driver_name}%"),
                    Driver.last_name.ilike(f"%{driver_name}%")
                )
            )
        
        if tlc_license:
            query = query.filter(Driver.tlc_license.ilike(f"%{tlc_license}%"))
        
        if medallion_no:
            query = query.filter(Medallion.medallion_number.ilike(f"%{medallion_no}%"))
        
        if plate_number:
            query = query.filter(Vehicle.plate_number.ilike(f"%{plate_number}%"))
        
        if week_start_date:
            query = query.filter(DriverTransactionReceipt.week_start_date == week_start_date)
        
        if week_end_date:
            query = query.filter(DriverTransactionReceipt.week_end_date == week_end_date)
        
        if payment_type:
            query = query.filter(Driver.pay_to_mode == payment_type.value)
        
        if status:
            query = query.filter(DriverTransactionReceipt.status == status)
        
        if is_paid is not None:
            if is_paid:
                query = query.filter(
                    or_(
                        DriverTransactionReceipt.ach_batch_id.isnot(None),
                        DriverTransactionReceipt.check_number.isnot(None)
                    )
                )
            else:
                query = query.filter(
                    and_(
                        DriverTransactionReceipt.ach_batch_id.is_(None),
                        DriverTransactionReceipt.check_number.is_(None),
                        DriverTransactionReceipt.total_due_to_driver > 0
                    )
                )
        
        if ach_batch_number:
            query = query.filter(ACHBatch.batch_number.ilike(f"%{ach_batch_number}%"))
        
        if check_number:
            query = query.filter(
                DriverTransactionReceipt.check_number.ilike(f"%{check_number}%")
            )
        
        # Get total count before pagination
        total_count = query.count()
        
        # Apply sorting
        sort_column = getattr(DriverTransactionReceipt, sort_by, DriverTransactionReceipt.week_end_date)
        if sort_order == "asc":
            query = query.order_by(asc(sort_column))
        else:
            query = query.order_by(desc(sort_column))
        
        # Apply pagination
        offset = (page - 1) * per_page
        dtrs = query.offset(offset).limit(per_page).all()
        
        return dtrs, total_count
    
    def get_unpaid_ach_eligible_dtrs(self) -> List[DriverTransactionReceipt]:
        """
        Get all unpaid DTRs where driver has ACH payment type.
        Used for ACH batch generation.
        """
        return (
            self.db.query(DriverTransactionReceipt)
            .join(Driver, DriverTransactionReceipt.driver_id == Driver.id)
            .filter(
                and_(
                    Driver.pay_to_mode == PaymentType.ACH.value,
                    DriverTransactionReceipt.ach_batch_id.is_(None),
                    DriverTransactionReceipt.check_number.is_(None),
                    DriverTransactionReceipt.total_due_to_driver > 0,
                    DriverTransactionReceipt.status == DTRStatus.GENERATED
                )
            )
            .options(joinedload(DriverTransactionReceipt.driver))
            .all()
        )
    
    def update_dtr_payment_info(
        self,
        dtr_id: int,
        ach_batch_id: Optional[int] = None,
        check_number: Optional[str] = None,
        payment_date: Optional[datetime] = None,
        status: Optional[DTRStatus] = None
    ) -> DriverTransactionReceipt:
        """Update payment information for a DTR."""
        dtr = self.get_dtr_by_id(dtr_id)
        if not dtr:
            return None
        
        if ach_batch_id is not None:
            dtr.ach_batch_id = ach_batch_id
        if check_number is not None:
            dtr.check_number = check_number
        if payment_date is not None:
            dtr.payment_date = payment_date
        if status is not None:
            dtr.status = status
        
        self.db.flush()
        self.db.refresh(dtr)
        return dtr
    
    def get_next_receipt_number(self) -> str:
        """Generate next sequential receipt number in format RCPT-XXXXX."""
        max_receipt = (
            self.db.query(func.max(DriverTransactionReceipt.receipt_number))
            .filter(DriverTransactionReceipt.receipt_number.like('RCPT-%'))
            .scalar()
        )
        
        if max_receipt:
            try:
                last_number = int(max_receipt.split('-')[1])
                next_number = last_number + 1
            except (IndexError, ValueError):
                next_number = 1
        else:
            next_number = 1
        
        return f"RCPT-{next_number:05d}"


class ACHBatchRepository:
    """Repository for ACH Batch management."""
    
    def __init__(self, db: Session):
        self.db = db
    
    def create_batch(self, batch: ACHBatch) -> ACHBatch:
        """Create a new ACH batch."""
        self.db.add(batch)
        self.db.flush()
        self.db.refresh(batch)
        return batch
    
    def get_batch_by_id(self, batch_id: int) -> Optional[ACHBatch]:
        """Get batch by ID with receipts loaded."""
        return (
            self.db.query(ACHBatch)
            .options(joinedload(ACHBatch.receipts))
            .filter(ACHBatch.id == batch_id)
            .first()
        )
    
    def get_batch_by_number(self, batch_number: str) -> Optional[ACHBatch]:
        """Get batch by batch number."""
        return (
            self.db.query(ACHBatch)
            .options(joinedload(ACHBatch.receipts))
            .filter(ACHBatch.batch_number == batch_number)
            .first()
        )
    
    def list_batches(
        self,
        page: int = 1,
        per_page: int = 10,
        sort_by: str = "batch_date",
        sort_order: str = "desc",
        status: Optional[ACHBatchStatus] = None,
        batch_number: Optional[str] = None
    ) -> Tuple[List[ACHBatch], int]:
        """List ACH batches with pagination and filtering."""
        query = self.db.query(ACHBatch)
        
        if status:
            query = query.filter(ACHBatch.status == status)
        
        if batch_number:
            query = query.filter(ACHBatch.batch_number.ilike(f"%{batch_number}%"))
        
        total_count = query.count()
        
        sort_column = getattr(ACHBatch, sort_by, ACHBatch.batch_date)
        if sort_order == "asc":
            query = query.order_by(asc(sort_column))
        else:
            query = query.order_by(desc(sort_column))
        
        offset = (page - 1) * per_page
        batches = query.offset(offset).limit(per_page).all()
        
        return batches, total_count
    
    def get_next_batch_number(self) -> str:
        """
        Generate next sequential batch number in format YYMM-XXX.
        Example: 2510-001 (October 2025, batch 1)
        """
        now = datetime.now()
        prefix = now.strftime("%y%m")
        
        max_batch = (
            self.db.query(func.max(ACHBatch.batch_number))
            .filter(ACHBatch.batch_number.like(f'{prefix}-%'))
            .scalar()
        )
        
        if max_batch:
            try:
                last_seq = int(max_batch.split('-')[1])
                next_seq = last_seq + 1
            except (IndexError, ValueError):
                next_seq = 1
        else:
            next_seq = 1
        
        return f"{prefix}-{next_seq:03d}"
    
    def update_batch(self, batch: ACHBatch) -> ACHBatch:
        """Update batch information."""
        self.db.flush()
        self.db.refresh(batch)
        return batch
    
    def reverse_batch(
        self,
        batch_id: int,
        reversed_by: int,
        reason: str
    ) -> ACHBatch:
        """Mark batch as reversed and clear payment info from DTRs."""
        batch = self.get_batch_by_id(batch_id)
        if not batch:
            return None
        
        batch.is_reversed = True
        batch.reversed_at = datetime.utcnow()
        batch.reversed_by = reversed_by
        batch.reversal_reason = reason
        batch.status = ACHBatchStatus.REVERSED
        
        # Clear payment info from all DTRs in this batch
        for receipt in batch.receipts:
            receipt.ach_batch_id = None
            receipt.payment_date = None
            receipt.status = DTRStatus.GENERATED
        
        self.db.flush()
        return batch


class CompanyBankConfigRepository:
    """Repository for company bank configuration."""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_active_config(self) -> Optional[CompanyBankConfiguration]:
        """Get the active company bank configuration."""
        return (
            self.db.query(CompanyBankConfiguration)
            .filter(CompanyBankConfiguration.is_active == True)
            .first()
        )
    
    def create_config(self, config: CompanyBankConfiguration) -> CompanyBankConfiguration:
        """Create new bank configuration."""
        self.db.add(config)
        self.db.flush()
        self.db.refresh(config)
        return config
    
    def update_config(self, config: CompanyBankConfiguration) -> CompanyBankConfiguration:
        """Update bank configuration."""
        self.db.flush()
        self.db.refresh(config)
        return config