# app/nach_batches/models.py
"""
NACH Batch Database Models

SQLAlchemy models for ACH batch tracking and management.
"""

from enum import Enum as PyEnum

from sqlalchemy import (
    Column, BigInteger, String, Date, DateTime, Integer, 
    Numeric, Boolean, Text, Enum, ForeignKey, Index
)
from sqlalchemy.orm import relationship

from app.core.db import Base
from app.users.models import AuditMixin


class ACHBatchStatus(str, PyEnum):
    """ACH Batch Status Enumeration"""
    CREATED = "CREATED"
    FILE_GENERATED = "FILE_GENERATED"
    SUBMITTED = "SUBMITTED"
    PROCESSED = "PROCESSED"
    FAILED = "FAILED"
    REVERSED = "REVERSED"


class ACHBatch(Base, AuditMixin):
    """
    ACH Batch Model
    
    Tracks ACH payment batches and their lifecycle from creation to bank processing.
    Each batch represents a group of driver payments processed together.
    """
    __tablename__ = "ach_batches"
    
    # Primary Key
    id = Column(
        BigInteger,
        primary_key=True,
        autoincrement=True,
        comment="Primary key, auto-increment"
    )
    
    # Batch Identification
    batch_number = Column(
        String(50),
        unique=True,
        nullable=False,
        index=True,
        comment="Unique batch ID (YYMM-NNN format)"
    )
    
    # Batch Dates
    batch_date = Column(
        Date,
        nullable=False,
        index=True,
        comment="When batch was created"
    )
    
    effective_date = Column(
        Date,
        nullable=False,
        comment="ACH effective date for bank processing"
    )
    
    # Batch Totals
    total_payments = Column(
        Integer,
        nullable=False,
        default=0,
        comment="Number of payments in batch"
    )
    
    total_amount = Column(
        Numeric(10, 2),
        nullable=False,
        default=0.00,
        comment="Sum of all payment amounts"
    )
    
    # Status Tracking
    status = Column(
        Enum(ACHBatchStatus),
        nullable=False,
        default=ACHBatchStatus.CREATED,
        index=True,
        comment="Current batch status"
    )
    
    # NACHA File Tracking
    nacha_file_generated = Column(
        Boolean,
        nullable=False,
        default=False,
        comment="Whether NACHA file has been created"
    )
    
    nacha_file_s3_key = Column(
        String(500),
        nullable=True,
        comment="S3 path to stored NACHA file"
    )
    
    nacha_file_generated_on = Column(
        DateTime,
        nullable=True,
        comment="Timestamp when NACHA file was created"
    )
    
    # Bank Submission Tracking
    submitted_to_bank = Column(
        Boolean,
        nullable=False,
        default=False,
        comment="Whether batch has been submitted for processing"
    )
    
    submitted_on = Column(
        DateTime,
        nullable=True,
        comment="When batch was submitted to bank"
    )
    
    submitted_by = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=True,
        comment="User who submitted to bank"
    )
    
    # Bank Processing
    bank_processed_on = Column(
        Date,
        nullable=True,
        comment="When bank completed processing"
    )
    
    bank_confirmation_number = Column(
        String(100),
        nullable=True,
        comment="Bank's confirmation reference number"
    )
    
    # Reversal Tracking
    reversed_on = Column(
        DateTime,
        nullable=True,
        comment="When batch was reversed"
    )
    
    reversed_by = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=True,
        comment="User who reversed the batch"
    )
    
    reversal_reason = Column(
        Text,
        nullable=True,
        comment="Reason for batch reversal"
    )
    
    # Relationships
    submitter = relationship(
        "User",
        foreign_keys=[submitted_by],
        backref="submitted_batches"
    )
    
    reverser = relationship(
        "User",
        foreign_keys=[reversed_by],
        backref="reversed_batches"
    )
    
    # Indexes
    __table_args__ = (
        Index('idx_ach_batch_date', 'batch_date'),
        Index('idx_ach_batch_status', 'status'),
        Index('idx_ach_batch_number', 'batch_number'),
    )
    
    def __repr__(self):
        return f"<ACHBatch(batch_number='{self.batch_number}', status='{self.status}', total_payments={self.total_payments}, total_amount={self.total_amount})>"