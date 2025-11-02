"""
app/ledger/models.py

Centralized Ledger Models - SQLAlchemy 2.x Style
Implements immutable double-entry accounting system.
"""

from typing import Optional
from datetime import datetime
from decimal import Decimal
from enum import Enum as PyEnum

from sqlalchemy import (
    DateTime, Enum, ForeignKey, Numeric,
    String, Text, Index, CheckConstraint, UniqueConstraint,
)
from sqlalchemy.orm import relationship, mapped_column, Mapped

from app.core.db import Base
from app.users.models import AuditMixin


# === ENUMS - Business Constraints ===

class PostingType(str, PyEnum):
    """Type of ledger posting - Double entry accounting."""
    DEBIT = "DEBIT"
    CREDIT = "CREDIT"


class PostingCategory(str, PyEnum):
    """Financial category for posting - Used for payment hierarchy"""
    EARNINGS = "EARNINGS"     # CURB credit card fares
    TAXES = "TAXES"          # MTA, TIF, Congestion, CBDT, Airport
    EZPASS = "EZPASS"        # Toll charges
    LEASE = "LEASE"          # Lease payments
    PVB = "PVB"              # Parking violations
    TLC = "TLC"              # TLC tickets
    REPAIRS = "REPAIRS"      # Vehicle repair charges
    LOANS = "LOANS"          # Driver loans
    DEPOSITS = "DEPOSITS"    # Security deposits
    MISC = "MISC"            # Miscellaneous charges


class PostingStatus(str, PyEnum):
    """Status of ledger posting."""
    PENDING = "PENDING"     # Not yet posted
    POSTED = "POSTED"       # Successfully posted
    VOIDED = "VOIDED"       # Reversed/Cancelled


class BalanceStatus(str, PyEnum):
    """Status of obligation balance."""
    OPEN = "OPEN"            # Outstanding obligation
    CLOSED = "CLOSED"        # Fully settled
    DISPUTED = "DISPUTED"    # Under dispute
    VOIDED = "VOIDED"        # Cancelled obligation


class PaymentReferenceType(str, PyEnum):
    """Type of payment/allocation reference."""
    DTR_ALLOCATION = "DTR_ALLOCATION"               # Weekly DTR allocation
    INTERIM_PAYMENT = "INTERIM_PAYMENT"             # Ad-hoc payment
    SCHEDULED_INSTALLMENT = "SCHEDULED_INSTALLMENT" # Loan/Repair installment
    MANUAL_ADJUSTMENT = "MANUAL_ADJUSTMENT"         # Manual adjustment
    VOID_REVERSAL = "VOID_REVERSAL"                 # Reversal entry


# === Ledger postings - Core transaction log ===

class LedgerPosting(Base, AuditMixin):
    """
    Immutable ledger postings - Single source of truth for all financial events
    
    Every financial transaction creates a posting record that NEVER gets deleted.
    Corrections are made through reversal postings (voiding).
    
    Design Principles:
    - IMMUTABILITY: Once posted, never modified or deleted
    - DOUBLE-ENTRY: Every DEBIT needs offsetting CREDIT eventually
    - AUDIT-TRAIL: Complete history with created_by, posted_by
    - MULTI-ENTITY: Links driver, lease, vehicle, medallion
    """
    __tablename__ = "ledger_postings"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    posting_id: Mapped[str] = mapped_column(
        String(64), nullable=False, index=True,
        comment="Unique posting ID (Format: LP-YYYY-NNNNNN)"
    )

    driver_id: Mapped[int] = mapped_column(
        ForeignKey("drivers.id", ondelete="RESTRICT"), nullable=False, index=True,
        comment="Driver responsible for this transaction"
    )
    lease_id: Mapped[int] = mapped_column(
        ForeignKey("leases.id", ondelete="RESTRICT"), nullable=False, index=True,
        comment="Lease context for this transaction"
    )
    vehicle_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("vehicles.id", ondelete="SET NULL"), nullable=True, index=True,
        comment="Associated vehicle (if applicable)"
    )
    medallion_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("medallions.id", ondelete="SET NULL"), nullable=True, index=True,
        comment="Associated medallion (if applicable)"
    )

    posting_type: Mapped[PostingType] = mapped_column(
        Enum(PostingType), nullable=False, index=True,
        comment="DEBIT (obligation) or CREDIT (payment/earning)"
    )
    category: Mapped[PostingCategory] = mapped_column(
        Enum(PostingCategory), nullable=False, index=True,
        comment="Financial category for payment hierarchy"
    )
    amount: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False, comment="Transaction amount (always positive)"
    )

    source_type: Mapped[str] = mapped_column(
        String(128), nullable=False, index=True,
        comment="Source system (e.g., CURB_TRIP, EZPASS_TRANSACTION, LEASE_SCHEDULE)"
    )
    source_id: Mapped[str] = mapped_column(
        String(128), nullable=False, index=True,
        comment="Source record ID"
    )

    payment_period_start: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, index=True,
        comment="Start of payment week (Sunday 00:00:00)"
    )
    payment_period_end: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, index=True,
        comment="End of payment week (Saturday 23:59:59)"
    )

    status: Mapped[PostingStatus] = mapped_column(
        Enum(PostingStatus), nullable=False, default=PostingStatus.PENDING,
        index=True, comment="Current status of posting"
    )
    posted_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime, nullable=True, comment="When posting was finalized"
    )
    posted_by: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True,
        comment="User who posted the transaction"
    )

    voided_by_posting_id: Mapped[Optional[str]] = mapped_column(
        String(64), ForeignKey("ledger_postings.posting_id", ondelete="SET NULL"),
        nullable=True, index=True, comment="Posting ID that voided this entry"
    )
    voided_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime, nullable=True, comment="When posting was voided"
    )
    void_reason: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True, comment="Reason for voting"
    )

    description: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True, comment="Human-readable description"
    )
    notes: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True, comment="Additional notes"
    )

    driver = relationship("Driver", foreign_keys=[driver_id])
    lease = relationship("Lease", foreign_keys=[lease_id])
    vehicle = relationship("Vehicle", foreign_keys=[vehicle_id])
    medallion = relationship("Medallion", foreign_keys=[medallion_id])
    posted_by_user = relationship("User", foreign_keys=[posted_by])

    voided_by_posting = relationship(
        "LedgerPosting", foreign_keys=[voided_by_posting_id], remote_side=[posting_id]
    )

    __table_args__ = (
        CheckConstraint('amount > 0', name='check_amount_positive'),
        UniqueConstraint('posting_id', name='uq_ledger_postings_posting_id'),
        Index('idx_posting_period', 'payment_period_start', 'payment_period_end'),
        Index('idx_posting_driver_lease', 'driver_id', 'lease_id'),
        Index('idx_posting_category_status', 'category', 'status'),
    )


# === Ledger Balances - Aggregated Obligations and Payment Tracking ===

class LedgerBalance(Base, AuditMixin):
    """
    Aggregated obligation balances with payment tracking
    
    Represents outstanding obligations that need to be paid.
    Updated as payments are applied.
    
    Design Principles:
    - DERIVED: Calculated from ledger postings
    - PAYMENT-TRACKING: Tracks payment application history
    - HIERARCHY: Supports payment hierarchy enforcement
    - FIFO: Oldest obligations paid first within category
    """
    
    __tablename__ = "ledger_balances"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    balance_id: Mapped[str] = mapped_column(
        String(64), unique=True, nullable=False, index=True,
        comment="Unique balance ID (Format: LB-YYYY-NNNNNN)"
    )

    driver_id: Mapped[int] = mapped_column(
        ForeignKey("drivers.id", ondelete="RESTRICT"), nullable=False, index=True,
    )
    lease_id: Mapped[int] = mapped_column(
        ForeignKey("leases.id", ondelete="RESTRICT"), nullable=False, index=True,
    )

    category: Mapped[PostingCategory] = mapped_column(
        Enum(PostingCategory), nullable=False, index=True,
        comment="Financial category for payment hierarchy"
    )

    reference_type: Mapped[str] = mapped_column(
        String(128), nullable=False,
        comment="Type of obligation (e.g., EZPASS_TRANSACTION, LEASE_SCHEDULE)"
    )
    reference_id: Mapped[str] = mapped_column(
        String(128), nullable=False, index=True,
        comment="Reference to source obligation record"
    )

    original_amount: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False, comment="Original obligation amount"
    )
    prior_balance: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False, default=Decimal("0.00"),
        comment="Balance brought forward from previous period"
    )
    current_amount: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False, comment="New charges for current period"
    )
    payment_applied: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False, default=Decimal("0.00"),
        comment="Total payments applied"
    )
    outstanding_balance: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False, comment="Remaining unpaid balance"
    )

    payment_period_start: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, index=True,
    )
    payment_period_end: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, index=True,
    )

    due_date: Mapped[Optional[datetime]] = mapped_column(
        DateTime, nullable=True, index=True, comment="When payment is due",
    )

    status: Mapped[BalanceStatus] = mapped_column(
        Enum(BalanceStatus), nullable=False, default=BalanceStatus.OPEN, index=True,
    )

    payment_reference: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True, comment="JSON array tracking payment application history"
    )

    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    driver = relationship("Driver", foreign_keys=[driver_id])
    lease = relationship("Lease", foreign_keys=[lease_id])

    __table_args__ = (
        CheckConstraint('original_amount >= 0', name='check_original_amount'),
        CheckConstraint('outstanding_balance >= 0', name='check_outstanding_balance'),
        Index('idx_balance_driver_lease_status', 'driver_id', 'lease_id', 'status'),
        Index('idx_balance_category_due_date', 'category', 'due_date'),
        Index('idx_balance_period', 'payment_period_start', 'payment_period_end'),
    )


# === Payment Allocations - Payment allocation history ===

class PaymentAllocation(Base, AuditMixin):
    """
    Tracks how payments are allocated to obligations
    
    Created whenever a payment is applied to a balance,
    maintaining complete audit trail of payment application.
    """
    
    __tablename__ = "payment_allocations"
    
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    allocation_id: Mapped[str] = mapped_column(
        String(64), unique=True, nullable=False, index=True,
        comment="Unique allocation ID (Format: PA-YYYY-NNNNNN)"
    )

    balance_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("ledger_balances.balance_id", ondelete="RESTRICT"),
        nullable=False, index=True, comment="Balance receiving payment"
    )
    payment_posting_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("ledger_postings.posting_id", ondelete="RESTRICT"),
        nullable=False, index=True, comment="Payment posting being applied"
    )

    amount_allocated: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False, comment="Amount applied to this balance"
    )
    allocation_type: Mapped[PaymentReferenceType] = mapped_column(
        Enum(PaymentReferenceType), nullable=False,
        comment="Type of payment allocation"
    )
    allocation_date: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=datetime.now, comment="When allocation was made"
    )

    notes: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True 
    )

    balance = relationship("LedgerBalance", foreign_keys=[balance_id])
    payment_posting = relationship("LedgerPosting", foreign_keys=[payment_posting_id])

    # ---- Database Constraints ----
    __table_args__ = (
        CheckConstraint('amount_allocated > 0', name='check_allocation_positive'),
        Index('idx_allocation_balance', 'balance_id', 'allocation_date'),
    )