"""
app/tlc_violations/router.py

FastAPI router for TLC Violations endpoints
Provides RESTful API for violation management
"""

from datetime import date
from typing import List, Optional
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.users.utils import get_current_user
from app.users.models import User

from app.tlc_violations.service import TLCViolationService
from app.tlc_violations.schemas import *
from app.tlc_violations.exceptions import *
from app.tlc_violations.models import (
    ViolationType, ViolationStatus, Disposition, 
    Borough, PostingStatus, HearingLocation
)

from app.utils.logger import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/tlc-violations", tags=["TLC Violations"])


@router.post(
    "/",
    response_model=TLCViolationDetailResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create TLC Violation",
    description="Create a new TLC violation/summons record with optional auto-matching to driver via CURB"
)
def create_violation(
    request: CreateTLCViolationRequest,
    auto_match_curb: bool = Query(True, description="Auto-match driver via CURB data"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new TLC violation
    
    Process:
    - Validates all entities (medallion, driver, vehicle, lease)
    - Checks for duplicate summons numbers
    - Optionally attempts auto-matching via CURB trip data
    - Creates violation record
    
    Request Body:
    ```json
    {
      "summons_number": "FN0013186",
      "tlc_license_number": "5F69",
      "respondent_name": "TRUE BLUE CAB LLC",
      "occurrence_date": "2025-09-16",
      "occurrence_time": "17:00:00",
      "occurrence_place": "24-55 BQE West, Woodside, NY",
      "borough": "QUEENS",
      "rule_section": "58-30(B)",
      "violation_type": "LICENSING_DOCUMENTATION",
      "violation_description": "Failure to comply with notice to correct defect",
      "fine_amount": 50.00,
      "penalty_notes": "Suspension until compliance",
      "hearing_date": "2025-11-13",
      "hearing_time": "10:00:00",
      "hearing_location": "OATH_QUEENS",
      "medallion_id": 123,
      "driver_id": 456,
      "admin_notes": "Received via mail on 10/15/2025"
    }
    ```
    
    Returns: Created violation with full details
    """
    try:
        service = TLCViolationService(db)
        
        violation = service.create_violation(
            summons_number=request.summons_number,
            tlc_license_number=request.tlc_license_number,
            respondent_name=request.respondent_name,
            occurrence_date=request.occurrence_date,
            occurrence_time=request.occurrence_time,
            occurrence_place=request.occurrence_place,
            borough=request.borough,
            rule_section=request.rule_section,
            violation_type=request.violation_type,
            violation_description=request.violation_description,
            fine_amount=request.fine_amount,
            penalty_notes=request.penalty_notes,
            hearing_date=request.hearing_date,
            hearing_time=request.hearing_time,
            hearing_location=request.hearing_location,
            medallion_id=request.medallion_id,
            driver_id=request.driver_id,
            vehicle_id=request.vehicle_id,
            lease_id=request.lease_id,
            admin_notes=request.admin_notes,
            created_by_user_id=current_user.id,
            auto_match_curb=auto_match_curb
        )
        
        db.commit()
        
        # Return with details
        violation = service.get_violation_with_details(violation.id)
        return violation
        
    except TLCViolationAlreadyExistsError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    except (TLCViolationDriverNotFoundError, TLCViolationVehicleNotFoundError,
            TLCViolationMedallionNotFoundError, TLCViolationLeaseNotFoundError) as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except TLCViolationValidationError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating violation: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create violation: {str(e)}"
        )


@router.get(
    "/{violation_id}",
    response_model=TLCViolationDetailResponse,
    summary="Get Violation Details",
    description="Get detailed information about a specific violation including related entities"
)
def get_violation(
    violation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get violation by ID with all related details
    
    Returns:
    - Violation information
    - Driver details (if assigned)
    - Vehicle details (if assigned)
    - Medallion details
    - Lease details (if assigned)
    - All uploaded documents
    """
    try:
        service = TLCViolationService(db)
        violation = service.get_violation_with_details(violation_id)
        return violation
        
    except TLCViolationNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        logger.error(f"Error retrieving violation {violation_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve violation: {str(e)}"
        )


@router.patch(
    "/{violation_id}",
    response_model=TLCViolationResponse,
    summary="Update Violation",
    description="Update violation details (cannot update if posted to ledger or voided)"
)
def update_violation(
    violation_id: int,
    request: UpdateTLCViolationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update violation details
    
    Restrictions:
    - Cannot update if posted to ledger
    - Cannot update if voided
    - To correct posted violation, void and recreate
    
    Request Body:
    ```json
    {
      "fine_amount": 75.00,
      "hearing_date": "2025-11-20",
      "status": "HEARING_SCHEDULED",
      "admin_notes": "Hearing date rescheduled"
    }
    ```
    """
    try:
        service = TLCViolationService(db)
        
        violation = service.update_violation(
            violation_id=violation_id,
            respondent_name=request.respondent_name,
            occurrence_place=request.occurrence_place,
            borough=request.borough,
            rule_section=request.rule_section,
            violation_type=request.violation_type,
            violation_description=request.violation_description,
            fine_amount=request.fine_amount,
            penalty_notes=request.penalty_notes,
            hearing_date=request.hearing_date,
            hearing_time=request.hearing_time,
            hearing_location=request.hearing_location,
            status=request.status,
            admin_notes=request.admin_notes,
            updated_by_user_id=current_user.id
        )
        
        db.commit()
        return violation
        
    except TLCViolationNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except (TLCViolationAlreadyPostedError, TLCViolationAlreadyVoidedError) as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    except TLCViolationValidationError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating violation {violation_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update violation: {str(e)}"
        )


@router.patch(
    "/{violation_id}/disposition",
    response_model=TLCViolationResponse,
    summary="Update Disposition",
    description="Update hearing disposition/outcome"
)
def update_disposition(
    violation_id: int,
    request: UpdateDispositionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update hearing disposition
    
    Request Body:
    ```json
    {
      "disposition": "GUILTY",
      "disposition_date": "2025-11-13",
      "disposition_notes": "Fine upheld, no reduction"
    }
    ```
    
    Disposition values:
    - PENDING: Hearing not yet held
    - DISMISSED: Violation dismissed
    - GUILTY: Driver found guilty
    - PAID: Fine paid
    - REDUCED: Fine reduced
    - SUSPENDED: Penalty suspended
    """
    try:
        service = TLCViolationService(db)
        
        violation = service.update_disposition(
            violation_id=violation_id,
            disposition=request.disposition,
            disposition_date=request.disposition_date,
            disposition_notes=request.disposition_notes,
            updated_by_user_id=current_user.id
        )
        
        db.commit()
        return violation
        
    except TLCViolationNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except TLCViolationAlreadyVoidedError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating disposition for violation {violation_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update disposition: {str(e)}"
        )


@router.get(
    "/",
    response_model=TLCViolationListResponse,
    summary="List Violations",
    description="List violations with comprehensive filtering, sorting, and pagination"
)
def list_violations(
    summons_number: Optional[str] = Query(None, description="Filter by summons number"),
    violation_id: Optional[str] = Query(None, description="Filter by violation ID"),
    driver_id: Optional[int] = Query(None, description="Filter by driver"),
    vehicle_id: Optional[int] = Query(None, description="Filter by vehicle"),
    medallion_id: Optional[int] = Query(None, description="Filter by medallion"),
    lease_id: Optional[int] = Query(None, description="Filter by lease"),
    status: Optional[ViolationStatus] = Query(None, description="Filter by status"),
    violation_type: Optional[ViolationType] = Query(None, description="Filter by violation type"),
    disposition: Optional[Disposition] = Query(None, description="Filter by disposition"),
    posting_status: Optional[PostingStatus] = Query(None, description="Filter by posting status"),
    posted_to_ledger: Optional[bool] = Query(None, description="Filter by posted status"),
    is_voided: Optional[bool] = Query(False, description="Include voided violations"),
    borough: Optional[Borough] = Query(None, description="Filter by borough"),
    occurrence_date_from: Optional[date] = Query(None, description="Occurrence date from"),
    occurrence_date_to: Optional[date] = Query(None, description="Occurrence date to"),
    hearing_date_from: Optional[date] = Query(None, description="Hearing date from"),
    hearing_date_to: Optional[date] = Query(None, description="Hearing date to"),
    created_date_from: Optional[date] = Query(None, description="Created date from"),
    created_date_to: Optional[date] = Query(None, description="Created date to"),
    mapped_via_curb: Optional[bool] = Query(None, description="Filter by CURB mapping"),
    fine_amount_min: Optional[Decimal] = Query(None, description="Minimum fine amount"),
    fine_amount_max: Optional[Decimal] = Query(None, description="Maximum fine amount"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=100, description="Items per page"),
    sort_by: str = Query("occurrence_date", description="Sort field"),
    sort_order: str = Query("desc", regex="^(asc|desc)$", description="Sort order"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List violations with comprehensive filtering
    
    Example: GET /tlc-violations?driver_id=123&status=NEW&page=1&page_size=20
    
    Returns paginated list with total count and metadata
    """
    try:
        service = TLCViolationService(db)
        
        filters = {
            "summons_number": summons_number,
            "violation_id_str": violation_id,
            "driver_id": driver_id,
            "vehicle_id": vehicle_id,
            "medallion_id": medallion_id,
            "lease_id": lease_id,
            "status": status,
            "violation_type": violation_type,
            "disposition": disposition,
            "posting_status": posting_status,
            "posted_to_ledger": posted_to_ledger,
            "is_voided": is_voided,
            "borough": borough,
            "occurrence_date_from": occurrence_date_from,
            "occurrence_date_to": occurrence_date_to,
            "hearing_date_from": hearing_date_from,
            "hearing_date_to": hearing_date_to,
            "created_date_from": created_date_from,
            "created_date_to": created_date_to,
            "mapped_via_curb": mapped_via_curb,
            "fine_amount_min": fine_amount_min,
            "fine_amount_max": fine_amount_max
        }
        
        # Remove None values
        filters = {k: v for k, v in filters.items() if v is not None}
        
        violations, total = service.list_violations(
            filters=filters,
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
            "violations": violations
        }
        
    except Exception as e:
        logger.error(f"Error listing violations: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list violations: {str(e)}"
        )

@router.post(
    "/{violation_id}/post",
    response_model=TLCViolationResponse,
    summary="Post to Ledger",
    description="Post violation fine to driver ledger as TLC obligation"
)
def post_to_ledger(
    violation_id: int,
    request: PostToLedgerRequest = PostToLedgerRequest(),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Post violation fine to driver ledger
    
    Creates DEBIT posting in TLC category (Priority 5 in payment hierarchy)
    
    Requirements:
    - Violation must have driver assignment
    - Violation must have lease assignment
    - Violation must not be voided
    - Violation must not already be posted
    
    Request Body (optional):
    ```json
    {
      "notes": "Posted after hearing confirmation"
    }
    ```
    """
    try:
        service = TLCViolationService(db)
        
        violation = service.post_to_ledger(
            violation_id=violation_id,
            posted_by_user_id=current_user.id,
            notes=request.notes
        )
        
        db.commit()
        return violation
        
    except TLCViolationNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except (TLCViolationAlreadyPostedError, TLCViolationAlreadyVoidedError) as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    except TLCViolationPostingError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        db.rollback()
        logger.error(f"Error posting violation {violation_id} to ledger: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to post to ledger: {str(e)}"
        )


@router.post(
    "/post-batch",
    response_model=BatchPostResult,
    summary="Batch Post to Ledger",
    description="Post multiple violations to ledger in batch"
)
def batch_post_to_ledger(
    request: BatchPostRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Post multiple violations to ledger in batch
    
    Request Body:
    ```json
    {
      "violation_ids": [123, 456, 789]
    }
    ```
    
    Returns:
    - Total requested
    - Successful count
    - Failed count
    - Success IDs list
    - Failed IDs list
    - Error details for failures
    """
    try:
        service = TLCViolationService(db)
        
        results = service.batch_post_to_ledger(
            violation_ids=request.violation_ids,
            posted_by_user_id=current_user.id
        )
        
        db.commit()
        return results
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error in batch posting: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Batch posting failed: {str(e)}"
        )


@router.post(
    "/{violation_id}/remap",
    response_model=TLCViolationResponse,
    summary="Remap Violation",
    description="Remap violation to different driver (voids and reposts if already posted)"
)
def remap_violation(
    violation_id: int,
    request: RemapViolationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Remap violation to different driver
    
    If already posted to ledger:
    - Creates reversal posting for original driver
    - Updates violation assignment
    - Requires reposting to new driver's ledger
    
    Request Body:
    ```json
    {
      "driver_id": 789,
      "lease_id": 456,
      "reason": "Driver verification confirmed John Doe was driving at time of violation"
    }
    ```
    """
    try:
        service = TLCViolationService(db)
        
        violation = service.remap_violation(
            violation_id=violation_id,
            new_driver_id=request.driver_id,
            new_lease_id=request.lease_id,
            reason=request.reason,
            updated_by_user_id=current_user.id
        )
        
        db.commit()
        return violation
        
    except TLCViolationNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except TLCViolationDriverNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except TLCViolationAlreadyVoidedError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    except TLCViolationRemapError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        db.rollback()
        logger.error(f"Error remapping violation {violation_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to remap violation: {str(e)}"
        )


@router.post(
    "/{violation_id}/void",
    response_model=TLCViolationResponse,
    summary="Void Violation",
    description="Void a violation (creates reversal posting if already posted)"
)
def void_violation(
    violation_id: int,
    request: VoidViolationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Void a violation
    
    If already posted to ledger, creates reversal posting
    Voided violations cannot be modified or reposted
    
    Request Body:
    ```json
    {
      "reason": "Duplicate entry - violation already exists as TLC-2025-000100"
    }
    ```
    """
    try:
        service = TLCViolationService(db)
        
        violation = service.void_violation(
            violation_id=violation_id,
            reason=request.reason,
            voided_by_user_id=current_user.id
        )
        
        db.commit()
        return violation
        
    except TLCViolationNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except TLCViolationAlreadyVoidedError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    except TLCViolationVoidError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        db.rollback()
        logger.error(f"Error voiding violation {violation_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to void violation: {str(e)}"
        )


@router.get(
    "/unposted/find",
    response_model=UnpostedViolationsResponse,
    summary="Find Unposted Violations",
    description="Get all violations not yet posted to ledger"
)
def find_unposted_violations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Find all unposted violations
    
    Returns violations that:
    - Have not been posted to ledger
    - Are not voided
    - Have driver assignment
    
    Use for batch posting workflows
    """
    try:
        service = TLCViolationService(db)
        violations = service.find_unposted_violations()
        
        return {
            "total": len(violations),
            "violations": violations
        }
        
    except Exception as e:
        logger.error(f"Error finding unposted violations: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to find unposted violations: {str(e)}"
        )


@router.get(
    "/unmapped/find",
    response_model=UnpostedViolationsResponse,
    summary="Find Unmapped Violations",
    description="Get all violations without driver assignment"
)
def find_unmapped_violations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Find violations without driver assignment
    
    Returns violations that:
    - Do not have driver assignment
    - Are not voided
    
    Requires manual driver assignment or CURB matching retry
    """
    try:
        service = TLCViolationService(db)
        violations = service.find_unmapped_violations()
        
        return {
            "total": len(violations),
            "violations": violations
        }
        
    except Exception as e:
        logger.error(f"Error finding unmapped violations: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to find unmapped violations: {str(e)}"
        )


@router.get(
    "/hearings/upcoming",
    response_model=UpcomingHearingsResponse,
    summary="Upcoming Hearings",
    description="Get violations with upcoming hearings"
)
def get_upcoming_hearings(
    days_ahead: int = Query(30, ge=1, le=365, description="Days ahead to look"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get violations with upcoming hearings
    
    Parameters:
    - days_ahead: Number of days to look ahead (default: 30)
    
    Returns violations with hearing dates in next N days
    """
    try:
        service = TLCViolationService(db)
        violations = service.find_upcoming_hearings(days_ahead)
        
        return {
            "total": len(violations),
            "violations": violations
        }
        
    except Exception as e:
        logger.error(f"Error finding upcoming hearings: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to find upcoming hearings: {str(e)}"
        )


@router.get(
    "/hearings/overdue",
    response_model=UpcomingHearingsResponse,
    summary="Overdue Hearings",
    description="Get violations with overdue hearings (past date, no disposition)"
)
def get_overdue_hearings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get violations with overdue hearings
    
    Returns violations where:
    - Hearing date is in the past
    - Disposition is still PENDING
    - Not voided
    
    Requires disposition update
    """
    try:
        service = TLCViolationService(db)
        violations = service.find_overdue_hearings()
        
        return {
            "total": len(violations),
            "violations": violations
        }
        
    except Exception as e:
        logger.error(f"Error finding overdue hearings: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to find overdue hearings: {str(e)}"
        )


@router.get(
    "/statistics",
    response_model=TLCViolationStatistics,
    summary="Get Statistics",
    description="Get comprehensive violation statistics and analytics"
)
def get_statistics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get violation statistics
    
    Returns:
    - Total violations count
    - Breakdown by status
    - Breakdown by violation type
    - Breakdown by disposition
    - Breakdown by posting status
    - Financial totals (total, posted, pending)
    - Upcoming hearings count
    - Overdue hearings count
    - Violations by borough
    """
    try:
        service = TLCViolationService(db)
        stats = service.get_statistics()
        return stats
        
    except Exception as e:
        logger.error(f"Error getting statistics: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get statistics: {str(e)}"
        )

from fastapi.responses import StreamingResponse
from app.utils.exporter_utils import ExporterFactory


@router.post(
    "/{violation_id}/documents/upload",
    response_model=TLCViolationDocumentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload Document",
    description="Upload summons, hearing result, or payment proof document"
)
async def upload_document(
    violation_id: int,
    file: UploadFile = File(..., description="Document file (PDF, JPG, PNG)"),
    document_type: str = Query(..., description="Document type (SUMMONS, HEARING_RESULT, PAYMENT_PROOF, OTHER)"),
    description: Optional[str] = Query(None, description="Document description"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Upload a document for violation
    
    Allowed file types:
    - PDF (application/pdf)
    - JPG/JPEG (image/jpeg)
    - PNG (image/png)
    
    Maximum file size: 5MB
    
    Document types:
    - SUMMONS: Original summons/notice
    - HEARING_RESULT: Hearing outcome documentation
    - PAYMENT_PROOF: Payment receipt/confirmation
    - OTHER: Other supporting documents
    """
    try:
        service = TLCViolationService(db)
        
        # Validate violation exists
        violation = service.get_violation(violation_id)
        
        # Read file
        contents = await file.read()
        file_size = len(contents)
        
        # Here you would upload to S3 or file storage
        # For now, we'll use a placeholder path
        file_path = f"tlc_violations/{violation.violation_id}/{file.filename}"
        
        # In production, implement actual S3 upload:
        # from app.utils.s3_utils import upload_file
        # file_path = upload_file(contents, file_path, file.content_type)
        
        document = service.upload_document(
            violation_id=violation.id,
            file_name=file.filename,
            file_path=file_path,
            file_size=file_size,
            file_type=file.content_type,
            document_type=document_type,
            description=description,
            uploaded_by_user_id=current_user.id
        )
        
        db.commit()
        return document
        
    except TLCViolationNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except (TLCViolationDocumentSizeError, TLCViolationDocumentTypeError) as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        db.rollback()
        logger.error(f"Error uploading document for violation {violation_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload document: {str(e)}"
        )


@router.get(
    "/{violation_id}/documents",
    response_model=List[TLCViolationDocumentResponse],
    summary="Get Documents",
    description="Get all documents for a violation"
)
def get_documents(
    violation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all documents for a violation
    
    Returns list of all uploaded documents with metadata
    """
    try:
        service = TLCViolationService(db)
        documents = service.get_documents(violation_id)
        return documents
        
    except TLCViolationNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        logger.error(f"Error retrieving documents for violation {violation_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve documents: {str(e)}"
        )


@router.patch(
    "/documents/{document_id}/verify",
    response_model=TLCViolationDocumentResponse,
    summary="Verify Document",
    description="Mark document as verified"
)
def verify_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Mark document as verified
    
    Used after manual review of uploaded documents
    """
    try:
        service = TLCViolationService(db)
        
        document = service.verify_document(
            document_id=document_id,
            verified_by_user_id=current_user.id
        )
        
        db.commit()
        return document
        
    except TLCViolationDocumentNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        db.rollback()
        logger.error(f"Error verifying document {document_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to verify document: {str(e)}"
        )


@router.get(
    "/export/{format}",
    summary="Export Violations",
    description="Export violations to Excel, PDF, CSV, or JSON format with all filters applied"
)
def export_violations(
    format: str ,
    summons_number: Optional[str] = Query(None),
    violation_id: Optional[str] = Query(None),
    driver_id: Optional[int] = Query(None),
    vehicle_id: Optional[int] = Query(None),
    medallion_id: Optional[int] = Query(None),
    lease_id: Optional[int] = Query(None),
    status: Optional[ViolationStatus] = Query(None),
    violation_type: Optional[ViolationType] = Query(None),
    disposition: Optional[Disposition] = Query(None),
    posting_status: Optional[PostingStatus] = Query(None),
    posted_to_ledger: Optional[bool] = Query(None),
    is_voided: Optional[bool] = Query(False),
    borough: Optional[Borough] = Query(None),
    occurrence_date_from: Optional[date] = Query(None),
    occurrence_date_to: Optional[date] = Query(None),
    hearing_date_from: Optional[date] = Query(None),
    hearing_date_to: Optional[date] = Query(None),
    created_date_from: Optional[date] = Query(None),
    created_date_to: Optional[date] = Query(None),
    mapped_via_curb: Optional[bool] = Query(None),
    fine_amount_min: Optional[Decimal] = Query(None),
    fine_amount_max: Optional[Decimal] = Query(None),
    sort_by: str = Query("occurrence_date"),
    sort_order: str = Query("desc", regex="^(asc|desc)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Export violations with all applied filters
    
    Formats:
    - excel: Excel spreadsheet (.xlsx)
    - pdf: PDF document
    - csv: Comma-separated values
    - json: JSON array
    
    Example: GET /tlc-violations/export/excel?driver_id=123&status=NEW
    
    All list endpoint filters are supported
    """
    try:
        service = TLCViolationService(db)
        
        filters = {
            "summons_number": summons_number,
            "violation_id_str": violation_id,
            "driver_id": driver_id,
            "vehicle_id": vehicle_id,
            "medallion_id": medallion_id,
            "lease_id": lease_id,
            "status": status,
            "violation_type": violation_type,
            "disposition": disposition,
            "posting_status": posting_status,
            "posted_to_ledger": posted_to_ledger,
            "is_voided": is_voided,
            "borough": borough,
            "occurrence_date_from": occurrence_date_from,
            "occurrence_date_to": occurrence_date_to,
            "hearing_date_from": hearing_date_from,
            "hearing_date_to": hearing_date_to,
            "created_date_from": created_date_from,
            "created_date_to": created_date_to,
            "mapped_via_curb": mapped_via_curb,
            "fine_amount_min": fine_amount_min,
            "fine_amount_max": fine_amount_max
        }
        
        # Remove None values
        filters = {k: v for k, v in filters.items() if v is not None}
        
        # Get all matching violations (no pagination for export)
        violations, total = service.list_violations(
            filters=filters,
            page=1,
            page_size=10000,  # Large page size for export
            sort_by=sort_by,
            sort_order=sort_order
        )
        
        if not violations:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No violations found matching the criteria"
            )
        
        # Convert to dict for export
        export_data = []
        for v in violations:
            export_data.append({
                "Violation ID": v.violation_id,
                "Summons Number": v.summons_number,
                "TLC License": v.tlc_license_number,
                "Respondent": v.respondent_name,
                "Occurrence Date": v.occurrence_date.strftime("%Y-%m-%d"),
                "Occurrence Time": v.occurrence_time.strftime("%H:%M:%S"),
                "Borough": v.borough.value,
                "Rule/Section": v.rule_section,
                "Violation Type": v.violation_type.value,
                "Description": v.violation_description,
                "Fine Amount": float(v.fine_amount),
                "Status": v.status.value,
                "Disposition": v.disposition.value,
                "Hearing Date": v.hearing_date.strftime("%Y-%m-%d") if v.hearing_date else "",
                "Posted to Ledger": "Yes" if v.posted_to_ledger else "No",
                "Posting Status": v.posting_status.value,
                "Driver ID": v.driver_id or "",
                "Vehicle ID": v.vehicle_id or "",
                "Medallion ID": v.medallion_id,
                "Lease ID": v.lease_id or "",
                "Created On": v.created_on.strftime("%Y-%m-%d %H:%M:%S")
            })
        
        # Use exporter factory
        exporter = ExporterFactory.get_exporter(format, export_data)
        output = exporter.export()
        
        # Set appropriate content type and filename
        content_types = {
            "excel": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "pdf": "application/pdf",
            "csv": "text/csv",
            "json": "application/json"
        }
        
        extensions = {
            "excel": "xlsx",
            "pdf": "pdf",
            "csv": "csv",
            "json": "json"
        }
        
        filename = f"tlc_violations_{datetime.now().strftime('%Y%m%d_%H%M%S')}.{extensions[format]}"
        
        return StreamingResponse(
            output,
            media_type=content_types[format],
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error exporting violations: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to export violations: {str(e)}"
        )