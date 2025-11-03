### app/loans/router.py

import math
from datetime import date
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.bpm.services import bpm_service
from app.core.db import get_db
from app.core.dependencies import get_db_with_current_user
from app.loans.exceptions import LoanNotFoundError
from app.loans.schemas import (
    DriverLoanDetailResponse,
    DriverLoanListResponse,
    LoanInstallmentResponse,
    PaginatedDriverLoanResponse,
)
from app.loans.services import LoanService
from app.loans.models import LoanInstallmentStatus
from app.loans.stubs import create_stub_loan_response
from app.users.models import User
from app.users.utils import get_current_user
from app.utils.exporter.excel_exporter import ExcelExporter
from app.utils.exporter.pdf_exporter import PDFExporter
from app.utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/payments/driver-loans", tags=["Driver Loans"])

# Dependency to inject the LoanService
def get_loan_service(db: Session = Depends(get_db)) -> LoanService:
    return LoanService(db)

@router.get("", response_model=PaginatedDriverLoanResponse, summary="List Driver Loans")
def list_driver_loans(
    use_stubs: bool = Query(False, description="Return stubbed data for testing."),
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=100),
    sort_by: Optional[str] = Query("start_week"),
    sort_order: str = Query("desc", enum=["asc", "desc"]),
    loan_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    driver_name: Optional[str] = Query(None),
    medallion_no: Optional[str] = Query(None),
    lease_type: Optional[str] = Query(None),
    start_week: Optional[date] = Query(None),
    loan_service: LoanService = Depends(get_loan_service),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieves a paginated and filterable list of all driver loans.
    """
    if use_stubs:
        return create_stub_loan_response(page, per_page)
    
    try:
        loans, total_items = loan_service.repo.list_loans(
            page=page, per_page=per_page, sort_by=sort_by, sort_order=sort_order,
            loan_id=loan_id, status=status, driver_name=driver_name,
            medallion_no=medallion_no, lease_type=lease_type, start_week=start_week
        )

        response_items = [
            DriverLoanListResponse.model_validate(loan) for loan in loans
        ]
        
        total_pages = math.ceil(total_items / per_page) if per_page > 0 else 0

        return PaginatedDriverLoanResponse(
            items=response_items, total_items=total_items, page=page,
            per_page=per_page, total_pages=total_pages
        )
    except Exception as e:
        logger.error("Error fetching driver loans: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="An error occurred while fetching driver loans.")

@router.post("/create-case", summary="Create a New Driver Loan Case", status_code=status.HTTP_201_CREATED)
def create_driver_loan_case(
    db: Session = Depends(get_db_with_current_user),
    current_user: User = Depends(get_current_user),
):
    """
    Initiates a new BPM workflow for manually creating a Driver Loan.
    """
    try:
        new_case = bpm_service.create_case(db, prefix="DRLNS", user=current_user)
        return {
            "message": "New Create Driver Loan case started successfully.",
            "case_no": new_case.case_no,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error("Error creating driver loan case: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Could not start a new driver loan case.")


@router.get("/{loan_id}", response_model=DriverLoanDetailResponse, summary="View Driver Loan Details")
def get_loan_details(
    loan_id: str,
    loan_service: LoanService = Depends(get_loan_service),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieves the detailed view of a single driver loan, including its repayment schedule.
    """
    try:
        loan = loan_service.repo.get_loan_by_loan_id(loan_id)
        if not loan:
            raise LoanNotFoundError(loan_id)

        total_paid = sum(
            inst.principal_amount for inst in loan.installments if inst.status == LoanInstallmentStatus.PAID
        )
        remaining_balance = loan.principal_amount - total_paid
        installments_progress = f"{len([i for i in loan.installments if i.status == LoanInstallmentStatus.PAID])}/{len(loan.installments)}"

        driver_details = {"name": loan.driver.full_name}
        lease_details = {"lease_id": loan.lease.lease_id, "type": loan.lease.lease_type}

        schedule_response = []
        balance = loan.principal_amount
        prior_balance_agg = Decimal("0.0")
        for inst in sorted(loan.installments, key=lambda x: x.week_start_date):
            schedule_response.append(
                LoanInstallmentResponse(
                    installment_id=inst.installment_id,
                    week_period=f"{inst.week_start_date.strftime('%m/%d/%Y')} - {inst.week_end_date.strftime('%m/%d/%Y')}",
                    principal_amount=inst.principal_amount,
                    interest_amount=inst.interest_amount,
                    total_due=inst.total_due,
                    prior_balance=prior_balance_agg,
                    balance=balance - inst.principal_amount,
                    status=inst.status,
                    posted_on=inst.posted_on.date() if inst.posted_on else None,
                )
            )
            balance -= inst.principal_amount
            if inst.status == LoanInstallmentStatus.PAID:
                prior_balance_agg += inst.principal_amount
        
        return DriverLoanDetailResponse(
            loan_id=loan.loan_id,
            principal_amount=loan.principal_amount,
            status=loan.status,
            loan_details={
                "loan_id": loan.loan_id,
                "principal": loan.principal_amount,
                "interest_rate": loan.interest_rate,
                "start_week": loan.start_week,
                "medallion_no": loan.medallion.medallion_number,
                "paid": total_paid,
                "remaining": remaining_balance,
                "progress": installments_progress,
            },
            driver_details=driver_details,
            lease_details=lease_details,
            payment_schedule=schedule_response,
        )
    except LoanNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        logger.error(f"Error fetching details for loan ID {loan_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="An error occurred while fetching loan details.")


@router.get("/export", summary="Export Driver Loan Data")
def export_loans(
    format: str = Query("excel", enum=["excel", "pdf"]),
    sort_by: Optional[str] = Query("start_week"),
    sort_order: str = Query("desc"),
    loan_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    driver_name: Optional[str] = Query(None),
    medallion_no: Optional[str] = Query(None),
    lease_type: Optional[str] = Query(None),
    start_week: Optional[date] = Query(None),
    loan_service: LoanService = Depends(get_loan_service),
    current_user: User = Depends(get_current_user),
):
    """
    Exports filtered driver loan data to the specified format.
    """
    try:
        loans, _ = loan_service.repo.list_loans(
            page=1, per_page=10000, sort_by=sort_by, sort_order=sort_order,
            loan_id=loan_id, status=status, driver_name=driver_name,
            medallion_no=medallion_no, lease_type=lease_type, start_week=start_week
        )

        if not loans:
            raise HTTPException(status_code=404, detail="No loan data for export with the given filters.")

        export_data = [DriverLoanListResponse.model_validate(loan).model_dump() for loan in loans]
        
        filename = f"driver_loans_{date.today()}.{'xlsx' if format == 'excel' else 'pdf'}"
        
        if format == "excel":
            exporter = ExcelExporter(export_data)
            file_content = exporter.export()
            media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        else:
            exporter = PDFExporter(export_data)
            file_content = exporter.export()
            media_type = "application/pdf"
        
        headers = {"Content-Disposition": f"attachment; filename={filename}"}
        return StreamingResponse(file_content, media_type=media_type, headers=headers)

    except Exception as e:
        logger.error("Error exporting loan data: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="An error occurred during the export process.")