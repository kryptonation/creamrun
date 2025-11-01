# app/nach_batches/repository.py
"""
NACH Batch Repository

Data access layer for ACH batch operations.
"""

from datetime import date, datetime
from typing import List, Optional, Tuple

from sqlalchemy import func, desc
from sqlalchemy.orm import Session

from app.nach_batches.models import ACHBatch, ACHBatchStatus
from app.nach_batches.exceptions import BatchNotFoundException
from app.dtr.models import DTR
from app.utils.logger import get_logger

logger = get_logger(__name__)


class NACHBatchRepository:
    """Repository for NACH batch data access"""
    
    def __init__(self, db: Session):
        """
        Initialize repository
        
        Args:
            db: Database session
        """
        self.db = db
    
    def create_batch(
        self,
        batch_number: str,
        batch_date: date,
        effective_date: date,
        total_payments: int,
        total_amount: float,
        created_by: int
    ) -> ACHBatch:
        """
        Create a new ACH batch
        
        Args:
            batch_number: Unique batch identifier
            batch_date: Date batch was created
            effective_date: ACH effective date
            total_payments: Number of payments
            total_amount: Total batch amount
            created_by: User ID who created batch
            
        Returns:
            Created ACH batch
        """
        try:
            batch = ACHBatch(
                batch_number=batch_number,
                batch_date=batch_date,
                effective_date=effective_date,
                total_payments=total_payments,
                total_amount=total_amount,
                status=ACHBatchStatus.CREATED,
                created_by=created_by,
                created_on=datetime.now()
            )
            
            self.db.add(batch)
            self.db.flush()
            self.db.refresh(batch)
            
            logger.info(
                f"Created ACH batch {batch_number} with {total_payments} payments",
                extra={
                    "batch_id": batch.id,
                    "batch_number": batch_number,
                    "total_payments": total_payments,
                    "total_amount": float(total_amount),
                    "created_by": created_by
                }
            )
            
            return batch
            
        except Exception as e:
            logger.error(f"Failed to create ACH batch: {str(e)}", exc_info=True)
            raise
    
    def get_batch_by_id(self, batch_id: int) -> Optional[ACHBatch]:
        """
        Get batch by ID
        
        Args:
            batch_id: Batch ID
            
        Returns:
            ACH batch or None
        """
        try:
            batch = self.db.query(ACHBatch).filter(
                ACHBatch.id == batch_id
            ).first()
            
            if batch:
                logger.debug(f"Retrieved batch {batch.batch_number}")
            
            return batch
            
        except Exception as e:
            logger.error(f"Failed to retrieve batch {batch_id}: {str(e)}")
            raise
    
    def get_batch_by_number(self, batch_number: str) -> Optional[ACHBatch]:
        """
        Get batch by batch number
        
        Args:
            batch_number: Batch number
            
        Returns:
            ACH batch or None
        """
        try:
            return self.db.query(ACHBatch).filter(
                ACHBatch.batch_number == batch_number
            ).first()
            
        except Exception as e:
            logger.error(f"Failed to retrieve batch {batch_number}: {str(e)}")
            raise
    
    def get_batches_paginated(
        self,
        page: int = 1,
        page_size: int = 20,
        status: Optional[ACHBatchStatus] = None,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
        batch_number: Optional[str] = None,
        nacha_generated: Optional[bool] = None,
        submitted: Optional[bool] = None,
        sort_by: str = "batch_date",
        sort_order: str = "desc"
    ) -> Tuple[List[ACHBatch], int]:
        """
        Get paginated list of batches with filters
        
        Args:
            page: Page number
            page_size: Items per page
            status: Filter by status
            date_from: Filter by batch date from
            date_to: Filter by batch date to
            batch_number: Filter by batch number (partial match)
            nacha_generated: Filter by NACHA file generated
            submitted: Filter by submitted to bank
            sort_by: Sort field
            sort_order: Sort direction (asc/desc)
            
        Returns:
            Tuple of (batches list, total count)
        """
        try:
            query = self.db.query(ACHBatch)
            
            # Apply filters
            if status:
                query = query.filter(ACHBatch.status == status)
            
            if date_from:
                query = query.filter(ACHBatch.batch_date >= date_from)
            
            if date_to:
                query = query.filter(ACHBatch.batch_date <= date_to)
            
            if batch_number:
                query = query.filter(
                    ACHBatch.batch_number.ilike(f"%{batch_number}%")
                )
            
            if nacha_generated is not None:
                query = query.filter(
                    ACHBatch.nacha_file_generated == nacha_generated
                )
            
            if submitted is not None:
                query = query.filter(ACHBatch.submitted_to_bank == submitted)
            
            # Get total count
            total = query.count()
            
            # Apply sorting
            sort_column = getattr(ACHBatch, sort_by, ACHBatch.batch_date)
            if sort_order.lower() == "desc":
                query = query.order_by(desc(sort_column))
            else:
                query = query.order_by(sort_column)
            
            # Apply pagination
            offset = (page - 1) * page_size
            batches = query.offset(offset).limit(page_size).all()
            
            logger.debug(
                f"Retrieved {len(batches)} batches (page {page}, total {total})"
            )
            
            return batches, total
            
        except Exception as e:
            logger.error(f"Failed to retrieve batches: {str(e)}", exc_info=True)
            raise
    
    def update_batch_nacha_file_info(
        self,
        batch_id: int,
        s3_key: str,
        generated_on: datetime
    ) -> ACHBatch:
        """
        Update batch with NACHA file information
        
        Args:
            batch_id: Batch ID
            s3_key: S3 key for file
            generated_on: Generation timestamp
            
        Returns:
            Updated batch
        """
        try:
            batch = self.get_batch_by_id(batch_id)
            if not batch:
                raise BatchNotFoundException(f"Batch {batch_id} not found")
            
            batch.nacha_file_generated = True
            batch.nacha_file_s3_key = s3_key
            batch.nacha_file_generated_on = generated_on
            batch.status = ACHBatchStatus.FILE_GENERATED
            batch.updated_on = datetime.now()
            
            self.db.flush()
            self.db.refresh(batch)
            
            logger.info(
                f"Updated batch {batch.batch_number} with NACHA file info",
                extra={"batch_id": batch_id, "s3_key": s3_key}
            )
            
            return batch
            
        except Exception as e:
            logger.error(
                f"Failed to update batch NACHA file info: {str(e)}",
                exc_info=True
            )
            raise
    
    def update_batch_submission(
        self,
        batch_id: int,
        submitted_by: int,
        confirmation_number: Optional[str] = None
    ) -> ACHBatch:
        """
        Update batch submission information
        
        Args:
            batch_id: Batch ID
            submitted_by: User ID who submitted
            confirmation_number: Bank confirmation number
            
        Returns:
            Updated batch
        """
        try:
            batch = self.get_batch_by_id(batch_id)
            if not batch:
                raise BatchNotFoundException(f"Batch {batch_id} not found")
            
            batch.submitted_to_bank = True
            batch.submitted_on = datetime.now()
            batch.submitted_by = submitted_by
            batch.bank_confirmation_number = confirmation_number
            batch.status = ACHBatchStatus.SUBMITTED
            batch.updated_on = datetime.now()
            
            self.db.flush()
            self.db.refresh(batch)
            
            logger.info(
                f"Updated batch {batch.batch_number} submission info",
                extra={"batch_id": batch_id, "submitted_by": submitted_by}
            )
            
            return batch
            
        except Exception as e:
            logger.error(f"Failed to update batch submission: {str(e)}", exc_info=True)
            raise
    
    def update_batch_reversal(
        self,
        batch_id: int,
        reversed_by: int,
        reversal_reason: str
    ) -> ACHBatch:
        """
        Update batch with reversal information
        
        Args:
            batch_id: Batch ID
            reversed_by: User ID who reversed
            reversal_reason: Reason for reversal
            
        Returns:
            Updated batch
        """
        try:
            batch = self.get_batch_by_id(batch_id)
            if not batch:
                raise BatchNotFoundException(f"Batch {batch_id} not found")
            
            batch.reversed_on = datetime.now()
            batch.reversed_by = reversed_by
            batch.reversal_reason = reversal_reason
            batch.status = ACHBatchStatus.REVERSED
            batch.updated_on = datetime.now()
            
            self.db.flush()
            self.db.refresh(batch)
            
            logger.info(
                f"Updated batch {batch.batch_number} with reversal info",
                extra={"batch_id": batch_id, "reversed_by": reversed_by}
            )
            
            return batch
            
        except Exception as e:
            logger.error(f"Failed to update batch reversal: {str(e)}", exc_info=True)
            raise
    
    def get_next_batch_number(self, year_month: str) -> str:
        """
        Generate next batch number for the given year-month
        
        Args:
            year_month: Year-month in YYMM format
            
        Returns:
            Next batch number in YYMM-NNN format
        """
        try:
            # Get the last batch number for this year-month
            last_batch = self.db.query(ACHBatch).filter(
                ACHBatch.batch_number.like(f"{year_month}-%")
            ).order_by(desc(ACHBatch.batch_number)).first()
            
            if last_batch:
                # Extract sequence number and increment
                sequence = int(last_batch.batch_number.split('-')[1]) + 1
            else:
                sequence = 1
            
            batch_number = f"{year_month}-{sequence:03d}"
            
            logger.debug(f"Generated batch number: {batch_number}")
            
            return batch_number
            
        except Exception as e:
            logger.error(f"Failed to generate batch number: {str(e)}", exc_info=True)
            raise
    
    def get_batch_statistics(self) -> dict:
        """
        Get batch statistics
        
        Returns:
            Dictionary with statistics
        """
        try:
            total_batches = self.db.query(func.count(ACHBatch.id)).scalar()
            
            # Batches by status
            status_counts = self.db.query(
                ACHBatch.status,
                func.count(ACHBatch.id)
            ).group_by(ACHBatch.status).all()
            
            batches_by_status = {
                status.value: count for status, count in status_counts
            }
            
            # Total payments and amount
            totals = self.db.query(
                func.sum(ACHBatch.total_payments),
                func.sum(ACHBatch.total_amount)
            ).filter(
                ACHBatch.status != ACHBatchStatus.REVERSED
            ).first()
            
            total_payments_processed = totals[0] or 0
            total_amount_processed = totals[1] or 0
            
            # Pending counts
            pending_file = self.db.query(func.count(ACHBatch.id)).filter(
                ACHBatch.status == ACHBatchStatus.CREATED,
                ACHBatch.nacha_file_generated == False
            ).scalar()
            
            pending_submission = self.db.query(func.count(ACHBatch.id)).filter(
                ACHBatch.status == ACHBatchStatus.FILE_GENERATED,
                ACHBatch.submitted_to_bank == False
            ).scalar()
            
            return {
                "total_batches": total_batches,
                "batches_by_status": batches_by_status,
                "total_payments_processed": total_payments_processed,
                "total_amount_processed": float(total_amount_processed),
                "batches_pending_file_generation": pending_file,
                "batches_pending_submission": pending_submission
            }
            
        except Exception as e:
            logger.error(f"Failed to get batch statistics: {str(e)}", exc_info=True)
            raise
    
    def get_dtrs_by_batch(self, batch_number: str) -> List[DTR]:
        """
        Get all DTRs associated with a batch
        
        Args:
            batch_number: Batch number
            
        Returns:
            List of DTR records
        """
        try:
            dtrs = self.db.query(DTR).filter(
                DTR.batch_number == batch_number
            ).all()
            
            logger.debug(f"Retrieved {len(dtrs)} DTRs for batch {batch_number}")
            
            return dtrs
            
        except Exception as e:
            logger.error(f"Failed to retrieve DTRs for batch: {str(e)}", exc_info=True)
            raise