# app/dtr/models.py

from datetime import date, datetime
from decimal import Decimal
from typing import Optional
import enum

from sqlalchemy import (
    Integer, String, Date, DateTime, Numeric,
    ForeignKey, JSON, Enum as SQLEnum, Text, UniqueConstraint
)
from sqlalchemy.orm import relationship, Mapped, mapped_column

from app.core.db import Base
from app.users.models import AuditMixin


class DTRStatus(str, enum.Enum):
    """DTR Status enumeration"""
    DRAFT = "DRAFT"
    PENDING = "PENDING"
    FINALIZED = "FINALIZED"
    PAID = "PAID"
    VOIDED = "VOIDED"


class PaymentMethod(str, enum.Enum):
    """Payment method enumeration"""
    ACH = "ACH"
    CHECK = "CHECK"
    CASH = "CASH"
    DIRECT_DEPOSIT = "DIRECT_DEPOSIT"


class DTR(Base, AuditMixin):
    """
    Driver Transaction Report (DTR) model
    
    CRITICAL BUSINESS RULE: ONE DTR PER LEASE PER PERIOD
    
    Each lease generates exactly ONE DTR regardless of how many drivers operate it.
    - Primary driver (leaseholder) information is in the main fields
    - Additional drivers' details are stored in additional_drivers_detail JSON array
    - All earnings from all drivers are consolidated in the main earnings fields
    - Charge attribution follows business rules (primary vs additional)
    """
    
    __tablename__ = "dtrs"
    
    # Primary Key
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    
    # DTR Identification
    dtr_number: Mapped[str] = mapped_column(
        String(50), unique=True, index=True, 
        comment="Unique DTR number (BAT system generated)"
    )
    receipt_number: Mapped[str] = mapped_column(
        String(50), unique=True, index=True,
        comment="Receipt number for payment tracking"
    )
    
    # Period Information
    period_start_date: Mapped[date] = mapped_column(
        Date, nullable=False, index=True,
        comment="Payment period start (Sunday 00:00)"
    )
    period_end_date: Mapped[date] = mapped_column(
        Date, nullable=False, index=True,
        comment="Payment period end (Saturday 23:59)"
    )
    generation_date: Mapped[datetime] = mapped_column(
        DateTime, nullable=False,
        comment="Date and time DTR was generated"
    )
    
    # Lease and Entity References - CORRECTED: lease is primary, driver is the leaseholder
    lease_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("leases.id"), nullable=False, index=True,
        comment="Foreign key to lease (ONE DTR PER LEASE)"
    )
    driver_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("drivers.id"), nullable=False, index=True,
        comment="Primary driver (leaseholder) - for reference only"
    )
    vehicle_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("vehicles.id"), nullable=True, index=True
    )
    medallion_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("medallions.id"), nullable=True, index=True
    )
    
    # Status
    status: Mapped[DTRStatus] = mapped_column(
        SQLEnum(DTRStatus), nullable=False, default=DTRStatus.DRAFT, index=True
    )
    
    # CONSOLIDATED GROSS EARNINGS (from ALL drivers - primary + additional)
    gross_cc_earnings: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False, default=Decimal("0.00"),
        comment="Total credit card earnings from CURB (ALL drivers consolidated)"
    )
    gross_cash_earnings: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False, default=Decimal("0.00"),
        comment="Total cash earnings (if tracked)"
    )
    total_gross_earnings: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False, default=Decimal("0.00"),
        comment="Total gross earnings (CC + Cash)"
    )
    
    # DEDUCTIONS - Applied at lease level
    lease_amount: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False, default=Decimal("0.00"),
        comment="Weekly lease charge (primary driver only)"
    )
    mta_tif_fees: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False, default=Decimal("0.00"),
        comment="MTA, TIF, Congestion, CBDT, Airport fees (ALL drivers)"
    )
    ezpass_tolls: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False, default=Decimal("0.00"),
        comment="EZPass tolls (ALL drivers, outstanding as of period end)"
    )
    violation_tickets: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False, default=Decimal("0.00"),
        comment="PVB violations (ALL drivers, outstanding as of period end)"
    )
    tlc_tickets: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False, default=Decimal("0.00"),
        comment="TLC tickets (lease/medallion level only)"
    )
    repairs: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False, default=Decimal("0.00"),
        comment="Repair charges for this period (primary driver only)"
    )
    driver_loans: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False, default=Decimal("0.00"),
        comment="Loan installments due (primary driver only)"
    )
    misc_charges: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False, default=Decimal("0.00"),
        comment="Miscellaneous charges (primary driver only)"
    )
    
    # CALCULATED TOTALS
    subtotal_deductions: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False, default=Decimal("0.00"),
        comment="Sum of all deductions"
    )
    prior_balance: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False, default=Decimal("0.00"),
        comment="Balance carried forward from previous period"
    )
    net_earnings: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False, default=Decimal("0.00"),
        comment="Gross earnings - subtotal deductions - prior balance"
    )
    total_due_to_driver: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False, default=Decimal("0.00"),
        comment="Final amount due to driver (max of 0 and net_earnings)"
    )
    
    # Payment Information
    payment_method: Mapped[Optional[PaymentMethod]] = mapped_column(
        SQLEnum(PaymentMethod), nullable=True
    )
    payment_date: Mapped[Optional[datetime]] = mapped_column(
        DateTime, nullable=True
    )
    ach_batch_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("ach_batches.id"), nullable=True, index=True
    )
    ach_batch_number: Mapped[Optional[str]] = mapped_column(
        String(20), nullable=True, index=True
    )
    check_number: Mapped[Optional[str]] = mapped_column(
        String(50), nullable=True
    )
    account_number_masked: Mapped[Optional[str]] = mapped_column(
        String(20), nullable=True,
        comment="Last 4 digits of bank account (for security)"
    )
    
    # ADDITIONAL DRIVERS DETAIL - NEW STRUCTURE
    additional_drivers_detail: Mapped[Optional[dict]] = mapped_column(
        JSON, nullable=True,
        comment="""Array of additional driver detail sections. Each entry contains:
        {
            "driver_id": int,
            "driver_name": str,
            "tlc_license": str,
            "cc_earnings": decimal,
            "taxes_charges": {...},
            "ezpass_tolls": [...],
            "pvb_violations": [...],
            "trip_log": [...],
            "alerts": {...}
        }
        """
    )
    
    # Detailed Breakdown (JSON) - For PRIMARY driver and consolidated data
    tax_breakdown: Mapped[Optional[dict]] = mapped_column(
        JSON, nullable=True,
        comment="Detailed tax breakdown (Airport, CBDT, Congestion, MTA, TIF) - consolidated all drivers"
    )
    ezpass_detail: Mapped[Optional[dict]] = mapped_column(
        JSON, nullable=True,
        comment="EZPass transaction details - consolidated all drivers"
    )
    pvb_detail: Mapped[Optional[dict]] = mapped_column(
        JSON, nullable=True,
        comment="PVB violation details - consolidated all drivers"
    )
    tlc_detail: Mapped[Optional[dict]] = mapped_column(
        JSON, nullable=True,
        comment="TLC ticket details - lease level only"
    )
    repair_detail: Mapped[Optional[dict]] = mapped_column(
        JSON, nullable=True,
        comment="Repair invoice details - primary driver only"
    )
    loan_detail: Mapped[Optional[dict]] = mapped_column(
        JSON, nullable=True,
        comment="Loan installment details - primary driver only"
    )
    trip_log: Mapped[Optional[dict]] = mapped_column(
        JSON, nullable=True,
        comment="Credit card trip log from CURB - ALL drivers with TLC license identification"
    )
    
    # Alerts
    alerts: Mapped[Optional[dict]] = mapped_column(
        JSON, nullable=True,
        comment="Vehicle and driver alerts (expiry dates, etc.) - includes all drivers"
    )
    
    # Notes and Metadata
    notes: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True,
        comment="Additional notes or comments"
    )
    voided_reason: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True,
        comment="Reason if DTR was voided"
    )
    
    # Relationships
    lease = relationship("Lease", foreign_keys=[lease_id], back_populates="dtrs")
    driver = relationship("Driver", foreign_keys=[driver_id], back_populates="dtrs")
    vehicle = relationship("Vehicle", foreign_keys=[vehicle_id], back_populates="dtrs")
    medallion = relationship("Medallion", foreign_keys=[medallion_id], back_populates="dtrs")
    
    # Table constraints
    __table_args__ = (
        UniqueConstraint('lease_id', 'period_start_date', name='uq_dtr_lease_period'),
        {'comment': 'Driver Transaction Receipts - ONE DTR PER LEASE PER PERIOD'}
    )
    
    def to_dict(self):
        """Convert DTR to dictionary"""
        return {
            "id": self.id,
            "dtr_number": self.dtr_number,
            "receipt_number": self.receipt_number,
            "period_start_date": self.period_start_date.isoformat() if self.period_start_date else None,
            "period_end_date": self.period_end_date.isoformat() if self.period_end_date else None,
            "generation_date": self.generation_date.isoformat() if self.generation_date else None,
            "lease_id": self.lease_id,
            "driver_id": self.driver_id,
            "vehicle_id": self.vehicle_id,
            "medallion_id": self.medallion_id,
            "status": self.status.value if self.status else None,
            "gross_cc_earnings": float(self.gross_cc_earnings),
            "gross_cash_earnings": float(self.gross_cash_earnings),
            "total_gross_earnings": float(self.total_gross_earnings),
            "lease_amount": float(self.lease_amount),
            "mta_tif_fees": float(self.mta_tif_fees),
            "ezpass_tolls": float(self.ezpass_tolls),
            "violation_tickets": float(self.violation_tickets),
            "tlc_tickets": float(self.tlc_tickets),
            "repairs": float(self.repairs),
            "driver_loans": float(self.driver_loans),
            "misc_charges": float(self.misc_charges),
            "subtotal_deductions": float(self.subtotal_deductions),
            "prior_balance": float(self.prior_balance),
            "net_earnings": float(self.net_earnings),
            "total_due_to_driver": float(self.total_due_to_driver),
            "payment_method": self.payment_method.value if self.payment_method else None,
            "payment_date": self.payment_date.isoformat() if self.payment_date else None,
            "ach_batch_number": self.ach_batch_number,
            "check_number": self.check_number,
            "account_number_masked": self.account_number_masked,
            "additional_drivers_detail": self.additional_drivers_detail,
            "tax_breakdown": self.tax_breakdown,
            "ezpass_detail": self.ezpass_detail if isinstance(self.ezpass_detail, dict) else {},
            "pvb_detail": self.pvb_detail if isinstance(self.pvb_detail, dict) else {},
            "tlc_detail": self.tlc_detail if isinstance(self.tlc_detail, dict) else {},
            "repair_detail": self.repair_detail,
            "loan_detail": self.loan_detail,
            "trip_log": self.trip_log,
            "alerts": self.alerts,
            "notes": self.notes,
            "voided_reason": self.voided_reason,
            "created_on": self.created_on.isoformat() if self.created_on else None,
            "updated_on": self.updated_on.isoformat() if self.updated_on else None,
        }