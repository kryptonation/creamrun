# app/nach_batches/service.py
"""
NACH Batch Service

Business logic layer for ACH batch operations.
"""

from datetime import date, datetime
from typing import List, Tuple, Dict, Any

from sqlalchemy.orm import Session

from app.nach_batches.repository import NACHBatchRepository
from app.nach_batches.nacha_generator import NACHAGenerator
from app.nach_batches.models import ACHBatch, ACHBatchStatus
from app.nach_batches.schemas import (
    ACHBatchCreate,
    ACHBatchResponse,
    BatchDetailPayment,
    NACHAFileGenerateResponse,
    BatchReversalResponse
)
from app.nach_batches.exceptions import (
    BatchNotFoundException,
    InvalidBatchStateException,
    InvalidDTRException,
    EmptyBatchException,
    NACHAFileGenerationException
)
from app.dtr.models import DTR, DTRPaymentType
from app.drivers.models import Driver
from app.entities.models import BankAccount
from app.utils.logger import get_logger

logger = get_logger(__name__)


class NACHBatchService:
    """Service for NACH batch business logic"""
    
    def __init__(self, db: Session):
        """
        Initialize service
        
        Args:
            db: Database session
        """
        self.db = db
        self.repository = NACHBatchRepository(db)
    
    def create_ach_batch(
        self,
        request: ACHBatchCreate,
        created_by: int
    ) -> ACHBatchResponse:
        """
        Create a new ACH batch from selected DTRs
        
        Args:
            request: Batch creation request
            created_by: User ID creating the batch
            
        Returns:
            Created batch response
            
        Raises:
            InvalidDTRException: If DTRs are invalid for batching
            EmptyBatchException: If no valid DTRs provided
        """
        try:
            logger.info(
                f"Creating ACH batch with {len(request.dtr_ids)} DTRs",
                extra={"dtr_ids": request.dtr_ids, "created_by": created_by}
            )
            
            # Validate and retrieve DTRs
            dtrs = self._validate_and_get_dtrs(request.dtr_ids)
            
            if not dtrs:
                raise EmptyBatchException("No valid DTRs found for batch creation")
            
            # Calculate batch totals
            total_payments = len(dtrs)
            total_amount = sum(dtr.total_due for dtr in dtrs)
            
            # Generate batch number
            batch_date = date.today()
            year_month = batch_date.strftime("%y%m")
            batch_number = self.repository.get_next_batch_number(year_month)
            
            # Calculate effective date
            if request.effective_date:
                effective_date = request.effective_date
            else:
                nacha_gen = NACHAGenerator(self._get_company_config())
                effective_date = nacha_gen.calculate_effective_date(batch_date)
            
            # Create batch record
            batch = self.repository.create_batch(
                batch_number=batch_number,
                batch_date=batch_date,
                effective_date=effective_date,
                total_payments=total_payments,
                total_amount=float(total_amount),
                created_by=created_by
            )
            
            # Update DTRs with batch number
            self._assign_batch_to_dtrs(dtrs, batch_number)
            
            self.db.commit()
            
            logger.info(
                f"ACH batch {batch_number} created successfully",
                extra={
                    "batch_id": batch.id,
                    "batch_number": batch_number,
                    "total_payments": total_payments,
                    "total_amount": float(total_amount)
                }
            )
            
            return ACHBatchResponse.model_validate(batch)
            
        except (InvalidDTRException, EmptyBatchException):
            self.db.rollback()
            raise
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to create ACH batch: {str(e)}", exc_info=True)
            raise
    
    def _validate_and_get_dtrs(self, dtr_ids: List[int]) -> List[DTR]:
        """
        Validate and retrieve DTRs for batch creation
        
        Args:
            dtr_ids: List of DTR IDs
            
        Returns:
            List of valid DTR records
            
        Raises:
            InvalidDTRException: If any DTR is invalid
        """
        dtrs = self.db.query(DTR).filter(DTR.id.in_(dtr_ids)).all()
        
        if len(dtrs) != len(dtr_ids):
            found_ids = {dtr.id for dtr in dtrs}
            missing_ids = set(dtr_ids) - found_ids
            raise InvalidDTRException(
                f"DTRs not found: {missing_ids}"
            )
        
        # Validate each DTR
        for dtr in dtrs:
            # Must be ACH payment type
            if dtr.payment_type != DTRPaymentType.ACH:
                raise InvalidDTRException(
                    f"DTR {dtr.id} is not ACH payment type"
                )
            
            # Must not be already paid
            if dtr.batch_number:
                raise InvalidDTRException(
                    f"DTR {dtr.id} already assigned to batch {dtr.batch_number}"
                )
            
            # Must have positive amount due
            if dtr.total_due <= 0:
                raise InvalidDTRException(
                    f"DTR {dtr.id} has no amount due"
                )
            
            # Driver must have valid bank account info
            self._validate_driver_bank_info(dtr)
        
        logger.debug(f"Validated {len(dtrs)} DTRs for batch creation")
        
        return dtrs
    
    def _validate_driver_bank_info(self, dtr: DTR):
        """
        Validate driver has required bank account information
        
        Args:
            dtr: DTR record
            
        Raises:
            InvalidDTRException: If bank info is missing or invalid
        """
        driver = self.db.query(Driver).filter(Driver.id == dtr.driver_id).first()
        
        if not driver:
            raise InvalidDTRException(
                f"Driver not found for DTR {dtr.id}"
            )
        
        if not driver.bank_account_id:
            raise InvalidDTRException(
                f"Driver {driver.first_name} {driver.last_name} has no bank account configured"
            )
        
        bank_account = self.db.query(BankAccount).filter(
            BankAccount.id == driver.bank_account_id
        ).first()
        
        if not bank_account:
            raise InvalidDTRException(
                f"Bank account not found for driver {driver.first_name} {driver.last_name}"
            )
        
        # Validate routing number
        if not bank_account.bank_routing_number:
            raise InvalidDTRException(
                f"Driver {driver.first_name} {driver.last_name} is missing routing number"
            )
        
        routing = bank_account.bank_routing_number.strip()
        if len(routing) != 9 or not routing.isdigit():
            raise InvalidDTRException(
                f"Driver {driver.first_name} {driver.last_name} has invalid routing number format"
            )
        
        # Validate account number
        if not bank_account.bank_account_number:
            raise InvalidDTRException(
                f"Driver {driver.first_name} {driver.last_name} is missing account number"
            )
    
    def _assign_batch_to_dtrs(self, dtrs: List[DTR], batch_number: str):
        """
        Assign batch number to DTRs
        
        Args:
            dtrs: List of DTR records
            batch_number: Batch number to assign
        """
        for dtr in dtrs:
            dtr.batch_number = batch_number
            dtr.payment_date = date.today()
            dtr.updated_on = datetime.now()
        
        self.db.flush()
        
        logger.debug(f"Assigned batch {batch_number} to {len(dtrs)} DTRs")
    
    def generate_nacha_file(
        self,
        batch_id: int
    ) -> Tuple[NACHAFileGenerateResponse, bytes]:
        """
        Generate NACHA file for a batch
        
        Args:
            batch_id: Batch ID
            
        Returns:
            Tuple of (response, file_bytes)
            
        Raises:
            BatchNotFoundException: If batch not found
            InvalidBatchStateException: If batch not in correct state
            NACHAFileGenerationException: If file generation fails
        """
        try:
            # Get batch
            batch = self.repository.get_batch_by_id(batch_id)
            if not batch:
                raise BatchNotFoundException(f"Batch {batch_id} not found")
            
            # Validate batch state
            if batch.nacha_file_generated:
                raise InvalidBatchStateException(
                    f"NACHA file already generated for batch {batch.batch_number}"
                )
            
            logger.info(
                f"Generating NACHA file for batch {batch.batch_number}",
                extra={"batch_id": batch_id, "batch_number": batch.batch_number}
            )
            
            # Get DTRs for this batch
            dtrs = self.repository.get_dtrs_by_batch(batch.batch_number)
            
            if not dtrs:
                raise EmptyBatchException(
                    f"No DTRs found for batch {batch.batch_number}"
                )
            
            # Prepare payment data
            payments = self._prepare_payment_data(dtrs)
            
            # Generate NACHA file
            company_config = self._get_company_config()
            nacha_gen = NACHAGenerator(company_config)
            
            file_buffer = nacha_gen.generate_nacha_file(
                batch_number=batch.batch_number,
                payments=payments,
                effective_date=batch.effective_date
            )
            
            file_bytes = file_buffer.getvalue()
            file_size = len(file_bytes)
            
            # Update batch with file info
            s3_key = f"nacha/{batch.batch_number}.ach"
            generated_on = datetime.now()
            
            self.repository.update_batch_nacha_file_info(
                batch_id=batch_id,
                s3_key=s3_key,
                generated_on=generated_on
            )
            
            self.db.commit()
            
            logger.info(
                f"NACHA file generated successfully for batch {batch.batch_number}",
                extra={
                    "batch_id": batch_id,
                    "file_size_bytes": file_size,
                    "payment_count": len(payments)
                }
            )
            
            response = NACHAFileGenerateResponse(
                batch_number=batch.batch_number,
                file_name=f"{batch.batch_number}.ach",
                file_size_bytes=file_size,
                total_payments=batch.total_payments,
                total_amount=batch.total_amount,
                generated_on=generated_on,
                s3_key=s3_key
            )
            
            return response, file_bytes
            
        except (BatchNotFoundException, InvalidBatchStateException, EmptyBatchException):
            self.db.rollback()
            raise
        except Exception as e:
            self.db.rollback()
            logger.error(
                f"Failed to generate NACHA file: {str(e)}",
                exc_info=True
            )
            raise NACHAFileGenerationException(str(e))
    
    def _prepare_payment_data(self, dtrs: List[DTR]) -> List[Dict[str, Any]]:
        """
        Prepare payment data for NACHA file generation
        
        Args:
            dtrs: List of DTR records
            
        Returns:
            List of payment dictionaries
        """
        payments = []
        
        for dtr in dtrs:
            driver = self.db.query(Driver).filter(Driver.id == dtr.driver_id).first()
            bank_account = self.db.query(BankAccount).filter(
                BankAccount.id == driver.bank_account_id
            ).first()
            
            payment = {
                'dtr_id': dtr.id,
                'receipt_number': dtr.receipt_number,
                'driver_id': driver.id,
                'driver_name': f"{driver.first_name} {driver.last_name}",
                'routing_number': bank_account.bank_routing_number.strip(),
                'account_number': str(bank_account.bank_account_number).strip(),
                'amount': dtr.total_due,
                'week_end_date': dtr.period_end
            }
            
            payments.append(payment)
        
        logger.debug(f"Prepared {len(payments)} payment records for NACHA file")
        
        return payments
    
    def _get_company_config(self) -> Dict[str, Any]:
        """
        Get company configuration for NACHA file generation
        
        Returns:
            Company configuration dictionary
        """
        # In production, this should come from settings/database
        # For now, using placeholder values that should be configured
        return {
            'company_name': 'BIG APPLE TAXI',
            'company_tax_id': '1234567890',  # 10-digit tax ID
            'company_routing': '021000021',  # 9-digit routing number
            'company_account': '1234567890',
            'bank_name': 'CONNECTONE BANK'
        }
    
    def reverse_batch(
        self,
        batch_id: int,
        reversed_by: int,
        reversal_reason: str
    ) -> BatchReversalResponse:
        """
        Reverse an ACH batch
        
        Args:
            batch_id: Batch ID to reverse
            reversed_by: User ID performing reversal
            reversal_reason: Reason for reversal
            
        Returns:
            Reversal response
            
        Raises:
            BatchNotFoundException: If batch not found
            InvalidBatchStateException: If batch already reversed
        """
        try:
            # Get batch
            batch = self.repository.get_batch_by_id(batch_id)
            if not batch:
                raise BatchNotFoundException(f"Batch {batch_id} not found")
            
            # Check if already reversed
            if batch.status == ACHBatchStatus.REVERSED:
                raise InvalidBatchStateException(
                    f"Batch {batch.batch_number} is already reversed"
                )
            
            logger.info(
                f"Reversing batch {batch.batch_number}",
                extra={
                    "batch_id": batch_id,
                    "reversed_by": reversed_by,
                    "reason": reversal_reason
                }
            )
            
            # Get DTRs for this batch
            dtrs = self.repository.get_dtrs_by_batch(batch.batch_number)
            
            # Unmark DTRs
            for dtr in dtrs:
                dtr.batch_number = None
                dtr.payment_date = None
                dtr.updated_on = datetime.now()
            
            # Update batch
            self.repository.update_batch_reversal(
                batch_id=batch_id,
                reversed_by=reversed_by,
                reversal_reason=reversal_reason
            )
            
            self.db.commit()
            
            logger.info(
                f"Batch {batch.batch_number} reversed successfully",
                extra={
                    "batch_id": batch_id,
                    "payments_unmarked": len(dtrs)
                }
            )
            
            return BatchReversalResponse(
                batch_number=batch.batch_number,
                reversed_on=datetime.now(),
                reversed_by=reversed_by,
                reversal_reason=reversal_reason,
                payments_unmarked=len(dtrs)
            )
            
        except (BatchNotFoundException, InvalidBatchStateException):
            self.db.rollback()
            raise
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to reverse batch: {str(e)}", exc_info=True)
            raise
    
    def get_batch_detail(self, batch_id: int) -> Dict[str, Any]:
        """
        Get detailed batch information including all payments
        
        Args:
            batch_id: Batch ID
            
        Returns:
            Dictionary with batch info and payments
            
        Raises:
            BatchNotFoundException: If batch not found
        """
        try:
            batch = self.repository.get_batch_by_id(batch_id)
            if not batch:
                raise BatchNotFoundException(f"Batch {batch_id} not found")
            
            # Get DTRs
            dtrs = self.repository.get_dtrs_by_batch(batch.batch_number)
            
            # Build payment details
            payments = []
            for dtr in dtrs:
                driver = self.db.query(Driver).filter(Driver.id == dtr.driver_id).first()
                
                payment = BatchDetailPayment(
                    dtr_id=dtr.id,
                    receipt_number=dtr.receipt_number,
                    driver_name=f"{driver.first_name} {driver.last_name}" if driver else "Unknown",
                    tlc_license=driver.tlc_license.tlc_license_number if driver and driver.tlc_license else "",
                    medallion_number=dtr.medallion.medallion_number if dtr.medallion else "",
                    week_ending=dtr.period_end,
                    amount=dtr.total_due
                )
                payments.append(payment)
            
            return {
                'batch_info': ACHBatchResponse.model_validate(batch),
                'payments': payments
            }
            
        except BatchNotFoundException:
            raise
        except Exception as e:
            logger.error(f"Failed to get batch detail: {str(e)}", exc_info=True)
            raise
    
    def get_batches_paginated(
        self,
        page: int = 1,
        page_size: int = 20,
        **filters
    ) -> Tuple[List[ACHBatch], int]:
        """
        Get paginated list of batches
        
        Args:
            page: Page number
            page_size: Items per page
            **filters: Additional filters
            
        Returns:
            Tuple of (batches, total_count)
        """
        try:
            return self.repository.get_batches_paginated(
                page=page,
                page_size=page_size,
                **filters
            )
        except Exception as e:
            logger.error(f"Failed to get batches: {str(e)}", exc_info=True)
            raise
    
    def get_batch_statistics(self) -> Dict[str, Any]:
        """
        Get batch statistics
        
        Returns:
            Statistics dictionary
        """
        try:
            return self.repository.get_batch_statistics()
        except Exception as e:
            logger.error(f"Failed to get statistics: {str(e)}", exc_info=True)
            raise