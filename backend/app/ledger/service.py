"""
app/ledger/service.py

Service layer containing all business logic
Implements payments hierarchy, double-entry accounting, and validation rules
"""

import json
from datetime import datetime, timezone
from decimal import Decimal
from typing import List, Optional, Tuple

from sqlalchemy.orm import Session
from sqlalchemy import func, extract

from app.ledger.models import (
    LedgerPosting, LedgerBalance, PaymentAllocation, PostingType,
    PostingCategory, PostingStatus, BalanceStatus, PaymentReferenceType
)
from app.ledger.repository import (
    LedgerPostingRepository, LedgerBalanceRepository,
    PaymentAllocationRepository
)
from app.ledger.exceptions import *
from app.ledger.schemas import *


# === Ledger Service - Core Business Logic ===

class LedgerService:
    """
    Service layer for ledger operations
    Implements all business rules and validations
    """

    # === Payment hierarchy order (non-negotiable) ===
    PAYMENT_HIERARCHY = [
        PostingCategory.TAXES,
        PostingCategory.EZPASS,
        PostingCategory.LEASE,
        PostingCategory.PVB,
        PostingCategory.TLC,
        PostingCategory.REPAIRS,
        PostingCategory.LOANS,
        PostingCategory.MISC,
    ]
    
    def __init__(self, db: Session):
        self.db = db
        self.posting_repo = LedgerPostingRepository(db)
        self.balance_repo = LedgerBalanceRepository(db)
        self.allocation_repo = PaymentAllocationRepository(db)

    # === Payment Operations ===
    def create_posting(
        self,
        driver_id: int,
        lease_id: int,
        posting_type: PostingType,
        category: PostingCategory,
        amount: Decimal,
        source_type: str,
        source_id: str,
        payment_period_start: datetime,
        payment_period_end: datetime,
        vehicle_id: Optional[int] = None,
        medallion_id: Optional[int] = None,
        description: Optional[str] = None,
        notes: Optional[str] = None,
        auto_post: bool = True
    ) -> LedgerPosting:
        """
        Create a new ledger posting
        
        Args:
            driver_id: Driver ID
            lease_id: Lease ID  
            posting_type: DEBIT or CREDIT
            category: Financial category
            amount: Transaction amount (must be positive)
            source_type: Source system (e.g., CURB_TRIP, EZPASS_TRANSACTION)
            source_id: Source record ID
            payment_period_start: Start of payment week (Sunday)
            payment_period_end: End of payment week (Saturday)
            vehicle_id: Optional vehicle ID
            medallion_id: Optional medallion ID
            description: Optional description
            notes: Optional notes
            auto_post: Automatically set status to POSTED
            
        Returns:
            Created LedgerPosting
            
        Raises:
            InvalidPostingAmountException: If amount <= 0
            InvalidPostingPeriodException: If period is invalid
            DuplicatePostingException: If posting already exists
            DriverNotFoundException: If driver doesn't exist
            LeaseNotFoundException: If lease doesn't exist
            LeaseNotActiveException: If lease is not active
        """
        # Validate amount
        if amount <= 0:
            raise InvalidPostingAmountException(float(amount))
        
        # Validate payment period
        self._validate_payment_period(payment_period_start, payment_period_end)
        
        # Check for duplicate posting
        if self.posting_repo.exists_by_source(source_type, source_id):
            raise DuplicatePostingException(source_type, source_id)
        
        # Validate entities exist
        self._validate_driver_exists(driver_id)
        self._validate_lease_exists_and_active(lease_id)
        
        # Generate posting ID
        posting_id = self._generate_posting_id()
        
        # Create posting
        posting = LedgerPosting(
            posting_id=posting_id,
            driver_id=driver_id,
            lease_id=lease_id,
            vehicle_id=vehicle_id,
            medallion_id=medallion_id,
            posting_type=posting_type,
            category=category,
            amount=amount,
            source_type=source_type,
            source_id=source_id,
            payment_period_start=payment_period_start,
            payment_period_end=payment_period_end,
            status=PostingStatus.POSTED if auto_post else PostingStatus.PENDING,
            posted_at=datetime.utcnow() if auto_post else None,
            description=description,
            notes=notes
        )
        
        return self.posting_repo.create(posting)
    
    def void_posting(
        self,
        posting_id: str,
        reason: str,
        user_id: int
    ) -> Tuple[LedgerPosting, LedgerPosting]:
        """
        Void a posting by creating a reversal entry
        
        Args:
            posting_id: Posting ID to void
            reason: Reason for voiding
            user_id: User performing the void
            
        Returns:
            Tuple of (original_posting, reversal_posting)
            
        Raises:
            PostingNotFoundException: If posting doesn't exist
            PostingAlreadyVoidedException: If already voided
        """
        # Get original posting
        original = self.posting_repo.get_by_id_or_raise(posting_id)
        
        # Check if already voided
        if original.status == PostingStatus.VOIDED:
            raise PostingAlreadyVoidedException(posting_id)
        
        # Create reversal posting
        reversal_posting_id = self._generate_posting_id()
        reversal = LedgerPosting(
            posting_id=reversal_posting_id,
            driver_id=original.driver_id,
            lease_id=original.lease_id,
            vehicle_id=original.vehicle_id,
            medallion_id=original.medallion_id,
            # Reverse the posting type
            posting_type=PostingType.CREDIT if original.posting_type == PostingType.DEBIT else PostingType.DEBIT,
            category=original.category,
            amount=original.amount,
            source_type=PaymentReferenceType.VOID_REVERSAL.value,
            source_id=f"VOID_{original.posting_id}",
            payment_period_start=original.payment_period_start,
            payment_period_end=original.payment_period_end,
            status=PostingStatus.POSTED,
            posted_at=datetime.utcnow(),
            description=f"Reversal of {original.posting_id}: {reason}",
            notes=original.notes
        )
        
        # Update original posting
        original.status = PostingStatus.VOIDED
        original.voided_by_posting_id = reversal_posting_id
        original.voided_at = datetime.utcnow()
        original.void_reason = reason
        
        # Save both
        reversal = self.posting_repo.create(reversal)
        original = self.posting_repo.update(original)
        
        return original, reversal
    
    # === Obligation Operations ===
    def create_obligation(
        self,
        driver_id: int,
        lease_id: int,
        category: PostingCategory,
        amount: Decimal,
        reference_type: str,
        reference_id: str,
        payment_period_start: datetime,
        payment_period_end: datetime,
        due_date: Optional[datetime] = None,
        description: Optional[str] = None
    ) -> Tuple[LedgerPosting, LedgerBalance]:
        """
        Create an obligation (DEBIT posting + balance record)
        
        This is the primary way to record driver obligations.
        Creates both a posting and a balance in a single transaction.
        
        Args:
            driver_id: Driver ID
            lease_id: Lease ID
            category: Financial category
            amount: Obligation amount
            reference_type: Type of obligation (e.g., EZPASS_TRANSACTION)
            reference_id: Reference to source record
            payment_period_start: Payment week start
            payment_period_end: Payment week end
            due_date: When payment is due
            description: Optional description
            
        Returns:
            Tuple of (LedgerPosting, LedgerBalance)
        """
        # === Create DEBIT posting ===
        posting = self.create_posting(
            driver_id=driver_id,
            lease_id=lease_id,
            posting_type=PostingType.DEBIT,
            category=category,
            amount=amount,
            source_type=reference_type,
            source_id=reference_id,
            payment_period_start=payment_period_start,
            payment_period_end=payment_period_end,
            description=description
        )

        # === Generate balance ID ===
        balance_id = self._generate_balance_id()

        # === Create balance record ===
        balance = LedgerBalance(
            balance_id=balance_id,
            driver_id=driver_id,
            lease_id=lease_id,
            category=category,
            reference_type=reference_type,
            reference_id=reference_id,
            original_amount=amount,
            prior_balance=Decimal('0.00'),
            current_amount=amount,
            payment_applied=Decimal('0.00'),
            outstanding_balance=amount,
            payment_period_start=payment_period_start,
            payment_period_end=payment_period_end,
            due_date=due_date,
            status=BalanceStatus.OPEN,
            description=description,
            payment_reference=json.dumps([])  # Initialize empty array
        )

        balance = self.balance_repo.create(balance)

        return posting, balance
    
    # === Payment Application - Single Balance ===
    def apply_payment_to_balance(
        self,
        balance_id: str,
        payment_amount: Decimal,
        payment_posting_id: str,
        allocation_type: PaymentReferenceType,
        notes: Optional[str] = None
    ) -> Tuple[PaymentAllocation, LedgerBalance]:
        """
        Apply payment to a specific balance
        
        Args:
            balance_id: Balance ID to apply payment to
            payment_amount: Amount to apply
            payment_posting_id: Payment posting ID
            allocation_type: Type of allocation
            notes: Optional notes
            
        Returns:
            Tuple of (PaymentAllocation, updated LedgerBalance)
            
        Raises:
            BalanceNotFoundException: If balance doesn't exist
            InsufficientBalanceException: If payment exceeds outstanding
            BalanceAlreadyClosedException: If balance is closed
        """
        # === Get balance ===
        balance = self.balance_repo.get_by_id_or_raise(balance_id)

        # === Validate balance is open ===
        if balance.status == BalanceStatus.CLOSED:
            raise BalanceAlreadyClosedException(balance_id)
        
        # === Validate payment amount ===
        if payment_amount > balance.outstanding_balance:
            raise InsufficientBalanceException(
                balance_id, float(balance.outstanding_balance),
                float(payment_amount)
            )
        
        # === Generate allocation ID ===
        allocation_id = self._generate_allocation_id()

        # === Create allocation record ===
        allocation = PaymentAllocation(
            allocation_id=allocation_id,
            balance_id=balance_id,
            payment_posting_id=payment_posting_id,
            amount_allocated=payment_amount,
            allocation_type=allocation_type,
            allocation_date=datetime.utcnow(),
            notes=notes
        )

        allocation = self.allocation_repo.create(allocation)

        # === Update balance ===
        balance.payment_applied += payment_amount
        balance.outstanding_balance -= payment_amount

        # === Update payment reference JSON ===
        payment_refs = json.loads(balance.payment_reference) if balance.payment_reference else []
        payment_refs.append({
            "allocation_id": allocation_id,
            "amount": float(payment_amount),
            "date": datetime.now(timezone.utc).isoformat()
        })
        balance.payment_reference = json.dumps(payment_refs)

        # === Close balance if fully paid ===
        if balance.outstanding_balance == Decimal("0.00"):
            balance.status = BalanceStatus.CLOSED

        balance = self.balance_repo.update(balance)

        return allocation, balance
    
    # === Payment application - Hierarchy ===
    def apply_payment_with_hierarchy(
        self,
        driver_id: int,
        lease_id: int,
        payment_amount: Decimal,
        payment_period_start: datetime,
        payment_period_end: datetime,
        source_type: str,
        source_id: str,
        allocation_type: PaymentReferenceType = PaymentReferenceType.DTR_ALLOCATION,
        notes: Optional[str] = None
    ) -> PaymentApplicationResult:
        """
        Apply payment following strict payment hierarchy
        
        This is the core payment allocation algorithm.
        
        Payment Hierarchy (non-negotiable):
        1. TAXES
        2. EZPASS
        3. LEASE
        4. PVB
        5. TLC
        6. REPAIRS
        7. LOANS
        8. MISC
        
        Within each category: FIFO (oldest due date first)
        
        Args:
            driver_id: Driver ID
            lease_id: Lease ID
            payment_amount: Total payment to allocate
            payment_period_start: Payment week start
            payment_period_end: Payment week end
            source_type: Source of payment (e.g., CURB_EARNINGS)
            source_id: Source record ID
            allocation_type: Type of allocation
            notes: Optional notes
            
        Returns:
            PaymentApplicationResult with allocations and updated balances
        """
        # === Create CREDIT posting for the payment ===
        payment_posting = self.create_posting(
            driver_id=driver_id,
            lease_id=lease_id,
            posting_type=PostingType.CREDIT,
            category=PostingCategory.EARNINGS,  # Payment source category
            amount=payment_amount,
            source_type=source_type,
            source_id=source_id,
            payment_period_start=payment_period_start,
            payment_period_end=payment_period_end,
            description=f"Payment allocation via {allocation_type.value}",
            notes=notes
        )

        remaining_payment = payment_amount
        allocations: List[PaymentAllocation] = []
        balances_updated: List[LedgerBalance] = []

        # === Apply payment following hierarchy ===
        for category in self.PAYMENT_HIERARCHY:
            if remaining_payment <= 0:
                break

            # === Get open balances for this category (FIFO by due date) ===
            open_balances = self.balance_repo.find_open_balances(
                driver_id=driver_id,
                lease_id=lease_id,
                category=category
            )

            for balance in open_balances:
                if remaining_payment <= 0:
                    break

                # === Determine amount to apply (min of remaining payment and outstanding balances) ===
                amount_to_apply = min(remaining_payment, balance.outstanding_balance)

                # === Apply payment to this balance ===
                allocation, updated_balance = self.apply_payment_to_balance(
                    balance_id=balance.balance_id,
                    payment_amount=amount_to_apply,
                    payment_posting_id=payment_posting.posting_id,
                    allocation_type=allocation_type,
                    notes=f"Hierarchy allocation: {category.value}"
                )

                allocations.append(allocation)
                balances_updated.append(updated_balance)
                remaining_payment -= amount_to_apply

            # === Create result ===
            result = PaymentApplicationResult(
                total_payment=payment_amount,
                total_allocated=payment_amount - remaining_payment,
                remaining_unallocated=remaining_payment,
                allocations=[AllocationResponse.model_validate(a) for a in allocations],
                balances_updated=[BalanceResponse.model_validate(b) for b in balances_updated]
            )

            return result
        
    # === Query operations ===
    def get_driver_balance(self, driver_id: int, lease_id: int) -> dict:
        """
        Get real-time balance summary for driver/lease
        """
        summary = self.balance_repo.get_balance_summary(driver_id, lease_id)

        total_outstanding = sum(s["outstanding_balance"] for s in summary)

        return {
            "driver_id": driver_id,
            "lease_id": lease_id,
            "total_outstanding": total_outstanding,
            "by_category": summary,
            "generated_at": datetime.now(timezone.utc).isoformat()
        }

    def get_postings(self, filters: PostingFilters) -> List[LedgerPosting]:
        """Query postings with filters"""
        return self.posting_repo.find_all(
            driver_id=filters.driver_id,
            lease_id=filters.lease_id,
            category=filters.category,
            status=filters.status,
            posting_type=filters.posting_type,
            period_start=filters.period_start,
            period_end=filters.period_end,
            limit=filters.limit,
            offset=filters.offset
        )  

    def get_balances(self, filters: BalanceFilters) -> List[LedgerBalance]:
        """Query balances with filters"""
        return self.balance_repo.find_all(
            driver_id=filters.driver_id,
            lease_id=filters.lease_id,
            category=filters.category,
            status=filters.status,
            due_date_from=filters.due_date_from,
            due_date_to=filters.due_date_to,
            limit=filters.limit,
            offset=filters.offset
        )  
    
    # === Validation Helpers ===
    def _validate_payment_period(self, start: datetime, end: datetime):
        """Validate payment period is Sunday to Saturday"""
        if start.weekday() != 6:  # Sunday
            raise InvalidPostingPeriodException("Payment period must start on Sunday")
        if end.weekday() != 5:  # Saturday
            raise InvalidPostingPeriodException("Payment period must end on Saturday")
        if (end - start).days != 6:
            raise InvalidPostingPeriodException("Payment period must be exactly 7 days")
    
    def _validate_driver_exists(self, driver_id: int):
        """Validate driver exists"""
        # Import here to avoid circular dependency
        from app.drivers.models import Driver
        driver = self.db.query(Driver).filter(Driver.id == driver_id).first()
        if not driver:
            raise DriverNotFoundException(driver_id)
    
    def _validate_lease_exists_and_active(self, lease_id: int):
        """Validate lease exists and is active"""
        from app.leases.models import Lease
        lease = self.db.query(Lease).filter(Lease.id == lease_id).first()
        if not lease:
            raise LeaseNotFoundException(lease_id)
        # Add active check based on your Lease model's status field
        if lease.lease_status != 'Active':
            raise LeaseNotActiveException(lease_id)
        
    # === ID Generation Helpers ===
    def _generate_posting_id(self) -> str:
        """Generate unique posting ID: LP-YYYY-NNNNNN"""
        year = datetime.now(timezone.utc).year
        # Get count of postings this year
        count = self.db.query(func.count(LedgerPosting.id)).filter(
            extract('year', LedgerPosting.created_at) == year
        ).scalar() or 0
        return f"LP-{year}-{count + 1:06d}"
    
    def _generate_balance_id(self) -> str:
        """Generate unique balance ID: LB-YYYY-NNNNNN"""
        year = datetime.now(timezone.utc).year
        count = self.db.query(func.count(LedgerBalance.id)).filter(
            extract('year', LedgerBalance.created_at) == year
        ).scalar() or 0
        return f"LB-{year}-{count + 1:06d}"
    
    def _generate_allocation_id(self) -> str:
        """Generate unique allocation ID: PA-YYYY-NNNNNN"""
        year = datetime.now(timezone.utc).year
        count = self.db.query(func.count(PaymentAllocation.id)).filter(
            extract('year', PaymentAllocation.created_at) == year
        ).scalar() or 0
        return f"PA-{year}-{count + 1:06d}"