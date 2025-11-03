### app/curb/schemas.py

from datetime import datetime
from decimal import Decimal
from typing import List, Optional

from pydantic import BaseModel, Field

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
    payment_mode: PaymentType

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