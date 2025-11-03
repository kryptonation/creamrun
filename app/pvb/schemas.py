### app/pvb/schemas.py

from datetime import date, time, datetime
from decimal import Decimal
from typing import List, Optional

from pydantic import BaseModel, Field, field_validator

from app.pvb.models import PVBViolationStatus


class PVBViolationResponse(BaseModel):
    """
    Response schema for a single PVB violation, designed to match the UI grid.
    """
    id: int
    plate: str
    state: str
    type: str
    summons: str
    issue_date: date
    issue_time: Optional[time] = None
    
    # Fields that get populated after association
    medallion_no: Optional[str] = None
    driver_id: Optional[str] = None
    
    posting_date: Optional[datetime] = None
    status: PVBViolationStatus

    class Config:
        from_attributes = True
        populate_by_name = True


class PaginatedPVBViolationResponse(BaseModel):
    """
    Paginated response schema for a list of PVB violations.
    """
    items: List[PVBViolationResponse]
    total_items: int
    page: int
    per_page: int
    total_pages: int


class PVBManualCreateRequest(BaseModel):
    """
    Schema for the data required to manually create a PVB violation via the BPM flow.
    """
    # From Step 1: Association
    medallion_no: str = Field(..., description="The medallion number to associate the violation with.")
    
    # From Step 2: Violation Details
    plate: str
    state: str
    type: str
    summons: str
    issue_date: date
    issue_time: Optional[str] = Field(None, pattern=r"^\d{4}[AP]$") # e.g., "0550P"
    fine: Decimal = Field(..., gt=0)
    penalty: Optional[Decimal] = Field(0, ge=0)
    interest: Optional[Decimal] = Field(0, ge=0)
    reduction: Optional[Decimal] = Field(0, ge=0)
    
    # From Step 3: Proof
    document_id: int = Field(..., description="The ID of the uploaded proof document.")
    
    @field_validator('issue_time')
    @classmethod
    def parse_issue_time(cls, v):
        if v:
            try:
                meridiem = v[-1].upper()
                time_str = v[:-1]
                if meridiem not in ['A', 'P'] or not time_str.isdigit() or len(time_str) != 4:
                    raise ValueError("Invalid time format. Expected HHMM(A/P), e.g., '0550P'.")
                
                hour = int(time_str[:2])
                minute = int(time_str[2:])

                if not (0 <= hour <= 12 and 0 <= minute <= 59):
                     raise ValueError("Invalid hour or minute.")
                
                if hour == 12 and meridiem == 'A': # Midnight case
                    hour = 0
                elif hour < 12 and meridiem == 'P': # PM case
                    hour += 12

                return time(hour=hour, minute=minute)
            except Exception as e:
                raise ValueError(f"Invalid time format: {e}")
        return None