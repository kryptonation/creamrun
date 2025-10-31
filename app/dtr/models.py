"""
app/dtr/models.py

Database models for DTR (Driver Transaction Report) system
"""

from datetime import datetime
from enum import Enum as PyEnum

from sqlalchemy import (
    Column, Integer, String, Date, DateTime, Numeric, Text, 
    ForeignKey, Enum, Index, CheckConstraint
)
from sqlalchemy.orm import relationship

from app.core.db import Base
from app.users.models import AuditMixin


class DTRStatus(str, PyEnum):
    """DTR generation status"""
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    GENERATED = "GENERATED"
    FAILED = "FAILED"
    VOIDED = "VOIDED"


class DTRPaymentType(str, PyEnum):
    """Payment type for DTR"""
    ACH = "ACH"
    CHECK = "CHECK"
    PENDING = "PENDING"


class DTR(Base, AuditMixin):
    """
    Driver Transaction Report model
    
    Represents a weekly DTR for a specific lease covering Sunday-Saturday period.
    One DTR per lease per week.
    """
    __tablename__ = "dtr"
    
    # Primary Key
    dtr_id = Column(String(50), primary_key=True, comment="Unique DTR identifier (DTR-{lease_id}-{period})")
    
    # Receipt Information
    receipt_number = Column(String(50), unique=True, nullable=False, index=True, comment="System-generated receipt number")
    receipt_date = Column(Date, nullable=False, comment="Date DTR was generated")
    
    # Period Information
    period_start = Column(Date, nullable=False, comment="Payment period start (Sunday)")
    period_end = Column(Date, nullable=False, comment="Payment period end (Saturday)")
    
    # Entity Relationships
    lease_id = Column(Integer, ForeignKey("leases.id"), nullable=False, index=True, comment="Associated lease")
    driver_id = Column(Integer, ForeignKey("drivers.id"), nullable=False, index=True, comment="Primary driver")
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=True, comment="Associated vehicle")
    medallion_id = Column(Integer, ForeignKey("medallions.id"), nullable=True, comment="Associated medallion")
    
    # Earnings
    cc_earnings = Column(Numeric(10, 2), nullable=False, default=0.00, comment="Credit card earnings")
    cash_earnings = Column(Numeric(10, 2), nullable=False, default=0.00, comment="Cash earnings (self-reported)")
    total_earnings = Column(Numeric(10, 2), nullable=False, default=0.00, comment="Total gross earnings")
    
    # Deductions
    taxes_amount = Column(Numeric(10, 2), nullable=False, default=0.00, comment="Total taxes (MTA, TIF, etc)")
    ezpass_amount = Column(Numeric(10, 2), nullable=False, default=0.00, comment="EZPass tolls")
    lease_amount = Column(Numeric(10, 2), nullable=False, default=0.00, comment="Weekly lease fee")
    pvb_amount = Column(Numeric(10, 2), nullable=False, default=0.00, comment="PVB violations")
    tlc_amount = Column(Numeric(10, 2), nullable=False, default=0.00, comment="TLC tickets")
    repairs_amount = Column(Numeric(10, 2), nullable=False, default=0.00, comment="Repair installments")
    loans_amount = Column(Numeric(10, 2), nullable=False, default=0.00, comment="Loan installments")
    misc_amount = Column(Numeric(10, 2), nullable=False, default=0.00, comment="Miscellaneous charges")
    total_deductions = Column(Numeric(10, 2), nullable=False, default=0.00, comment="Total deductions")
    
    # Balance Information
    prior_balance = Column(Numeric(10, 2), nullable=False, default=0.00, comment="Prior period balance carried forward")
    net_earnings = Column(Numeric(10, 2), nullable=False, default=0.00, comment="Earnings minus deductions")
    total_due = Column(Numeric(10, 2), nullable=False, default=0.00, comment="Net amount due to/from driver")
    
    # Payment Information
    payment_type = Column(Enum(DTRPaymentType), nullable=False, default=DTRPaymentType.PENDING, comment="Payment method")
    batch_number = Column(String(50), nullable=True, comment="ACH batch number or Check number")
    payment_date = Column(Date, nullable=True, comment="Date payment was processed")
    
    # Security Deposit
    deposit_amount = Column(Numeric(10, 2), nullable=False, default=0.00, comment="Security deposit on file")
    
    # PDF Storage
    pdf_s3_key = Column(String(500), nullable=True, comment="S3 key for generated PDF")
    pdf_url = Column(String(1000), nullable=True, comment="Presigned URL for PDF access")
    
    # Status
    status = Column(Enum(DTRStatus), nullable=False, default=DTRStatus.PENDING, index=True, comment="DTR status")
    
    # Audit Trail
    generated_at = Column(DateTime, nullable=True, comment="Timestamp when DTR was generated")
    generated_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True, comment="User who triggered generation")
    voided_at = Column(DateTime, nullable=True, comment="Timestamp when DTR was voided")
    voided_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True, comment="User who voided DTR")
    voided_reason = Column(Text, nullable=True, comment="Reason for voiding")
    
    # Relationships
    lease = relationship("Lease", foreign_keys=[lease_id])
    driver = relationship("Driver", foreign_keys=[driver_id])
    vehicle = relationship("Vehicle", foreign_keys=[vehicle_id])
    medallion = relationship("Medallion", foreign_keys=[medallion_id])
    generated_by = relationship("User", foreign_keys=[generated_by_user_id])
    voided_by = relationship("User", foreign_keys=[voided_by_user_id])
    
    # Table constraints
    __table_args__ = (
        CheckConstraint("period_start <= period_end", name="check_period_dates"),
        CheckConstraint("total_earnings >= 0", name="check_total_earnings_positive"),
        CheckConstraint("total_deductions >= 0", name="check_total_deductions_positive"),
        Index("idx_dtr_lease_period", "lease_id", "period_start", "period_end"),
        Index("idx_dtr_driver_period", "driver_id", "period_start", "period_end"),
        Index("idx_dtr_status_period", "status", "period_start"),
        {"comment": "Driver Transaction Reports - Weekly earnings and deductions summary"}
    )
    
    def __repr__(self):
        return f"<DTR(dtr_id='{self.dtr_id}', lease_id={self.lease_id}, period={self.period_start} to {self.period_end}, status='{self.status}')>"


class DTRGenerationHistory(Base, AuditMixin):
    """
    DTR Generation History
    
    Tracks each DTR generation attempt for audit and debugging
    """
    __tablename__ = "dtr_generation_history"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    
    # Generation Details
    generation_date = Column(DateTime, nullable=False, default=datetime.utcnow, comment="When generation was triggered")
    period_start = Column(Date, nullable=False, comment="Period start")
    period_end = Column(Date, nullable=False, comment="Period end")
    
    # Results
    total_dtrs_generated = Column(Integer, nullable=False, default=0, comment="Number of DTRs successfully generated")
    total_failed = Column(Integer, nullable=False, default=0, comment="Number of failed DTR generations")
    generation_time_seconds = Column(Numeric(10, 2), nullable=True, comment="Time taken for generation")
    
    # Status
    status = Column(String(50), nullable=False, comment="Overall generation status")
    error_message = Column(Text, nullable=True, comment="Error details if failed")
    
    # Triggered By
    triggered_by = Column(String(50), nullable=False, comment="CELERY_TASK or USER")
    triggered_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True, comment="User who triggered (if manual)")
    
    triggered_user = relationship("User", foreign_keys=[triggered_by_user_id])
    
    __table_args__ = (
        Index("idx_generation_history_date", "generation_date"),
        Index("idx_generation_history_period", "period_start", "period_end"),
        {"comment": "Audit trail for DTR generation runs"}
    )