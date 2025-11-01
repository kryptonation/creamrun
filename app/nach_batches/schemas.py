# app/nach_batches/schemas.py
"""
NACH Batch Pydantic Schemas

Request and response models for API validation and serialization.
"""

from datetime import date, datetime
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, Field, field_validator, ConfigDict
from app.nach_batches.models import ACHBatchStatus


class ACHBatchCreate(BaseModel):
    """Schema for creating a new ACH batch"""
    
    dtr_ids: List[int] = Field(
        ...,
        description="List of DTR IDs to include in batch",
        min_length=1
    )
    
    effective_date: Optional[date] = Field(
        None,
        description="ACH effective date (defaults to next business day)"
    )
    
    @field_validator('dtr_ids')
    @classmethod
    def validate_dtr_ids(cls, v):
        if not v or len(v) == 0:
            raise ValueError("At least one DTR ID is required")
        if len(v) != len(set(v)):
            raise ValueError("Duplicate DTR IDs are not allowed")
        return v
    
    model_config = ConfigDict(from_attributes=True)


class ACHBatchResponse(BaseModel):
    """Schema for ACH batch response"""
    
    id: int
    batch_number: str
    batch_date: date
    effective_date: date
    total_payments: int
    total_amount: Decimal
    status: ACHBatchStatus
    nacha_file_generated: bool
    nacha_file_s3_key: Optional[str] = None
    nacha_file_generated_on: Optional[datetime] = None
    submitted_to_bank: bool
    submitted_on: Optional[datetime] = None
    bank_processed_on: Optional[date] = None
    bank_confirmation_number: Optional[str] = None
    reversed_on: Optional[datetime] = None
    reversal_reason: Optional[str] = None
    created_by: int
    created_on: datetime
    updated_on: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)


class ACHBatchListItem(BaseModel):
    """Simplified schema for batch listing"""
    
    id: int
    batch_number: str
    batch_date: date
    effective_date: date
    total_payments: int
    total_amount: Decimal
    status: ACHBatchStatus
    nacha_file_generated: bool
    submitted_to_bank: bool
    created_on: datetime
    
    model_config = ConfigDict(from_attributes=True)


class ACHBatchListResponse(BaseModel):
    """Paginated list of ACH batches"""
    
    items: List[ACHBatchListItem]
    total: int
    page: int
    page_size: int
    total_pages: int
    
    model_config = ConfigDict(from_attributes=True)


class NACHAFileGenerateRequest(BaseModel):
    """Request to generate NACHA file for a batch"""
    
    batch_id: int = Field(..., description="ACH Batch ID")
    
    model_config = ConfigDict(from_attributes=True)


class NACHAFileGenerateResponse(BaseModel):
    """Response after NACHA file generation"""
    
    batch_number: str
    file_name: str
    file_size_bytes: int
    total_payments: int
    total_amount: Decimal
    generated_on: datetime
    s3_key: Optional[str] = None
    download_url: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)


class BatchReversalRequest(BaseModel):
    """Request to reverse an ACH batch"""
    
    batch_id: int = Field(..., description="Batch ID to reverse")
    reversal_reason: str = Field(
        ...,
        description="Reason for reversal",
        min_length=10,
        max_length=500
    )
    
    model_config = ConfigDict(from_attributes=True)


class BatchReversalResponse(BaseModel):
    """Response after batch reversal"""
    
    batch_number: str
    reversed_on: datetime
    reversed_by: int
    reversal_reason: str
    payments_unmarked: int
    
    model_config = ConfigDict(from_attributes=True)


class ACHBatchStatistics(BaseModel):
    """Batch statistics"""
    
    total_batches: int
    batches_by_status: dict
    total_payments_processed: int
    total_amount_processed: Decimal
    batches_pending_file_generation: int
    batches_pending_submission: int
    
    model_config = ConfigDict(from_attributes=True)


class BatchDetailPayment(BaseModel):
    """Payment detail within a batch"""
    
    dtr_id: int
    receipt_number: str
    driver_name: str
    tlc_license: str
    medallion_number: str
    week_ending: date
    amount: Decimal
    
    model_config = ConfigDict(from_attributes=True)


class ACHBatchDetailResponse(BaseModel):
    """Detailed batch information including all payments"""
    
    batch_info: ACHBatchResponse
    payments: List[BatchDetailPayment]
    
    model_config = ConfigDict(from_attributes=True)


class StubACHBatchResponse(BaseModel):
    """Stub response for testing"""
    
    message: str = "Using stub data"
    batches: List[ACHBatchListItem]
    
    model_config = ConfigDict(from_attributes=True)