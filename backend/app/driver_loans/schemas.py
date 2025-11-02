# app/driver_loans/schemas.py

from datetime import date, datetime
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, Field, field_validator, ConfigDict

from app.driver_loans.models import LoanStatus, InstallmentStatus


# === Request Schemas ===

class CreateLoanRequest(BaseModel):
    """Request schema for creating a new loan"""
    driver_id: int = Field(..., gt=0, description="Driver ID")
    lease_id: int = Field(..., gt=0, description="Lease ID")
    loan_amount: Decimal = Field(..., gt=0, description="Principal amount")
    interest_rate: Decimal = Field(default=Decimal('0.00'), ge=0, le=100, description="Annual percentage rate")
    purpose: Optional[str] = Field(None, max_length=255, description="Reason for loan")
    notes: Optional[str] = Field(None, description="Additional notes")
    start_week: date = Field(..., description="Sunday when payments start (must be a Sunday)")
    
    @field_validator('start_week')
    @classmethod
    def validate_start_week_is_sunday(cls, v: date) -> date:
        """Ensure start_week is a Sunday"""
        if v.weekday() != 6:  # 6 = Sunday
            raise ValueError("start_week must be a Sunday")
        return v
    
    model_config = ConfigDict(from_attributes=True)


class UpdateLoanStatusRequest(BaseModel):
    """Request schema for updating loan status"""
    status: LoanStatus = Field(..., description="New loan status")
    reason: Optional[str] = Field(None, max_length=500, description="Reason for status change")
    
    model_config = ConfigDict(from_attributes=True)


class PostInstallmentsRequest(BaseModel):
    """Request schema for posting installments to ledger"""
    loan_id: Optional[str] = Field(None, description="Specific loan ID to post")
    payment_period_start: Optional[date] = Field(None, description="Payment period start")
    payment_period_end: Optional[date] = Field(None, description="Payment period end")
    dry_run: bool = Field(default=False, description="Simulate posting without committing")
    
    model_config = ConfigDict(from_attributes=True)


# === Response Schemas ===

class LoanScheduleResponse(BaseModel):
    """Response schema for loan installment"""
    id: int
    installment_id: str
    loan_id: str
    installment_number: int
    due_date: date
    week_start: date
    week_end: date
    principal_amount: Decimal
    interest_amount: Decimal
    total_due: Decimal
    principal_paid: Decimal
    interest_paid: Decimal
    outstanding_balance: Decimal
    status: InstallmentStatus
    ledger_balance_id: Optional[str]
    posted_to_ledger: bool
    posted_on: Optional[datetime]
    posted_by: Optional[int]
    created_on: Optional[datetime]
    updated_on: Optional[datetime]
    
    model_config = ConfigDict(from_attributes=True)


class DriverLoanResponse(BaseModel):
    """Response schema for driver loan"""
    id: int
    loan_id: str
    loan_number: Optional[str]
    driver_id: int
    lease_id: int
    loan_amount: Decimal
    interest_rate: Decimal
    purpose: Optional[str]
    notes: Optional[str]
    loan_date: date
    start_week: date
    end_week: Optional[date]
    status: LoanStatus
    total_principal_paid: Decimal
    total_interest_paid: Decimal
    outstanding_balance: Decimal
    approved_by: Optional[int]
    approved_on: Optional[datetime]
    closed_on: Optional[date]
    closure_reason: Optional[str]
    created_on: Optional[datetime]
    updated_on: Optional[datetime]
    created_by: Optional[int]
    
    model_config = ConfigDict(from_attributes=True)


class DriverLoanDetailResponse(DriverLoanResponse):
    """Detailed response schema including installments"""
    installments: List[LoanScheduleResponse] = Field(default_factory=list)
    
    # Computed fields
    total_installments: int = Field(default=0, description="Total number of installments")
    paid_installments: int = Field(default=0, description="Number of paid installments")
    pending_installments: int = Field(default=0, description="Number of pending installments")
    
    model_config = ConfigDict(from_attributes=True)


class PaginatedLoansResponse(BaseModel):
    """Paginated list of loans"""
    items: List[DriverLoanResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
    
    model_config = ConfigDict(from_attributes=True)


class PaginatedInstallmentsResponse(BaseModel):
    """Paginated list of installments"""
    items: List[LoanScheduleResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
    
    model_config = ConfigDict(from_attributes=True)


class LoanStatisticsResponse(BaseModel):
    """Loan statistics response"""
    total_loans: int = Field(default=0)
    active_loans: int = Field(default=0)
    closed_loans: int = Field(default=0)
    on_hold_loans: int = Field(default=0)
    total_amount_disbursed: Decimal = Field(default=Decimal('0.00'))
    total_amount_collected: Decimal = Field(default=Decimal('0.00'))
    total_outstanding: Decimal = Field(default=Decimal('0.00'))
    total_interest_collected: Decimal = Field(default=Decimal('0.00'))
    
    model_config = ConfigDict(from_attributes=True)


class PostInstallmentsResponse(BaseModel):
    """Response for posting installments"""
    success: bool
    message: str
    installments_processed: int
    installments_posted: int
    total_amount_posted: Decimal
    errors: Optional[List[str]] = None
    
    model_config = ConfigDict(from_attributes=True)


class UnpostedInstallmentsFilter(BaseModel):
    """Filter schema for unposted installments"""
    loan_id: Optional[str] = Field(None, description="Filter by loan ID")
    driver_id: Optional[int] = Field(None, gt=0, description="Filter by driver ID")
    lease_id: Optional[int] = Field(None, gt=0, description="Filter by lease ID")
    medallion_id: Optional[int] = Field(None, gt=0, description="Filter by medallion ID")
    vehicle_id: Optional[int] = Field(None, gt=0, description="Filter by vehicle ID")
    period_start: Optional[date] = Field(None, description="Filter by period start")
    period_end: Optional[date] = Field(None, description="Filter by period end")
    status: Optional[InstallmentStatus] = Field(None, description="Filter by status")
    
    model_config = ConfigDict(from_attributes=True)