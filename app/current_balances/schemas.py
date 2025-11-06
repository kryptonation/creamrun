"""
app/current_balances/schemas.py

Pydantic schemas for Current Balances feature
"""

from enum import Enum
from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional

from pydantic import BaseModel, Field, field_validator


class DTRStatusEnum(str, Enum):
    """DTR Status"""
    GENERATED = "GENERATED"
    NOT_GENERATED = "NOT_GENERATED"


class PaymentTypeEnum(str, Enum):
    """Payment Type"""
    CASH = "CASH"
    ACH = "ACH"


class LeaseStatusEnum(str, Enum):
    """Lease Status"""
    ACTIVE = "ACTIVE"
    TERMINATED = "TERMINATED"
    TERMINATION_REQUESTED = "TERMINATION_REQUESTED"


class DriverStatusEnum(str, Enum):
    """Driver Status"""
    ACTIVE = "ACTIVE"
    SUSPENDED = "SUSPENDED"
    BLACKLISTED = "BLACKLISTED"


class DailyBreakdown(BaseModel):
    """Daily breakdown of earnings and charges"""
    day_of_week: str = Field(..., description="Day name (Sunday, Monday, etc.)")
    breakdown_date: date = Field(..., description="Specific date")
    cc_earnings: Decimal = Field(default=Decimal("0"), description="Credit card earnings for the day")
    mta_tif: Decimal = Field(default=Decimal("0"), description="MTA/TIF charges for the day")
    ezpass: Decimal = Field(default=Decimal("0"), description="EZPass tolls for the day")
    pvb_violations: Decimal = Field(default=Decimal("0"), description="PVB violations for the day")
    tlc_tickets: Decimal = Field(default=Decimal("0"), description="TLC tickets for the day")
    net_daily_earnings: Decimal = Field(default=Decimal("0"), description="Net earnings for the day")


class DelayedCharge(BaseModel):
    """Delayed charges from previous weeks"""
    category: str = Field(..., description="Charge category (EZPass, PVB, TLC)")
    amount: Decimal = Field(..., description="Amount of delayed charge")
    original_date: date = Field(..., description="Original occurrence date")
    system_entry_date: date = Field(..., description="Date charge was entered into system")
    description: Optional[str] = Field(None, description="Description of the charge")


class WeeklyBalanceRow(BaseModel):
    """Single row in the current balances table representing a lease"""
    
    # Identification
    lease_id: str = Field(..., description="Lease ID")
    driver_name: str = Field(..., description="Primary driver name")
    tlc_license: Optional[str] = Field(None, description="Driver TLC license")
    medallion_number: str = Field(..., description="Medallion number")
    plate_number: str = Field(..., description="Vehicle plate number")
    
    # Status fields
    lease_status: LeaseStatusEnum = Field(..., description="Lease status")
    driver_status: DriverStatusEnum = Field(..., description="Driver status")
    dtr_status: DTRStatusEnum = Field(..., description="DTR generation status")
    payment_type: PaymentTypeEnum = Field(..., description="Payment method")
    
    # Financial data (Week-to-Date)
    cc_earnings: Decimal = Field(default=Decimal("0"), description="Credit card earnings WTD")
    weekly_lease_fee: Decimal = Field(default=Decimal("0"), description="Weekly lease charge")
    mta_tif: Decimal = Field(default=Decimal("0"), description="MTA/TIF charges WTD")
    ezpass_tolls: Decimal = Field(default=Decimal("0"), description="EZPass tolls WTD")
    pvb_violations: Decimal = Field(default=Decimal("0"), description="PVB violations WTD")
    tlc_tickets: Decimal = Field(default=Decimal("0"), description="TLC tickets WTD")
    repairs_wtd: Decimal = Field(default=Decimal("0"), description="Repairs due this week")
    loans_wtd: Decimal = Field(default=Decimal("0"), description="Loan installments due this week")
    misc_charges: Decimal = Field(default=Decimal("0"), description="Miscellaneous charges")
    
    # Calculated fields
    subtotal_deductions: Decimal = Field(default=Decimal("0"), description="Total deductions")
    prior_balance: Decimal = Field(default=Decimal("0"), description="Prior balance carried forward")
    deposit_amount: Decimal = Field(default=Decimal("0"), description="Deposit amount")
    net_earnings: Decimal = Field(default=Decimal("0"), description="Net earnings after all deductions")
    
    # Expandable details (populated on demand)
    daily_breakdown: Optional[List[DailyBreakdown]] = Field(None, description="Daily breakdown of earnings/charges")
    delayed_charges: Optional[List[DelayedCharge]] = Field(None, description="Delayed charges from previous weeks")
    
    # Metadata
    last_updated: datetime = Field(..., description="Last update timestamp")


class WeekPeriod(BaseModel):
    """Week period information"""
    week_start: date = Field(..., description="Sunday start date")
    week_end: date = Field(..., description="Saturday end date")
    week_label: str = Field(..., description="Human-readable week label")
    is_current_week: bool = Field(..., description="Whether this is the current active week")
    
    @field_validator('week_start')
    @classmethod
    def validate_week_start(cls, v):
        """Ensure week starts on Sunday"""
        if v.weekday() != 6:  # Sunday is 6 in Python
            raise ValueError('Week must start on Sunday')
        return v
    
    @field_validator('week_end')
    @classmethod
    def validate_week_end(cls, v):
        """Ensure week ends on Saturday"""
        if v.weekday() != 5:  # Saturday is 5 in Python
            raise ValueError('Week must end on Saturday')
        return v


class CurrentBalancesFilter(BaseModel):
    """Filters for current balances query"""
    search: Optional[str] = Field(None, description="Search by lease ID, driver name, TLC license, medallion, or plate")
    lease_status: Optional[LeaseStatusEnum] = Field(None, description="Filter by lease status")
    driver_status: Optional[DriverStatusEnum] = Field(None, description="Filter by driver status")
    payment_type: Optional[PaymentTypeEnum] = Field(None, description="Filter by payment type")
    dtr_status: Optional[DTRStatusEnum] = Field(None, description="Filter by DTR status")


class CurrentBalancesResponse(BaseModel):
    """Response for current balances list"""
    week_period: WeekPeriod = Field(..., description="Current week period info")
    items: List[WeeklyBalanceRow] = Field(..., description="List of lease balances")
    total_items: int = Field(..., description="Total number of items")
    page: int = Field(..., description="Current page")
    per_page: int = Field(..., description="Items per page")
    total_pages: int = Field(..., description="Total pages")
    last_refresh: datetime = Field(..., description="Last data refresh timestamp")


class WeeklyBalanceDetail(BaseModel):
    """Detailed view of a single lease balance with daily breakdown"""
    
    # All fields from WeeklyBalanceRow
    lease_id: str
    driver_name: str
    tlc_license: Optional[str]
    medallion_number: str
    plate_number: str
    lease_status: LeaseStatusEnum
    driver_status: DriverStatusEnum
    dtr_status: DTRStatusEnum
    payment_type: PaymentTypeEnum
    
    cc_earnings: Decimal
    weekly_lease_fee: Decimal
    mta_tif: Decimal
    ezpass_tolls: Decimal
    pvb_violations: Decimal
    tlc_tickets: Decimal
    repairs_wtd: Decimal
    loans_wtd: Decimal
    misc_charges: Decimal
    subtotal_deductions: Decimal
    prior_balance: Decimal
    deposit_amount: Decimal
    net_earnings: Decimal
    
    # Required detailed breakdowns
    daily_breakdown: List[DailyBreakdown]
    delayed_charges: List[DelayedCharge]
    
    # Week context
    week_period: WeekPeriod
    last_updated: datetime


class DailyChargeDetail(BaseModel):
    """Detailed breakdown of a specific day's charges"""
    date: date
    charge_category: str
    items: List[dict]  # List of individual charge items with details
    total_amount: Decimal