"""
app/curb/models.py

SQLAlchemy models for CURB trip and transaction import
"""

from datetime import datetime, date
from decimal import Decimal
from typing import Optional
from enum import Enum as PyEnum

from sqlalchemy import (
    Integer, String, DateTime, Date, Numeric, Boolean, 
    Text, ForeignKey, Index, CheckConstraint, Enum, BigInteger
)
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base
from app.users.models import AuditMixin

# === Enums ===


class PaymentType(str, PyEnum):
    """Payment type for CURB trips"""
    CASH = "CASH"  # T = $
    CREDIT_CARD = "CREDIT_CARD"  # T = C
    PRIVATE_CARD = "PRIVATE_CARD"  # T = P


class MappingMethod(str, PyEnum):
    """Method used to map trip to entities"""
    AUTO_MATCH = "AUTO_MATCH"  # Direct match via hack_license/cab_number
    MANUAL_ASSIGNMENT = "MANUAL_ASSIGNMENT"  # Manually assigned by user
    UNKNOWN = "UNKNOWN"  # Could not be mapped


class ImportStatus(str, PyEnum):
    """Status of import batch"""
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    PARTIAL = "PARTIAL"  # Some records failed


class ReconciliationStatus(str, PyEnum):
    """Reconciliation status with CURB"""
    NOT_RECONCILED = "NOT_RECONCILED"
    RECONCILED = "RECONCILED"
    FAILED = "FAILED"


# === CURB Trip Model ===

class CurbTrip(Base, AuditMixin):
    """
    CURB Trip data from GET_TRIPS_LOG10 endpoint
    Represents completed trip with fare details
    """
    __tablename__ = "curb_trips"

    # Primary Key
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    
    # CURB Identifiers (composite unique key: record_id + period)
    record_id: Mapped[str] = mapped_column(String(50), nullable=False, index=True,
                                           comment="CURB RECORD ID (recycled quarterly)")
    period: Mapped[str] = mapped_column(String(6), nullable=False, index=True,
                                        comment="CURB PERIOD (YYYYMM)")
    
    # Trip Identifiers
    cab_number: Mapped[str] = mapped_column(String(20), nullable=False, index=True,
                                            comment="Cab/Medallion number from CURB")
    driver_id_curb: Mapped[str] = mapped_column(String(50), nullable=False, index=True,
                                                 comment="Driver ID from CURB (hack license)")
    num_service: Mapped[str] = mapped_column(String(20), nullable=True,
                                             comment="Service number")
    
    # Trip Timing
    start_datetime: Mapped[datetime] = mapped_column(DateTime, nullable=False, index=True,
                                                      comment="Trip start date and time")
    end_datetime: Mapped[datetime] = mapped_column(DateTime, nullable=False,
                                                    comment="Trip end date and time")
    
    # Financial Details
    trip_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False, default=0,
                                                  comment="Base trip fare")
    tips: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False, default=0,
                                          comment="Tip amount")
    extras: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False, default=0,
                                            comment="Extra charges")
    tolls: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False, default=0,
                                           comment="Toll charges")
    tax: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False, default=0,
                                         comment="Tax amount")
    imp_tax: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False, default=0,
                                              comment="Improvement tax")
    total_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False,
                                                   comment="Total trip amount")
    
    # Tax Breakdown (from CURB trip data)
    ehail_fee: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False, default=0,
                                                comment="E-Hail fee")
    health_fee: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False, default=0,
                                                 comment="Health surcharge")
    congestion_fee: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False, default=0,
                                                     comment="Congestion surcharge")
    airport_fee: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False, default=0,
                                                  comment="Airport access fee")
    cbdt_fee: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False, default=0,
                                               comment="Central Business District Toll")
    
    # GPS Data
    gps_start_lat: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 6), nullable=True,
                                                              comment="Start latitude")
    gps_start_lon: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 6), nullable=True,
                                                              comment="Start longitude")
    gps_end_lat: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 6), nullable=True,
                                                            comment="End latitude")
    gps_end_lon: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 6), nullable=True,
                                                            comment="End longitude")
    from_address: Mapped[Optional[str]] = mapped_column(Text, nullable=True,
                                                         comment="Pickup address")
    to_address: Mapped[Optional[str]] = mapped_column(Text, nullable=True,
                                                       comment="Dropoff address")
    
    # Payment Details
    payment_type: Mapped[PaymentType] = mapped_column(Enum(PaymentType), nullable=False,
                                                       comment="Payment method")
    cc_number: Mapped[Optional[str]] = mapped_column(String(20), nullable=True,
                                                      comment="Last 4 digits of card")
    auth_code: Mapped[Optional[str]] = mapped_column(String(50), nullable=True,
                                                      comment="Authorization code")
    auth_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False, default=0,
                                                  comment="Authorized amount")
    
    # Trip Metadata
    passenger_count: Mapped[int] = mapped_column(Integer, nullable=False, default=1,
                                                  comment="Number of passengers")
    distance_service: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), nullable=True,
                                                                 comment="Service distance (miles)")
    distance_bs: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), nullable=True,
                                                            comment="Base station distance")
    reservation_number: Mapped[Optional[str]] = mapped_column(String(50), nullable=True,
                                                               comment="Reservation/booking number")
    
    # Entity Mapping (to BAT system)
    driver_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey('drivers.id'), 
                                                      nullable=True, index=True,
                                                      comment="Mapped BAT driver ID")
    medallion_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey('medallions.id'),
                                                         nullable=True, index=True,
                                                         comment="Mapped BAT medallion ID")
    vehicle_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey('vehicles.id'),
                                                       nullable=True, index=True,
                                                       comment="Mapped BAT vehicle ID")
    lease_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey('leases.id'),
                                                     nullable=True, index=True,
                                                     comment="Mapped BAT lease ID")
    
    # Mapping Metadata
    mapping_method: Mapped[MappingMethod] = mapped_column(Enum(MappingMethod), 
                                                           nullable=False, default=MappingMethod.UNKNOWN,
                                                           comment="How trip was mapped to entities")
    mapping_confidence: Mapped[Decimal] = mapped_column(Numeric(3, 2), nullable=False, default=0,
                                                         comment="Mapping confidence (0.00-1.00)")
    mapping_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True,
                                                          comment="Mapping details and notes")
    manually_assigned: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False,
                                                     comment="Was manually assigned")
    assigned_by: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey('users.id'), nullable=True,
                                                        comment="User who manually assigned")
    assigned_on: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True,
                                                             comment="When manually assigned")
    
    # Payment Period Assignment
    payment_period_start: Mapped[Optional[date]] = mapped_column(Date, nullable=True, index=True,
                                                                  comment="Payment week start (Sunday)")
    payment_period_end: Mapped[Optional[date]] = mapped_column(Date, nullable=True, index=True,
                                                                comment="Payment week end (Saturday)")
    
    # Import Tracking
    import_batch_id: Mapped[str] = mapped_column(String(50), nullable=False, index=True,
                                                  comment="Reference to import batch")
    imported_on: Mapped[datetime] = mapped_column(DateTime, nullable=False, 
                                                   default=datetime.utcnow,
                                                   comment="When imported into system")
    
    # Ledger Posting
    posted_to_ledger: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, index=True,
                                                    comment="Whether posted to ledger")
    ledger_posting_ids: Mapped[Optional[str]] = mapped_column(Text, nullable=True,
                                                               comment="JSON array of posting IDs")
    posted_on: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True,
                                                           comment="When posted to ledger")
    
    # Reconciliation with CURB
    reconciliation_status: Mapped[ReconciliationStatus] = mapped_column(
        Enum(ReconciliationStatus), nullable=False, default=ReconciliationStatus.NOT_RECONCILED,
        comment="Reconciliation status with CURB system")
    reconciled_on: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True,
                                                               comment="When reconciled with CURB")
    curb_recon_id: Mapped[Optional[str]] = mapped_column(String(50), nullable=True,
                                                          comment="CURB reconciliation ID")
    
    # Constraints
    __table_args__ = (
        Index('idx_curb_trips_record_period', 'record_id', 'period', unique=True),
        Index('idx_curb_trips_datetime', 'start_datetime', 'end_datetime'),
        Index('idx_curb_trips_payment_period', 'payment_period_start', 'payment_period_end'),
        Index('idx_curb_trips_driver_lease', 'driver_id', 'lease_id'),
        Index('idx_curb_trips_import_batch', 'import_batch_id'),
        CheckConstraint('mapping_confidence >= 0 AND mapping_confidence <= 1', 
                       name='check_mapping_confidence'),
        CheckConstraint('total_amount >= 0', name='check_total_amount'),
    )

# === CURB Transaction Model ===

class CurbTransaction(Base, AuditMixin):
    """
    CURB Transaction data from Get_Trans_By_Date_Cab12 endpoint
    Credit card transaction details
    """
    __tablename__ = "curb_transactions"

    # Primary Key
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    
    # CURB Identifiers
    row_id: Mapped[str] = mapped_column(String(50), nullable=False, unique=True, index=True,
                                        comment="CURB transaction ROWID")
    
    # Transaction Details
    transaction_date: Mapped[datetime] = mapped_column(DateTime, nullable=False, index=True,
                                                        comment="Transaction date and time")
    cab_number: Mapped[str] = mapped_column(String(20), nullable=False, index=True,
                                            comment="Cab/Medallion number")
    
    # Financial Details
    amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False,
                                            comment="Transaction amount")
    transaction_type: Mapped[str] = mapped_column(String(10), nullable=False,
                                                   comment="AP, DC, DUP, or ALL")
    
    # Card Details
    card_number: Mapped[Optional[str]] = mapped_column(String(20), nullable=True,
                                                        comment="Last 4 digits of card")
    auth_code: Mapped[Optional[str]] = mapped_column(String(50), nullable=True,
                                                      comment="Authorization code")
    
    # Entity Mapping
    driver_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey('drivers.id'),
                                                      nullable=True, index=True)
    medallion_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey('medallions.id'),
                                                         nullable=True, index=True)
    lease_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey('leases.id'),
                                                     nullable=True, index=True)
    
    # Trip Association
    curb_trip_id: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey('curb_trips.id'),
                                                         nullable=True, index=True,
                                                         comment="Linked CURB trip if matched")
    
    # Import Tracking
    import_batch_id: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    imported_on: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    
    # Reconciliation
    reconciliation_status: Mapped[ReconciliationStatus] = mapped_column(
        Enum(ReconciliationStatus), nullable=False, default=ReconciliationStatus.NOT_RECONCILED)
    reconciled_on: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    
    __table_args__ = (
        Index('idx_curb_trans_date', 'transaction_date'),
        Index('idx_curb_trans_cab', 'cab_number'),
        Index('idx_curb_trans_batch', 'import_batch_id'),
    )

# === Import History Model ===

class CurbImportHistory(Base, AuditMixin):
    """
    Track CURB import batches with status and statistics
    """
    __tablename__ = "curb_import_history"

    # Primary Key
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    
    # Batch Identifier
    batch_id: Mapped[str] = mapped_column(String(50), nullable=False, unique=True, index=True,
                                          comment="Unique batch ID (CURB-YYYYMMDD-HHMMSS)")
    
    # Import Parameters
    import_type: Mapped[str] = mapped_column(String(20), nullable=False,
                                             comment="DAILY, MANUAL, BACKFILL")
    date_from: Mapped[date] = mapped_column(Date, nullable=False, index=True,
                                            comment="Import date range start")
    date_to: Mapped[date] = mapped_column(Date, nullable=False, index=True,
                                          comment="Import date range end")
    driver_id_filter: Mapped[Optional[str]] = mapped_column(String(50), nullable=True,
                                                             comment="Driver ID filter (if any)")
    cab_number_filter: Mapped[Optional[str]] = mapped_column(String(20), nullable=True,
                                                              comment="Cab number filter (if any)")
    
    # Status Tracking
    status: Mapped[ImportStatus] = mapped_column(Enum(ImportStatus), nullable=False,
                                                  default=ImportStatus.IN_PROGRESS, index=True,
                                                  comment="Import batch status")
    
    # Timestamps
    started_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow,
                                                  comment="When import started")
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True,
                                                              comment="When import completed")
    duration_seconds: Mapped[Optional[int]] = mapped_column(Integer, nullable=True,
                                                             comment="Import duration")
    
    # Statistics - Trips
    total_trips_fetched: Mapped[int] = mapped_column(Integer, nullable=False, default=0,
                                                      comment="Total trips from CURB API")
    total_trips_imported: Mapped[int] = mapped_column(Integer, nullable=False, default=0,
                                                       comment="Successfully imported trips")
    total_trips_mapped: Mapped[int] = mapped_column(Integer, nullable=False, default=0,
                                                     comment="Trips mapped to entities")
    total_trips_posted: Mapped[int] = mapped_column(Integer, nullable=False, default=0,
                                                     comment="Trips posted to ledger")
    total_trips_failed: Mapped[int] = mapped_column(Integer, nullable=False, default=0,
                                                     comment="Failed trips")
    
    # Statistics - Transactions
    total_transactions_fetched: Mapped[int] = mapped_column(Integer, nullable=False, default=0,
                                                             comment="Total transactions from CURB")
    total_transactions_imported: Mapped[int] = mapped_column(Integer, nullable=False, default=0,
                                                              comment="Successfully imported transactions")
    
    # Reconciliation
    reconciliation_attempted: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False,
                                                            comment="Whether reconciliation was attempted")
    reconciliation_successful: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False,
                                                             comment="Whether reconciliation succeeded")
    
    # Error Tracking
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True,
                                                          comment="Error details if failed")
    error_details: Mapped[Optional[str]] = mapped_column(Text, nullable=True,
                                                          comment="Detailed error log (JSON)")
    
    # Metadata
    triggered_by: Mapped[str] = mapped_column(String(50), nullable=False,
                                              comment="CELERY, API, MANUAL")
    triggered_by_user_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey('users.id'),
                                                                 nullable=True,
                                                                 comment="User who triggered (if manual)")
    
    __table_args__ = (
        Index('idx_curb_import_date_range', 'date_from', 'date_to'),
        Index('idx_curb_import_status', 'status'),
        Index('idx_curb_import_started', 'started_at'),
    )