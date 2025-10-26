"""
app/curb/models.py

CURB Trip Models - SQLAlchemy 2.x style
"""

from typing import Optional
from datetime import datetime
from decimal import Decimal
from enum import Enum as PyEnum

from sqlalchemy import (
    DateTime, Enum, ForeignKey, Numeric, Integer, String,
    Text, Boolean, Index, CheckConstraint, JSON,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base
from app.users.models import AuditMixin

 # === ENUMS ===

class ImportStatus(str, PyEnum):
    """Status of CURB import job"""
    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    PARTIAL = "PARTIAL"


class TripMappingStatus(str, PyEnum):
    """Status of trip entity mapping"""
    UNMAPPED = "UNMAPPED"
    MAPPED = "MAPPED"
    PARTIALLY_MAPPED = "PARTIALLY_MAPPED"
    MAPPING_FAILED = "MAPPING_FAILED"
    MANUAL_REVIEW = "MANUAL_REVIEW"


class TripPostingStatus(str, PyEnum):
    """Status of posting to ledger"""
    NOT_POSTED = "NOT_POSTED"
    POSTED = "POSTED"
    POSTING_FAILED = "POSTING_FAILED"
    VOIDED = "VOIDED"


class ReconciliationSstatus(str, PyEnum):
    """Reconciliation status with CURB"""
    NOT_RECONCILED = "NOT_RECONCILED"
    RECONCILED = "RECONCILED"
    RECONCILIATION_FAILED = "RECONCILIATION_FAILED"


class PaymentType(str, PyEnum):
    """Payment type from CURB"""
    CASH = "CASH"  # T = $
    CREDIT_CARD = "CREDIT_CARD"  # T = C
    PRIVATE_CARD = "PRIVATE_CARD"  # T = P


# === CURB import history ===

class CurbImportHistory(Base, AuditMixin):
    """
    Tracks CURB import jobs
    Maintains audit trail of all import operations
    """

    __tablename__ = "curb_import_history"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    import_id: Mapped[str] = mapped_column(
        String(64), unique=True, nullable=False, index=True,
        comment="Unique Import ID (Format: CURB-IMP-YYYYMMDD-NNN)"
    )

    import_date: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, index=True,
        comment="Date or time import was initiated"
    )

    date_from: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, index=True,
        comment="Start date of import range"
    )
    date_to: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, index=True,
        comment="End date of import range"
    )

    status: Mapped[ImportStatus] = mapped_column(
        Enum(ImportStatus), nullable=False, index=True,
        comment="Import job status"
    )

    total_records_fetched: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0,
        comment="Total records fetched from CURB API"
    )
    total_records_imported: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0,
        comment="Total records successfully imported"
    )
    total_records_failed: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0,
        comment="Total records that failed import"
    )
    total_records_updated: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0,
        comment="Total existing records updated"
    )

    trips_source: Mapped[str] = mapped_column(
        String(64), nullable=False,
        comment="API source (GET_TRIPS_LOG10 or GET_TRANS_By_Date_Cab12)"
    )

    started_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime, nullable=True,
        comment="Import start timestamp"
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime, nullable=True,
        comment="Import completion timestamp"
    )

    error_message: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True,
        comment="Error message if import failed"
    )
    error_details: Mapped[Optional[dict]] = mapped_column(
        JSON, nullable=True,
        comment="Detailed error information"
    )

    import_parameters: Mapped[Optional[dict]] = mapped_column(
        JSON, nullable=True,
        comment="Parameters used for import (driver_id, cab_number, etc)"
    )
    metadata_: Mapped[Optional[dict]] = mapped_column(
        JSON, nullable=True,
        comment="Additional metadata"
    )

    imported_by: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True,
        index=True,
    )

    imported_by_user = relationship("User", foreign_keys=[imported_by])

    __table_args__ = (
        Index('idx_import_date_range', 'date_from', 'date_to'),
        Index('idx_import_status_date', 'status', 'import_date'),
    )


# === CURB Trips ===

class CurbTrip(Base, AuditMixin):
    """
    Individual CURB trip records

    Stores trip data from CURB API with mapping to internal entities
    Tracks posting status to ledger and reconciliation
    """

    __tablename__ = "curb_trips"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    curb_record_id: Mapped[str] = mapped_column(
        String(64), nullable=False, index=True,
        comment="CURB Record ID from API"
    )
    curb_period: Mapped[str] = mapped_column(
        String(24), nullable=False, index=True,
        comment="CURB Period (YYYYMM)"
    )

    trip_unique_id: Mapped[str] = mapped_column(
        String(128), unique=True, nullable=False, index=True,
        comment="Unique trip ID (RECORD_ID-PERIOD)"
    )

    trip_start_datetime: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, index=True,
        comment="Trip end date and time"
    )
    trip_end_datetime: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, index=True,
        comment="Trip end date and time"
    )

    cab_number: Mapped[str] = mapped_column(
        String(64), nullable=False, index=True,
        comment="Cab/Medallion number from CURB"
    )
    driver_id_curb: Mapped[str] = mapped_column(
        String(64), nullable=False, index=True,
        comment="Driver ID from CURB (hack license)"
    )
    num_service: Mapped[str] = mapped_column(
        String(64), nullable=True, comment="Service number"
    )

    trip_fare: Mapped[Decimal] = mapped_column(
        Numeric(10, 4), nullable=False, default=Decimal("0.0000"),
        comment="Trip fare amount"
    )
    tips: Mapped[Decimal] = mapped_column(
        Numeric(10, 4), nullable=False, default=Decimal("0.0000"),
        comment="Tips amount"
    )
    extras: Mapped[Decimal] = mapped_column(
        Numeric(10, 4), nullable=False, default=Decimal("0.0000"),
        comment="Extra Charges"
    )
    


