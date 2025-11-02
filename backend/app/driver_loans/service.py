# app/driver_loans/service.py

from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Optional, List, Tuple
from sqlalchemy.orm import Session

from app.driver_loans.models import DriverLoan, LoanSchedule, LoanStatus, InstallmentStatus
from app.driver_loans.repository import DriverLoanRepository, LoanScheduleRepository
from app.driver_loans.schemas import PostInstallmentsResponse
from app.ledger.service import LedgerService
from app.ledger.models import PostingCategory
from app.utils.logger import get_logger

logger = get_logger(__name__)


class DriverLoanService:
    """Service for managing driver loans with interest and installments"""
    
    # Loan Repayment Matrix - determines weekly principal based on loan amount
    REPAYMENT_MATRIX = {
        (0, 200): None,  # Paid in full (single installment)
        (201, 500): Decimal('100.00'),
        (501, 1000): Decimal('200.00'),
        (1001, 3000): Decimal('250.00'),
        (3001, float('inf')): Decimal('300.00')
    }
    
    def __init__(self, db: Session):
        self.db = db
        self.loan_repo = DriverLoanRepository(db)
        self.schedule_repo = LoanScheduleRepository(db)
        self.ledger_service = LedgerService(db)
    
    def create_loan(
        self,
        driver_id: int,
        lease_id: int,
        loan_amount: Decimal,
        interest_rate: Decimal,
        start_week: date,
        purpose: Optional[str] = None,
        notes: Optional[str] = None,
        created_by: int = None
    ) -> DriverLoan:
        """
        Create a new driver loan with automatic schedule generation
        
        Process:
        1. Validate inputs
        2. Create loan master record
        3. Generate installment schedule using repayment matrix
        4. Calculate interest for each installment
        5. Save loan and installments
        
        Args:
            driver_id: Driver ID
            lease_id: Lease ID
            loan_amount: Principal amount
            interest_rate: Annual percentage rate
            start_week: Sunday when payments start
            purpose: Reason for loan
            notes: Additional notes
            created_by: User creating the loan
            
        Returns:
            Created DriverLoan with installments
        """
        # Validate inputs
        self._validate_loan_inputs(driver_id, lease_id, loan_amount, interest_rate, start_week)
        
        # Generate loan ID
        loan_year = start_week.year
        loan_id = self.loan_repo.generate_loan_id(loan_year)
        
        # Create loan master record
        loan = DriverLoan(
            loan_id=loan_id,
            loan_number=loan_id,  # Display number same as loan_id
            driver_id=driver_id,
            lease_id=lease_id,
            loan_amount=loan_amount,
            interest_rate=interest_rate,
            purpose=purpose,
            notes=notes,
            loan_date=date.today(),
            start_week=start_week,
            status=LoanStatus.ACTIVE,
            outstanding_balance=loan_amount,
            total_principal_paid=Decimal('0.00'),
            total_interest_paid=Decimal('0.00'),
            created_by=created_by
        )
        
        # Save loan
        loan = self.loan_repo.create(loan)
        
        # Generate installment schedule
        installments = self._generate_installment_schedule(loan)
        
        # Save installments
        self.schedule_repo.create_bulk(installments)
        
        # Calculate end week from last installment
        if installments:
            loan.end_week = installments[-1].week_end
            self.loan_repo.update(loan)
        
        logger.info(
            f"Created loan {loan_id} for driver {driver_id}: "
            f"${loan_amount} @ {interest_rate}% over {len(installments)} installments"
        )
        
        return loan
    
    def _validate_loan_inputs(
        self,
        driver_id: int,
        lease_id: int,
        loan_amount: Decimal,
        interest_rate: Decimal,
        start_week: date
    ) -> None:
        """Validate loan creation inputs"""
        if loan_amount <= 0:
            raise ValueError("Loan amount must be greater than 0")
        
        if interest_rate < 0 or interest_rate > 100:
            raise ValueError("Interest rate must be between 0 and 100")
        
        if start_week.weekday() != 6:  # 6 = Sunday
            raise ValueError("Start week must be a Sunday")
        
        # Validate driver exists
        from app.drivers.models import Driver
        driver = self.db.query(Driver).filter(Driver.id == driver_id).first()
        if not driver:
            raise ValueError(f"Driver with ID {driver_id} not found")
        
        # Validate lease exists
        from app.leases.models import Lease
        lease = self.db.query(Lease).filter(Lease.id == lease_id).first()
        if not lease:
            raise ValueError(f"Lease with ID {lease_id} not found")
    
    def _get_weekly_principal(self, loan_amount: Decimal) -> Decimal:
        """
        Get weekly principal amount based on loan repayment matrix
        
        Matrix:
        - $0-$200: Full amount (single installment)
        - $201-$500: $100/week
        - $501-$1,000: $200/week
        - $1,001-$3,000: $250/week
        - > $3,000: $300/week
        """
        for (min_amt, max_amt), weekly_principal in self.REPAYMENT_MATRIX.items():
            if min_amt <= loan_amount <= max_amt:
                if weekly_principal is None:
                    # Single installment for small loans
                    return loan_amount
                return weekly_principal
        
        # Default fallback (should not reach here)
        return Decimal('300.00')
    
    def _calculate_interest(
        self,
        outstanding_principal: Decimal,
        annual_rate: Decimal,
        days: int = 7
    ) -> Decimal:
        """
        Calculate simple interest
        
        Formula: Interest = Outstanding Principal × (Annual Rate / 100) × (Days / 365)
        
        Args:
            outstanding_principal: Remaining principal balance
            annual_rate: Annual percentage rate
            days: Number of days (default 7 for weekly)
            
        Returns:
            Interest amount rounded to 2 decimal places
        """
        if annual_rate == 0:
            return Decimal('0.00')
        
        interest = outstanding_principal * (annual_rate / Decimal('100')) * (Decimal(str(days)) / Decimal('365'))
        return interest.quantize(Decimal('0.01'))
    
    def _generate_installment_schedule(self, loan: DriverLoan) -> List[LoanSchedule]:
        """
        Generate complete installment schedule for a loan
        
        Process:
        1. Determine weekly principal from repayment matrix
        2. Calculate number of installments needed
        3. For each installment:
           - Calculate interest on outstanding balance
           - Create installment record
           - Reduce outstanding balance
        
        Args:
            loan: DriverLoan object
            
        Returns:
            List of LoanSchedule objects
        """
        installments = []
        
        # Get weekly principal amount
        weekly_principal = self._get_weekly_principal(loan.loan_amount)
        
        # Calculate number of installments
        num_installments = int((loan.loan_amount / weekly_principal).__ceil__())
        
        # Track outstanding balance
        outstanding_balance = loan.loan_amount
        current_week_start = loan.start_week
        
        for i in range(1, num_installments + 1):
            # Calculate week dates
            week_start = current_week_start
            week_end = week_start + timedelta(days=6)  # Saturday
            due_date = week_end  # Due on Saturday
            
            # Determine principal for this installment
            if i == num_installments:
                # Last installment: remaining balance
                principal = outstanding_balance
            else:
                principal = min(weekly_principal, outstanding_balance)
            
            # Calculate days for interest
            if i == 1:
                # First installment: calculate days from loan date to first due date
                days_accrued = (due_date - loan.loan_date).days
            else:
                days_accrued = 7  # Standard weekly period
            
            # Calculate interest on outstanding balance
            interest = self._calculate_interest(
                outstanding_balance,
                loan.interest_rate,
                days_accrued
            )
            
            # Total due for this installment
            total_due = principal + interest
            
            # Create installment record
            installment = LoanSchedule(
                installment_id=f"{loan.loan_id}-INST-{i:02d}",
                loan_id=loan.loan_id,
                installment_number=i,
                due_date=due_date,
                week_start=week_start,
                week_end=week_end,
                principal_amount=principal,
                interest_amount=interest,
                total_due=total_due,
                principal_paid=Decimal('0.00'),
                interest_paid=Decimal('0.00'),
                outstanding_balance=total_due,
                status=InstallmentStatus.SCHEDULED,
                posted_to_ledger=False
            )
            
            installments.append(installment)
            
            # Reduce outstanding balance for next iteration
            outstanding_balance -= principal
            
            # Move to next week
            current_week_start += timedelta(days=7)
        
        return installments
    
    def get_loan_by_id(self, loan_id: str, include_installments: bool = False) -> Optional[DriverLoan]:
        """Get loan by ID, optionally with installments"""
        if include_installments:
            return self.loan_repo.get_by_id_with_installments(loan_id)
        return self.loan_repo.get_by_id(loan_id)
    
    def update_loan_status(
        self,
        loan_id: str,
        new_status: LoanStatus,
        reason: Optional[str] = None,
        user_id: Optional[int] = None
    ) -> DriverLoan:
        """
        Update loan status
        
        Handles:
        - ACTIVE -> ON_HOLD
        - ON_HOLD -> ACTIVE
        - ACTIVE -> CLOSED (when fully paid)
        - ACTIVE/DRAFT -> CANCELLED (before any postings)
        """
        loan = self.loan_repo.get_by_id(loan_id)
        if not loan:
            raise ValueError(f"Loan {loan_id} not found")
        
        old_status = loan.status
        
        # Validate status transition
        self._validate_status_transition(loan, new_status)
        
        # Update status
        loan.status = new_status
        
        # Handle status-specific logic
        if new_status == LoanStatus.CLOSED:
            loan.closed_on = date.today()
            loan.closure_reason = reason or "Loan fully paid"
        
        if new_status == LoanStatus.CANCELLED:
            loan.closure_reason = reason or "Loan cancelled"
        
        self.loan_repo.update(loan)
        
        logger.info(
            f"Updated loan {loan_id} status: {old_status.value} -> {new_status.value}"
            + (f" (Reason: {reason})" if reason else "")
        )
        
        return loan
    
    def _validate_status_transition(self, loan: DriverLoan, new_status: LoanStatus) -> None:
        """Validate status transition is allowed"""
        current_status = loan.status
        
        # Define allowed transitions
        allowed_transitions = {
            LoanStatus.DRAFT: [LoanStatus.ACTIVE, LoanStatus.CANCELLED],
            LoanStatus.ACTIVE: [LoanStatus.ON_HOLD, LoanStatus.CLOSED, LoanStatus.CANCELLED],
            LoanStatus.ON_HOLD: [LoanStatus.ACTIVE, LoanStatus.CANCELLED],
            LoanStatus.CLOSED: [],  # Cannot change from CLOSED
            LoanStatus.CANCELLED: []  # Cannot change from CANCELLED
        }
        
        if new_status not in allowed_transitions.get(current_status, []):
            raise ValueError(
                f"Cannot transition from {current_status.value} to {new_status.value}"
            )
        
        # Additional validation for CANCELLED
        if new_status == LoanStatus.CANCELLED:
            # Check if any installments have been posted
            posted_installments = self.schedule_repo.db.query(LoanSchedule).filter(
                LoanSchedule.loan_id == loan.loan_id,
                LoanSchedule.posted_to_ledger == True
            ).count()
            
            if posted_installments > 0:
                raise ValueError(
                    "Cannot cancel loan with posted installments. "
                    "Use ON_HOLD status instead."
                )
            
    def post_weekly_installments(
        self,
        payment_period_start: Optional[date] = None,
        payment_period_end: Optional[date] = None,
        loan_id: Optional[str] = None,
        dry_run: bool = False
    ) -> PostInstallmentsResponse:
        """
        Post due loan installments to ledger
        
        This method is called:
        1. By scheduled job every Sunday 05:00 AM
        2. Manually via API for specific loans or periods
        
        Process:
        1. Find installments that are due but not posted
        2. For each installment:
           - Create ledger obligation (DEBIT + Balance)
           - Update installment status to POSTED
           - Link to ledger balance
        3. Update loan payment tracking
        
        Args:
            payment_period_start: Start of payment period (defaults to current week Sunday)
            payment_period_end: End of payment period (defaults to current week Saturday)
            loan_id: Optional specific loan to post
            dry_run: Simulate posting without committing
            
        Returns:
            PostInstallmentsResponse with results
        """
        try:
            # Default to current week if not specified
            if payment_period_start is None or payment_period_end is None:
                today = date.today()
                days_since_sunday = (today.weekday() + 1) % 7
                payment_period_start = today - timedelta(days=days_since_sunday)
                payment_period_end = payment_period_start + timedelta(days=6)
            
            logger.info(
                f"Posting loan installments for period {payment_period_start} to {payment_period_end}"
                + (f" (loan_id: {loan_id})" if loan_id else "")
                + (" [DRY RUN]" if dry_run else "")
            )
            
            # Find installments to post
            installments = self._find_installments_to_post(
                payment_period_start,
                payment_period_end,
                loan_id
            )
            
            if not installments:
                return PostInstallmentsResponse(
                    success=True,
                    message="No installments to post for the specified period",
                    installments_processed=0,
                    installments_posted=0,
                    total_amount_posted=Decimal('0.00')
                )
            
            # Post each installment
            posted_count = 0
            total_amount = Decimal('0.00')
            errors = []
            
            for installment in installments:
                try:
                    if not dry_run:
                        self._post_installment_to_ledger(installment)
                        posted_count += 1
                        total_amount += installment.total_due
                    else:
                        # Dry run: just count
                        posted_count += 1
                        total_amount += installment.total_due
                        
                except Exception as e:
                    error_msg = f"Failed to post installment {installment.installment_id}: {str(e)}"
                    logger.error(error_msg)
                    errors.append(error_msg)
            
            # Commit transaction if not dry run
            if not dry_run:
                self.db.commit()
            else:
                self.db.rollback()
            
            return PostInstallmentsResponse(
                success=len(errors) == 0,
                message=f"Posted {posted_count}/{len(installments)} installments" +
                       (" (DRY RUN)" if dry_run else ""),
                installments_processed=len(installments),
                installments_posted=posted_count,
                total_amount_posted=total_amount,
                errors=errors if errors else None
            )
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error posting installments: {str(e)}")
            raise
    
    def _find_installments_to_post(
        self,
        period_start: date,
        period_end: date,
        loan_id: Optional[str] = None
    ) -> List[LoanSchedule]:
        """Find installments that should be posted for the period"""
        query = self.db.query(LoanSchedule).join(
            DriverLoan, LoanSchedule.loan_id == DriverLoan.loan_id
        )
        
        # Only post active loans
        query = query.filter(DriverLoan.status == LoanStatus.ACTIVE)
        
        # Not already posted
        query = query.filter(LoanSchedule.posted_to_ledger == False)
        
        # Status should be DUE or SCHEDULED
        query = query.filter(LoanSchedule.status.in_([
            InstallmentStatus.SCHEDULED,
            InstallmentStatus.DUE
        ]))
        
        # Due date within or before the period
        query = query.filter(LoanSchedule.due_date <= period_end)
        
        # Payment period matches
        query = query.filter(
            LoanSchedule.week_start >= period_start,
            LoanSchedule.week_end <= period_end
        )
        
        # Optional: specific loan
        if loan_id:
            query = query.filter(LoanSchedule.loan_id == loan_id)
        
        return query.order_by(LoanSchedule.due_date).all()
    
    def _post_installment_to_ledger(self, installment: LoanSchedule) -> None:
        """
        Post a single installment to the ledger
        
        Creates:
        1. DEBIT posting for the total amount due
        2. Ledger balance record
        
        Links:
        - installment.ledger_balance_id
        - installment.posted_to_ledger = True
        - installment.status = POSTED
        """
        # Get loan and driver/lease info
        loan = self.loan_repo.get_by_id(installment.loan_id)
        if not loan:
            raise ValueError(f"Loan {installment.loan_id} not found")
        
        # Create ledger obligation
        posting, balance = self.ledger_service.create_obligation(
            driver_id=loan.driver_id,
            lease_id=loan.lease_id,
            category=PostingCategory.LOANS,
            amount=installment.total_due,
            reference_type="LOAN_INSTALLMENT",
            reference_id=installment.installment_id,
            payment_period_start=datetime.combine(installment.week_start, datetime.min.time()),
            payment_period_end=datetime.combine(installment.week_end, datetime.max.time()),
            due_date=datetime.combine(installment.due_date, datetime.max.time()),
            description=f"Loan installment {installment.installment_number} - {loan.loan_id}"
        )
        
        # Update installment
        installment.ledger_balance_id = balance.balance_id
        installment.posted_to_ledger = True
        installment.posted_on = datetime.utcnow()
        installment.status = InstallmentStatus.POSTED
        
        self.schedule_repo.update(installment)
        
        logger.info(
            f"Posted installment {installment.installment_id} to ledger: "
            f"Balance ID {balance.balance_id}, Amount ${installment.total_due}"
        )
    
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
        """Find loans with filters"""
        return self.loan_repo.find_loans(
            driver_id=driver_id,
            lease_id=lease_id,
            status=status,
            date_from=date_from,
            date_to=date_to,
            page=page,
            page_size=page_size,
            sort_by=sort_by,
            sort_order=sort_order
        )
    
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
        Find unposted loan installments with comprehensive filters
        
        Supports filtering by:
        - loan_id: Specific loan
        - driver_id: All loans for a driver
        - lease_id: All loans for a lease
        - medallion_id: All loans for medallion (via lease)
        - vehicle_id: All loans for vehicle (via lease)
        - period_start/period_end: Payment period range
        - status: Installment status
        
        Can combine any or all filters
        """
        return self.schedule_repo.find_unposted_installments(
            loan_id=loan_id,
            driver_id=driver_id,
            lease_id=lease_id,
            medallion_id=medallion_id,
            vehicle_id=vehicle_id,
            period_start=period_start,
            period_end=period_end,
            status=status,
            page=page,
            page_size=page_size,
            sort_by=sort_by,
            sort_order=sort_order
        )
    
    def get_loan_statistics(
        self,
        driver_id: Optional[int] = None,
        lease_id: Optional[int] = None,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None
    ) -> dict:
        """Get loan statistics"""
        return self.loan_repo.get_statistics(
            driver_id=driver_id,
            lease_id=lease_id,
            date_from=date_from,
            date_to=date_to
        )
    
    def update_loan_payment_tracking(self, loan_id: str) -> None:
        """
        Update loan-level payment tracking from installments
        
        Recalculates:
        - total_principal_paid
        - total_interest_paid
        - outstanding_balance
        - status (CLOSED if fully paid)
        """
        loan = self.loan_repo.get_by_id(loan_id)
        if not loan:
            raise ValueError(f"Loan {loan_id} not found")
        
        # Get all installments
        installments = self.schedule_repo.get_by_loan_id(loan_id)
        
        # Calculate totals
        total_principal_paid = sum(inst.principal_paid for inst in installments)
        total_interest_paid = sum(inst.interest_paid for inst in installments)
        total_outstanding = sum(inst.outstanding_balance for inst in installments)
        
        # Update loan
        loan.total_principal_paid = total_principal_paid
        loan.total_interest_paid = total_interest_paid
        loan.outstanding_balance = total_outstanding
        
        # Check if loan should be closed
        if total_outstanding == Decimal('0.00') and loan.status == LoanStatus.ACTIVE:
            loan.status = LoanStatus.CLOSED
            loan.closed_on = date.today()
            loan.closure_reason = "Loan fully paid"
        
        self.loan_repo.update(loan)
        
        logger.info(
            f"Updated payment tracking for loan {loan_id}: "
            f"Principal paid: ${total_principal_paid}, "
            f"Interest paid: ${total_interest_paid}, "
            f"Outstanding: ${total_outstanding}"
        )