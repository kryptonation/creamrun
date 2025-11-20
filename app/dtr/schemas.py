# app/dtr/schemas.py

from pydantic import BaseModel, Field, field_validator
from datetime import date, datetime
from decimal import Decimal
from typing import Optional, List, Dict, Any
from app.dtr.models import DTRStatus, PaymentMethod


class DTRGenerationRequest(BaseModel):
    """
    CORRECTED: Request to generate a single DTR.
    
    No longer requires driver_id - DTR is per lease only.
    """
    lease_id: int = Field(..., description="Lease ID to generate DTR for")
    period_start_date: date = Field(..., description="Payment period start (Sunday)")
    period_end_date: date = Field(..., description="Payment period end (Saturday)")
    auto_finalize: bool = Field(default=False, description="Auto-finalize after generation")
    
    @field_validator('period_start_date')
    @classmethod
    def validate_period_start(cls, v):
        """Ensure period starts on Sunday"""
        if v.weekday() != 6:  # 6 = Sunday
            raise ValueError("Period must start on Sunday")
        return v
    
    @field_validator('period_end_date')
    @classmethod
    def validate_period_end(cls, v):
        """Ensure period ends on Saturday"""
        if v.weekday() != 5:  # 5 = Saturday
            raise ValueError("Period must end on Saturday")
        return v


class BatchDTRGenerationRequest(BaseModel):
    """Request to generate DTRs for all active leases"""
    period_start_date: date = Field(..., description="Payment period start (Sunday)")
    period_end_date: date = Field(..., description="Payment period end (Saturday)")
    auto_finalize: bool = Field(default=False, description="Auto-finalize all DTRs")
    regenerate_existing: bool = Field(default=False, description="Regenerate existing DTRs")
    lease_status_filter: Optional[str] = Field(None, description="Filter by lease status (e.g., ACTIVE)")


class DTRResponse(BaseModel):
    """Basic DTR response"""
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
    
    # Financial summary
    total_gross_earnings: Decimal
    subtotal_deductions: Decimal
    net_earnings: Decimal
    total_due_to_driver: Decimal
    
    # Payment info
    payment_method: Optional[str]
    payment_date: Optional[datetime]
    ach_batch_number: Optional[str]
    check_number: Optional[str]
    
    # Timestamps
    created_on: Optional[datetime]
    updated_on: Optional[datetime]
    
    class Config:
        from_attributes = True


class DTRDetailResponse(BaseModel):
    """Complete DTR response with all details"""
    id: int
    dtr_number: str
    receipt_number: str
    period_start_date: date
    period_end_date: date
    generation_date: datetime
    
    # References
    lease_id: int
    driver_id: int
    vehicle_id: Optional[int]
    medallion_id: Optional[int]
    
    # Status
    status: str
    
    # Consolidated Earnings (from ALL drivers)
    gross_cc_earnings: Decimal
    gross_cash_earnings: Decimal
    total_gross_earnings: Decimal
    
    # Deductions
    lease_amount: Decimal
    mta_tif_fees: Decimal
    ezpass_tolls: Decimal
    violation_tickets: Decimal
    tlc_tickets: Decimal
    repairs: Decimal
    driver_loans: Decimal
    misc_charges: Decimal
    
    # Calculated Totals
    subtotal_deductions: Decimal
    prior_balance: Decimal
    net_earnings: Decimal
    total_due_to_driver: Decimal
    
    # Payment Information
    payment_method: Optional[str]
    payment_date: Optional[datetime]
    ach_batch_number: Optional[str]
    check_number: Optional[str]
    account_number_masked: Optional[str]
    
    # Additional Drivers Detail - NEW
    additional_drivers_detail: Optional[List[Dict[str, Any]]] = Field(
        None,
        description="Array of additional driver detail sections"
    )
    
    # Detailed Breakdowns
    tax_breakdown: Optional[Dict[str, Any]]
    ezpass_detail: Optional[Dict[str, Any]]
    pvb_detail: Optional[Dict[str, Any]]
    tlc_detail: Optional[Dict[str, Any]]
    repair_detail: Optional[Dict[str, Any]]
    loan_detail: Optional[Dict[str, Any]]
    trip_log: Optional[Dict[str, Any]]
    alerts: Optional[Dict[str, Any]]
    
    # Metadata
    notes: Optional[str]
    voided_reason: Optional[str]
    created_on: Optional[datetime]
    updated_on: Optional[datetime]
    
    class Config:
        from_attributes = True


class DTRGenerationSummary(BaseModel):
    """Summary of batch DTR generation"""
    total_leases_found: int = Field(..., description="Number of leases found")
    dtrs_generated: int = Field(..., description="DTRs successfully generated")
    dtrs_skipped: int = Field(..., description="DTRs skipped (already exist)")
    dtrs_failed: int = Field(..., description="DTRs failed to generate")
    period_start: date
    period_end: date
    
    # Detailed lists
    generated_dtrs: List[Dict[str, Any]] = Field(default_factory=list)
    skipped_dtrs: List[Dict[str, Any]] = Field(default_factory=list)
    failed_dtrs: List[Dict[str, Any]] = Field(default_factory=list)


class DTRListResponse(BaseModel):
    """Paginated list of DTRs"""
    items: List[DTRResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class AdditionalDriverDetail(BaseModel):
    """
    Detail section for an additional driver.
    
    Contains only the charges and earnings applicable to additional drivers:
    - Their CC earnings
    - Their applicable taxes (MTA/TIF/etc)
    - Their EZPass tolls
    - Their PVB violations
    - Their trip log
    - Their alerts
    
    Does NOT contain:
    - Lease amount (primary driver only)
    - TLC tickets (lease level)
    - Repairs (primary driver only)
    - Loans (primary driver only)
    - Misc charges (primary driver only)
    """
    driver_id: int
    driver_name: str
    tlc_license: Optional[str]
    
    # Earnings
    cc_earnings: Decimal
    
    # Applicable Charges
    charges: Dict[str, Decimal] = Field(
        ...,
        description="Contains: mta_tif_fees, ezpass_tolls, violation_tickets"
    )
    
    # Calculated
    subtotal: Decimal
    net_earnings: Decimal
    
    # Details
    tax_breakdown: Optional[Dict[str, Any]]
    ezpass_detail: Optional[List[Dict[str, Any]]]
    pvb_detail: Optional[List[Dict[str, Any]]]
    trip_log: Optional[List[Dict[str, Any]]]
    alerts: Optional[List[Dict[str, Any]]]


class DTRStatistics(BaseModel):
    """DTR statistics for reporting"""
    total_dtrs: int
    by_status: Dict[str, int]
    total_gross_earnings: Decimal
    total_deductions: Decimal
    total_net_earnings: Decimal
    total_due_to_drivers: Decimal
    average_dtr_amount: Decimal


class DTRUpdateRequest(BaseModel):
    """Request to update DTR fields"""
    notes: Optional[str] = None
    status: Optional[DTRStatus] = None


class DTRVoidRequest(BaseModel):
    """Request to void a DTR"""
    reason: str = Field(..., min_length=10, max_length=500)


class DTRPaymentRequest(BaseModel):
    """Request to mark DTR as paid"""
    payment_method: PaymentMethod
    payment_date: date
    ach_batch_number: Optional[str] = None
    check_number: Optional[str] = None