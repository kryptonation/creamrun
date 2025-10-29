"""
app/interim_payments/models.py

Database models for Interim Payments module
Tracks ad-hoc payments made by drivers outside the weekly DTR cycle
"""

import enum
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import (
    Column, Integer, String, Numeric, DateTime, Enum as SQLEnum,
    ForeignKey, Text, Index
)
from sqlalchemy.orm import relationship

from app.core.db import Base
from app.users.models import AuditMixin
from app.utils.general import generate_random_string


class PaymentMethod(str, enum.Enum):
    """Payment method for interim payments"""
    CASH = "CASH"
    CHECK = "CHECK"
    ACH = "ACH"
    WIRE = "WIRE"
    CREDIT_CARD = "CREDIT_CARD"
    MONEY_ORDER = "MONEY_ORDER"


class PaymentStatus(str, enum.Enum):
    """Status of interim payment"""
    PENDING = "PENDING"          # Payment recorded but not yet posted to ledger
    POSTED = "POSTED"            # Successfully posted to ledger
    PARTIALLY_POSTED = "PARTIALLY_POSTED"  # Some allocations posted
    FAILED = "FAILED"            # Posting failed
    VOIDED = "VOIDED"            # Payment voided/reversed


class AllocationCategory(str, enum.Enum):
    """Categories for payment allocation"""
    LEASE = "LEASE"
    REPAIRS = "REPAIRS"
    LOANS = "LOANS"
    EZPASS = "EZPASS"
    PVB = "PVB"
    TLC = "TLC"
    MISC = "MISC"


class InterimPayment(Base, AuditMixin):
    """
    Interim Payment record - ad-hoc payments made by drivers
    Bypasses normal payment hierarchy and can be allocated to specific obligations
    """
    __tablename__ = "interim_payments"

    # Primary key
    id = Column(
        Integer,
        primary_key=True,
        index=True,
        comment="Auto-increment primary key"
    )
    
    # Unique payment identifier
    payment_id = Column(
        String(50),
        unique=True,
        nullable=False,
        index=True,
        default=lambda: f"IP-{datetime.now(timezone.utc).strftime('%Y')}-{generate_random_string(6, True)}",
        comment="Unique payment identifier (IP-YYYY-NNNNNN)"
    )
    
    # Driver and lease information
    driver_id = Column(
        Integer,
        ForeignKey("drivers.id"),
        nullable=False,
        index=True,
        comment="Reference to driver making payment"
    )
    
    lease_id = Column(
        Integer,
        ForeignKey("leases.id"),
        nullable=False,
        index=True,
        comment="Reference to active lease"
    )
    
    vehicle_id = Column(
        Integer,
        ForeignKey("vehicles.id"),
        nullable=True,
        index=True,
        comment="Reference to vehicle (optional)"
    )
    
    medallion_id = Column(
        Integer,
        ForeignKey("medallions.id"),
        nullable=True,
        index=True,
        comment="Reference to medallion (optional)"
    )
    
    # Payment details
    payment_date = Column(
        DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        comment="Date and time when payment was received"
    )
    
    payment_method = Column(
        SQLEnum(PaymentMethod),
        nullable=False,
        comment="Method of payment (Cash, Check, ACH, etc.)"
    )
    
    total_amount = Column(
        Numeric(10, 2),
        nullable=False,
        comment="Total payment amount received"
    )
    
    allocated_amount = Column(
        Numeric(10, 2),
        nullable=False,
        default=Decimal("0.00"),
        comment="Total amount allocated across obligations"
    )
    
    unallocated_amount = Column(
        Numeric(10, 2),
        nullable=False,
        default=Decimal("0.00"),
        comment="Amount not yet allocated (should be 0 after processing)"
    )
    
    # Payment reference details
    check_number = Column(
        String(100),
        nullable=True,
        comment="Check number if payment method is CHECK"
    )
    
    reference_number = Column(
        String(100),
        nullable=True,
        comment="Transaction reference (ACH confirmation, wire number, etc.)"
    )
    
    # Status tracking
    status = Column(
        SQLEnum(PaymentStatus),
        nullable=False,
        default=PaymentStatus.PENDING,
        index=True,
        comment="Current status of payment processing"
    )
    
    # Posting details
    posted_to_ledger = Column(
        Integer,
        nullable=False,
        default=0,
        comment="Flag: 1 = posted to ledger, 0 = not posted"
    )
    
    posted_at = Column(
        DateTime,
        nullable=True,
        comment="Timestamp when payment was posted to ledger"
    )
    
    posted_by = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=True,
        comment="User who posted the payment to ledger"
    )
    
    # Receipt information
    receipt_number = Column(
        String(50),
        unique=True,
        nullable=True,
        comment="Receipt number for driver records"
    )
    
    receipt_generated_at = Column(
        DateTime,
        nullable=True,
        comment="Timestamp when receipt was generated"
    )
    
    # Notes and description
    description = Column(
        Text,
        nullable=True,
        comment="Description of payment purpose"
    )
    
    notes = Column(
        Text,
        nullable=True,
        comment="Internal notes about the payment"
    )
    
    # Cashier information
    received_by = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=True,
        comment="Cashier/user who received the payment"
    )
    
    # Error tracking
    error_message = Column(
        Text,
        nullable=True,
        comment="Error message if posting failed"
    )
    
    # Voiding information
    voided_at = Column(
        DateTime,
        nullable=True,
        comment="Timestamp when payment was voided"
    )
    
    voided_by = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=True,
        comment="User who voided the payment"
    )
    
    voided_reason = Column(
        Text,
        nullable=True,
        comment="Reason for voiding the payment"
    )
    
    # Relationships
    driver = relationship("Driver", foreign_keys=[driver_id])
    lease = relationship("Lease", foreign_keys=[lease_id])
    vehicle = relationship("Vehicle", foreign_keys=[vehicle_id])
    medallion = relationship("Medallion", foreign_keys=[medallion_id])
    
    allocations = relationship(
        "PaymentAllocationDetail",
        back_populates="payment",
        cascade="all, delete-orphan"
    )
    
    received_by_user = relationship("User", foreign_keys=[received_by])
    posted_by_user = relationship("User", foreign_keys=[posted_by])
    voided_by_user = relationship("User", foreign_keys=[voided_by])
    
    # Indexes for performance
    __table_args__ = (
        Index('idx_interim_payment_driver_date', 'driver_id', 'payment_date'),
        Index('idx_interim_payment_lease_date', 'lease_id', 'payment_date'),
        Index('idx_interim_payment_status', 'status', 'posted_to_ledger'),
        Index('idx_interim_payment_date', 'payment_date'),
    )
    
    def __repr__(self):
        return f"<InterimPayment {self.payment_id} - Driver {self.driver_id} - ${self.total_amount}>"


class PaymentAllocationDetail(Base, AuditMixin):
    """
    Payment Allocation Detail - tracks how interim payment is split across obligations
    Each row represents allocation to one specific obligation
    """
    __tablename__ = "payment_allocation_details"
    
    # Primary key
    id = Column(
        Integer,
        primary_key=True,
        index=True,
        comment="Auto-increment primary key"
    )
    
    # Unique allocation identifier
    allocation_id = Column(
        String(50),
        unique=True,
        nullable=False,
        index=True,
        default=lambda: f"AL-{datetime.now(timezone.utc).strftime('%Y')}-{generate_random_string(6, True)}",
        comment="Unique allocation identifier (AL-YYYY-NNNNNN)"
    )
    
    # Link to parent payment
    payment_id = Column(
        Integer,
        ForeignKey("interim_payments.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="Reference to parent interim payment"
    )
    
    # Obligation details
    category = Column(
        SQLEnum(AllocationCategory),
        nullable=False,
        index=True,
        comment="Category of obligation being paid (Lease, Repair, Loan, etc.)"
    )
    
    ledger_balance_id = Column(
        String(50),
        nullable=True,
        index=True,
        comment="Reference to ledger balance being paid"
    )
    
    reference_type = Column(
        String(50),
        nullable=False,
        comment="Type of reference (REPAIR_INSTALLMENT, LOAN_INSTALLMENT, etc.)"
    )
    
    reference_id = Column(
        String(100),
        nullable=False,
        index=True,
        comment="ID of the specific obligation being paid"
    )
    
    # Amount details
    obligation_amount = Column(
        Numeric(10, 2),
        nullable=False,
        comment="Original obligation amount before payment"
    )
    
    allocated_amount = Column(
        Numeric(10, 2),
        nullable=False,
        comment="Amount allocated to this obligation"
    )
    
    remaining_balance = Column(
        Numeric(10, 2),
        nullable=False,
        comment="Balance remaining after this allocation"
    )
    
    # Posting details
    posted_to_ledger = Column(
        Integer,
        nullable=False,
        default=0,
        comment="Flag: 1 = posted to ledger, 0 = not posted"
    )
    
    ledger_posting_id = Column(
        String(50),
        nullable=True,
        comment="Reference to ledger posting created for this allocation"
    )
    
    posted_at = Column(
        DateTime,
        nullable=True,
        comment="Timestamp when allocation was posted to ledger"
    )
    
    # Descriptive information
    description = Column(
        Text,
        nullable=True,
        comment="Description of the obligation"
    )
    
    notes = Column(
        Text,
        nullable=True,
        comment="Internal notes about this allocation"
    )
    
    # Error tracking
    error_message = Column(
        Text,
        nullable=True,
        comment="Error message if posting failed"
    )
    
    # Sequence tracking
    allocation_sequence = Column(
        Integer,
        nullable=False,
        default=1,
        comment="Order of allocation within the payment"
    )
    
    # Relationship
    payment = relationship("InterimPayment", back_populates="allocations")
    
    # Indexes for performance
    __table_args__ = (
        Index('idx_allocation_payment', 'payment_id', 'allocation_sequence'),
        Index('idx_allocation_category_ref', 'category', 'reference_id'),
        Index('idx_allocation_ledger_balance', 'ledger_balance_id'),
        Index('idx_allocation_posted', 'posted_to_ledger', 'posted_at'),
    )
    
    def __repr__(self):
        return f"<AllocationDetail {self.allocation_id} - {self.category} - ${self.allocated_amount}>"