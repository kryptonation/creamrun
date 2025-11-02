"""
app/repairs/router.py - Part 1

API endpoints for Vehicle Repairs module
Provides RESTful interface for repair management
"""

from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.dependencies import get_db_with_current_user
from app.users.utils import get_current_user
from app.users.models import User
from app.repairs.service import RepairService
from app.repairs.schemas import (
    CreateRepairRequest, UpdateRepairRequest, UpdateRepairStatusRequest,
    PostInstallmentsRequest, RepairResponse, RepairListResponse,
    RepairInstallmentResponse, InstallmentListResponse, PostInstallmentsResponse,
    RepairStatisticsResponse
)
from app.repairs.models import WorkshopType, RepairStatus, InstallmentStatus
from app.repairs.exceptions import (
    RepairNotFoundException, InstallmentNotFoundException, RepairValidationException,
    DuplicateInvoiceException, InvalidStatusTransitionException
)
from app.utils.exporter_utils import ExporterFactory
from app.utils.logger import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/repairs", tags=["Vehicle Repairs"])


# === Repair CRUD Endpoints ===

@router.post(
    "/",
    response_model=RepairResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Repair Invoice",
    description="""
    Create a new vehicle repair invoice and generate payment schedule.
    
    Steps:
    1. Validates driver, lease, and vehicle exist
    2. Checks for duplicate invoice number
    3. Calculates weekly installment from payment matrix
    4. Generates installment schedule
    5. Returns repair with DRAFT status
    
    Payment Matrix:
    - $0-200: Paid in full
    - $201-500: $100/week
    - $501-1000: $200/week
    - $1001-3000: $250/week
    - >$3000: $300/week
    """
)
def create_repair(
    request: CreateRepairRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db_with_current_user)
):
    """Create new repair invoice with payment schedule"""
    try:
        service = RepairService(db)
        
        repair = service.create_repair(
            driver_id=request.driver_id,
            lease_id=request.lease_id,
            vehicle_id=request.vehicle_id,
            medallion_id=request.medallion_id,
            invoice_number=request.invoice_number,
            invoice_date=request.invoice_date,
            workshop_type=request.workshop_type,
            repair_description=request.repair_description,
            repair_amount=request.repair_amount,
            start_week=request.start_week,
            invoice_document_id=request.invoice_document_id,
            user_id=current_user.id
        )
        
        db.commit()
        logger.info(f"Created repair {repair.repair_id} by user {current_user.id}")
        
        return RepairResponse.model_validate(repair)
        
    except DuplicateInvoiceException as e:
        logger.warning(f"Duplicate invoice: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e)
        )
    except RepairValidationException as e:
        logger.warning(f"Validation error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to create repair: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create repair: {str(e)}"
        )


@router.get(
    "/{repair_id}",
    response_model=RepairResponse,
    summary="Get Repair Details",
    description="Get detailed information about a specific repair invoice including installments"
)
def get_repair(
    repair_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db_with_current_user)
):
    """Get repair by ID"""
    try:
        service = RepairService(db)
        repair = service.get_repair_by_id(repair_id)
        
        # Include installments in response
        response = RepairResponse.model_validate(repair)
        response.installments = [
            RepairInstallmentResponse.model_validate(inst)
            for inst in repair.installments
        ]
        
        return response
        
    except RepairNotFoundException as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to get repair {repair_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get repair: {str(e)}"
        )


@router.put(
    "/{repair_id}",
    response_model=RepairResponse,
    summary="Update Repair Invoice",
    description="""
    Update repair invoice details. 
    Can only update repairs in DRAFT status with no posted installments.
    
    If repair_amount or start_week is changed, installment schedule is regenerated.
    """
)
def update_repair(
    repair_id: str,
    request: UpdateRepairRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db_with_current_user)
):
    """Update repair invoice"""
    try:
        service = RepairService(db)
        
        repair = service.update_repair(
            repair_id=repair_id,
            invoice_number=request.invoice_number,
            invoice_date=request.invoice_date,
            workshop_type=request.workshop_type,
            repair_description=request.repair_description,
            repair_amount=request.repair_amount,
            start_week=request.start_week,
            invoice_document_id=request.invoice_document_id,
            user_id=current_user.id
        )
        
        db.commit()
        logger.info(f"Updated repair {repair_id} by user {current_user.id}")
        
        return RepairResponse.model_validate(repair)
        
    except RepairNotFoundException as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except RepairValidationException as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to update repair {repair_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update repair: {str(e)}"
        )


@router.post(
    "/{repair_id}/confirm",
    response_model=RepairResponse,
    summary="Confirm Repair Invoice",
    description="""
    Confirm repair invoice and activate payment schedule.
    Changes status from DRAFT to OPEN.
    Once confirmed, installments can be posted to ledger.
    """
)
def confirm_repair(
    repair_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db_with_current_user)
):
    """Confirm repair invoice"""
    try:
        service = RepairService(db)
        repair = service.confirm_repair(repair_id, current_user.id)
        
        db.commit()
        logger.info(f"Confirmed repair {repair_id} by user {current_user.id}")
        
        return RepairResponse.model_validate(repair)
        
    except RepairNotFoundException as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except InvalidStatusTransitionException as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to confirm repair {repair_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to confirm repair: {str(e)}"
        )


@router.patch(
    "/{repair_id}/status",
    response_model=RepairResponse,
    summary="Update Repair Status",
    description="""
    Update repair status with validation.
    
    Allowed transitions:
    - DRAFT -> OPEN, CANCELLED
    - OPEN -> HOLD, CLOSED, CANCELLED
    - HOLD -> OPEN, CANCELLED
    - CLOSED -> (none)
    - CANCELLED -> (none)
    
    Reason required for HOLD and CANCELLED statuses.
    """
)
def update_repair_status(
    repair_id: str,
    request: UpdateRepairStatusRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db_with_current_user)
):
    """Update repair status"""
    try:
        service = RepairService(db)
        
        repair = service.update_repair_status(
            repair_id=repair_id,
            new_status=request.status,
            reason=request.reason,
            user_id=current_user.id
        )
        
        db.commit()
        logger.info(f"Updated repair {repair_id} status to {request.status} by user {current_user.id}")
        
        return RepairResponse.model_validate(repair)
        
    except RepairNotFoundException as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except (InvalidStatusTransitionException, RepairValidationException) as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to update repair status: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update status: {str(e)}"
        )


@router.get(
    "/",
    response_model=RepairListResponse,
    summary="List Repairs",
    description="""
    List repairs with filtering, sorting, and pagination.
    
    Filters:
    - repair_id: Specific repair ID
    - driver_id: Filter by driver
    - lease_id: Filter by lease
    - vehicle_id: Filter by vehicle
    - medallion_id: Filter by medallion
    - invoice_number: Search by invoice number (partial match)
    - workshop_type: Filter by workshop type
    - status: Filter by status
    - invoice_date_from/to: Date range filter
    - amount_min/max: Amount range filter
    
    Sorting:
    - sort_by: Field to sort by (default: invoice_date)
    - sort_order: asc or desc (default: desc)
    
    Pagination:
    - page: Page number (default: 1)
    - page_size: Items per page (default: 50, max: 1000)
    """
)
def list_repairs(
    repair_id: Optional[str] = Query(None),
    driver_id: Optional[int] = Query(None),
    lease_id: Optional[int] = Query(None),
    vehicle_id: Optional[int] = Query(None),
    medallion_id: Optional[int] = Query(None),
    invoice_number: Optional[str] = Query(None),
    workshop_type: Optional[WorkshopType] = Query(None),
    status: Optional[RepairStatus] = Query(None),
    invoice_date_from: Optional[date] = Query(None),
    invoice_date_to: Optional[date] = Query(None),
    amount_min: Optional[float] = Query(None),
    amount_max: Optional[float] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=1000),
    sort_by: str = Query("invoice_date"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db_with_current_user)
):
    """List repairs with filters"""
    try:
        service = RepairService(db)
        
        filters = {
            'repair_id': repair_id,
            'driver_id': driver_id,
            'lease_id': lease_id,
            'vehicle_id': vehicle_id,
            'medallion_id': medallion_id,
            'invoice_number': invoice_number,
            'workshop_type': workshop_type,
            'status': status,
            'invoice_date_from': invoice_date_from,
            'invoice_date_to': invoice_date_to,
            'amount_min': amount_min,
            'amount_max': amount_max,
            'page': page,
            'page_size': page_size,
            'sort_by': sort_by,
            'sort_order': sort_order
        }
        
        repairs, total = service.find_repairs(filters)
        
        total_pages = (total + page_size - 1) // page_size
        
        return RepairListResponse(
            repairs=[RepairResponse.model_validate(r) for r in repairs],
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages
        )
        
    except Exception as e:
        logger.error(f"Failed to list repairs: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list repairs: {str(e)}"
        )

# === Installment Endpoints ===

@router.get(
    "/installments/unposted",
    response_model=InstallmentListResponse,
    summary="Find Unposted Repair Installments",
    description="""
    Find unposted repair installments with multiple filter options.
    
    This is the key endpoint for finding installments ready for posting to ledger.
    Supports filtering by:
    - repair_id: Specific repair invoice
    - driver_id: All unposted installments for a driver
    - lease_id: All unposted installments for a lease
    - vehicle_id: All unposted installments for a vehicle
    - medallion_id: All unposted installments for a medallion
    - period_start/end: Payment period date range
    - status: Installment status (SCHEDULED, DUE, etc.)
    
    Combinations of any filters are supported.
    
    Use cases:
    - Weekly posting: Find all installments due this week
    - Driver view: Show driver's upcoming payments
    - Vehicle tracking: See all pending repairs for a vehicle
    - Period reconciliation: Find all unposted items in a date range
    """
)
def find_unposted_installments(
    repair_id: Optional[str] = Query(None, description="Filter by repair ID"),
    driver_id: Optional[int] = Query(None, description="Filter by driver"),
    lease_id: Optional[int] = Query(None, description="Filter by lease"),
    vehicle_id: Optional[int] = Query(None, description="Filter by vehicle"),
    medallion_id: Optional[int] = Query(None, description="Filter by medallion"),
    period_start: Optional[date] = Query(None, description="Payment period start date"),
    period_end: Optional[date] = Query(None, description="Payment period end date"),
    status: Optional[InstallmentStatus] = Query(None, description="Installment status"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=1000, description="Items per page"),
    sort_by: str = Query("week_start", description="Field to sort by"),
    sort_order: str = Query("asc", pattern="^(asc|desc)$", description="Sort order"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db_with_current_user)
):
    """Find unposted installments with filters"""
    try:
        service = RepairService(db)
        
        filters = {
            'repair_id': repair_id,
            'driver_id': driver_id,
            'lease_id': lease_id,
            'vehicle_id': vehicle_id,
            'medallion_id': medallion_id,
            'period_start': period_start,
            'period_end': period_end,
            'status': status,
            'page': page,
            'page_size': page_size,
            'sort_by': sort_by,
            'sort_order': sort_order
        }
        
        installments, total = service.find_unposted_installments(filters)
        
        total_pages = (total + page_size - 1) // page_size
        
        logger.info(f"Found {len(installments)} unposted installments (page {page} of {total_pages})")
        
        return InstallmentListResponse(
            installments=[RepairInstallmentResponse.model_validate(inst) for inst in installments],
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages
        )
        
    except Exception as e:
        logger.error(f"Failed to find unposted installments: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to find unposted installments: {str(e)}"
        )


@router.get(
    "/installments/",
    response_model=InstallmentListResponse,
    summary="List All Installments",
    description="""
    List all repair installments (both posted and unposted) with filtering and sorting.
    
    Similar to unposted endpoint but includes all installments regardless of posting status.
    Use posted_to_ledger filter to control which installments to include:
    - posted_to_ledger=0: Unposted only
    - posted_to_ledger=1: Posted only
    - No filter: All installments
    """
)
def list_installments(
    installment_id: Optional[str] = Query(None),
    repair_id: Optional[str] = Query(None),
    driver_id: Optional[int] = Query(None),
    lease_id: Optional[int] = Query(None),
    vehicle_id: Optional[int] = Query(None),
    medallion_id: Optional[int] = Query(None),
    period_start: Optional[date] = Query(None),
    period_end: Optional[date] = Query(None),
    status: Optional[InstallmentStatus] = Query(None),
    posted_to_ledger: Optional[int] = Query(None, ge=0, le=1, description="0=unposted, 1=posted"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=1000),
    sort_by: str = Query("week_start"),
    sort_order: str = Query("asc", pattern="^(asc|desc)$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db_with_current_user)
):
    """List all installments with filters"""
    try:
        service = RepairService(db)
        
        filters = {
            'installment_id': installment_id,
            'repair_id': repair_id,
            'driver_id': driver_id,
            'lease_id': lease_id,
            'vehicle_id': vehicle_id,
            'medallion_id': medallion_id,
            'period_start': period_start,
            'period_end': period_end,
            'status': status,
            'posted_to_ledger': posted_to_ledger,
            'page': page,
            'page_size': page_size,
            'sort_by': sort_by,
            'sort_order': sort_order
        }
        
        installments, total = service.find_installments(filters)
        
        total_pages = (total + page_size - 1) // page_size
        
        return InstallmentListResponse(
            installments=[RepairInstallmentResponse.model_validate(inst) for inst in installments],
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages
        )
        
    except Exception as e:
        logger.error(f"Failed to list installments: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list installments: {str(e)}"
        )


@router.get(
    "/installments/{installment_id}",
    response_model=RepairInstallmentResponse,
    summary="Get Installment Details",
    description="Get detailed information about a specific installment"
)
def get_installment(
    installment_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db_with_current_user)
):
    """Get installment by ID"""
    try:
        service = RepairService(db)
        installment = service.get_installment_by_id(installment_id)
        
        return RepairInstallmentResponse.model_validate(installment)
        
    except InstallmentNotFoundException as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to get installment: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get installment: {str(e)}"
        )


# === Ledger Posting Endpoints ===

@router.post(
    "/installments/post",
    response_model=PostInstallmentsResponse,
    summary="Post Installments to Ledger",
    description="""
    Manually post selected installments to ledger.
    
    Validates each installment before posting:
    - Must not already be posted
    - Repair must be in OPEN status
    - Creates DEBIT obligation in ledger with REPAIRS category
    
    Returns summary of successful and failed postings.
    Maximum 100 installments per request.
    """
)
def post_installments(
    request: PostInstallmentsRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db_with_current_user)
):
    """Post installments to ledger"""
    try:
        service = RepairService(db)
        
        result = service.post_installments_to_ledger(
            installment_ids=request.installment_ids,
            user_id=current_user.id
        )
        
        db.commit()
        
        message = f"Posted {result['success_count']} installments successfully"
        if result['failure_count'] > 0:
            message += f", {result['failure_count']} failed"
        
        logger.info(f"{message} by user {current_user.id}")
        
        return PostInstallmentsResponse(
            success_count=result['success_count'],
            failure_count=result['failure_count'],
            posted_installments=result['posted_installments'],
            failed_installments=result['failed_installments'],
            message=message
        )
        
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to post installments: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to post installments: {str(e)}"
        ) from e


# === Statistics and Reports ===

@router.get(
    "/statistics",
    response_model=RepairStatisticsResponse,
    summary="Get Repair Statistics",
    description="""
    Get aggregated statistics for repairs.
    
    Includes:
    - Counts by status (open, closed, draft, hold)
    - Financial totals (total amount, paid, outstanding)
    - Installment counts by status
    - Average repair amount and weekly installment
    
    Can be filtered by driver, lease, or date range.
    """
)
def get_statistics(
    driver_id: Optional[int] = Query(None),
    lease_id: Optional[int] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db_with_current_user)
):
    """Get repair statistics"""
    try:
        service = RepairService(db)
        
        stats = service.get_repair_statistics(
            driver_id=driver_id,
            lease_id=lease_id,
            date_from=date_from,
            date_to=date_to
        )
        
        return RepairStatisticsResponse(**stats)
        
    except Exception as e:
        logger.error(f"Failed to get statistics: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get statistics: {str(e)}"
        ) from e


# === Export Endpoints ===

@router.get(
    "/export/{format}",
    summary="Export Repairs",
    description="""
    Export repairs to Excel, PDF, CSV, or JSON format.
    
    Supports all the same filters as the list endpoint.
    Format parameter: excel, pdf, csv, json
    
    Returns file as download.
    """
)
def export_repairs(
    format: str,
    repair_id: Optional[str] = Query(None),
    driver_id: Optional[int] = Query(None),
    lease_id: Optional[int] = Query(None),
    vehicle_id: Optional[int] = Query(None),
    medallion_id: Optional[int] = Query(None),
    invoice_number: Optional[str] = Query(None),
    workshop_type: Optional[WorkshopType] = Query(None),
    status: Optional[RepairStatus] = Query(None),
    invoice_date_from: Optional[date] = Query(None),
    invoice_date_to: Optional[date] = Query(None),
    amount_min: Optional[float] = Query(None),
    amount_max: Optional[float] = Query(None),
    sort_by: str = Query("invoice_date"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db_with_current_user)
):
    """Export repairs to file"""
    try:
        if format.lower() not in ['excel', 'pdf', 'csv', 'json']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid format. Supported: excel, pdf, csv, json"
            )
        
        service = RepairService(db)
        
        # Get all repairs (no pagination for export)
        filters = {
            'repair_id': repair_id,
            'driver_id': driver_id,
            'lease_id': lease_id,
            'vehicle_id': vehicle_id,
            'medallion_id': medallion_id,
            'invoice_number': invoice_number,
            'workshop_type': workshop_type,
            'status': status,
            'invoice_date_from': invoice_date_from,
            'invoice_date_to': invoice_date_to,
            'amount_min': amount_min,
            'amount_max': amount_max,
            'page': 1,
            'page_size': 10000,  # Large number to get all
            'sort_by': sort_by,
            'sort_order': sort_order
        }
        
        repairs, total = service.find_repairs(filters)
        
        if not repairs:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No repairs found for export"
            )
        
        # Prepare export data
        export_data = []
        for repair in repairs:
            export_data.append({
                "Repair ID": repair.repair_id,
                "Invoice Number": repair.invoice_number,
                "Invoice Date": repair.invoice_date.isoformat() if repair.invoice_date else "",
                "Driver ID": repair.driver_id,
                "Lease ID": repair.lease_id,
                "Vehicle ID": repair.vehicle_id,
                "Plate Number": repair.plate_number or "",
                "Workshop Type": repair.workshop_type.value,
                "Repair Amount": float(repair.repair_amount),
                "Weekly Installment": float(repair.weekly_installment_amount),
                "Total Paid": float(repair.total_paid),
                "Outstanding Balance": float(repair.outstanding_balance),
                "Status": repair.status.value,
                "Start Week": repair.start_week.value,
                "Start Week Date": repair.start_week_date.isoformat() if repair.start_week_date else "",
                "Confirmed At": repair.confirmed_at.isoformat() if repair.confirmed_at else "",
                "Closed At": repair.closed_at.isoformat() if repair.closed_at else "",
                "Created On": repair.created_on.isoformat() if repair.created_on else ""
            })
        
        # Generate export file
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
        
        logger.info(f"Exported {len(repairs)} repairs to {format} by user {current_user.id}")
        
        return StreamingResponse(
            file_buffer,
            media_type=media_types[format.lower()],
            headers={
                "Content-Disposition": f"attachment; filename=vehicle_repairs_export.{extensions[format.lower()]}"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to export repairs: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to export repairs: {str(e)}"
        ) from e


@router.get(
    "/installments/export/{format}",
    summary="Export Installments",
    description="""
    Export installments to Excel, PDF, CSV, or JSON format.
    
    Supports all the same filters as the list installments endpoint.
    Useful for reporting and reconciliation.
    """
)
def export_installments(
    format: str,
    installment_id: Optional[str] = Query(None),
    repair_id: Optional[str] = Query(None),
    driver_id: Optional[int] = Query(None),
    lease_id: Optional[int] = Query(None),
    vehicle_id: Optional[int] = Query(None),
    medallion_id: Optional[int] = Query(None),
    period_start: Optional[date] = Query(None),
    period_end: Optional[date] = Query(None),
    status: Optional[InstallmentStatus] = Query(None),
    posted_to_ledger: Optional[int] = Query(None, ge=0, le=1),
    sort_by: str = Query("week_start"),
    sort_order: str = Query("asc", pattern="^(asc|desc)$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db_with_current_user)
):
    """Export installments to file"""
    try:
        if format.lower() not in ['excel', 'pdf', 'csv', 'json']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid format. Supported: excel, pdf, csv, json"
            )
        
        service = RepairService(db)
        
        # Get all installments (no pagination for export)
        filters = {
            'installment_id': installment_id,
            'repair_id': repair_id,
            'driver_id': driver_id,
            'lease_id': lease_id,
            'vehicle_id': vehicle_id,
            'medallion_id': medallion_id,
            'period_start': period_start,
            'period_end': period_end,
            'status': status,
            'posted_to_ledger': posted_to_ledger,
            'page': 1,
            'page_size': 10000,
            'sort_by': sort_by,
            'sort_order': sort_order
        }
        
        installments, total = service.find_installments(filters)
        
        if not installments:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No installments found for export"
            )
        
        # Prepare export data
        export_data = []
        for inst in installments:
            export_data.append({
                "Installment ID": inst.installment_id,
                "Repair ID": inst.repair_id,
                "Installment Number": inst.installment_number,
                "Driver ID": inst.driver_id,
                "Lease ID": inst.lease_id,
                "Vehicle ID": inst.vehicle_id or "",
                "Medallion ID": inst.medallion_id or "",
                "Week Start": inst.week_start.isoformat() if inst.week_start else "",
                "Week End": inst.week_end.isoformat() if inst.week_end else "",
                "Due Date": inst.due_date.isoformat() if inst.due_date else "",
                "Installment Amount": float(inst.installment_amount),
                "Amount Paid": float(inst.amount_paid),
                "Prior Balance": float(inst.prior_balance),
                "Balance": float(inst.balance),
                "Status": inst.status.value,
                "Posted to Ledger": "Yes" if inst.posted_to_ledger == 1 else "No",
                "Ledger Posting ID": inst.ledger_posting_id or "",
                "Ledger Balance ID": inst.ledger_balance_id or "",
                "Posted At": inst.posted_at.isoformat() if inst.posted_at else "",
                "Created On": inst.created_on.isoformat() if inst.created_on else ""
            })
        
        # Generate export file
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
        
        logger.info(f"Exported {len(installments)} installments to {format} by user {current_user.id}")
        
        return StreamingResponse(
            file_buffer,
            media_type=media_types[format.lower()],
            headers={
                "Content-Disposition": f"attachment; filename=repair_installments_export.{extensions[format.lower()]}"
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