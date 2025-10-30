"""
app/miscellaneous/models.py

SQLAlchemy models for Miscellaneous Charges module
Handles one-time charges applied to drivers for operational or penalty-related reasons
"""

from datetime import datetime
from decimal import Decimal
from typing import Optional
import enum

from sqlalchemy import (
    String, Integer, Numeric, DateTime, Text, Enum,
    ForeignKey, UniqueConstraint, Index
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base
from app.users.models import AuditMixin


class MiscChargeCategory(str, enum.Enum):
    """Categories for miscellaneous charges"""
    LOST_KEY = "LOST_KEY"
    CLEANING_FEE = "CLEANING_FEE"
    LATE_RETURN_FEE = "LATE_RETURN_FEE"
    ADMINISTRATIVE_FEE = "ADMINISTRATIVE_FEE"
    DAMAGE_FEE = "DAMAGE_FEE"
    DOCUMENT_FEE = "DOCUMENT_FEE"
    PROCESSING_FEE = "PROCESSING_FEE"
    PENALTY_FEE = "PENALTY_FEE"
    INSURANCE_DEDUCTIBLE = "INSURANCE_DEDUCTIBLE"
    EQUIPMENT_FEE = "EQUIPMENT_FEE"
    MISC_CHARGE = "MISC_CHARGE"
    ADJUSTMENT = "ADJUSTMENT"


class MiscChargeStatus(str, enum.Enum):
    """Status for miscellaneous charges"""
    PENDING = "PENDING"
    POSTED = "POSTED"
    VOIDED = "VOIDED"


class MiscellaneousCharge(Base, AuditMixin):
    """
    Model for miscellaneous charges applied to drivers.
    
    Represents one-time charges that are not part of standard modules
    (EZPass, PVB, TLC, Repairs, Driver Loans). These charges are recovered
    in full during the next DTR cycle.
    """
    
    __tablename__ = "miscellaneous_charges"
    
    # Primary Key
    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=True,
        comment="Primary key"
    )
    
    # Business ID
    expense_id: Mapped[str] = mapped_column(
        String(50), unique=True, nullable=False, index=True,
        comment="Unique identifier (ME-YYYY-NNNNNN)"
    )
    
    # Entity References
    driver_id: Mapped[int] = mapped_column(
        ForeignKey("drivers.id", ondelete="RESTRICT"),
        nullable=False, index=True,
        comment="Driver who is charged"
    )
    lease_id: Mapped[int] = mapped_column(
        ForeignKey("leases.id", ondelete="RESTRICT"),
        nullable=False, index=True,
        comment="Active lease at time of charge"
    )
    vehicle_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("vehicles.id", ondelete="SET NULL"),
        nullable=True, index=True,
        comment="Vehicle associated with charge"
    )
    medallion_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("medallions.id", ondelete="SET NULL"),
        nullable=True, index=True,
        comment="Medallion associated with charge"
    )
    
    # Charge Details
    category: Mapped[MiscChargeCategory] = mapped_column(
        Enum(MiscChargeCategory), nullable=False, index=True,
        comment="Type of miscellaneous charge"
    )
    charge_amount: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False,
        comment="Amount to be charged (positive or negative for credits)"
    )
    charge_date: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, index=True,
        comment="Date when charge was incurred"
    )
    
    # Payment Period
    payment_period_start: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, index=True,
        comment="Start of payment week (Sunday 00:00:00)"
    )
    payment_period_end: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, index=True,
        comment="End of payment week (Saturday 23:59:59)"
    )
    
    # Description
    description: Mapped[str] = mapped_column(
        Text, nullable=False,
        comment="Description of the charge"
    )
    notes: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True,
        comment="Internal notes about the charge"
    )
    reference_number: Mapped[Optional[str]] = mapped_column(
        String(100), nullable=True, index=True,
        comment="External reference number if applicable"
    )
    
    # Status Management
    status: Mapped[MiscChargeStatus] = mapped_column(
        Enum(MiscChargeStatus), nullable=False,
        default=MiscChargeStatus.PENDING, index=True,
        comment="Current status of the charge"
    )
    
    # Ledger Integration
    posted_to_ledger: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, index=True,
        comment="Posted to ledger flag (0=no, 1=yes)"
    )
    ledger_posting_id: Mapped[Optional[str]] = mapped_column(
        String(64), nullable=True, index=True,
        comment="Reference to ledger posting (LP-YYYY-NNNNNN)"
    )
    ledger_balance_id: Mapped[Optional[str]] = mapped_column(
        String(64), nullable=True, index=True,
        comment="Reference to ledger balance (LB-YYYY-NNNNNN)"
    )
    posted_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime, nullable=True,
        comment="When posted to ledger"
    )
    posted_by: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True,
        comment="User who posted to ledger"
    )
    
    # Void Management
    voided_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime, nullable=True,
        comment="When charge was voided"
    )
    voided_by: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True,
        comment="User who voided the charge"
    )
    voided_reason: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True,
        comment="Reason for voiding"
    )
    voided_ledger_posting_id: Mapped[Optional[str]] = mapped_column(
        String(64), nullable=True,
        comment="Reversal posting ID if voided"
    )
    
    # Relationships
    driver = relationship("Driver", foreign_keys=[driver_id])
    lease = relationship("Lease", foreign_keys=[lease_id])
    vehicle = relationship("Vehicle", foreign_keys=[vehicle_id])
    medallion = relationship("Medallion", foreign_keys=[medallion_id])
    poster = relationship("User", foreign_keys=[posted_by])
    voider = relationship("User", foreign_keys=[voided_by])
    
    # Indexes
    __table_args__ = (
        Index('idx_misc_charge_driver_lease', 'driver_id', 'lease_id'),
        Index('idx_misc_charge_period', 'payment_period_start', 'payment_period_end'),
        Index('idx_misc_charge_status_posted', 'status', 'posted_to_ledger'),
        Index('idx_misc_charge_date', 'charge_date'),
        UniqueConstraint('expense_id', name='uq_misc_charge_expense_id'),
    )
    
    def __repr__(self) -> str:
        return (
            f"<MiscellaneousCharge(id={self.id}, "
            f"expense_id='{self.expense_id}', "
            f"driver_id={self.driver_id}, "
            f"amount={self.charge_amount}, "
            f"status='{self.status}')>"
        )