"""
app/pvb/schemas.py

Pydantic schemas for PVB request/response validation
"""

from datetime import datetime
from decimal import Decimal
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, field_validator


# === Request Schemas ===

class UploadPVBCSVRequest(BaseModel):
    """Request schema for CSV upload"""
    perform_matching: bool = Field(
        default=True,
        description="Whether to perform CURB trip matching"
    )
    post_to_ledger: bool = Field(
        default=True,
        description="Whether to post matched violations to ledger"
    )
    auto_match_threshold: Decimal = Field(
        default=Decimal('0.90'),
        ge=0.0,
        le=1.0,
        description="Minimum confidence for auto-matching (0.00-1.00)"
    )


class CreatePVBViolationRequest(BaseModel):
    """Request schema for manual violation creation"""
    plate_number: str = Field(..., min_length=1, max_length=20)
    state: Optional[str] = Field(None, max_length=2)
    summons_number: str = Field(..., min_length=1, max_length=50)
    issue_date: datetime = Field(...)
    
    violation_code: Optional[str] = Field(None, max_length=10)
    violation_description: Optional[str] = Field(None, max_length=255)
    
    fine_amount: Decimal = Field(..., ge=0)
    penalty_amount: Decimal = Field(default=Decimal('0.00'), ge=0)
    interest_amount: Decimal = Field(default=Decimal('0.00'), ge=0)
    reduction_amount: Decimal = Field(default=Decimal('0.00'), ge=0)
    payment_amount: Decimal = Field(default=Decimal('0.00'), ge=0)
    
    county: Optional[str] = Field(None, max_length=50)
    street_name: Optional[str] = Field(None, max_length=255)
    house_number: Optional[str] = Field(None, max_length=50)
    intersect_street: Optional[str] = Field(None, max_length=255)
    
    vehicle_type: Optional[str] = Field(None, max_length=10)
    judgment: Optional[str] = Field(None, max_length=50)
    penalty_warning: Optional[str] = Field(None, max_length=50)
    
    notes: Optional[str] = None
    perform_matching: bool = Field(default=True)
    post_to_ledger: bool = Field(default=True)
    
    @field_validator('plate_number', 'summons_number')
    @classmethod
    def strip_whitespace(cls, v: str) -> str:
        return v.strip() if v else v


class RemapPVBRequest(BaseModel):
    """Request schema for manual remapping"""
    driver_id: int = Field(..., gt=0)
    lease_id: int = Field(..., gt=0)
    reason: str = Field(..., min_length=10, max_length=500)
    notes: Optional[str] = None


class UploadSummonsRequest(BaseModel):
    """Request schema for summons upload"""
    summons_type: Optional[str] = Field(
        default="ORIGINAL",
        max_length=50,
        description="Type of summons document"
    )
    notes: Optional[str] = Field(None, max_length=500)


# === Response Schemas ===

class PVBViolationResponse(BaseModel):
    """Basic violation response"""
    id: int
    summons_number: str
    plate_number: str
    state: Optional[str]
    issue_date: datetime
    
    fine_amount: Decimal
    penalty_amount: Decimal
    interest_amount: Decimal
    amount_due: Decimal
    
    vehicle_id: Optional[int]
    driver_id: Optional[int]
    lease_id: Optional[int]
    medallion_id: Optional[int]
    
    mapping_method: str
    mapping_confidence: Optional[Decimal]
    posted_to_ledger: bool
    posting_status: str
    violation_status: str
    
    created_at: datetime
    
    class Config:
        from_attributes = True


class VehicleInfo(BaseModel):
    """Vehicle information"""
    vehicle_id: int
    plate_number: str
    vin: Optional[str]
    make: Optional[str]
    model: Optional[str]
    year: Optional[int]


class DriverInfo(BaseModel):
    """Driver information"""
    driver_id: int
    first_name: str
    last_name: str
    tlc_license_number: Optional[str]
    phone: Optional[str]


class LeaseInfo(BaseModel):
    """Lease information"""
    lease_id: int
    lease_number: str
    start_date: datetime
    end_date: Optional[datetime]
    status: str


class SummonsInfo(BaseModel):
    """Summons document information"""
    summons_id: int
    document_id: int
    summons_type: Optional[str]
    presigned_url: Optional[str]
    uploaded_at: datetime
    uploaded_by: int
    verified: bool


class PVBViolationDetailResponse(BaseModel):
    """Detailed violation response with related entities"""
    id: int
    summons_number: str
    plate_number: str
    state: Optional[str]
    vehicle_type: Optional[str]
    
    issue_date: datetime
    system_entry_date: Optional[datetime]
    
    violation_code: Optional[str]
    violation_description: Optional[str]
    
    county: Optional[str]
    street_name: Optional[str]
    house_number: Optional[str]
    intersect_street: Optional[str]
    front_or_opposite: Optional[str]
    
    fine_amount: Decimal
    penalty_amount: Decimal
    interest_amount: Decimal
    reduction_amount: Decimal
    payment_amount: Decimal
    amount_due: Decimal
    
    judgment: Optional[str]
    penalty_warning: Optional[str]
    hearing_indicator: Optional[str]
    terminated: Optional[str]
    
    vehicle: Optional[VehicleInfo]
    driver: Optional[DriverInfo]
    lease: Optional[LeaseInfo]
    medallion_id: Optional[int]
    
    matched_curb_trip_id: Optional[str]
    mapping_method: str
    mapping_confidence: Optional[Decimal]
    mapping_notes: Optional[str]
    manually_assigned_by: Optional[int]
    manually_assigned_at: Optional[datetime]
    
    posted_to_ledger: bool
    ledger_balance_id: Optional[str]
    posting_status: str
    posted_at: Optional[datetime]
    
    violation_status: str
    resolution_status: str
    resolution_notes: Optional[str]
    
    import_batch_id: str
    import_source: str
    source_file_name: Optional[str]
    
    summons_documents: List[SummonsInfo] = []
    
    created_at: datetime
    created_by: Optional[int]
    updated_at: Optional[datetime]
    
    class Config:
        from_attributes = True


class UploadPVBCSVResponse(BaseModel):
    """Response for CSV upload"""
    success: bool
    batch_id: str
    message: str
    
    total_records: int
    total_imported: int
    total_duplicates: int
    total_failed: int
    
    auto_matched_count: int
    plate_only_count: int
    unmapped_count: int
    
    posted_to_ledger_count: int
    pending_posting_count: int
    
    duration_seconds: Optional[int]
    errors: Optional[List[str]] = None


class CreatePVBViolationResponse(BaseModel):
    """Response for manual creation"""
    violation_id: int
    summons_number: str
    status: str
    mapping_status: str
    mapped_to: Optional[Dict[str, Optional[int]]] = None
    posted_to_ledger: bool
    ledger_balance_id: Optional[str]
    message: str


class RemapPVBResponse(BaseModel):
    """Response for remapping"""
    success: bool
    violation_id: int
    previous_mapping: Dict[str, Optional[int]]
    new_mapping: Dict[str, int]
    ledger_updated: bool
    message: str


class PVBImportHistoryResponse(BaseModel):
    """Import history response"""
    batch_id: str
    import_source: str
    file_name: Optional[str]
    file_size_kb: Optional[int]
    
    date_from: Optional[datetime]
    date_to: Optional[datetime]
    plate_filter: Optional[str]
    
    total_records_in_file: int
    total_imported: int
    total_duplicates: int
    total_failed: int
    
    auto_matched_count: int
    plate_only_count: int
    unmapped_count: int
    
    posted_to_ledger_count: int
    pending_posting_count: int
    
    status: str
    started_at: datetime
    completed_at: Optional[datetime]
    duration_seconds: Optional[int]
    
    error_message: Optional[str]
    
    triggered_by: str
    triggered_by_user_id: Optional[int]
    
    class Config:
        from_attributes = True


class PaginatedPVBResponse(BaseModel):
    """Paginated violations response"""
    violations: List[PVBViolationResponse]
    total_count: int
    page: int
    page_size: int
    total_pages: int


class PaginatedImportHistoryResponse(BaseModel):
    """Paginated import history response"""
    imports: List[PVBImportHistoryResponse]
    total_count: int
    page: int
    page_size: int
    total_pages: int


class PVBStatisticsResponse(BaseModel):
    """Aggregated statistics response"""
    total_violations: int
    open_violations: int
    total_amount_due: Decimal
    
    by_status: Dict[str, int]
    by_mapping_method: Dict[str, int]
    by_state: Dict[str, int]
    
    unmapped_count: int
    unposted_count: int
    
    avg_fine_amount: Decimal
    avg_confidence_score: Optional[Decimal]
    
    last_import_date: Optional[datetime]
    total_imports: int


class UploadSummonsResponse(BaseModel):
    """Response for summons upload"""
    summons_id: int
    document_id: int
    violation_id: int
    presigned_url: Optional[str]
    uploaded_at: datetime
    message: str


class ImportFailureDetail(BaseModel):
    """Import failure detail"""
    row_number: Optional[int]
    error_type: str
    error_message: str
    field_name: Optional[str]
    raw_data: Optional[Dict[str, Any]]


class ImportBatchDetailResponse(BaseModel):
    """Detailed import batch response with failures"""
    batch_info: PVBImportHistoryResponse
    failures: List[ImportFailureDetail] = []
    sample_violations: List[PVBViolationResponse] = []