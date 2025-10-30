"""
DTR (Driver Transaction Receipt) Models

This module contains SQLAlchemy models for Driver Transaction Receipts (DTRs).
DTRs are generated weekly and represent the complete financial statement for 
a driver's lease period.

Tables:
    - driver_transaction_receipts: Main DTR records
    - dtr_additional_drivers: Additional driver DTR sections (for co-leases)
"""

import enum
from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import (
    Boolean, Date, DateTime, Enum, ForeignKey, 
    Integer, Numeric, String, Text, Index, CheckConstraint
)
from sqlalchemy.orm import relationship, Mapped, mapped_column

from app.core.db import Base
from app.users.models import AuditMixin


class DTRStatus(str, enum.Enum):
    """DTR generation and processing status"""
    DRAFT = "DRAFT"                    # Being generated
    PENDING = "PENDING"                # Generated, awaiting review
    APPROVED = "APPROVED"              # Approved for payment
    PAID = "PAID"                      # Payment completed
    VOIDED = "VOIDED"                  # Cancelled/voided
    ERROR = "ERROR"                    # Generation error


class PaymentType(str, enum.Enum):
    """Driver's payment method preference"""
    ACH = "ACH"                        # Direct deposit
    CHECK = "CHECK"                    # Paper check
    CASH = "CASH"                      # Cash payment
    HOLD = "HOLD"                      # Hold payment


class PaymentStatus(str, enum.Enum):
    """Payment processing status"""
    UNPAID = "UNPAID"                  # Not yet paid
    PROCESSING = "PROCESSING"          # In payment batch
    PAID = "PAID"                      # Payment completed
    FAILED = "FAILED"                  # Payment failed
    REVERSED = "REVERSED"              # Payment reversed


class DriverTransactionReceipt(Base, AuditMixin):
    """
    Main DTR record representing one week of driver financial activity.
    
    A DTR consolidates:
    - Credit card earnings from CURB trips
    - All deductions (taxes, tolls, violations, lease, repairs, loans, misc)
    - Payment hierarchy application
    - Net amount due to driver
    - Payment tracking (ACH batch or check number)
    
    Generated weekly on Sunday for the previous week (Sunday-Saturday).
    """
    __tablename__ = "driver_transaction_receipts"

    # Primary Key
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    
    # Unique Receipt Identifier
    receipt_number: Mapped[str] = mapped_column(
        String(50), 
        unique=True, 
        nullable=False,
        index=True,
        comment="Unique DTR identifier (format: DTR-YYYY-NNNNNN)"
    )
    
    # Foreign Keys - Lease Context
    driver_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("drivers.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
        comment="Primary driver (leaseholder)"
    )
    
    lease_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("leases.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
        comment="Associated lease agreement"
    )
    
    vehicle_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("vehicles.id", ondelete="SET NULL"),
        nullable=True,
        comment="Vehicle associated with lease"
    )
    
    medallion_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("medallions.id", ondelete="SET NULL"),
        nullable=True,
        comment="Medallion associated with lease"
    )
    
    # Payment Period (Always Sunday to Saturday)
    week_start_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
        index=True,
        comment="Payment period start (Sunday 00:00:00)"
    )
    
    week_end_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
        index=True,
        comment="Payment period end (Saturday 23:59:59)"
    )
    
    # Receipt Metadata
    receipt_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
        comment="Date DTR was generated"
    )
    
    dtr_status: Mapped[DTRStatus] = mapped_column(
        Enum(DTRStatus),
        nullable=False,
        default=DTRStatus.PENDING,
        index=True,
        comment="DTR processing status"
    )
    
    # =================================================================
    # EARNINGS SECTION
    # =================================================================
    
    # Credit Card Earnings (from CURB)
    cc_earnings: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
        default=Decimal("0.00"),
        comment="Total credit card earnings from CURB trips"
    )
    
    # Cash Earnings (tracked but not in DTR calculation)
    cash_earnings: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(10, 2),
        nullable=True,
        comment="Cash earnings (informational only)"
    )
    
    # Trip Statistics
    total_trips: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        comment="Total number of trips"
    )
    
    cc_trips: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        comment="Number of credit card trips"
    )
    
    cash_trips: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        comment="Number of cash trips"
    )
    
    # =================================================================
    # DEDUCTIONS SECTION (by category)
    # =================================================================
    
    # 1. TAXES (from CURB trips)
    taxes_total: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
        default=Decimal("0.00"),
        comment="Total taxes (MTA, TIF, Congestion, CBDT, Airport)"
    )
    
    tax_mta: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
        default=Decimal("0.00"),
        comment="MTA Surcharge"
    )
    
    tax_tif: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
        default=Decimal("0.00"),
        comment="Taxi Improvement Fund"
    )
    
    tax_congestion: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
        default=Decimal("0.00"),
        comment="Congestion Surcharge"
    )
    
    tax_cbdt: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
        default=Decimal("0.00"),
        comment="Central Business District Toll"
    )
    
    tax_airport: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
        default=Decimal("0.00"),
        comment="Airport Access Fee"
    )
    
    # 2. EZPASS TOLLS
    ezpass_total: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
        default=Decimal("0.00"),
        comment="Total EZPass tolls"
    )
    
    ezpass_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        comment="Number of EZPass transactions"
    )
    
    # 3. LEASE AMOUNT
    lease_total: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
        default=Decimal("0.00"),
        comment="Weekly lease amount"
    )
    
    # 4. PVB VIOLATIONS
    pvb_total: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
        default=Decimal("0.00"),
        comment="Total PVB violation amounts"
    )
    
    pvb_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        comment="Number of PVB violations"
    )
    
    # 5. TLC TICKETS
    tlc_total: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
        default=Decimal("0.00"),
        comment="Total TLC ticket amounts"
    )
    
    tlc_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        comment="Number of TLC tickets"
    )
    
    # 6. VEHICLE REPAIRS
    repairs_total: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
        default=Decimal("0.00"),
        comment="Total repair installments"
    )
    
    repairs_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        comment="Number of repair installments"
    )
    
    # 7. DRIVER LOANS
    loans_total: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
        default=Decimal("0.00"),
        comment="Total loan installments"
    )
    
    loans_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        comment="Number of loan installments"
    )
    
    # 8. MISCELLANEOUS CHARGES
    misc_total: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
        default=Decimal("0.00"),
        comment="Total miscellaneous charges"
    )
    
    misc_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        comment="Number of miscellaneous items"
    )
    
    # =================================================================
    # CALCULATED TOTALS
    # =================================================================
    
    # Total Deductions
    total_deductions: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
        default=Decimal("0.00"),
        comment="Sum of all deductions"
    )
    
    # Prior Balance (carried forward from previous week)
    prior_balance: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
        default=Decimal("0.00"),
        comment="Outstanding balance from previous periods"
    )
    
    # Interim Payments (received during the week)
    interim_payments: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
        default=Decimal("0.00"),
        comment="Payments received during payment period"
    )
    
    # Net Earnings (after deductions)
    net_earnings: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
        default=Decimal("0.00"),
        comment="CC Earnings - Total Deductions - Prior Balance + Interim Payments"
    )
    
    # Total Due to Driver (final amount)
    total_due_to_driver: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
        default=Decimal("0.00"),
        comment="Final amount owed to driver (0 if negative)"
    )
    
    # Carry Forward Balance (if driver owes money)
    carry_forward_balance: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
        default=Decimal("0.00"),
        comment="Negative balance carried to next week"
    )
    
    # =================================================================
    # PAYMENT TRACKING
    # =================================================================
    
    payment_type: Mapped[PaymentType] = mapped_column(
        Enum(PaymentType),
        nullable=False,
        default=PaymentType.ACH,
        comment="Payment method for this DTR"
    )
    
    payment_status: Mapped[PaymentStatus] = mapped_column(
        Enum(PaymentStatus),
        nullable=False,
        default=PaymentStatus.UNPAID,
        index=True,
        comment="Payment processing status"
    )
    
    # ACH Payment Tracking
    ach_batch_number: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
        index=True,
        comment="ACH batch number if paid via direct deposit (format: YYMM-XXX)"
    )
    
    ach_batch_date: Mapped[Optional[date]] = mapped_column(
        Date,
        nullable=True,
        comment="Date ACH batch was created"
    )
    
    # Check Payment Tracking
    check_number: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
        index=True,
        comment="Check number if paid via paper check"
    )
    
    check_date: Mapped[Optional[date]] = mapped_column(
        Date,
        nullable=True,
        comment="Date check was issued"
    )
    
    # Payment Date
    paid_date: Mapped[Optional[date]] = mapped_column(
        Date,
        nullable=True,
        index=True,
        comment="Date payment was completed"
    )
    
    # =================================================================
    # PDF & EMAIL TRACKING
    # =================================================================
    
    pdf_generated: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        comment="Whether PDF has been generated"
    )
    
    pdf_s3_key: Mapped[Optional[str]] = mapped_column(
        String(500),
        nullable=True,
        comment="S3 key for stored PDF file"
    )
    
    pdf_generated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="When PDF was generated"
    )
    
    email_sent: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        comment="Whether DTR email has been sent to driver"
    )
    
    email_sent_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="When email was sent"
    )
    
    # =================================================================
    # ADDITIONAL DRIVER TRACKING (Co-Lease)
    # =================================================================
    
    has_additional_drivers: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        comment="Whether this lease has additional drivers"
    )
    
    additional_drivers_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        comment="Number of additional drivers on this lease"
    )
    
    # =================================================================
    # NOTES & METADATA
    # =================================================================
    
    generation_notes: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        comment="Notes from DTR generation process"
    )
    
    adjustment_notes: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        comment="Manual adjustment notes"
    )
    
    internal_notes: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        comment="Internal notes (not shown to driver)"
    )
    
    # Voiding
    voided_reason: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        comment="Reason for voiding this DTR"
    )
    
    voided_by: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        comment="User who voided the DTR"
    )
    
    voided_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="When DTR was voided"
    )
    
    # =================================================================
    # AUDIT FIELDS
    # =================================================================
    
    generated_by: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        comment="User/system that generated this DTR"
    )
    
    approved_by: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        comment="User who approved this DTR"
    )
    
    approved_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="When DTR was approved"
    )
    
    # =================================================================
    # RELATIONSHIPS
    # =================================================================
    
    driver = relationship("Driver", foreign_keys=[driver_id], backref="dtrs")
    lease = relationship("Lease", foreign_keys=[lease_id], backref="dtrs")
    vehicle = relationship("Vehicle", foreign_keys=[vehicle_id])
    medallion = relationship("Medallion", foreign_keys=[medallion_id])
    
    additional_driver_sections = relationship(
        "DTRAdditionalDriver",
        back_populates="dtr",
        cascade="all, delete-orphan"
    )
    
    # =================================================================
    # CONSTRAINTS
    # =================================================================
    
    __table_args__ = (
        # Unique constraint: one DTR per driver per lease per week
        Index(
            'idx_dtr_unique_week',
            'driver_id', 'lease_id', 'week_start_date',
            unique=True
        ),
        
        # Check: week_end_date must be after week_start_date
        CheckConstraint(
            'week_end_date > week_start_date',
            name='chk_dtr_valid_week'
        ),
        
        # Check: total_due_to_driver cannot be negative
        CheckConstraint(
            'total_due_to_driver >= 0',
            name='chk_dtr_non_negative_due'
        ),
        
        # Performance indexes
        Index('idx_dtr_receipt_number', 'receipt_number'),
        Index('idx_dtr_driver_lease', 'driver_id', 'lease_id'),
        Index('idx_dtr_week_range', 'week_start_date', 'week_end_date'),
        Index('idx_dtr_status', 'dtr_status'),
        Index('idx_dtr_payment_status', 'payment_status'),
        Index('idx_dtr_ach_batch', 'ach_batch_number'),
        Index('idx_dtr_receipt_date', 'receipt_date'),
    )
    
    def __repr__(self):
        return (
            f"<DTR(receipt_number='{self.receipt_number}', "
            f"driver_id={self.driver_id}, "
            f"week={self.week_start_date} to {self.week_end_date}, "
            f"total_due={self.total_due_to_driver})>"
        )


class DTRAdditionalDriver(Base, AuditMixin):
    """
    Additional Driver DTR Section (for co-lease scenarios).
    
    When a lease has multiple drivers (co-lease), each additional driver
    gets their own section showing only their specific transactions:
    - Their trips and earnings
    - Their tolls (EZPass matched to their TLC license)
    - Their violations (PVB matched to their TLC license)
    - Their taxes (from their trips)
    
    Does NOT include:
    - Lease amount (main leaseholder responsibility)
    - TLC tickets (vehicle-level, not driver-specific)
    - Repairs (vehicle-level)
    - Miscellaneous (lease-level)
    """
    __tablename__ = "dtr_additional_drivers"
    
    # Primary Key
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    
    # Foreign Keys
    dtr_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("driver_transaction_receipts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="Parent DTR record"
    )
    
    driver_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("drivers.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
        comment="Additional driver"
    )
    
    # Driver Information
    driver_name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        comment="Additional driver's full name"
    )
    
    tlc_license: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
        comment="Additional driver's TLC license number"
    )
    
    # Sequence (for ordering multiple additional drivers)
    sequence: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=1,
        comment="Display order (1, 2, 3...)"
    )
    
    # =================================================================
    # EARNINGS (Additional Driver's portion)
    # =================================================================
    
    cc_earnings: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
        default=Decimal("0.00"),
        comment="Additional driver's credit card earnings"
    )
    
    total_trips: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        comment="Number of trips by this driver"
    )
    
    cc_trips: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        comment="Number of CC trips"
    )
    
    cash_trips: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        comment="Number of cash trips"
    )
    
    # =================================================================
    # DEDUCTIONS (Additional Driver's portion)
    # =================================================================
    
    # Taxes (from their trips)
    taxes_total: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
        default=Decimal("0.00"),
        comment="Taxes from additional driver's trips"
    )
    
    tax_mta: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
        default=Decimal("0.00")
    )
    
    tax_tif: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
        default=Decimal("0.00")
    )
    
    tax_congestion: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
        default=Decimal("0.00")
    )
    
    tax_cbdt: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
        default=Decimal("0.00")
    )
    
    tax_airport: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
        default=Decimal("0.00")
    )
    
    # EZPass (matched to their TLC license)
    ezpass_total: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
        default=Decimal("0.00"),
        comment="EZPass tolls attributed to this driver"
    )
    
    ezpass_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0
    )
    
    # PVB (matched to their TLC license)
    pvb_total: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
        default=Decimal("0.00"),
        comment="PVB violations attributed to this driver"
    )
    
    pvb_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0
    )
    
    # =================================================================
    # CALCULATED TOTALS
    # =================================================================
    
    total_deductions: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
        default=Decimal("0.00"),
        comment="Sum of taxes + ezpass + pvb"
    )
    
    prior_balance: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
        default=Decimal("0.00"),
        comment="Additional driver's prior balance"
    )
    
    net_earnings: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
        default=Decimal("0.00"),
        comment="CC Earnings - Deductions - Prior Balance"
    )
    
    total_due: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
        default=Decimal("0.00"),
        comment="Amount due to additional driver (0 if negative)"
    )
    
    # Notes
    notes: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        comment="Notes specific to additional driver section"
    )
    
    # =================================================================
    # RELATIONSHIPS
    # =================================================================
    
    dtr = relationship("DriverTransactionReceipt", back_populates="additional_driver_sections")
    driver = relationship("Driver", foreign_keys=[driver_id])
    
    # =================================================================
    # CONSTRAINTS
    # =================================================================
    
    __table_args__ = (
        # Unique: one section per additional driver per DTR
        Index(
            'idx_dtr_addl_unique',
            'dtr_id', 'driver_id',
            unique=True
        ),
        
        Index('idx_dtr_addl_dtr', 'dtr_id'),
        Index('idx_dtr_addl_driver', 'driver_id'),
        Index('idx_dtr_addl_sequence', 'dtr_id', 'sequence'),
    )
    
    def __repr__(self):
        return (
            f"<DTRAdditionalDriver(dtr_id={self.dtr_id}, "
            f"driver_id={self.driver_id}, "
            f"sequence={self.sequence}, "
            f"total_due={self.total_due})>"
        )