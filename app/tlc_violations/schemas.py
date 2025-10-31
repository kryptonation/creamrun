"""
app/tlc_violations/schemas.py

Pydantic schemas for TLC Violations module
Handles request/response validation and serialization
"""

from datetime import datetime, date, time
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, Field, field_validator

from app.tlc_violations.models import (
    ViolationType, ViolationStatus, HearingLocation, 
    Disposition, Borough, PostingStatus
)


class TLCViolationBase(BaseModel):
    """Base schema for TLC violation"""
    summons_number: str = Field(..., max_length=50, description="TLC summons number")
    tlc_license_number: str = Field(..., max_length=20, description="TLC license/medallion number")
    respondent_name: str = Field(..., max_length=255, description="Respondent entity name")
    occurrence_date: date = Field(..., description="Date of violation")
    occurrence_time: time = Field(..., description="Time of violation")
    occurrence_place: Optional[str] = Field(None, max_length=500, description="Location of violation")
    borough: Borough = Field(..., description="NYC borough")
    rule_section: str = Field(..., max_length=100, description="TLC rule/section violated")
    violation_type: ViolationType = Field(..., description="Violation category")
    violation_description: str = Field(..., description="Violation description")
    fine_amount: Decimal = Field(..., gt=0, max_digits=10, decimal_places=2, description="Fine amount")
    penalty_notes: Optional[str] = Field(None, description="Additional penalty notes")
    hearing_date: Optional[date] = Field(None, description="Hearing date")
    hearing_time: Optional[time] = Field(None, description="Hearing time")
    hearing_location: Optional[HearingLocation] = Field(None, description="Hearing location")
    admin_notes: Optional[str] = Field(None, description="Administrative notes")

    @field_validator("fine_amount")
    @classmethod
    def validate_fine_amount(cls, v):
        if v <= 0:
            raise ValueError("Fine amount must be greater than 0")
        if v > Decimal("99999999.99"):
            raise ValueError("Fine amount exceeds maximum allowed")
        return v

    class Config:
        from_attributes = True


class CreateTLCViolationRequest(TLCViolationBase):
    """Request schema for creating a violation"""
    medallion_id: int = Field(..., gt=0, description="Medallion ID")
    driver_id: Optional[int] = Field(None, gt=0, description="Driver ID (if known)")
    vehicle_id: Optional[int] = Field(None, gt=0, description="Vehicle ID (if known)")
    lease_id: Optional[int] = Field(None, gt=0, description="Lease ID (if known)")


class UpdateTLCViolationRequest(BaseModel):
    """Request schema for updating a violation"""
    respondent_name: Optional[str] = Field(None, max_length=255)
    occurrence_place: Optional[str] = Field(None, max_length=500)
    borough: Optional[Borough] = None
    rule_section: Optional[str] = Field(None, max_length=100)
    violation_type: Optional[ViolationType] = None
    violation_description: Optional[str] = None
    fine_amount: Optional[Decimal] = Field(None, gt=0, max_digits=10, decimal_places=2)
    penalty_notes: Optional[str] = None
    hearing_date: Optional[date] = None
    hearing_time: Optional[time] = None
    hearing_location: Optional[HearingLocation] = None
    status: Optional[ViolationStatus] = None
    admin_notes: Optional[str] = None

    @field_validator("fine_amount")
    @classmethod
    def validate_fine_amount(cls, v):
        if v is not None and v <= 0:
            raise ValueError("Fine amount must be greater than 0")
        return v

    class Config:
        from_attributes = True


class UpdateDispositionRequest(BaseModel):
    """Request schema for updating disposition"""
    disposition: Disposition = Field(..., description="Disposition outcome")
    disposition_date: date = Field(..., description="Date of disposition")
    disposition_notes: Optional[str] = Field(None, description="Disposition notes")

    class Config:
        from_attributes = True


class RemapViolationRequest(BaseModel):
    """Request schema for remapping violation to different driver"""
    driver_id: int = Field(..., gt=0, description="New driver ID")
    lease_id: Optional[int] = Field(None, gt=0, description="New lease ID")
    reason: str = Field(..., min_length=10, description="Reason for remapping")

    class Config:
        from_attributes = True


class VoidViolationRequest(BaseModel):
    """Request schema for voiding a violation"""
    reason: str = Field(..., min_length=10, max_length=500, description="Reason for voiding")

    class Config:
        from_attributes = True


class PostToLedgerRequest(BaseModel):
    """Request schema for posting violation to ledger"""
    notes: Optional[str] = Field(None, max_length=500, description="Posting notes")

    class Config:
        from_attributes = True


class BatchPostRequest(BaseModel):
    """Request schema for batch posting violations"""
    violation_ids: List[int] = Field(..., min_items=1, max_items=100, description="Violation IDs to post")

    class Config:
        from_attributes = True


class TLCViolationDocumentBase(BaseModel):
    """Base schema for violation document"""
    document_type: str = Field(..., max_length=50, description="Document type")
    description: Optional[str] = Field(None, description="Document description")

    class Config:
        from_attributes = True


class UploadDocumentRequest(TLCViolationDocumentBase):
    """Request schema for uploading a document"""
    pass


class TLCViolationDocumentResponse(TLCViolationDocumentBase):
    """Response schema for violation document"""
    id: int
    document_id: str
    violation_id: int
    file_name: str
    file_path: str
    file_size: int
    file_type: str
    is_verified: bool
    verified_on: Optional[datetime]
    uploaded_on: datetime
    uploaded_by_user_id: Optional[int]

    class Config:
        from_attributes = True


class DriverInfo(BaseModel):
    """Driver information for response"""
    id: int
    first_name: str
    last_name: str
    hack_license: Optional[str]

    class Config:
        from_attributes = True


class VehicleInfo(BaseModel):
    """Vehicle information for response"""
    id: int
    plate_number: str
    vin: Optional[str]

    class Config:
        from_attributes = True


class MedallionInfo(BaseModel):
    """Medallion information for response"""
    id: int
    medallion_number: str

    class Config:
        from_attributes = True


class LeaseInfo(BaseModel):
    """Lease information for response"""
    id: int
    lease_number: str
    start_date: date
    end_date: Optional[date]

    class Config:
        from_attributes = True


class TLCViolationResponse(TLCViolationBase):
    """Response schema for TLC violation"""
    id: int
    violation_id: str
    medallion_id: int
    driver_id: Optional[int]
    vehicle_id: Optional[int]
    lease_id: Optional[int]
    mapped_via_curb: bool
    curb_trip_id: Optional[int]
    status: ViolationStatus
    posted_to_ledger: bool
    posting_status: PostingStatus
    ledger_posting_id: Optional[int]
    ledger_balance_id: Optional[int]
    posted_on: Optional[datetime]
    posted_by_user_id: Optional[int]
    posting_error: Optional[str]
    disposition: Disposition
    disposition_date: Optional[date]
    disposition_notes: Optional[str]
    is_voided: bool
    voided_on: Optional[datetime]
    voided_by_user_id: Optional[int]
    void_reason: Optional[str]
    created_on: datetime
    created_by_user_id: Optional[int]
    updated_on: Optional[datetime]
    updated_by_user_id: Optional[int]

    class Config:
        from_attributes = True


class TLCViolationDetailResponse(TLCViolationResponse):
    """Detailed response schema with related entities"""
    driver: Optional[DriverInfo]
    vehicle: Optional[VehicleInfo]
    medallion: MedallionInfo
    lease: Optional[LeaseInfo]
    documents: List[TLCViolationDocumentResponse]

    class Config:
        from_attributes = True


class TLCViolationListResponse(BaseModel):
    """Response schema for list of violations"""
    total: int
    page: int
    page_size: int
    total_pages: int
    violations: List[TLCViolationResponse]

    class Config:
        from_attributes = True


class TLCViolationStatistics(BaseModel):
    """Statistics schema"""
    total_violations: int
    by_status: dict
    by_violation_type: dict
    by_disposition: dict
    by_posting_status: dict
    total_fine_amount: Decimal
    posted_fine_amount: Decimal
    pending_fine_amount: Decimal
    upcoming_hearings_count: int
    overdue_hearings_count: int
    violations_by_borough: dict

    class Config:
        from_attributes = True


class BatchPostResult(BaseModel):
    """Result schema for batch posting"""
    total_requested: int
    successful: int
    failed: int
    success_ids: List[int]
    failed_ids: List[int]
    errors: List[dict]

    class Config:
        from_attributes = True


class UnpostedViolationsResponse(BaseModel):
    """Response schema for unposted violations"""
    total: int
    violations: List[TLCViolationResponse]

    class Config:
        from_attributes = True


class UpcomingHearingsResponse(BaseModel):
    """Response schema for upcoming hearings"""
    total: int
    violations: List[TLCViolationResponse]

    class Config:
        from_attributes = True


class TLCViolationFilters(BaseModel):
    """Filter parameters for violation queries"""
    summons_number: Optional[str] = None
    violation_id: Optional[str] = None
    driver_id: Optional[int] = None
    vehicle_id: Optional[int] = None
    medallion_id: Optional[int] = None
    lease_id: Optional[int] = None
    status: Optional[ViolationStatus] = None
    violation_type: Optional[ViolationType] = None
    disposition: Optional[Disposition] = None
    posting_status: Optional[PostingStatus] = None
    posted_to_ledger: Optional[bool] = None
    is_voided: Optional[bool] = None
    borough: Optional[Borough] = None
    occurrence_date_from: Optional[date] = None
    occurrence_date_to: Optional[date] = None
    hearing_date_from: Optional[date] = None
    hearing_date_to: Optional[date] = None
    created_date_from: Optional[date] = None
    created_date_to: Optional[date] = None
    mapped_via_curb: Optional[bool] = None
    fine_amount_min: Optional[Decimal] = None
    fine_amount_max: Optional[Decimal] = None

    class Config:
        from_attributes = True