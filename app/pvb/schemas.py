"""
app/pvb/schemas.py

Pydantic schemas for request/response models
"""

from datetime import datetime
from decimal import Decimal
from typing import Optional, List

from pydantic import BaseModel, Field, field_validator

from app.pvb.models import ViolationState


# === Request Schemas ===

class UploadPVBCSVRequest(BaseModel):
    """Request for uploading PVB CSV file"""
    perform_matching: bool = Field(True, description="Auto-match with CURB trips")
    post_to_ledger: bool = Field(True, description="Post matched violations to ledger")
    auto_match_threshold: float = Field(
        0.90, ge=0.0, le=1.0,
        description="Minimum confidence for auto-matching"
    )


class CreateManualViolationRequest(BaseModel):
    """Request for manually creating PVB violation"""
    summons_number: str = Field(..., min_length=1, max_length=64)
    plate_number: str = Field(..., min_length=1, max_length=16)
    state: ViolationState
    violation_date: datetime
    violation_description: str
    fine_amount: Decimal = Field(..., gt=0)
    penalty_amount: Decimal = Field(Decimal('0.00'), ge=0)
    interest_amount: Decimal = Field(Decimal('0.00'), ge=0)
    street_name: Optional[str] = None
    county: Optional[str] = None
    driver_id: Optional[int] = None
    lease_id: Optional[int] = None
    notes: Optional[str] = None
    post_to_ledger: bool = True
    
    @field_validator('state')
    @classmethod
    def validate_state(cls, v):
        if isinstance(v, str):
            return ViolationState[v.upper()]
        return v


class RemapViolationRequest(BaseModel):
    """Request for remapping violation to different driver/lease"""
    driver_id: int = Field(..., gt=0)
    lease_id: int = Field(..., gt=0)
    reason: str = Field(..., min_length=10, max_length=500)
    post_to_ledger: bool = True


class BulkPostToLedgerRequest(BaseModel):
    """Request for bulk posting violations to ledger"""
    violation_ids: List[int] = Field(..., min_items=1, max_items=100)


# === Response Schemas ===

class UploadPVBCSVResponse(BaseModel):
    """Response for CSV upload"""
    success: bool
    batch_id: str
    message: str
    records_in_file: int
    records_imported: int
    records_skipped: int
    records_failed: int
    records_mapped: int
    records_posted: int
    duration_seconds: Optional[int] = None
    errors: Optional[List[str]] = None


class PVBViolationResponse(BaseModel):
    """Response for single PVB violation"""
    id: int
    summons_number: str
    plate_number: str
    state: str
    violation_date: datetime
    violation_description: Optional[str] = None
    county: Optional[str] = None
    street_name: Optional[str] = None
    fine_amount: Decimal
    penalty_amount: Decimal
    interest_amount: Decimal
    amount_due: Decimal
    violation_status: str
    driver_id: Optional[int] = None
    vehicle_id: Optional[int] = None
    lease_id: Optional[int] = None
    hack_license_number: Optional[str] = None
    mapping_method: str
    mapping_confidence: Optional[Decimal] = None
    posting_status: str
    ledger_balance_id: Optional[str] = None
    payment_period_start: Optional[datetime] = None
    payment_period_end: Optional[datetime] = None
    import_batch_id: Optional[str] = None
    created_on: datetime
    
    class Config:
        from_attributes = True


class PVBViolationDetailResponse(PVBViolationResponse):
    """Detailed response with additional fields"""
    vehicle_type: Optional[str] = None
    violation_code: Optional[str] = None
    issuing_agency: Optional[str] = None
    intersecting_street: Optional[str] = None
    house_number: Optional[str] = None
    reduction_amount: Decimal
    payment_amount: Decimal
    judgment_entry_date: Optional[datetime] = None
    hearing_status: Optional[str] = None
    medallion_id: Optional[int] = None
    matched_curb_trip_id: Optional[int] = None
    mapping_notes: Optional[str] = None
    mapped_at: Optional[datetime] = None
    mapped_by: Optional[int] = None
    ledger_posting_id: Optional[str] = None
    posted_at: Optional[datetime] = None
    posting_error: Optional[str] = None
    import_source: str
    import_file_name: Optional[str] = None
    modified_on: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class PVBImportHistoryResponse(BaseModel):
    """Response for import history"""
    id: int
    batch_id: str
    import_source: str
    file_name: Optional[str] = None
    status: str
    started_at: datetime
    completed_at: Optional[datetime] = None
    duration_seconds: Optional[int] = None
    total_records_in_file: int
    records_imported: int
    records_skipped: int
    records_failed: int
    records_mapped: int
    records_posted: int
    perform_matching: bool
    post_to_ledger: bool
    auto_match_threshold: Decimal
    errors: Optional[str] = None
    triggered_by: str
    triggered_by_user_id: Optional[int] = None
    
    class Config:
        from_attributes = True


class PaginatedPVBResponse(BaseModel):
    """Paginated list of violations"""
    violations: List[PVBViolationResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class PVBStatisticsResponse(BaseModel):
    """Statistics for PVB violations"""
    total_violations: int
    total_amount_due: float
    mapped_violations: int
    unmapped_violations: int
    posted_violations: int
    unposted_violations: int
    by_state: dict
    by_county: dict


class RemapViolationResponse(BaseModel):
    """Response for remap operation"""
    success: bool
    message: str
    violation: PVBViolationDetailResponse