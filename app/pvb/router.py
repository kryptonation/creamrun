"""
app/pvb/router.py

FastAPI router for PVB endpoints
"""

from datetime import date, datetime
from typing import Optional, List

from fastapi import (
    APIRouter, Depends, HTTPException, Query, UploadFile, 
    File, status
)
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.users.models import User
from app.core.dependencies import get_current_user

from app.pvb.service import PVBImportService
from app.pvb.repository import (
    PVBViolationRepository, PVBImportHistoryRepository
)
from app.pvb.models import MappingMethod, PostingStatus, ImportStatus
from app.pvb.schemas import (
    UploadPVBCSVResponse,
    CreateManualViolationRequest,
    RemapViolationRequest, RemapViolationResponse,
    BulkPostToLedgerRequest,
    PVBViolationResponse, PVBViolationDetailResponse,
    PVBImportHistoryResponse, PaginatedPVBResponse,
    PVBStatisticsResponse
)
from app.utils.logger import get_logger
from app.utils.exporter.excel_exporter import ExcelExporter
from app.utils.exporter.pdf_exporter import PDFExporter

logger = get_logger(__name__)

router = APIRouter(prefix="/pvb", tags=["PVB Violations"])


# === Import Endpoints ===

@router.post("/upload", response_model=UploadPVBCSVResponse)
async def upload_pvb_csv(
    file: UploadFile = File(..., description="PVB CSV file from NYC DOF"),
    perform_matching: bool = Query(True, description="Auto-match with CURB trips"),
    post_to_ledger: bool = Query(True, description="Post matched violations to ledger"),
    auto_match_threshold: float = Query(0.90, ge=0.0, le=1.0, 
                                       description="Minimum confidence for auto-matching"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Upload and import PVB CSV file from NYC Department of Finance
    
    Process:
    1. Parse CSV file
    2. Import violations
    3. Map to vehicles by plate number
    4. Match to drivers via CURB trip correlation (±30 min window)
    5. Post matched violations to ledger
    6. Track import history
    
    CSV Format: NYC DOF weekly PVB report
    Expected columns: Plate, Summons Number, Issue Date, Violation Time,
                     Fine Amount, Penalty Amount, Amount Due, etc.
    
    Returns:
    - Import statistics
    - Batch ID for tracking
    - List of errors if any
    """
    try:
        # Read file content
        csv_content = await file.read()
        csv_text = csv_content.decode('utf-8')
        
        service = PVBImportService(db)
        
        import_history, errors = service.import_csv_file(
            csv_content=csv_text,
            file_name=file.filename,
            perform_matching=perform_matching,
            post_to_ledger=post_to_ledger,
            auto_match_threshold=auto_match_threshold,
            triggered_by="API",
            triggered_by_user_id=current_user.id
        )
        
        return UploadPVBCSVResponse(
            success=import_history.status.value in ['COMPLETED', 'PARTIAL'],
            batch_id=import_history.batch_id,
            message=f"Import completed with status: {import_history.status.value}",
            records_in_file=import_history.total_records_in_file,
            records_imported=import_history.records_imported,
            records_skipped=import_history.records_skipped,
            records_failed=import_history.records_failed,
            records_mapped=import_history.records_mapped,
            records_posted=import_history.records_posted,
            duration_seconds=import_history.duration_seconds,
            errors=errors if errors else None
        )
        
    except Exception as e:
        logger.error(f"PVB CSV upload failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"CSV upload failed: {str(e)}"
        ) from e


@router.post("/violations/manual", response_model=PVBViolationDetailResponse,
            status_code=status.HTTP_201_CREATED)
def create_manual_violation(
    request: CreateManualViolationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Manually create a PVB violation entry
    
    Use case: Out-of-state violations received by mail/email that are not
    in the NYC DOF CSV files (e.g., NJ, CT, PA violations)
    
    Wireframe: Manual PVB Entry Form
    - Summons Number (required)
    - Plate Number (required)
    - State (dropdown: NY, NJ, CT, PA, OTHER)
    - Violation Date & Time
    - Violation Description
    - Fine Amount (required)
    - Penalty Amount (optional)
    - Interest Amount (optional)
    - Location (Street Name, County)
    - Driver Assignment (optional - can be assigned later)
    - Lease Assignment (optional - can be assigned later)
    - Notes
    
    Process:
    1. Create violation record
    2. If driver/lease provided, assign immediately
    3. Otherwise, attempt to find vehicle by plate and match to active lease
    4. Post to ledger if fully mapped
    """
    try:
        service = PVBImportService(db)
        
        violation = service.create_manual_violation(
            summons_number=request.summons_number,
            plate_number=request.plate_number,
            state=request.state,
            violation_date=request.violation_date,
            violation_description=request.violation_description,
            fine_amount=request.fine_amount,
            penalty_amount=request.penalty_amount,
            interest_amount=request.interest_amount,
            street_name=request.street_name,
            county=request.county,
            driver_id=request.driver_id,
            lease_id=request.lease_id,
            notes=request.notes,
            created_by_user_id=current_user.id,
            post_to_ledger=request.post_to_ledger
        )
        
        return PVBViolationDetailResponse.model_validate(violation)
        
    except Exception as e:
        logger.error(f"Failed to create manual PVB violation: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create violation: {str(e)}"
        ) from e


@router.get("/import/history", response_model=List[PVBImportHistoryResponse])
def get_import_history(
    limit: int = Query(20, ge=1, le=100, description="Number of records to return"),
    status: Optional[str] = Query(None, description="Filter by status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get PVB import history
    
    Shows recent import batches with statistics
    """
    try:
        repo = PVBImportHistoryRepository(db)
        
        import_status = None
        if status:
            try:
                import_status = ImportStatus[status.upper()]
            except KeyError as ke:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid status: {status}"
                ) from ke
        
        history = repo.get_recent_imports(limit=limit, status=import_status)
        
        return [PVBImportHistoryResponse.model_validate(h) for h in history]
        
    except Exception as e:
        logger.error(f"Failed to fetch import history: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch import history: {str(e)}"
        ) from e


@router.get("/import/history/{batch_id}", response_model=PVBImportHistoryResponse)
def get_import_batch_details(
    batch_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get details of specific import batch"""
    try:
        repo = PVBImportHistoryRepository(db)
        history = repo.get_by_batch_id_or_raise(batch_id)
        
        return PVBImportHistoryResponse.model_validate(history)
        
    except Exception as e:
        logger.error(f"Failed to fetch batch details: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Batch not found: {batch_id}"
        ) from e


# === Violation Query Endpoints ===

@router.get("/violations", response_model=PaginatedPVBResponse)
def get_violations(
    date_from: Optional[date] = Query(None, description="Violation date from"),
    date_to: Optional[date] = Query(None, description="Violation date to"),
    plate_number: Optional[str] = Query(None, description="Vehicle plate number"),
    driver_id: Optional[int] = Query(None, description="Driver ID"),
    vehicle_id: Optional[int] = Query(None, description="Vehicle ID"),
    lease_id: Optional[int] = Query(None, description="Lease ID"),
    mapping_method: Optional[str] = Query(None, description="Mapping method"),
    posting_status: Optional[str] = Query(None, description="Posting status"),
    state: Optional[str] = Query(None, description="State"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=200, description="Page size"),
    sort_by: str = Query("violation_date", description="Sort field"),
    sort_order: str = Query("desc", description="Sort order (asc/desc)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List PVB violations with filters and pagination
    
    Supports filtering by:
    - Date range
    - Plate number
    - Driver, Vehicle, Lease
    - Mapping method (AUTO_CURB_MATCH, MANUAL_ASSIGNMENT, UNMAPPED)
    - Posting status (NOT_POSTED, POSTED, FAILED)
    - State
    
    Supports sorting by any field
    """
    try:
        repo = PVBViolationRepository(db)
        
        # Parse enum filters
        mapping_method_enum = None
        if mapping_method:
            try:
                mapping_method_enum = MappingMethod[mapping_method.upper()]
            except KeyError as ke:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid mapping_method: {mapping_method}"
                ) from ke

        posting_status_enum = None
        if posting_status:
            try:
                posting_status_enum = PostingStatus[posting_status.upper()]
            except KeyError as ke:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid posting_status: {posting_status}"
                ) from ke
        
        # Calculate offset
        offset = (page - 1) * page_size
        
        violations, total = repo.get_violations_by_filters(
            date_from=date_from,
            date_to=date_to,
            plate_number=plate_number,
            driver_id=driver_id,
            vehicle_id=vehicle_id,
            lease_id=lease_id,
            mapping_method=mapping_method_enum,
            posting_status=posting_status_enum,
            state=state,
            limit=page_size,
            offset=offset,
            sort_by=sort_by,
            sort_order=sort_order
        )
        
        total_pages = (total + page_size - 1) // page_size
        
        return PaginatedPVBResponse(
            violations=[PVBViolationResponse.model_validate(v) for v in violations],
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch violations: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch violations: {str(e)}"
        ) from e


@router.get("/violations/{violation_id}", response_model=PVBViolationDetailResponse)
def get_violation_details(
    violation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get detailed information for specific violation"""
    try:
        repo = PVBViolationRepository(db)
        violation = repo.get_by_id_or_raise(violation_id)
        
        return PVBViolationDetailResponse.model_validate(violation)
        
    except Exception as e:
        logger.error(f"Failed to fetch violation details: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Violation not found: {violation_id}"
        ) from e


@router.get("/violations/unmapped", response_model=List[PVBViolationResponse])
def get_unmapped_violations(
    limit: int = Query(100, ge=1, le=500, description="Number of records to return"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get violations that haven't been mapped to drivers
    
    These violations require manual review and assignment
    """
    try:
        repo = PVBViolationRepository(db)
        violations, total = repo.get_unmapped_violations(limit=limit)
        
        return [PVBViolationResponse.model_validate(v) for v in violations]
        
    except Exception as e:
        logger.error(f"Failed to fetch unmapped violations: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch unmapped violations: {str(e)}"
        ) from e


@router.get("/violations/unposted", response_model=List[PVBViolationResponse])
def get_unposted_violations(
    limit: int = Query(100, ge=1, le=500, description="Number of records to return"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get violations that have been mapped but not posted to ledger
    
    These violations are ready to be posted but haven't been processed yet
    """
    try:
        repo = PVBViolationRepository(db)
        violations, total = repo.get_unposted_violations(limit=limit)
        
        return [PVBViolationResponse.model_validate(v) for v in violations]
        
    except Exception as e:
        logger.error(f"Failed to fetch unposted violations: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch unposted violations: {str(e)}"
        ) from e


@router.get("/violations/statistics", response_model=PVBStatisticsResponse)
def get_statistics(
    date_from: Optional[date] = Query(None, description="Date from"),
    date_to: Optional[date] = Query(None, description="Date to"),
    driver_id: Optional[int] = Query(None, description="Filter by driver"),
    lease_id: Optional[int] = Query(None, description="Filter by lease"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get aggregated statistics for PVB violations
    
    Returns:
    - Total violations and amount due
    - Mapped vs unmapped counts
    - Posted vs unposted counts
    - Breakdown by state and county
    """
    try:
        repo = PVBViolationRepository(db)
        stats = repo.get_statistics(
            date_from=date_from,
            date_to=date_to,
            driver_id=driver_id,
            lease_id=lease_id
        )
        
        return PVBStatisticsResponse(**stats)
        
    except Exception as e:
        logger.error(f"Failed to fetch statistics: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch statistics: {str(e)}"
        ) from e


# === Manual Operations ===

@router.post("/violations/{violation_id}/remap", response_model=RemapViolationResponse)
def remap_violation(
    violation_id: int,
    request: RemapViolationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Manually remap violation to different driver/lease
    
    Use cases:
    - Violation auto-matched to wrong driver
    - Additional driver used vehicle during violation
    - Lease changed hands around violation time
    
    Process:
    1. Validates new driver and lease
    2. Voids existing ledger postings if trip was already posted
    3. Updates violation associations
    4. Creates new ledger postings with correct associations
    
    Requires:
    - Reason for manual remapping (audit trail)
    """
    try:
        service = PVBImportService(db)
        
        violation = service.remap_violation(
            violation_id=violation_id,
            driver_id=request.driver_id,
            lease_id=request.lease_id,
            reason=request.reason,
            remapped_by_user_id=current_user.id,
            post_to_ledger=request.post_to_ledger
        )
        
        return RemapViolationResponse(
            success=True,
            message="Violation remapped successfully",
            violation=PVBViolationDetailResponse.model_validate(violation)
        )
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        ) from e
    except Exception as e:
        logger.error(f"Failed to remap violation: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to remap violation: {str(e)}"
        ) from e


@router.post("/violations/bulk-post")
def bulk_post_to_ledger(
    request: BulkPostToLedgerRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Bulk post violations to ledger
    
    Posts multiple mapped violations to ledger in a single operation
    """
    try:
        service = PVBImportService(db)
        repo = service.violation_repo
        
        posted_count = 0
        failed_count = 0
        errors = []
        
        for violation_id in request.violation_ids:
            try:
                violation = repo.get_by_id(violation_id)
                if not violation:
                    errors.append(f"Violation {violation_id} not found")
                    failed_count += 1
                    continue
                
                if violation.posting_status == PostingStatus.POSTED:
                    continue  # Skip already posted
                
                if not violation.driver_id or not violation.lease_id:
                    errors.append(f"Violation {violation_id} not mapped to driver/lease")
                    failed_count += 1
                    continue
                
                service._post_violation_to_ledger(violation)
                posted_count += 1
                
            except Exception as e:
                failed_count += 1
                errors.append(f"Failed to post {violation_id}: {str(e)}")
        
        db.commit()
        
        return {
            "success": True,
            "posted_count": posted_count,
            "failed_count": failed_count,
            "errors": errors if errors else None
        }
        
    except Exception as e:
        db.rollback()
        logger.error(f"Bulk posting failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Bulk posting failed: {str(e)}"
        ) from e


# === Export Endpoint ===

@router.get("/violations/export/{format}")
async def export_violations(
    format: str,
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    driver_id: Optional[int] = Query(None),
    posting_status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Export violations to Excel or PDF
    
    Formats: excel, pdf
    """
    try:
        if format not in ['excel', 'pdf']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Format must be 'excel' or 'pdf'"
            )
        
        repo = PVBViolationRepository(db)
        
        # Parse posting status
        posting_status_enum = None
        if posting_status:
            try:
                posting_status_enum = PostingStatus[posting_status.upper()]
            except KeyError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid posting_status: {posting_status}"
                )
        
        # Fetch violations
        violations, total = repo.get_violations_by_filters(
            date_from=date_from,
            date_to=date_to,
            driver_id=driver_id,
            posting_status=posting_status_enum,
            limit=10000,  # Large limit for export
            offset=0,
            sort_by='violation_date',
            sort_order='desc'
        )
        
        if not violations:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No violations found for export"
            )
        
        # Prepare export data
        export_data = []
        for v in violations:
            export_data.append({
                "Summons Number": v.summons_number,
                "Plate Number": v.plate_number,
                "State": v.state.value,
                "Violation Date": v.violation_date.strftime('%Y-%m-%d %H:%M'),
                "Description": v.violation_description or "",
                "County": v.county or "",
                "Street": v.street_name or "",
                "Fine Amount": float(v.fine_amount),
                "Penalty Amount": float(v.penalty_amount),
                "Interest Amount": float(v.interest_amount),
                "Amount Due": float(v.amount_due),
                "Driver ID": v.driver_id or "",
                "Lease ID": v.lease_id or "",
                "TLC License": v.hack_license_number or "",
                "Mapping Method": v.mapping_method.value,
                "Mapping Confidence": float(v.mapping_confidence) if v.mapping_confidence else "",
                "Posting Status": v.posting_status.value,
                "Ledger Balance ID": v.ledger_balance_id or "",
                "Payment Period Start": v.payment_period_start.isoformat() if v.payment_period_start else "",
                "Payment Period End": v.payment_period_end.isoformat() if v.payment_period_end else "",
                "Import Batch": v.import_batch_id or ""
            })
        
        # Generate export file
        if format == "excel":
            exporter = ExcelExporter(export_data)
            file = exporter.export()
            media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            filename = f"pvb_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
        else:  # pdf
            exporter = PDFExporter(export_data, title="PVB Violations Report")
            file = exporter.export()
            media_type = "application/pdf"
            filename = f"pvb_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
        
        return StreamingResponse(
            file,
            media_type=media_type,
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error exporting violations: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Export failed: {str(e)}"
        ) from e