### app/tlc/schemas.py

from datetime import date, time
from decimal import Decimal
from typing import List, Optional

from pydantic import BaseModel, Field

from app.tlc.models import TLCDisposition, TLCViolationType


class TLCViolationListResponse(BaseModel):
    """
    Response schema for a single TLC violation in a list, matching the UI grid.
    """
    plate: str
    state: str
    type: TLCViolationType
    summons: str = Field(..., alias="summons_no")
    issue_date: date
    issue_time: Optional[time] = None
    
    # Fields populated after association
    driver_id: Optional[str] = None
    medallion_no: Optional[str] = None

    class Config:
        from_attributes = True
        populate_by_name = True


class PaginatedTLCViolationResponse(BaseModel):
    """
    Paginated response schema for a list of TLC Violations.
    """
    items: List[TLCViolationListResponse]
    total_items: int
    page: int
    per_page: int
    total_pages: int


class TLCViolationCreateRequest(BaseModel):
    """
    Schema for the data submitted during the single-step BPM flow for creating
    a manual TLC violation.
    """
    # From Driver/Lease Selection
    driver_id: int
    lease_id: int
    medallion_id: int
    vehicle_id: int

    # From Violation Details Form
    plate: str
    state: str
    type: TLCViolationType
    summons: str
    issue_date: date
    issue_time: Optional[str] = Field(None, pattern=r"^\d{4}[AP]$") # e.g., "0550P"
    description: Optional[str] = None
    amount: Decimal = Field(..., gt=0)
    service_fee: Optional[Decimal] = Field(0, ge=0)
    disposition: TLCDisposition = TLCDisposition.PAID

    # From Attachment Step
    attachment_document_id: int