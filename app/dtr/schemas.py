"""
DTR Pydantic Schemas

This module contains Pydantic schemas for API request/response validation.
"""

from datetime import date, datetime
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, Field, field_validator

from app.dtr.models import DTRStatus, PaymentType, PaymentStatus


# =================================================================
# BASE SCHEMAS
# =================================================================

class DTRBase(BaseModel):
    """Base schema with common DTR fields"""
    receipt_number: str
    driver_id: int
    lease_id: int
    week_start_date: date
    week_end_date: date
    receipt_date: date


class DTRAdditionalDriverBase(BaseModel):
    """Base schema for additional driver section"""
    driver_id: int
    driver_name: str
    tlc_license: Optional[str]
    sequence: int


# =================================================================
# DETAILED BREAKDOWN SCHEMAS (for PDF generation)
# =================================================================

class TaxBreakdownSchema(BaseModel):
    """Tax breakdown by type"""
    mta: Decimal = Field(default=Decimal("0.00"), ge=0)
    tif: Decimal = Field(default=Decimal("0.00"), ge=0)
    congestion: Decimal = Field(default=Decimal("0.00"), ge=0)
    cbdt: Decimal = Field(default=Decimal("0.00"), ge=0)
    airport: Decimal = Field(default=Decimal("0.00"), ge=0)
    total: Decimal = Field(default=Decimal("0.00"), ge=0)
    
    # Trip counts
    total_trips: int = 0
    cash_trips: int = 0
    cc_trips: int = 0


class EZPassItemSchema(BaseModel):
    """Individual EZPass transaction for DTR detail"""
    transaction_date: datetime
    tlc_license: Optional[str]
    plate_number: str
    agency: Optional[str]
    entry: Optional[str]
    exit_lane: Optional[str]
    toll: Decimal
    prior_balance: Decimal = Decimal("0.00")
    payment: Decimal = Decimal("0.00")
    balance: Decimal


class PVBItemSchema(BaseModel):
    """Individual PVB violation for DTR detail"""
    date_time: datetime
    ticket_number: str
    tlc_license: Optional[str]
    note: Optional[str]
    fine: Decimal
    charge: Decimal
    total: Decimal
    prior_balance: Decimal = Decimal("0.00")
    payment: Decimal = Decimal("0.00")
    balance: Decimal


class TLCItemSchema(BaseModel):
    """Individual TLC ticket for DTR detail"""
    date_time: datetime
    ticket_number: str
    tlc_license: Optional[str]
    medallion: Optional[str]
    note: Optional[str]
    fine: Decimal
    payment: Decimal = Decimal("0.00")
    prior_balance: Decimal = Decimal("0.00")
    payment_amount: Decimal = Decimal("0.00")
    balance: Decimal


class TripLogItemSchema(BaseModel):
    """Individual trip for Trip Log section"""
    trip_date: datetime
    tlc_license: Optional[str]
    trip_number: str
    amount: Decimal


class RepairItemSchema(BaseModel):
    """Individual repair for DTR detail"""
    repair_id: str
    invoice_number: str
    invoice_date: date
    workshop: str
    invoice_amount: Decimal
    amount_paid: Decimal
    balance: Decimal


class RepairInstallmentSchema(BaseModel):
    """Repair installment schedule item"""
    installment_id: str
    due_date: date
    amount_due: Decimal
    amount_payable: Decimal
    payment: Decimal
    balance: Decimal


class LoanItemSchema(BaseModel):
    """Individual loan for DTR detail"""
    loan_id: str
    loan_date: date
    loan_amount: Decimal
    interest_rate: Decimal
    total_due: Decimal
    amount_paid: Decimal
    balance: Decimal


class LoanInstallmentSchema(BaseModel):
    """Loan installment schedule item"""
    installment_id: str
    due_date: date
    principal: Decimal
    interest: Decimal
    total_due: Decimal
    total_payable: Decimal
    payment: Decimal
    balance: Decimal


class MiscChargeItemSchema(BaseModel):
    """Individual miscellaneous charge"""
    charge_type: str
    invoice_number: Optional[str]
    amount: Decimal
    prior_balance: Decimal = Decimal("0.00")
    payment: Decimal = Decimal("0.00")
    balance: Decimal


class LeaseChargeSchema(BaseModel):
    """Lease charge detail"""
    lease_id: str
    lease_amount: Decimal
    prior_balance: Decimal = Decimal("0.00")
    amount_paid: Decimal
    balance: Decimal


# =================================================================
# ALERT SCHEMAS
# =================================================================

class VehicleAlertSchema(BaseModel):
    """Vehicle-related alerts"""
    tlc_inspection: Optional[date]
    mile_run: Optional[date]
    dmv_registration: Optional[date]


class DriverAlertSchema(BaseModel):
    """Driver-related alerts"""
    driver_name: str
    tlc_license_number: Optional[str]
    tlc_license_expiry: Optional[date]
    dmv_license_expiry: Optional[date]


# =================================================================
# COMPREHENSIVE DTR DATA SCHEMA (for PDF generation)
# =================================================================

class DTRDetailDataSchema(BaseModel):
    """
    Complete DTR data structure for PDF generation.
    This schema contains all sections needed to render the DTR PDF.
    """
    
    # Header Information
    medallion: str
    driver_leaseholder: str
    tlc_license: Optional[str]
    receipt_number: str
    receipt_date: date
    receipt_period: str  # e.g., "August-03-2025 to August-09-2025"
    
    # Gross Earnings Snapshot
    curb_cc_transactions: Decimal
    total_gross_earnings: Decimal
    
    # Account Balance for Receipt Period
    cc_earnings: Decimal
    
    # Charges breakdown
    lease_amount: Decimal
    taxes_total: Decimal
    ezpass_total: Decimal
    pvb_total: Decimal
    tlc_total: Decimal
    repairs_total: Decimal
    loans_total: Decimal
    misc_total: Decimal
    
    subtotal: Decimal
    prior_balance: Decimal
    net_earnings: Decimal
    total_due_to_driver: Decimal
    
    # Payment Summary
    payment_type: str  # "Direct Deposit" or "Check"
    batch_number: Optional[str]
    account_number: Optional[str]  # Last 4 digits only
    amount: Decimal
    
    # Detailed breakdowns for DTR Details pages
    lease_charge: Optional[LeaseChargeSchema]
    taxes_and_charges: TaxBreakdownSchema
    ezpass_items: List[EZPassItemSchema] = []
    pvb_items: List[PVBItemSchema] = []
    tlc_items: List[TLCItemSchema] = []
    trip_log_items: List[TripLogItemSchema] = []
    repair_items: List[RepairItemSchema] = []
    repair_installments: List[RepairInstallmentSchema] = []
    loan_items: List[LoanItemSchema] = []
    loan_installments: List[LoanInstallmentSchema] = []
    misc_items: List[MiscChargeItemSchema] = []
    
    # Alerts
    vehicle_alerts: Optional[VehicleAlertSchema]
    driver_alerts: List[DriverAlertSchema] = []
    
    # Additional Drivers (for co-lease)
    has_additional_drivers: bool = False
    additional_drivers: List['DTRAdditionalDriverDetailSchema'] = []


class DTRAdditionalDriverDetailSchema(BaseModel):
    """Additional driver DTR section data"""
    driver_name: str
    tlc_license: Optional[str]
    
    # Account Balance
    cc_earnings: Decimal
    taxes_total: Decimal
    ezpass_total: Decimal
    pvb_total: Decimal
    subtotal: Decimal
    prior_balance: Decimal
    net_earnings: Decimal
    total_due: Decimal
    
    # Detailed breakdowns
    taxes_and_charges: TaxBreakdownSchema
    ezpass_items: List[EZPassItemSchema] = []
    pvb_items: List[PVBItemSchema] = []
    trip_log_items: List[TripLogItemSchema] = []
    
    # Driver alerts
    driver_alerts: DriverAlertSchema


# =================================================================
# REQUEST SCHEMAS
# =================================================================

class GenerateDTRRequest(BaseModel):
    """Request to generate DTR for specific lease and week"""
    lease_id: int = Field(..., gt=0)
    week_start_date: date
    week_end_date: date
    force_regenerate: bool = Field(
        default=False,
        description="Force regeneration even if DTR already exists"
    )
    
    @field_validator('week_end_date')
    @classmethod
    def validate_week_range(cls, v, values):
        """Ensure week_end_date is after week_start_date"""
        if 'week_start_date' in values and v <= values['week_start_date']:
            raise ValueError('week_end_date must be after week_start_date')
        return v
    
    @field_validator('week_start_date')
    @classmethod
    def validate_sunday(cls, v):
        """Ensure week_start_date is Sunday (weekday 6)"""
        if v.weekday() != 6:
            raise ValueError('week_start_date must be a Sunday')
        return v
    
    @field_validator('week_end_date')
    @classmethod
    def validate_saturday(cls, v):
        """Ensure week_end_date is Saturday (weekday 5)"""
        if v.weekday() != 5:
            raise ValueError('week_end_date must be a Saturday')
        return v


class GenerateWeeklyDTRsRequest(BaseModel):
    """Request to generate DTRs for all active leases for a week"""
    week_start_date: date
    week_end_date: date
    lease_ids: Optional[List[int]] = Field(
        default=None,
        description="Optional list of specific lease IDs (if None, generates for all active leases)"
    )
    
    @field_validator('week_end_date')
    @classmethod
    def validate_week_range(cls, v, values):
        if 'week_start_date' in values and v <= values['week_start_date']:
            raise ValueError('week_end_date must be after week_start_date')
        return v


class UpdateDTRStatusRequest(BaseModel):
    """Request to update DTR status"""
    dtr_status: DTRStatus
    notes: Optional[str] = None


class UpdatePaymentRequest(BaseModel):
    """Request to update payment information"""
    payment_type: PaymentType
    payment_status: PaymentStatus
    ach_batch_number: Optional[str] = None
    check_number: Optional[str] = None
    paid_date: Optional[date] = None
    notes: Optional[str] = None


class VoidDTRRequest(BaseModel):
    """Request to void a DTR"""
    reason: str = Field(..., min_length=10)


class ResendEmailRequest(BaseModel):
    """Request to resend DTR email"""
    email_override: Optional[str] = Field(
        default=None,
        description="Override driver's email address"
    )


# =================================================================
# RESPONSE SCHEMAS
# =================================================================

class DTRSummaryResponse(BaseModel):
    """Summary response for DTR list"""
    id: int
    receipt_number: str
    driver_id: int
    driver_name: str
    lease_id: str
    medallion: Optional[str]
    week_start_date: date
    week_end_date: date
    receipt_date: date
    
    # Financial summary
    cc_earnings: Decimal
    total_deductions: Decimal
    net_earnings: Decimal
    total_due_to_driver: Decimal
    
    # Status
    dtr_status: DTRStatus
    payment_type: PaymentType
    payment_status: PaymentStatus
    
    # Payment tracking
    ach_batch_number: Optional[str]
    check_number: Optional[str]
    paid_date: Optional[date]
    
    # Flags
    has_additional_drivers: bool
    pdf_generated: bool
    email_sent: bool
    
    created_at: datetime
    updated_at: Optional[datetime]
    
    class Config:
        from_attributes = True


class DTRDetailResponse(DTRSummaryResponse):
    """Detailed DTR response with all fields"""
    vehicle_id: Optional[int]
    medallion_id: Optional[int]
    
    # Full earnings breakdown
    cash_earnings: Optional[Decimal]
    total_trips: int
    cc_trips: int
    cash_trips: int
    
    # Full deductions breakdown
    taxes_total: Decimal
    tax_mta: Decimal
    tax_tif: Decimal
    tax_congestion: Decimal
    tax_cbdt: Decimal
    tax_airport: Decimal
    
    ezpass_total: Decimal
    ezpass_count: int
    
    lease_total: Decimal
    
    pvb_total: Decimal
    pvb_count: int
    
    tlc_total: Decimal
    tlc_count: int
    
    repairs_total: Decimal
    repairs_count: int
    
    loans_total: Decimal
    loans_count: int
    
    misc_total: Decimal
    misc_count: int
    
    # Calculations
    total_deductions: Decimal
    prior_balance: Decimal
    interim_payments: Decimal
    carry_forward_balance: Decimal
    
    # Additional info
    pdf_s3_key: Optional[str]
    pdf_generated_at: Optional[datetime]
    email_sent_at: Optional[datetime]
    
    generation_notes: Optional[str]
    adjustment_notes: Optional[str]
    voided_reason: Optional[str]
    
    generated_by: Optional[int]
    approved_by: Optional[int]
    approved_at: Optional[datetime]
    
    # Additional driver sections
    additional_drivers_count: int
    additional_driver_sections: List['DTRAdditionalDriverResponse'] = []


class DTRAdditionalDriverResponse(BaseModel):
    """Response for additional driver section"""
    id: int
    dtr_id: int
    driver_id: int
    driver_name: str
    tlc_license: Optional[str]
    sequence: int
    
    cc_earnings: Decimal
    total_trips: int
    cc_trips: int
    cash_trips: int
    
    taxes_total: Decimal
    tax_mta: Decimal
    tax_tif: Decimal
    tax_congestion: Decimal
    tax_cbdt: Decimal
    tax_airport: Decimal
    
    ezpass_total: Decimal
    ezpass_count: int
    
    pvb_total: Decimal
    pvb_count: int
    
    total_deductions: Decimal
    prior_balance: Decimal
    net_earnings: Decimal
    total_due: Decimal
    
    notes: Optional[str]
    
    created_at: datetime
    updated_at: Optional[datetime]
    
    class Config:
        from_attributes = True


class DTRGenerationResponse(BaseModel):
    """Response after DTR generation"""
    success: bool
    dtr_id: int
    receipt_number: str
    message: str
    pdf_generated: bool
    email_sent: bool
    warnings: List[str] = []


class WeeklyDTRGenerationResponse(BaseModel):
    """Response after weekly DTR batch generation"""
    success: bool
    total_leases: int
    generated_count: int
    skipped_count: int
    failed_count: int
    dtrs: List[DTRGenerationResponse] = []
    errors: List[str] = []


# =================================================================
# FILTER SCHEMAS
# =================================================================

class DTRFilterSchema(BaseModel):
    """Filters for DTR list queries"""
    driver_id: Optional[int] = None
    lease_id: Optional[int] = None
    medallion_id: Optional[int] = None
    
    week_start_date: Optional[date] = None
    week_end_date: Optional[date] = None
    receipt_date_from: Optional[date] = None
    receipt_date_to: Optional[date] = None
    
    dtr_status: Optional[DTRStatus] = None
    payment_type: Optional[PaymentType] = None
    payment_status: Optional[PaymentStatus] = None
    
    ach_batch_number: Optional[str] = None
    check_number: Optional[str] = None
    
    has_additional_drivers: Optional[bool] = None
    pdf_generated: Optional[bool] = None
    email_sent: Optional[bool] = None
    
    min_total_due: Optional[Decimal] = None
    max_total_due: Optional[Decimal] = None
    
    search: Optional[str] = Field(
        default=None,
        description="Search receipt_number, driver name, medallion"
    )
    
    # Pagination
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=50, ge=1, le=500)
    
    # Sorting
    sort_by: str = Field(default="receipt_date")
    sort_order: str = Field(default="desc", regex="^(asc|desc)$")


# Forward references
DTRDetailResponse.model_rebuild()
DTRDetailDataSchema.model_rebuild()