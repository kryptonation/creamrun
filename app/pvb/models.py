"""
app/pvb/models.py

SQLAlchemy models for PVB (Parking Violations Bureau) module
"""

from datetime import datetime
from decimal import Decimal
from enum import Enum as PyEnum

from sqlalchemy import (
    Integer, String, DateTime, Numeric, Text,
    Boolean, Enum, ForeignKey, Index
)
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class ImportSource(str, PyEnum):
    """ENum for source of imports"""
    DOF_CSV = "DOF_CSV"
    MANUAL_ENTRY = "MANUAL_ENTRY"
    API_IMPORT = "API_IMPORT"


class ImportStatus(str, PyEnum):
    """Enumeration for import status"""
    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    PARTIAL = "PARTIAL"
    FAILED = "FAILED"


class MappingMethod(str, PyEnum):
    """Enumeration for mapping method"""
    AUTO_CURB_MATCH = "AUTO_CURB_MATCH"
    MANUAL_ASSIGNMENT = "MANUAL_ASSIGNMENT"
    PLATE_ONLY = "PLATE_ONLY"
    UNKNOWN = "UNKNOWN"


class PostingStatus(str, PyEnum):
    """Enumeration for posting status"""
    NOT_POSTED = "NOT_POSTED"
    POSTED = "POSTED"
    VOIDED = "VOIDED"


class ViolationStatus(str, PyEnum):
    """Enumeration for violation status"""
    OPEN = "OPEN"
    PAID = "PAID"
    DISPUTED = "DISPUTED"
    DISMISSED = "DISMISSED"
    IN_JUDGMENT = "IN_JUDGMENT"


class ResolutionStatus(str, PyEnum):
    """Enumeration for Resolution status"""
    PENDING = "PENDING"
    RESOLVED = "RESOLVED"
    ESCALATED = "ESCALATED"


class PVBViolation(Base):
    """Model for storing violation record"""

    __tablename__ = "pvb_violations"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    summons_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    
    # Vehicle Information
    plate_number: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    state: Mapped[str] = mapped_column(String(2), nullable=True)
    vehicle_type: Mapped[str] = mapped_column(String(10), nullable=True)
    
    # Violation Details
    violation_code: Mapped[str] = mapped_column(String(10), nullable=True)
    violation_description: Mapped[str] = mapped_column(String(255), nullable=True)
    
    # Date and Time
    issue_date: Mapped[datetime] = mapped_column(DateTime, nullable=False, index=True)
    system_entry_date: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    
    # Location
    county: Mapped[str] = mapped_column(String(50), nullable=True)
    street_name: Mapped[str] = mapped_column(String(255), nullable=True)
    house_number: Mapped[str] = mapped_column(String(50), nullable=True)
    intersect_street: Mapped[str] = mapped_column(String(255), nullable=True)
    front_or_opposite: Mapped[str] = mapped_column(String(1), nullable=True)
    
    # Financial Information
    fine_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False, default=Decimal('0.00'))
    penalty_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False, default=Decimal('0.00'))
    interest_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False, default=Decimal('0.00'))
    reduction_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False, default=Decimal('0.00'))
    payment_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False, default=Decimal('0.00'))
    amount_due: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False, default=Decimal('0.00'))
    
    # Status Information
    judgment: Mapped[str] = mapped_column(String(50), nullable=True)
    penalty_warning: Mapped[str] = mapped_column(String(50), nullable=True)
    hearing_indicator: Mapped[str] = mapped_column(String(10), nullable=True)
    terminated: Mapped[str] = mapped_column(String(1), nullable=True)
    
    # Entity Associations
    vehicle_id: Mapped[int] = mapped_column(Integer, ForeignKey("vehicles.id"), nullable=True, index=True)
    driver_id: Mapped[int] = mapped_column(Integer, ForeignKey("drivers.id"), nullable=True, index=True)
    medallion_id: Mapped[int] = mapped_column(Integer, ForeignKey("medallions.id"), nullable=True, index=True)
    lease_id: Mapped[int] = mapped_column(Integer, ForeignKey("leases.id"), nullable=True, index=True)
    
    # Matching Metadata
    matched_curb_trip_id: Mapped[str] = mapped_column(String(50), nullable=True)
    mapping_method: Mapped[MappingMethod] = mapped_column(Enum(MappingMethod), nullable=False, default=MappingMethod.UNKNOWN)
    mapping_confidence: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=True)
    mapping_notes: Mapped[str] = mapped_column(Text, nullable=True)
    manually_assigned_by: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    manually_assigned_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    
    # Ledger Integration
    posted_to_ledger: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, index=True)
    ledger_balance_id: Mapped[str] = mapped_column(String(50), nullable=True)
    posting_status: Mapped[PostingStatus] = mapped_column(Enum(PostingStatus), nullable=False, default=PostingStatus.NOT_POSTED)
    posted_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    
    # Violation Status
    violation_status: Mapped[ViolationStatus] = mapped_column(Enum(ViolationStatus), nullable=False, default=ViolationStatus.OPEN)
    resolution_status: Mapped[ResolutionStatus] = mapped_column(Enum(ResolutionStatus), nullable=False, default=ResolutionStatus.PENDING)
    resolution_notes: Mapped[str] = mapped_column(Text, nullable=True)
    
    # Import Information
    import_batch_id: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    import_source: Mapped[ImportSource] = mapped_column(Enum(ImportSource), nullable=False)
    source_file_name: Mapped[str] = mapped_column(String(255), nullable=True)
    
    # Audit Fields
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    created_by: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=True, onupdate=datetime.utcnow)
    updated_by: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    
    __table_args__ = (
        Index('idx_pvb_issue_date_plate', 'issue_date', 'plate_number'),
        Index('idx_pvb_driver_lease', 'driver_id', 'lease_id'),
        Index('idx_pvb_posting_status', 'posting_status', 'posted_to_ledger'),
    )


class PVBImportHistory(Base):
    """Model to maintain records for PVB import"""

    __tablename__ = "pvb_import_history"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    batch_id: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    
    import_source: Mapped[ImportSource] = mapped_column(Enum(ImportSource), nullable=False)
    file_name: Mapped[str] = mapped_column(String(255), nullable=True)
    file_size_kb: Mapped[int] = mapped_column(Integer, nullable=True)
    
    date_from: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    date_to: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    plate_filter: Mapped[str] = mapped_column(String(20), nullable=True)
    
    total_records_in_file: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total_imported: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total_duplicates: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total_failed: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    
    auto_matched_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    plate_only_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    unmapped_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    
    posted_to_ledger_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    pending_posting_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    
    status: Mapped[ImportStatus] = mapped_column(Enum(ImportStatus), nullable=False, default=ImportStatus.PENDING)
    started_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    completed_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    duration_seconds: Mapped[int] = mapped_column(Integer, nullable=True)
    
    error_message: Mapped[str] = mapped_column(Text, nullable=True)
    error_details: Mapped[str] = mapped_column(Text, nullable=True)
    
    perform_matching: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    post_to_ledger: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    auto_match_threshold: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False, default=Decimal('0.90'))
    
    triggered_by: Mapped[str] = mapped_column(String(20), nullable=False)
    triggered_by_user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)


class PVBSummons(Base):
    """PVB Summon upload model"""

    __tablename__ = "pvb_summons"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    pvb_violation_id: Mapped[int] = mapped_column(Integer, ForeignKey("pvb_violations.id"), nullable=False, index=True)
    document_id: Mapped[int] = mapped_column(Integer, ForeignKey("documents.id"), nullable=False)
    summons_type: Mapped[str] = mapped_column(String(50), nullable=True)
    
    uploaded_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    uploaded_by: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    notes: Mapped[str] = mapped_column(Text, nullable=True)
    
    verified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    verified_by: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    verified_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)


class PVBImportFailure(Base):
    """PVB import failure model"""
    
    __tablename__ = "pvb_import_failures"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    import_batch_id: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    
    row_number: Mapped[int] = mapped_column(Integer, nullable=True)
    raw_data: Mapped[str] = mapped_column(Text, nullable=True)
    
    error_type: Mapped[str] = mapped_column(String(100), nullable=False)
    error_message: Mapped[str] = mapped_column(Text, nullable=False)
    field_name: Mapped[str] = mapped_column(String(100), nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)