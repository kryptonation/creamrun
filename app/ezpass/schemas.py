### app/ezpass/schemas.py

from datetime import datetime
from decimal import Decimal
from typing import List, Optional

from pydantic import BaseModel, Field

from app.ezpass.models import EZPassTransactionStatus


class EZPassTransactionResponse(BaseModel):
    """
    Response schema for a single EZPass transaction, designed to match the UI grid.
    """
    id: int
    transaction_date: datetime = Field(..., alias="transaction_datetime")
    medallion_no: Optional[str] = None
    driver_id: Optional[str] = None
    plate_number: str = Field(..., alias="tag_or_plate")
    posting_date: Optional[datetime] = None
    status: EZPassTransactionStatus
    total_amount: Decimal = Field(..., alias="amount")
    
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