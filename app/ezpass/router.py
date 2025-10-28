"""
app/ezpass/router.py

FastAPI router for EZPass endpoints
"""

from datetime import date
from typing import Optional, List
from io import BytesIO

from fastapi import (
    APIRouter, Depends, HTTPException, Query, UploadFile, 
    File, status, BackgroundTasks
)
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.users.models import User
from app.core.dependencies import get_current_user

from app.ezpass.service import EZPassImportService
from app.ezpass.repository import (
    EZPassTransactionRepository, EZPassImportHistoryRepository
)
from app.ezpass.models import MappingMethod, PostingStatus, ResolutionStatus
from app.ezpass.schemas import (
    UploadEZPassCSVRequest, UploadEZPassCSVResponse,
    RemapEZPassRequest, RemapEZPassResponse,
    BulkPostToLedgerRequest,
    EZPassTransactionResponse, EZPassTransactionDetailResponse,
    EZPassImportHistoryResponse, PaginatedEZPassResponse,
    EZPassStatisticsResponse
)
from app.utils.logger import get_logger
from app.utils.exporter.excel_exporter import ExcelExporter
from app.utils.exporter.pdf_exporter import PDFExporter

logger = get_logger(__name__)

router = APIRouter(prefix="/ezpass", tags=["EZPass Import"])


# === Import Endpoints ===

@router.post("/upload", response_model=UploadEZPassCSVResponse)
async def upload_ezpass_csv(
    file: UploadFile = File(..., description="EZPass CSV file"),
    perform_matching: bool = Query(True, description="Auto-match with CURB trips"),
    post_to_ledger: bool = Query(True, description="Post matched transactions to ledger"),
    auto_match_threshold: float = Query(0.90, ge=0.0, le=1.0, 
                                       description="Minimum confidence for auto-matching"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Upload and import EZPass CSV file
    
    **Process:**
    1. Parse CSV file
    2. Import toll transactions
    3. Map to vehicles by plate number
    4. Match to drivers via CURB trip correlation (±30 min window)
    5. Post matched transactions to ledger
    6. Track import history and errors
    
    **CSV Format:**
    Required columns: POSTING DATE, TRANSACTION DATE, TAG/PLATE NUMBER, 
    AGENCY, AMOUNT, ENTRY PLAZA, EXIT PLAZA
    
    **Returns:**
    Import summary with statistics and any errors encountered
    """
    try:
        # Validate file type
        if not file.filename.endswith('.csv'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only CSV files are supported"
            )
        
        # Read file content
        csv_content = (await file.read()).decode('utf-8')
        
        # Import via service
        service = EZPassImportService(db)
        import_history, errors = service.import_csv_file(
            csv_content=csv_content,
            file_name=file.filename,
            perform_matching=perform_matching,
            post_to_ledger=post_to_ledger,
            auto_match_threshold=auto_match_threshold,
            triggered_by="API",
            triggered_by_user_id=current_user.id
        )
        
        return UploadEZPassCSVResponse(
            batch_id=import_history.batch_id,
            status=import_history.status,
            message=import_history.summary or "Import completed",
            total_rows_in_file=import_history.total_rows_in_file,
            total_transactions_imported=import_history.total_transactions_imported,
            total_duplicates_skipped=import_history.total_duplicates_skipped,
            total_auto_matched=import_history.total_auto_matched,
            total_unmapped=import_history.total_unmapped,
            total_posted_to_ledger=import_history.total_posted_to_ledger,
            total_errors=import_history.total_errors,
            errors=errors[:50]  # Return first 50 errors
        )
        
    except Exception as e:
        logger.error(f"Error uploading EZPass CSV: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Import failed: {str(e)}"
        )


@router.get("/import/history", response_model=List[EZPassImportHistoryResponse])
def get_import_history(
    limit: int = Query(20, ge=1, le=100, description="Number of records"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get EZPass import history
    
    **Returns:**
    List of import batches with statistics
    """
    try:
        repo = EZPassImportHistoryRepository(db)
        imports, total_count = repo.get_all_imports(limit=limit, offset=offset)
        
        return [
            EZPassImportHistoryResponse.from_orm(imp) for imp in imports
        ]
        
    except Exception as e:
        logger.error(f"Error fetching import history: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch import history: {str(e)}"
        )


@router.get("/import/history/{batch_id}", response_model=EZPassImportHistoryResponse)
def get_import_batch_details(
    batch_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get detailed information about a specific import batch
    """
    try:
        repo = EZPassImportHistoryRepository(db)
        import_history = repo.get_by_batch_id(batch_id)
        
        if not import_history:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Import batch {batch_id} not found"
            )
        
        return EZPassImportHistoryResponse.from_orm(import_history)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching batch details: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch batch details: {str(e)}"
        )


# === Transaction Query Endpoints ===

@router.get("/transactions", response_model=PaginatedEZPassResponse)
def list_ezpass_transactions(
    date_from: Optional[date] = Query(None, description="Filter by transaction date from"),
    date_to: Optional[date] = Query(None, description="Filter by transaction date to"),
    driver_id: Optional[int] = Query(None, description="Filter by driver ID"),
    lease_id: Optional[int] = Query(None, description="Filter by lease ID"),
    vehicle_id: Optional[int] = Query(None, description="Filter by vehicle ID"),
    medallion_id: Optional[int] = Query(None, description="Filter by medallion ID"),
    plate_number: Optional[str] = Query(None, description="Filter by plate number"),
    mapping_method: Optional[MappingMethod] = Query(None, description="Filter by mapping method"),
    posting_status: Optional[PostingStatus] = Query(None, description="Filter by posting status"),
    resolution_status: Optional[ResolutionStatus] = Query(None, description="Filter by resolution status"),
    import_batch_id: Optional[str] = Query(None, description="Filter by import batch"),
    payment_period_start: Optional[date] = Query(None, description="Filter by payment period start"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=100, description="Items per page"),
    sort_by: str = Query("transaction_date", description="Sort field"),
    sort_order: str = Query("desc", regex="^(asc|desc)$", description="Sort order"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List EZPass transactions with filters, pagination, and sorting
    
    **Filters:**
    - Date range
    - Driver/Lease/Vehicle/Medallion
    - Mapping method (AUTO_CURB_MATCH, MANUAL_ASSIGNMENT, UNKNOWN)
    - Posting status (NOT_POSTED, POSTED, FAILED)
    - Resolution status (UNRESOLVED, RESOLVED)
    - Import batch
    - Payment period
    
    **Sorting:**
    Available fields: transaction_date, toll_amount, posting_date, imported_on
    """
    try:
        repo = EZPassTransactionRepository(db)
        offset = (page - 1) * page_size
        
        transactions, total_count = repo.get_transactions_by_filters(
            date_from=date_from,
            date_to=date_to,
            driver_id=driver_id,
            lease_id=lease_id,
            vehicle_id=vehicle_id,
            medallion_id=medallion_id,
            plate_number=plate_number,
            mapping_method=mapping_method,
            posting_status=posting_status,
            resolution_status=resolution_status,
            import_batch_id=import_batch_id,
            payment_period_start=payment_period_start,
            limit=page_size,
            offset=offset,
            sort_by=sort_by,
            sort_order=sort_order
        )
        
        total_pages = (total_count + page_size - 1) // page_size
        
        return PaginatedEZPassResponse(
            items=[EZPassTransactionResponse.from_orm(t) for t in transactions],
            total_count=total_count,
            page=page,
            page_size=page_size,
            total_pages=total_pages
        )
        
    except Exception as e:
        logger.error(f"Error listing transactions: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list transactions: {str(e)}"
        )


@router.get("/transactions/{transaction_id}", response_model=EZPassTransactionDetailResponse)
def get_transaction_detail(
    transaction_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get detailed information about a specific EZPass transaction
    """
    try:
        repo = EZPassTransactionRepository(db)
        transaction = repo.get_by_id(transaction_id)
        
        if not transaction:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Transaction {transaction_id} not found"
            )
        
        # Build detailed response
        response = EZPassTransactionDetailResponse.from_orm(transaction)
        
        # Add related entity names
        if transaction.driver_id:
            from app.drivers.models import Driver
            driver = db.query(Driver).filter(Driver.id == transaction.driver_id).first()
            if driver:
                response.driver_name = f"{driver.first_name} {driver.last_name}"
        
        if transaction.vehicle_id:
            from app.vehicles.models import Vehicle
            vehicle = db.query(Vehicle).filter(Vehicle.id == transaction.vehicle_id).first()
            if vehicle:
                response.vehicle_vin = vehicle.vin
        
        if transaction.medallion_id:
            from app.medallions.models import Medallion
            medallion = db.query(Medallion).filter(Medallion.id == transaction.medallion_id).first()
            if medallion:
                response.medallion_number = medallion.medallion_number
        
        if transaction.lease_id:
            from app.leases.models import Lease
            lease = db.query(Lease).filter(Lease.id == transaction.lease_id).first()
            if lease:
                response.lease_number = str(lease.id)  # Or lease number field if exists
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching transaction detail: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch transaction: {str(e)}"
        )


@router.get("/transactions/unmapped", response_model=PaginatedEZPassResponse)
def get_unmapped_transactions(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get EZPass transactions that haven't been mapped to driver/lease
    
    **Use case:**
    - Review transactions requiring manual assignment
    - Identify vehicles not in CURB trips
    - Quality control
    """
    try:
        repo = EZPassTransactionRepository(db)
        offset = (page - 1) * page_size
        
        transactions, total_count = repo.get_unmapped_transactions(
            limit=page_size,
            offset=offset
        )
        
        total_pages = (total_count + page_size - 1) // page_size
        
        return PaginatedEZPassResponse(
            items=[EZPassTransactionResponse.from_orm(t) for t in transactions],
            total_count=total_count,
            page=page,
            page_size=page_size,
            total_pages=total_pages
        )
        
    except Exception as e:
        logger.error(f"Error fetching unmapped transactions: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch unmapped transactions: {str(e)}"
        )


@router.get("/transactions/unposted", response_model=PaginatedEZPassResponse)
def get_unposted_transactions(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get EZPass transactions that are mapped but not posted to ledger
    
    **Use case:**
    - Review transactions ready for posting
    - Bulk post to ledger
    - Error recovery
    """
    try:
        repo = EZPassTransactionRepository(db)
        offset = (page - 1) * page_size
        
        transactions, total_count = repo.get_unposted_transactions(
            limit=page_size,
            offset=offset
        )
        
        total_pages = (total_count + page_size - 1) // page_size
        
        return PaginatedEZPassResponse(
            items=[EZPassTransactionResponse.from_orm(t) for t in transactions],
            total_count=total_count,
            page=page,
            page_size=page_size,
            total_pages=total_pages
        )
        
    except Exception as e:
        logger.error(f"Error fetching unposted transactions: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch unposted transactions: {str(e)}"
        )


@router.get("/statistics", response_model=EZPassStatisticsResponse)
def get_ezpass_statistics(
    date_from: Optional[date] = Query(None, description="Filter by date from"),
    date_to: Optional[date] = Query(None, description="Filter by date to"),
    driver_id: Optional[int] = Query(None, description="Filter by driver"),
    lease_id: Optional[int] = Query(None, description="Filter by lease"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get aggregated statistics for EZPass transactions
    
    **Returns:**
    - Total transactions and toll amounts
    - Mapped vs unmapped counts
    - Posted vs unposted counts
    - Breakdown by mapping method
    - Breakdown by posting status
    - Breakdown by agency
    """
    try:
        repo = EZPassTransactionRepository(db)
        stats = repo.get_statistics(
            date_from=date_from,
            date_to=date_to,
            driver_id=driver_id,
            lease_id=lease_id
        )
        
        return EZPassStatisticsResponse(**stats)
        
    except Exception as e:
        logger.error(f"Error fetching statistics: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch statistics: {str(e)}"
        )


# === Manual Operations ===

@router.post("/transactions/{transaction_id}/remap", response_model=RemapEZPassResponse)
def remap_transaction(
    transaction_id: int,
    request: RemapEZPassRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Manually remap EZPass transaction to different driver/lease/vehicle/medallion
    
    **Use cases:**
    - Correct auto-match errors
    - Assign unmapped transactions
    - Handle driver switches mid-shift
    - Override matching for special cases
    
    **Effect:**
    - Updates entity mappings
    - Resets ledger posting status
    - Records remapping history
    - Optionally re-posts to ledger
    """
    try:
        service = EZPassImportService(db)
        
        transaction = service.remap_transaction(
            transaction_id=transaction_id,
            driver_id=request.driver_id,
            lease_id=request.lease_id,
            medallion_id=request.medallion_id,
            vehicle_id=request.vehicle_id,
            reason=request.reason,
            post_to_ledger=request.post_to_ledger,
            remapped_by_user_id=current_user.id
        )
        
        return RemapEZPassResponse(
            transaction_id=transaction.id,
            ticket_number=transaction.ticket_number,
            old_driver_id=transaction.remapped_from_driver_id,
            new_driver_id=transaction.driver_id,
            old_lease_id=None,  # Could track this if needed
            new_lease_id=transaction.lease_id,
            mapping_method=transaction.mapping_method,
            posted_to_ledger=(transaction.posting_status == PostingStatus.POSTED),
            ledger_balance_id=transaction.ledger_balance_id,
            message=f"Transaction remapped successfully. {transaction.mapping_notes}"
        )
        
    except Exception as e:
        logger.error(f"Error remapping transaction: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to remap transaction: {str(e)}"
        )


@router.post("/transactions/bulk-post")
def bulk_post_to_ledger(
    request: BulkPostToLedgerRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Post multiple EZPass transactions to ledger in bulk
    
    **Use case:**
    - Post manually reviewed transactions
    - Retry failed postings
    - Bulk operations
    """
    try:
        service = EZPassImportService(db)
        
        success_count, failure_count, errors = service.bulk_post_to_ledger(
            transaction_ids=request.transaction_ids
        )
        
        return {
            "message": f"Bulk posting completed",
            "success_count": success_count,
            "failure_count": failure_count,
            "total_requested": len(request.transaction_ids),
            "errors": errors[:50]  # Return first 50 errors
        }
        
    except Exception as e:
        logger.error(f"Error in bulk posting: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Bulk posting failed: {str(e)}"
        )


# === Export Endpoint ===

@router.get("/export")
def export_ezpass_transactions(
    format: str = Query("excel", regex="^(excel|pdf)$", description="Export format"),
    date_from: Optional[date] = Query(None, description="Filter by date from"),
    date_to: Optional[date] = Query(None, description="Filter by date to"),
    driver_id: Optional[int] = Query(None, description="Filter by driver"),
    lease_id: Optional[int] = Query(None, description="Filter by lease"),
    mapping_method: Optional[MappingMethod] = Query(None, description="Filter by mapping method"),
    posting_status: Optional[PostingStatus] = Query(None, description="Filter by posting status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Export EZPass transactions to Excel or PDF
    
    **Formats:**
    - excel: XLSX file with all transaction details
    - pdf: PDF report with summary and details
    """
    try:
        repo = EZPassTransactionRepository(db)
        
        # Get all matching transactions (no pagination for export)
        transactions, total_count = repo.get_transactions_by_filters(
            date_from=date_from,
            date_to=date_to,
            driver_id=driver_id,
            lease_id=lease_id,
            mapping_method=mapping_method,
            posting_status=posting_status,
            limit=10000,  # Max export limit
            offset=0,
            sort_by="transaction_date",
            sort_order="desc"
        )
        
        # Prepare data for export
        export_data = []
        for t in transactions:
            export_data.append({
                "Ticket Number": t.ticket_number,
                "Transaction Date": t.transaction_date.isoformat(),
                "Plate Number": t.plate_number,
                "Agency": t.agency or "",
                "Entry Plaza": t.entry_plaza or "",
                "Exit Plaza": t.exit_plaza or "",
                "Toll Amount": float(t.toll_amount),
                "Driver ID": t.driver_id or "",
                "Lease ID": t.lease_id or "",
                "TLC License": t.hack_license_number or "",
                "Mapping Method": t.mapping_method.value,
                "Mapping Confidence": float(t.mapping_confidence) if t.mapping_confidence else "",
                "Posting Status": t.posting_status.value,
                "Ledger Balance ID": t.ledger_balance_id or "",
                "Payment Period Start": t.payment_period_start.isoformat(),
                "Payment Period End": t.payment_period_end.isoformat(),
                "Import Batch": t.import_batch_id
            })
        
        # Generate export file
        if format == "excel":
            exporter = ExcelExporter(export_data)
            file = exporter.export()
            media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            filename = f"ezpass_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
        else:  # pdf
            exporter = PDFExporter(export_data)
            file = exporter.export()
            media_type = "application/pdf"
            filename = f"ezpass_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
        
        return StreamingResponse(
            file,
            media_type=media_type,
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
        
    except Exception as e:
        logger.error(f"Error exporting transactions: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Export failed: {str(e)}"
        )