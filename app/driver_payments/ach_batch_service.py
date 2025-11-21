# app/driver_payments/ach_batch_service.py

from datetime import date, datetime, timezone
from typing import List, Optional, Tuple
from pathlib import Path

from sqlalchemy.orm import Session

# Use DTR model from app.dtr
from app.dtr.models import DTR

# ACH-specific models stay in driver_payments
from app.driver_payments.models import DTRStatus
from app.driver_payments.models import (
    ACHBatch, ACHBatchStatus, CompanyBankConfiguration
)
from app.driver_payments.exceptions import (
    ACHBatchNotFoundError, MissingBankInformationError,
    CompanyBankConfigError, NACHAGenerationError, ACHBatchReversalError
)
from app.utils.logger import get_logger

logger = get_logger(__name__)


class ACHBatchService:
    """
    Service for ACH batch processing and NACHA file generation.
    Works with consolidated DTR model from app.dtr
    """
    
    def __init__(self, db: Session):
        self.db = db
        self.nacha_directory = Path("nacha_files")
        self.nacha_directory.mkdir(exist_ok=True)
    
    def create_ach_batch(
        self,
        dtr_ids: List[int],
        effective_date: date
    ) -> ACHBatch:
        """
        Create a new ACH batch from selected DTRs.
        
        Args:
            dtr_ids: List of DTR IDs to include in batch
            effective_date: Date when ACH payments will be effective
            
        Returns:
            Created ACHBatch object
            
        Raises:
            MissingBankInformationError: If driver bank info is missing
            CompanyBankConfigError: If company bank config is missing
        """
        try:
            logger.info(f"Creating ACH batch for {len(dtr_ids)} DTRs, effective date: {effective_date}")
            
            # Get all DTRs
            dtrs = self.db.query(DTR).filter(DTR.id.in_(dtr_ids)).all()
            
            if not dtrs:
                raise ValueError("No DTRs found for provided IDs")
            
            # Validate all DTRs are eligible for ACH
            self._validate_dtrs_for_ach(dtrs)
            
            # Get company bank configuration
            company_config = self._get_company_bank_config()
            
            # Generate batch number
            batch_number = self._generate_batch_number()
            
            # Calculate total amount
            total_amount = sum(dtr.total_due_to_driver for dtr in dtrs)
            
            # Create ACH batch
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
            
            # Link DTRs to batch
            for dtr in dtrs:
                dtr.ach_batch_id = ach_batch.id
                dtr.ach_batch_number = batch_number
                dtr.payment_method = "ACH"
            
            # Generate NACHA file
            nacha_file_path = self._generate_nacha_file(ach_batch, dtrs, company_config)
            ach_batch.nacha_file_path = str(nacha_file_path)
            ach_batch.status = ACHBatchStatus.NACHA_GENERATED
            
            self.db.commit()
            
            logger.info(f"Created ACH batch {batch_number} with {len(dtrs)} payments totaling ${total_amount}")
            
            return ach_batch
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error creating ACH batch: {str(e)}", exc_info=True)
            raise
    
    def _validate_dtrs_for_ach(self, dtrs: List[DTR]) -> None:
        """
        Validate that all DTRs are eligible for ACH payment.
        
        Raises:
            MissingBankInformationError: If any driver is missing bank info
            ValueError: If DTRs are not in correct status
        """
        for dtr in dtrs:
            # Check DTR status
            if dtr.status == DTRStatus.PAID:
                raise ValueError(f"DTR {dtr.receipt_number} is already paid")
            
            if dtr.status == DTRStatus.VOID:
                raise ValueError(f"DTR {dtr.receipt_number} is voided")
            
            # Check driver has ACH info
            driver = dtr.driver
            if not driver:
                raise ValueError(f"DTR {dtr.receipt_number} has no associated driver")
            
            bank_account = driver.driver_bank_account
            if not bank_account or not bank_account.bank_account_number:
                raise MissingBankInformationError(
                    f"Driver {driver.first_name} {driver.last_name} (TLC: {driver.tlc_license.tlc_license_number}) "
                    f"is missing bank account information"
                )
            
            # Check amount is positive
            if dtr.total_due_to_driver <= 0:
                raise ValueError(f"DTR {dtr.receipt_number} has no amount due to driver")
    
    def _get_company_bank_config(self) -> CompanyBankConfiguration:
        """
        Get company bank configuration for NACHA file generation.
        
        Returns:
            CompanyBankConfiguration object
            
        Raises:
            CompanyBankConfigError: If configuration is not found
        """
        config = self.db.query(CompanyBankConfiguration).first()
        
        if not config:
            raise CompanyBankConfigError(
                "Company bank configuration not found. Please configure company banking details."
            )
        
        return config
    
    def _generate_batch_number(self) -> str:
        """Generate unique ACH batch number in format YYMM-XXX"""
        now = datetime.now()
        year_month = now.strftime("%y%m")
        
        # Get last batch number for this month
        last_batch = (
            self.db.query(ACHBatch)
            .filter(ACHBatch.batch_number.like(f"{year_month}-%"))
            .order_by(ACHBatch.id.desc())
            .first()
        )
        
        if last_batch:
            # Extract sequence number and increment
            last_seq = int(last_batch.batch_number.split('-')[1])
            new_seq = last_seq + 1
        else:
            new_seq = 1
        
        return f"{year_month}-{new_seq:03d}"
    
    def _generate_nacha_file(
        self,
        ach_batch: ACHBatch,
        dtrs: List[DTR],
        company_config: CompanyBankConfiguration
    ) -> Path:
        """
        Generate NACHA file for ACH batch.
        
        Args:
            ach_batch: ACHBatch object
            dtrs: List of DTRs in the batch
            company_config: Company bank configuration
            
        Returns:
            Path to generated NACHA file
            
        Raises:
            NACHAGenerationError: If file generation fails
        """
        try:
            nacha_file_path = self.nacha_directory / f"{ach_batch.batch_number}.txt"
            
            with open(nacha_file_path, 'w') as f:
                # File Header Record (1)
                f.write(self._generate_file_header(ach_batch, company_config))
                f.write('\n')
                
                # Batch Header Record (5)
                f.write(self._generate_batch_header(ach_batch, company_config))
                f.write('\n')
                
                # Entry Detail Records (6) - one per DTR
                entry_hash = 0
                for dtr in dtrs:
                    entry_line = self._generate_entry_detail(dtr, ach_batch)
                    f.write(entry_line)
                    f.write('\n')
                    
                    # Calculate entry hash (sum of routing numbers)
                    routing_first_8 = int(dtr.driver.driver_bank_account.bank_routing_number[:8]) if dtr.driver.driver_bank_account.bank_routing_number else 0
                    entry_hash += routing_first_8
                
                # Batch Control Record (8)
                f.write(self._generate_batch_control(ach_batch, dtrs, entry_hash, company_config))
                f.write('\n')
                
                # File Control Record (9)
                f.write(self._generate_file_control(ach_batch, dtrs, entry_hash))
                f.write('\n')
                
                # Add padding to make file multiple of 10 lines
                total_lines = 4 + len(dtrs)  # header + batch header + entries + batch control + file control
                padding_lines = (10 - (total_lines % 10)) % 10
                for _ in range(padding_lines):
                    f.write('9' * 94)
                    f.write('\n')
            
            logger.info(f"Generated NACHA file: {nacha_file_path}")
            return nacha_file_path
            
        except Exception as e:
            logger.error(f"Error generating NACHA file: {str(e)}", exc_info=True)
            raise NACHAGenerationError(f"Failed to generate NACHA file: {str(e)}") from e
    
    def _generate_file_header(self, ach_batch: ACHBatch, config: CompanyBankConfiguration) -> str:
        """Generate NACHA File Header Record (Type 1)"""
        now = datetime.now()
        
        record = '1'  # Record Type Code
        record += '01'  # Priority Code
        record += f'{config.immediate_destination[:10]:>10}'  # Immediate Destination
        record += f'{config.immediate_origin[:10]:>10}'  # Immediate Origin
        record += now.strftime('%y%m%d')  # File Creation Date
        record += now.strftime('%H%M')  # File Creation Time
        record += 'A'  # File ID Modifier
        record += '094'  # Record Size
        record += '10'  # Blocking Factor
        record += '1'  # Format Code
        record += f'{config.bank_name[:23]:<23}'  # Immediate Destination Name
        record += f'{config.company_name[:23]:<23}'  # Immediate Origin Name
        record += ' ' * 8  # Reference Code
        
        return record
    
    def _generate_batch_header(self, ach_batch: ACHBatch, config: CompanyBankConfiguration) -> str:
        """Generate NACHA Batch Header Record (Type 5)"""
        record = '5'  # Record Type Code
        record += '220'  # Service Class Code (220 = Credits Only)
        record += f'{config.company_name[:16]:<16}'  # Company Name
        record += ' ' * 20  # Company Discretionary Data
        record += f'{config.immediate_origin[:10]:>10}'  # Company Identification
        record += 'PPD'  # Standard Entry Class Code
        record += f'{"Driver Pay":<10}'  # Company Entry Description
        record += ' ' * 6  # Company Descriptive Date
        record += ach_batch.effective_date.strftime('%y%m%d')  # Effective Entry Date
        record += '   '  # Settlement Date (Julian)
        record += '1'  # Originator Status Code
        record += config.bank_routing_number[:8]  # Originating DFI Identification
        record += '0000001'  # Batch Number
        
        return record
    
    def _generate_entry_detail(self, dtr: DTR, ach_batch: ACHBatch) -> str:
        """Generate NACHA Entry Detail Record (Type 6)"""
        driver = dtr.driver
        bank_account = driver.driver_bank_account
        
        # Transaction Code: 22 = Checking Credit
        transaction_code = '22'
        
        # Receiving DFI Identification (first 8 digits of routing number)
        rdfi = bank_account.bank_routing_number[:8] if bank_account.bank_routing_number else '00000000'
        
        # Check digit (9th digit of routing number)
        check_digit = bank_account.bank_routing_number[8:9] if bank_account.bank_routing_number else '0'
        
        # DFI Account Number (left-justified, space-filled)
        account_number = f'{str(bank_account.bank_account_number)[:17]:<17}'
        
        # Amount in cents (right-justified, zero-filled)
        amount_cents = int(dtr.total_due_to_driver * 100)
        amount_str = f'{amount_cents:010d}'
        
        # Individual Identification Number (DTR receipt number)
        individual_id = f'{dtr.receipt_number[:15]:<15}'
        
        # Individual Name
        individual_name = f'{driver.first_name} {driver.last_name}'
        individual_name = f'{individual_name[:22]:<22}'
        
        # Discretionary Data
        discretionary = '  '
        
        # Addenda Record Indicator
        addenda_indicator = '0'  # No addenda
        
        # Trace Number (ODFI Routing + Sequence)
        trace_number = rdfi + f'{dtr.id:07d}'
        
        record = '6'  # Record Type Code
        record += transaction_code
        record += rdfi
        record += check_digit
        record += account_number
        record += amount_str
        record += individual_id
        record += individual_name
        record += discretionary
        record += addenda_indicator
        record += trace_number
        
        return record
    
    def _generate_batch_control(self, ach_batch: ACHBatch, dtrs: List[DTR], entry_hash: int, config: CompanyBankConfiguration) -> str:
        """Generate NACHA Batch Control Record (Type 8)"""
        record = '8'  # Record Type Code
        record += '220'  # Service Class Code
        record += f'{len(dtrs):06d}'  # Entry/Addenda Count
        record += f'{entry_hash % 10000000000:010d}'  # Entry Hash (last 10 digits)
        record += f'{int(ach_batch.total_amount * 100):012d}'  # Total Debit Entry Dollar Amount
        record += '000000000000'  # Total Credit Entry Dollar Amount (always 0 for credits)
        record += f'{config.immediate_origin[:10]:>10}'  # Company Identification
        record += ' ' * 19  # Message Authentication Code
        record += ' ' * 6  # Reserved
        record += config.bank_routing_number[:8]  # Originating DFI Identification
        record += '0000001'  # Batch Number
        
        return record
    
    def _generate_file_control(self, ach_batch: ACHBatch, dtrs: List[DTR], entry_hash: int) -> str:
        """Generate NACHA File Control Record (Type 9)"""
        record = '9'  # Record Type Code
        record += '000001'  # Batch Count
        record += f'{(len(dtrs) + 4) // 10:06d}'  # Block Count
        record += f'{len(dtrs):08d}'  # Entry/Addenda Count
        record += f'{entry_hash % 10000000000:010d}'  # Entry Hash
        record += f'{int(ach_batch.total_amount * 100):012d}'  # Total Debit Entry Dollar Amount
        record += '000000000000'  # Total Credit Entry Dollar Amount
        record += ' ' * 39  # Reserved
        
        return record
    
    def list_ach_batches(
        self,
        page: int = 1,
        per_page: int = 10,
        status_filter: Optional[ACHBatchStatus] = None
    ) -> Tuple[List[ACHBatch], int]:
        """List all ACH batches with pagination"""
        query = self.db.query(ACHBatch)
        
        if status_filter:
            query = query.filter(ACHBatch.status == status_filter)
        
        total = query.count()
        
        batches = (
            query.order_by(ACHBatch.created_on.desc())
            .offset((page - 1) * per_page)
            .limit(per_page)
            .all()
        )
        
        return batches, total
    
    def get_ach_batch_by_id(self, batch_id: int) -> Optional[ACHBatch]:
        """Get ACH batch by ID"""
        return self.db.query(ACHBatch).filter(ACHBatch.id == batch_id).first()
    
    def reverse_ach_batch(self, batch_id: int, reason: str) -> ACHBatch:
        """
        Reverse an ACH batch.
        Updates batch status and DTR statuses.
        
        Args:
            batch_id: ACH batch ID
            reason: Reason for reversal
            
        Returns:
            Reversed ACHBatch object
            
        Raises:
            ACHBatchNotFoundError: If batch not found
            ACHBatchReversalError: If batch cannot be reversed
        """
        try:
            batch = self.get_ach_batch_by_id(batch_id)
            
            if not batch:
                raise ACHBatchNotFoundError(f"ACH batch with ID {batch_id} not found")
            
            if batch.status == ACHBatchStatus.REVERSED:
                raise ACHBatchReversalError("Batch is already reversed")
            
            if batch.status == ACHBatchStatus.DRAFT:
                raise ACHBatchReversalError("Cannot reverse a draft batch")
            
            # Get all DTRs in this batch
            dtrs = self.db.query(DTR).filter(DTR.ach_batch_id == batch_id).all()
            
            # Reverse batch
            batch.status = ACHBatchStatus.REVERSED
            batch.reversal_reason = reason
            batch.reversed_at = datetime.now(timezone.utc)
            
            # Update DTRs
            for dtr in dtrs:
                dtr.ach_batch_id = None
                dtr.ach_batch_number = None
                dtr.payment_method = None
                dtr.payment_date = None
                dtr.status = DTRStatus.GENERATED
            
            self.db.commit()
            
            logger.info(f"Reversed ACH batch {batch.batch_number}, reason: {reason}")
            
            return batch
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error reversing ACH batch: {str(e)}", exc_info=True)
            raise