"""
app/curb/schemas.py

Pydantic schemas for CURB import request/response validation
"""

from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, Field, field_validator

from app.curb.models import (
    PaymentType, MappingMethod, ImportStatus, 
    ReconciliationStatus
)


# === Request Schemas ===

class ImportCurbTripsRequest(BaseModel):
    """Request to import CURB trips"""
    date_from: date = Field(..., description="Start date (YYYY-MM-DD)")
    date_to: date = Field(..., description="End date (YYYY-MM-DD)")
    driver_id: Optional[str] = Field(None, description="Filter by CURB driver ID")
    cab_number: Optional[str] = Field(None, description="Filter by cab number")
    perform_association: bool = Field(True, description="Auto-associate to entities")
    post_to_ledger: bool = Field(True, description="Post to ledger after import")
    reconcile_with_curb: bool = Field(False, description="Mark as reconciled in CURB system")
    
    @field_validator('date_to')
    @classmethod
    def validate_date_range(cls, v, info):
        if 'date_from' in info.data and v < info.data['date_from']:
            raise ValueError("date_to must be >= date_from")
        return v


class RemapTripRequest(BaseModel):
    """Request to manually remap a trip to entities"""
    driver_id: int = Field(..., description="BAT driver ID", gt=0)
    lease_id: int = Field(..., description="BAT lease ID", gt=0)
    reason: str = Field(..., description="Reason for manual mapping", min_length=10)


class GetTripsRequest(BaseModel):
    """Request to retrieve trips with filters"""
    date_from: Optional[date] = Field(None, description="Filter by start date")
    date_to: Optional[date] = Field(None, description="Filter by end date")
    driver_id: Optional[int] = Field(None, description="Filter by BAT driver ID", gt=0)
    medallion_id: Optional[int] = Field(None, description="Filter by medallion ID", gt=0)
    vehicle_id: Optional[int] = Field(None, description="Filter by vehicle ID", gt=0)
    lease_id: Optional[int] = Field(None, description="Filter by lease ID", gt=0)
    payment_type: Optional[PaymentType] = Field(None, description="Filter by payment type")
    posted_to_ledger: Optional[bool] = Field(None, description="Filter by ledger posting status")
    mapping_method: Optional[MappingMethod] = Field(None, description="Filter by mapping method")
    page: int = Field(1, description="Page number", ge=1)
    page_size: int = Field(50, description="Page size", ge=1, le=500)


# === Response Schemas ===

class CurbTripResponse(BaseModel):
    """CURB trip response"""
    id: int
    record_id: str
    period: str
    cab_number: str
    driver_id_curb: str
    start_datetime: datetime
    end_datetime: datetime
    trip_amount: Decimal
    tips: Decimal
    total_amount: Decimal
    payment_type: PaymentType
    
    # Tax breakdown
    ehail_fee: Decimal
    health_fee: Decimal
    congestion_fee: Decimal
    airport_fee: Decimal
    cbdt_fee: Decimal
    
    # Entity mapping
    driver_id: Optional[int]
    medallion_id: Optional[int]
    vehicle_id: Optional[int]
    lease_id: Optional[int]
    mapping_method: MappingMethod
    mapping_confidence: Decimal
    
    # Status
    posted_to_ledger: bool
    reconciliation_status: ReconciliationStatus
    
    # GPS and addresses
    from_address: Optional[str]
    to_address: Optional[str]
    gps_start_lat: Optional[Decimal]
    gps_start_lon: Optional[Decimal]
    gps_end_lat: Optional[Decimal]
    gps_end_lon: Optional[Decimal]
    
    class Config:
        from_attributes = True


class CurbTripDetailResponse(CurbTripResponse):
    """Detailed CURB trip response with all fields"""
    extras: Decimal
    tolls: Decimal
    tax: Decimal
    imp_tax: Decimal
    cc_number: Optional[str]
    auth_code: Optional[str]
    auth_amount: Decimal
    passenger_count: int
    distance_service: Optional[Decimal]
    reservation_number: Optional[str]
    
    mapping_notes: Optional[str]
    manually_assigned: bool
    assigned_by: Optional[int]
    assigned_on: Optional[datetime]
    
    payment_period_start: Optional[date]
    payment_period_end: Optional[date]
    
    import_batch_id: str
    imported_on: datetime
    ledger_posting_ids: Optional[str]
    posted_on: Optional[datetime]
    
    created_at: datetime
    created_by: Optional[int]
    modified_at: Optional[datetime]
    modified_by: Optional[int]


class CurbImportHistoryResponse(BaseModel):
    """Import history response"""
    id: int
    batch_id: str
    import_type: str
    date_from: date
    date_to: date
    status: ImportStatus
    
    started_at: datetime
    completed_at: Optional[datetime]
    duration_seconds: Optional[int]
    
    total_trips_fetched: int
    total_trips_imported: int
    total_trips_mapped: int
    total_trips_posted: int
    total_trips_failed: int
    
    total_transactions_fetched: int
    total_transactions_imported: int
    
    reconciliation_attempted: bool
    reconciliation_successful: bool
    
    error_message: Optional[str]
    triggered_by: str
    triggered_by_user_id: Optional[int]
    
    class Config:
        from_attributes = True


class ImportCurbTripsResponse(BaseModel):
    """Response from import operation"""
    success: bool
    batch_id: str
    message: str
    
    trips_fetched: int
    trips_imported: int
    trips_mapped: int
    trips_posted: int
    trips_failed: int
    
    transactions_fetched: int
    transactions_imported: int
    
    reconciliation_attempted: bool
    reconciliation_successful: bool
    
    duration_seconds: Optional[int]
    errors: Optional[List[str]]


class PaginatedTripsResponse(BaseModel):
    """Paginated trips response"""
    trips: List[CurbTripResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class TripStatisticsResponse(BaseModel):
    """Trip statistics response"""
    total_trips: int
    total_credit_card_trips: int
    total_cash_trips: int
    total_earnings: Decimal
    total_taxes: Decimal
    avg_trip_amount: Decimal
    
    # By status
    trips_posted_to_ledger: int
    trips_not_posted: int
    trips_mapped: int
    trips_unmapped: int
    
    # By date range
    date_from: date
    date_to: date


# === Internal DTO Schemas ===

class CurbTripData(BaseModel):
    """Internal DTO for CURB trip data from API"""
    record_id: str
    period: str
    cab_number: str
    driver_id: str
    num_service: Optional[str]
    start_datetime: datetime
    end_datetime: datetime
    trip_amount: Decimal
    tips: Decimal
    extras: Decimal
    tolls: Decimal
    tax: Decimal
    imp_tax: Decimal
    total_amount: Decimal
    payment_type: str  # Will be converted to enum
    cc_number: Optional[str]
    auth_code: Optional[str]
    auth_amount: Decimal
    ehail_fee: Decimal
    health_fee: Decimal
    congestion_fee: Decimal
    airport_fee: Decimal
    cbdt_fee: Decimal
    passenger_count: int
    distance_service: Optional[Decimal]
    distance_bs: Optional[Decimal]
    reservation_number: Optional[str]
    gps_start_lat: Optional[Decimal]
    gps_start_lon: Optional[Decimal]
    gps_end_lat: Optional[Decimal]
    gps_end_lon: Optional[Decimal]
    from_address: Optional[str]
    to_address: Optional[str]


class CurbTransactionData(BaseModel):
    """Internal DTO for CURB transaction data from API"""
    row_id: str
    transaction_date: datetime
    cab_number: str
    amount: Decimal
    transaction_type: str
    card_number: Optional[str]
    auth_code: Optional[str]