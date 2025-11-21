# app/driver_payments/models.py

import enum
from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import (
    Integer, String, Numeric, Date, DateTime, ForeignKey, 
    Boolean, Text, Enum as SQLEnum
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