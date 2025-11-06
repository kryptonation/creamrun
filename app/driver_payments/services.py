### app/driver_payments/services.py

"""
Service layer for Driver Payments module.
Contains all business logic for DTR generation, ACH processing, and NACHA file creation.
"""

from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from typing import List, Optional, Tuple, Dict

from sqlalchemy.orm import Session
from sqlalchemy import and_, or_

from app.driver_payments.repository import (
    DriverPaymentRepository, ACHBatchRepository, CompanyBankConfigRepository
)
from app.driver_payments.models import (
    DriverTransactionReceipt, ACHBatch, CompanyBankConfiguration,
    DTRStatus, ACHBatchStatus, PaymentType
)
from app.driver_payments.exceptions import (
    InvalidPaymentPeriodError, DTRNotFoundError, DriverPaymentError,
    DuplicatePaymentError, PaymentTypeInvalidError, MissingBankInformationError,
    InvalidRoutingNumberError, ACHBatchNotFoundError, ACHBatchReversalError,
    CompanyBankConfigError, NACHAGenerationError
)
from app.ledger.models import LedgerBalance, PostingCategory
from app.ledger.repository import LedgerRepository

from app.leases.models import Lease
from app.curb.repository import CurbRepository
from app.utils.logger import get_logger

logger = get_logger(__name__)


class DriverPaymentService:
    """Service for managing Driver Transaction Receipts and payments."""
    
    def __init__(self, db: Session):
        self.db = db
        self.dtr_repo = DriverPaymentRepository(db)
        self.ach_repo = ACHBatchRepository(db)
        self.config_repo = CompanyBankConfigRepository(db)
        self.ledger_repo = LedgerRepository(db)
        self.curb_repo = CurbRepository(db)
    
    def generate_weekly_dtrs(self, week_start_date: date) -> Dict[str, any]:
        """
        Generate DTRs for all active drivers for the specified week.
        Week must be Sunday-Saturday.
        
        This is the main DTR generation process that runs every Sunday at 5:00 AM.
        """
        logger.info(f"Starting weekly DTR generation for week starting {week_start_date}")
        
        # Validate that week_start_date is a Sunday
        if week_start_date.weekday() != 6:
            raise InvalidPaymentPeriodError("Week start date must be a Sunday")
        
        week_end_date = week_start_date + timedelta(days=6)
        
        # Get all active driver-lease combinations
        active_leases = self._get_active_leases_for_period(week_start_date, week_end_date)
        
        generated_count = 0
        skipped_count = 0
        error_count = 0
        
        for lease in active_leases:
            try:
                # Check if DTR already exists
                if self.dtr_repo.check_dtr_exists(lease.driver_id, lease.id, week_start_date):
                    logger.info(f"DTR already exists for driver {lease.driver_id}, lease {lease.id}, week {week_start_date}")
                    skipped_count += 1
                    continue
                
                # Generate DTR from ledger data
                dtr = self._generate_dtr_from_ledger(
                    lease.driver_id,
                    lease.id,
                    lease.vehicle_id,
                    lease.medallion_id,
                    week_start_date,
                    week_end_date
                )
                
                if dtr:
                    self.dtr_repo.create_dtr(dtr)
                    generated_count += 1
                    logger.info(f"Generated DTR {dtr.receipt_number} for driver {lease.driver_id}")
            
            except (InvalidPaymentPeriodError, DriverPaymentError) as e:
                error_count += 1
                logger.error(f"Error generating DTR for driver {lease.driver_id}, lease {lease.id}: {e}", exc_info=True)
        
        self.db.commit()
        
        result = {
            "week_start_date": week_start_date,
            "week_end_date": week_end_date,
            "generated_count": generated_count,
            "skipped_count": skipped_count,
            "error_count": error_count
        }
        
        logger.info(f"DTR generation complete: {result}")
        return result
    
    def _get_active_leases_for_period(self, start_date: date, end_date: date) -> List[Lease]:
        """Get all leases that were active during the specified period."""
        return (
            self.db.query(Lease)
            .filter(
                and_(
                    Lease.lease_start_date <= end_date,
                    or_(
                        Lease.lease_end_date.is_(None),
                        Lease.lease_end_date >= start_date
                    )
                )
            )
            .all()
        )
    
    def _generate_dtr_from_ledger(
        self,
        driver_id: int,
        lease_id: int,
        vehicle_id: Optional[int],
        medallion_id: Optional[int],
        week_start_date: date,
        week_end_date: date
    ) -> DriverTransactionReceipt:
        """
        Generate a DTR by querying the Centralized Ledger for the week's data.
        This is where the DTR pulls all financial information from the ledger.
        """
        receipt_number = self.dtr_repo.get_next_receipt_number()
        
        # Get CURB earnings for the week
        credit_card_earnings = self._get_curb_earnings(driver_id, lease_id, week_start_date, week_end_date)
        
        # Get all deductions from ledger by category
        deductions = self._get_deductions_from_ledger(driver_id, lease_id, week_start_date, week_end_date)
        
        # Calculate totals
        subtotal = sum(deductions.values())
        net_earnings = credit_card_earnings - subtotal
        total_due = max(Decimal("0.00"), net_earnings)
        
        # Create DTR
        dtr = DriverTransactionReceipt(
            receipt_number=receipt_number,
            week_start_date=week_start_date,
            week_end_date=week_end_date,
            generation_date=datetime.now(timezone.utc),
            driver_id=driver_id,
            lease_id=lease_id,
            vehicle_id=vehicle_id,
            medallion_id=medallion_id,
            credit_card_earnings=credit_card_earnings,
            lease_amount=deductions.get('lease', Decimal("0.00")),
            mta_fees_total=deductions.get('taxes', Decimal("0.00")),
            ezpass_tolls=deductions.get('ezpass', Decimal("0.00")),
            pvb_violations=deductions.get('pvb', Decimal("0.00")),
            tlc_tickets=deductions.get('tlc', Decimal("0.00")),
            repairs=deductions.get('repairs', Decimal("0.00")),
            driver_loans=deductions.get('loans', Decimal("0.00")),
            misc_charges=deductions.get('misc', Decimal("0.00")),
            subtotal_deductions=subtotal,
            net_earnings=net_earnings,
            total_due_to_driver=total_due,
            status=DTRStatus.GENERATED
        )
        
        # Break down MTA fees if available
        self._populate_mta_fee_breakdown(dtr, driver_id, week_start_date, week_end_date)
        
        return dtr
    
    def _get_curb_earnings(
        self, 
        driver_id: int, 
        lease_id: int, 
        week_start_date: date, 
        week_end_date: date
    ) -> Decimal:
        """
        Get total CURB credit card earnings for driver during the week.
        This queries the curb_trips table for credit card fares.
        """
        from app.curb.models import CurbTrip, CurbTripStatus
        
        # Query CURB trips directly since repository doesn't have the exact method
        trips = (
            self.db.query(CurbTrip)
            .filter(
                CurbTrip.driver_id == driver_id,
                CurbTrip.lease_id == lease_id,
                CurbTrip.status == CurbTripStatus.RECONCILED,
                CurbTrip.payment_type == 'CREDIT_CARD',
                CurbTrip.start_time >= week_start_date,
                CurbTrip.end_time <= week_end_date,
            )
            .all()
        )
        
        total = Decimal("0.00")
        for trip in trips:
            # Net earnings = fare + tips (taxes already deducted at source)
            total += (trip.fare + trip.tips)
        
        return total
    
    def _get_deductions_from_ledger(
        self,
        driver_id: int,
        lease_id: int,
        week_start_date: date,
        week_end_date: date
    ) -> Dict[str, Decimal]:
        """
        Query the Centralized Ledger for all deductions during the week.
        Returns a dict mapping category name to total amount.
        """
        deductions = {
            'lease': Decimal("0.00"),
            'taxes': Decimal("0.00"),
            'ezpass': Decimal("0.00"),
            'pvb': Decimal("0.00"),
            'tlc': Decimal("0.00"),
            'repairs': Decimal("0.00"),
            'loans': Decimal("0.00"),
            'misc': Decimal("0.00")
        }
        
        # Query ledger balances that were settled during this week
        balances = (
            self.db.query(LedgerBalance)
            .filter(
                and_(
                    LedgerBalance.driver_id == driver_id,
                    LedgerBalance.lease_id == lease_id,
                    LedgerBalance.due_date >= week_start_date,
                    LedgerBalance.due_date <= week_end_date
                )
            )
            .all()
        )
        
        for balance in balances:
            category_key = self._map_posting_category_to_dtr_field(balance.category)
            if category_key:
                # Amount paid this week = original amount - current balance
                amount_paid = balance.original_amount - balance.balance
                deductions[category_key] += amount_paid
        
        return deductions
    
    def _map_posting_category_to_dtr_field(self, category: PostingCategory) -> Optional[str]:
        """Map ledger posting category to DTR deduction field."""
        mapping = {
            PostingCategory.LEASE: 'lease',
            PostingCategory.TAXES: 'taxes',
            PostingCategory.EZPASS: 'ezpass',
            PostingCategory.PVB: 'pvb',
            PostingCategory.TLC: 'tlc',
            PostingCategory.REPAIR: 'repairs',
            PostingCategory.LOAN: 'loans',
            PostingCategory.MISC: 'misc'
        }
        return mapping.get(category)
    
    def _populate_mta_fee_breakdown(
        self,
        dtr: DriverTransactionReceipt,
        driver_id: int,
        week_start_date: date,
        week_end_date: date
    ):
        """
        Break down MTA fees into individual components.
        This queries the CURB trips for tax breakdown.
        """
        from app.curb.models import CurbTrip, CurbTripStatus
        
        # Query CURB trips directly for MTA fee breakdown
        trips = (
            self.db.query(CurbTrip)
            .filter(
                CurbTrip.driver_id == driver_id,
                CurbTrip.status == CurbTripStatus.RECONCILED,
                CurbTrip.start_time >= week_start_date,
                CurbTrip.end_time <= week_end_date,
            )
            .all()
        )
        
        mta = tif = congestion = crbt = airport = Decimal("0.00")
        
        for trip in trips:
            mta += trip.mta_surcharge or Decimal("0.00")
            tif += trip.tif_surcharge or Decimal("0.00") 
            congestion += trip.congestion_surcharge or Decimal("0.00")
            crbt += trip.cbdt_surcharge or Decimal("0.00")
            airport += trip.airport_access_fee or Decimal("0.00")
        
        dtr.mta_fee_mta = mta
        dtr.mta_fee_tif = tif
        dtr.mta_fee_congestion = congestion
        dtr.mta_fee_crbt = crbt
        dtr.mta_fee_airport = airport
    
    def get_dtr_by_id(self, dtr_id: int) -> Optional[DriverTransactionReceipt]:
        """Get DTR by ID."""
        return self.dtr_repo.get_dtr_by_id(dtr_id)
    
    def get_dtr_by_receipt_number(self, receipt_number: str) -> Optional[DriverTransactionReceipt]:
        """Get DTR by receipt number."""
        return self.dtr_repo.get_dtr_by_receipt_number(receipt_number)
    
    def list_dtrs(self, **filters) -> Tuple[List[DriverTransactionReceipt], int]:
        """List DTRs with pagination and filtering."""
        return self.dtr_repo.list_dtrs(**filters)
    
    def get_unpaid_ach_eligible_dtrs(self) -> List[DriverTransactionReceipt]:
        """Get all unpaid DTRs for drivers with ACH payment type."""
        return self.dtr_repo.get_unpaid_ach_eligible_dtrs()
    
    def create_ach_batch(
        self,
        dtr_ids: List[int],
        effective_date: Optional[date] = None,
        created_by: Optional[int] = None
    ) -> ACHBatch:
        """
        Create an ACH batch from selected DTRs.
        Validates all DTRs and marks them as paid.
        """
        logger.info(f"Creating ACH batch with {len(dtr_ids)} DTRs")
        
        # Get all DTRs
        dtrs = []
        for dtr_id in dtr_ids:
            dtr = self.dtr_repo.get_dtr_by_id(dtr_id)
            if not dtr:
                raise DTRNotFoundError(f"DTR with ID {dtr_id} not found")
            dtrs.append(dtr)
        
        # Validate all DTRs
        self._validate_dtrs_for_ach_batch(dtrs)
        
        # Calculate batch totals
        total_amount = sum(dtr.total_due_to_driver for dtr in dtrs)
        
        # Generate batch number
        batch_number = self.ach_repo.get_next_batch_number()
        
        # Set effective date (default to 2 business days from now)
        if not effective_date:
            effective_date = self._calculate_effective_date()
        
        # Create batch
        batch = ACHBatch(
            batch_number=batch_number,
            batch_date=datetime.now(timezone.utc),
            effective_date=effective_date,
            status=ACHBatchStatus.CONFIRMED,
            total_payments=len(dtrs),
            total_amount=total_amount,
            created_by=created_by
        )
        
        batch = self.ach_repo.create_batch(batch)
        
        # Update all DTRs with batch information
        payment_date = datetime.now(timezone.utc)
        for dtr in dtrs:
            self.dtr_repo.update_dtr_payment_info(
                dtr.id,
                ach_batch_id=batch.id,
                payment_date=payment_date,
                status=DTRStatus.PAID
            )
        
        self.db.commit()
        
        logger.info(f"Created ACH batch {batch_number} with {len(dtrs)} payments, total ${total_amount}")
        return batch
    
    def _validate_dtrs_for_ach_batch(self, dtrs: List[DriverTransactionReceipt]):
        """Validate that all DTRs are eligible for ACH batch."""
        for dtr in dtrs:
            # Check if already paid
            if dtr.ach_batch_id or dtr.check_number:
                raise DuplicatePaymentError(f"DTR {dtr.receipt_number} is already paid")
            
            # Check if amount is positive
            if dtr.total_due_to_driver <= 0:
                raise DriverPaymentError(f"DTR {dtr.receipt_number} has no amount due")
            
            # Check driver's payment type
            driver = dtr.driver
            if driver.pay_to_mode != PaymentType.ACH.value:
                raise PaymentTypeInvalidError(
                    f"Driver {driver.driver_id} is not set up for ACH payments (current: {driver.pay_to_mode})"
                )
            
            # Validate bank information exists
            if not driver.ach_routing_number or not driver.ach_account_number:
                raise MissingBankInformationError(
                    f"Driver {driver.driver_id} missing ACH bank information"
                )
            
            # Validate routing number
            if not self._validate_routing_number(driver.ach_routing_number):
                raise InvalidRoutingNumberError(
                    f"Invalid routing number for driver {driver.driver_id}: {driver.ach_routing_number}"
                )
    
    def _validate_routing_number(self, routing: str) -> bool:
        """
        Validate ABA routing number using checksum algorithm.
        The routing number must be 9 digits and pass the checksum test.
        """
        if not routing or len(routing) != 9 or not routing.isdigit():
            return False
        
        # ABA routing number checksum algorithm
        weights = [3, 7, 1, 3, 7, 1, 3, 7, 1]
        checksum = sum(int(digit) * weight for digit, weight in zip(routing, weights))
        return checksum % 10 == 0
    
    def _calculate_effective_date(self) -> date:
        """
        Calculate effective date for ACH processing.
        Typically 2 business days from today.
        """
        today = date.today()
        effective = today + timedelta(days=2)
        
        # Skip weekends (Saturday=5, Sunday=6)
        while effective.weekday() >= 5:
            effective += timedelta(days=1)
        
        return effective
    
    def generate_nacha_file(self, batch_id: int) -> str:
        """
        Generate NACHA file for the specified batch.
        Returns the file content as a string.
        """
        logger.info(f"Generating NACHA file for batch {batch_id}")
        
        batch = self.ach_repo.get_batch_by_id(batch_id)
        if not batch:
            raise ACHBatchNotFoundError(f"Batch {batch_id} not found")
        
        if batch.is_reversed:
            raise ACHBatchReversalError(f"Cannot generate NACHA file for reversed batch {batch.batch_number}")
        
        # Get company configuration
        company_config = self.config_repo.get_active_config()
        if not company_config:
            raise CompanyBankConfigError("No active company bank configuration found")
        
        # Get all DTRs in the batch with driver information
        dtrs = batch.receipts
        if not dtrs:
            raise NACHAGenerationError(f"No DTRs found in batch {batch.batch_number}")
        
        # Generate NACHA file content
        nacha_content = self._build_nacha_file(batch, dtrs, company_config)
        
        # Update batch with NACHA info
        batch.status = ACHBatchStatus.NACHA_GENERATED
        batch.nacha_generated_at = datetime.now(timezone.utc)
        self.ach_repo.update_batch(batch)
        self.db.commit()
        
        logger.info(f"Generated NACHA file for batch {batch.batch_number}")
        return nacha_content
    
    def _build_nacha_file(
        self,
        batch: ACHBatch,
        dtrs: List[DriverTransactionReceipt],
        config: CompanyBankConfiguration
    ) -> str:
        """
        Build NACHA file content following ACH standards.
        This is a simplified implementation. For production, use a library like 'ach'.
        """
        lines = []
        
        # File Header Record (Type 1)
        file_header = self._build_file_header(config)
        lines.append(file_header)
        
        # Batch Header Record (Type 5)
        batch_header = self._build_batch_header(batch, config)
        lines.append(batch_header)
        
        # Entry Detail Records (Type 6) - one per DTR
        entry_hash = 0
        for i, dtr in enumerate(dtrs, start=1):
            entry_detail = self._build_entry_detail(dtr, i)
            lines.append(entry_detail)
            
            # Calculate entry hash (sum of routing numbers, mod 10 digits)
            routing = dtr.driver.ach_routing_number[:8]
            entry_hash += int(routing)
        
        # Batch Control Record (Type 8)
        batch_control = self._build_batch_control(batch, len(dtrs), entry_hash)
        lines.append(batch_control)
        
        # File Control Record (Type 9)
        file_control = self._build_file_control(1, len(dtrs), entry_hash, batch.total_amount)
        lines.append(file_control)
        
        # Pad to multiple of 10 records (blocking factor)
        while len(lines) % 10 != 0:
            lines.append('9' * 94)  # Filler record
        
        return '\n'.join(lines)
    
    def _build_file_header(self, config: CompanyBankConfiguration) -> str:
        """Build NACHA File Header Record (Type 1)."""
        now = datetime.now()
        
        return ''.join([
            '1',  # Record Type Code
            '01',  # Priority Code
            f' {config.immediate_destination:>9}',  # Immediate Destination
            f' {config.immediate_origin:>9}',  # Immediate Origin
            now.strftime('%y%m%d'),  # File Creation Date
            now.strftime('%H%M'),  # File Creation Time
            'A',  # File ID Modifier
            '094',  # Record Size
            '10',  # Blocking Factor
            '1',  # Format Code
            f'{config.bank_name:<23}',  # Immediate Destination Name
            f'{config.company_name:<23}',  # Immediate Origin Name
            ' ' * 8  # Reference Code
        ]).ljust(94)
    
    def _build_batch_header(self, batch: ACHBatch, config: CompanyBankConfiguration) -> str:
        """Build NACHA Batch Header Record (Type 5)."""
        return ''.join([
            '5',  # Record Type Code
            '220',  # Service Class Code (220 = credits only)
            f'{config.company_name:<16}',  # Company Name
            ' ' * 20,  # Company Discretionary Data
            config.company_tax_id,  # Company Identification
            'PPD',  # Standard Entry Class Code
            f'{config.company_entry_description:<10}',  # Company Entry Description
            ' ' * 6,  # Company Descriptive Date
            batch.effective_date.strftime('%y%m%d'),  # Effective Entry Date
            ' ' * 3,  # Settlement Date
            '1',  # Originator Status Code
            config.bank_routing_number[:8],  # Originating DFI Identification
            f'{1:07d}'  # Batch Number
        ]).ljust(94)
    
    def _build_entry_detail(
        self,
        dtr: DriverTransactionReceipt,
        sequence: int
    ) -> str:
        """Build NACHA Entry Detail Record (Type 6)."""
        driver = dtr.driver
        routing = driver.ach_routing_number
        account = driver.ach_account_number
        
        # Amount in cents (10 digits)
        amount_cents = int(dtr.total_due_to_driver * 100)
        
        # Individual ID: DRV{driver_id}-R{receipt_number}
        individual_id = f"DRV{driver.id}-R{dtr.receipt_number}"[:15]
        
        # Individual Name (max 22 chars, uppercase)
        individual_name = f"{driver.first_name} {driver.last_name}".upper()[:22]
        
        # Trace number: routing + sequence
        trace_number = f"{routing[:8]}{sequence:07d}"
        
        return ''.join([
            '6',  # Record Type Code
            '22',  # Transaction Code (22 = Checking Credit/Deposit)
            routing[:8],  # Receiving DFI Identification
            routing[8],  # Check Digit
            f'{account:<17}',  # DFI Account Number
            f'{amount_cents:010d}',  # Amount
            f'{individual_id:<15}',  # Individual Identification Number
            f'{individual_name:<22}',  # Individual Name
            '  ',  # Discretionary Data
            '0',  # Addenda Record Indicator
            trace_number  # Trace Number
        ]).ljust(94)
    
    def _build_batch_control(self, batch: ACHBatch, entry_count: int, entry_hash: int) -> str:
        """Build NACHA Batch Control Record (Type 8)."""
        # Entry hash: last 10 digits only
        entry_hash_str = str(entry_hash)[-10:]
        
        # Total credit amount in cents
        total_cents = int(batch.total_amount * 100)
        
        return ''.join([
            '8',  # Record Type Code
            '220',  # Service Class Code
            f'{entry_count:06d}',  # Entry/Addenda Count
            f'{entry_hash_str:>10}',  # Entry Hash
            f'{total_cents:012d}',  # Total Debit Entry Dollar Amount
            f'{"0":012d}',  # Total Credit Entry Dollar Amount
            ' ' * 10,  # Company Identification
            ' ' * 19,  # Message Authentication Code
            ' ' * 6,  # Reserved
            ' ' * 8,  # Originating DFI Identification
            f'{1:07d}'  # Batch Number
        ]).ljust(94)
    
    def _build_file_control(
        self,
        batch_count: int,
        entry_count: int,
        entry_hash: int,
        total_amount: Decimal
    ) -> str:
        """Build NACHA File Control Record (Type 9)."""
        entry_hash_str = str(entry_hash)[-10:]
        total_cents = int(total_amount * 100)
        
        # Block count: total records / 10, rounded up
        total_records = 1 + 1 + entry_count + 1 + 1  # File header + batch header + entries + batch control + file control
        block_count = (total_records + 9) // 10
        
        return ''.join([
            '9',  # Record Type Code
            f'{batch_count:06d}',  # Batch Count
            f'{block_count:06d}',  # Block Count
            f'{entry_count:08d}',  # Entry/Addenda Count
            f'{entry_hash_str:>10}',  # Entry Hash
            f'{total_cents:012d}',  # Total Debit Entry Dollar Amount in File
            f'{"0":012d}',  # Total Credit Entry Dollar Amount in File
            ' ' * 39  # Reserved
        ]).ljust(94)
    
    def reverse_ach_batch(
        self,
        batch_id: int,
        reason: str,
        reversed_by: int
    ) -> ACHBatch:
        """
        Reverse an ACH batch.
        Marks batch as reversed and clears payment info from all DTRs.
        """
        logger.info(f"Reversing ACH batch {batch_id}. Reason: {reason}")
        
        batch = self.ach_repo.get_batch_by_id(batch_id)
        if not batch:
            raise ACHBatchNotFoundError(f"Batch {batch_id} not found")
        
        if batch.is_reversed:
            raise ACHBatchReversalError(f"Batch {batch.batch_number} is already reversed")
        
        # Reverse the batch
        batch = self.ach_repo.reverse_batch(batch_id, reversed_by, reason)
        self.db.commit()
        
        logger.info(f"Successfully reversed batch {batch.batch_number}")
        return batch
    
    def process_check_payment(
        self,
        dtr_id: int,
        check_number: str,
        payment_date: Optional[datetime] = None
    ) -> DriverTransactionReceipt:
        """
        Mark a DTR as paid by check.
        """
        logger.info(f"Processing check payment for DTR {dtr_id}, check #{check_number}")
        
        dtr = self.dtr_repo.get_dtr_by_id(dtr_id)
        if not dtr:
            raise DTRNotFoundError(f"DTR {dtr_id} not found")
        
        # Validate
        if dtr.ach_batch_id or dtr.check_number:
            raise DuplicatePaymentError(f"DTR {dtr.receipt_number} is already paid")
        
        if dtr.total_due_to_driver <= 0:
            raise DriverPaymentError(f"DTR {dtr.receipt_number} has no amount due")
        
        # Check driver's payment type
        if dtr.driver.pay_to_mode != PaymentType.CHECK.value:
            raise PaymentTypeInvalidError(
                f"Driver {dtr.driver.driver_id} is not set up for check payments (current: {dtr.driver.pay_to_mode})"
            )
        
        # Update DTR
        if not payment_date:
            payment_date = datetime.now(timezone.utc)
        
        dtr = self.dtr_repo.update_dtr_payment_info(
            dtr_id,
            check_number=check_number,
            payment_date=payment_date,
            status=DTRStatus.PAID
        )
        
        self.db.commit()
        
        logger.info(f"Marked DTR {dtr.receipt_number} as paid by check #{check_number}")
        return dtr
    
    def list_ach_batches(self, **filters) -> Tuple[List[ACHBatch], int]:
        """List ACH batches with pagination and filtering."""
        return self.ach_repo.list_batches(**filters)
    
    def get_ach_batch(self, batch_id: int) -> Optional[ACHBatch]:
        """Get ACH batch by ID."""
        return self.ach_repo.get_batch_by_id(batch_id)
    
