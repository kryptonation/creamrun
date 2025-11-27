### app/ezpass/schemas.py

from datetime import datetime , time
from decimal import Decimal
from typing import List, Optional

from pydantic import BaseModel, Field

from app.ezpass.models import EZPassTransactionStatus


class EZPassTransactionResponse(BaseModel):
    """
    Response schema for a single EZPass transaction, designed to match the UI grid.
    """
    id: Optional[int] = None
    transaction_id: Optional[str] = None
    entry_plaza: Optional[str] = None
    exit_plaza: Optional[str] = None
    transaction_date: datetime = Field(..., alias="transaction_datetime")
    transaction_time: time = None
    medallion_no: Optional[str] = None
    driver_id: Optional[str] = None
    plate_number: str = Field(..., alias="tag_or_plate")
    posting_date: Optional[datetime] = None
    status: str = None
    total_amount: Decimal = Field(..., alias="amount")
    vin: Optional[str] = None
    ezpass_class: Optional[str] = None
    
    # Extra fields for detailed view or potential future columns
    failure_reason: Optional[str] = None
    agency: Optional[str] = None
    
    class Config:
        from_attributes = True
        populate_by_name = True


class PaginatedEZPassTransactionResponse(BaseModel):
    """
    Paginated response schema for a list of EZPass transactions.
    """
    items: List[EZPassTransactionResponse]
    total_items: int
    page: int
    per_page: int
    total_pages: int
    status_list: List[EZPassTransactionStatus] = Field(
        default_factory=lambda: list(EZPassTransactionStatus)
    )
