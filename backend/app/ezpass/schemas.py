"""
app/ezpass/schemas.py

Pydantic schemas for API requests and responses
"""

from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, Field

from app.ezpass.models import MappingMethod, ImportStatus, PostingStatus, ResolutionStatus


# === Request Schemas ===

class UploadEZPassCSVRequest(BaseModel):
    """Request to upload EZPass CSV file"""
    perform_matching: bool = Field(True, description="Whether to perform auto-matching with CURB trips")
    post_to_ledger: bool = Field(True, description="Whether to post matched transactions to ledger")
    auto_match_threshold: Optional[Decimal] = Field(0.90, ge=0, le=1, 
                                                     description="Minimum confidence for auto-matching")


class RemapEZPassRequest(BaseModel):
    """Request to manually remap EZPass transaction"""
    driver_id: Optional[int] = Field(None, description="New driver ID")
    lease_id: Optional[int] = Field(None, description="New lease ID")
    medallion_id: Optional[int] = Field(None, description="New medallion ID")
    vehicle_id: Optional[int] = Field(None, description="New vehicle ID")
    reason: str = Field(..., min_length=1, max_length=500, description="Reason for remapping")
    post_to_ledger: bool = Field(True, description="Whether to post to ledger after remapping")


class BulkPostToLedgerRequest(BaseModel):
    """Request to post multiple transactions to ledger"""
    transaction_ids: List[int] = Field(..., description="List of EZPass transaction IDs")


# === Response Schemas ===

class EZPassTransactionResponse(BaseModel):
    """EZPass transaction response"""
    id: int
    ticket_number: str
    posting_date: date
    transaction_date: date
    transaction_time: Optional[str]
    transaction_datetime: Optional[datetime]
    
    plate_number: str
    toll_amount: Decimal
    
    agency: Optional[str]
    entry_plaza: Optional[str]
    exit_plaza: Optional[str]
    
    driver_id: Optional[int]
    lease_id: Optional[int]
    medallion_id: Optional[int]
    vehicle_id: Optional[int]
    hack_license_number: Optional[str]
    
    matched_trip_id: Optional[str]
    mapping_method: MappingMethod
    mapping_confidence: Optional[Decimal]
    
    payment_period_start: date
    payment_period_end: date
    
    posting_status: PostingStatus
    ledger_balance_id: Optional[str]
    
    resolution_status: ResolutionStatus
    
    import_batch_id: str
    imported_on: datetime
    
    class Config:
        from_attributes = True


class EZPassTransactionDetailResponse(EZPassTransactionResponse):
    """Detailed EZPass transaction with related entities"""
    driver_name: Optional[str] = None
    vehicle_vin: Optional[str] = None
    medallion_number: Optional[str] = None
    lease_number: Optional[str] = None
    mapping_notes: Optional[str] = None
    posting_error: Optional[str] = None
    
    # Remapping history
    remapped_from_driver_id: Optional[int] = None
    remapped_on: Optional[datetime] = None
    remap_reason: Optional[str] = None
    
    created_by: Optional[int] = None
    created_at: Optional[datetime] = None
    modified_by: Optional[int] = None
    modified_at: Optional[datetime] = None


class EZPassImportHistoryResponse(BaseModel):
    """Import history response"""
    id: int
    batch_id: str
    import_type: str
    file_name: Optional[str]
    
    date_from: Optional[date]
    date_to: Optional[date]
    
    status: ImportStatus
    
    total_rows_in_file: int
    total_transactions_imported: int
    total_duplicates_skipped: int
    total_auto_matched: int
    total_manual_review: int
    total_unmapped: int
    total_posted_to_ledger: int
    total_posting_failures: int
    total_errors: int
    
    started_at: datetime
    completed_at: Optional[datetime]
    duration_seconds: Optional[int]
    
    summary: Optional[str]
    triggered_by: str
    
    class Config:
        from_attributes = True


class UploadEZPassCSVResponse(BaseModel):
    """Response after CSV upload"""
    batch_id: str
    status: ImportStatus
    message: str
    total_rows_in_file: int
    total_transactions_imported: int
    total_duplicates_skipped: int
    total_auto_matched: int
    total_unmapped: int
    total_posted_to_ledger: int
    total_errors: int
    errors: List[str] = []


class PaginatedEZPassResponse(BaseModel):
    """Paginated list of EZPass transactions"""
    items: List[EZPassTransactionResponse]
    total_count: int
    page: int
    page_size: int
    total_pages: int


class EZPassStatisticsResponse(BaseModel):
    """Statistics for EZPass transactions"""
    total_transactions: int
    total_toll_amount: Decimal
    mapped_transactions: int
    unmapped_transactions: int
    posted_transactions: int
    unposted_transactions: int
    by_mapping_method: dict
    by_posting_status: dict
    by_agency: dict


class RemapEZPassResponse(BaseModel):
    """Response after remapping"""
    transaction_id: int
    ticket_number: str
    old_driver_id: Optional[int]
    new_driver_id: Optional[int]
    old_lease_id: Optional[int]
    new_lease_id: Optional[int]
    mapping_method: MappingMethod
    posted_to_ledger: bool
    ledger_balance_id: Optional[str]
    message: str