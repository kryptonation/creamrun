"""
app/ledger/router.py

FastAPI router for ledger endpoints
Provides RESTful API for ledger operations
"""

from typing import List

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_db_with_current_user
from app.users.models import User
from app.users.utils import get_current_user
from app.ledger.service import LedgerService
from app.ledger.schemas import (
    CreatePostingRequest, PostingResponse, VoidPostingRequest,
    CreateObligationRequest, BalanceResponse, ApplyPaymentRequest,
    ApplyPaymentHierarchyRequest, PaymentApplicationResult,
    PostingFilters, BalanceFilters, SuccessResponse,
)

# === Router Setup ===
router = APIRouter(
    prefix="/ledger", tags=["Ledger"],
    responses={
        404: {"description": "Not found"},
        400: {"description": "Bad request"},
        500: {"description": "Internal server error"}
    }
)

# === Posting endpoints ===
@router.post(
    "/postings", response_model=PostingResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a ledger posting",
    description="""
    Create a new ledger posting (DEBIT or CREDIT).
    
    **Important**: Postings are immutable once created. Use void endpoint to reverse.
    
    **Business Rules**:
    - Amount must be positive
    - Payment period must be Sunday to Saturday
    - No duplicates (same source_type + source_id)
    """
)
async def create_posting(
    request: CreatePostingRequest,
    db: Session = Depends(get_db_with_current_user),
):
    """Create a new ledger posting"""
    service = LedgerService(db)

    posting = service.create_posting(
        driver_id=request.driver_id,
        lease_id=request.lease_id,
        posting_type=request.posting_type,
        category=request.category,
        amount=request.amount,
        source_type=request.source_type,
        source_id=request.source_id,
        payment_period_start=request.payment_period_start,
        payment_period_end=request.payment_period_end,
        vehicle_id=request.vehicle_id,
        medallion_id=request.medallion_id,
        description=request.description,
        notes=request.notes
    )

    return PostingResponse.model_validate(posting)


@router.post(
    "/postings/void", response_model=SuccessResponse,
    summary="Void a posting",
    description="""
    Void a posting by creating a reversal entry.
    
    **Important**: This doesn't delete the posting, it creates a reversal.
    Both the original and reversal remain in the ledger for audit trail.
    """
)
async def void_posting(
    request: VoidPostingRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db_with_current_user),
):
    """Void a posting by creating reversal"""
    service = LedgerService(db)

    original, reversal = service.void_posting(
        posting_id=request.posting_id,
        reason=request.reason,
        user_id=current_user.id
    )

    return SuccessResponse(
        message=f"Posting {request.posting_id} voided successfully.",
        data={
            "original_posting_id": original.posting_id,
            "reversal_posting_id": reversal.posting_id
        }
    )


@router.get(
    "/postings", response_model=List[PostingResponse],
    summary="Query ledger postings",
    description="Query postings with filters. Supports pagination."
)
def get_postings(
    driver_id: int = None,
    lease_id: int = None,
    category: str = None,
    status: str = None,
    posting_type: str = None,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db_with_current_user)
):
    """Query postings with filters"""
    service = LedgerService(db)

    filters = PostingFilters(
        driver_id=driver_id,
        lease_id=lease_id,
        category=category,
        status=status,
        posting_type=posting_type,
        limit=limit,
        offset=offset
    )

    postings = service.get_postings(filters)
    return [PostingResponse.model_validate(p) for p in postings]


@router.get(
    "/postings/{posting_id}", response_model=PostingResponse,
    summary="Get Posting by ID",
    description="Retrieve a specific posting by its posting_id"
)
async def get_posting_by_id(
    posting_id: str,
    db: Session = Depends(get_db_with_current_user),
):
    """Get specific posting"""
    service = LedgerService(db)
    posting = service.posting_repo.get_by_id_or_raise(posting_id)
    return PostingResponse.model_validate(posting)


# === Obligation endpoints ===
@router.post(
    "/obligations", response_model=BalanceResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create an obligation",
    description="""
    Create a new obligation (DEBIT + Balance).
    
    This is the primary way to record driver obligations like:
    - EZPass tolls
    - Lease payments
    - Violations
    - Repairs
    - Loans
    
    **Creates**:
    - DEBIT posting in ledger
    - Balance record for payment tracking
    """
)
def create_obligation(
    request: CreateObligationRequest,
    db: Session = Depends(get_db_with_current_user)
):
    """Create a new obligation"""
    service = LedgerService(db)

    posting, balance = service.create_obligation(
        driver_id=request.driver_id,
        lease_id=request.lease_id,
        category=request.category,
        amount=request.original_amount,
        reference_type=request.reference_type,
        reference_id=request.reference_id,
        payment_period_start=request.payment_period_start,
        payment_period_end=request.payment_period_end,
        due_date=request.due_date,
        description=request.description
    )

    return BalanceResponse.model_validate(balance)


# === Balance endpoints ===
@router.get(
    "/balances", response_model=List[BalanceResponse],
    summary="Query balances",
    description="Query balances with filters, supports pagination."
)
def get_balances(
    driver_id: int = None,
    lease_id: int = None,
    category: str = None,
    status: str = None,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db_with_current_user)
):
    """Query balances with filters"""
    service = LedgerService(db)

    filters = BalanceFilters(
        driver_id=driver_id,
        lease_id=lease_id,
        category=category,
        status=status,
        limit=limit,
        offset=offset
    )

    balances = service.get_balances(filters)
    return [BalanceResponse.model_validate(b) for b in balances]


@router.get(
    "/balances/{balance_id}",
    response_model=BalanceResponse,
    summary="Get balance by ID",
    description="Retrieve a specific balance by its balance_id"
)
def get_balance_by_id(
    balance_id: str,
    db: Session = Depends(get_db_with_current_user)
):
    """Get specific balance"""
    service = LedgerService(db)
    balance = service.balance_repo.get_by_id_or_raise(balance_id)
    return BalanceResponse.from_orm(balance)


@router.get(
    "/balances/driver/{driver_id}/lease/{lease_id}",
    response_model=dict,
    summary="Get driver balance summary",
    description="""
    Get real-time balance summary for a driver/lease.
    
    **Returns**:
    - Total outstanding balance
    - Breakdown by category
    - Count of open balances
    
    This is the primary endpoint for checking what a driver owes.
    """
)
def get_driver_balance(
    driver_id: int,
    lease_id: int,
    db: Session = Depends(get_db_with_current_user)
):
    """Get driver balance summary"""
    service = LedgerService(db)
    return service.get_driver_balance(driver_id, lease_id)

# === Payment Application endpoints ===
@router.post(
    "/payments/apply",
    response_model=BalanceResponse,
    summary="Apply payment to specific balance",
    description="""
    Apply payment directly to a specific balance.
    
    **Use cases**:
    - Interim payments (driver pays specific obligation)
    - Manual adjustments
    - Targeted payment allocation
    
    **Note**: This bypasses payment hierarchy. For automatic hierarchy-based
    allocation, use /payments/apply-hierarchy endpoint.
    """
)
def apply_payment_to_balance(
    request: ApplyPaymentRequest,
    db: Session = Depends(get_db_with_current_user)
):
    """Apply payment to specific balance"""
    service = LedgerService(db)
    
    # First create a payment posting (this would typically come from external source)
    # For simplicity, we assume the payment posting already exists
    # In production, you'd pass payment_posting_id in the request
    
    allocation, balance = service.apply_payment_to_balance(
        balance_id=request.balance_id,
        payment_amount=request.payment_amount,
        payment_posting_id="",  # Should be provided in request
        allocation_type=request.allocation_type,
        notes=request.notes
    )
    
    return BalanceResponse.from_orm(balance)


@router.post(
    "/payments/apply-hierarchy",
    response_model=PaymentApplicationResult,
    summary="Apply payment following hierarchy",
    description="""
    Apply payment following strict payment hierarchy.
    
    **Payment Hierarchy** (non-negotiable):
    1. TAXES (highest priority)
    2. EZPASS
    3. LEASE
    4. PVB
    5. TLC
    6. REPAIRS
    7. LOANS
    8. MISC (lowest priority)
    
    Within each category: FIFO (oldest due date first)
    
    **Use cases**:
    - Weekly DTR generation
    - CURB earnings allocation
    - Scheduled payment processing
    
    **Returns**:
    - Total payment amount
    - Amount allocated
    - Remaining unallocated
    - List of all allocations made
    - Updated balances
    """
)
def apply_payment_with_hierarchy(
    request: ApplyPaymentHierarchyRequest,
    db: Session = Depends(get_db_with_current_user)
):
    """Apply payment following hierarchy"""
    service = LedgerService(db)
    
    result = service.apply_payment_with_hierarchy(
        driver_id=request.driver_id,
        lease_id=request.lease_id,
        payment_amount=request.payment_amount,
        payment_period_start=request.payment_period_start,
        payment_period_end=request.payment_period_end,
        source_type=request.source_type,
        source_id=request.source_id,
        allocation_type=request.allocation_type,
        notes=request.notes
    )
    
    return result

# === Utility endpoints ===
@router.get(
    "/health",
    summary="Health check",
    description="Check if ledger service is operational"
)
def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "ledger"}