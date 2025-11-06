# app/dtr/schemas.py

from typing import Optional, List, Dict, Any
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, Field, field_validator, ValidationInfo

from app.dtr.models import DTRStatus, PaymentMethod


class DTRGenerationRequest(BaseModel):
    """Request schema for DTR generation"""
    lease_id: int = Field(..., description="Lease ID")
    driver_id: int = Field(..., description="Driver ID")
    period_start_date: date = Field(..., description="Period start date (Sunday)")
    period_end_date: date = Field(..., description="Period end date (Saturday)")
    auto_finalize: bool = Field(default=False, description="Automatically finalize DTR after generation")
    
    @field_validator('period_end_date')
    @classmethod
    def validate_period(cls, v, info: ValidationInfo):
        data = info.data if hasattr(info, 'data') else {}
        if 'period_start_date' in data and v < data['period_start_date']:
            raise ValueError('Period end date must be after start date')
        return v


class BatchDTRGenerationRequest(BaseModel):
    """Request schema for batch DTR generation"""
    period_start_date: date = Field(..., description="Period start date (Sunday)")
    period_end_date: date = Field(..., description="Period end date (Saturday)")
    auto_finalize: bool = Field(default=False, description="Automatically finalize DTRs after generation")


class DTRResponse(BaseModel):
    """Response schema for DTR"""
    id: int
    dtr_number: str
    receipt_number: str
    period_start_date: date
    period_end_date: date
    generation_date: datetime
    lease_id: int
    driver_id: int
    vehicle_id: Optional[int]
    medallion_id: Optional[int]
    status: str
    gross_cc_earnings: Decimal
    total_gross_earnings: Decimal
    lease_amount: Decimal
    mta_tif_fees: Decimal
    ezpass_tolls: Decimal
    violation_tickets: Decimal
    tlc_tickets: Decimal
    repairs: Decimal
    driver_loans: Decimal
    misc_charges: Decimal
    subtotal_charges: Decimal
    prior_balance: Decimal
    net_earnings: Decimal
    total_due_to_driver: Decimal
    payment_method: Optional[str]
    payment_date: Optional[datetime]
    ach_batch_number: Optional[str]
    check_number: Optional[str]
    is_additional_driver_dtr: bool
    created_on: datetime
    updated_on: Optional[datetime]
    
    class Config:
        from_attributes = True


class DTRDetailResponse(DTRResponse):
    """Detailed DTR response with breakdown"""
    tax_breakdown: Optional[Dict[str, Any]]
    ezpass_detail: Optional[List[Dict[str, Any]]]
    pvb_detail: Optional[List[Dict[str, Any]]]
    tlc_detail: Optional[List[Dict[str, Any]]]
    repair_detail: Optional[List[Dict[str, Any]]]
    loan_detail: Optional[List[Dict[str, Any]]]
    trip_log: Optional[List[Dict[str, Any]]]
    alerts: Optional[Dict[str, Any]]
    
    # Related entity information
    driver_name: Optional[str]
    tlc_license_number: Optional[str]
    medallion_number: Optional[str]
    vehicle_plate: Optional[str]
    lease_number: Optional[str]


class DTRListResponse(BaseModel):
    """Paginated list of DTRs"""
    items: List[DTRResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class DTRStatisticsResponse(BaseModel):
    """DTR statistics"""
    total_dtrs: int
    draft_dtrs: int
    finalized_dtrs: int
    paid_dtrs: int
    voided_dtrs: int
    total_earnings: Decimal
    total_due_to_drivers: Decimal


class DTRMarkAsPaidRequest(BaseModel):
    """Request to mark DTR as paid"""
    payment_method: PaymentMethod
    payment_date: datetime
    ach_batch_number: Optional[str] = None
    check_number: Optional[str] = None


class DTRVoidRequest(BaseModel):
    """Request to void DTR"""
    reason: str = Field(..., min_length=10, description="Reason for voiding the DTR")


class ACHBatchRequest(BaseModel):
    """Request to create ACH batch"""
    dtr_ids: List[int] = Field(..., min_items=1, description="List of DTR IDs to include in batch")
    effective_date: date = Field(..., description="Effective date for ACH batch")


class ACHBatchResponse(BaseModel):
    """ACH batch response"""
    batch_number: str
    batch_date: date
    total_amount: Decimal
    payment_count: int
    nacha_file_content: str


class NACHAFileRequest(BaseModel):
    """Request to generate NACHA file"""
    batch_number: str = Field(..., description="ACH batch number")
    company_name: str = Field(..., description="Company name")
    company_tax_id: str = Field(..., description="Company EIN/Tax ID")
    company_routing: str = Field(..., description="Company bank routing number")
    company_account: str = Field(..., description="Company bank account number")
    effective_date: date = Field(..., description="Effective entry date")


class DTRExportRequest(BaseModel):
    """Request for DTR export"""
    dtr_ids: List[int] = Field(..., min_items=1, description="List of DTR IDs to export")
    export_format: str = Field("pdf", description="Export format: pdf, csv, excel")


class DTRFilterParams(BaseModel):
    """Filter parameters for DTR list"""
    driver_id: Optional[int] = None
    lease_id: Optional[int] = None
    status: Optional[DTRStatus] = None
    period_start: Optional[date] = None
    period_end: Optional[date] = None
    is_additional_driver: Optional[bool] = None
    page: int = Field(1, ge=1)
    page_size: int = Field(50, ge=1, le=100)
    sort_by: str = Field("generation_date", description="Field to sort by")
    sort_order: str = Field("desc", description="Sort order: asc or desc")