"""
app/pvb/router.py

FastAPI router for PVB endpoints
"""

from datetime import datetime
from typing import Optional, List
from decimal import Decimal

from fastapi import (
    APIRouter, Depends, HTTPException, Query, UploadFile,
    File, Form, status
)
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.users.models import User
from app.core.dependencies import get_current_user

from app.pvb.services import PVBImportService
from app.pvb.repository import (
    PVBViolationRepository, PVBImportHistoryRepository,
    PVBSummonsRepository
)
from app.pvb.models import MappingMethod, PostingStatus, ViolationStatus
from app.pvb.schemas import (
    UploadPVBCSVRequest, UploadPVBCSVResponse,
    CreatePVBViolationRequest, CreatePVBViolationResponse,
    RemapPVBRequest, RemapPVBResponse,
    UploadSummonsRequest, UploadSummonsResponse,
    PVBViolationResponse, PVBViolationDetailResponse,
    PVBImportHistoryResponse, ImportBatchDetailResponse,
    PaginatedPVBResponse, PaginatedImportHistoryResponse,
    PVBStatisticsResponse, VehicleInfo, DriverInfo, LeaseInfo, SummonsInfo
)
from app.pvb.exceptions import PVBNotFoundException, PVBDuplicateError
from app.pvb.models import PVBSummons

from app.vehicles.models import Vehicle
from app.drivers.models import Driver
from app.leases.models import Lease
from app.uploads.services import upload_service
from app.utils.logger import get_logger
from app.utils.exporter_utils import ExporterFactory

logger = get_logger(__name__)

router = APIRouter(prefix="/pvb", tags=["PVB Import"])


# === Import Endpoints ===

@router.post("/upload", response_model=UploadPVBCSVResponse)
async def upload_pvb_csv(
    file: UploadFile = File(..., description="PVB CSV file from DOF"),
    perform_matching: bool = Query(True, description="Auto-match with CURB trips"),
    post_to_ledger: bool = Query(True, description="Post matched violations to ledger"),
    auto_match_threshold: float = Query(0.90, ge=0.0, le=1.0,
                                       description="Minimum confidence for auto-matching"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Upload and import PVB CSV file from Department of Finance
    
    Process:
    1. Parse CSV file
    2. Import violation records
    3. Map to vehicles by plate number
    4. Match to drivers via CURB trip correlation (±30 min window)
    5. Post matched violations to ledger
    6. Return import statistics
    
    The CSV should follow DOF format with columns:
    PLATE, STATE, TYPE, SUMMONS, ISSUE DATE, ISSUE TIME, FINE, PENALTY, etc.
    """
    try:
        # Validate file type
        if not file.filename.endswith('.csv'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File must be a CSV"
            )
        
        # Read file content
        content = await file.read()
        csv_content = content.decode('utf-8')
        
        # Import violations
        service = PVBImportService(db)
        import_history, errors = service.import_csv_file(
            csv_content=csv_content,
            file_name=file.filename,
            perform_matching=perform_matching,
            post_to_ledger=post_to_ledger,
            auto_match_threshold=Decimal(str(auto_match_threshold)),
            triggered_by="API",
            triggered_by_user_id=current_user.id
        )
        
        return UploadPVBCSVResponse(
            success=import_history.status.value in ['COMPLETED', 'PARTIAL'],
            batch_id=import_history.batch_id,
            message=f"Import completed with status: {import_history.status.value}",
            total_records=import_history.total_records_in_file,
            total_imported=import_history.total_imported,
            total_duplicates=import_history.total_duplicates,
            total_failed=import_history.total_failed,
            auto_matched_count=import_history.auto_matched_count,
            plate_only_count=import_history.plate_only_count,
            unmapped_count=import_history.unmapped_count,
            posted_to_ledger_count=import_history.posted_to_ledger_count,
            pending_posting_count=import_history.pending_posting_count,
            duration_seconds=import_history.duration_seconds,
            errors=errors[:50] if errors else None  # Return first 50 errors
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Import failed: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Import failed: {str(e)}"
        ) from e


@router.post("/create", response_model=CreatePVBViolationResponse)
def create_pvb_violation(
    request: CreatePVBViolationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create PVB violation manually (for violations from mail, other states, etc.)
    
    This endpoint is used when violations arrive via regular mail or email
    and need to be entered manually into the system.
    
    The system will:
    1. Create the violation record
    2. Attempt to match to vehicle by plate
    3. Attempt to match to driver via CURB trips
    4. Post to ledger if successfully matched
    """
    try:
        service = PVBImportService(db)
        
        violation = service.create_manual_violation(
            data=request.model_dump(),
            created_by_user_id=current_user.id,
            perform_matching=request.perform_matching,
            post_to_ledger=request.post_to_ledger
        )
        
        mapped_to = None
        if violation.driver_id or violation.vehicle_id or violation.lease_id:
            mapped_to = {
                "driver_id": violation.driver_id,
                "vehicle_id": violation.vehicle_id,
                "lease_id": violation.lease_id,
                "medallion_id": violation.medallion_id
            }
        
        return CreatePVBViolationResponse(
            violation_id=violation.id,
            summons_number=violation.summons_number,
            status="created",
            mapping_status=violation.mapping_method.value,
            mapped_to=mapped_to,
            posted_to_ledger=violation.posted_to_ledger,
            ledger_balance_id=violation.ledger_balance_id,
            message="Violation created successfully"
        )
        
    except PVBDuplicateError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e)
        ) from e
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        ) from e
    except Exception as e:
        logger.error(f"Failed to create violation: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create violation: {str(e)}"
        ) from e


# === Query Endpoints ===

@router.get("/violations", response_model=PaginatedPVBResponse)
def get_violations(
    date_from: Optional[datetime] = Query(None, description="Filter by issue date (from)"),
    date_to: Optional[datetime] = Query(None, description="Filter by issue date (to)"),
    plate_number: Optional[str] = Query(None, description="Filter by plate number"),
    driver_id: Optional[int] = Query(None, description="Filter by driver ID", gt=0),
    vehicle_id: Optional[int] = Query(None, description="Filter by vehicle ID", gt=0),
    lease_id: Optional[int] = Query(None, description="Filter by lease ID", gt=0),
    medallion_id: Optional[int] = Query(None, description="Filter by medallion ID", gt=0),
    mapping_method: Optional[str] = Query(None, description="Filter by mapping method"),
    posting_status: Optional[str] = Query(None, description="Filter by posting status"),
    violation_status: Optional[str] = Query(None, description="Filter by violation status"),
    posted_to_ledger: Optional[bool] = Query(None, description="Filter by ledger posting status"),
    import_batch_id: Optional[str] = Query(None, description="Filter by import batch"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=500, description="Page size"),
    sort_by: str = Query("issue_date", description="Sort by field"),
    sort_order: str = Query("desc", description="Sort order (asc/desc)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get PVB violations with filters and pagination
    
    Supports filtering by:
    - Date range
    - Entity associations (driver, vehicle, lease, medallion)
    - Mapping method (AUTO_CURB_MATCH, MANUAL_ASSIGNMENT, etc.)
    - Posting status
    - Violation status
    
    Returns paginated list with total count
    """
    try:
        repo = PVBViolationRepository(db)
        
        # Parse enums
        mapping_method_enum = None
        if mapping_method:
            try:
                mapping_method_enum = MappingMethod(mapping_method)
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid mapping_method: {mapping_method}"
                )
        
        posting_status_enum = None
        if posting_status:
            try:
                posting_status_enum = PostingStatus(posting_status)
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid posting_status: {posting_status}"
                )
        
        violation_status_enum = None
        if violation_status:
            try:
                violation_status_enum = ViolationStatus(violation_status)
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid violation_status: {violation_status}"
                )
        
        # Calculate offset
        offset = (page - 1) * page_size
        
        # Query violations
        violations, total_count = repo.find_violations(
            date_from=date_from,
            date_to=date_to,
            plate_number=plate_number,
            driver_id=driver_id,
            vehicle_id=vehicle_id,
            lease_id=lease_id,
            medallion_id=medallion_id,
            mapping_method=mapping_method_enum,
            posting_status=posting_status_enum,
            violation_status=violation_status_enum,
            posted_to_ledger=posted_to_ledger,
            import_batch_id=import_batch_id,
            limit=page_size,
            offset=offset,
            sort_by=sort_by,
            sort_order=sort_order
        )
        
        total_pages = (total_count + page_size - 1) // page_size
        
        return PaginatedPVBResponse(
            violations=[PVBViolationResponse.model_validate(v) for v in violations],
            total_count=total_count,
            page=page,
            page_size=page_size,
            total_pages=total_pages
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch violations: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch violations: {str(e)}"
        ) from e
    

@router.get("/violations/{violation_id}", response_model=PVBViolationDetailResponse)
def get_violation_detail(
    violation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get detailed violation information including related entities and summons
    """
    try:
        repo = PVBViolationRepository(db)
        violation = repo.get_by_id(violation_id)
        
        if not violation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Violation {violation_id} not found"
            )
        
        # Build response with related entities
        response_data = PVBViolationDetailResponse.model_validate(violation)
        
        # Add vehicle info
        if violation.vehicle_id:
            vehicle = db.query(Vehicle).filter(Vehicle.id == violation.vehicle_id).first()
            if vehicle:
                response_data.vehicle = VehicleInfo(
                    vehicle_id=vehicle.id,
                    plate_number=vehicle.plate_number,
                    vin=vehicle.vin,
                    make=vehicle.make,
                    model=vehicle.model,
                    year=vehicle.year
                )
        
        # Add driver info
        if violation.driver_id:
            driver = db.query(Driver).filter(Driver.id == violation.driver_id).first()
            if driver:
                response_data.driver = DriverInfo(
                    driver_id=driver.id,
                    first_name=driver.first_name,
                    last_name=driver.last_name,
                    tlc_license_number=driver.tlc_license_number,
                    phone=driver.phone
                )
        
        # Add lease info
        if violation.lease_id:
            lease = db.query(Lease).filter(Lease.id == violation.lease_id).first()
            if lease:
                response_data.lease = LeaseInfo(
                    lease_id=lease.id,
                    lease_number=lease.lease_number,
                    start_date=lease.start_date,
                    end_date=lease.end_date,
                    status=lease.status.value if hasattr(lease.status, 'value') else str(lease.status)
                )
        
        # Add summons documents
        summons_repo = PVBSummonsRepository(db)
        summons_list = summons_repo.get_by_violation_id(violation_id)
        
        for summons in summons_list:
            document = upload_service.get_documents(db, document_id=summons.document_id)
            if document:
                response_data.summons_documents.append(SummonsInfo(
                    summons_id=summons.id,
                    document_id=summons.document_id,
                    summons_type=summons.summons_type,
                    presigned_url=document.get('presigned_url'),
                    uploaded_at=summons.uploaded_at,
                    uploaded_by=summons.uploaded_by,
                    verified=summons.verified
                ))
        
        return response_data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch violation detail: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch violation: {str(e)}"
        ) from e


@router.get("/violations/unmapped", response_model=List[PVBViolationResponse])
def get_unmapped_violations(
    limit: int = Query(100, ge=1, le=500, description="Number of records to return"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get violations that haven't been mapped to driver
    
    These violations require manual review and assignment
    """
    try:
        repo = PVBViolationRepository(db)
        violations = repo.get_unmapped_violations(limit=limit)
        
        return [PVBViolationResponse.model_validate(v) for v in violations]
        
    except Exception as e:
        logger.error(f"Failed to fetch unmapped violations: {str(e)}", exc_info=True)
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
        violations = repo.get_unposted_violations(limit=limit)
        
        return [PVBViolationResponse.model_validate(v) for v in violations]
        
    except Exception as e:
        logger.error(f"Failed to fetch unposted violations: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch unposted violations: {str(e)}"
        ) from e


# === Manual Operations ===

@router.post("/violations/{violation_id}/remap", response_model=RemapPVBResponse)
def remap_violation(
    violation_id: int,
    request: RemapPVBRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Manually remap violation to different driver/lease
    
    Process:
    1. Validates new driver and lease
    2. Voids existing ledger postings if violation was already posted
    3. Updates violation associations
    4. Creates new ledger postings with correct associations
    
    Requires:
    - Reason for manual remapping (audit trail)
    """
    try:
        service = PVBImportService(db)
        
        # Get previous mapping
        repo = PVBViolationRepository(db)
        violation = repo.get_by_id(violation_id)
        if not violation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Violation {violation_id} not found"
            )
        
        previous_mapping = {
            "driver_id": violation.driver_id,
            "lease_id": violation.lease_id,
            "vehicle_id": violation.vehicle_id,
            "medallion_id": violation.medallion_id
        }
        
        # Perform remapping
        violation = service.remap_violation_manually(
            violation_id=violation_id,
            driver_id=request.driver_id,
            lease_id=request.lease_id,
            reason=request.reason,
            assigned_by_user_id=current_user.id,
            notes=request.notes
        )
        
        new_mapping = {
            "driver_id": violation.driver_id,
            "lease_id": violation.lease_id,
            "vehicle_id": violation.vehicle_id,
            "medallion_id": violation.medallion_id
        }
        
        return RemapPVBResponse(
            success=True,
            violation_id=violation.id,
            previous_mapping=previous_mapping,
            new_mapping=new_mapping,
            ledger_updated=violation.posted_to_ledger,
            message="Violation remapped successfully"
        )
        
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        ) from e
    except Exception as e:
        logger.error(f"Failed to remap violation: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to remap violation: {str(e)}"
        ) from e


@router.post("/violations/{violation_id}/upload-summons", response_model=UploadSummonsResponse)
async def upload_summons(
    violation_id: int,
    file: UploadFile = File(..., description="Summons document (PDF, JPG, PNG)"),
    summons_type: str = Form("ORIGINAL"),
    notes: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Upload summons document for a violation
    
    Supports uploading:
    - Original summons
    - Penalty notices
    - Payment receipts
    - Court documents
    
    Can be uploaded at creation time or later when summons arrives
    """
    try:
        # Verify violation exists
        repo = PVBViolationRepository(db)
        violation = repo.get_by_id(violation_id)
        if not violation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Violation {violation_id} not found"
            )
        
        # Upload document using existing uploads module
        from app.uploads.router import upload_document
        
        # Create temporary form data
        document_response = await upload_document(
            file=file,
            notes=notes or f"PVB Summons - {summons_type}",
            object_type="pvb_violation",
            object_id=str(violation_id),
            document_type="pvb_summons",
            document_id=None,
            document_date=violation.issue_date.strftime('%Y-%m-%d'),
            document_name=f"summons_{violation.summons_number}",
            db=db,
            logged_in_user=current_user
        )
        
        document_data = document_response.json()
        if document_data.get('status') != 'success':
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Document upload failed"
            )
        
        document_id = document_data['document']['document_id']
        
        # Create summons record
        summons_repo = PVBSummonsRepository(db)
        summons = PVBSummons(
            pvb_violation_id=violation_id,
            document_id=document_id,
            summons_type=summons_type,
            uploaded_by=current_user.id,
            notes=notes
        )
        summons = summons_repo.create(summons)
        db.commit()
        
        # Get presigned URL
        document = upload_service.get_documents(db, document_id=document_id)
        
        return UploadSummonsResponse(
            summons_id=summons.id,
            document_id=document_id,
            violation_id=violation_id,
            presigned_url=document.get('presigned_url'),
            uploaded_at=summons.uploaded_at,
            message="Summons uploaded successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to upload summons: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload summons: {str(e)}"
        ) from e


# === Import History ===

@router.get("/import/history", response_model=PaginatedImportHistoryResponse)
def get_import_history(
    import_source: Optional[str] = Query(None, description="Filter by import source"),
    status: Optional[str] = Query(None, description="Filter by status"),
    date_from: Optional[datetime] = Query(None, description="Filter by start date"),
    date_to: Optional[datetime] = Query(None, description="Filter by start date"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=100, description="Page size"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    View import history with filters
    
    Returns list of all import batches with statistics
    """
    try:
        repo = PVBImportHistoryRepository(db)
        
        offset = (page - 1) * page_size
        
        imports, total_count = repo.find_imports(
            import_source=import_source,
            status=status,
            date_from=date_from,
            date_to=date_to,
            limit=page_size,
            offset=offset
        )
        
        total_pages = (total_count + page_size - 1) // page_size
        
        return PaginatedImportHistoryResponse(
            imports=[PVBImportHistoryResponse.model_validate(i) for i in imports],
            total_count=total_count,
            page=page,
            page_size=page_size,
            total_pages=total_pages
        )
        
    except Exception as e:
        logger.error(f"Failed to fetch import history: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch import history: {str(e)}"
        ) from e


@router.get("/import/history/{batch_id}", response_model=ImportBatchDetailResponse)
def get_import_batch_detail(
    batch_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get detailed import batch information including failures
    """
    try:
        history_repo = PVBImportHistoryRepository(db)
        import_history = history_repo.get_by_batch_id(batch_id)
        
        if not import_history:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Import batch {batch_id} not found"
            )
        
        # Get failures
        from app.pvb.repository import PVBImportFailureRepository
        failure_repo = PVBImportFailureRepository(db)
        failures = failure_repo.get_by_batch_id(batch_id)
        
        # Get sample violations from this batch
        violation_repo = PVBViolationRepository(db)
        sample_violations, _ = violation_repo.find_violations(
            import_batch_id=batch_id,
            limit=10,
            offset=0
        )
        
        from app.pvb.schemas import ImportFailureDetail
        return ImportBatchDetailResponse(
            batch_info=PVBImportHistoryResponse.model_validate(import_history),
            failures=[
                ImportFailureDetail(
                    row_number=f.row_number,
                    error_type=f.error_type,
                    error_message=f.error_message,
                    field_name=f.field_name,
                    raw_data=json.loads(f.raw_data) if f.raw_data else None
                ) for f in failures
            ],
            sample_violations=[PVBViolationResponse.model_validate(v) for v in sample_violations]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch batch detail: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch batch detail: {str(e)}"
        ) from e


# === Statistics ===

@router.get("/statistics", response_model=PVBStatisticsResponse)
def get_statistics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get aggregated PVB statistics"""
    try:
        from sqlalchemy import func, case
        from app.pvb.models import PVBViolation
        
        # Total violations
        total_violations = db.query(func.count(PVBViolation.id)).scalar()
        
        # Open violations
        open_violations = db.query(func.count(PVBViolation.id)).filter(
            PVBViolation.violation_status == ViolationStatus.OPEN
        ).scalar()
        
        # Total amount due
        total_amount = db.query(func.sum(PVBViolation.amount_due)).filter(
            PVBViolation.violation_status == ViolationStatus.OPEN
        ).scalar() or Decimal('0.00')
        
        # By status
        by_status = {}
        status_counts = db.query(
            PVBViolation.violation_status,
            func.count(PVBViolation.id)
        ).group_by(PVBViolation.violation_status).all()
        for status, count in status_counts:
            by_status[status.value] = count
        
        # By mapping method
        by_mapping = {}
        mapping_counts = db.query(
            PVBViolation.mapping_method,
            func.count(PVBViolation.id)
        ).group_by(PVBViolation.mapping_method).all()
        for method, count in mapping_counts:
            by_mapping[method.value] = count
        
        # By state
        by_state = {}
        state_counts = db.query(
            PVBViolation.state,
            func.count(PVBViolation.id)
        ).filter(PVBViolation.state.isnot(None)).group_by(PVBViolation.state).all()
        for state, count in state_counts:
            by_state[state] = count
        
        # Unmapped and unposted counts
        unmapped_count = db.query(func.count(PVBViolation.id)).filter(
            PVBViolation.mapping_method == MappingMethod.UNKNOWN
        ).scalar()
        
        unposted_count = db.query(func.count(PVBViolation.id)).filter(
            and_(
                PVBViolation.posted_to_ledger == False,
                PVBViolation.driver_id.isnot(None),
                PVBViolation.amount_due > 0
            )
        ).scalar()
        
        # Average fine
        avg_fine = db.query(func.avg(PVBViolation.fine_amount)).scalar() or Decimal('0.00')
        
        # Average confidence
        avg_confidence = db.query(func.avg(PVBViolation.mapping_confidence)).filter(
            PVBViolation.mapping_confidence.isnot(None)
        ).scalar()
        
        # Last import
        last_import = db.query(func.max(PVBImportHistory.started_at)).scalar()
        
        # Total imports
        total_imports = db.query(func.count(PVBImportHistory.id)).scalar()
        
        return PVBStatisticsResponse(
            total_violations=total_violations,
            open_violations=open_violations,
            total_amount_due=total_amount,
            by_status=by_status,
            by_mapping_method=by_mapping,
            by_state=by_state,
            unmapped_count=unmapped_count,
            unposted_count=unposted_count,
            avg_fine_amount=avg_fine,
            avg_confidence_score=avg_confidence,
            last_import_date=last_import,
            total_imports=total_imports
        )
        
    except Exception as e:
        logger.error(f"Failed to fetch statistics: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch statistics: {str(e)}"
        ) from e


# === Export ===

@router.get("/export")
def export_violations(
    format: str = Query("excel", description="Export format: excel, pdf, csv"),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    plate_number: Optional[str] = Query(None),
    driver_id: Optional[int] = Query(None),
    mapping_method: Optional[str] = Query(None),
    posting_status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Export violations to Excel/PDF/CSV
    
    Uses existing exporter_utils for file generation
    """
    try:
        repo = PVBViolationRepository(db)
        
        # Get violations with filters (no pagination for export)
        violations, _ = repo.find_violations(
            date_from=date_from,
            date_to=date_to,
            plate_number=plate_number,
            driver_id=driver_id,
            mapping_method=MappingMethod(mapping_method) if mapping_method else None,
            posting_status=PostingStatus(posting_status) if posting_status else None,
            limit=10000,  # Max export limit
            offset=0
        )
        
        if not violations:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No violations found matching criteria"
            )
        
        # Format data for export
        export_data = []
        for v in violations:
            export_data.append({
                "Summons Number": v.summons_number,
                "Plate Number": v.plate_number,
                "State": v.state,
                "Issue Date": v.issue_date.strftime('%Y-%m-%d %H:%M') if v.issue_date else '',
                "Violation Code": v.violation_code,
                "Fine Amount": float(v.fine_amount),
                "Penalty Amount": float(v.penalty_amount),
                "Amount Due": float(v.amount_due),
                "Driver ID": v.driver_id,
                "Vehicle ID": v.vehicle_id,
                "Mapping Method": v.mapping_method.value,
                "Posted to Ledger": "Yes" if v.posted_to_ledger else "No",
                "Violation Status": v.violation_status.value,
                "County": v.county,
                "Street": v.street_name
            })
        
        # Generate file
        exporter = ExporterFactory.get_exporter(format, export_data)
        file_buffer = exporter.export()
        
        # Set appropriate media type and filename
        if format == "excel":
            media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            filename = f"pvb_violations_{datetime.now().strftime('%Y%m%d')}.xlsx"
        elif format == "pdf":
            media_type = "application/pdf"
            filename = f"pvb_violations_{datetime.now().strftime('%Y%m%d')}.pdf"
        else:  # csv
            media_type = "text/csv"
            filename = f"pvb_violations_{datetime.now().strftime('%Y%m%d')}.csv"
        
        return StreamingResponse(
            file_buffer,
            media_type=media_type,
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Export failed: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Export failed: {str(e)}"
        ) from e