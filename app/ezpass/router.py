### app/ezpass/router.py

import math
from datetime import date , time
from io import BytesIO
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi import status as fast_status
from fastapi.responses import JSONResponse, StreamingResponse
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.ezpass.exceptions import EZPassError
from app.ezpass.schemas import (
    EZPassTransactionResponse,
    PaginatedEZPassTransactionResponse,
)
from app.ezpass.services import EZPassService
from app.ezpass.stubs import create_stub_ezpass_response
from app.users.models import User
from app.users.utils import get_current_user
from app.utils.exporter.excel_exporter import ExcelExporter
from app.utils.exporter.pdf_exporter import PDFExporter
from app.utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/trips/ezpass", tags=["EZPass"])

# Dependency to inject the EZPassService
def get_ezpass_service(db: Session = Depends(get_db)) -> EZPassService:
    return EZPassService(db)

@router.post("/upload-csv", summary="Upload and Process EZPass CSV", status_code=fast_status.HTTP_202_ACCEPTED)
async def upload_ezpass_csv(
    file: UploadFile = File(...),
    ezpass_service: EZPassService = Depends(get_ezpass_service),
    current_user: User = Depends(get_current_user),
):
    """
    Accepts a CSV file of EZPass transactions, performs initial validation and parsing,
    stores the raw data, and triggers a background task for processing and association.
    """
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload a CSV file.")

    try:
        file_stream = BytesIO(await file.read())
        result = ezpass_service.process_uploaded_csv(
            file_stream, file.filename, current_user.id
        )
        return JSONResponse(content=result, status_code=fast_status.HTTP_202_ACCEPTED)
    except EZPassError as e:
        logger.warning("Business logic error during EZPass CSV upload: %s", e)
        raise HTTPException(status_code=fast_status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error("Error processing EZPass CSV: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="An unexpected error occurred during file processing.")

@router.get("", response_model=PaginatedEZPassTransactionResponse, summary="List EZPass Transactions")
def list_ezpass_transactions(
    use_stubs: bool = Query(False, description="Return stubbed data for testing."),
    page: int = Query(1, ge=1, description="Page number for pagination."),
    per_page: int = Query(10, ge=1, le=100, description="Items per page."),
    sort_by: Optional[str] = Query("transaction_date", description="Field to sort by."),
    sort_order: str = Query("desc", enum=["asc", "desc"]),
    from_transaction_date: Optional[date] = Query(None, description="Filter by a specific from transaction date."),
    to_transaction_date: Optional[date] = Query(None , description="Filter by a specific to transaction date."),
    from_transaction_time: Optional[time] = Query(None, description="Filter by a specific from transaction time."),
    to_transaction_time: Optional[time] = Query(None, description="Filter by a specific to transaction time."),
    from_posting_date: Optional[date] = Query(None, description="Filter by a specific from posting date."),
    to_posting_date: Optional[date] = Query(None, description="Filter by a specific to posting date."),
    from_amount: Optional[float] = Query(None, description="Filter by a specific from amount."),
    to_amount:Optional[float] = Query(None, description="Filter by a specific to amount."),
    transaction_id: Optional[str] = Query(None, description="Filter by transaction ID."),
    entry_plaza: Optional[str] = Query(None, description="Filter by entry plaza."),
    exit_plaza: Optional[str] = Query(None, description="Filter by exit plaza."),
    ezpass_class: Optional[str] = Query(None, description="Filter by EZPass Class."),
    vin: Optional[str] = Query(None, description="Filter by VIN."),
    agency: Optional[str] = Query(None, description="Filter by Agency."),
    medallion_no: Optional[str] = Query(None, description="Filter by Medallion Number."),
    driver_id: Optional[str] = Query(None, description="Filter by Driver ID."),
    plate_number: Optional[str] = Query(None, description="Filter by Plate Number."),
    status: Optional[str] = Query(None, description="Filter by transaction status."),
    ezpass_service: EZPassService = Depends(get_ezpass_service),
    current_user: User = Depends(get_current_user),
):
    """
    Provides a paginated and filterable view of all imported EZPass transactions,
    matching the UI requirements.
    """
    if use_stubs:
        return create_stub_ezpass_response(page, per_page)
    
    try:
        transactions, total_items = ezpass_service.repo.list_transactions(
            page=page,
            per_page=per_page,
            sort_by=sort_by,
            sort_order=sort_order,
            from_transaction_date=from_transaction_date,
            to_transaction_date=to_transaction_date,
            from_transaction_time=from_transaction_time,
            to_transaction_time=to_transaction_time,
            from_posting_date=from_posting_date,
            to_posting_date=to_posting_date,
            from_amount=from_amount,
            to_amount=to_amount,
            transaction_id=transaction_id,
            entry_plaza=entry_plaza,
            exit_plaza=exit_plaza,
            agency=agency,
            vin=vin,
            medallion_no=medallion_no,
            driver_id=driver_id,
            plate_number=plate_number,
            status=status,
        )

        response_items = [
            EZPassTransactionResponse(
                id=t.id,
                transaction_id=t.transaction_id,
                transaction_date= t.transaction_datetime,
                transaction_time=t.transaction_datetime.time(),
                entry_plaza=t.entry_plaza,
                exit_plaza=t.exit_plaza,
                ezpass_class=t.ezpass_class,
                medallion_no=t.medallion.medallion_number if t.medallion else None,
                vin=t.vehicle.vin if t.vehicle else None,
                driver_id=t.driver.driver_id if t.driver else None,
                tag_or_plate=t.tag_or_plate,
                posting_date=t.posting_date,
                status=t.status,
                amount=t.amount,
                failure_reason=t.failure_reason,
                agency=t.agency,
            )
            for t in transactions
        ]

        total_pages = math.ceil(total_items / per_page) if per_page > 0 else 0

        return PaginatedEZPassTransactionResponse(
            items=response_items,
            total_items=total_items,
            page=page,
            per_page=per_page,
            total_pages=total_pages
        )

    except Exception as e:
        logger.error("Error fetching EZPass transactions: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="An unexpected error occurred while fetching EZPass data.")


@router.get("/export", summary="Export EZPass Transaction Data")
def export_ezpass_transactions(
    format: str = Query("excel", enum=["excel", "pdf"]),
    # Pass through all filters from the list endpoint
    sort_by: Optional[str] = Query("transaction_date", description="Field to sort by."),
    sort_order: str = Query("desc", enum=["asc", "desc"]),
    from_transaction_date: Optional[date] = Query(None, description="Filter by a specific from transaction date."),
    to_transaction_date: Optional[date] = Query(None , description="Filter by a specific to transaction date."),
    from_transaction_time: Optional[time] = Query(None, description="Filter by a specific from transaction time."),
    to_transaction_time: Optional[time] = Query(None, description="Filter by a specific to transaction time."),
    from_posting_date: Optional[date] = Query(None, description="Filter by a specific from posting date."),
    to_posting_date: Optional[date] = Query(None, description="Filter by a specific to posting date."),
    from_amount: Optional[float] = Query(None, description="Filter by a specific from amount."),
    to_amount:Optional[float] = Query(None, description="Filter by a specific to amount."),
    transaction_id: Optional[str] = Query(None, description="Filter by transaction ID."),
    entry_plaza: Optional[str] = Query(None, description="Filter by entry plaza."),
    exit_plaza: Optional[str] = Query(None, description="Filter by exit plaza."),
    ezpass_class: Optional[str] = Query(None, description="Filter by EZPass Class."),
    vin: Optional[str] = Query(None, description="Filter by VIN."),
    agency: Optional[str] = Query(None, description="Filter by Agency."),
    medallion_no: Optional[str] = Query(None, description="Filter by Medallion Number."),
    driver_id: Optional[str] = Query(None, description="Filter by Driver ID."),
    plate_number: Optional[str] = Query(None, description="Filter by Plate Number."),
    satus: Optional[str] = Query(None, description="Filter by transaction status."),
    ezpass_service: EZPassService = Depends(get_ezpass_service),
    current_user: User = Depends(get_current_user),
):
    """
    Exports filtered EZPass transaction data to the specified format (Excel or PDF).
    """
    try:
        transactions, _ = ezpass_service.repo.list_transactions(
            page=1,
            per_page=10000,  # A large number to fetch all records for export
            sort_by=sort_by,
            sort_order=sort_order,
            from_transaction_date=from_transaction_date,
            to_transaction_date=to_transaction_date,
            from_transaction_time=from_transaction_time,
            to_transaction_time=to_transaction_time,
            from_posting_date=from_posting_date,
            to_posting_date=to_posting_date,
            from_amount=from_amount,
            to_amount=to_amount,
            transaction_id=transaction_id,
            ezpass_class=ezpass_class,
            entry_plaza=entry_plaza,
            exit_plaza=exit_plaza,
            agency=agency,
            vin=vin,
            medallion_no=medallion_no,
            driver_id=driver_id,
            plate_number=plate_number,
            status=satus,
        )

        if not transactions:
            raise HTTPException(
                status_code=fast_status.HTTP_404_NOT_FOUND,
                detail="No EZPass data available for export with the given filters.",
            )

        # Convert SQLAlchemy models to dictionaries for the exporter
        export_data = [
            EZPassTransactionResponse(
                id=t.id,
                transaction_id=t.transaction_id,
                transaction_date=t.transaction_datetime,
                transaction_time=t.transaction_datetime.time(),
                entry_plaza=t.entry_plaza,
                exit_plaza=t.exit_plaza,
                ezpass_class=t.ezpass_class,
                vin=t.vehicle.vin if t.vehicle else None,
                medallion_no=t.medallion.medallion_number if t.medallion else None,
                driver_id=t.driver.driver_id if t.driver else None,
                tag_or_plate=t.tag_or_plate,
                posting_date=t.posting_date,
                status=t.status,
                amount=t.amount,
                failure_reason=t.failure_reason,
                agency=t.agency,
            ).model_dump()
            for t in transactions
        ]

        filename = f"ezpass_transactions_{date.today()}.{'xlsx' if format == 'excel' else 'pdf'}"
        
        file_content: BytesIO
        media_type: str

        if format == "excel":
            exporter = ExcelExporter(export_data)
            file_content = exporter.export()
            media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        else: # PDF
            exporter = PDFExporter(export_data)
            file_content = exporter.export()
            media_type = "application/pdf"
        
        headers = {"Content-Disposition": f"attachment; filename={filename}"}
        return StreamingResponse(file_content, media_type=media_type, headers=headers)

    except Exception as e:
        logger.error("Error exporting EZPass data: %s", e, exc_info=True)
        raise HTTPException(
            status_code=fast_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred during the export process.",
        )