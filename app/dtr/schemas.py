"""
app/dtr/schemas.py

Pydantic schemas for DTR module
"""

from datetime import date, datetime
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, Field, field_validator

from app.dtr.models import DTRStatus, DTRPaymentType


# Request Schemas

class GenerateDTRRequest(BaseModel):
    """Request to generate DTRs for a specific period"""
    period_start: date = Field(..., description="Payment period start date (must be Sunday)")
    period_end: date = Field(..., description="Payment period end date (must be Saturday)")
    lease_ids: Optional[List[int]] = Field(None, description="Specific lease IDs to generate DTRs for. If None, generates for all active leases")
    regenerate: bool = Field(False, description="If True, regenerates DTRs even if they already exist")
    
    @field_validator('period_start')
    @classmethod
    def validate_period_start_sunday(cls, v):
        if v.weekday() != 6:  # 6 = Sunday
            raise ValueError('Period start must be a Sunday')
        return v
    
    @field_validator('period_end')
    @classmethod
    def validate_period_end_saturday(cls, v):
        if v.weekday() != 5:  # 5 = Saturday
            raise ValueError('Period end must be a Saturday')
        return v
    
    @field_validator('period_end')
    @classmethod
    def validate_period_length(cls, v, values):
        if 'period_start' in values:
            delta = (v - values['period_start']).days
            if delta != 6:
                raise ValueError('Period must be exactly 7 days (Sunday to Saturday)')
        return v
    
    class Config:
        json_schema_extra = {
            "example": {
                "period_start": "2025-11-03",
                "period_end": "2025-11-09",
                "lease_ids": None,
                "regenerate": False
            }
        }


class UpdateDTRPaymentRequest(BaseModel):
    """Request to update payment information for a DTR"""
    payment_type: DTRPaymentType = Field(..., description="Payment method")
    batch_number: Optional[str] = Field(None, description="Batch/Check number")
    payment_date: Optional[date] = Field(None, description="Payment date")
    
    class Config:
        json_schema_extra = {
            "example": {
                "payment_type": "ACH",
                "batch_number": "BATCH-2025-11-001",
                "payment_date": "2025-11-10"
            }
        }


class VoidDTRRequest(BaseModel):
    """Request to void a DTR"""
    reason: str = Field(..., min_length=10, max_length=500, description="Reason for voiding the DTR")
    
    class Config:
        json_schema_extra = {
            "example": {
                "reason": "Incorrect period dates - regenerating with correct data"
            }
        }


# Response Schemas

class DTRSummaryResponse(BaseModel):
    """Summary response for a DTR (list view)"""
    dtr_id: str
    receipt_number: str
    receipt_date: date
    period_start: date
    period_end: date
    lease_id: int
    driver_id: int
    driver_name: Optional[str] = None
    medallion_number: Optional[str] = None
    tlc_license: Optional[str] = None
    total_earnings: Decimal
    total_deductions: Decimal
    net_earnings: Decimal
    prior_balance: Decimal
    total_due: Decimal
    status: DTRStatus
    payment_type: DTRPaymentType
    batch_number: Optional[str] = None
    payment_date: Optional[date] = None
    generated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "dtr_id": "DTR-1045-2025-11-03",
                "receipt_number": "RCPT-2025-000123",
                "receipt_date": "2025-11-10",
                "period_start": "2025-11-03",
                "period_end": "2025-11-09",
                "lease_id": 1045,
                "driver_id": 456,
                "driver_name": "John Doe",
                "medallion_number": "1W47",
                "tlc_license": "5087912",
                "total_earnings": "1250.00",
                "total_deductions": "650.00",
                "net_earnings": "600.00",
                "prior_balance": "-50.00",
                "total_due": "550.00",
                "status": "GENERATED",
                "payment_type": "ACH",
                "batch_number": "BATCH-2025-11-001",
                "payment_date": "2025-11-10",
                "generated_at": "2025-11-10T05:00:00"
            }
        }


class DTRDetailResponse(BaseModel):
    """Detailed response for a single DTR"""
    dtr_id: str
    receipt_number: str
    receipt_date: date
    period_start: date
    period_end: date
    
    # Entity Information
    lease_id: int
    driver_id: int
    vehicle_id: Optional[int] = None
    medallion_id: Optional[int] = None
    
    # Driver Information
    driver_name: Optional[str] = None
    tlc_license: Optional[str] = None
    medallion_number: Optional[str] = None
    vehicle_plate: Optional[str] = None
    vehicle_vin: Optional[str] = None
    
    # Earnings
    cc_earnings: Decimal
    cash_earnings: Decimal
    total_earnings: Decimal
    
    # Deductions
    taxes_amount: Decimal
    ezpass_amount: Decimal
    lease_amount: Decimal
    pvb_amount: Decimal
    tlc_amount: Decimal
    repairs_amount: Decimal
    loans_amount: Decimal
    misc_amount: Decimal
    total_deductions: Decimal
    
    # Balance
    prior_balance: Decimal
    net_earnings: Decimal
    total_due: Decimal
    deposit_amount: Decimal
    
    # Payment
    payment_type: DTRPaymentType
    batch_number: Optional[str] = None
    payment_date: Optional[date] = None
    
    # PDF
    pdf_s3_key: Optional[str] = None
    pdf_url: Optional[str] = None
    
    # Status
    status: DTRStatus
    generated_at: Optional[datetime] = None
    generated_by_user_id: Optional[int] = None
    voided_at: Optional[datetime] = None
    voided_by_user_id: Optional[int] = None
    voided_reason: Optional[str] = None
    
    created_on: datetime
    updated_on: datetime
    
    class Config:
        from_attributes = True


class GenerateDTRResponse(BaseModel):
    """Response after generating DTRs"""
    success: bool
    message: str
    total_generated: int
    total_failed: int
    generated_dtr_ids: List[str]
    failed_lease_ids: List[int]
    errors: List[str]
    
    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "message": "Successfully generated 45 DTRs",
                "total_generated": 45,
                "total_failed": 2,
                "generated_dtr_ids": ["DTR-1045-2025-11-03", "DTR-1046-2025-11-03"],
                "failed_lease_ids": [1050, 1051],
                "errors": [
                    "Lease 1050: No active driver found",
                    "Lease 1051: Invalid period dates"
                ]
            }
        }


class PaginatedDTRResponse(BaseModel):
    """Paginated list of DTRs"""
    items: List[DTRSummaryResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
    
    class Config:
        json_schema_extra = {
            "example": {
                "items": [],
                "total": 150,
                "page": 1,
                "page_size": 20,
                "total_pages": 8
            }
        }


class DTRStatisticsResponse(BaseModel):
    """Statistics for DTR module"""
    total_dtrs: int
    pending_dtrs: int
    generated_dtrs: int
    failed_dtrs: int
    voided_dtrs: int
    total_earnings_current_week: Decimal
    total_deductions_current_week: Decimal
    total_net_earnings_current_week: Decimal
    avg_net_earnings_per_dtr: Decimal
    
    class Config:
        json_schema_extra = {
            "example": {
                "total_dtrs": 250,
                "pending_dtrs": 5,
                "generated_dtrs": 240,
                "failed_dtrs": 3,
                "voided_dtrs": 2,
                "total_earnings_current_week": "125000.00",
                "total_deductions_current_week": "75000.00",
                "total_net_earnings_current_week": "50000.00",
                "avg_net_earnings_per_dtr": "500.00"
            }
        }


class DTRGenerationHistoryResponse(BaseModel):
    """DTR generation history entry"""
    id: int
    generation_date: datetime
    period_start: date
    period_end: date
    total_dtrs_generated: int
    total_failed: int
    generation_time_seconds: Optional[Decimal] = None
    status: str
    error_message: Optional[str] = None
    triggered_by: str
    triggered_by_user_id: Optional[int] = None
    
    class Config:
        from_attributes = True