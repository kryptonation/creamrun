# app/driver_loans/models.py

from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from enum import Enum

from sqlalchemy import (
    DECIMAL, Boolean, Date, DateTime, Enum as SQLEnum,
    ForeignKey, Integer, String, Text, CheckConstraint, Index
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base
from app.users.models import AuditMixin


class LoanStatus(str, Enum):
    """Loan status enumeration"""
    DRAFT = "DRAFT"
    ACTIVE = "ACTIVE"
    CLOSED = "CLOSED"
    ON_HOLD = "ON_HOLD"
    CANCELLED = "CANCELLED"


class InstallmentStatus(str, Enum):
    """Loan installment status enumeration"""
    SCHEDULED = "SCHEDULED"
    DUE = "DUE"
    POSTED = "POSTED"
    PAID = "PAID"
    SKIPPED = "SKIPPED"


class DriverLoan(Base, AuditMixin):
    """
    Driver Loans master table
    
    Manages personal loans extended to drivers with interest calculations
    and structured repayment schedules.
    """
    
    __tablename__ = "driver_loans"
    
    # Primary Key
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    
    # Unique Identifiers
    loan_id: Mapped[str] = mapped_column(
        String(50), unique=True, nullable=False, index=True,
        comment="Unique loan identifier (DL-YYYY-NNNN)"
    )
    loan_number: Mapped[Optional[str]] = mapped_column(
        String(50), nullable=True,
        comment="Display number for UI"
    )
    
    # Entity References
    driver_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("drivers.id"), nullable=False, index=True,
        comment="Borrower driver"
    )
    lease_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("leases.id"), nullable=False, index=True,
        comment="Associated lease"
    )
    
    # Financial Details
    loan_amount: Mapped[Decimal] = mapped_column(
        DECIMAL(10, 2), nullable=False,
        comment="Principal amount"
    )
    interest_rate: Mapped[Decimal] = mapped_column(
        DECIMAL(5, 2), nullable=False, default=Decimal('0.00'),
        comment="Annual percentage rate"
    )
    
    # Loan Details
    purpose: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True,
        comment="Reason for loan"
    )
    notes: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True,
        comment="Additional notes"
    )
    
    # Dates
    loan_date: Mapped[date] = mapped_column(
        Date, nullable=False, index=True,
        comment="When loan created"
    )
    start_week: Mapped[date] = mapped_column(
        Date, nullable=False, index=True,
        comment="Sunday when payments start"
    )
    end_week: Mapped[Optional[date]] = mapped_column(
        Date, nullable=True,
        comment="Estimated completion"
    )
    
    # Status
    status: Mapped[LoanStatus] = mapped_column(
        SQLEnum(LoanStatus), nullable=False, default=LoanStatus.ACTIVE, index=True,
        comment="Loan status"
    )
    
    # Payment Tracking
    total_principal_paid: Mapped[Decimal] = mapped_column(
        DECIMAL(10, 2), nullable=False, default=Decimal('0.00'),
        comment="Principal paid to date"
    )
    total_interest_paid: Mapped[Decimal] = mapped_column(
        DECIMAL(10, 2), nullable=False, default=Decimal('0.00'),
        comment="Interest paid to date"
    )
    outstanding_balance: Mapped[Decimal] = mapped_column(
        DECIMAL(10, 2), nullable=False,
        comment="Amount still owed"
    )
    
    # Approval
    approved_by: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=True,
        comment="User who approved"
    )
    approved_on: Mapped[Optional[datetime]] = mapped_column(
        DateTime, nullable=True,
        comment="Approval timestamp"
    )
    
    # Closure
    closed_on: Mapped[Optional[date]] = mapped_column(
        Date, nullable=True,
        comment="When fully paid"
    )
    closure_reason: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True,
        comment="Why closed"
    )
    
    # Relationships
    driver: Mapped["Driver"] = relationship(
        "Driver", foreign_keys=[driver_id], lazy="joined"
    )
    lease: Mapped["Lease"] = relationship(
        "Lease", foreign_keys=[lease_id], lazy="joined"
    )
    installments: Mapped[list["LoanSchedule"]] = relationship(
        "LoanSchedule", back_populates="loan", 
        cascade="all, delete-orphan",
        order_by="LoanSchedule.installment_number"
    )
    
    # Table constraints
    __table_args__ = (
        CheckConstraint('loan_amount > 0', name='check_loan_amount_positive'),
        CheckConstraint('interest_rate >= 0 AND interest_rate <= 100', name='check_interest_rate_range'),
        CheckConstraint('outstanding_balance >= 0', name='check_outstanding_balance_positive'),
        Index('idx_driver_lease', 'driver_id', 'lease_id'),
        Index('idx_status_start_week', 'status', 'start_week'),
    )
    
    def to_dict(self):
        """Convert model to dictionary"""
        return {
            "id": self.id,
            "loan_id": self.loan_id,
            "loan_number": self.loan_number,
            "driver_id": self.driver_id,
            "lease_id": self.lease_id,
            "loan_amount": float(self.loan_amount),
            "interest_rate": float(self.interest_rate),
            "purpose": self.purpose,
            "notes": self.notes,
            "loan_date": self.loan_date.isoformat() if self.loan_date else None,
            "start_week": self.start_week.isoformat() if self.start_week else None,
            "end_week": self.end_week.isoformat() if self.end_week else None,
            "status": self.status.value if self.status else None,
            "total_principal_paid": float(self.total_principal_paid),
            "total_interest_paid": float(self.total_interest_paid),
            "outstanding_balance": float(self.outstanding_balance),
            "approved_by": self.approved_by,
            "approved_on": self.approved_on.isoformat() if self.approved_on else None,
            "closed_on": self.closed_on.isoformat() if self.closed_on else None,
            "closure_reason": self.closure_reason,
            "created_on": self.created_on.isoformat() if self.created_on else None,
            "updated_on": self.updated_on.isoformat() if self.updated_on else None,
            "created_by": self.created_by,
        }


class LoanSchedule(Base, AuditMixin):
    """
    Loan Schedule table - Individual loan installments
    
    Each installment represents a weekly payment obligation with
    principal and interest components.
    """
    
    __tablename__ = "loan_schedules"
    
    # Primary Key
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    
    # Unique Identifier
    installment_id: Mapped[str] = mapped_column(
        String(50), unique=True, nullable=False, index=True,
        comment="Unique installment ID (loan_id-INST-NN)"
    )
    
    # Parent Reference
    loan_id: Mapped[str] = mapped_column(
        String(50), ForeignKey("driver_loans.loan_id", ondelete="CASCADE"),
        nullable=False, index=True,
        comment="Parent loan"
    )
    
    # Sequence
    installment_number: Mapped[int] = mapped_column(
        Integer, nullable=False,
        comment="Sequence number"
    )
    
    # Due Date
    due_date: Mapped[date] = mapped_column(
        Date, nullable=False, index=True,
        comment="When due"
    )
    
    # Payment Period
    week_start: Mapped[date] = mapped_column(
        Date, nullable=False,
        comment="Sunday of week"
    )
    week_end: Mapped[date] = mapped_column(
        Date, nullable=False,
        comment="Saturday of week"
    )
    
    # Financial Amounts
    principal_amount: Mapped[Decimal] = mapped_column(
        DECIMAL(10, 2), nullable=False,
        comment="Principal portion"
    )
    interest_amount: Mapped[Decimal] = mapped_column(
        DECIMAL(10, 2), nullable=False, default=Decimal('0.00'),
        comment="Interest portion"
    )
    total_due: Mapped[Decimal] = mapped_column(
        DECIMAL(10, 2), nullable=False,
        comment="Principal + Interest"
    )
    
    # Payment Tracking
    principal_paid: Mapped[Decimal] = mapped_column(
        DECIMAL(10, 2), nullable=False, default=Decimal('0.00'),
        comment="Principal paid"
    )
    interest_paid: Mapped[Decimal] = mapped_column(
        DECIMAL(10, 2), nullable=False, default=Decimal('0.00'),
        comment="Interest paid"
    )
    outstanding_balance: Mapped[Decimal] = mapped_column(
        DECIMAL(10, 2), nullable=False,
        comment="Amount still owed"
    )
    
    # Status
    status: Mapped[InstallmentStatus] = mapped_column(
        SQLEnum(InstallmentStatus), nullable=False, 
        default=InstallmentStatus.SCHEDULED, index=True,
        comment="Installment status"
    )
    
    # Ledger Integration
    ledger_balance_id: Mapped[Optional[str]] = mapped_column(
        String(50), nullable=True,
        comment="Reference to ledger balance"
    )
    posted_to_ledger: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, index=True,
        comment="Whether posted"
    )
    posted_on: Mapped[Optional[datetime]] = mapped_column(
        DateTime, nullable=True,
        comment="When posted"
    )
    posted_by: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=True,
        comment="User who posted"
    )
    
    # Relationships
    loan: Mapped["DriverLoan"] = relationship(
        "DriverLoan", back_populates="installments", foreign_keys=[loan_id]
    )
    
    # Table constraints
    __table_args__ = (
        CheckConstraint('principal_amount > 0', name='check_principal_positive'),
        CheckConstraint('interest_amount >= 0', name='check_interest_non_negative'),
        CheckConstraint('total_due = principal_amount + interest_amount', name='check_total_due_calculation'),
        CheckConstraint('outstanding_balance >= 0', name='check_installment_outstanding_positive'),
        Index('idx_loan_installment', 'loan_id', 'installment_number', unique=True),
        Index('idx_due_date_status', 'due_date', 'status'),
        Index('idx_week_period', 'week_start', 'week_end'),
        Index('idx_posted_status', 'posted_to_ledger', 'status'),
    )
    
    def to_dict(self):
        """Convert model to dictionary"""
        return {
            "id": self.id,
            "installment_id": self.installment_id,
            "loan_id": self.loan_id,
            "installment_number": self.installment_number,
            "due_date": self.due_date.isoformat() if self.due_date else None,
            "week_start": self.week_start.isoformat() if self.week_start else None,
            "week_end": self.week_end.isoformat() if self.week_end else None,
            "principal_amount": float(self.principal_amount),
            "interest_amount": float(self.interest_amount),
            "total_due": float(self.total_due),
            "principal_paid": float(self.principal_paid),
            "interest_paid": float(self.interest_paid),
            "outstanding_balance": float(self.outstanding_balance),
            "status": self.status.value if self.status else None,
            "ledger_balance_id": self.ledger_balance_id,
            "posted_to_ledger": self.posted_to_ledger,
            "posted_on": self.posted_on.isoformat() if self.posted_on else None,
            "posted_by": self.posted_by,
            "created_on": self.created_on.isoformat() if self.created_on else None,
            "updated_on": self.updated_on.isoformat() if self.updated_on else None,
        }