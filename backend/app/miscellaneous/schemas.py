"""
app/miscellaneous/schemas.py

Pydantic schemas for request/response validation
"""

from datetime import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, Field, field_validator, ConfigDict

from app.miscellaneous.models import MiscChargeCategory, MiscChargeStatus


class MiscChargeBase(BaseModel):
    """Base schema with common fields"""
    driver_id: int = Field(..., description="Driver ID", gt=0)
    lease_id: int = Field(..., description="Lease ID", gt=0)
    vehicle_id: Optional[int] = Field(None, description="Vehicle ID", gt=0)
    medallion_id: Optional[int] = Field(None, description="Medallion ID", gt=0)
    category: MiscChargeCategory = Field(..., description="Charge category")
    charge_amount: Decimal = Field(..., description="Charge amount", decimal_places=2)
    charge_date: datetime = Field(..., description="Date charge was incurred")
    payment_period_start: datetime = Field(..., description="Payment period start (Sunday)")
    payment_period_end: datetime = Field(..., description="Payment period end (Saturday)")
    description: str = Field(..., description="Charge description", min_length=1, max_length=1000)
    notes: Optional[str] = Field(None, description="Internal notes", max_length=2000)
    reference_number: Optional[str] = Field(None, description="External reference", max_length=100)


class CreateMiscChargeRequest(MiscChargeBase):
    """Request schema for creating a miscellaneous charge"""
    
    @field_validator('charge_amount')
    @classmethod
    def validate_amount(cls, v: Decimal) -> Decimal:
        if v == 0:
            raise ValueError("Charge amount cannot be zero")
        return v
    
    @field_validator('payment_period_start')
    @classmethod
    def validate_period_start(cls, v: datetime) -> datetime:
        if v.weekday() != 6:  # 6 = Sunday
            raise ValueError("Payment period start must be a Sunday")
        if v.hour != 0 or v.minute != 0 or v.second != 0:
            raise ValueError("Payment period start must be at 00:00:00")
        return v
    
    @field_validator('payment_period_end')
    @classmethod
    def validate_period_end(cls, v: datetime) -> datetime:
        if v.weekday() != 5:  # 5 = Saturday
            raise ValueError("Payment period end must be a Saturday")
        if v.hour != 23 or v.minute != 59 or v.second != 59:
            raise ValueError("Payment period end must be at 23:59:59")
        return v


class UpdateMiscChargeRequest(BaseModel):
    """Request schema for updating a miscellaneous charge"""
    category: Optional[MiscChargeCategory] = Field(None, description="Charge category")
    charge_amount: Optional[Decimal] = Field(None, description="Charge amount", decimal_places=2)
    charge_date: Optional[datetime] = Field(None, description="Date charge was incurred")
    description: Optional[str] = Field(None, description="Charge description", max_length=1000)
    notes: Optional[str] = Field(None, description="Internal notes", max_length=2000)
    reference_number: Optional[str] = Field(None, description="External reference", max_length=100)
    
    @field_validator('charge_amount')
    @classmethod
    def validate_amount(cls, v: Optional[Decimal]) -> Optional[Decimal]:
        if v is not None and v == 0:
            raise ValueError("Charge amount cannot be zero")
        return v


class VoidMiscChargeRequest(BaseModel):
    """Request schema for voiding a miscellaneous charge"""
    void_reason: str = Field(..., description="Reason for voiding", min_length=10, max_length=500)


class MiscChargeResponse(BaseModel):
    """Response schema for miscellaneous charge"""
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    expense_id: str
    driver_id: int
    lease_id: int
    vehicle_id: Optional[int]
    medallion_id: Optional[int]
    category: MiscChargeCategory
    charge_amount: Decimal
    charge_date: datetime
    payment_period_start: datetime
    payment_period_end: datetime
    description: str
    notes: Optional[str]
    reference_number: Optional[str]
    status: MiscChargeStatus
    posted_to_ledger: int
    ledger_posting_id: Optional[str]
    ledger_balance_id: Optional[str]
    posted_at: Optional[datetime]
    posted_by: Optional[int]
    voided_at: Optional[datetime]
    voided_by: Optional[int]
    voided_reason: Optional[str]
    voided_ledger_posting_id: Optional[str]
    created_on: datetime
    created_by: int
    updated_on: Optional[datetime]
    updated_by: Optional[int]


class MiscChargeListResponse(BaseModel):
    """Response schema for list of charges"""
    charges: list[MiscChargeResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class MiscChargeStatistics(BaseModel):
    """Statistics response schema"""
    total_charges: int
    total_amount: Decimal
    pending_charges: int
    pending_amount: Decimal
    posted_charges: int
    posted_amount: Decimal
    voided_charges: int
    voided_amount: Decimal
    by_category: dict[str, dict[str, Decimal]]


class PostMiscChargeResponse(BaseModel):
    """Response for posting operation"""
    expense_id: str
    status: str
    ledger_posting_id: Optional[str]
    ledger_balance_id: Optional[str]
    posted_at: Optional[datetime]
    message: str


class BulkPostRequest(BaseModel):
    """Request for bulk posting"""
    expense_ids: list[str] = Field(..., description="List of expense IDs to post", min_length=1)


class BulkPostResponse(BaseModel):
    """Response for bulk posting"""
    total_requested: int
    successful: int
    failed: int
    results: list[PostMiscChargeResponse]
    errors: list[dict[str, str]]