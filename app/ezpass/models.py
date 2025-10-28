"""
app/ezpass/models.py

Database models for EZPass transactions and import history
"""

from datetime import datetime, date, timezone
from decimal import Decimal
from enum import Enum as PyEnum
from typing import Optional

from sqlalchemy import (
    BigInteger, String, DateTime, Date, Numeric, Integer, Text,
    Enum, Index, CheckConstraint, ForeignKey
)
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base
from app.users.models import AuditMixin


# === Enums ===

class MappingMethod(str, PyEnum):
    """How the EZPass transaction was mapped to driver/lease"""
    AUTO_CURB_MATCH = "AUTO_CURB_MATCH"  # Matched via CURB trip
    MANUAL_ASSIGNMENT = "MANUAL_ASSIGNMENT"  # Manually assigned by user
    UNKNOWN = "UNKNOWN"  # Not yet mapped


class ImportStatus(str, PyEnum):
    """Status of import batch"""
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    COMPLETED_WITH_ERRORS = "COMPLETED_WITH_ERRORS"
    FAILED = "FAILED"


class PostingStatus(str, PyEnum):
    """Status of ledger posting"""
    NOT_POSTED = "NOT_POSTED"
    POSTED = "POSTED"
    FAILED = "FAILED"


class ResolutionStatus(str, PyEnum):
    """Resolution status for tracking payment"""
    UNRESOLVED = "UNRESOLVED"
    RESOLVED = "RESOLVED"


# === EZPass Transaction Model ===

class EZPassTransaction(Base, AuditMixin):
    """
    EZPass toll transaction data from CSV uploads
    Maps to drivers via CURB trip correlation
    """
    __tablename__ = "ezpass_transactions"

    # Primary Key
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    
    # Unique Identifiers
    ticket_number: Mapped[str] = mapped_column(String(100), nullable=False, unique=True, index=True,
                                                comment="Unique EZPass ticket/transaction number")
    transaction_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True,
                                                           comment="Additional transaction ID if provided")
    
    # Transaction Details
    posting_date: Mapped[date] = mapped_column(Date, nullable=False, index=True,
                                                comment="Date transaction posted to EZPass account")
    transaction_date: Mapped[date] = mapped_column(Date, nullable=False, index=True,
                                                    comment="Date toll was incurred")
    transaction_time: Mapped[Optional[str]] = mapped_column(String(10), nullable=True,
                                                             comment="Time toll was incurred (HH:MM:SS)")
    transaction_datetime: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True, index=True,
                                                                      comment="Combined transaction date+time")
    
    # Vehicle Identification
    plate_number: Mapped[str] = mapped_column(String(20), nullable=False, index=True,
                                               comment="Vehicle plate from EZPass")
    
    # Toll Details
    agency: Mapped[Optional[str]] = mapped_column(String(100), nullable=True,
                                                   comment="Toll agency (e.g., MTABT, PANYNJ)")
    activity: Mapped[Optional[str]] = mapped_column(String(100), nullable=True,
                                                     comment="Activity type")
    plaza_id: Mapped[Optional[str]] = mapped_column(String(50), nullable=True,
                                                     comment="Plaza identifier")
    entry_time: Mapped[Optional[str]] = mapped_column(String(10), nullable=True,
                                                       comment="Entry time")
    entry_plaza: Mapped[Optional[str]] = mapped_column(String(100), nullable=True,
                                                        comment="Entry plaza name")
    entry_lane: Mapped[Optional[str]] = mapped_column(String(100), nullable=True,
                                                       comment="Entry lane")
    exit_time: Mapped[Optional[str]] = mapped_column(String(10), nullable=True,
                                                      comment="Exit time")
    exit_plaza: Mapped[Optional[str]] = mapped_column(String(100), nullable=True,
                                                       comment="Exit plaza name")
    exit_lane: Mapped[Optional[str]] = mapped_column(String(100), nullable=True,
                                                      comment="Exit lane")
    vehicle_type_code: Mapped[Optional[str]] = mapped_column(String(50), nullable=True,
                                                              comment="Vehicle type code")
    
    # Financial
    toll_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False,
                                                  comment="Toll charge amount")
    prepaid: Mapped[Optional[str]] = mapped_column(String(50), nullable=True,
                                                    comment="Prepaid indicator")
    plan_rate: Mapped[Optional[str]] = mapped_column(String(100), nullable=True,
                                                      comment="Plan or rate type")
    fare_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True,
                                                      comment="Fare type")
    balance: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), nullable=True,
                                                        comment="Account balance after transaction")
    
    # Entity Mapping
    vehicle_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("vehicles.id"), nullable=True, index=True,
                                                       comment="Mapped BAT vehicle")
    driver_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("drivers.id"), nullable=True, index=True,
                                                      comment="Mapped BAT driver")
    lease_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("leases.id"), nullable=True, index=True,
                                                     comment="Mapped BAT lease")
    medallion_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("medallions.id"), nullable=True, index=True,
                                                         comment="Mapped BAT medallion")
    hack_license_number: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, index=True,
                                                                comment="TLC license from CURB matching")
    
    # CURB Trip Matching
    matched_trip_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True,
                                                            comment="Reference to curb_trips.record_id")
    mapping_method: Mapped[MappingMethod] = mapped_column(Enum(MappingMethod), nullable=False, 
                                                           default=MappingMethod.UNKNOWN, index=True,
                                                           comment="How driver/lease was determined")
    mapping_confidence: Mapped[Optional[Decimal]] = mapped_column(Numeric(3, 2), nullable=True,
                                                                   comment="Confidence score 0.00-1.00 for auto-matching")
    mapping_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True,
                                                          comment="Notes about mapping process")
    
    # Payment Period (Sunday to Saturday)
    payment_period_start: Mapped[date] = mapped_column(Date, nullable=False, index=True,
                                                        comment="Sunday of payment week")
    payment_period_end: Mapped[date] = mapped_column(Date, nullable=False, index=True,
                                                      comment="Saturday of payment week")
    
    # Import Tracking
    import_batch_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True,
                                                  comment="Reference to import batch")
    imported_on: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.now(timezone.utc),
                                                   comment="When imported into system")
    
    # Ledger Posting
    posting_status: Mapped[PostingStatus] = mapped_column(Enum(PostingStatus), nullable=False,
                                                           default=PostingStatus.NOT_POSTED, index=True,
                                                           comment="Ledger posting status")
    ledger_balance_id: Mapped[Optional[str]] = mapped_column(String(50), nullable=True,
                                                              comment="Reference to ledger_balances.balance_id")
    posted_on: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True,
                                                           comment="When posted to ledger")
    posting_error: Mapped[Optional[str]] = mapped_column(Text, nullable=True,
                                                          comment="Error message if posting failed")
    
    # Resolution Tracking
    resolution_status: Mapped[ResolutionStatus] = mapped_column(Enum(ResolutionStatus), nullable=False,
                                                                 default=ResolutionStatus.UNRESOLVED, index=True,
                                                                 comment="Payment resolution status")
    resolved_on: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True,
                                                             comment="When marked as resolved")
    
    # Remapping History
    remapped_from_driver_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True,
                                                                    comment="Previous driver if remapped")
    remapped_on: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True,
                                                             comment="When remapped")
    remapped_by: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id"), nullable=True,
                                                        comment="User who performed remapping")
    remap_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True,
                                                         comment="Reason for remapping")
    
    # Constraints
    __table_args__ = (
        Index('idx_ezpass_plate_date', 'plate_number', 'transaction_date'),
        Index('idx_ezpass_payment_period', 'payment_period_start', 'payment_period_end'),
        Index('idx_ezpass_driver_period', 'driver_id', 'payment_period_start'),
        Index('idx_ezpass_import_batch', 'import_batch_id'),
        CheckConstraint('toll_amount >= 0', name='check_toll_amount_positive'),
        CheckConstraint('mapping_confidence IS NULL OR (mapping_confidence >= 0 AND mapping_confidence <= 1)',
                       name='check_mapping_confidence_range'),
    )


# === EZPass Import History Model ===

class EZPassImportHistory(Base, AuditMixin):
    """
    Tracks each EZPass CSV import batch
    Maintains statistics and error tracking
    """
    __tablename__ = "ezpass_import_history"

    # Primary Key
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    
    # Batch Identification
    batch_id: Mapped[str] = mapped_column(String(100), nullable=False, unique=True, index=True,
                                          comment="Unique batch identifier (EZPASS-YYYYMMDD-HHMMSS)")
    
    # Import Details
    import_type: Mapped[str] = mapped_column(String(50), nullable=False,
                                              comment="CSV_UPLOAD or MANUAL_ENTRY")
    file_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True,
                                                      comment="Original CSV filename")
    file_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True,
                                                      comment="S3 path to uploaded file")
    
    # Date Range
    date_from: Mapped[Optional[date]] = mapped_column(Date, nullable=True,
                                                       comment="Start date filter for import")
    date_to: Mapped[Optional[date]] = mapped_column(Date, nullable=True,
                                                     comment="End date filter for import")
    
    # Status
    status: Mapped[ImportStatus] = mapped_column(Enum(ImportStatus), nullable=False,
                                                  default=ImportStatus.IN_PROGRESS, index=True,
                                                  comment="Import batch status")
    
    # Statistics
    total_rows_in_file: Mapped[int] = mapped_column(Integer, nullable=False, default=0,
                                                     comment="Total rows in CSV")
    total_transactions_imported: Mapped[int] = mapped_column(Integer, nullable=False, default=0,
                                                              comment="Successfully imported transactions")
    total_duplicates_skipped: Mapped[int] = mapped_column(Integer, nullable=False, default=0,
                                                           comment="Duplicate tickets skipped")
    total_auto_matched: Mapped[int] = mapped_column(Integer, nullable=False, default=0,
                                                     comment="Transactions auto-matched to CURB trips")
    total_manual_review: Mapped[int] = mapped_column(Integer, nullable=False, default=0,
                                                      comment="Transactions requiring manual review")
    total_unmapped: Mapped[int] = mapped_column(Integer, nullable=False, default=0,
                                                 comment="Transactions with no mapping")
    total_posted_to_ledger: Mapped[int] = mapped_column(Integer, nullable=False, default=0,
                                                         comment="Transactions posted to ledger")
    total_posting_failures: Mapped[int] = mapped_column(Integer, nullable=False, default=0,
                                                         comment="Transactions that failed ledger posting")
    total_errors: Mapped[int] = mapped_column(Integer, nullable=False, default=0,
                                               comment="Total errors encountered")
    
    # Timing
    started_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.now(timezone.utc),
                                                  comment="Import start time")
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True,
                                                              comment="Import completion time")
    duration_seconds: Mapped[Optional[int]] = mapped_column(Integer, nullable=True,
                                                             comment="Total import duration")
    
    # Errors and Logs
    error_log: Mapped[Optional[str]] = mapped_column(Text, nullable=True,
                                                      comment="JSON array of error messages")
    summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True,
                                                    comment="Human-readable import summary")
    
    # Trigger Information
    triggered_by: Mapped[str] = mapped_column(String(50), nullable=False, default="API",
                                               comment="API, CELERY, or MANUAL")
    triggered_by_user_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id"), nullable=True,
                                                                 comment="User who triggered import")
    
    # Constraints
    __table_args__ = (
        Index('idx_ezpass_history_status', 'status'),
        Index('idx_ezpass_history_dates', 'date_from', 'date_to'),
        Index('idx_ezpass_history_started', 'started_at'),
    )

