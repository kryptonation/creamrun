# app/dtr/models.py

from datetime import date, datetime
from decimal import Decimal
from typing import Optional
import enum

from sqlalchemy import (
    Integer, String, Date, DateTime, Numeric, Boolean, 
    ForeignKey, JSON, Enum as SQLEnum, Text
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
    Represents a weekly payment report for a driver/lease
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
    
    # Foreign Keys
    lease_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("leases.id"), nullable=False, index=True
    )
    driver_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("drivers.id"), nullable=False, index=True
    )
    vehicle_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("vehicles.id"), nullable=True, index=True
    )
    medallion_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("medallions.id"), nullable=True, index=True
    )
    
    # DTR Status
    status: Mapped[DTRStatus] = mapped_column(
        SQLEnum(DTRStatus), nullable=False, default=DTRStatus.DRAFT, index=True
    )
    
    # Gross Earnings
    gross_cc_earnings: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False, default=Decimal("0.00"),
        comment="Total credit card earnings from CURB"
    )
    gross_cash_earnings: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False, default=Decimal("0.00"),
        comment="Total cash earnings (if tracked)"
    )
    total_gross_earnings: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False, default=Decimal("0.00"),
        comment="Total gross earnings"
    )
    
    # Deductions - Charges
    lease_amount: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False, default=Decimal("0.00")
    )
    mta_tif_fees: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False, default=Decimal("0.00"),
        comment="MTA, TIF, Congestion, CRBT, Airport fees"
    )
    ezpass_tolls: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False, default=Decimal("0.00")
    )
    violation_tickets: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False, default=Decimal("0.00"),
        comment="PVB violations"
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
    
    # Totals
    subtotal_charges: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False, default=Decimal("0.00"),
        comment="Sum of all charges"
    )
    prior_balance: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False, default=Decimal("0.00"),
        comment="Outstanding balance from previous periods"
    )
    
    # Net Calculation
    net_earnings: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False, default=Decimal("0.00"),
        comment="Gross earnings - subtotal - prior balance"
    )
    total_due_to_driver: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False, default=Decimal("0.00"),
        comment="Final amount payable to driver (can be negative)"
    )
    
    # Payment Information
    payment_method: Mapped[Optional[PaymentMethod]] = mapped_column(
        SQLEnum(PaymentMethod), nullable=True
    )
    payment_date: Mapped[Optional[datetime]] = mapped_column(
        DateTime, nullable=True,
        comment="Date payment was processed"
    )
    ach_batch_number: Mapped[Optional[str]] = mapped_column(
        String(50), nullable=True, index=True,
        comment="ACH batch number if paid via ACH"
    )
    check_number: Mapped[Optional[str]] = mapped_column(
        String(50), nullable=True,
        comment="Check number if paid by check"
    )
    account_number_masked: Mapped[Optional[str]] = mapped_column(
        String(20), nullable=True,
        comment="Last 4 digits of bank account (for security)"
    )
    
    # Additional Driver Flag
    is_additional_driver_dtr: Mapped[bool] = mapped_column(
        Boolean, default=False,
        comment="True if this is an additional driver DTR"
    )
    parent_dtr_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("dtrs.id"), nullable=True,
        comment="Reference to primary DTR if this is additional driver"
    )
    
    # Detailed Breakdown (JSON)
    tax_breakdown: Mapped[Optional[dict]] = mapped_column(
        JSON, nullable=True,
        comment="Detailed tax breakdown (Airport, CBDT, Congestion, MTA, TIF)"
    )
    ezpass_detail: Mapped[Optional[dict]] = mapped_column(
        JSON, nullable=True,
        comment="EZPass transaction details"
    )
    pvb_detail: Mapped[Optional[dict]] = mapped_column(
        JSON, nullable=True,
        comment="PVB violation details"
    )
    tlc_detail: Mapped[Optional[dict]] = mapped_column(
        JSON, nullable=True,
        comment="TLC ticket details"
    )
    repair_detail: Mapped[Optional[dict]] = mapped_column(
        JSON, nullable=True,
        comment="Repair invoice details"
    )
    loan_detail: Mapped[Optional[dict]] = mapped_column(
        JSON, nullable=True,
        comment="Loan installment details"
    )
    trip_log: Mapped[Optional[dict]] = mapped_column(
        JSON, nullable=True,
        comment="Credit card trip log from CURB"
    )
    
    # Alerts
    alerts: Mapped[Optional[dict]] = mapped_column(
        JSON, nullable=True,
        comment="Vehicle and driver alerts (expiry dates, etc.)"
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
    
    # Self-referential relationships for parent/child DTRs
    additional_driver_dtrs = relationship(
        "DTR", 
        back_populates="parent_dtr",
        remote_side=[id]
    )
    parent_dtr = relationship(
        "DTR",
        back_populates="additional_driver_dtrs",
        remote_side=[parent_dtr_id]
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
            "total_gross_earnings": float(self.total_gross_earnings),
            "lease_amount": float(self.lease_amount),
            "mta_tif_fees": float(self.mta_tif_fees),
            "ezpass_tolls": float(self.ezpass_tolls),
            "violation_tickets": float(self.violation_tickets),
            "tlc_tickets": float(self.tlc_tickets),
            "repairs": float(self.repairs),
            "driver_loans": float(self.driver_loans),
            "misc_charges": float(self.misc_charges),
            "subtotal_charges": float(self.subtotal_charges),
            "prior_balance": float(self.prior_balance),
            "net_earnings": float(self.net_earnings),
            "total_due_to_driver": float(self.total_due_to_driver),
            "payment_method": self.payment_method.value if self.payment_method else None,
            "payment_date": self.payment_date.isoformat() if self.payment_date else None,
            "ach_batch_number": self.ach_batch_number,
            "check_number": self.check_number,
            "is_additional_driver_dtr": self.is_additional_driver_dtr,
            "created_on": self.created_on.isoformat() if self.created_on else None,
            "updated_on": self.updated_on.isoformat() if self.updated_on else None,
        }
    
    def __repr__(self):
        return f"<DTR(dtr_number='{self.dtr_number}', driver_id={self.driver_id}, period={self.period_start_date} to {self.period_end_date})>"