"""
app/interim_payments/service.py

Service layer for Interim Payments module
Implements all business logic for payment processing and allocation
"""

from datetime import datetime, timezone, date
from decimal import Decimal
from typing import List, Optional, Tuple, Dict

from sqlalchemy.orm import Session

from app.interim_payments.models import (
    InterimPayment, PaymentAllocationDetail,
    PaymentMethod, PaymentStatus, AllocationCategory
)
from app.interim_payments.repository import (
    InterimPaymentRepository, PaymentAllocationRepository
)
from app.interim_payments.schemas import (
    CreateInterimPaymentRequest, UpdateInterimPaymentRequest,
    AllocationItemCreate
)
from app.interim_payments.exceptions import *

from app.ledger.models import LedgerBalance, BalanceStatus, PostingCategory, PostingType
from app.ledger.repository import LedgerBalanceRepository
from app.ledger.service import LedgerService
from app.ledger.models import PaymentReferenceType

# Import services for entity validation
from app.drivers.services import driver_service
from app.leases.services import lease_service
from app.vehicles.services import vehicle_service
from app.medallions.services import medallion_service

from app.utils.logger import get_logger

logger = get_logger(__name__)


class InterimPaymentService:
    """
    Service layer for interim payment operations
    Implements all business rules and validations
    """

    def __init__(self, db: Session):
        self.db = db
        self.payment_repo = InterimPaymentRepository(db)
        self.allocation_repo = PaymentAllocationRepository(db)
        self.ledger_balance_repo = LedgerBalanceRepository(db)
        self.ledger_service = LedgerService(db)

    def create_payment(
        self,
        request: CreateInterimPaymentRequest,
        received_by: int
    ) -> InterimPayment:
        """
        Create a new interim payment with allocations
        Validates all business rules and creates payment + allocation records
        """
        logger.info(
            f"Creating interim payment - Driver: {request.driver_id}, "
            f"Amount: ${request.total_amount}"
        )

        # Validate entities exist
        self._validate_entities(
            driver_id=request.driver_id,
            lease_id=request.lease_id,
            vehicle_id=request.vehicle_id,
            medallion_id=request.medallion_id
        )

        # Validate allocations
        self._validate_allocations(request.allocations, request.total_amount)

        # Calculate allocation amounts
        total_allocated = sum(item.allocated_amount for item in request.allocations)
        unallocated = request.total_amount - total_allocated

        # Create payment record
        payment = InterimPayment(
            driver_id=request.driver_id,
            lease_id=request.lease_id,
            vehicle_id=request.vehicle_id,
            medallion_id=request.medallion_id,
            payment_date=request.payment_date,
            payment_method=request.payment_method,
            total_amount=request.total_amount,
            allocated_amount=total_allocated,
            unallocated_amount=unallocated,
            check_number=request.check_number,
            reference_number=request.reference_number,
            description=request.description,
            notes=request.notes,
            received_by=received_by,
            status=PaymentStatus.PENDING,
            posted_to_ledger=0
        )

        payment = self.payment_repo.create(payment)
        logger.info(f"Created payment: {payment.payment_id}")

        # Create allocation records
        allocations = []
        for idx, item in enumerate(request.allocations, 1):
            allocation = self._create_allocation_record(
                payment=payment,
                item=item,
                sequence=idx
            )
            allocations.append(allocation)

        self.allocation_repo.create_bulk(allocations)
        logger.info(f"Created {len(allocations)} allocation records")

        # Handle excess allocation to Lease if needed
        if unallocated > Decimal("0.01"):
            logger.info(f"Auto-applying ${unallocated} excess to Lease")
            self._create_lease_excess_allocation(payment, unallocated, len(allocations) + 1)

        self.db.commit()
        return self.payment_repo.get_with_allocations(payment.id)

    def update_payment(
        self,
        payment_id: int,
        request: UpdateInterimPaymentRequest
    ) -> InterimPayment:
        """Update payment details (only before posting)"""
        payment = self.payment_repo.get_by_id_or_raise(payment_id)

        # Validate can be updated
        if payment.posted_to_ledger == 1:
            raise PaymentAlreadyPostedException(payment.payment_id)

        if payment.voided_at:
            raise PaymentAlreadyVoidedException(payment.payment_id)

        # Update fields
        if request.payment_method:
            payment.payment_method = request.payment_method

        if request.check_number is not None:
            payment.check_number = request.check_number

        if request.reference_number is not None:
            payment.reference_number = request.reference_number

        if request.description is not None:
            payment.description = request.description

        if request.notes is not None:
            payment.notes = request.notes

        self.payment_repo.update(payment)
        self.db.commit()

        logger.info(f"Updated payment: {payment.payment_id}")
        return payment

    def void_payment(
        self,
        payment_id: int,
        reason: str,
        voided_by: int
    ) -> InterimPayment:
        """Void a payment"""
        payment = self.payment_repo.get_by_id_or_raise(payment_id)

        # Validate can be voided
        if payment.voided_at:
            raise PaymentAlreadyVoidedException(payment.payment_id)

        if len(reason.strip()) < 10:
            raise InvalidVoidReasonException()

        # If already posted, need to create reversal postings
        if payment.posted_to_ledger == 1:
            logger.info(f"Creating reversal postings for {payment.payment_id}")
            self._create_reversal_postings(payment, voided_by)

        # Mark as voided
        payment.voided_at = datetime.now(timezone.utc)
        payment.voided_by = voided_by
        payment.voided_reason = reason
        payment.status = PaymentStatus.VOIDED

        self.payment_repo.update(payment)
        self.db.commit()

        logger.info(f"Voided payment: {payment.payment_id}")
        return payment

    def post_payment_to_ledger(self, payment_id: int, posted_by: int) -> InterimPayment:
        """
        Post interim payment to ledger
        Creates CREDIT postings for each allocation and updates balances
        """
        payment = self.payment_repo.get_with_allocations(payment_id)

        if not payment:
            raise PaymentNotFoundException(payment_id)

        # Validate can be posted
        if payment.posted_to_ledger == 1:
            raise PaymentAlreadyPostedException(payment.payment_id)

        if payment.voided_at:
            raise PaymentAlreadyVoidedException(payment.payment_id)

        if payment.status == PaymentStatus.FAILED:
            logger.info(f"Retrying failed payment: {payment.payment_id}")

        logger.info(f"Posting payment {payment.payment_id} to ledger")

        # Post each allocation
        success_count = 0
        failed_count = 0

        for allocation in payment.allocations:
            if allocation.posted_to_ledger == 1:
                logger.info(f"Allocation {allocation.allocation_id} already posted, skipping")
                success_count += 1
                continue

            try:
                self._post_allocation_to_ledger(payment, allocation, posted_by)
                success_count += 1
            except Exception as e:
                logger.error(f"Failed to post allocation {allocation.allocation_id}: {str(e)}")
                allocation.error_message = str(e)
                self.allocation_repo.update(allocation)
                failed_count += 1

        # Update payment status
        if failed_count == 0:
            payment.status = PaymentStatus.POSTED
            payment.posted_to_ledger = 1
            payment.posted_at = datetime.now(timezone.utc)
            payment.posted_by = posted_by
            payment.error_message = None
        elif success_count == 0:
            payment.status = PaymentStatus.FAILED
            payment.error_message = "All allocations failed to post"
        else:
            payment.status = PaymentStatus.PARTIALLY_POSTED
            payment.error_message = f"{failed_count} of {len(payment.allocations)} allocations failed"

        self.payment_repo.update(payment)
        self.db.commit()

        logger.info(
            f"Posted payment {payment.payment_id}: "
            f"{success_count} success, {failed_count} failed"
        )

        return self.payment_repo.get_with_allocations(payment_id)

    def post_multiple_payments(
        self,
        payment_ids: List[int],
        posted_by: int
    ) -> Dict[str, any]:
        """Post multiple payments to ledger"""
        results = {
            'success_count': 0,
            'failed_count': 0,
            'success_payment_ids': [],
            'failed_payments': []
        }

        for payment_id in payment_ids:
            try:
                payment = self.post_payment_to_ledger(payment_id, posted_by)
                if payment.status == PaymentStatus.POSTED:
                    results['success_count'] += 1
                    results['success_payment_ids'].append(payment_id)
                else:
                    results['failed_count'] += 1
                    results['failed_payments'].append({
                        'payment_id': payment_id,
                        'error': payment.error_message or 'Partial posting failure'
                    })
            except Exception as e:
                results['failed_count'] += 1
                results['failed_payments'].append({
                    'payment_id': payment_id,
                    'error': str(e)
                })
                logger.error(f"Failed to post payment {payment_id}: {str(e)}")

        return results

    # ===== Helper Methods =====

    def _validate_entities(
        self,
        driver_id: int,
        lease_id: int,
        vehicle_id: Optional[int] = None,
        medallion_id: Optional[int] = None
    ) -> None:
        """Validate that all referenced entities exist and are active"""
        
        # Validate driver exists using driver_service
        driver = driver_service.get_drivers(self.db, driver_id=driver_id)
        if not driver:
            raise DriverNotFoundException(driver_id)

        # Validate lease exists and is active using lease_service
        lease = lease_service.get_lease(self.db, lookup_id=lease_id)
        if not lease:
            raise LeaseNotFoundException(lease_id)
        
        if lease.status != "ACTIVE":
            raise LeaseNotActiveException(lease_id)

        # Validate vehicle if provided using vehicle_service
        if vehicle_id:
            vehicle = vehicle_service.get_vehicles(self.db, vehicle_id=vehicle_id)
            if not vehicle:
                raise PaymentValidationException(f"Vehicle not found: {vehicle_id}")

        # Validate medallion if provided using medallion_service
        if medallion_id:
            medallion = medallion_service.get_medallion(self.db, medallion_id=medallion_id)
            if not medallion:
                raise PaymentValidationException(f"Medallion not found: {medallion_id}")

    def _validate_allocations(
        self,
        allocations: List[AllocationItemCreate],
        total_amount: Decimal
    ) -> None:
        """
        Validate allocation items
        - Check total does not exceed payment amount
        - Verify ledger balances exist and are open
        - Prevent duplicate allocations to same balance
        - Ensure categories are valid for interim payments
        """
        
        # Check total allocation
        total_allocated = sum(item.allocated_amount for item in allocations)
        if total_allocated > total_amount:
            raise AllocationExceedsPaymentException(total_allocated, total_amount)

        # Track balance IDs to prevent duplicates
        balance_ids = set()

        for item in allocations:
            # Check for duplicate allocations
            if item.ledger_balance_id in balance_ids:
                raise DuplicateAllocationException(item.ledger_balance_id)
            balance_ids.add(item.ledger_balance_id)

            # Validate category is allowed for interim payments
            if item.category.value == "TAXES":
                raise InvalidAllocationCategoryException(
                    "TAXES",
                    "Interim payments cannot be applied to statutory taxes"
                )

            # Validate ledger balance exists and is open (CORRECTED METHOD NAME)
            balance = self.ledger_balance_repo.get_by_id(item.ledger_balance_id)
            if not balance:
                raise LedgerBalanceNotFoundException(item.ledger_balance_id)

            if balance.status == BalanceStatus.CLOSED:
                raise LedgerBalanceClosedException(item.ledger_balance_id)

            # Validate allocation does not exceed outstanding balance
            if item.allocated_amount > balance.outstanding_balance:
                raise InsufficientBalanceException(
                    item.ledger_balance_id,
                    item.allocated_amount,
                    balance.outstanding_balance
                )

    def _create_allocation_record(
        self,
        payment: InterimPayment,
        item: AllocationItemCreate,
        sequence: int
    ) -> PaymentAllocationDetail:
        """Create an allocation detail record"""
        
        # Get current balance information (CORRECTED METHOD NAME)
        balance = self.ledger_balance_repo.get_by_id(item.ledger_balance_id)
        
        obligation_amount = balance.outstanding_balance
        remaining_balance = obligation_amount - item.allocated_amount

        allocation = PaymentAllocationDetail(
            payment_id=payment.id,
            category=item.category,
            ledger_balance_id=item.ledger_balance_id,
            reference_type=item.reference_type,
            reference_id=item.reference_id,
            obligation_amount=obligation_amount,
            allocated_amount=item.allocated_amount,
            remaining_balance=remaining_balance,
            description=item.description,
            notes=item.notes,
            allocation_sequence=sequence,
            posted_to_ledger=0
        )

        return allocation

    def _create_lease_excess_allocation(
        self,
        payment: InterimPayment,
        excess_amount: Decimal,
        sequence: int
    ) -> None:
        """
        Auto-create allocation for excess amount to Lease
        Called when unallocated funds remain after manual allocations
        """
        
        # Find open lease balance for this lease
        lease_balance = self.db.query(LedgerBalance).filter(
            LedgerBalance.lease_id == payment.lease_id,
            LedgerBalance.category == PostingCategory.LEASE,
            LedgerBalance.status == BalanceStatus.OPEN
        ).order_by(LedgerBalance.due_date.asc()).first()

        if not lease_balance:
            logger.warning(
                f"No open lease balance found for lease {payment.lease_id}. "
                "Excess will remain unallocated."
            )
            return

        obligation_amount = lease_balance.outstanding_balance
        remaining_balance = max(Decimal("0.00"), obligation_amount - excess_amount)

        allocation = PaymentAllocationDetail(
            payment_id=payment.id,
            category=AllocationCategory.LEASE,
            ledger_balance_id=lease_balance.balance_id,
            reference_type="LEASE_FEE",
            reference_id=lease_balance.reference_id,
            obligation_amount=obligation_amount,
            allocated_amount=excess_amount,
            remaining_balance=remaining_balance,
            description="Auto-applied excess payment",
            notes="System-generated allocation for unallocated funds",
            allocation_sequence=sequence,
            posted_to_ledger=0
        )

        self.allocation_repo.create(allocation)
        
        # Update payment allocated/unallocated amounts
        payment.allocated_amount += excess_amount
        payment.unallocated_amount = Decimal("0.00")
        self.payment_repo.update(payment)

        logger.info(f"Created excess allocation of ${excess_amount} to Lease")

    def _post_allocation_to_ledger(
        self,
        payment: InterimPayment,
        allocation: PaymentAllocationDetail,
        posted_by: int
    ) -> None:
        """
        Post a single allocation to the ledger
        Creates CREDIT posting and updates balance
        """
        
        # Get the ledger balance (CORRECTED METHOD NAME)
        balance = self.ledger_balance_repo.get_by_id(allocation.ledger_balance_id)
        if not balance:
            raise LedgerBalanceNotFoundException(allocation.ledger_balance_id)

        # Map allocation category to posting category
        category_map = {
            AllocationCategory.LEASE: PostingCategory.LEASE,
            AllocationCategory.REPAIRS: PostingCategory.REPAIRS,
            AllocationCategory.LOANS: PostingCategory.LOANS,
            AllocationCategory.EZPASS: PostingCategory.EZPASS,
            AllocationCategory.PVB: PostingCategory.PVB,
            AllocationCategory.TLC: PostingCategory.TLC,
            AllocationCategory.MISC: PostingCategory.MISC,
        }
        posting_category = category_map[allocation.category]

        # Create CREDIT posting (payment reduces the obligation)
        # CORRECTED: removed auto_post and added posted_by parameter
        posting = self.ledger_service.create_posting(
            driver_id=payment.driver_id,
            lease_id=payment.lease_id,
            posting_type=PostingType.CREDIT,
            category=posting_category,
            amount=allocation.allocated_amount,
            source_type="INTERIM_PAYMENT",
            source_id=payment.payment_id,
            payment_period_start=balance.payment_period_start,
            payment_period_end=balance.payment_period_end,
            vehicle_id=payment.vehicle_id,
            medallion_id=payment.medallion_id,
            description=f"Interim payment allocation - {allocation.description or 'N/A'}",
            notes=f"Allocated to balance {allocation.ledger_balance_id}"
        )

        # Apply payment to balance
        # CORRECTED: Changed method parameters to match actual signature
        payment_allocation, updated_balance = self.ledger_service.apply_payment_to_balance(
            balance_id=allocation.ledger_balance_id,
            payment_amount=allocation.allocated_amount,
            payment_posting_id=posting.posting_id,
            allocation_type=PaymentReferenceType.INTERIM_PAYMENT,
            notes=f"Interim payment: {payment.payment_id}"
        )

        # Update allocation record
        allocation.posted_to_ledger = 1
        allocation.ledger_posting_id = posting.posting_id
        allocation.posted_at = datetime.now(timezone.utc)
        allocation.error_message = None
        self.allocation_repo.update(allocation)

        logger.info(
            f"Posted allocation {allocation.allocation_id} to ledger: "
            f"${allocation.allocated_amount} to {allocation.category.value}"
        )

    def _create_reversal_postings(self, payment: InterimPayment, voided_by: int) -> None:
        """
        Create reversal postings for a voided payment that was already posted
        Reverses all ledger effects of the payment
        """
        for allocation in payment.allocations:
            if allocation.posted_to_ledger == 1 and allocation.ledger_posting_id:
                try:
                    # Void the original posting (CORRECTED: changed voided_by to user_id)
                    original, reversal = self.ledger_service.void_posting(
                        posting_id=allocation.ledger_posting_id,
                        reason=f"Payment voided: {payment.voided_reason}",
                        user_id=voided_by
                    )
                    
                    logger.info(f"Reversed posting {allocation.ledger_posting_id}")
                except Exception as e:
                    logger.error(f"Failed to reverse posting {allocation.ledger_posting_id}: {str(e)}")
                    raise PaymentPostingException(
                        payment.payment_id,
                        f"Failed to reverse allocation: {str(e)}"
                    )

    # ===== Query Methods =====

    def find_payments(
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
        """Find payments with comprehensive filtering"""
        return self.payment_repo.find_all(
            payment_id=payment_id,
            driver_id=driver_id,
            lease_id=lease_id,
            vehicle_id=vehicle_id,
            medallion_id=medallion_id,
            payment_method=payment_method,
            status=status,
            posted_to_ledger=posted_to_ledger,
            date_from=date_from,
            date_to=date_to,
            receipt_number=receipt_number,
            check_number=check_number,
            min_amount=min_amount,
            max_amount=max_amount,
            voided=voided,
            page=page,
            page_size=page_size,
            sort_by=sort_by,
            sort_order=sort_order
        )

    def find_unposted_payments(
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
        Special endpoint as requested in requirements
        """
        return self.payment_repo.find_unposted(
            repair_id=repair_id,
            driver_id=driver_id,
            lease_id=lease_id,
            vehicle_id=vehicle_id,
            medallion_id=medallion_id,
            period_start=period_start,
            period_end=period_end,
            sort_by=sort_by,
            sort_order=sort_order
        )

    def get_payment_by_id(self, payment_id: int) -> Optional[InterimPayment]:
        """Get payment by ID with all allocations"""
        return self.payment_repo.get_with_allocations(payment_id)

    def get_statistics(
        self,
        driver_id: Optional[int] = None,
        lease_id: Optional[int] = None,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None
    ) -> dict:
        """Get payment statistics"""
        return self.payment_repo.get_statistics(
            driver_id=driver_id,
            lease_id=lease_id,
            date_from=date_from,
            date_to=date_to
        )