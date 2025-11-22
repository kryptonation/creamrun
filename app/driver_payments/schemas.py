### app/driver_payments/schemas.py

"""
Pydantic schemas for Driver Payments module API validation and serialization.
"""

from datetime import date, datetime
from decimal import Decimal
from typing import Optional, List

from pydantic import BaseModel, Field, field_validator

from app.driver_payments.models import DTRStatus, ACHBatchStatus, PaymentType


class DTRResponse(BaseModel):
    """Response schema for a single DTR with complete vehicle and driver identification."""
    id: int
    receipt_number: str
    
    # Period
    week_start_date: date
    week_end_date: date
    generation_date: datetime
    
    # Entity Information - ENHANCED with all identification fields
    driver_id: int
    driver_name: Optional[str] = None
    tlc_license: Optional[str] = None  # TLC License Number
    
    lease_id: int
    lease_number: Optional[str] = None
    
    vehicle_id: Optional[int] = None
    plate_number: Optional[str] = None  # Vehicle Plate Number
    vin: Optional[str] = None  # Vehicle Identification Number (VIN)
    
    medallion_id: Optional[int] = None
    medallion_number: Optional[str] = None  # Medallion Number
    
    # Earnings
    credit_card_earnings: Decimal
    
    # Deductions
    lease_amount: Decimal
    mta_fees_total: Decimal
    mta_fee_mta: Decimal
    mta_fee_tif: Decimal
    mta_fee_congestion: Decimal
    mta_fee_crbt: Decimal
    mta_fee_airport: Decimal
    ezpass_tolls: Decimal
    pvb_violations: Decimal
    tlc_tickets: Decimal
    repairs: Decimal
    driver_loans: Decimal
    misc_charges: Decimal
    
    # Calculations
    subtotal_deductions: Decimal
    net_earnings: Decimal
    total_due_to_driver: Decimal
    
    # Payment Info
    status: DTRStatus
    payment_type: Optional[PaymentType] = None
    ach_batch_number: Optional[str] = None
    check_number: Optional[str] = None
    payment_date: Optional[datetime] = None
    
    class Config:
        """Pydantic configuration"""
        from_attributes = True


class PaginatedDTRResponse(BaseModel):
    """Paginated list of DTRs."""
    items: List[DTRResponse]
    total_items: int
    page: int
    per_page: int
    total_pages: int


class ACHBatchCreateRequest(BaseModel):
    """Request to create ACH batch with selected DTRs."""
    dtr_ids: List[int] = Field(..., min_items=1, description="List of DTR IDs to include in batch")
    effective_date: Optional[date] = Field(None, description="Effective date for ACH processing")
    
    @field_validator('dtr_ids')
    @classmethod
    def validate_dtr_ids(cls, v):
        if not v:
            raise ValueError("At least one DTR must be selected")
        return v


class ACHBatchResponse(BaseModel):
    """Response schema for ACH batch."""
    id: int
    batch_number: str
    batch_date: datetime
    effective_date: date
    status: ACHBatchStatus
    total_payments: int
    total_amount: Decimal
    nacha_file_path: Optional[str] = None
    nacha_generated_at: Optional[datetime] = None
    is_reversed: bool
    reversed_at: Optional[datetime] = None
    reversal_reason: Optional[str] = None
    created_on: datetime
    
    class Config:
        from_attributes = True


class ACHBatchDetailResponse(ACHBatchResponse):
    """Detailed ACH batch response with included DTRs."""
    receipts: List[DTRResponse] = []


class PaginatedACHBatchResponse(BaseModel):
    """Paginated list of ACH batches."""
    items: List[ACHBatchResponse]
    total_items: int
    page: int
    per_page: int
    total_pages: int


class BatchReversalRequest(BaseModel):
    """Request to reverse an ACH batch."""
    reason: str = Field(..., min_length=10, description="Reason for batch reversal")


class CheckPaymentRequest(BaseModel):
    """Request to mark DTR as paid by check."""
    dtr_id: int
    check_number: str = Field(..., min_length=1, max_length=50)
    payment_date: Optional[datetime] = None


class BulkCheckPaymentRequest(BaseModel):
    """Request to mark multiple DTRs as paid by check."""
    payments: List[CheckPaymentRequest]


class GenerateDTRsRequest(BaseModel):
    """Request to generate DTRs for a specific week."""
    week_start_date: date = Field(..., description="Sunday date - start of week")
    
    @field_validator('week_start_date')
    @classmethod
    def validate_sunday(cls, v):
        if v.weekday() != 6:  # 6 = Sunday
            raise ValueError("week_start_date must be a Sunday")
        return v


class CompanyBankConfigRequest(BaseModel):
    """Request to create/update company bank configuration."""
    company_name: str = Field(..., max_length=255)
    company_tax_id: str = Field(..., pattern=r'^\d{10}$', description="10-digit EIN")
    bank_name: str = Field(..., max_length=255)
    bank_routing_number: str = Field(..., pattern=r'^\d{9}$', description="9-digit routing number")
    bank_account_number: str = Field(..., max_length=17)
    immediate_origin: str = Field(..., max_length=10)
    immediate_destination: str = Field(..., max_length=10)
    company_entry_description: str = Field(default="DRVPAY", max_length=10)


class CompanyBankConfigResponse(BaseModel):
    """Response schema for company bank configuration."""
    id: int
    company_name: str
    company_tax_id: str
    bank_name: str
    bank_routing_number: str
    bank_account_number_masked: str
    immediate_origin: str
    immediate_destination: str
    company_entry_description: str
    is_active: bool
    created_on: datetime
    updated_on: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class NACHAFileGenerateRequest(BaseModel):
    """Request to generate NACHA file for a batch."""
    batch_id: int


class DTRExportRequest(BaseModel):
    """Request for DTR export with filters."""
    format: str = Field(..., pattern=r'^(excel|pdf|csv)$')
    # All filter parameters from list endpoint can be included
    week_start_date: Optional[date] = None
    week_end_date: Optional[date] = None
    driver_name: Optional[str] = None
    tlc_license: Optional[str] = None
    is_paid: Optional[bool] = None