# app/driver_loans/router.py

from datetime import date
from typing import Optional
from math import ceil

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.users.models import User
from app.core.dependencies import get_current_user

from app.driver_loans.service import DriverLoanService
from app.driver_loans.models import LoanStatus, InstallmentStatus
from app.driver_loans.schemas import (
    CreateLoanRequest,
    UpdateLoanStatusRequest,
    PostInstallmentsRequest,
    DriverLoanResponse,
    DriverLoanDetailResponse,
    LoanScheduleResponse,
    PaginatedLoansResponse,
    PaginatedInstallmentsResponse,
    LoanStatisticsResponse,
    PostInstallmentsResponse
)
from app.utils.logger import get_logger
from app.utils.exporter_utils import ExporterFactory

logger = get_logger(__name__)

router = APIRouter(prefix="/loans", tags=["Driver Loans"])


# === Loan Management Endpoints ===

@router.post("/", response_model=DriverLoanDetailResponse, status_code=status.HTTP_201_CREATED)
def create_loan(
    request: CreateLoanRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new driver loan with automatic schedule generation
    
    Process:
    1. Validates driver and lease
    2. Creates loan master record
    3. Applies loan repayment matrix to determine weekly principal
    4. Generates installment schedule with interest calculations
    5. Returns loan with complete schedule
    
    Loan Repayment Matrix:
    - $0-$200: Single installment
    - $201-$500: $100/week
    - $501-$1,000: $200/week
    - $1,001-$3,000: $250/week
    - >$3,000: $300/week
    
    Interest Calculation:
    - Formula: Outstanding Principal × (Annual Rate / 100) × (Days / 365)
    - First installment: Days from loan date to first due date
    - Subsequent installments: 7 days (weekly)
    """
    try:
        service = DriverLoanService(db)
        
        loan = service.create_loan(
            driver_id=request.driver_id,
            lease_id=request.lease_id,
            loan_amount=request.loan_amount,
            interest_rate=request.interest_rate,
            start_week=request.start_week,
            purpose=request.purpose,
            notes=request.notes,
            created_by=current_user.id
        )
        
        # Load with installments for response
        loan_with_installments = service.get_loan_by_id(loan.loan_id, include_installments=True)
        
        response_data = DriverLoanDetailResponse.model_validate(loan_with_installments)
        response_data.total_installments = len(loan_with_installments.installments)
        response_data.paid_installments = sum(
            1 for i in loan_with_installments.installments 
            if i.status == InstallmentStatus.PAID
        )
        response_data.pending_installments = sum(
            1 for i in loan_with_installments.installments 
            if i.status in [InstallmentStatus.SCHEDULED, InstallmentStatus.DUE, InstallmentStatus.POSTED]
        )
        
        return response_data
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        ) from e
    except Exception as e:
        logger.error(f"Failed to create loan: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create loan: {str(e)}"
        ) from e


@router.get("/", response_model=PaginatedLoansResponse)
def list_loans(
    driver_id: Optional[int] = Query(None, gt=0, description="Filter by driver ID"),
    lease_id: Optional[int] = Query(None, gt=0, description="Filter by lease ID"),
    status: Optional[LoanStatus] = Query(None, description="Filter by loan status"),
    date_from: Optional[date] = Query(None, description="Filter loans from this date"),
    date_to: Optional[date] = Query(None, description="Filter loans until this date"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=500, description="Items per page"),
    sort_by: Optional[str] = Query(None, description="Sort field (loan_date, loan_amount, outstanding_balance, etc.)"),
    sort_order: str = Query("desc", regex="^(asc|desc)$", description="Sort order"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List driver loans with filters, sorting, and pagination
    
    Filters:
    - driver_id: All loans for specific driver
    - lease_id: All loans for specific lease
    - status: Filter by loan status (ACTIVE, CLOSED, ON_HOLD, CANCELLED)
    - date_from/date_to: Filter by loan date range
    
    Sorting:
    - Supported fields: loan_date, loan_amount, outstanding_balance, start_week, created_on
    - Default: Most recent loans first (created_on desc)
    
    Returns paginated results with total count
    """
    try:
        service = DriverLoanService(db)
        
        loans, total = service.find_loans(
            driver_id=driver_id,
            lease_id=lease_id,
            status=status,
            date_from=date_from,
            date_to=date_to,
            page=page,
            page_size=page_size,
            sort_by=sort_by,
            sort_order=sort_order
        )
        
        return PaginatedLoansResponse(
            items=[DriverLoanResponse.model_validate(loan) for loan in loans],
            total=total,
            page=page,
            page_size=page_size,
            total_pages=ceil(total / page_size) if total > 0 else 0
        )
        
    except Exception as e:
        logger.error(f"Failed to list loans: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list loans: {str(e)}"
        ) from e


@router.get("/{loan_id}", response_model=DriverLoanDetailResponse)
def get_loan_detail(
    loan_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get detailed loan information including all installments
    
    Returns:
    - Complete loan details
    - All installments with payment status
    - Calculated summary statistics
    """
    try:
        service = DriverLoanService(db)
        
        loan = service.get_loan_by_id(loan_id, include_installments=True)
        
        if not loan:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Loan {loan_id} not found"
            )
        
        response_data = DriverLoanDetailResponse.model_validate(loan)
        response_data.total_installments = len(loan.installments)
        response_data.paid_installments = sum(
            1 for i in loan.installments if i.status == InstallmentStatus.PAID
        )
        response_data.pending_installments = sum(
            1 for i in loan.installments 
            if i.status in [InstallmentStatus.SCHEDULED, InstallmentStatus.DUE, InstallmentStatus.POSTED]
        )
        
        return response_data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get loan detail: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get loan detail: {str(e)}"
        ) from e


@router.put("/{loan_id}/status", response_model=DriverLoanResponse)
def update_loan_status(
    loan_id: str,
    request: UpdateLoanStatusRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update loan status
    
    Allowed transitions:
    - DRAFT -> ACTIVE, CANCELLED
    - ACTIVE -> ON_HOLD, CLOSED, CANCELLED
    - ON_HOLD -> ACTIVE, CANCELLED
    - CLOSED, CANCELLED -> No transitions allowed
    
    Notes:
    - Cannot cancel if installments already posted (use ON_HOLD instead)
    - CLOSED status automatically set when loan fully paid
    """
    try:
        service = DriverLoanService(db)
        
        loan = service.update_loan_status(
            loan_id=loan_id,
            new_status=request.status,
            reason=request.reason,
            user_id=current_user.id
        )
        
        return DriverLoanResponse.model_validate(loan)
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        ) from e
    except Exception as e:
        logger.error(f"Failed to update loan status: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update loan status: {str(e)}"
        ) from e


@router.get("/statistics/summary", response_model=LoanStatisticsResponse)
def get_loan_statistics(
    driver_id: Optional[int] = Query(None, gt=0, description="Filter by driver ID"),
    lease_id: Optional[int] = Query(None, gt=0, description="Filter by lease ID"),
    date_from: Optional[date] = Query(None, description="Filter from date"),
    date_to: Optional[date] = Query(None, description="Filter to date"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get aggregated loan statistics
    
    Returns:
    - Total loan counts by status
    - Total amounts (disbursed, collected, outstanding)
    - Interest collected
    
    Useful for:
    - Driver financial summary
    - Management reporting
    - Portfolio analysis
    """
    try:
        service = DriverLoanService(db)
        
        stats = service.get_loan_statistics(
            driver_id=driver_id,
            lease_id=lease_id,
            date_from=date_from,
            date_to=date_to
        )
        
        return LoanStatisticsResponse(**stats)
        
    except Exception as e:
        logger.error(f"Failed to get statistics: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get statistics: {str(e)}"
        ) from e


# === Installment Management Endpoints ===

@router.post("/installments/post", response_model=PostInstallmentsResponse)
def post_installments_to_ledger(
    request: PostInstallmentsRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Post loan installments to ledger
    
    This endpoint is called:
    1. Automatically by scheduled job every Sunday 05:00 AM
    2. Manually by finance staff for specific periods/loans
    
    Process:
    1. Finds installments due for the period
    2. Creates ledger obligations (DEBIT + Balance)
    3. Links installments to ledger balances
    4. Updates installment status to POSTED
    
    Parameters:
    - loan_id: Post installments for specific loan only
    - payment_period_start/end: Payment period (defaults to current week)
    - dry_run: Simulate posting without committing
    
    Only posts installments from ACTIVE loans
    """
    try:
        service = DriverLoanService(db)
        
        result = service.post_weekly_installments(
            payment_period_start=request.payment_period_start,
            payment_period_end=request.payment_period_end,
            loan_id=request.loan_id,
            dry_run=request.dry_run
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Failed to post installments: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to post installments: {str(e)}"
        ) from e


@router.get("/installments/unposted", response_model=PaginatedInstallmentsResponse)
def get_unposted_installments(
    loan_id: Optional[str] = Query(None, description="Filter by loan ID"),
    driver_id: Optional[int] = Query(None, gt=0, description="Filter by driver ID"),
    lease_id: Optional[int] = Query(None, gt=0, description="Filter by lease ID"),
    medallion_id: Optional[int] = Query(None, gt=0, description="Filter by medallion ID"),
    vehicle_id: Optional[int] = Query(None, gt=0, description="Filter by vehicle ID"),
    period_start: Optional[date] = Query(None, description="Filter by period start date"),
    period_end: Optional[date] = Query(None, description="Filter by period end date"),
    status: Optional[InstallmentStatus] = Query(None, description="Filter by installment status"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=500, description="Items per page"),
    sort_by: Optional[str] = Query(None, description="Sort field (due_date, total_due, etc.)"),
    sort_order: str = Query("asc", regex="^(asc|desc)$", description="Sort order"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Find unposted loan installments with comprehensive filters
    
    This endpoint supports finding installments by:
    - loan_id: Specific loan
    - driver_id: All loans for a driver
    - lease_id: All loans for a lease  
    - medallion_id: All loans for medallion (via lease)
    - vehicle_id: All loans for vehicle (via lease)
    - period_start/period_end: Payment period range
    - status: Installment status
    
    Can combine any or all filters for precise queries.
    
    Use cases:
    - Find all unposted installments for a driver
    - Find installments for a specific period
    - Find installments for a medallion/vehicle
    - Audit installment posting status
    
    Default sort: Ascending by due_date (oldest first)
    """
    try:
        service = DriverLoanService(db)
        
        installments, total = service.find_unposted_installments(
            loan_id=loan_id,
            driver_id=driver_id,
            lease_id=lease_id,
            medallion_id=medallion_id,
            vehicle_id=vehicle_id,
            period_start=period_start,
            period_end=period_end,
            status=status,
            page=page,
            page_size=page_size,
            sort_by=sort_by,
            sort_order=sort_order
        )
        
        return PaginatedInstallmentsResponse(
            items=[LoanScheduleResponse.model_validate(inst) for inst in installments],
            total=total,
            page=page,
            page_size=page_size,
            total_pages=ceil(total / page_size) if total > 0 else 0
        )
        
    except Exception as e:
        logger.error(f"Failed to get unposted installments: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get unposted installments: {str(e)}"
        ) from e


# === Export Endpoints ===

@router.get("/export/{format}")
def export_loans(
    format: str,
    driver_id: Optional[int] = Query(None, gt=0),
    lease_id: Optional[int] = Query(None, gt=0),
    status: Optional[LoanStatus] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    sort_by: Optional[str] = Query(None),
    sort_order: str = Query("desc", regex="^(asc|desc)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Export loans to Excel, PDF, CSV, or JSON
    
    Formats:
    - excel: XLSX file with formatted columns
    - pdf: PDF report with tabular layout
    - csv: Comma-separated values
    - json: JSON array
    
    Applies same filters as list endpoint
    Exports all matching records (no pagination)
    """
    try:
        if format.lower() not in ['excel', 'pdf', 'csv', 'json']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid format. Supported: excel, pdf, csv, json"
            )
        
        service = DriverLoanService(db)
        
        # Get all loans (no pagination for export)
        loans, _ = service.find_loans(
            driver_id=driver_id,
            lease_id=lease_id,
            status=status,
            date_from=date_from,
            date_to=date_to,
            page=1,
            page_size=10000,  # Large number to get all
            sort_by=sort_by,
            sort_order=sort_order
        )
        
        if not loans:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No loans found for export"
            )
        
        # Prepare data for export
        export_data = []
        for loan in loans:
            export_data.append({
                "Loan ID": loan.loan_id,
                "Driver ID": loan.driver_id,
                "Lease ID": loan.lease_id,
                "Loan Amount": float(loan.loan_amount),
                "Interest Rate (%)": float(loan.interest_rate),
                "Status": loan.status.value,
                "Loan Date": loan.loan_date.isoformat() if loan.loan_date else "",
                "Start Week": loan.start_week.isoformat() if loan.start_week else "",
                "End Week": loan.end_week.isoformat() if loan.end_week else "",
                "Total Principal Paid": float(loan.total_principal_paid),
                "Total Interest Paid": float(loan.total_interest_paid),
                "Outstanding Balance": float(loan.outstanding_balance),
                "Purpose": loan.purpose or "",
                "Created On": loan.created_on.isoformat() if loan.created_on else ""
            })
        
        # Generate export file
        exporter = ExporterFactory.get_exporter(format.lower(), export_data)
        file_buffer = exporter.export()
        
        # Set appropriate media type and filename
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
        
        return StreamingResponse(
            file_buffer,
            media_type=media_types[format.lower()],
            headers={
                "Content-Disposition": f"attachment; filename=driver_loans_export.{extensions[format.lower()]}"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to export loans: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to export loans: {str(e)}"
        ) from e


@router.get("/installments/export/{format}")
def export_installments(
    format: str,
    loan_id: Optional[str] = Query(None),
    driver_id: Optional[int] = Query(None, gt=0),
    lease_id: Optional[int] = Query(None, gt=0),
    medallion_id: Optional[int] = Query(None, gt=0),
    vehicle_id: Optional[int] = Query(None, gt=0),
    period_start: Optional[date] = Query(None),
    period_end: Optional[date] = Query(None),
    status: Optional[InstallmentStatus] = Query(None),
    sort_by: Optional[str] = Query(None),
    sort_order: str = Query("asc", regex="^(asc|desc)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Export loan installments to Excel, PDF, CSV, or JSON
    
    Supports same comprehensive filters as unposted installments endpoint
    Exports all matching records (no pagination)
    """
    try:
        if format.lower() not in ['excel', 'pdf', 'csv', 'json']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid format. Supported: excel, pdf, csv, json"
            )
        
        service = DriverLoanService(db)
        
        # Get all installments (no pagination for export)
        installments, _ = service.find_unposted_installments(
            loan_id=loan_id,
            driver_id=driver_id,
            lease_id=lease_id,
            medallion_id=medallion_id,
            vehicle_id=vehicle_id,
            period_start=period_start,
            period_end=period_end,
            status=status,
            page=1,
            page_size=10000,  # Large number to get all
            sort_by=sort_by,
            sort_order=sort_order
        )
        
        if not installments:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No installments found for export"
            )
        
        # Prepare data for export
        export_data = []
        for inst in installments:
            export_data.append({
                "Installment ID": inst.installment_id,
                "Loan ID": inst.loan_id,
                "Installment Number": inst.installment_number,
                "Due Date": inst.due_date.isoformat() if inst.due_date else "",
                "Week Start": inst.week_start.isoformat() if inst.week_start else "",
                "Week End": inst.week_end.isoformat() if inst.week_end else "",
                "Principal Amount": float(inst.principal_amount),
                "Interest Amount": float(inst.interest_amount),
                "Total Due": float(inst.total_due),
                "Principal Paid": float(inst.principal_paid),
                "Interest Paid": float(inst.interest_paid),
                "Outstanding Balance": float(inst.outstanding_balance),
                "Status": inst.status.value,
                "Posted to Ledger": inst.posted_to_ledger,
                "Ledger Balance ID": inst.ledger_balance_id or "",
                "Posted On": inst.posted_on.isoformat() if inst.posted_on else ""
            })
        
        # Generate export file
        exporter = ExporterFactory.get_exporter(format.lower(), export_data)
        file_buffer = exporter.export()
        
        # Set appropriate media type and filename
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
        
        return StreamingResponse(
            file_buffer,
            media_type=media_types[format.lower()],
            headers={
                "Content-Disposition": f"attachment; filename=loan_installments_export.{extensions[format.lower()]}"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to export installments: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to export installments: {str(e)}"
        ) from e