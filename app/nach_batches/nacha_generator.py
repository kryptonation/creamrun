# app/nach_batches/nacha_generator.py
"""
NACHA File Generator

Generates NACHA-formatted ACH files for bank submission.
Uses the 'ach' library for file generation.
"""

from datetime import date
from decimal import Decimal
from typing import List, Dict, Any
from io import BytesIO

from ach.builder import AchFile

from app.nach_batches.exceptions import (
    NACHAFileGenerationException,
    InvalidRoutingNumberException,
    MissingBankInfoException,
    CompanyConfigurationException
)
from app.utils.logger import get_logger

logger = get_logger(__name__)


class NACHAGenerator:
    """NACHA file generator using ACH library"""
    
    # Transaction code for checking account credit (deposit)
    TRANSACTION_CODE_CHECKING_CREDIT = "22"
    
    def __init__(self, company_config: Dict[str, Any]):
        """
        Initialize NACHA generator
        
        Args:
            company_config: Company configuration containing:
                - company_name: Company name
                - company_tax_id: 10-digit tax ID
                - company_routing: 9-digit routing number
                - company_account: Account number
                - bank_name: Company bank name
                
        Raises:
            CompanyConfigurationException: If required config is missing
        """
        self.company_config = company_config
        self._validate_company_config()
    
    def _validate_company_config(self):
        """
        Validate company configuration
        
        Raises:
            CompanyConfigurationException: If required fields are missing
        """
        required_fields = [
            'company_name',
            'company_tax_id',
            'company_routing',
            'company_account',
            'bank_name'
        ]
        
        missing_fields = [
            field for field in required_fields
            if field not in self.company_config or not self.company_config[field]
        ]
        
        if missing_fields:
            error_msg = f"Missing required company configuration: {', '.join(missing_fields)}"
            logger.error(error_msg)
            raise CompanyConfigurationException(error_msg)
        
        # Validate routing number format
        routing = self.company_config['company_routing']
        if not self.validate_routing_number(routing):
            raise InvalidRoutingNumberException(
                f"Invalid company routing number: {routing}"
            )
        
        logger.debug("Company configuration validated successfully")
    
    @staticmethod
    def validate_routing_number(routing: str) -> bool:
        """
        Validate ABA routing number using checksum algorithm
        
        Args:
            routing: 9-digit routing number
            
        Returns:
            True if valid, False otherwise
        """
        if not routing or len(routing) != 9 or not routing.isdigit():
            return False
        
        # ABA routing number checksum algorithm
        weights = [3, 7, 1, 3, 7, 1, 3, 7, 1]
        checksum = sum(int(d) * w for d, w in zip(routing, weights))
        
        return checksum % 10 == 0
    
    def generate_nacha_file(
        self,
        batch_number: str,
        payments: List[Dict[str, Any]],
        effective_date: date
    ) -> BytesIO:
        """
        Generate NACHA file for a batch of payments
        
        Args:
            batch_number: Unique batch identifier
            payments: List of payment dictionaries containing:
                - dtr_id: DTR ID
                - receipt_number: Receipt number
                - driver_id: Driver ID
                - driver_name: Driver full name
                - routing_number: Driver's bank routing number
                - account_number: Driver's bank account number
                - amount: Payment amount (Decimal)
                - week_end_date: Week ending date
            effective_date: ACH effective entry date
            
        Returns:
            BytesIO buffer containing NACHA file content
            
        Raises:
            NACHAFileGenerationException: If file generation fails
            MissingBankInfoException: If driver bank info is invalid
        """
        try:
            logger.info(
                f"Starting NACHA file generation for batch {batch_number}",
                extra={
                    "batch_number": batch_number,
                    "payment_count": len(payments),
                    "effective_date": effective_date.isoformat()
                }
            )
            
            # Validate all payments before generating file
            self._validate_payments(payments)
            
            # Initialize ACH file
            ach_file = AchFile(
                file_id_modifier='A',
                immediate_destination=self.company_config['company_routing'],
                immediate_origin=self.company_config['company_tax_id'],
                immediate_destination_name=self.company_config['bank_name'][:23],
                immediate_origin_name=self.company_config['company_name'][:23]
            )
            
            # Create batch
            batch = ach_file.add_batch(
                company_name=self.company_config['company_name'][:16],
                company_identification=self.company_config['company_tax_id'],
                company_entry_description='PAYROLL',
                effective_entry_date=effective_date,
                originating_dfi_identification=self.company_config['company_routing'][:8]
            )
            
            # Add each payment as an entry
            for idx, payment in enumerate(payments, start=1):
                try:
                    self._add_payment_entry(batch, payment, idx)
                except Exception as e:
                    logger.error(
                        f"Failed to add payment entry {idx}: {str(e)}",
                        extra={"payment": payment}
                    )
                    raise NACHAFileGenerationException(
                        f"Failed to add payment for driver {payment.get('driver_name')}: {str(e)}"
                    )
            
            # Generate file content
            file_content = ach_file.render()
            
            # Convert to BytesIO
            file_buffer = BytesIO(file_content.encode('utf-8'))
            file_buffer.seek(0)
            
            logger.info(
                f"NACHA file generated successfully for batch {batch_number}",
                extra={
                    "batch_number": batch_number,
                    "file_size_bytes": len(file_content),
                    "payment_count": len(payments)
                }
            )
            
            return file_buffer
            
        except (MissingBankInfoException, InvalidRoutingNumberException):
            raise
        except Exception as e:
            logger.error(
                f"NACHA file generation failed: {str(e)}",
                exc_info=True,
                extra={"batch_number": batch_number}
            )
            raise NACHAFileGenerationException(
                f"Failed to generate NACHA file: {str(e)}"
            )
    
    def _validate_payments(self, payments: List[Dict[str, Any]]):
        """
        Validate all payments have required bank information
        
        Args:
            payments: List of payment dictionaries
            
        Raises:
            MissingBankInfoException: If any payment has invalid bank info
        """
        for idx, payment in enumerate(payments, start=1):
            driver_name = payment.get('driver_name', 'Unknown')
            
            # Check routing number
            routing = payment.get('routing_number', '').strip()
            if not routing:
                raise MissingBankInfoException(
                    f"Driver {driver_name} is missing routing number"
                )
            
            if not self.validate_routing_number(routing):
                raise InvalidRoutingNumberException(
                    f"Driver {driver_name} has invalid routing number: {routing}"
                )
            
            # Check account number
            account = payment.get('account_number', '').strip()
            if not account:
                raise MissingBankInfoException(
                    f"Driver {driver_name} is missing account number"
                )
            
            if len(account) > 17:
                raise MissingBankInfoException(
                    f"Driver {driver_name} account number exceeds 17 digits"
                )
            
            # Check amount
            amount = payment.get('amount')
            if not amount or amount <= 0:
                raise MissingBankInfoException(
                    f"Driver {driver_name} has invalid payment amount: {amount}"
                )
            
            logger.debug(f"Payment {idx} validated for driver {driver_name}")
    
    def _add_payment_entry(
        self,
        batch,
        payment: Dict[str, Any],
        sequence: int
    ):
        """
        Add a payment entry to the ACH batch
        
        Args:
            batch: ACH batch object
            payment: Payment dictionary
            sequence: Entry sequence number
        """
        routing = payment['routing_number'].strip()
        account = payment['account_number'].strip()
        amount_decimal = Decimal(str(payment['amount']))
        amount_cents = int(amount_decimal * 100)
        
        driver_name = payment['driver_name'].upper()[:22]
        driver_id = str(payment.get('driver_id', ''))
        receipt_number = payment.get('receipt_number', '')
        
        # Individual ID: DRV{driver_id}-R{receipt}
        individual_id = f"DRV{driver_id}-R{receipt_number}"[:15]
        
        # Generate trace number using company routing + sequence
        trace_number = f"{self.company_config['company_routing'][:8]}{sequence:07d}"
        
        batch.add_entry(
            transaction_code=self.TRANSACTION_CODE_CHECKING_CREDIT,
            receiving_dfi_identification=routing[:8],
            check_digit=routing[8],
            receiving_dfi_account_number=account,
            amount=amount_cents,
            individual_id_number=individual_id,
            individual_name=driver_name,
            trace_number=trace_number
        )
        
        logger.debug(
            f"Added payment entry for {driver_name}",
            extra={
                "driver_name": driver_name,
                "amount": float(amount_decimal),
                "routing": routing[:4] + "****",
                "account": "****" + account[-4:] if len(account) >= 4 else "****"
            }
        )
    
    def calculate_effective_date(self, batch_date: date) -> date:
        """
        Calculate ACH effective date (next business day)
        
        Args:
            batch_date: Batch creation date
            
        Returns:
            Effective entry date
        """
        from datetime import timedelta
        
        effective = batch_date + timedelta(days=1)
        
        # Skip weekends
        while effective.weekday() >= 5:  # Saturday = 5, Sunday = 6
            effective += timedelta(days=1)
        
        logger.debug(f"Calculated effective date: {effective}")
        
        return effective