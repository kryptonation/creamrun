# app/driver_payments/ach_service.py

"""
ACH Batch Processing Service with NACHA File Generation
"""

from datetime import date, datetime
from pathlib import Path
from typing import List, Optional, Tuple

from sqlalchemy.orm import Session

from app.driver_payments.models import (
    ACHBatch, ACHBatchStatus, CompanyBankConfiguration
)
from app.dtr.models import DTR, DTRStatus, PaymentMethod
from app.drivers.models import Driver
from app.utils.logger import get_logger

logger = get_logger(__name__)


class ACHBatchService:
    """Service for ACH batch processing and NACHA file generation"""
    
    def __init__(self, db: Session):
        self.db = db
        self.nacha_directory = Path("nacha_files")
        self.nacha_directory.mkdir(exist_ok=True)
    
    def create_ach_batch(
        self,
        dtr_ids: List[int],
        effective_date: Optional[date] = None
    ) -> ACHBatch:
        """
        Create ACH batch from selected DTRs.
        
        Args:
            dtr_ids: List of DTR IDs to include
            effective_date: Date when ACH payments will be effective
            
        Returns:
            Created ACHBatch with NACHA file
            
        Raises:
            ValueError: If validation fails
        """
        logger.info(f"Creating ACH batch for {len(dtr_ids)} DTRs")
        
        # 1. Get and validate DTRs
        dtrs = self._get_and_validate_dtrs(dtr_ids)
        
        # 2. Get company bank configuration
        company_config = self._get_company_bank_config()
        
        # 3. Generate batch number
        batch_number = self._generate_batch_number()
        
        # 4. Calculate effective date if not provided
        if not effective_date:
            effective_date = self._calculate_effective_date()
        
        # 5. Calculate totals
        total_amount = sum(dtr.total_due_to_driver for dtr in dtrs)
        
        # 6. Create ACH batch
        ach_batch = ACHBatch(
            batch_number=batch_number,
            batch_date=datetime.now(),
            effective_date=effective_date,
            status=ACHBatchStatus.DRAFT,
            total_payments=len(dtrs),
            total_amount=total_amount
        )
        
        self.db.add(ach_batch)
        self.db.flush()
        
        # 7. Link DTRs to batch and mark as PAID
        for dtr in dtrs:
            dtr.ach_batch_id = ach_batch.id
            dtr.ach_batch_number = batch_number
            dtr.status = DTRStatus.PAID
            dtr.payment_date = datetime.now()
        
        # 8. Generate NACHA file
        nacha_file_path = self._generate_nacha_file(
            ach_batch=ach_batch,
            dtrs=dtrs,
            company_config=company_config
        )
        
        ach_batch.nacha_file_path = str(nacha_file_path)
        ach_batch.nacha_generated_at = datetime.now()
        ach_batch.status = ACHBatchStatus.NACHA_GENERATED
        
        self.db.commit()
        self.db.refresh(ach_batch)
        
        logger.info(
            f"Created ACH batch {batch_number} with {len(dtrs)} payments, "
            f"total ${total_amount}, NACHA file: {nacha_file_path}"
        )
        
        return ach_batch
    
    def _get_and_validate_dtrs(self, dtr_ids: List[int]) -> List[DTR]:
        """Get and validate DTRs for ACH batch"""
        dtrs = (
            self.db.query(DTR)
            .filter(DTR.id.in_(dtr_ids))
            .all()
        )
        
        if not dtrs:
            raise ValueError("No DTRs found for provided IDs")
        
        if len(dtrs) != len(dtr_ids):
            raise ValueError("Some DTR IDs not found")
        
        # Validate each DTR
        for dtr in dtrs:
            # Must be FINALIZED
            if dtr.status != DTRStatus.FINALIZED:
                raise ValueError(
                    f"DTR {dtr.receipt_number} must be FINALIZED (currently {dtr.status})"
                )
            
            # Must be ACH payment method
            if dtr.payment_method != PaymentMethod.ACH:
                raise ValueError(
                    f"DTR {dtr.receipt_number} is not set for ACH payment "
                    f"(current: {dtr.payment_method})"
                )
            
            # Must not already be in another batch
            if dtr.ach_batch_id:
                raise ValueError(
                    f"DTR {dtr.receipt_number} is already in batch {dtr.ach_batch_number}"
                )
            
            # Driver must have bank information (stored on related BankAccount)
            driver = self.db.query(Driver).filter(Driver.id == dtr.primary_driver_id).first()
            if not driver:
                raise ValueError(f"Driver not found for DTR {dtr.receipt_number}")

            bank = getattr(driver, 'driver_bank_account', None)
            if not bank or not getattr(bank, 'bank_routing_number', None) or not getattr(bank, 'bank_account_number', None):
                raise ValueError(
                    f"Driver {driver.first_name} {driver.last_name} "
                    f"(DTR {dtr.receipt_number}) is missing bank information"
                )
        
        return dtrs
    
    def _get_company_bank_config(self) -> CompanyBankConfiguration:
        """Get active company bank configuration"""
        config = (
            self.db.query(CompanyBankConfiguration)
            .filter(CompanyBankConfiguration.is_active == True)
            .first()
        )
        
        if not config:
            raise ValueError("Company bank configuration not found. Please configure in settings.")
        
        return config
    
    def _generate_batch_number(self) -> str:
        """
        Generate batch number in format: YYMM-XXX
        Example: 2510-987
        """
        now = datetime.now()
        year_month = now.strftime('%y%m')
        
        # Get last batch for this month
        last_batch = (
            self.db.query(ACHBatch)
            .filter(ACHBatch.batch_number.like(f'{year_month}-%'))
            .order_by(ACHBatch.id.desc())
            .first()
        )
        
        if last_batch:
            last_seq = int(last_batch.batch_number.split('-')[1])
            new_seq = last_seq + 1
        else:
            new_seq = 1
        
        return f"{year_month}-{new_seq:03d}"
    
    def _calculate_effective_date(self) -> date:
        """
        Calculate effective date for ACH processing.
        
        Standard: 2 business days from batch creation.
        """
        from datetime import timedelta
        
        today = date.today()
        effective = today + timedelta(days=2)
        
        # Skip weekends
        while effective.weekday() >= 5:  # Saturday = 5, Sunday = 6
            effective += timedelta(days=1)
        
        return effective
    
    def _generate_nacha_file(
        self,
        ach_batch: ACHBatch,
        dtrs: List[DTR],
        company_config: CompanyBankConfiguration
    ) -> Path:
        """
        Generate NACHA file for ACH batch.
        
        Uses standard NACHA format with fixed-width records (94 characters).
        """
        logger.info(f"Generating NACHA file for batch {ach_batch.batch_number}")
        
        # Calculate entry hash (sum of routing numbers' first 8 digits)
        # Batch-fetch drivers to avoid querying in a loop and validate routing numbers
        entry_hash = 0
        driver_ids = [dtr.primary_driver_id for dtr in dtrs if getattr(dtr, 'primary_driver_id', None) is not None]
        drivers = (
            self.db.query(Driver)
            .filter(Driver.id.in_(driver_ids))
            .all()
        )
        driver_map = {drv.id: drv for drv in drivers}

        for dtr in dtrs:
            driver = driver_map.get(dtr.primary_driver_id)
            if not driver:
                raise ValueError(f"Driver not found for DTR {dtr.receipt_number}")

            bank = getattr(driver, 'driver_bank_account', None)
            if not bank:
                raise ValueError(f"Bank account not found for driver {driver.id} (DTR {dtr.receipt_number})")

            routing_raw = str(getattr(bank, 'bank_routing_number', '') or '')
            # Keep only digits
            routing_digits = "".join(ch for ch in routing_raw if ch.isdigit())

            # ACH routing numbers must be 9 digits; require at least 9 to compute entry hash
            if len(routing_digits) < 9:
                raise ValueError(
                    f"Invalid ACH routing number for driver {driver.id} ({driver.first_name} {driver.last_name}): '{routing_raw}'"
                )

            # Entry hash uses the first 8 digits of the routing number
            entry_hash += int(routing_digits[:8])
        
        # Generate NACHA file content
        lines = []
        
        # 1. File Header Record (Type 1)
        lines.append(self._generate_file_header(ach_batch, company_config))
        
        # 2. Batch Header Record (Type 5)
        lines.append(self._generate_batch_header(ach_batch, company_config))
        
        # 3. Entry Detail Records (Type 6) - one per DTR
        for dtr in dtrs:
            lines.append(self._generate_entry_detail(dtr, company_config))
        
        # 4. Batch Control Record (Type 8)
        lines.append(self._generate_batch_control(ach_batch, dtrs, entry_hash, company_config))
        
        # 5. File Control Record (Type 9)
        lines.append(self._generate_file_control(ach_batch, dtrs, entry_hash))
        
        # 6. Pad to blocks of 10 (filler records with 9s)
        total_records = len(lines)
        records_needed = ((total_records + 9) // 10) * 10
        filler_count = records_needed - total_records
        
        for _ in range(filler_count):
            lines.append('9' * 94)
        
        # Write to file
        file_path = self.nacha_directory / f"{ach_batch.batch_number}.ach"
        
        with open(file_path, 'w') as f:
            f.write('\n'.join(lines))
        
        logger.info(f"NACHA file generated: {file_path}")
        
        return file_path
    
    def _generate_file_header(
        self,
        ach_batch: ACHBatch,
        config: CompanyBankConfiguration
    ) -> str:
        """Generate NACHA File Header Record (Type 1) - 94 characters"""
        now = datetime.now()
        
        record = '1'  # Record Type Code
        record += '01'  # Priority Code
        record += f' {config.immediate_destination[:9]:9}'  # Immediate Destination
        record += f' {config.immediate_origin[:9]:9}'  # Immediate Origin
        record += now.strftime('%y%m%d')  # File Creation Date (YYMMDD)
        record += now.strftime('%H%M')  # File Creation Time (HHMM)
        record += 'A'  # File ID Modifier
        record += '094'  # Record Size
        record += '10'  # Blocking Factor
        record += '1'  # Format Code
        record += f'{config.bank_name[:23]:23}'  # Immediate Destination Name
        record += f'{config.company_name[:23]:23}'  # Immediate Origin Name
        record += ' ' * 8  # Reference Code
        
        return record[:94]  # Ensure exactly 94 characters
    
    def _generate_batch_header(
        self,
        ach_batch: ACHBatch,
        config: CompanyBankConfiguration
    ) -> str:
        """Generate NACHA Batch Header Record (Type 5) - 94 characters"""
        record = '5'  # Record Type Code
        record += '220'  # Service Class Code (220 = Credits Only)
        record += f'{config.company_name[:16]:16}'  # Company Name
        record += ' ' * 20  # Company Discretionary Data
        record += f'{config.immediate_origin[:10]:10}'  # Company Identification
        record += 'PPD'  # Standard Entry Class Code (PPD = Prearranged Payment/Deposit)
        record += f'{config.company_entry_description[:10]:10}'  # Company Entry Description
        record += ' ' * 6  # Company Descriptive Date
        record += ach_batch.effective_date.strftime('%y%m%d')  # Effective Entry Date
        record += '   '  # Settlement Date (Julian)
        record += '1'  # Originator Status Code
        record += config.bank_routing_number[:8]  # Originating DFI Identification
        record += '0000001'  # Batch Number
        
        return record[:94]
    
    def _generate_entry_detail(
        self,
        dtr: DTR,
        config: CompanyBankConfiguration
    ) -> str:
        """Generate NACHA Entry Detail Record (Type 6) - 94 characters"""
        driver = self.db.query(Driver).filter(Driver.id == dtr.primary_driver_id).first()

        if not driver:
            raise ValueError(f"Driver not found for DTR {dtr.receipt_number}")

        bank = getattr(driver, 'driver_bank_account', None)
        if not bank:
            raise ValueError(f"Bank account not found for driver {driver.id}")

        # Amount in cents (no decimal point)
        amount_cents = int(dtr.total_due_to_driver * 100)

        # Normalize routing and account to strings
        routing_raw = str(getattr(bank, 'bank_routing_number', '') or '')
        routing_digits = "".join(ch for ch in routing_raw if ch.isdigit())
        if len(routing_digits) < 9:
            raise ValueError(f"Invalid bank routing number for driver {driver.id}: '{routing_raw}'")

        account_raw = str(getattr(bank, 'bank_account_number', '') or '')
        account_str = account_raw if isinstance(account_raw, str) else str(account_raw)

        record = '6'  # Record Type Code
        record += '22'  # Transaction Code (22 = Checking Credit/Deposit)
        record += routing_digits[:8]  # Receiving DFI Identification
        record += routing_digits[8]  # Check Digit
        record += f'{account_str[:17]:17}'  # DFI Account Number
        record += f'{amount_cents:010d}'  # Amount (10 digits, no decimal)
        record += f'{driver.id:15d}'  # Individual ID Number
        record += f'{(driver.first_name or "")[:15]:15} {(driver.last_name or "")[:7]:7}'  # Individual Name (22 chars)
        record += '  '  # Discretionary Data
        record += '0'  # Addenda Record Indicator
        record += f'{config.bank_routing_number[:8]:8}{dtr.id:07d}'  # Trace Number

        return record[:94]
    
    def _generate_batch_control(
        self,
        ach_batch: ACHBatch,
        dtrs: List[DTR],
        entry_hash: int,
        config: CompanyBankConfiguration
    ) -> str:
        """Generate NACHA Batch Control Record (Type 8) - 94 characters"""
        total_debit = 0
        total_credit = int(ach_batch.total_amount * 100)
        
        record = '8'  # Record Type Code
        record += '220'  # Service Class Code
        record += f'{len(dtrs):06d}'  # Entry/Addenda Count
        record += f'{entry_hash % 10000000000:010d}'  # Entry Hash (last 10 digits)
        record += f'{total_debit:012d}'  # Total Debit Entry Dollar Amount
        record += f'{total_credit:012d}'  # Total Credit Entry Dollar Amount
        record += f'{config.immediate_origin[:10]:10}'  # Company Identification
        record += ' ' * 19  # Message Authentication Code
        record += ' ' * 6  # Reserved
        record += config.bank_routing_number[:8]  # Originating DFI Identification
        record += '0000001'  # Batch Number
        
        return record[:94]
    
    def _generate_file_control(
        self,
        ach_batch: ACHBatch,
        dtrs: List[DTR],
        entry_hash: int
    ) -> str:
        """Generate NACHA File Control Record (Type 9) - 94 characters"""
        total_credit = int(ach_batch.total_amount * 100)
        
        # Calculate block count (total records including padding, divided by 10)
        total_records = 4 + len(dtrs)  # Header + Batch Header + Entries + Batch Control + File Control
        block_count = ((total_records + 9) // 10)
        
        record = '9'  # Record Type Code
        record += '000001'  # Batch Count
        record += f'{block_count:06d}'  # Block Count
        record += f'{len(dtrs):08d}'  # Entry/Addenda Count
        record += f'{entry_hash % 10000000000:010d}'  # Entry Hash
        record += '000000000000'  # Total Debit Entry Dollar Amount
        record += f'{total_credit:012d}'  # Total Credit Entry Dollar Amount
        record += ' ' * 39  # Reserved
        
        return record[:94]
    
    def reverse_ach_batch(self, batch_id: int, reason: str) -> ACHBatch:
        """
        Reverse an ACH batch.
        
        Updates batch status and reverts DTR statuses to FINALIZED.
        """
        logger.info(f"Reversing ACH batch {batch_id}")
        
        batch = self.db.query(ACHBatch).filter(ACHBatch.id == batch_id).first()
        
        if not batch:
            raise ValueError("Batch not found")
        
        if batch.is_reversed:
            raise ValueError("Batch is already reversed")
        
        # Revert DTRs
        dtrs = self.db.query(DTR).filter(DTR.ach_batch_id == batch_id).all()
        
        for dtr in dtrs:
            dtr.status = DTRStatus.FINALIZED
            dtr.ach_batch_id = None
            dtr.ach_batch_number = None
            dtr.payment_date = None
        
        # Mark batch as reversed
        batch.is_reversed = True
        batch.reversed_at = datetime.utcnow()
        batch.reversal_reason = reason
        batch.status = ACHBatchStatus.REVERSED
        
        self.db.commit()
        
        logger.info(f"Reversed ACH batch {batch.batch_number}, reverted {len(dtrs)} DTRs")
        
        return batch
    
    def get_batch_by_id(self, batch_id: int) -> Optional[ACHBatch]:
        """Get ACH batch by ID"""
        return self.db.query(ACHBatch).filter(ACHBatch.id == batch_id).first()
    
    def list_batches(
        self,
        page: int = 1,
        per_page: int = 50,
        status: Optional[ACHBatchStatus] = None
    ) -> Tuple[List[ACHBatch], int]:
        """List ACH batches with pagination"""
        query = self.db.query(ACHBatch)
        
        if status:
            query = query.filter(ACHBatch.status == status)
        
        total = query.count()
        
        batches = (
            query.order_by(ACHBatch.batch_date.desc())
            .offset((page - 1) * per_page)
            .limit(per_page)
            .all()
        )
        
        return batches, total