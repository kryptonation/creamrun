### app/curb/schemas.py

from datetime import datetime, date
from decimal import Decimal
from typing import List, Optional

from pydantic import BaseModel, Field, field_validator, ValidationInfo

from app.curb.models import PaymentType


class CurbTripResponse(BaseModel):
    """
    Detailed response schema for a single CURB trip, matching the main table view.
    """

    trip_id: str = Field(..., alias="curb_trip_id")
    driver_id: Optional[str] = Field(None, alias="curb_driver_id")
    tlc_license_no: Optional[str] = None
    vehicle_plate: Optional[str] = Field(None, alias="plate")
    medallion_no: Optional[str] = Field(None, alias="curb_cab_number")
    total_amount: Decimal
    payment_mode: PaymentType = Field(..., alias="payment_type")

    # Optional fields for column selection
    trip_start_date: Optional[datetime] = Field(None, alias="start_time")
    trip_end_date: Optional[datetime] = Field(None, alias="end_time")
    status: Optional[str] = None
    
    # GPS fields
    start_location_gps: Optional[str] = None # Will be constructed in the router
    end_location_gps: Optional[str] = None # Will be constructed in the router


    class Config:
        from_attributes = True
        populate_by_name = True


class PaginatedCurbTripResponse(BaseModel):
    """
    Paginated response schema for a list of CURB trips.
    """

    items: List[CurbTripResponse]
    total_items: int
    page: int
    per_page: int
    total_pages: int


# --- Granular Import Request Schemas ---

class CurbDriverImportRequest(BaseModel):
    """
    Request schema for importing CURB data for a specific driver.
    """
    
    driver_id: Optional[str] = Field(None, description="Driver ID (internal system ID)")
    tlc_license_no: Optional[str] = Field(None, description="TLC License Number")
    start_date: date = Field(description="Start date for import (YYYY-MM-DD)")
    end_date: date = Field(description="End date for import (YYYY-MM-DD)")
    
    @field_validator('end_date')
    @classmethod
    def validate_date_range(cls, v, info: ValidationInfo):
        data = info.data if hasattr(info, 'data') else {}
        if 'start_date' in data and v < data['start_date']:
            raise ValueError('end_date must be greater than or equal to start_date')
        return v
    
    @field_validator('tlc_license_no')
    @classmethod
    def validate_driver_identifier(cls, v, info: ValidationInfo):
        # At least one driver identifier must be provided
        data = info.data if hasattr(info, 'data') else {}
        driver_id = data.get('driver_id')
        if not v and not driver_id:
            raise ValueError('Either driver_id or tlc_license_no must be provided')
        return v


class CurbMedallionImportRequest(BaseModel):
    """
    Request schema for importing CURB data for a specific medallion.
    """
    
    medallion_number: str = Field(description="Medallion number to import data for")
    start_date: date = Field(description="Start date for import (YYYY-MM-DD)")
    end_date: date = Field(description="End date for import (YYYY-MM-DD)")
    
    @field_validator('end_date')
    @classmethod
    def validate_date_range(cls, v, info: ValidationInfo):
        data = info.data if hasattr(info, 'data') else {}
        if 'start_date' in data and v < data['start_date']:
            raise ValueError('end_date must be greater than or equal to start_date')
        return v


class CurbDateRangeImportRequest(BaseModel):
    """
    Request schema for importing CURB data for a specific date range.
    """
    
    start_date: date = Field(description="Start date for import (YYYY-MM-DD)")
    end_date: date = Field(description="End date for import (YYYY-MM-DD)")
    driver_ids: Optional[List[str]] = Field(None, description="Optional list of specific driver IDs to filter")
    medallion_numbers: Optional[List[str]] = Field(None, description="Optional list of specific medallion numbers to filter")
    
    @field_validator('end_date')
    @classmethod
    def validate_date_range(cls, v, info: ValidationInfo):
        data = info.data if hasattr(info, 'data') else {}
        if 'start_date' in data and v < data['start_date']:
            raise ValueError('end_date must be greater than or equal to start_date')
        return v


class CurbImportResponse(BaseModel):
    """
    Response schema for CURB import operations.
    """
    
    task_id: str = Field(description="Celery task ID for tracking")
    message: str = Field(description="Import initiation message")
    import_type: str = Field(description="Type of import (driver, medallion, date_range)")
    parameters: dict = Field(description="Parameters used for the import")


class CurbImportStatusResponse(BaseModel):
    """
    Response schema for CURB import status and results.
    """
    
    task_id: str
    status: str  # PENDING, SUCCESS, FAILURE, etc.
    result: Optional[dict] = None
    error: Optional[str] = None