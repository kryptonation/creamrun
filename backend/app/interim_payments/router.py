"""
app/interim_payments/router.py

FastAPI router for Interim Payments module
Provides REST API endpoints for all payment operations
"""

from datetime import date
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.dependencies import get_db_with_current_user
from app.users.models import User
from app.users.utils import get_current_user
from app.interim_payments.service import InterimPaymentService
from app.interim_payments.schemas import *
from app.interim_payments.models import PaymentMethod, PaymentStatus, AllocationCategory
from app.interim_payments.exceptions import *
from app.utils.exporter_utils import ExporterFactory
from app.utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter(tags=["Interim Payments"], prefix="/interim-payments")


# ===== Payment Creation & Management =====


@router.post(
    "",
    response_model=InterimPaymentDetailResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Interim Payment",
    description="""
    Create a new interim payment with manual allocations.
    
    Interim payments bypass the normal payment hierarchy and allow cashiers to allocate
    payment amounts directly to specific obligations (Repairs, Loans, EZPass, PVB, Lease, Misc).
    
    Business Rules:
    - Payment must be allocated to at least one obligation
    - Total allocations cannot exceed payment amount
    - Cannot allocate to statutory Taxes
    - Each ledger balance can only be allocated once per payment
    - Unallocated funds are automatically applied to Lease
    - All referenced ledger balances must be OPEN
    
    Workflow:
    1. Cashier identifies driver and selects lease/medallion
    2. Enters total payment amount and method
    3. Allocates funds across open obligations
    4. System validates all allocations
    5. Creates payment record with PENDING status
    6. Payment can then be posted to ledger
    """,
    response_description="Created payment with all allocation details"
)
def create_interim_payment(
    request: CreateInterimPaymentRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db_with_current_user)
):
    """Create a new interim payment"""
    try:
        service = InterimPaymentService(db)
        payment = service.create_payment(request, received_by=current_user.id)
        
        logger.info(
            f"Created interim payment {payment.payment_id} by user {current_user.id} "
            f"for driver {payment.driver_id} - Amount: ${payment.total_amount}"
        )
        
        return payment
        
    except (
        DriverNotFoundException,
        LeaseNotFoundException,
        LeaseNotActiveException,
        PaymentValidationException,
        InvalidPaymentAmountException,
        AllocationExceedsPaymentException,
        InvalidAllocationCategoryException,
        LedgerBalanceNotFoundException,
        LedgerBalanceClosedException,
        InsufficientBalanceException,
        DuplicateAllocationException
    ) as e:
        logger.error(f"Validation error creating payment: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error creating interim payment: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create interim payment: {str(e)}"
        )


@router.get(
    "/{payment_id}",
    response_model=InterimPaymentDetailResponse,
    summary="Get Interim Payment Details",
    description="""
    Retrieve complete details of a specific interim payment including all allocations.
    
    Returns:
    - Payment information (ID, amount, method, status)
    - All allocation details showing how payment was split
    - Driver, lease, vehicle, medallion information
    - Posting status and ledger references
    - Audit trail (who created, posted, voided)
    """
)
def get_interim_payment(
    payment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db_with_current_user)
):
    """Get payment details by ID"""
    try:
        service = InterimPaymentService(db)
        payment = service.get_payment_by_id(payment_id)
        
        if not payment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Payment not found: {payment_id}"
            )
        
        return payment
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving payment {payment_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve payment: {str(e)}"
        )


@router.patch(
    "/{payment_id}",
    response_model=InterimPaymentResponse,
    summary="Update Interim Payment",
    description="""
    Update payment details before it has been posted to ledger.
    
    Only the following fields can be updated:
    - payment_method
    - check_number
    - reference_number
    - description
    - notes
    
    Restrictions:
    - Cannot update posted payments (posted_to_ledger = 1)
    - Cannot update voided payments
    - Cannot change amount or allocations (must void and recreate)
    """
)
def update_interim_payment(
    payment_id: int,
    request: UpdateInterimPaymentRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db_with_current_user)
):
    """Update payment details"""
    try:
        service = InterimPaymentService(db)
        payment = service.update_payment(payment_id, request)
        
        logger.info(f"Updated payment {payment.payment_id} by user {current_user.id}")
        return payment
        
    except PaymentNotFoundException as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except (PaymentAlreadyPostedException, PaymentAlreadyVoidedException) as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error updating payment {payment_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update payment: {str(e)}"
        )

# ===== Payment Posting & Voiding =====


@router.post(
    "/{payment_id}/post",
    response_model=InterimPaymentDetailResponse,
    summary="Post Payment to Ledger",
    description="""
    Post an interim payment to the centralized ledger.
    
    This operation:
    1. Creates CREDIT postings for each allocation
    2. Updates corresponding ledger balances
    3. Marks payment as POSTED
    4. Records timestamp and user who posted
    
    For each allocation:
    - Creates ledger posting with category matching allocation
    - Applies payment to reduce balance outstanding
    - Updates balance status (OPEN or CLOSED)
    - Links posting to interim payment for audit trail
    
    Status Outcomes:
    - POSTED: All allocations successfully posted
    - PARTIALLY_POSTED: Some allocations failed
    - FAILED: All allocations failed
    
    Restrictions:
    - Cannot post already-posted payments
    - Cannot post voided payments
    - All referenced balances must still be open
    """
)
def post_payment_to_ledger(
    payment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db_with_current_user)
):
    """Post payment to ledger"""
    try:
        service = InterimPaymentService(db)
        payment = service.post_payment_to_ledger(payment_id, posted_by=current_user.id)
        
        logger.info(
            f"Posted payment {payment.payment_id} to ledger by user {current_user.id} - "
            f"Status: {payment.status.value}"
        )
        
        return payment
        
    except PaymentNotFoundException as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except (PaymentAlreadyPostedException, PaymentAlreadyVoidedException) as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except PaymentPostingException as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error posting payment {payment_id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to post payment: {str(e)}"
        )


@router.post(
    "/post-batch",
    response_model=PostPaymentResponse,
    summary="Post Multiple Payments",
    description="""
    Post multiple interim payments to ledger in batch.
    
    Useful for end-of-day processing or when posting multiple payments at once.
    
    Returns summary of:
    - Total successful postings
    - Total failed postings
    - List of successful payment IDs
    - List of failed payments with error messages
    
    Processing continues even if some payments fail.
    """
)
def post_multiple_payments(
    request: PostPaymentRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db_with_current_user)
):
    """Post multiple payments to ledger"""
    try:
        service = InterimPaymentService(db)
        results = service.post_multiple_payments(
            payment_ids=request.payment_ids,
            posted_by=current_user.id
        )
        
        logger.info(
            f"Batch posted {len(request.payment_ids)} payments by user {current_user.id}: "
            f"{results['success_count']} success, {results['failed_count']} failed"
        )
        
        return results
        
    except Exception as e:
        logger.error(f"Error in batch posting: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to post payments: {str(e)}"
        )


@router.post(
    "/{payment_id}/void",
    response_model=InterimPaymentResponse,
    summary="Void Interim Payment",
    description="""
    Void an interim payment.
    
    For unposted payments:
    - Marks payment as VOIDED
    - Records void reason and timestamp
    - Payment cannot be posted after voiding
    
    For posted payments:
    - Creates reversal postings to undo ledger effects
    - Marks payment as VOIDED
    - Restores original balances
    
    Voiding is permanent and cannot be undone.
    A new payment must be created if this was in error.
    
    Void reason must be at least 10 characters for audit purposes.
    """
)
def void_payment(
    payment_id: int,
    request: VoidPaymentRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db_with_current_user)
):
    """Void a payment"""
    try:
        service = InterimPaymentService(db)
        payment = service.void_payment(
            payment_id=payment_id,
            reason=request.reason,
            voided_by=current_user.id
        )
        
        logger.info(
            f"Voided payment {payment.payment_id} by user {current_user.id} - "
            f"Reason: {request.reason}"
        )
        
        return payment
        
    except PaymentNotFoundException as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except (PaymentAlreadyVoidedException, InvalidVoidReasonException) as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error voiding payment {payment_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to void payment: {str(e)}"
        )


# ===== List & Query Endpoints =====


@router.get(
    "",
    response_model=InterimPaymentListResponse,
    summary="List Interim Payments",
    description="""
    List and filter interim payments with comprehensive search options.
    
    Supports:
    - Pagination (page, page_size)
    - Sorting (sort_by, sort_order)
    - Multiple filters:
      * payment_id: Partial match on payment ID
      * driver_id: Exact match on driver
      * lease_id: Exact match on lease
      * vehicle_id: Exact match on vehicle
      * medallion_id: Exact match on medallion
      * payment_method: Filter by method (CASH, CHECK, ACH, etc.)
      * status: Filter by status (PENDING, POSTED, etc.)
      * posted_to_ledger: Filter by posting status (0 or 1)
      * date_from/date_to: Date range filter
      * receipt_number: Partial match on receipt
      * check_number: Partial match on check number
      * min_amount/max_amount: Amount range filter
      * voided: Filter voided payments (true/false)
    
    Default sort: payment_date descending (most recent first)
    """
)
def list_interim_payments(
    payment_id: Optional[str] = Query(None),
    driver_id: Optional[int] = Query(None),
    lease_id: Optional[int] = Query(None),
    vehicle_id: Optional[int] = Query(None),
    medallion_id: Optional[int] = Query(None),
    payment_method: Optional[PaymentMethod] = Query(None),
    status: Optional[PaymentStatus] = Query(None),
    posted_to_ledger: Optional[int] = Query(None, ge=0, le=1),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    receipt_number: Optional[str] = Query(None),
    check_number: Optional[str] = Query(None),
    min_amount: Optional[Decimal] = Query(None, ge=0),
    max_amount: Optional[Decimal] = Query(None, ge=0),
    voided: Optional[bool] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    sort_by: str = Query("payment_date"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db_with_current_user)
):
    """List payments with filters and pagination"""
    try:
        service = InterimPaymentService(db)
        payments, total = service.find_payments(
            payment_id=payment_id,
            driver_id=driver_id,
            lease_id=lease_id,
            vehicle_id=vehicle_id,
            medallion_id=medallion_id,
            payment_method=payment_method,
            status=status,
            posted_to_ledger=posted_to_ledger,
            date_from=date_from,
            date_to=date_to,
            receipt_number=receipt_number,
            check_number=check_number,
            min_amount=min_amount,
            max_amount=max_amount,
            voided=voided,
            page=page,
            page_size=page_size,
            sort_by=sort_by,
            sort_order=sort_order
        )
        
        total_pages = (total + page_size - 1) // page_size
        
        return {
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages,
            "payments": payments
        }
        
    except Exception as e:
        logger.error(f"Error listing payments: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list payments: {str(e)}"
        ) from e
    
# ===== Unposted Payments Endpoint (Special Requirement) =====


@router.get(
    "/unposted/find",
    response_model=UnpostedPaymentsResponse,
    summary="Find Unposted Payments",
    description="""
    Find unposted interim payments based on various criteria.
    
    This is a special endpoint as requested in requirements to find payments
    that have not yet been posted to the ledger, filtered by:
    - repair_id: Find payments allocated to specific repair
    - driver_id: Find payments for specific driver
    - lease_id: Find payments for specific lease
    - vehicle_id: Find payments for specific vehicle
    - medallion_id: Find payments for specific medallion
    - period: Date range for payment_date
    - Combinations of any of the above
    
    Returns all unposted payments (PENDING or PARTIALLY_POSTED status)
    that match the criteria and have not been voided.
    
    Useful for:
    - End-of-day posting workflows
    - Finding payments related to specific obligations
    - Identifying pending payments before DTR processing
    - Reconciliation and audit purposes
    
    Sort options available for organizing results.
    """
)
def find_unposted_payments(
    repair_id: Optional[str] = Query(None, description="Filter by repair reference ID"),
    driver_id: Optional[int] = Query(None, description="Filter by driver ID"),
    lease_id: Optional[int] = Query(None, description="Filter by lease ID"),
    vehicle_id: Optional[int] = Query(None, description="Filter by vehicle ID"),
    medallion_id: Optional[int] = Query(None, description="Filter by medallion ID"),
    period_start: Optional[date] = Query(None, description="Start of date range"),
    period_end: Optional[date] = Query(None, description="End of date range"),
    sort_by: str = Query("payment_date", description="Field to sort by"),
    sort_order: str = Query("asc", pattern="^(asc|desc)$", description="Sort order"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db_with_current_user)
):
    """
    Find unposted payments with multiple filter options.
    Special endpoint as requested in requirements.
    """
    try:
        service = InterimPaymentService(db)
        
        unposted_payments = service.find_unposted_payments(
            repair_id=repair_id,
            driver_id=driver_id,
            lease_id=lease_id,
            vehicle_id=vehicle_id,
            medallion_id=medallion_id,
            period_start=period_start,
            period_end=period_end,
            sort_by=sort_by,
            sort_order=sort_order
        )
        
        logger.info(
            f"Found {len(unposted_payments)} unposted payments - "
            f"Filters: driver={driver_id}, lease={lease_id}, repair={repair_id}"
        )
        
        return {
            "total": len(unposted_payments),
            "unposted_payments": unposted_payments
        }
        
    except Exception as e:
        logger.error(f"Error finding unposted payments: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to find unposted payments: {str(e)}"
        )


# ===== Statistics Endpoint =====


@router.get(
    "/statistics",
    response_model=PaymentStatistics,
    summary="Get Payment Statistics",
    description="""
    Get statistical summary of interim payments.
    
    Returns:
    - Total number of payments
    - Total payment amount
    - Average payment amount
    - Count by status (pending, posted, voided, failed)
    
    Can be filtered by:
    - driver_id: Statistics for specific driver
    - lease_id: Statistics for specific lease
    - date_from/date_to: Date range
    
    Useful for:
    - Dashboard metrics
    - Management reporting
    - Performance monitoring
    - Trend analysis
    """
)
def get_payment_statistics(
    driver_id: Optional[int] = Query(None),
    lease_id: Optional[int] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db_with_current_user)
):
    """Get payment statistics"""
    try:
        service = InterimPaymentService(db)
        stats = service.get_statistics(
            driver_id=driver_id,
            lease_id=lease_id,
            date_from=date_from,
            date_to=date_to
        )
        
        return stats
        
    except Exception as e:
        logger.error(f"Error getting statistics: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get statistics: {str(e)}"
        )


# ===== Export Endpoint =====


@router.get(
    "/export/{format}",
    summary="Export Interim Payments",
    description="""
    Export interim payments to Excel, PDF, CSV, or JSON format.
    
    Supports all the same filters as the list endpoint for targeted exports.
    Useful for reporting, reconciliation, and external analysis.
    
    Export includes:
    - All payment details (ID, date, amount, method, status)
    - Driver, lease, vehicle, medallion information
    - Posting status and timestamps
    - Allocation summary (if applicable)
    
    Formats:
    - excel: XLSX file with formatted columns
    - pdf: PDF document with table layout
    - csv: CSV file for data import
    - json: JSON format for API integration
    
    Large exports may take time - consider filtering for better performance.
    """
)
def export_interim_payments(
    format: str,
    payment_id: Optional[str] = Query(None),
    driver_id: Optional[int] = Query(None),
    lease_id: Optional[int] = Query(None),
    vehicle_id: Optional[int] = Query(None),
    medallion_id: Optional[int] = Query(None),
    payment_method: Optional[PaymentMethod] = Query(None),
    status: Optional[PaymentStatus] = Query(None),
    posted_to_ledger: Optional[int] = Query(None, ge=0, le=1),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    receipt_number: Optional[str] = Query(None),
    check_number: Optional[str] = Query(None),
    min_amount: Optional[Decimal] = Query(None, ge=0),
    max_amount: Optional[Decimal] = Query(None, ge=0),
    voided: Optional[bool] = Query(None),
    sort_by: str = Query("payment_date"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db_with_current_user)
):
    """Export payments to file"""
    try:
        # Validate format
        if format.lower() not in ['excel', 'pdf', 'csv', 'json']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid format. Supported: excel, pdf, csv, json"
            )
        
        service = InterimPaymentService(db)
        
        # Get all payments (no pagination for export)
        payments, _ = service.find_payments(
            payment_id=payment_id,
            driver_id=driver_id,
            lease_id=lease_id,
            vehicle_id=vehicle_id,
            medallion_id=medallion_id,
            payment_method=payment_method,
            status=status,
            posted_to_ledger=posted_to_ledger,
            date_from=date_from,
            date_to=date_to,
            receipt_number=receipt_number,
            check_number=check_number,
            min_amount=min_amount,
            max_amount=max_amount,
            voided=voided,
            page=1,
            page_size=10000,  # Large number to get all
            sort_by=sort_by,
            sort_order=sort_order
        )
        
        if not payments:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No payments found for export"
            )
        
        # Prepare export data
        export_data = []
        for payment in payments:
            export_data.append({
                "Payment ID": payment.payment_id,
                "Driver ID": payment.driver_id,
                "Lease ID": payment.lease_id,
                "Vehicle ID": payment.vehicle_id or "",
                "Medallion ID": payment.medallion_id or "",
                "Payment Date": payment.payment_date.isoformat() if payment.payment_date else "",
                "Payment Method": payment.payment_method.value if payment.payment_method else "",
                "Total Amount": float(payment.total_amount),
                "Allocated Amount": float(payment.allocated_amount),
                "Unallocated Amount": float(payment.unallocated_amount),
                "Status": payment.status.value if payment.status else "",
                "Posted to Ledger": payment.posted_to_ledger,
                "Posted At": payment.posted_at.isoformat() if payment.posted_at else "",
                "Receipt Number": payment.receipt_number or "",
                "Check Number": payment.check_number or "",
                "Reference Number": payment.reference_number or "",
                "Description": payment.description or "",
                "Received By": payment.received_by or "",
                "Posted By": payment.posted_by or "",
                "Voided": "Yes" if payment.voided_at else "No",
                "Voided At": payment.voided_at.isoformat() if payment.voided_at else "",
                "Voided Reason": payment.voided_reason or "",
                "Created On": payment.created_on.isoformat() if payment.created_on else ""
            })
        
        # Generate export file using exporter_utils
        exporter = ExporterFactory.get_exporter(format.lower(), export_data)
        file_buffer = exporter.export()
        
        # Set media type and filename
        media_types = {
            'excel': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'pdf': 'application/pdf',
            'csv': 'text/csv',
            'json': 'application/json'
        }
        
        extensions = {
            'excel': 'xlsx',
            'pdf': 'pdf',
            'csv': 'csv',
            'json': 'json'
        }
        
        logger.info(
            f"Exported {len(payments)} interim payments to {format} by user {current_user.id}"
        )
        
        return StreamingResponse(
            file_buffer,
            media_type=media_types[format.lower()],
            headers={
                "Content-Disposition": f"attachment; filename=interim_payments_export.{extensions[format.lower()]}"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to export payments: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to export payments: {str(e)}"
        ) from e