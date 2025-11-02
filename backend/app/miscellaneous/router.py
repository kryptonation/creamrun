"""
app/miscellaneous/router.py

FastAPI router for Miscellaneous Charges API endpoints
"""

from datetime import date
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.dependencies import get_db_with_current_user
from app.users.utils import get_current_user
from app.users.models import User
from app.miscellaneous.service import MiscChargeService
from app.miscellaneous.schemas import (
    CreateMiscChargeRequest,
    UpdateMiscChargeRequest,
    MiscChargeResponse,
    MiscChargeListResponse,
    PostMiscChargeResponse,
    BulkPostRequest,
    BulkPostResponse,
    VoidMiscChargeRequest,
    MiscChargeStatistics
)
from app.miscellaneous.models import MiscChargeCategory, MiscChargeStatus
from app.miscellaneous.exceptions import (
    MiscChargeNotFoundException,
    MiscChargeValidationException,
    MiscChargeAlreadyPostedException,
    MiscChargeAlreadyVoidedException,
    EntityNotFoundException,
    LeaseNotActiveException,
    DuplicateChargeException,
    MiscChargeNotReadyException,
    MiscChargePostingException,
)
from app.utils.logger import get_logger
from app.utils.exporter_utils import ExporterFactory

logger = get_logger(__name__)

router = APIRouter(
    prefix="/miscellaneous-charges",
    tags=["Miscellaneous Charges"]
)


@router.post(
    "",
    response_model=MiscChargeResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Miscellaneous Charge",
    description="""
    Create a new miscellaneous charge for a driver.
    
    Business Rules:
    - Driver must have an active lease
    - Charge amount cannot be zero (positive for charges, negative for credits/adjustments)
    - Payment period must be Sunday 00:00:00 to Saturday 23:59:59
    - Reference number must be unique per driver (if provided)
    - Vehicle and medallion are derived from lease if not provided
    
    The charge will be in PENDING status and must be posted to ledger separately.
    """
)
def create_charge(
    request: CreateMiscChargeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db_with_current_user)
):
    """Create a new miscellaneous charge"""
    try:
        service = MiscChargeService(db)
        
        charge = service.create_charge(
            driver_id=request.driver_id,
            lease_id=request.lease_id,
            category=request.category,
            charge_amount=request.charge_amount,
            charge_date=request.charge_date,
            payment_period_start=request.payment_period_start,
            payment_period_end=request.payment_period_end,
            description=request.description,
            vehicle_id=request.vehicle_id,
            medallion_id=request.medallion_id,
            notes=request.notes,
            reference_number=request.reference_number,
            created_by=current_user.id
        )
        
        db.commit()
        logger.info(f"Created miscellaneous charge {charge.expense_id} by user {current_user.id}")
        
        return MiscChargeResponse.model_validate(charge)
        
    except (EntityNotFoundException, LeaseNotActiveException, DuplicateChargeException) as e:
        logger.warning(f"Validation error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        ) from e
    except MiscChargeValidationException as e:
        logger.warning(f"Validation error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        ) from e
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to create miscellaneous charge: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create charge: {str(e)}"
        ) from e


@router.get(
    "/{expense_id}",
    response_model=MiscChargeResponse,
    summary="Get Charge Details",
    description="Get detailed information about a specific miscellaneous charge"
)
def get_charge(
    expense_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db_with_current_user)
):
    """Get charge by expense ID"""
    try:
        service = MiscChargeService(db)
        charge = service.get_charge_by_id(expense_id)
        
        return MiscChargeResponse.model_validate(charge)
        
    except MiscChargeNotFoundException as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to get charge {expense_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get charge: {str(e)}"
        )


@router.patch(
    "/{expense_id}",
    response_model=MiscChargeResponse,
    summary="Update Charge",
    description="""
    Update miscellaneous charge details.
    
    Only charges in PENDING status that have not been posted to ledger can be updated.
    Provide only the fields you want to update.
    """
)
def update_charge(
    expense_id: str,
    request: UpdateMiscChargeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db_with_current_user)
):
    """Update charge details"""
    try:
        service = MiscChargeService(db)
        
        charge = service.update_charge(
            expense_id=expense_id,
            updated_by=current_user.id,
            category=request.category,
            charge_amount=request.charge_amount,
            charge_date=request.charge_date,
            description=request.description,
            notes=request.notes,
            reference_number=request.reference_number
        )
        
        db.commit()
        logger.info(f"Updated miscellaneous charge {expense_id} by user {current_user.id}")
        
        return MiscChargeResponse.model_validate(charge)
        
    except MiscChargeNotFoundException as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except (MiscChargeAlreadyPostedException, MiscChargeValidationException, DuplicateChargeException) as e:
        logger.warning(f"Update error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to update charge {expense_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update charge: {str(e)}"
        )


@router.get(
    "",
    response_model=MiscChargeListResponse,
    summary="List Charges",
    description="""
    List miscellaneous charges with comprehensive filtering, sorting, and pagination.
    
    Filters:
    - expense_id: Exact match
    - driver_id, lease_id, vehicle_id, medallion_id: Entity filters
    - category: Charge category
    - status: PENDING, POSTED, VOIDED
    - charge_date_from/to: Date range for charge date
    - period_start/end: Payment period filters
    - amount_min/max: Amount range
    - posted_to_ledger: 0 (not posted) or 1 (posted)
    - reference_number: Partial match
    
    Sorting:
    - sort_by: charge_date, charge_amount, expense_id, category, status
    - sort_order: asc or desc
    """
)
def list_charges(
    expense_id: Optional[str] = Query(None),
    driver_id: Optional[int] = Query(None, gt=0),
    lease_id: Optional[int] = Query(None, gt=0),
    vehicle_id: Optional[int] = Query(None, gt=0),
    medallion_id: Optional[int] = Query(None, gt=0),
    category: Optional[MiscChargeCategory] = Query(None),
    status: Optional[MiscChargeStatus] = Query(None),
    charge_date_from: Optional[date] = Query(None),
    charge_date_to: Optional[date] = Query(None),
    period_start: Optional[date] = Query(None),
    period_end: Optional[date] = Query(None),
    amount_min: Optional[Decimal] = Query(None),
    amount_max: Optional[Decimal] = Query(None),
    posted_to_ledger: Optional[int] = Query(None, ge=0, le=1),
    reference_number: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    sort_by: str = Query("charge_date"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db_with_current_user)
):
    """List charges with filters"""
    try:
        service = MiscChargeService(db)
        
        charges, total, total_pages = service.find_charges(
            expense_id=expense_id,
            driver_id=driver_id,
            lease_id=lease_id,
            vehicle_id=vehicle_id,
            medallion_id=medallion_id,
            category=category,
            status=status,
            charge_date_from=charge_date_from,
            charge_date_to=charge_date_to,
            period_start=period_start,
            period_end=period_end,
            amount_min=amount_min,
            amount_max=amount_max,
            posted_to_ledger=posted_to_ledger,
            reference_number=reference_number,
            page=page,
            page_size=page_size,
            sort_by=sort_by,
            sort_order=sort_order
        )
        
        return MiscChargeListResponse(
            charges=[MiscChargeResponse.model_validate(c) for c in charges],
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages
        )
        
    except Exception as e:
        logger.error(f"Failed to list charges: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list charges: {str(e)}"
        ) from e

@router.post(
    "/{expense_id}/post",
    response_model=PostMiscChargeResponse,
    summary="Post Charge to Ledger",
    description="""
    Post a miscellaneous charge to the centralized ledger.
    
    Creates:
    - DEBIT posting in MISC category
    - Ledger balance for tracking
    
    Business Rules:
    - Charge must be in PENDING status
    - Cannot post already posted charges
    - Creates obligation for next DTR cycle
    """
)
def post_charge(
    expense_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db_with_current_user)
):
    """Post single charge to ledger"""
    try:
        service = MiscChargeService(db)
        
        charge = service.post_charge_to_ledger(
            expense_id=expense_id,
            posted_by=current_user.id
        )
        
        logger.info(f"Posted charge {expense_id} to ledger by user {current_user.id}")
        
        return PostMiscChargeResponse(
            expense_id=charge.expense_id,
            status="SUCCESS",
            ledger_posting_id=charge.ledger_posting_id,
            ledger_balance_id=charge.ledger_balance_id,
            posted_at=charge.posted_at,
            message="Charge posted to ledger successfully"
        )
        
    except MiscChargeNotFoundException as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        ) from e
    except (MiscChargeNotReadyException, MiscChargePostingException) as e:
        logger.warning(f"Posting error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        ) from e
    except Exception as e:
        logger.error(f"Failed to post charge {expense_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to post charge: {str(e)}"
        ) from e


@router.post(
    "/post-batch",
    response_model=BulkPostResponse,
    summary="Post Multiple Charges",
    description="""
    Post multiple charges to ledger in a batch operation.
    
    Returns detailed results for each charge including successes and failures.
    Failures do not affect successful postings (partial success allowed).
    """
)
def post_batch(
    request: BulkPostRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db_with_current_user)
):
    """Post multiple charges to ledger"""
    try:
        service = MiscChargeService(db)
        
        results = service.post_multiple_charges(
            expense_ids=request.expense_ids,
            posted_by=current_user.id
        )
        
        logger.info(
            f"Batch posting by user {current_user.id}: "
            f"{results['successful']} succeeded, {results['failed']} failed"
        )
        
        return BulkPostResponse(**results)
        
    except Exception as e:
        logger.error(f"Failed batch posting: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed batch posting: {str(e)}"
        ) from e


@router.post(
    "/{expense_id}/void",
    response_model=MiscChargeResponse,
    summary="Void Charge",
    description="""
    Void a miscellaneous charge.
    
    If the charge was already posted to ledger:
    - Creates a reversal posting (CREDIT) to cancel the original DEBIT
    - Maintains complete audit trail
    
    If not yet posted:
    - Simply marks as VOIDED
    
    Voided charges cannot be un-voided. A new charge must be created instead.
    """
)
def void_charge(
    expense_id: str,
    request: VoidMiscChargeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db_with_current_user)
):
    """Void a charge"""
    try:
        service = MiscChargeService(db)
        
        charge = service.void_charge(
            expense_id=expense_id,
            void_reason=request.void_reason,
            voided_by=current_user.id
        )
        
        logger.info(f"Voided charge {expense_id} by user {current_user.id}")
        
        return MiscChargeResponse.model_validate(charge)
        
    except MiscChargeNotFoundException as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        ) from e
    except MiscChargeAlreadyVoidedException as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        ) from e
    except Exception as e:
        logger.error(f"Failed to void charge {expense_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to void charge: {str(e)}"
        ) from e


@router.get(
    "/unposted/find",
    response_model=list[MiscChargeResponse],
    summary="Find Unposted Charges",
    description="""
    Find all charges that are PENDING and not yet posted to ledger.
    
    Useful for:
    - Batch posting operations
    - Identifying charges ready to be posted
    - DTR preparation
    
    Optional filters available for driver, lease, and payment period.
    """
)
def find_unposted(
    driver_id: Optional[int] = Query(None, gt=0),
    lease_id: Optional[int] = Query(None, gt=0),
    period_start: Optional[date] = Query(None),
    period_end: Optional[date] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db_with_current_user)
):
    """Find unposted charges"""
    try:
        service = MiscChargeService(db)
        
        charges = service.find_unposted_charges(
            driver_id=driver_id,
            lease_id=lease_id,
            period_start=period_start,
            period_end=period_end
        )
        
        return [MiscChargeResponse.model_validate(c) for c in charges]
        
    except Exception as e:
        logger.error(f"Failed to find unposted charges: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to find unposted charges: {str(e)}"
        ) from e


@router.get(
    "/statistics",
    response_model=MiscChargeStatistics,
    summary="Get Charge Statistics",
    description="""
    Get statistical summary of miscellaneous charges.
    
    Returns:
    - Total charges and amounts
    - Breakdown by status (PENDING, POSTED, VOIDED)
    - Breakdown by category
    
    Optional filters for driver, lease, and date range.
    """
)
def get_statistics(
    driver_id: Optional[int] = Query(None, gt=0),
    lease_id: Optional[int] = Query(None, gt=0),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db_with_current_user)
):
    """Get statistics"""
    try:
        service = MiscChargeService(db)
        
        stats = service.get_statistics(
            driver_id=driver_id,
            lease_id=lease_id,
            date_from=date_from,
            date_to=date_to
        )
        
        return MiscChargeStatistics(**stats)
        
    except Exception as e:
        logger.error(f"Failed to get statistics: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get statistics: {str(e)}"
        ) from e

@router.get(
    "/export/{format}",
    summary="Export Charges",
    description="""
    Export miscellaneous charges to Excel, PDF, CSV, or JSON format.
    
    Supports all the same filters as the list endpoint.
    No pagination applied - exports all matching records.
    
    Formats:
    - excel: .xlsx spreadsheet
    - pdf: Formatted PDF document
    - csv: Comma-separated values
    - json: JSON array
    """
)
def export_charges(
    format: str,
    expense_id: Optional[str] = Query(None),
    driver_id: Optional[int] = Query(None, gt=0),
    lease_id: Optional[int] = Query(None, gt=0),
    vehicle_id: Optional[int] = Query(None, gt=0),
    medallion_id: Optional[int] = Query(None, gt=0),
    category: Optional[MiscChargeCategory] = Query(None),
    status: Optional[MiscChargeStatus] = Query(None),
    charge_date_from: Optional[date] = Query(None),
    charge_date_to: Optional[date] = Query(None),
    period_start: Optional[date] = Query(None),
    period_end: Optional[date] = Query(None),
    amount_min: Optional[Decimal] = Query(None),
    amount_max: Optional[Decimal] = Query(None),
    posted_to_ledger: Optional[int] = Query(None, ge=0, le=1),
    reference_number: Optional[str] = Query(None),
    sort_by: str = Query("charge_date"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db_with_current_user)
):
    """Export charges to file"""
    try:
        # Validate format
        if format.lower() not in ['excel', 'pdf', 'csv', 'json']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid format. Supported: excel, pdf, csv, json"
            )
        
        service = MiscChargeService(db)
        
        # Get all matching charges (no pagination for export)
        charges, total, _ = service.find_charges(
            expense_id=expense_id,
            driver_id=driver_id,
            lease_id=lease_id,
            vehicle_id=vehicle_id,
            medallion_id=medallion_id,
            category=category,
            status=status,
            charge_date_from=charge_date_from,
            charge_date_to=charge_date_to,
            period_start=period_start,
            period_end=period_end,
            amount_min=amount_min,
            amount_max=amount_max,
            posted_to_ledger=posted_to_ledger,
            reference_number=reference_number,
            page=1,
            page_size=10000,  # Large number to get all
            sort_by=sort_by,
            sort_order=sort_order
        )
        
        if not charges:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No charges found for export"
            )
        
        # Prepare data for export
        export_data = []
        for charge in charges:
            export_data.append({
                "Expense ID": charge.expense_id,
                "Driver ID": charge.driver_id,
                "Lease ID": charge.lease_id,
                "Vehicle ID": charge.vehicle_id or "",
                "Medallion ID": charge.medallion_id or "",
                "Category": charge.category.value,
                "Charge Amount": float(charge.charge_amount),
                "Charge Date": charge.charge_date.strftime("%Y-%m-%d"),
                "Payment Period Start": charge.payment_period_start.strftime("%Y-%m-%d"),
                "Payment Period End": charge.payment_period_end.strftime("%Y-%m-%d"),
                "Description": charge.description,
                "Reference Number": charge.reference_number or "",
                "Status": charge.status.value,
                "Posted to Ledger": "Yes" if charge.posted_to_ledger == 1 else "No",
                "Ledger Posting ID": charge.ledger_posting_id or "",
                "Ledger Balance ID": charge.ledger_balance_id or "",
                "Posted At": charge.posted_at.strftime("%Y-%m-%d %H:%M:%S") if charge.posted_at else "",
                "Voided": "Yes" if charge.status == MiscChargeStatus.VOIDED else "No",
                "Voided At": charge.voided_at.strftime("%Y-%m-%d %H:%M:%S") if charge.voided_at else "",
                "Voided Reason": charge.voided_reason or "",
                "Notes": charge.notes or "",
                "Created On": charge.created_on.strftime("%Y-%m-%d %H:%M:%S")
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
            f"Exported {len(charges)} miscellaneous charges to {format} "
            f"by user {current_user.id}"
        )
        
        return StreamingResponse(
            file_buffer,
            media_type=media_types[format.lower()],
            headers={
                "Content-Disposition": f"attachment; filename=miscellaneous_charges_export.{extensions[format.lower()]}"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to export charges: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to export charges: {str(e)}"
        ) from e