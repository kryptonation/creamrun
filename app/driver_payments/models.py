# app/driver_payments/models.py

import enum
from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import (
    Integer, String, Numeric, Date, DateTime, ForeignKey, 
    Boolean, Text, Enum as SQLEnum, UniqueConstraint, Index
)
from sqlalchemy.orm import relationship, Mapped, mapped_column

from app.core.db import Base
from app.users.models import AuditMixin


class PaymentType(str, enum.Enum):
    """Payment method for driver"""
    ACH = "ACH"
    CHECK = "Check"


class DTRStatus(str, enum.Enum):
    """Status of Driver Transaction Receipt"""
    DRAFT = "DRAFT"
    GENERATED = "GENERATED"
    PAID = "PAID"
    VOID = "VOID"


class ACHBatchStatus(str, enum.Enum):
    """Status of ACH Batch"""
    DRAFT = "DRAFT"
    CONFIRMED = "CONFIRMED"
    NACHA_GENERATED = "NACHA_GENERATED"
    SUBMITTED = "SUBMITTED"
    REVERSED = "REVERSED"


class DriverTransactionReceipt(Base, AuditMixin):
    """
    Driver Transaction Receipt (DTR) - Weekly payment report for drivers.
    This is a VIEW of the Centralized Ledger, not source data.
    Generated every Sunday at 5:00 AM for the previous week (Sunday-Saturday).
    """
    __tablename__ = "driver_transaction_receipts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    receipt_number: Mapped[str] = mapped_column(
        String(20), unique=True, nullable=False, index=True,
        comment="Unique receipt identifier (format: RCPT-XXXXX)"
    )
    
    # Period Information
    week_start_date: Mapped[date] = mapped_column(
        Date, nullable=False, index=True,
        comment="Sunday 00:00 AM - start of payment period"
    )
    week_end_date: Mapped[date] = mapped_column(
        Date, nullable=False, index=True,
        comment="Saturday 11:59:59 PM - end of payment period"
    )
    generation_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False,
        comment="When this DTR was generated"
    )
    
    # Entity References
    driver_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("drivers.id", ondelete="CASCADE"), 
        nullable=False, index=True
    )
    lease_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("leases.id", ondelete="CASCADE"), 
        nullable=False, index=True
    )
    vehicle_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("vehicles.id", ondelete="SET NULL"), nullable=True
    )
    medallion_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("medallions.id", ondelete="SET NULL"), nullable=True
    )
    
    # Gross Earnings
    credit_card_earnings: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False, default=Decimal("0.00"),
        comment="Total CURB credit card earnings for the week"
    )
    
    # Deductions (from Centralized Ledger)
    lease_amount: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False, default=Decimal("0.00")
    )
    mta_fees_total: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False, default=Decimal("0.00"),
        comment="Sum of all MTA-related fees"
    )
    mta_fee_mta: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False, default=Decimal("0.00")
    )
    mta_fee_tif: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False, default=Decimal("0.00")
    )
    mta_fee_congestion: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False, default=Decimal("0.00")
    )
    mta_fee_crbt: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False, default=Decimal("0.00")
    )
    mta_fee_airport: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False, default=Decimal("0.00")
    )
    ezpass_tolls: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False, default=Decimal("0.00")
    )
    pvb_violations: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False, default=Decimal("0.00")
    )
    tlc_tickets: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False, default=Decimal("0.00")
    )
    repairs: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False, default=Decimal("0.00")
    )
    driver_loans: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False, default=Decimal("0.00")
    )
    misc_charges: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False, default=Decimal("0.00")
    )
    
    # Calculated Fields
    subtotal_deductions: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False, default=Decimal("0.00"),
        comment="Sum of all deductions"
    )
    net_earnings: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False, default=Decimal("0.00"),
        comment="credit_card_earnings - subtotal_deductions"
    )
    total_due_to_driver: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False, default=Decimal("0.00"),
        comment="Final amount owed to driver"
    )
    
    # Payment Information
    status: Mapped[DTRStatus] = mapped_column(
        SQLEnum(DTRStatus), nullable=False, default=DTRStatus.GENERATED, index=True
    )
    ach_batch_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("ach_batches.id", ondelete="SET NULL"), 
        nullable=True, index=True
    )
    check_number: Mapped[Optional[str]] = mapped_column(
        String(50), nullable=True, index=True,
        comment="Manual check number if paid by check"
    )
    payment_date: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    
    # Relationships
    driver = relationship("Driver", back_populates="transaction_receipts", foreign_keys=[driver_id])
    lease = relationship("Lease", back_populates="transaction_receipts", foreign_keys=[lease_id])
    vehicle = relationship("Vehicle", foreign_keys=[vehicle_id])
    medallion = relationship("Medallion", foreign_keys=[medallion_id])
    ach_batch = relationship("ACHBatch", back_populates="receipts", foreign_keys=[ach_batch_id])
    
    # Indexes for performance
    __table_args__ = (
        Index('idx_dtr_driver_lease', 'driver_id', 'lease_id'),
        Index('idx_dtr_week', 'week_start_date', 'week_end_date'),
        Index('idx_dtr_status_payment', 'status', 'ach_batch_id', 'check_number'),
        UniqueConstraint('driver_id', 'lease_id', 'week_start_date', name='uq_dtr_driver_lease_week'),
    )
    
    def __repr__(self):
        return f"<DTR {self.receipt_number} - Driver {self.driver_id} - ${self.total_due_to_driver}>"


class ACHBatch(Base, AuditMixin):
    """
    ACH Batch for processing multiple driver payments electronically.
    Batch numbers follow format: YYMM-XXX (e.g., 2510-001)
    """
    __tablename__ = "ach_batches"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    batch_number: Mapped[str] = mapped_column(
        String(20), unique=True, nullable=False, index=True,
        comment="Format: YYMM-XXX (e.g., 2510-001)"
    )
    
    # Batch Information
    batch_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False,
        comment="When the batch was created"
    )
    effective_date: Mapped[date] = mapped_column(
        Date, nullable=False,
        comment="Effective entry date for ACH processing"
    )
    status: Mapped[ACHBatchStatus] = mapped_column(
        SQLEnum(ACHBatchStatus), nullable=False, 
        default=ACHBatchStatus.DRAFT, index=True
    )
    
    # Financial Totals
    total_payments: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0,
        comment="Number of payments in batch"
    )
    total_amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False, default=Decimal("0.00"),
        comment="Total dollar amount of batch"
    )
    
    # NACHA File Information
    nacha_file_path: Mapped[Optional[str]] = mapped_column(
        String(500), nullable=True,
        comment="S3 path to generated NACHA file"
    )
    nacha_generated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    
    # Reversal Information
    is_reversed: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, index=True
    )
    reversed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    reversed_by: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    reversal_reason: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True
    )
    
    # Relationships
    receipts = relationship("DriverTransactionReceipt", back_populates="ach_batch")
    
    def __repr__(self):
        return f"<ACHBatch {self.batch_number} - {self.total_payments} payments - ${self.total_amount}>"


class CompanyBankConfiguration(Base, AuditMixin):
    """
    Company bank configuration for NACHA file generation.
    Stores sensitive banking information for ACH processing.
    """
    __tablename__ = "company_bank_configuration"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    
    # Company Information
    company_name: Mapped[str] = mapped_column(
        String(255), nullable=False,
        comment="Company name for NACHA file"
    )
    company_tax_id: Mapped[str] = mapped_column(
        String(10), nullable=False,
        comment="Company EIN or tax ID (10 digits)"
    )
    
    # Bank Information
    bank_name: Mapped[str] = mapped_column(
        String(255), nullable=False
    )
    bank_routing_number: Mapped[str] = mapped_column(
        String(9), nullable=False,
        comment="9-digit ABA routing number"
    )
    bank_account_number: Mapped[str] = mapped_column(
        String(17), nullable=False,
        comment="Company account number (up to 17 digits)"
    )
    
    # NACHA Configuration
    immediate_origin: Mapped[str] = mapped_column(
        String(10), nullable=False,
        comment="10-digit originator ID for NACHA"
    )
    immediate_destination: Mapped[str] = mapped_column(
        String(10), nullable=False,
        comment="10-digit destination routing for NACHA"
    )
    company_entry_description: Mapped[str] = mapped_column(
        String(10), nullable=False, default="DRVPAY",
        comment="Description for NACHA batch (max 10 chars)"
    )
    
    # Status
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True
    )
    
    def __repr__(self):
        return f"<CompanyBankConfig {self.company_name} - {self.bank_name}>"