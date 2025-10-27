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


class ReconciliationStatus(str, PyEnum):
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
    tolls: Mapped[Decimal] = mapped_column(
        Numeric(10, 4), nullable=False, default=Decimal("0.0000"),
        comment="Tolls amount"
    )

    # === Taxes and Fees (All from CURB) ===
    mta_surcharge: Mapped[Decimal] = mapped_column(
        Numeric(10, 4), nullable=False, default=Decimal("0.0000"),
        comment="MTA Surcharge (TAX field or calculated)"
    )
    tif: Mapped[Decimal] = mapped_column(
        Numeric(10, 4), nullable=False, default=Decimal("0.0000"),
        comment="Taxi Improvement Fund"
    )
    congestion_surcharge: Mapped[Decimal] = mapped_column(
        Numeric(10, 4), nullable=False, default=Decimal("0.0000"),
        comment="Congestion Pricing Surcharge (CONGFEE)"
    )
    cbdt: Mapped[Decimal] = mapped_column(
        Numeric(10, 4), nullable=False, default=Decimal("0.0000"),
        comment="Central Business District Toll"
    )
    airport_fee: Mapped[Decimal] = mapped_column(
        Numeric(10, 4), nullable=False, default=Decimal("0.0000"),
        comment="Airport Fee"
    )

    total_amount: Mapped[Decimal] = mapped_column(
        Numeric(10, 4), nullable=False,
        comment="Total trip amount"
    )

    # === Payment Information ===
    payment_type: Mapped[PaymentType] = mapped_column(
        Enum(PaymentType), nullable=False, index=True,
        comment="Payment type (CASH/CREDIT_CARD/PRIVATE_CARD)"
    )
    cc_last_four: Mapped[Optional[str]] = mapped_column(
        String(4), nullable=True, comment="Last 4 digits of credit card"
    )
    auth_code: Mapped[Optional[str]] = mapped_column(
        String(64), nullable=True, comment="Authorization code"
    )
    auth_amount: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(10, 4), nullable=True, comment="Authorized amount"
    )

    # === Trip metrics ===
    passenger_count: Mapped[Optional[int]] = mapped_column(
        Integer, nullable=True, comment="Number of Passengers"
    )
    distance_service: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(10, 2), nullable=True, comment="Distance in service (miles)"
    )
    distance_base: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(10, 2), nullable=True, comment="Base distance"
    )

    # === GPS Data ===
    gps_start_lat: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(12, 8), nullable=True, comment="Start GPS Latitude"
    )
    gps_start_lon: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(12, 8), nullable=True, comment="Start GPS Longitude"
    )
    gps_end_lat: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(12, 8), nullable=True, comment="End GPS Latitude"
    )
    gps_end_lon: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(12, 8), nullable=True, comment="End GPS Longitude"
    )

    # === Addresses ===
    from_address: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True, comment="Pickup address"
    )
    to_address: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True, comment="Dropoff address"
    )

    # === Reservation ===
    reservation_number: Mapped[Optional[str]] = mapped_column(
        String(64), nullable=True, comment="Reservation number if applicable"
    )
    ehail_fee: Mapped[Decimal] = mapped_column(
        Numeric(10, 4), nullable=False, default=Decimal("0.0000"),
        comment="E-hail fee"
    )
    health_fee: Mapped[Decimal] = mapped_column(
        Numeric(10, 4), nullable=False, default=Decimal("0.0000"),
        comment="Health fee"
    )

    # === Mapping to internal entities ===
    driver_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("drivers.id", ondelete="SET NULL"), nullable=True, index=True,
    )
    lease_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("leases.id", ondelete="SET NULL"), nullable=True, index=True,
    )
    vehicle_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("vehicles.id", ondelete="SET NULL"), nullable=True, index=True,
    )
    medallion_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("medallions.id", ondelete="SET NULL"), nullable=True, index=True,
    )

    mapping_status: Mapped[TripMappingStatus] = mapped_column(
        Enum(TripMappingStatus), nullable=False, index=True,
        default=TripMappingStatus.UNMAPPED,
        comment="Status of entity mapping"
    )
    mapping_confidence: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(5, 4), nullable=True, comment="Mapping confidence score (0.0000 to 1.0000)"
    )
    mapping_method: Mapped[Optional[str]] = mapped_column(
        String(128), nullable=True, comment="Method used for mapping (AUTO/MANUAL/INFERENCE)"
    )
    mapping_notes: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True, comment="Notes about mapping decisions"
    )
    mapped_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime, nullable=True, comment="When mapping was completed"
    )
    mapped_by: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True,
    )

    # === Ledger Posting Tracking ===
    posting_status: Mapped[TripPostingStatus] = mapped_column(
        Enum(TripPostingStatus), nullable=False, index=True,
        default=TripPostingStatus.NOT_POSTED,
        comment="Status of posting to ledger"
    )
    posted_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime, nullable=True, comment="When trip was posted to ledger"
    )

    ledger_posting_ids: Mapped[Optional[dict]] = mapped_column(
        JSON, nullable=True, comment="Array of ledger posting IDs created for this trip"
    )
    posting_error: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True, comment="Error message if posting failed"
    )

    # === Reconciliation With CURB ===
    reconciliation_status: Mapped[ReconciliationStatus] = mapped_column(
        Enum(ReconciliationStatus), nullable=False, index=True,
        default=ReconciliationStatus.NOT_RECONCILED,
        comment="Reconciliation status with CURB"
    )
    reconciliation_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime, nullable=True, comment="When trip was reonciled with CURB"
    )
    recon_stat_value: Mapped[Optional[int]] = mapped_column(
        Integer, nullable=True, comment="RECON_STAT value sent to CURB API"
    )

    # === Import Tracking ===
    import_id: Mapped[int] = mapped_column(
        ForeignKey("curb_import_history.id", ondelete="RESTRICT"), nullable=False, index=True,
    )
    raw_data: Mapped[Optional[dict]] = mapped_column(
        JSON, nullable=True, comment="Complete raw XML/JSON data from CURB"
    )

    # === Relationships ===
    driver = relationship("Driver", foreign_keys=[driver_id])
    lease = relationship("Lease", foreign_keys=[lease_id])
    vehicle = relationship("Vehicle", foreign_keys=[vehicle_id])
    medallion = relationship("Medallion", foreign_keys=[medallion_id])
    import_history = relationship("CurbImportHistory", foreign_keys=[import_id])
    mapped_by_user = relationship("User", foreign_keys=[mapped_by])

    __table_args__ = (
        CheckConstraint('trip_fare >= 0', name='check_trip_fare_positive'),
        CheckConstraint('total_amount >= 0', name='check_total_amount_positive'),
        CheckConstraint('mapping_confidence >= 0 AND mapping_confidence <= 1', name='check_confidence_range'),
        Index('idx_trip_datetime', 'trip_start_datetime', 'trip_end_datetime'),
        Index('idx_trip_driver_date', 'driver_id', 'trip_start_datetime'),
        Index('idx_trip_lease_date', 'lease_id', 'trip_start_datetime'),
        Index('idx_trip_medallion_date', 'medallion_id', 'trip_start_datetime'),
        Index('idx_trip_posting_status', 'posting_status', 'trip_start_datetime'),
        Index('idx_trip_mapping_status', 'mapping_status', 'trip_start_datetime'),
    )


# === CURB Transactions (from GET_Trans_By_Date_Cab12) ===
class CurbTransaction(Base, AuditMixin):
    """
    CURB Card transactions from GET_TRANS_By_Date_Cab12 endpoint
    Used for detailed transaction reconciliation
    """

    __tablename__ = "curb_transactions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    row_id: Mapped[str] = mapped_column(
        String(64), unique=True, nullable=False, index=True,
        comment="Row ID from CURB transaction"
    )

    transaction_date: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, index=True, comment="Transaction date and time"
    )
    cab_number: Mapped[str] = mapped_column(
        String(64), nullable=False, index=True, comment="Cab number"
    )

    # === Transaction details ===
    amount: Mapped[Decimal] = mapped_column(
        Numeric(10, 4), nullable=False, comment="Transaction amount"
    )
    transaction_type: Mapped[str] = mapped_column(
        String(24), nullable=False, comment="Transaction type (AP/DC/DUP/ALL)"
    )

    # === Mapping to trip ===
    curb_trip_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("curb_trips.id", ondelete="SET NULL"), nullable=True, index=True,
    )

    raw_data: Mapped[Optional[dict]] = mapped_column(
        JSON, nullable=True, comment="Complete raw transaction data"
    )

    import_id: Mapped[int] = mapped_column(
        ForeignKey("curb_import_history.id", ondelete="RESTRICT"), nullable=False, index=True,
    )

    curb_trip = relationship("CurbTrip", foreign_keys=[curb_trip_id])
    import_history = relationship("CurbImportHistory", foreign_keys=[import_id])

    __table_args__ = (
        Index("idx_transaction_date_cab", "transaction_date", "cab_number")
    )


    


