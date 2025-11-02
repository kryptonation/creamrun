"""
app/ledger/schemas.py

Pydantic schemas for request/response validation
"""

from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, Field, field_validator, model_validator

from app.ledger.models import (
    PostingType,
    PostingCategory,
    PostingStatus,
    BalanceStatus,
    PaymentReferenceType
)



# === Ledger Posting Schemas ===
class PostingBase(BaseModel):
    """Base schema for posting"""
    driver_id: int = Field(..., description="Driver ID", gt=0)
    lease_id: int = Field(..., description="Lease ID", gt=0)
    vehicle_id: Optional[int] = Field(None, description="Vehicle ID", gt=0)
    medallion_id: Optional[int] = Field(None, description="Medallion ID", gt=0)
    
    posting_type: PostingType = Field(..., description="DEBIT or CREDIT")
    category: PostingCategory = Field(..., description="Financial category")
    amount: Decimal = Field(..., description="Transaction amount", gt=0)
    
    source_type: str = Field(..., description="Source system", max_length=100)
    source_id: str = Field(..., description="Source record ID", max_length=100)
    
    payment_period_start: datetime = Field(..., description="Payment week start (Sunday)")
    payment_period_end: datetime = Field(..., description="Payment week end (Saturday)")
    
    description: Optional[str] = Field(None, description="Human-readable description")
    notes: Optional[str] = Field(None, description="Additional notes")
    
    @field_validator('amount')
    @classmethod
    def validate_amount(cls, v):
        if v <= 0:
            raise ValueError("Amount must be greater than 0")
        return v
    
    @model_validator(mode='after')
    def validate_payment_period(self):
        """Validate payment period is Sunday to Saturday"""
        start = self.payment_period_start
        end = self.payment_period_end
        
        # Check start is Sunday (weekday 6)
        if start.weekday() != 6:
            raise ValueError("Payment period must start on Sunday")
        
        # Check end is Saturday (weekday 5)
        if end.weekday() != 5:
            raise ValueError("Payment period must end on Saturday")
        
        # Check they're in the same week
        if (end - start).days != 6:
            raise ValueError("Payment period must be exactly 7 days (Sunday to Saturday)")
        
        return self


class CreatePostingRequest(PostingBase):
    """Request to create a new posting"""
    pass


class PostingResponse(PostingBase):
    """Response with posting details"""
    id: int
    posting_id: str
    status: PostingStatus
    posted_at: Optional[datetime]
    posted_by: Optional[int]
    voided_by_posting_id: Optional[str]
    voided_at: Optional[datetime]
    void_reason: Optional[str]
    created_at: datetime
    created_by: Optional[int]
    modified_at: Optional[datetime]
    modified_by: Optional[int]
    
    class Config:
        from_attributes = True


class VoidPostingRequest(BaseModel):
    """Request to void a posting"""
    posting_id: str = Field(..., description="Posting ID to void")
    reason: str = Field(..., description="Reason for voiding", min_length=10)


# === Ledger Balance Schemas ===
class BalanceBase(BaseModel):
    """Base schema for balance"""
    driver_id: int = Field(..., gt=0)
    lease_id: int = Field(..., gt=0)
    category: PostingCategory
    reference_type: str = Field(..., max_length=100)
    reference_id: str = Field(..., max_length=100)
    original_amount: Decimal = Field(..., ge=0)
    payment_period_start: datetime
    payment_period_end: datetime
    due_date: Optional[datetime] = None
    description: Optional[str] = None


class CreateObligationRequest(BalanceBase):
    """Request to create a new obligation"""
    pass


class BalanceResponse(BalanceBase):
    """Response with balance details"""
    id: int
    balance_id: str
    prior_balance: Decimal
    current_amount: Decimal
    payment_applied: Decimal
    outstanding_balance: Decimal
    status: BalanceStatus
    payment_reference: Optional[str]
    created_at: datetime
    created_by: Optional[int]
    modified_at: Optional[datetime]
    modified_by: Optional[int]
    
    class Config:
        from_attributes = True


class DriverBalanceSummary(BaseModel):
    """Summary of driver balances by category"""
    driver_id: int
    lease_id: int
    category: PostingCategory
    total_obligations: Decimal
    total_paid: Decimal
    outstanding_balance: Decimal
    open_balance_count: int


# === Payment Application Schemas ===
class ApplyPaymentRequest(BaseModel):
    """Request to apply payment to specific balance"""
    balance_id: str = Field(..., description="Balance ID to apply payment to")
    payment_amount: Decimal = Field(..., description="Amount to apply", gt=0)
    allocation_type: PaymentReferenceType = Field(..., description="Type of allocation")
    notes: Optional[str] = Field(None, description="Additional notes")


class ApplyPaymentHierarchyRequest(BaseModel):
    """Request to apply payment following hierarchy rules"""
    driver_id: int = Field(..., gt=0)
    lease_id: int = Field(..., gt=0)
    payment_amount: Decimal = Field(..., gt=0)
    payment_period_start: datetime
    payment_period_end: datetime
    source_type: str = Field(..., max_length=100)
    source_id: str = Field(..., max_length=100)
    allocation_type: PaymentReferenceType = PaymentReferenceType.DTR_ALLOCATION
    notes: Optional[str] = None


class AllocationResponse(BaseModel):
    """Response with allocation details"""
    id: int
    allocation_id: str
    balance_id: str
    payment_posting_id: str
    amount_allocated: Decimal
    allocation_type: PaymentReferenceType
    allocation_date: datetime
    notes: Optional[str]
    created_at: datetime
    created_by: Optional[int]
    
    class Config:
        from_attributes = True


class PaymentApplicationResult(BaseModel):
    """Result of payment application"""
    total_payment: Decimal
    total_allocated: Decimal
    remaining_unallocated: Decimal
    allocations: List[AllocationResponse]
    balances_updated: List[BalanceResponse]


# === Query filters ===
class PostingFilters(BaseModel):
    """Query filters for postings"""
    driver_id: Optional[int] = None
    lease_id: Optional[int] = None
    category: Optional[PostingCategory] = None
    status: Optional[PostingStatus] = None
    posting_type: Optional[PostingType] = None
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None
    limit: int = Field(100, le=1000)
    offset: int = Field(0, ge=0)


class BalanceFilters(BaseModel):
    """Query filters for balances"""
    driver_id: Optional[int] = None
    lease_id: Optional[int] = None
    category: Optional[PostingCategory] = None
    status: Optional[BalanceStatus] = None
    due_date_from: Optional[datetime] = None
    due_date_to: Optional[datetime] = None
    limit: int = Field(100, le=1000)
    offset: int = Field(0, ge=0)


# === Utility Schemas ===
class ErrorResponse(BaseModel):
    """Standard error response"""
    error_code: str
    message: str
    details: Optional[dict] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class SuccessResponse(BaseModel):
    """Standard success response"""
    success: bool = True
    message: str
    data: Optional[dict] = None