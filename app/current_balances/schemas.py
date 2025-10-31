"""
app/current_balances/schemas.py

Pydantic schemas for Current Balances module
Request/Response DTOs for API endpoints
"""

from datetime import date, datetime
from decimal import Decimal
from typing import Optional, List
from enum import Enum

from pydantic import BaseModel, Field, field_validator


class DTRStatus(str, Enum):
    """DTR generation status"""
    NOT_GENERATED = "NOT_GENERATED"
    GENERATED = "GENERATED"
    PROCESSING = "PROCESSING"
    FAILED = "FAILED"


class LeaseStatus(str, Enum):
    """Lease status"""
    ACTIVE = "ACTIVE"
    TERMINATION_REQUESTED = "TERMINATION_REQUESTED"
    TERMINATED = "TERMINATED"
    SUSPENDED = "SUSPENDED"


class DriverStatus(str, Enum):
    """Driver status"""
    ACTIVE = "ACTIVE"
    SUSPENDED = "SUSPENDED"
    BLACKLISTED = "BLACKLISTED"
    TERMINATED = "TERMINATED"


class PaymentType(str, Enum):
    """Payment type"""
    CASH = "CASH"
    ACH = "ACH"


class DailyBreakdownItem(BaseModel):
    """Daily breakdown for expandable view"""
    day_of_week: str = Field(..., description="Day name (Sun, Mon, Tue, etc)")
    breakdown_date: date = Field(..., description="Specific date")
    cc_earnings: Decimal = Field(Decimal("0.00"), description="CC earnings for the day")
    ezpass: Decimal = Field(Decimal("0.00"), description="EZ-Pass charges")
    mta_tif: Decimal = Field(Decimal("0.00"), description="MTA/TIF charges")
    violations: Decimal = Field(Decimal("0.00"), description="PVB violations")
    tlc_tickets: Decimal = Field(Decimal("0.00"), description="TLC tickets")
    net_daily: Decimal = Field(Decimal("0.00"), description="Net earnings for the day")
    
    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "day_of_week": "Mon",
                "breakdown_date": "2025-10-27",
                "cc_earnings": "160.00",
                "ezpass": "7.00",
                "mta_tif": "4.50",
                "violations": "0.00",
                "tlc_tickets": "0.00",
                "net_daily": "148.50"
            }
        }


class DelayedChargesBreakdown(BaseModel):
    """Delayed charges from previous weeks"""
    ezpass: Decimal = Field(Decimal("0.00"), description="Delayed EZ-Pass charges")
    violations: Decimal = Field(Decimal("0.00"), description="Delayed PVB violations")
    tlc_tickets: Decimal = Field(Decimal("0.00"), description="Delayed TLC tickets")
    
    class Config:
        from_attributes = True


class CurrentBalanceWeeklyRow(BaseModel):
    """Weekly summary row for each lease"""
    lease_id: int = Field(..., description="Lease ID")
    driver_name: str = Field(..., description="Driver name")
    hack_license: Optional[str] = Field(None, description="TLC hack license")
    vehicle_plate: Optional[str] = Field(None, description="Vehicle plate number")
    medallion_number: Optional[str] = Field(None, description="Medallion number")
    
    # Financial summary (Week-To-Date)
    net_earnings: Decimal = Field(Decimal("0.00"), description="Net earnings WTD")
    cc_earnings_wtd: Decimal = Field(Decimal("0.00"), description="CC earnings WTD")
    lease_fee: Decimal = Field(Decimal("0.00"), description="Weekly lease fee")
    ezpass_wtd: Decimal = Field(Decimal("0.00"), description="EZ-Pass charges WTD")
    mta_tif_wtd: Decimal = Field(Decimal("0.00"), description="MTA/TIF charges WTD")
    violations_wtd: Decimal = Field(Decimal("0.00"), description="Violations WTD")
    tlc_tickets_wtd: Decimal = Field(Decimal("0.00"), description="TLC tickets WTD")
    repairs_wtd_due: Decimal = Field(Decimal("0.00"), description="Repairs due WTD")
    loans_wtd_due: Decimal = Field(Decimal("0.00"), description="Loans due WTD")
    misc_charges_wtd: Decimal = Field(Decimal("0.00"), description="Misc charges WTD")
    
    # Additional fields
    deposit_amount: Decimal = Field(Decimal("0.00"), description="Security deposit")
    prior_balance: Decimal = Field(Decimal("0.00"), description="Prior balance carried forward")
    payment_type: PaymentType = Field(..., description="Cash or ACH")
    
    # Status fields
    lease_status: LeaseStatus = Field(..., description="Lease status")
    driver_status: DriverStatus = Field(..., description="Driver status")
    dtr_status: DTRStatus = Field(..., description="DTR generation status")
    
    # Daily breakdown (optional, populated when expanded)
    daily_breakdown: Optional[List[DailyBreakdownItem]] = Field(None, description="Daily breakdown")
    delayed_charges: Optional[DelayedChargesBreakdown] = Field(None, description="Delayed charges")
    
    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "lease_id": 1045,
                "driver_name": "John Doe",
                "hack_license": "5087912",
                "vehicle_plate": "T123456",
                "medallion_number": "1W47",
                "net_earnings": "320.00",
                "cc_earnings_wtd": "780.00",
                "lease_fee": "400.00",
                "ezpass_wtd": "25.00",
                "mta_tif_wtd": "13.50",
                "violations_wtd": "0.00",
                "tlc_tickets_wtd": "0.00",
                "repairs_wtd_due": "0.00",
                "loans_wtd_due": "0.00",
                "misc_charges_wtd": "21.50",
                "deposit_amount": "500.00",
                "prior_balance": "0.00",
                "payment_type": "CASH",
                "lease_status": "ACTIVE",
                "driver_status": "ACTIVE",
                "dtr_status": "NOT_GENERATED"
            }
        }


class PaginatedCurrentBalancesResponse(BaseModel):
    """Paginated response for current balances listing"""
    items: List[CurrentBalanceWeeklyRow] = Field(..., description="List of balance rows")
    total: int = Field(..., description="Total number of records")
    page: int = Field(..., description="Current page number")
    page_size: int = Field(..., description="Number of items per page")
    total_pages: int = Field(..., description="Total number of pages")
    week_start: date = Field(..., description="Week start date (Sunday)")
    week_end: date = Field(..., description="Week end date (Saturday)")
    last_updated: datetime = Field(..., description="Last data refresh timestamp")
    
    class Config:
        from_attributes = True


class CurrentBalanceDetailResponse(BaseModel):
    """Detailed response with daily breakdown"""
    lease_summary: CurrentBalanceWeeklyRow = Field(..., description="Weekly summary")
    daily_breakdown: List[DailyBreakdownItem] = Field(..., description="Daily breakdown")
    delayed_charges: DelayedChargesBreakdown = Field(..., description="Delayed charges")
    
    class Config:
        from_attributes = True


class CurrentBalancesStatisticsResponse(BaseModel):
    """Statistics for current week"""
    total_leases: int = Field(..., description="Total number of leases")
    active_leases: int = Field(..., description="Active leases")
    total_cc_earnings: Decimal = Field(..., description="Total CC earnings for week")
    total_deductions: Decimal = Field(..., description="Total deductions")
    total_net_earnings: Decimal = Field(..., description="Total net earnings")
    average_net_per_lease: Decimal = Field(..., description="Average net per lease")
    week_start: date = Field(..., description="Week start")
    week_end: date = Field(..., description="Week end")
    dtr_status: DTRStatus = Field(..., description="Overall DTR status")
    
    class Config:
        from_attributes = True


class WeekPeriod(BaseModel):
    """Week period selection"""
    week_start: date = Field(..., description="Sunday date")
    week_end: date = Field(..., description="Saturday date")
    
    @field_validator('week_start')
    @classmethod
    def validate_sunday(cls, v):
        """Validate week_start is Sunday"""
        if v.weekday() != 6:  # Sunday = 6
            raise ValueError("Week start must be a Sunday")
        return v
    
    @field_validator('week_end')
    @classmethod
    def validate_saturday(cls, v):
        """Validate week_end is Saturday"""
        if v.weekday() != 5:  # Saturday = 5
            raise ValueError("Week end must be a Saturday")
        return v
    
    class Config:
        json_schema_extra = {
            "example": {
                "week_start": "2025-10-26",
                "week_end": "2025-11-01"
            }
        }


class DailyChargeDetail(BaseModel):
    """Detailed charge information for a specific day/category"""
    charge_date: date = Field(..., description="Date of charge")
    charge_time: Optional[datetime] = Field(None, description="Time of charge")
    charge_type: str = Field(..., description="Type of charge")
    amount: Decimal = Field(..., description="Charge amount")
    description: Optional[str] = Field(None, description="Charge description")
    reference_number: Optional[str] = Field(None, description="Reference/transaction number")
    source: str = Field(..., description="Source (API/manual)")
    original_charge_date: Optional[date] = Field(None, description="Original date if delayed")
    system_entry_date: Optional[date] = Field(None, description="System entry date")
    
    class Config:
        from_attributes = True


class DailyChargeBreakdownResponse(BaseModel):
    """Response for daily charge detail popup/panel"""
    lease_id: int = Field(..., description="Lease ID")
    breakdown_date: date = Field(..., description="Date")
    category: str = Field(..., description="Category (EZPASS, VIOLATIONS, etc)")
    total_amount: Decimal = Field(..., description="Total for category on this day")
    charges: List[DailyChargeDetail] = Field(..., description="Individual charge details")
    
    class Config:
        from_attributes = True


# Stub response for testing
class CurrentBalancesStubResponse(BaseModel):
    """Stub response with minimal data for testing"""
    items: List[CurrentBalanceWeeklyRow]
    total: int = 3
    page: int = 1
    page_size: int = 20
    total_pages: int = 1
    week_start: date
    week_end: date
    last_updated: datetime
    is_stub: bool = True
    
    class Config:
        json_schema_extra = {
            "example": {
                "items": [
                    {
                        "lease_id": 1045,
                        "driver_name": "John Doe",
                        "hack_license": "5087912",
                        "vehicle_plate": "T123456",
                        "medallion_number": "1W47",
                        "net_earnings": "320.00",
                        "cc_earnings_wtd": "780.00",
                        "lease_fee": "400.00",
                        "ezpass_wtd": "25.00",
                        "mta_tif_wtd": "13.50",
                        "violations_wtd": "0.00",
                        "tlc_tickets_wtd": "0.00",
                        "repairs_wtd_due": "0.00",
                        "loans_wtd_due": "0.00",
                        "misc_charges_wtd": "21.50",
                        "deposit_amount": "500.00",
                        "prior_balance": "0.00",
                        "payment_type": "CASH",
                        "lease_status": "ACTIVE",
                        "driver_status": "ACTIVE",
                        "dtr_status": "NOT_GENERATED"
                    }
                ],
                "total": 3,
                "is_stub": True
            }
        }