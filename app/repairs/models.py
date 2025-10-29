"""
app/repairs/models.py

Database models for Vehicle Repairs module
Manages repair invoices and their weekly installment schedules
"""

from decimal import Decimal
from enum import Enum

from sqlalchemy import (
    Column, Integer, String, Numeric, DateTime, Date,
    ForeignKey, Text, Enum as SQLEnum, Index
)
from sqlalchemy.orm import relationship

from app.core.db import Base
from app.users.models import AuditMixin


class WorkshopType(str, Enum):
    """Types of workshops that can perform repairs"""
    BIG_APPLE = "BIG_APPLE"
    EXTERNAL = "EXTERNAL"


class RepairStatus(str, Enum):
    """Status of repair invoice"""
    DRAFT = "DRAFT"
    OPEN = "OPEN"
    CLOSED = "CLOSED"
    HOLD = "HOLD"
    CANCELLED = "CANCELLED"


class InstallmentStatus(str, Enum):
    """Status of repair installment"""
    SCHEDULED = "SCHEDULED"
    DUE = "DUE"
    POSTED = "POSTED"
    PAID = "PAID"


class StartWeekOption(str, Enum):
    """Options for when repair repayment begins"""
    CURRENT = "CURRENT"
    NEXT = "NEXT"


class VehicleRepair(Base, AuditMixin):
    """
    Master repair invoice record
    Tracks repair invoice details and overall payment status
    """
    __tablename__ = "vehicle_repairs"

    repair_id = Column(
        String(50),
        primary_key=True,
        nullable=False,
        comment="Unique repair identifier (e.g., RPR-2025-001)"
    )
    
    # Entity linkage (from Driver & Lease selection)
    driver_id = Column(
        Integer,
        ForeignKey("drivers.id"),
        nullable=False,
        index=True,
        comment="Driver responsible for repair payment"
    )
    lease_id = Column(
        Integer,
        ForeignKey("leases.id"),
        nullable=False,
        index=True,
        comment="Active lease at time of repair"
    )
    vehicle_id = Column(
        Integer,
        ForeignKey("vehicles.id"),
        nullable=False,
        index=True,
        comment="Vehicle that was repaired"
    )
    medallion_id = Column(
        Integer,
        ForeignKey("medallions.id"),
        nullable=True,
        index=True,
        comment="Medallion associated with vehicle"
    )
    vin = Column(
        String(50),
        nullable=True,
        comment="Vehicle VIN number"
    )
    plate_number = Column(
        String(20),
        nullable=True,
        index=True,
        comment="Vehicle plate number"
    )
    hack_license = Column(
        String(50),
        nullable=True,
        comment="Driver TLC hack license number"
    )
    
    # Invoice details
    invoice_number = Column(
        String(100),
        nullable=False,
        index=True,
        comment="Repair invoice number from workshop"
    )
    invoice_date = Column(
        Date,
        nullable=False,
        index=True,
        comment="Date repair invoice was issued"
    )
    workshop_type = Column(
        SQLEnum(WorkshopType),
        nullable=False,
        comment="Big Apple Workshop or External Workshop"
    )
    repair_description = Column(
        Text,
        nullable=True,
        comment="Description of repair work performed"
    )
    repair_amount = Column(
        Numeric(10, 2),
        nullable=False,
        comment="Total repair invoice amount"
    )
    
    # Payment schedule configuration
    start_week = Column(
        SQLEnum(StartWeekOption),
        nullable=False,
        default=StartWeekOption.CURRENT,
        comment="When repayments begin (Current or Next period)"
    )
    start_week_date = Column(
        Date,
        nullable=False,
        comment="Actual Sunday date when first installment is due"
    )
    weekly_installment_amount = Column(
        Numeric(10, 2),
        nullable=False,
        comment="Standard weekly installment from payment matrix"
    )
    
    # Payment tracking
    total_paid = Column(
        Numeric(10, 2),
        nullable=False,
        default=Decimal("0.00"),
        comment="Total amount paid to date across all installments"
    )
    outstanding_balance = Column(
        Numeric(10, 2),
        nullable=False,
        comment="Remaining unpaid balance"
    )
    
    # Status and lifecycle
    status = Column(
        SQLEnum(RepairStatus),
        nullable=False,
        default=RepairStatus.DRAFT,
        index=True,
        comment="Current status of repair invoice"
    )
    hold_reason = Column(
        Text,
        nullable=True,
        comment="Reason if status is HOLD"
    )
    cancelled_reason = Column(
        Text,
        nullable=True,
        comment="Reason if status is CANCELLED"
    )
    
    # Document management
    invoice_document_id = Column(
        Integer,
        ForeignKey("document.id"),
        nullable=True,
        comment="Link to uploaded invoice document"
    )
    
    # Timestamps
    confirmed_at = Column(
        DateTime,
        nullable=True,
        comment="When invoice was confirmed and schedule generated"
    )
    closed_at = Column(
        DateTime,
        nullable=True,
        comment="When all installments were paid and balance = 0"
    )
    
    # Relationships
    installments = relationship(
        "RepairInstallment",
        back_populates="repair",
        cascade="all, delete-orphan",
        order_by="RepairInstallment.installment_number"
    )
    
    # Add indexes for common query patterns
    __table_args__ = (
        Index('idx_repairs_driver_status', 'driver_id', 'status'),
        Index('idx_repairs_lease_status', 'lease_id', 'status'),
        Index('idx_repairs_vehicle', 'vehicle_id'),
        Index('idx_repairs_invoice_date', 'invoice_date'),
    )
    
    def __repr__(self):
        return f"<VehicleRepair(repair_id={self.repair_id}, amount={self.repair_amount}, status={self.status})>"


class RepairInstallment(Base, AuditMixin):
    """
    Individual weekly installment for a repair invoice
    Each installment is posted to ledger when its payment period arrives
    """
    __tablename__ = "repair_installments"
    
    installment_id = Column(
        String(60),
        primary_key=True,
        nullable=False,
        comment="Unique installment ID (e.g., RPR-2025-001-01)"
    )
    repair_id = Column(
        String(50),
        ForeignKey("vehicle_repairs.repair_id"),
        nullable=False,
        index=True,
        comment="Parent repair invoice"
    )
    installment_number = Column(
        Integer,
        nullable=False,
        comment="Sequential number within repair (1, 2, 3...)"
    )
    
    # Entity references (denormalized for query performance)
    driver_id = Column(
        Integer,
        nullable=False,
        index=True,
        comment="Driver ID from parent repair"
    )
    lease_id = Column(
        Integer,
        nullable=False,
        index=True,
        comment="Lease ID from parent repair"
    )
    vehicle_id = Column(
        Integer,
        nullable=True,
        index=True,
        comment="Vehicle ID from parent repair"
    )
    medallion_id = Column(
        Integer,
        nullable=True,
        index=True,
        comment="Medallion ID from parent repair"
    )
    
    # Payment period
    week_start = Column(
        Date,
        nullable=False,
        index=True,
        comment="Sunday 00:00:00 - start of payment week"
    )
    week_end = Column(
        Date,
        nullable=False,
        comment="Saturday 23:59:59 - end of payment week"
    )
    due_date = Column(
        Date,
        nullable=False,
        index=True,
        comment="Due date for this installment (typically Saturday)"
    )
    
    # Amounts
    installment_amount = Column(
        Numeric(10, 2),
        nullable=False,
        comment="Amount due for this installment"
    )
    amount_paid = Column(
        Numeric(10, 2),
        nullable=False,
        default=Decimal("0.00"),
        comment="Amount actually paid for this installment"
    )
    prior_balance = Column(
        Numeric(10, 2),
        nullable=False,
        default=Decimal("0.00"),
        comment="Unpaid balance carried forward from previous periods"
    )
    balance = Column(
        Numeric(10, 2),
        nullable=False,
        comment="Remaining balance after this installment"
    )
    
    # Status and posting
    status = Column(
        SQLEnum(InstallmentStatus),
        nullable=False,
        default=InstallmentStatus.SCHEDULED,
        index=True,
        comment="Current status of installment"
    )
    posted_to_ledger = Column(
        Integer,
        nullable=False,
        default=0,
        index=True,
        comment="0=not posted, 1=posted to ledger"
    )
    ledger_posting_id = Column(
        String(50),
        nullable=True,
        comment="Ledger posting ID when posted"
    )
    ledger_balance_id = Column(
        String(50),
        nullable=True,
        comment="Ledger balance ID when posted"
    )
    posted_at = Column(
        DateTime,
        nullable=True,
        comment="Timestamp when posted to ledger"
    )
    
    # Relationships
    repair = relationship("VehicleRepair", back_populates="installments")
    
    # Add indexes for common query patterns
    __table_args__ = (
        Index('idx_installments_repair', 'repair_id', 'installment_number'),
        Index('idx_installments_driver_status', 'driver_id', 'status'),
        Index('idx_installments_week_start', 'week_start'),
        Index('idx_installments_unposted', 'posted_to_ledger', 'week_start'),
        Index('idx_installments_lease', 'lease_id', 'status'),
    )
    
    def __repr__(self):
        return f"<RepairInstallment(id={self.installment_id}, amount={self.installment_amount}, status={self.status})>"