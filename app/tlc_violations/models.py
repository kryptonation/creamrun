"""
app/tlc_violations/models.py

SQLAlchemy models for TLC Violations module
Handles TLC regulatory violations and summons tracking
"""

import enum
from datetime import datetime

from sqlalchemy import (
    Column, Integer, BigInteger, String, DateTime, Date, Time, Numeric, 
    Boolean, Text, Enum as SQLEnum, ForeignKey, Index, CheckConstraint
)
from sqlalchemy.orm import relationship

from app.core.db import Base
from app.users.models import AuditMixin


class ViolationType(str, enum.Enum):
    """TLC violation categories"""
    DRIVER_CONDUCT = "DRIVER_CONDUCT"
    VEHICLE_CONDITION = "VEHICLE_CONDITION"
    LICENSING_DOCUMENTATION = "LICENSING_DOCUMENTATION"
    FARE_PASSENGER_ISSUES = "FARE_PASSENGER_ISSUES"
    OPERATIONAL_DISPATCH = "OPERATIONAL_DISPATCH"
    ADMINISTRATIVE_REPORTING = "ADMINISTRATIVE_REPORTING"


class ViolationStatus(str, enum.Enum):
    """Violation lifecycle status"""
    NEW = "NEW"
    HEARING_SCHEDULED = "HEARING_SCHEDULED"
    DECISION_RECEIVED = "DECISION_RECEIVED"
    RESOLVED = "RESOLVED"
    VOIDED = "VOIDED"


class HearingLocation(str, enum.Enum):
    """OATH hearing locations"""
    OATH_MANHATTAN = "OATH_MANHATTAN"
    OATH_BRONX = "OATH_BRONX"
    OATH_BROOKLYN = "OATH_BROOKLYN"
    OATH_QUEENS = "OATH_QUEENS"
    OATH_STATEN_ISLAND = "OATH_STATEN_ISLAND"
    REMOTE = "REMOTE"


class Disposition(str, enum.Enum):
    """Hearing outcome disposition"""
    PENDING = "PENDING"
    DISMISSED = "DISMISSED"
    GUILTY = "GUILTY"
    PAID = "PAID"
    REDUCED = "REDUCED"
    SUSPENDED = "SUSPENDED"


class Borough(str, enum.Enum):
    """NYC boroughs"""
    BRONX = "BRONX"
    BROOKLYN = "BROOKLYN"
    MANHATTAN = "MANHATTAN"
    QUEENS = "QUEENS"
    STATEN_ISLAND = "STATEN_ISLAND"


class PostingStatus(str, enum.Enum):
    """Ledger posting status"""
    PENDING = "PENDING"
    POSTED = "POSTED"
    FAILED = "FAILED"


class TLCViolation(Base, AuditMixin):
    """
    TLC Violation/Summons record
    Tracks regulatory violations received from TLC
    """
    __tablename__ = "tlc_violations"

    # Primary key
    id = Column(Integer, primary_key=True, index=True)
    violation_id = Column(
        String(50), 
        unique=True, 
        nullable=False, 
        index=True,
        comment="Unique violation identifier (e.g., TLC-2025-000001)"
    )

    # Core violation data
    summons_number = Column(
        String(50), 
        unique=True, 
        nullable=False, 
        index=True,
        comment="TLC summons number (e.g., FN0013186)"
    )
    tlc_license_number = Column(
        String(20), 
        nullable=False,
        index=True,
        comment="TLC license/medallion number"
    )
    respondent_name = Column(
        String(255), 
        nullable=False,
        comment="Entity or person named on summons"
    )

    # Date and time information
    occurrence_date = Column(
        Date, 
        nullable=False,
        index=True,
        comment="Date violation occurred"
    )
    occurrence_time = Column(
        Time, 
        nullable=False,
        comment="Time violation occurred"
    )

    # Location information
    occurrence_place = Column(
        String(500),
        nullable=True,
        comment="Location/address of violation"
    )
    borough = Column(
        SQLEnum(Borough),
        nullable=False,
        index=True,
        comment="NYC borough of occurrence"
    )

    # Violation details
    rule_section = Column(
        String(100),
        nullable=False,
        comment="TLC rule/regulation violated (e.g., 58-30(B))"
    )
    violation_type = Column(
        SQLEnum(ViolationType),
        nullable=False,
        index=True,
        comment="Category of violation"
    )
    violation_description = Column(
        Text,
        nullable=False,
        comment="Description of violation"
    )

    # Financial information
    fine_amount = Column(
        Numeric(10, 2),
        nullable=False,
        comment="Fine/penalty amount"
    )
    penalty_notes = Column(
        Text,
        nullable=True,
        comment="Additional penalty information"
    )

    # Hearing information
    hearing_date = Column(
        Date,
        nullable=True,
        index=True,
        comment="Scheduled hearing date"
    )
    hearing_time = Column(
        Time,
        nullable=True,
        comment="Scheduled hearing time"
    )
    hearing_location = Column(
        SQLEnum(HearingLocation),
        nullable=True,
        comment="OATH hearing location"
    )

    # Outcome information
    disposition = Column(
        SQLEnum(Disposition),
        nullable=False,
        default=Disposition.PENDING,
        index=True,
        comment="Hearing/case disposition"
    )
    disposition_date = Column(
        Date,
        nullable=True,
        comment="Date of disposition"
    )
    disposition_notes = Column(
        Text,
        nullable=True,
        comment="Additional disposition information"
    )

    # Entity linkages (nullable - some may be medallion-only violations)
    driver_id = Column(
        Integer,
        ForeignKey("drivers.id", ondelete="RESTRICT"),
        nullable=True,
        index=True,
        comment="Linked driver"
    )
    vehicle_id = Column(
        Integer,
        ForeignKey("vehicles.id", ondelete="RESTRICT"),
        nullable=True,
        index=True,
        comment="Linked vehicle"
    )
    medallion_id = Column(
        Integer,
        ForeignKey("medallions.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
        comment="Linked medallion"
    )
    lease_id = Column(
        Integer,
        ForeignKey("leases.id", ondelete="RESTRICT"),
        nullable=True,
        index=True,
        comment="Active lease at time of violation"
    )

    # Mapping metadata
    mapped_via_curb = Column(
        Boolean,
        default=False,
        index=True,
        comment="Whether driver was identified via CURB data"
    )
    curb_trip_id = Column(
        BigInteger,
        ForeignKey("curb_trips.id", ondelete="SET NULL"),
        nullable=True,
        comment="CURB trip used for driver identification"
    )

    # Status and workflow
    status = Column(
        SQLEnum(ViolationStatus),
        nullable=False,
        default=ViolationStatus.NEW,
        index=True,
        comment="Violation lifecycle status"
    )
    
    # Ledger integration
    posted_to_ledger = Column(
        Boolean,
        default=False,
        index=True,
        comment="Whether posted to driver ledger"
    )
    posting_status = Column(
        SQLEnum(PostingStatus),
        nullable=False,
        default=PostingStatus.PENDING,
        index=True,
        comment="Ledger posting status"
    )
    ledger_posting_id = Column(
        Integer,
        ForeignKey("ledger_postings.id", ondelete="SET NULL"),
        nullable=True,
        comment="Linked ledger posting"
    )
    ledger_balance_id = Column(
        Integer,
        ForeignKey("ledger_balances.id", ondelete="SET NULL"),
        nullable=True,
        comment="Linked ledger balance"
    )
    posted_on = Column(
        DateTime,
        nullable=True,
        comment="Timestamp when posted to ledger"
    )
    posted_by_user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        comment="User who posted to ledger"
    )
    posting_error = Column(
        Text,
        nullable=True,
        comment="Error message if posting failed"
    )

    # Administrative notes
    admin_notes = Column(
        Text,
        nullable=True,
        comment="Internal administrative notes"
    )

    # Voiding support
    is_voided = Column(
        Boolean,
        default=False,
        index=True,
        comment="Whether violation is voided"
    )
    voided_on = Column(
        DateTime,
        nullable=True,
        comment="Timestamp when voided"
    )
    voided_by_user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        comment="User who voided the violation"
    )
    void_reason = Column(
        Text,
        nullable=True,
        comment="Reason for voiding"
    )
    reversal_posting_id = Column(
        Integer,
        ForeignKey("ledger_postings.id", ondelete="SET NULL"),
        nullable=True,
        comment="Reversal posting if voided after ledger post"
    )

    # Relationships
    driver = relationship("Driver", foreign_keys=[driver_id], backref="tlc_violations")
    vehicle = relationship("Vehicle", foreign_keys=[vehicle_id], backref="tlc_violations")
    medallion = relationship("Medallion", foreign_keys=[medallion_id], backref="tlc_violations")
    lease = relationship("Lease", foreign_keys=[lease_id], backref="tlc_violations")
    curb_trip = relationship("CurbTrip", foreign_keys=[curb_trip_id])
    ledger_posting = relationship("LedgerPosting", foreign_keys=[ledger_posting_id])
    ledger_balance = relationship("LedgerBalance", foreign_keys=[ledger_balance_id])
    reversal_posting = relationship("LedgerPosting", foreign_keys=[reversal_posting_id])
    posted_by = relationship("User", foreign_keys=[posted_by_user_id])
    voided_by = relationship("User", foreign_keys=[voided_by_user_id])
    documents = relationship("TLCViolationDocument", back_populates="violation", cascade="all, delete-orphan")

    # Indexes
    __table_args__ = (
        Index("idx_tlc_summons_driver", summons_number, driver_id),
        Index("idx_tlc_occurrence_date_time", occurrence_date, occurrence_time),
        Index("idx_tlc_status_posting", status, posting_status),
        Index("idx_tlc_hearing_date", hearing_date),
        Index("idx_tlc_disposition", disposition),
        CheckConstraint("fine_amount > 0", name="chk_tlc_fine_positive"),
    )

    def __repr__(self):
        return (
            f"<TLCViolation(id={self.id}, "
            f"violation_id='{self.violation_id}', "
            f"summons_number='{self.summons_number}', "
            f"fine_amount={self.fine_amount}, "
            f"status='{self.status.value}')>"
        )


class TLCViolationDocument(Base, AuditMixin):
    """
    Uploaded documents for TLC violations
    Stores summons, hearing results, payment proofs, etc.
    """
    __tablename__ = "tlc_violation_documents"

    # Primary key
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(
        String(50),
        unique=True,
        nullable=False,
        index=True,
        comment="Unique document identifier"
    )

    # Foreign key
    violation_id = Column(
        Integer,
        ForeignKey("tlc_violations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="Parent violation"
    )

    # Document metadata
    file_name = Column(
        String(255),
        nullable=False,
        comment="Original file name"
    )
    file_path = Column(
        String(500),
        nullable=False,
        comment="S3 or storage path"
    )
    file_size = Column(
        Integer,
        nullable=False,
        comment="File size in bytes"
    )
    file_type = Column(
        String(50),
        nullable=False,
        comment="MIME type (e.g., application/pdf)"
    )
    document_type = Column(
        String(50),
        nullable=False,
        comment="Type (SUMMONS, HEARING_RESULT, PAYMENT_PROOF, OTHER)"
    )
    description = Column(
        Text,
        nullable=True,
        comment="Document description"
    )

    # Verification
    is_verified = Column(
        Boolean,
        default=False,
        comment="Whether document has been verified"
    )
    verified_on = Column(
        DateTime,
        nullable=True,
        comment="Verification timestamp"
    )
    verified_by_user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        comment="User who verified"
    )

    # Audit fields
    uploaded_on = Column(
        DateTime,
        nullable=False,
        default=datetime.now,
        comment="Upload timestamp"
    )
    uploaded_by_user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        comment="User who uploaded"
    )

    # Relationships
    violation = relationship("TLCViolation", back_populates="documents")
    uploaded_by = relationship("User", foreign_keys=[uploaded_by_user_id])
    verified_by = relationship("User", foreign_keys=[verified_by_user_id])

    # Indexes
    __table_args__ = (
        Index("idx_tlc_doc_violation", violation_id, uploaded_on),
        CheckConstraint("file_size > 0 AND file_size <= 5242880", name="chk_tlc_doc_size"),
    )

    def __repr__(self):
        return (
            f"<TLCViolationDocument(id={self.id}, "
            f"violation_id={self.violation_id}, "
            f"file_name='{self.file_name}')>"
        )