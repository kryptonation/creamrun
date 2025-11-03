### app/loans/schemas.py

from datetime import date
from decimal import Decimal
from typing import List, Optional

from pydantic import BaseModel, Field

from app.loans.models import LoanInstallmentStatus, LoanStatus


class DriverLoanListResponse(BaseModel):
    """
    Response schema for a single driver loan in a list, matching the UI grid.
    """
    loan_id: str
    status: LoanStatus
    driver_name: Optional[str] = None
    medallion_no: Optional[str] = None
    lease_type: Optional[str] = None
    amount: Decimal = Field(..., alias="principal_amount")
    rate: Decimal = Field(..., alias="interest_rate")
    start_week: date

    class Config:
        from_attributes = True
        populate_by_name = True


class PaginatedDriverLoanResponse(BaseModel):
    """
    Paginated response schema for a list of Driver Loans.
    """
    items: List[DriverLoanListResponse]
    total_items: int
    page: int
    per_page: int
    total_pages: int


class LoanInstallmentResponse(BaseModel):
    """
    Response schema for a single installment in the detailed view.
    """
    installment_id: str
    week_period: str
    principal: Decimal = Field(..., alias="principal_amount")
    interest: Decimal = Field(..., alias="interest_amount")
    total_due: Decimal
    balance: Decimal
    status: LoanInstallmentStatus
    posted_date: Optional[date] = Field(None, alias="posted_on")

    class Config:
        from_attributes = True
        populate_by_name = True


class DriverLoanDetailResponse(BaseModel):
    """
    Comprehensive response schema for the detailed view of a single Driver Loan.
    """
    # Header Info
    loan_id: str
    principal: Decimal = Field(..., alias="principal_amount")
    status: LoanStatus
    
    # Detail Cards
    loan_details: dict
    driver_details: dict
    lease_details: dict

    # Payment Schedule
    payment_schedule: List[LoanInstallmentResponse]

    class Config:
        from_attributes = True
        populate_by_name = True


class LoanInstallmentListResponse(BaseModel):
    """
    Response schema for a single loan installment in a list view.
    """
    installment_id: str
    loan_id: str
    driver_name: Optional[str] = None
    medallion_no: Optional[str] = None
    lease_id: Optional[str] = None
    vehicle_id: Optional[int] = None
    week_start_date: date
    week_end_date: date
    principal: Decimal = Field(..., alias="principal_amount")
    interest: Decimal = Field(..., alias="interest_amount")
    total_due: Decimal
    status: LoanInstallmentStatus
    posted_date: Optional[date] = Field(None, alias="posted_on")
    ledger_posting_ref: Optional[str] = None

    class Config:
        from_attributes = True
        populate_by_name = True


class PaginatedLoanInstallmentResponse(BaseModel):
    """
    Paginated response schema for a list of Loan Installments.
    """
    items: List[LoanInstallmentListResponse]
    total_items: int
    page: int
    per_page: int
    total_pages: int