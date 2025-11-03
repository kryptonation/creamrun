### app/misc_expenses/router.py

import math
from datetime import date
from io import BytesIO
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.bpm.services import bpm_service
from app.core.db import get_db
from app.core.dependencies import get_db_with_current_user
from app.misc_expenses.exceptions import MiscellaneousExpenseError
from app.misc_expenses.schemas import (
    MiscellaneousExpenseResponse,
    PaginatedMiscellaneousExpenseResponse,
)
from app.misc_expenses.services import MiscellaneousExpenseService
from app.users.models import User
from app.users.utils import get_current_user
from app.utils.exporter.excel_exporter import ExcelExporter
from app.utils.exporter.pdf_exporter import PDFExporter
from app.utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/payments/miscellaneous-expenses", tags=["Miscellaneous Expenses"])

# Dependency to inject the MiscellaneousExpenseService
def get_misc_expense_service(db: Session = Depends(get_db)) -> MiscellaneousExpenseService:
    """Provides an instance of MiscellaneousExpenseService with the current DB session."""
    return MiscellaneousExpenseService(db)


@router.post("/create-case", summary="Create a New Miscellaneous Expense Case", status_code=status.HTTP_201_CREATED)
def create_misc_expense_case(
    db: Session = Depends(get_db_with_current_user),
    current_user: User = Depends(get_current_user),
):
    """
    Initiates a new BPM workflow for creating a Miscellaneous Expense.
    """
    try:
        new_case = bpm_service.create_case(db, prefix="MISCEXP", user=current_user)
        return {
            "message": "New Miscellaneous Expense case started successfully.",
            "case_no": new_case.case_no,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        logger.error("Error creating miscellaneous expense case: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Could not start a new miscellaneous expense case.") from e


@router.get("", response_model=PaginatedMiscellaneousExpenseResponse, summary="List Miscellaneous Expenses")
def list_misc_expenses(
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=100),
    sort_by: Optional[str] = Query("date"),
    sort_order: str = Query("desc", enum=["asc", "desc"]),
    expense_id: Optional[str] = Query(None),
    reference_no: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    expense_date: Optional[date] = Query(None),
    driver_name: Optional[str] = Query(None),
    lease_id: Optional[str] = Query(None),
    vin_no: Optional[str] = Query(None),
    plate_no: Optional[str] = Query(None),
    medallion_no: Optional[str] = Query(None),
    expense_service: MiscellaneousExpenseService = Depends(get_misc_expense_service),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieves a paginated and filterable list of all miscellaneous expenses.
    """
    try:
        expenses, total_items = expense_service.repo.list_expenses(
            page=page, per_page=per_page, sort_by=sort_by, sort_order=sort_order,
            expense_id=expense_id, reference_no=reference_no, category=category,
            expense_date=expense_date, driver_name=driver_name, lease_id=lease_id,
            vin=vin_no, plate_no=plate_no, medallion_no=medallion_no
        )

        response_items = [
            MiscellaneousExpenseResponse(
                expense_id=exp.expense_id,
                reference_number=exp.reference_number,
                category=exp.category,
                expense_date=exp.expense_date,
                amount=exp.amount,
                notes=exp.notes,
                driver_name=exp.driver.full_name if exp.driver else "N/A",
                lease_id=exp.lease.lease_id if exp.lease else "N/A",
                vin_no=exp.vehicle.vin if exp.vehicle else "N/A",
                vehicle_name=f"{exp.vehicle.year} {exp.vehicle.make} {exp.vehicle.model}" if exp.vehicle else "N/A",
                plate_no=exp.vehicle.registrations[0].plate_number if exp.vehicle and exp.vehicle.registrations else "N/A",
                medallion_no=exp.medallion.medallion_number if exp.medallion else "N/A",
            ) for exp in expenses
        ]
        
        total_pages = math.ceil(total_items / per_page) if per_page > 0 else 0

        return PaginatedMiscellaneousExpenseResponse(
            items=response_items, total_items=total_items, page=page,
            per_page=per_page, total_pages=total_pages
        )
    except Exception as e:
        logger.error("Error fetching miscellaneous expenses: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="An error occurred while fetching miscellaneous expenses.") from e


@router.get("/export", summary="Export Miscellaneous Expenses Data")
def export_misc_expenses(
    format: str = Query("excel", enum=["excel", "pdf"]),
    # Pass through all filters from the list endpoint
    sort_by: Optional[str] = Query("date"),
    sort_order: str = Query("desc"),
    expense_id: Optional[str] = Query(None),
    reference_no: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    expense_date: Optional[date] = Query(None),
    driver_name: Optional[str] = Query(None),
    lease_id: Optional[str] = Query(None),
    vin_no: Optional[str] = Query(None),
    plate_no: Optional[str] = Query(None),
    medallion_no: Optional[str] = Query(None),
    expense_service: MiscellaneousExpenseService = Depends(get_misc_expense_service),
    current_user: User = Depends(get_current_user),
):
    """
    Exports filtered miscellaneous expense data to the specified format.
    """
    try:
        expenses, _ = expense_service.repo.list_expenses(
            page=1, per_page=10000, sort_by=sort_by, sort_order=sort_order,
            expense_id=expense_id, reference_no=reference_no, category=category,
            expense_date=expense_date, driver_name=driver_name, lease_id=lease_id,
            vin=vin_no, plate_no=plate_no, medallion_no=medallion_no
        )

        if not expenses:
            raise HTTPException(status_code=404, detail="No data available for export with the given filters.")

        export_data = [
            MiscellaneousExpenseResponse.from_orm(exp).model_dump() for exp in expenses
        ]
        
        filename = f"miscellaneous_expenses_{date.today()}.{'xlsx' if format == 'excel' else 'pdf'}"
        
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
        logger.error("Error exporting miscellaneous expense data: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="An error occurred during the export process.") from e