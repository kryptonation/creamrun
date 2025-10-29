"""
app/interim_payments/schemas.py

Pydantic schemas for request/response validation
"""

from datetime import datetime
from decimal import Decimal
from typing import List, Optional

from pydantic import BaseModel, Field, field_validator

from app.interim_payments.models import PaymentMethod, PaymentStatus, AllocationCategory


# === Base Schemas ===


class AllocationItemCreate(BaseModel):
    """Schema for creating a payment allocation item"""
    category: AllocationCategory = Field(..., description="Category of obligation")
    ledger_balance_id: str = Field(..., description="Ledger balance ID being paid")
    reference_type: str = Field(..., description="Type of reference (e.g., REPAIR_INSTALLMENT)")
    reference_id: str = Field(..., description="ID of the specific obligation")
    allocated_amount: Decimal = Field(..., gt=0, description="Amount to allocate")
    description: Optional[str] = Field(None, description="Description of obligation")
    notes: Optional[str] = Field(None, description="Internal notes")
    
    class Config:
        json_schema_extra = {
            "example": {
                "category": "REPAIRS",
                "ledger_balance_id": "LB-2025-000123",
                "reference_type": "REPAIR_INSTALLMENT",
                "reference_id": "RI-2025-000456",
                "allocated_amount": 150.00,
                "description": "Engine repair invoice #2457",
                "notes": "Partial payment"
            }
        }


class AllocationItemResponse(BaseModel):
    """Schema for allocation item response"""
    id: int
    allocation_id: str
    payment_id: int
    category: AllocationCategory
    ledger_balance_id: Optional[str]
    reference_type: str
    reference_id: str
    obligation_amount: Decimal
    allocated_amount: Decimal
    remaining_balance: Decimal
    posted_to_ledger: int
    ledger_posting_id: Optional[str]
    posted_at: Optional[datetime]
    description: Optional[str]
    notes: Optional[str]
    error_message: Optional[str]
    allocation_sequence: int
    created_on: Optional[datetime]
    
    class Config:
        from_attributes = True


# === Payment Creation ===


class CreateInterimPaymentRequest(BaseModel):
    """Request schema for creating interim payment"""
    driver_id: int = Field(..., description="Driver making the payment")
    lease_id: int = Field(..., description="Active lease reference")
    vehicle_id: Optional[int] = Field(None, description="Vehicle reference")
    medallion_id: Optional[int] = Field(None, description="Medallion reference")
    payment_date: datetime = Field(..., description="Date payment received")
    payment_method: PaymentMethod = Field(..., description="Payment method")
    total_amount: Decimal = Field(..., gt=0, description="Total payment amount")
    check_number: Optional[str] = Field(None, description="Check number if applicable")
    reference_number: Optional[str] = Field(None, description="Transaction reference")
    description: Optional[str] = Field(None, description="Payment description")
    notes: Optional[str] = Field(None, description="Internal notes")
    allocations: List[AllocationItemCreate] = Field(..., min_length=1, description="Payment allocations")
    
    @field_validator('allocations')
    @classmethod
    def validate_allocations(cls, v, values):
        """Validate that sum of allocations does not exceed total amount"""
        if 'total_amount' in values:
            total_allocated = sum(item.allocated_amount for item in v)
            if total_allocated > values['total_amount']:
                raise ValueError(
                    f"Total allocated amount ({total_allocated}) exceeds payment amount ({values['total_amount']})"
                )
        return v
    
    class Config:
        json_schema_extra = {
            "example": {
                "driver_id": 123,
                "lease_id": 456,
                "vehicle_id": 789,
                "medallion_id": 101,
                "payment_date": "2025-10-29T10:30:00Z",
                "payment_method": "CASH",
                "total_amount": 500.00,
                "description": "Partial payment for repairs and lease",
                "notes": "Driver paid in cash at front desk",
                "allocations": [
                    {
                        "category": "REPAIRS",
                        "ledger_balance_id": "LB-2025-000123",
                        "reference_type": "REPAIR_INSTALLMENT",
                        "reference_id": "RI-2025-000456",
                        "allocated_amount": 275.00,
                        "description": "Engine repair"
                    },
                    {
                        "category": "LEASE",
                        "ledger_balance_id": "LB-2025-000124",
                        "reference_type": "LEASE_FEE",
                        "reference_id": "L-2025-000789",
                        "allocated_amount": 225.00,
                        "description": "Weekly lease payment"
                    }
                ]
            }
        }


class UpdateInterimPaymentRequest(BaseModel):
    """Request schema for updating interim payment (before posting)"""
    payment_method: Optional[PaymentMethod] = None
    check_number: Optional[str] = None
    reference_number: Optional[str] = None
    description: Optional[str] = None
    notes: Optional[str] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "payment_method": "CHECK",
                "check_number": "12345",
                "notes": "Updated with check information"
            }
        }


# === Payment Response ===


class InterimPaymentResponse(BaseModel):
    """Response schema for interim payment"""
    id: int
    payment_id: str
    driver_id: int
    lease_id: int
    vehicle_id: Optional[int]
    medallion_id: Optional[int]
    payment_date: datetime
    payment_method: PaymentMethod
    total_amount: Decimal
    allocated_amount: Decimal
    unallocated_amount: Decimal
    check_number: Optional[str]
    reference_number: Optional[str]
    status: PaymentStatus
    posted_to_ledger: int
    posted_at: Optional[datetime]
    posted_by: Optional[int]
    receipt_number: Optional[str]
    receipt_generated_at: Optional[datetime]
    description: Optional[str]
    notes: Optional[str]
    received_by: Optional[int]
    error_message: Optional[str]
    voided_at: Optional[datetime]
    voided_by: Optional[int]
    voided_reason: Optional[str]
    created_on: Optional[datetime]
    created_by: Optional[int]
    modified_on: Optional[datetime]
    modified_by: Optional[int]
    allocations: List[AllocationItemResponse] = []
    
    class Config:
        from_attributes = True


class InterimPaymentDetailResponse(InterimPaymentResponse):
    """Detailed response with related entity information"""
    driver_name: Optional[str] = None
    lease_number: Optional[str] = None
    vehicle_plate: Optional[str] = None
    medallion_number: Optional[str] = None
    received_by_name: Optional[str] = None
    posted_by_name: Optional[str] = None
    
    class Config:
        from_attributes = True


# === List and Filter ===


class InterimPaymentListResponse(BaseModel):
    """Response schema for paginated payment list"""
    total: int
    page: int
    page_size: int
    total_pages: int
    payments: List[InterimPaymentResponse]


# === Posting Operations ===


class PostPaymentRequest(BaseModel):
    """Request to post payment to ledger"""
    payment_ids: List[int] = Field(..., min_length=1, description="List of payment IDs to post")
    force_post: bool = Field(False, description="Force posting even if warnings exist")
    
    class Config:
        json_schema_extra = {
            "example": {
                "payment_ids": [1, 2, 3],
                "force_post": False
            }
        }


class PostPaymentResponse(BaseModel):
    """Response from posting operation"""
    success_count: int
    failed_count: int
    success_payment_ids: List[int]
    failed_payments: List[dict]
    
    class Config:
        json_schema_extra = {
            "example": {
                "success_count": 2,
                "failed_count": 1,
                "success_payment_ids": [1, 2],
                "failed_payments": [
                    {
                        "payment_id": 3,
                        "error": "Ledger balance not found"
                    }
                ]
            }
        }


# === Voiding Operations ===


class VoidPaymentRequest(BaseModel):
    """Request to void a payment"""
    reason: str = Field(..., min_length=10, description="Reason for voiding (minimum 10 characters)")
    
    class Config:
        json_schema_extra = {
            "example": {
                "reason": "Payment entered incorrectly - wrong driver"
            }
        }


# === Unposted Payments Query ===


class UnpostedPaymentsResponse(BaseModel):
    """Response for unposted payments query"""
    total: int
    unposted_payments: List[InterimPaymentResponse]


# === Statistics ===


class PaymentStatistics(BaseModel):
    """Statistics for interim payments"""
    total_payments: int
    total_amount: Decimal
    pending_count: int
    posted_count: int
    voided_count: int
    failed_count: int
    average_payment: Decimal
    
    class Config:
        json_schema_extra = {
            "example": {
                "total_payments": 150,
                "total_amount": 75000.00,
                "pending_count": 5,
                "posted_count": 140,
                "voided_count": 3,
                "failed_count": 2,
                "average_payment": 500.00
            }
        }


# === Receipt Data ===


class ReceiptData(BaseModel):
    """Data for generating payment receipt"""
    payment: InterimPaymentDetailResponse
    company_info: dict = Field(default_factory=dict)
    
    class Config:
        json_schema_extra = {
            "example": {
                "payment": {
                    "payment_id": "IP-2025-ABC123",
                    "driver_name": "John Doe",
                    "total_amount": 500.00,
                },
                "company_info": {
                    "name": "Big Apple Taxi",
                    "address": "123 Main St, New York, NY",
                    "phone": "(212) 555-1234"
                }
            }
        }