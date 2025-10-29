"""
app/pvb/models.py

Database models for PVB (Parking Violations Bureau) violations
"""

from datetime import datetime
from decimal import Decimal
from enum import Enum as PyEnum

from sqlalchemy import (
    Integer, String, DateTime, Numeric, Boolean,
    ForeignKey, Text, Enum, Index, CheckConstraint,
    UniqueConstraint
)
from sqlalchemy.orm import relationship, Mapped, mapped_column

from app.core.db import Base
from app.users.models import AuditMixin


# === Enums ===

class ViolationSource(str, PyEnum):
    """Source of PVB violation"""
    DOF_CSV = "DOF_CSV"  # NYC Department of Finance CSV
    MANUAL_ENTRY = "MANUAL_ENTRY"  # Manual entry for out-of-state
    EMAIL = "EMAIL"  # Email notification
    MAIL = "MAIL"  # Regular mail


class ViolationState(str, PyEnum):
    """State where violation occurred"""
    NY = "NY"  # New York
    NJ = "NJ"  # New Jersey
    CT = "CT"  # Connecticut
    PA = "PA"  # Pennsylvania
    OTHER = "OTHER"  # Other states


class ViolationStatus(str, PyEnum):
    """Status of violation"""
    PENDING = "PENDING"  # Not yet issued
    ISSUED = "ISSUED"  # Violation issued
    PAID = "PAID"  # Violation paid
    DISMISSED = "DISMISSED"  # Violation dismissed
    HEARING = "HEARING"  # Under hearing


class MappingMethod(str, PyEnum):
    """Method used to map violation to driver"""
    AUTO_CURB_MATCH = "AUTO_CURB_MATCH"  # Automatically matched via CURB trips
    MANUAL_ASSIGNMENT = "MANUAL_ASSIGNMENT"  # Manually assigned by staff
    UNMAPPED = "UNMAPPED"  # Not yet mapped


class PostingStatus(str, PyEnum):
    """Ledger posting status"""
    NOT_POSTED = "NOT_POSTED"  # Not posted to ledger
    POSTED = "POSTED"  # Posted to ledger
    FAILED = "FAILED"  # Posting failed


class ImportStatus(str, PyEnum):
    """Import batch status"""
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    PARTIAL = "PARTIAL"  # Some records failed
    FAILED = "FAILED"


# === PVB Violations Model ===

class PVBViolation(Base, AuditMixin):
    """
    PVB (Parking Violations Bureau) violations
    
    Tracks parking and traffic violations from NYC DOF and other sources.
    Maps violations to drivers via CURB trip correlation (time-window matching).
    """
    
    __tablename__ = "pvb_violations"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    
    # Violation identification
    summons_number: Mapped[str] = mapped_column(
        String(64), nullable=False, index=True, unique=True,
        comment="Unique summons/ticket number from DOF"
    )
    plate_number: Mapped[str] = mapped_column(
        String(16), nullable=False, index=True,
        comment="Vehicle plate number"
    )
    state: Mapped[ViolationState] = mapped_column(
        Enum(ViolationState), nullable=False,
        comment="State of plate registration"
    )
    vehicle_type: Mapped[str] = mapped_column(
        String(16), nullable=True,
        comment="Vehicle type code (e.g., OMT for Medallion)"
    )
    
    # Violation details
    violation_date: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, index=True,
        comment="Date and time of violation"
    )
    violation_code: Mapped[str] = mapped_column(
        String(16), nullable=True,
        comment="Violation code"
    )
    violation_description: Mapped[str] = mapped_column(
        Text, nullable=True,
        comment="Description of violation"
    )
    
    # Location
    county: Mapped[str] = mapped_column(
        String(8), nullable=True,
        comment="County code (e.g., MN, BK, QN, BX)"
    )
    issuing_agency: Mapped[str] = mapped_column(
        String(64), nullable=True,
        comment="Agency that issued violation"
    )
    street_name: Mapped[str] = mapped_column(
        String(256), nullable=True,
        comment="Street where violation occurred"
    )
    intersecting_street: Mapped[str] = mapped_column(
        String(256), nullable=True,
        comment="Intersecting street"
    )
    house_number: Mapped[str] = mapped_column(
        String(32), nullable=True,
        comment="House number"
    )
    
    # Financial details
    fine_amount: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False,
        comment="Base fine amount"
    )
    penalty_amount: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False, default=Decimal('0.00'),
        comment="Penalty amount"
    )
    interest_amount: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False, default=Decimal('0.00'),
        comment="Interest amount"
    )
    reduction_amount: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False, default=Decimal('0.00'),
        comment="Reduction amount (if any)"
    )
    payment_amount: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False, default=Decimal('0.00'),
        comment="Amount paid so far"
    )
    amount_due: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False,
        comment="Total amount currently due"
    )
    
    # Status
    violation_status: Mapped[ViolationStatus] = mapped_column(
        Enum(ViolationStatus), nullable=False, default=ViolationStatus.ISSUED,
        index=True, comment="Current status of violation"
    )
    judgment_entry_date: Mapped[datetime] = mapped_column(
        DateTime, nullable=True,
        comment="Date judgment was entered"
    )
    hearing_status: Mapped[str] = mapped_column(
        String(64), nullable=True,
        comment="Hearing status if applicable"
    )
    
    # Entity mappings (via CURB trip matching or manual assignment)
    driver_id: Mapped[int] = mapped_column(
        ForeignKey("drivers.id", ondelete="SET NULL"), nullable=True, index=True,
        comment="Mapped driver"
    )
    vehicle_id: Mapped[int] = mapped_column(
        ForeignKey("vehicles.id", ondelete="SET NULL"), nullable=True, index=True,
        comment="Mapped vehicle"
    )
    medallion_id: Mapped[int] = mapped_column(
        ForeignKey("medallions.id", ondelete="SET NULL"), nullable=True, index=True,
        comment="Mapped medallion"
    )
    lease_id: Mapped[int] = mapped_column(
        ForeignKey("leases.id", ondelete="SET NULL"), nullable=True, index=True,
        comment="Active lease at time of violation"
    )
    hack_license_number: Mapped[str] = mapped_column(
        String(32), nullable=True, index=True,
        comment="TLC/Hack license number of responsible driver"
    )
    
    # Mapping metadata
    mapping_method: Mapped[MappingMethod] = mapped_column(
        Enum(MappingMethod), nullable=False, default=MappingMethod.UNMAPPED,
        index=True, comment="How violation was mapped to driver"
    )
    mapping_confidence: Mapped[Decimal] = mapped_column(
        Numeric(5, 2), nullable=True,
        comment="Confidence score (0.00-1.00) for auto-matching"
    )
    matched_curb_trip_id: Mapped[int] = mapped_column(
        ForeignKey("curb_trips.id", ondelete="SET NULL"), nullable=True,
        comment="CURB trip used for matching"
    )
    mapping_notes: Mapped[str] = mapped_column(
        Text, nullable=True,
        comment="Notes about mapping (especially for manual assignments)"
    )
    mapped_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=True,
        comment="When mapping was performed"
    )
    mapped_by: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True,
        comment="User who performed manual mapping"
    )
    
    # Ledger integration
    posting_status: Mapped[PostingStatus] = mapped_column(
        Enum(PostingStatus), nullable=False, default=PostingStatus.NOT_POSTED,
        index=True, comment="Whether posted to ledger"
    )
    ledger_posting_id: Mapped[str] = mapped_column(
        String(64), nullable=True, index=True,
        comment="Reference to ledger_postings.posting_id"
    )
    ledger_balance_id: Mapped[str] = mapped_column(
        String(64), nullable=True, index=True,
        comment="Reference to ledger_balances.balance_id"
    )
    payment_period_start: Mapped[datetime] = mapped_column(
        DateTime, nullable=True,
        comment="Payment period start (Sunday 00:00)"
    )
    payment_period_end: Mapped[datetime] = mapped_column(
        DateTime, nullable=True,
        comment="Payment period end (Saturday 23:59)"
    )
    posted_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=True,
        comment="When posted to ledger"
    )
    posting_error: Mapped[str] = mapped_column(
        Text, nullable=True,
        comment="Error message if posting failed"
    )
    
    # Import tracking
    import_source: Mapped[ViolationSource] = mapped_column(
        Enum(ViolationSource), nullable=False,
        comment="Source of this violation record"
    )
    import_batch_id: Mapped[str] = mapped_column(
        String(64), nullable=True, index=True,
        comment="Import batch identifier"
    )
    import_file_name: Mapped[str] = mapped_column(
        String(256), nullable=True,
        comment="Original filename if from CSV/file"
    )
    
    # Relationships
    driver = relationship("Driver", foreign_keys=[driver_id])
    vehicle = relationship("Vehicle", foreign_keys=[vehicle_id])
    medallion = relationship("Medallion", foreign_keys=[medallion_id])
    lease = relationship("Lease", foreign_keys=[lease_id])
    mapped_by_user = relationship("User", foreign_keys=[mapped_by])
    matched_curb_trip = relationship("CurbTrip", foreign_keys=[matched_curb_trip_id])
    
    __table_args__ = (
        CheckConstraint('fine_amount >= 0', name='check_fine_positive'),
        CheckConstraint('amount_due >= 0', name='check_amount_due_positive'),
        CheckConstraint('mapping_confidence IS NULL OR (mapping_confidence >= 0 AND mapping_confidence <= 1)', 
                       name='check_confidence_range'),
        UniqueConstraint('summons_number', name='uq_pvb_summons_number'),
        Index('idx_pvb_plate_date', 'plate_number', 'violation_date'),
        Index('idx_pvb_driver_status', 'driver_id', 'posting_status'),
        Index('idx_pvb_mapping', 'mapping_method', 'posting_status'),
    )


# === PVB Import History Model ===

class PVBImportHistory(Base, AuditMixin):
    """
    Audit log for PVB import batches
    Tracks each import operation with statistics and status
    """
    
    __tablename__ = "pvb_import_history"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    batch_id: Mapped[str] = mapped_column(
        String(64), unique=True, nullable=False, index=True,
        comment="Unique batch identifier (Format: PVB-IMPORT-YYYYMMDD-HHMMSS-XXXXX)"
    )
    
    # Import parameters
    import_source: Mapped[ViolationSource] = mapped_column(
        Enum(ViolationSource), nullable=False,
        comment="Source type of import"
    )
    file_name: Mapped[str] = mapped_column(
        String(256), nullable=True,
        comment="Original filename"
    )
    
    # Status and timing
    status: Mapped[ImportStatus] = mapped_column(
        Enum(ImportStatus), nullable=False, default=ImportStatus.IN_PROGRESS,
        index=True
    )
    started_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=datetime.utcnow,
        comment="Import start time"
    )
    completed_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=True,
        comment="Import completion time"
    )
    duration_seconds: Mapped[int] = mapped_column(
        Integer, nullable=True,
        comment="Total import duration"
    )
    
    # Statistics
    total_records_in_file: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0,
        comment="Total records in source file"
    )
    records_imported: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0,
        comment="Successfully imported records"
    )
    records_skipped: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0,
        comment="Skipped (duplicates)"
    )
    records_failed: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0,
        comment="Failed records"
    )
    records_mapped: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0,
        comment="Auto-mapped to drivers"
    )
    records_posted: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0,
        comment="Posted to ledger"
    )
    
    # Processing flags
    perform_matching: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True,
        comment="Whether to auto-match with CURB trips"
    )
    post_to_ledger: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True,
        comment="Whether to post matched violations to ledger"
    )
    auto_match_threshold: Mapped[Decimal] = mapped_column(
        Numeric(5, 2), nullable=False, default=Decimal('0.90'),
        comment="Minimum confidence for auto-matching"
    )
    
    # Error tracking
    errors: Mapped[str] = mapped_column(
        Text, nullable=True,
        comment="JSON array of error messages"
    )
    
    # Audit
    triggered_by: Mapped[str] = mapped_column(
        String(32), nullable=False,
        comment="API, CELERY, or MANUAL"
    )
    triggered_by_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True,
        comment="User who triggered import (if manual)"
    )
    
    triggered_by_user = relationship("User", foreign_keys=[triggered_by_user_id])
    
    __table_args__ = (
        Index('idx_pvb_import_status_date', 'status', 'started_at'),
    )
