"""
app/miscellaneous/service.py (Part 1 of 2)

Business logic layer for Miscellaneous Charges module
Handles charge creation, updates, validation, and ledger posting

PART 1: Main service class, charge management, and validation
"""

from datetime import datetime, timezone
from decimal import Decimal
from typing import List, Optional, Tuple
import math

from sqlalchemy.orm import Session

from app.miscellaneous.models import (
    MiscellaneousCharge, MiscChargeCategory, MiscChargeStatus
)
from app.miscellaneous.repository import MiscChargeRepository
from app.miscellaneous.exceptions import (
    MiscChargeValidationException,
    MiscChargeAmountException,
    MiscChargeAlreadyPostedException,
    MiscChargeAlreadyVoidedException,
    EntityNotFoundException,
    LeaseNotActiveException,
    InvalidPaymentPeriodException,
    DuplicateChargeException,
    MiscChargeNotReadyException,
    MiscChargePostingException
)
from app.ledger.service import LedgerService
from app.ledger.models import PostingCategory
from app.utils.logger import get_logger

logger = get_logger(__name__)


class MiscChargeService:
    """Service layer for miscellaneous charge operations"""
    
    def __init__(self, db: Session):
        self.db = db
        self.repository = MiscChargeRepository(db)
        self.ledger_service = LedgerService(db)
    
    def _generate_expense_id(self) -> str:
        """
        Generate unique expense ID in format ME-YYYY-NNNNNN
        
        Returns:
            Unique expense ID
        """
        current_year = datetime.now().year
        
        # Get the latest expense ID for current year
        latest_charge = self.db.query(MiscellaneousCharge).filter(
            MiscellaneousCharge.expense_id.like(f"ME-{current_year}-%")
        ).order_by(MiscellaneousCharge.id.desc()).first()
        
        if latest_charge:
            # Extract sequence number and increment
            last_id = latest_charge.expense_id
            last_seq = int(last_id.split('-')[-1])
            next_seq = last_seq + 1
        else:
            next_seq = 1
        
        return f"ME-{current_year}-{next_seq:06d}"
    
    def _validate_entities(
        self,
        driver_id: int,
        lease_id: int,
        vehicle_id: Optional[int] = None,
        medallion_id: Optional[int] = None
    ) -> None:
        """
        Validate that referenced entities exist and are valid
        
        Args:
            driver_id: Driver ID to validate
            lease_id: Lease ID to validate
            vehicle_id: Optional vehicle ID to validate
            medallion_id: Optional medallion ID to validate
        
        Raises:
            EntityNotFoundException: If entity doesn't exist
            LeaseNotActiveException: If lease is not active
        """
        from app.drivers.models import Driver
        from app.leases.models import Lease
        from app.vehicles.models import Vehicle
        from app.medallions.models import Medallion
        
        # Validate driver exists
        driver = self.db.query(Driver).filter(Driver.id == driver_id).first()
        if not driver:
            raise EntityNotFoundException("Driver", driver_id)
        
        # Validate lease exists and is active
        lease = self.db.query(Lease).filter(Lease.id == lease_id).first()
        if not lease:
            raise EntityNotFoundException("Lease", lease_id)
        
        if lease.status != "ACTIVE":
            raise LeaseNotActiveException(lease_id)
        
        # Validate driver is associated with lease
        if lease.driver_id != driver_id:
            raise MiscChargeValidationException(
                f"Driver {driver_id} is not associated with lease {lease_id}"
            )
        
        # Validate vehicle if provided
        if vehicle_id:
            vehicle = self.db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
            if not vehicle:
                raise EntityNotFoundException("Vehicle", vehicle_id)
        
        # Validate medallion if provided
        if medallion_id:
            medallion = self.db.query(Medallion).filter(Medallion.id == medallion_id).first()
            if not medallion:
                raise EntityNotFoundException("Medallion", medallion_id)
    
    def _validate_payment_period(
        self,
        period_start: datetime,
        period_end: datetime
    ) -> None:
        """
        Validate payment period dates
        
        Args:
            period_start: Payment period start (must be Sunday 00:00:00)
            period_end: Payment period end (must be Saturday 23:59:59)
        
        Raises:
            InvalidPaymentPeriodException: If dates are invalid
        """
        # Check start is Sunday
        if period_start.weekday() != 6:
            raise InvalidPaymentPeriodException("Start must be Sunday")
        
        # Check end is Saturday
        if period_end.weekday() != 5:
            raise InvalidPaymentPeriodException("End must be Saturday")
        
        # Check time components
        if period_start.hour != 0 or period_start.minute != 0 or period_start.second != 0:
            raise InvalidPaymentPeriodException("Start must be at 00:00:00")
        
        if period_end.hour != 23 or period_end.minute != 59 or period_end.second != 59:
            raise InvalidPaymentPeriodException("End must be at 23:59:59")
        
        # Check period is exactly 7 days
        period_days = (period_end - period_start).days
        if period_days != 6:
            raise InvalidPaymentPeriodException(
                f"Period must be exactly 7 days, got {period_days + 1} days"
            )
    
    def create_charge(
        self,
        driver_id: int,
        lease_id: int,
        category: MiscChargeCategory,
        charge_amount: Decimal,
        charge_date: datetime,
        payment_period_start: datetime,
        payment_period_end: datetime,
        description: str,
        created_by: int,
        vehicle_id: Optional[int] = None,
        medallion_id: Optional[int] = None,
        notes: Optional[str] = None,
        reference_number: Optional[str] = None
    ) -> MiscellaneousCharge:
        """
        Create a new miscellaneous charge
        
        Args:
            driver_id: Driver ID
            lease_id: Lease ID
            category: Charge category
            charge_amount: Amount to charge
            charge_date: Date charge was incurred
            payment_period_start: Payment period start
            payment_period_end: Payment period end
            description: Charge description
            created_by: User creating the charge
            vehicle_id: Optional vehicle ID
            medallion_id: Optional medallion ID
            notes: Optional internal notes
            reference_number: Optional external reference
        
        Returns:
            Created charge
        
        Raises:
            MiscChargeValidationException: If validation fails
        """
        # Validate amount
        if charge_amount == 0:
            raise MiscChargeAmountException(charge_amount, "Amount cannot be zero")
        
        # Validate entities
        self._validate_entities(driver_id, lease_id, vehicle_id, medallion_id)
        
        # Validate payment period
        self._validate_payment_period(payment_period_start, payment_period_end)
        
        # Check for duplicate reference number
        if reference_number:
            if self.repository.check_duplicate_reference(reference_number, driver_id):
                raise DuplicateChargeException(reference_number, driver_id)
        
        # Generate expense ID
        expense_id = self._generate_expense_id()
        
        # Create charge
        charge = MiscellaneousCharge(
            expense_id=expense_id,
            driver_id=driver_id,
            lease_id=lease_id,
            vehicle_id=vehicle_id,
            medallion_id=medallion_id,
            category=category,
            charge_amount=charge_amount,
            charge_date=charge_date,
            payment_period_start=payment_period_start,
            payment_period_end=payment_period_end,
            description=description,
            notes=notes,
            reference_number=reference_number,
            status=MiscChargeStatus.PENDING,
            posted_to_ledger=0,
            created_by=created_by,
            created_on=datetime.utcnow()
        )
        
        created_charge = self.repository.create(charge)
        
        logger.info(
            f"Created miscellaneous charge {expense_id} for driver {driver_id}, "
            f"amount {charge_amount}"
        )
        
        return created_charge
    
    def get_charge_by_id(self, expense_id: str) -> MiscellaneousCharge:
        """
        Get charge by expense ID
        
        Args:
            expense_id: Expense ID
        
        Returns:
            Charge
        
        Raises:
            MiscChargeNotFoundException: If charge not found
        """
        return self.repository.get_by_id_or_raise(expense_id)
    
    def update_charge(
        self,
        expense_id: str,
        updated_by: int,
        category: Optional[MiscChargeCategory] = None,
        charge_amount: Optional[Decimal] = None,
        charge_date: Optional[datetime] = None,
        description: Optional[str] = None,
        notes: Optional[str] = None,
        reference_number: Optional[str] = None
    ) -> MiscellaneousCharge:
        """
        Update an existing charge
        
        Args:
            expense_id: Expense ID to update
            updated_by: User performing update
            category: New category
            charge_amount: New amount
            charge_date: New charge date
            description: New description
            notes: New notes
            reference_number: New reference number
        
        Returns:
            Updated charge
        
        Raises:
            MiscChargeNotFoundException: If charge not found
            MiscChargeAlreadyPostedException: If charge is posted
            MiscChargeValidationException: If validation fails
        """
        charge = self.repository.get_by_id_or_raise(expense_id)
        
        # Cannot update posted charges
        if charge.posted_to_ledger == 1:
            raise MiscChargeAlreadyPostedException(expense_id)
        
        # Cannot update voided charges
        if charge.status == MiscChargeStatus.VOIDED:
            raise MiscChargeAlreadyVoidedException(expense_id)
        
        # Update fields if provided
        if category is not None:
            charge.category = category
        
        if charge_amount is not None:
            if charge_amount == 0:
                raise MiscChargeAmountException(charge_amount)
            charge.charge_amount = charge_amount
        
        if charge_date is not None:
            charge.charge_date = charge_date
        
        if description is not None:
            charge.description = description
        
        if notes is not None:
            charge.notes = notes
        
        if reference_number is not None:
            # Check for duplicate
            if self.repository.check_duplicate_reference(
                reference_number, charge.driver_id, expense_id
            ):
                raise DuplicateChargeException(reference_number, charge.driver_id)
            charge.reference_number = reference_number
        
        charge.updated_by = updated_by
        charge.updated_on = datetime.utcnow()
        
        updated_charge = self.repository.update(charge)
        
        logger.info(f"Updated miscellaneous charge {expense_id}")
        
        return updated_charge

    def find_charges(
        self,
        expense_id: Optional[str] = None,
        driver_id: Optional[int] = None,
        lease_id: Optional[int] = None,
        vehicle_id: Optional[int] = None,
        medallion_id: Optional[int] = None,
        category: Optional[MiscChargeCategory] = None,
        status: Optional[MiscChargeStatus] = None,
        charge_date_from: Optional[datetime] = None,
        charge_date_to: Optional[datetime] = None,
        period_start: Optional[datetime] = None,
        period_end: Optional[datetime] = None,
        amount_min: Optional[Decimal] = None,
        amount_max: Optional[Decimal] = None,
        posted_to_ledger: Optional[int] = None,
        reference_number: Optional[str] = None,
        page: int = 1,
        page_size: int = 50,
        sort_by: str = "charge_date",
        sort_order: str = "desc"
    ) -> Tuple[List[MiscellaneousCharge], int, int]:
        """
        Find charges with filtering, pagination, and sorting
        
        Returns:
            Tuple of (charges list, total count, total pages)
        """
        charges, total = self.repository.find_charges(
            expense_id=expense_id,
            driver_id=driver_id,
            lease_id=lease_id,
            vehicle_id=vehicle_id,
            medallion_id=medallion_id,
            category=category,
            status=status,
            charge_date_from=charge_date_from,
            charge_date_to=charge_date_to,
            period_start=period_start,
            period_end=period_end,
            amount_min=amount_min,
            amount_max=amount_max,
            posted_to_ledger=posted_to_ledger,
            reference_number=reference_number,
            page=page,
            page_size=page_size,
            sort_by=sort_by,
            sort_order=sort_order
        )
        
        total_pages = math.ceil(total / page_size) if total > 0 else 0
        
        return charges, total, total_pages

    def post_charge_to_ledger(
        self,
        expense_id: str,
        posted_by: int
    ) -> MiscellaneousCharge:
        """
        Post miscellaneous charge to ledger
        
        Creates a DEBIT posting in the MISC category and associated balance.
        
        Args:
            expense_id: Expense ID to post
            posted_by: User performing the posting
        
        Returns:
            Updated charge with ledger references
        
        Raises:
            MiscChargeNotFoundException: If charge not found
            MiscChargeNotReadyException: If charge cannot be posted
            MiscChargePostingException: If posting fails
        """
        charge = self.repository.get_by_id_or_raise(expense_id)
        
        # Validate charge can be posted
        if charge.status != MiscChargeStatus.PENDING:
            raise MiscChargeNotReadyException(
                expense_id,
                f"Charge status is {charge.status}, must be PENDING"
            )
        
        if charge.posted_to_ledger == 1:
            raise MiscChargeNotReadyException(
                expense_id,
                "Charge is already posted to ledger"
            )
        
        try:
            # Create obligation in ledger (DEBIT posting + balance)
            posting, balance = self.ledger_service.create_obligation(
                driver_id=charge.driver_id,
                lease_id=charge.lease_id,
                category=PostingCategory.MISC,
                amount=abs(charge.charge_amount),  # Always positive in ledger
                reference_type="MISC_CHARGE",
                reference_id=charge.expense_id,
                payment_period_start=charge.payment_period_start,
                payment_period_end=charge.payment_period_end,
                due_date=charge.payment_period_end,
                description=f"Miscellaneous Charge: {charge.description}"
            )
            
            # Update charge with ledger references
            charge.posted_to_ledger = 1
            charge.ledger_posting_id = posting.posting_id
            charge.ledger_balance_id = balance.balance_id
            charge.posted_at = datetime.utcnow()
            charge.posted_by = posted_by
            charge.status = MiscChargeStatus.POSTED
            
            self.repository.update(charge)
            self.db.commit()
            
            logger.info(
                f"Posted miscellaneous charge {expense_id} to ledger. "
                f"Posting: {posting.posting_id}, Balance: {balance.balance_id}"
            )
            
            return charge
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to post charge {expense_id} to ledger: {str(e)}")
            raise MiscChargePostingException(expense_id, str(e))
    
    def post_multiple_charges(
        self,
        expense_ids: List[str],
        posted_by: int
    ) -> dict:
        """
        Post multiple charges to ledger in batch
        
        Args:
            expense_ids: List of expense IDs to post
            posted_by: User performing the posting
        
        Returns:
            Dictionary with success/failure counts and details
        """
        results = {
            "total_requested": len(expense_ids),
            "successful": 0,
            "failed": 0,
            "results": [],
            "errors": []
        }
        
        for expense_id in expense_ids:
            try:
                charge = self.post_charge_to_ledger(expense_id, posted_by)
                results["successful"] += 1
                results["results"].append({
                    "expense_id": expense_id,
                    "status": "SUCCESS",
                    "ledger_posting_id": charge.ledger_posting_id,
                    "ledger_balance_id": charge.ledger_balance_id,
                    "posted_at": charge.posted_at.isoformat() if charge.posted_at else None,
                    "message": "Successfully posted to ledger"
                })
            except Exception as e:
                results["failed"] += 1
                results["errors"].append({
                    "expense_id": expense_id,
                    "error": str(e)
                })
                logger.error(f"Failed to post charge {expense_id}: {str(e)}")
        
        logger.info(
            f"Batch posting completed: {results['successful']} succeeded, "
            f"{results['failed']} failed out of {results['total_requested']} total"
        )
        
        return results
    
    def void_charge(
        self,
        expense_id: str,
        void_reason: str,
        voided_by: int
    ) -> MiscellaneousCharge:
        """
        Void a miscellaneous charge
        
        If already posted to ledger, creates a reversal posting.
        
        Args:
            expense_id: Expense ID to void
            void_reason: Reason for voiding
            voided_by: User performing the void
        
        Returns:
            Voided charge
        
        Raises:
            MiscChargeNotFoundException: If charge not found
            MiscChargeAlreadyVoidedException: If already voided
        """
        charge = self.repository.get_by_id_or_raise(expense_id)
        
        # Check if already voided
        if charge.status == MiscChargeStatus.VOIDED:
            raise MiscChargeAlreadyVoidedException(expense_id)
        
        # If posted to ledger, create reversal
        if charge.posted_to_ledger == 1 and charge.ledger_posting_id:
            try:
                # Void the ledger posting (creates reversal)
                original, reversal_posting = self.ledger_service.void_posting(
                    posting_id=charge.ledger_posting_id,
                    user_id=voided_by,
                    reason=f"Miscellaneous charge voided: {void_reason}"
                )
                
                charge.voided_ledger_posting_id = reversal_posting.posting_id
                
                logger.info(
                    f"Created ledger reversal {reversal_posting.posting_id} "
                    f"for voided charge {expense_id}"
                )
                
            except Exception as e:
                logger.error(f"Failed to create ledger reversal: {str(e)}")
                raise MiscChargePostingException(
                    expense_id,
                    f"Failed to create ledger reversal: {str(e)}"
                )
        
        # Update charge status
        charge.status = MiscChargeStatus.VOIDED
        charge.voided_at = datetime.now(timezone.utc)
        charge.voided_by = voided_by
        charge.voided_reason = void_reason
        charge.updated_by = voided_by
        charge.updated_on = datetime.now(timezone.utc)

        self.repository.update(charge)
        self.db.commit()
        
        logger.info(f"Voided miscellaneous charge {expense_id}")
        
        return charge
    
    def find_unposted_charges(
        self,
        driver_id: Optional[int] = None,
        lease_id: Optional[int] = None,
        period_start: Optional[datetime] = None,
        period_end: Optional[datetime] = None
    ) -> List[MiscellaneousCharge]:
        """
        Find charges that are pending and not yet posted to ledger
        
        Args:
            driver_id: Optional driver filter
            lease_id: Optional lease filter
            period_start: Optional period start filter
            period_end: Optional period end filter
        
        Returns:
            List of unposted charges
        """
        return self.repository.find_unposted_charges(
            driver_id=driver_id,
            lease_id=lease_id,
            period_start=period_start,
            period_end=period_end
        )
    
    def get_statistics(
        self,
        driver_id: Optional[int] = None,
        lease_id: Optional[int] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None
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
        return self.repository.get_statistics(
            driver_id=driver_id,
            lease_id=lease_id,
            date_from=date_from,
            date_to=date_to
        )