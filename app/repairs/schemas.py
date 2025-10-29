"""
app/repairs/schemas.py

Pydantic schemas for Vehicle Repairs module
Validates request/response data and provides type safety
"""

from datetime import date, datetime
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, Field, field_validator

from app.repairs.models import WorkshopType, RepairStatus, InstallmentStatus, StartWeekOption


# === Request Schemas ===

class CreateRepairRequest(BaseModel):
    """Request to create a new repair invoice"""
    driver_id: int = Field(..., description="Driver responsible for payment", gt=0)
    lease_id: int = Field(..., description="Active lease", gt=0)
    vehicle_id: int = Field(..., description="Vehicle that was repaired", gt=0)
    medallion_id: Optional[int] = Field(None, description="Medallion if applicable")
    
    invoice_number: str = Field(..., min_length=1, max_length=100, description="Invoice number from workshop")
    invoice_date: date = Field(..., description="Date invoice was issued")
    workshop_type: WorkshopType = Field(..., description="Workshop type (BIG_APPLE or EXTERNAL)")
    repair_description: Optional[str] = Field(None, max_length=1000, description="Description of repair work")
    repair_amount: Decimal = Field(..., description="Total repair cost", gt=0, decimal_places=2)
    
    start_week: StartWeekOption = Field(
        default=StartWeekOption.CURRENT,
        description="When to start repayments (CURRENT or NEXT)"
    )
    
    invoice_document_id: Optional[int] = Field(None, description="Uploaded invoice document ID")
    
    @field_validator('repair_amount')
    @classmethod
    def validate_repair_amount(cls, v):
        if v <= 0:
            raise ValueError("Repair amount must be greater than 0")
        return v
    
    class Config:
        json_schema_extra = {
            "example": {
                "driver_id": 123,
                "lease_id": 456,
                "vehicle_id": 789,
                "medallion_id": 101,
                "invoice_number": "EXT-4589",
                "invoice_date": "2025-10-01",
                "workshop_type": "EXTERNAL",
                "repair_description": "Brake system overhaul - pads, rotors, calipers",
                "repair_amount": 1200.00,
                "start_week": "CURRENT",
                "invoice_document_id": 5001
            }
        }


class UpdateRepairRequest(BaseModel):
    """Request to update repair invoice details"""
    invoice_number: Optional[str] = Field(None, min_length=1, max_length=100)
    invoice_date: Optional[date] = None
    workshop_type: Optional[WorkshopType] = None
    repair_description: Optional[str] = Field(None, max_length=1000)
    repair_amount: Optional[Decimal] = Field(None, gt=0, decimal_places=2)
    start_week: Optional[StartWeekOption] = None
    invoice_document_id: Optional[int] = None
    
    @field_validator('repair_amount')
    @classmethod
    def validate_repair_amount(cls, v):
        if v is not None and v <= 0:
            raise ValueError("Repair amount must be greater than 0")
        return v


class UpdateRepairStatusRequest(BaseModel):
    """Request to update repair status"""
    status: RepairStatus = Field(..., description="New status")
    reason: Optional[str] = Field(None, max_length=500, description="Reason for status change (required for HOLD/CANCELLED)")
    
    @field_validator('reason')
    @classmethod
    def validate_reason(cls, v, values):
        if 'status' in values.data and values.data['status'] in [RepairStatus.HOLD, RepairStatus.CANCELLED]:
            if not v:
                raise ValueError("Reason is required when setting status to HOLD or CANCELLED")
        return v


class PostInstallmentsRequest(BaseModel):
    """Request to manually post installments to ledger"""
    installment_ids: List[str] = Field(..., min_length=1, max_length=100, description="List of installment IDs to post")
    
    @field_validator('installment_ids')
    @classmethod
    def validate_installment_ids(cls, v):
        if not v:
            raise ValueError("At least one installment ID must be provided")
        if len(v) > 100:
            raise ValueError("Cannot post more than 100 installments at once")
        return v


# === Response Schemas ===

class RepairInstallmentResponse(BaseModel):
    """Response schema for repair installment"""
    installment_id: str
    repair_id: str
    installment_number: int
    
    driver_id: int
    lease_id: int
    vehicle_id: Optional[int]
    medallion_id: Optional[int]
    
    week_start: date
    week_end: date
    due_date: date
    
    installment_amount: Decimal
    amount_paid: Decimal
    prior_balance: Decimal
    balance: Decimal
    
    status: InstallmentStatus
    posted_to_ledger: int
    ledger_posting_id: Optional[str]
    ledger_balance_id: Optional[str]
    posted_at: Optional[datetime]
    
    created_on: Optional[datetime]
    
    class Config:
        from_attributes = True


class RepairResponse(BaseModel):
    """Response schema for repair invoice"""
    repair_id: str
    
    # Entity linkage
    driver_id: int
    lease_id: int
    vehicle_id: int
    medallion_id: Optional[int]
    vin: Optional[str]
    plate_number: Optional[str]
    hack_license: Optional[str]
    
    # Invoice details
    invoice_number: str
    invoice_date: date
    workshop_type: WorkshopType
    repair_description: Optional[str]
    repair_amount: Decimal
    
    # Payment schedule
    start_week: StartWeekOption
    start_week_date: date
    weekly_installment_amount: Decimal
    
    # Payment tracking
    total_paid: Decimal
    outstanding_balance: Decimal
    
    # Status
    status: RepairStatus
    hold_reason: Optional[str]
    cancelled_reason: Optional[str]
    
    # Document
    invoice_document_id: Optional[int]
    
    # Timestamps
    confirmed_at: Optional[datetime]
    closed_at: Optional[datetime]
    created_on: Optional[datetime]
    updated_on: Optional[datetime]
    created_by: Optional[int]
    
    # Installments (optional, can be included in detail view)
    installments: Optional[List[RepairInstallmentResponse]] = None
    
    class Config:
        from_attributes = True


class RepairListResponse(BaseModel):
    """Response for list of repairs with pagination"""
    repairs: List[RepairResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class InstallmentListResponse(BaseModel):
    """Response for list of installments with pagination"""
    installments: List[RepairInstallmentResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class PostInstallmentsResponse(BaseModel):
    """Response after posting installments to ledger"""
    success_count: int
    failure_count: int
    posted_installments: List[str]
    failed_installments: List[dict]
    message: str


class RepairStatisticsResponse(BaseModel):
    """Statistics for repair invoices"""
    total_repairs: int
    open_repairs: int
    closed_repairs: int
    draft_repairs: int
    hold_repairs: int
    
    total_repair_amount: Decimal
    total_paid: Decimal
    total_outstanding: Decimal
    
    total_installments: int
    scheduled_installments: int
    posted_installments: int
    paid_installments: int
    
    average_repair_amount: Decimal
    average_weekly_installment: Decimal


# === Filter Schemas ===

class RepairFilters(BaseModel):
    """Filters for querying repairs"""
    repair_id: Optional[str] = None
    driver_id: Optional[int] = None
    lease_id: Optional[int] = None
    vehicle_id: Optional[int] = None
    medallion_id: Optional[int] = None
    
    invoice_number: Optional[str] = None
    workshop_type: Optional[WorkshopType] = None
    status: Optional[RepairStatus] = None
    
    invoice_date_from: Optional[date] = None
    invoice_date_to: Optional[date] = None
    
    amount_min: Optional[Decimal] = None
    amount_max: Optional[Decimal] = None
    
    page: int = Field(default=1, ge=1, description="Page number")
    page_size: int = Field(default=50, ge=1, le=1000, description="Items per page")
    sort_by: Optional[str] = Field(default="invoice_date", description="Field to sort by")
    sort_order: Optional[str] = Field(default="desc", pattern="^(asc|desc)$", description="Sort order")


class InstallmentFilters(BaseModel):
    """Filters for querying installments"""
    installment_id: Optional[str] = None
    repair_id: Optional[str] = None
    driver_id: Optional[int] = None
    lease_id: Optional[int] = None
    vehicle_id: Optional[int] = None
    medallion_id: Optional[int] = None
    
    period_start: Optional[date] = None
    period_end: Optional[date] = None
    
    status: Optional[InstallmentStatus] = None
    posted_to_ledger: Optional[int] = Field(None, ge=0, le=1, description="0=not posted, 1=posted")
    
    page: int = Field(default=1, ge=1, description="Page number")
    page_size: int = Field(default=50, ge=1, le=1000, description="Items per page")
    sort_by: Optional[str] = Field(default="week_start", description="Field to sort by")
    sort_order: Optional[str] = Field(default="asc", pattern="^(asc|desc)$", description="Sort order")