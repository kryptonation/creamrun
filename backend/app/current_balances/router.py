"""
app/current_balances/router.py

FastAPI router for Current Balances module
Provides read-only view of weekly financial summaries
"""

from datetime import date, datetime
from typing import Optional
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.users.models import User
from app.users.utils import get_current_user

from app.current_balances.service import CurrentBalancesService
from app.current_balances.schemas import (
    PaginatedCurrentBalancesResponse, CurrentBalanceDetailResponse,
    CurrentBalancesStatisticsResponse, DailyChargeBreakdownResponse,
    CurrentBalancesStubResponse, CurrentBalanceWeeklyRow,
    DTRStatus, LeaseStatus, DriverStatus, PaymentType
)
from app.current_balances.exceptions import (
    InvalidWeekPeriodException, LeaseNotFoundException,
    DataRetrievalException, NoDataFoundException,
)

from app.utils.exporter_utils import ExporterFactory
from app.utils.logger import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/current-balances", tags=["Current Balances"])


# === List Endpoint ===

@router.get(
    "/",
    response_model=PaginatedCurrentBalancesResponse,
    summary="List Current Balances",
    description="""
    Get week-to-date balances for all active leases.
    
    **Default View**: Current week (Sunday to Saturday)
    **Historical View**: Select previous weeks using week_start/week_end
    
    **Features:**
    - Search by lease ID, driver name, hack license, plate, medallion
    - Filter by lease status, driver status, payment type, DTR status
    - Sort by any financial column
    - Paginated results (default 20 per page)
    
    **Financial Data:**
    - Net Earnings (WTD)
    - CC Earnings (WTD)
    - All charge categories (Lease, EZPass, Violations, etc.)
    - Prior balance and deposit amount
    
    **Note:** Current week shows live data (DTR not generated).
    Previous weeks show finalized DTR data.
    """
)
def list_current_balances(
    week_start: Optional[date] = Query(None, description="Week start (Sunday). Defaults to current week."),
    week_end: Optional[date] = Query(None, description="Week end (Saturday). Defaults to current week."),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(None, description="Search by lease ID, driver, hack license, plate, medallion"),
    lease_status: Optional[str] = Query(None, description="Filter by lease status"),
    driver_status: Optional[str] = Query(None, description="Filter by driver status"),
    payment_type: Optional[str] = Query(None, description="Filter by payment type (CASH/ACH)"),
    dtr_status: Optional[str] = Query(None, description="Filter by DTR status"),
    sort_by: str = Query("lease_id", description="Sort field"),
    sort_order: str = Query("asc", pattern="^(asc|desc)$", description="Sort order"),
    use_stub: bool = Query(False, description="Return stub response for testing"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List current balances with comprehensive filtering and sorting
    
    This is the main endpoint for the View Current Balances page.
    """
    try:
        service = CurrentBalancesService(db)
        
        # Return stub response if requested
        if use_stub:
            logger.info(f"Returning stub response for user {current_user.id}")
            return _get_stub_response()
        
        # Use current week if not specified
        if not week_start or not week_end:
            week_start, week_end = service.get_current_week()
            logger.info(f"Using current week: {week_start} to {week_end}")
        
        # Get balances
        result = service.list_current_balances(
            week_start=week_start,
            week_end=week_end,
            page=page,
            page_size=page_size,
            search=search,
            lease_status=lease_status,
            driver_status=driver_status,
            payment_type=payment_type,
            dtr_status=dtr_status,
            sort_by=sort_by,
            sort_order=sort_order
        )
        
        logger.info(
            f"Listed {len(result.items)} balances for user {current_user.id}, "
            f"week {week_start} to {week_end}"
        )
        
        return result
        
    except InvalidWeekPeriodException as e:
        logger.warning(f"Invalid week period: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e.detail)
        )
    except DataRetrievalException as e:
        logger.error(f"Data retrieval error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e.detail)
        )
    except Exception as e:
        logger.error(f"Unexpected error in list_current_balances: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve current balances: {str(e)}"
        )


# === Detail Endpoint (with Daily Breakdown) ===

@router.get(
    "/{lease_id}",
    response_model=CurrentBalanceDetailResponse,
    summary="Get Detailed Balance for Lease",
    description="""
    Get detailed current balance for a specific lease with daily breakdown.
    
    **Returns:**
    - Weekly summary (same as list endpoint)
    - Daily breakdown (Sun-Sat) with earnings and charges per day
    - Delayed charges row (charges from previous weeks)
    
    **Use Case:** When user expands a row in the table to see daily details.
    """
)
def get_lease_balance_detail(
    lease_id: int,
    week_start: Optional[date] = Query(None, description="Week start (Sunday)"),
    week_end: Optional[date] = Query(None, description="Week end (Saturday)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get detailed balance with daily breakdown for a specific lease
    """
    try:
        service = CurrentBalancesService(db)
        
        # Use current week if not specified
        if not week_start or not week_end:
            week_start, week_end = service.get_current_week()
        
        # Get detailed balance
        result = service.get_detailed_balance(lease_id, week_start, week_end)
        
        logger.info(
            f"Retrieved detailed balance for lease {lease_id}, "
            f"user {current_user.id}"
        )
        
        return result
        
    except LeaseNotFoundException as e:
        logger.warning(f"Lease not found: {lease_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e.detail)
        )
    except InvalidWeekPeriodException as e:
        logger.warning(f"Invalid week period: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e.detail)
        )
    except DataRetrievalException as e:
        logger.error(f"Data retrieval error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e.detail)
        )
    except Exception as e:
        logger.error(
            f"Unexpected error getting balance detail for lease {lease_id}: {str(e)}",
            exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve balance detail: {str(e)}"
        )


# === Daily Charge Detail Endpoint ===

@router.get(
    "/{lease_id}/daily-charges",
    response_model=DailyChargeBreakdownResponse,
    summary="Get Daily Charge Details",
    description="""
    Get detailed charge information for a specific day and category.
    
    **Use Case:** When user clicks on a charge amount in the daily breakdown
    to see individual transaction details.
    
    **Returns:**
    - List of individual charges/transactions
    - Each with date, time, amount, description, reference number
    - Shows original charge date if delayed
    - Shows system entry date
    """
)
def get_daily_charge_details(
    lease_id: int,
    target_date: date = Query(..., description="Date to get charge details for"),
    category: str = Query(..., description="Category (EZPASS, VIOLATIONS, TLC, MTA_TIF)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get detailed breakdown of charges for a specific day and category
    
    This populates the detail popup/panel when user clicks a charge amount.
    """
    try:
        service = CurrentBalancesService(db)
        
        result = service.get_daily_charge_details(lease_id, target_date, category)
        
        logger.info(
            f"Retrieved daily charge details for lease {lease_id}, "
            f"date {target_date}, category {category}, user {current_user.id}"
        )
        
        return result
        
    except LeaseNotFoundException as e:
        logger.warning(f"Lease not found: {lease_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e.detail)
        )
    except DataRetrievalException as e:
        logger.error(f"Data retrieval error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e.detail)
        )
    except Exception as e:
        logger.error(
            f"Unexpected error getting daily charges for lease {lease_id}: {str(e)}",
            exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve daily charge details: {str(e)}"
        )


# === Statistics Endpoint ===

@router.get(
    "/statistics/summary",
    response_model=CurrentBalancesStatisticsResponse,
    summary="Get Weekly Statistics",
    description="""
    Get aggregate statistics for the week.
    
    **Returns:**
    - Total number of leases
    - Total CC earnings
    - Total deductions
    - Total net earnings
    - Average net per lease
    - Overall DTR status
    
    **Use Case:** Dashboard summary or reporting.
    """
)
def get_statistics(
    week_start: Optional[date] = Query(None, description="Week start (Sunday)"),
    week_end: Optional[date] = Query(None, description="Week end (Saturday)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get aggregate statistics for the week"""
    try:
        service = CurrentBalancesService(db)
        
        # Use current week if not specified
        if not week_start or not week_end:
            week_start, week_end = service.get_current_week()
        
        result = service.get_statistics(week_start, week_end)
        
        logger.info(
            f"Retrieved statistics for week {week_start} to {week_end}, "
            f"user {current_user.id}"
        )
        
        return result
        
    except InvalidWeekPeriodException as e:
        logger.warning(f"Invalid week period: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e.detail)
        )
    except DataRetrievalException as e:
        logger.error(f"Data retrieval error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e.detail)
        )
    except Exception as e:
        logger.error(f"Unexpected error getting statistics: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve statistics: {str(e)}"
        )


# === Stub Response Helper ===

def _get_stub_response() -> CurrentBalancesStubResponse:
    """Generate stub response for testing"""
    current_week_start, current_week_end = CurrentBalancesService(Session()).get_current_week()
    
    stub_items = [
        CurrentBalanceWeeklyRow(
            lease_id=1045,
            driver_name="John Doe",
            hack_license="5087912",
            vehicle_plate="T123456",
            medallion_number="1W47",
            net_earnings=Decimal("320.00"),
            cc_earnings_wtd=Decimal("780.00"),
            lease_fee=Decimal("400.00"),
            ezpass_wtd=Decimal("25.00"),
            mta_tif_wtd=Decimal("13.50"),
            violations_wtd=Decimal("0.00"),
            tlc_tickets_wtd=Decimal("0.00"),
            repairs_wtd_due=Decimal("0.00"),
            loans_wtd_due=Decimal("0.00"),
            misc_charges_wtd=Decimal("21.50"),
            deposit_amount=Decimal("500.00"),
            prior_balance=Decimal("0.00"),
            payment_type=PaymentType.CASH,
            lease_status=LeaseStatus.ACTIVE,
            driver_status=DriverStatus.ACTIVE,
            dtr_status=DTRStatus.NOT_GENERATED
        ),
        CurrentBalanceWeeklyRow(
            lease_id=1046,
            driver_name="Jane Smith",
            hack_license="5098123",
            vehicle_plate="T234567",
            medallion_number="2W48",
            net_earnings=Decimal("450.50"),
            cc_earnings_wtd=Decimal("920.00"),
            lease_fee=Decimal("400.00"),
            ezpass_wtd=Decimal("32.50"),
            mta_tif_wtd=Decimal("18.00"),
            violations_wtd=Decimal("19.00"),
            tlc_tickets_wtd=Decimal("0.00"),
            repairs_wtd_due=Decimal("0.00"),
            loans_wtd_due=Decimal("0.00"),
            misc_charges_wtd=Decimal("0.00"),
            deposit_amount=Decimal("500.00"),
            prior_balance=Decimal("-50.00"),
            payment_type=PaymentType.ACH,
            lease_status=LeaseStatus.ACTIVE,
            driver_status=DriverStatus.ACTIVE,
            dtr_status=DTRStatus.NOT_GENERATED
        ),
        CurrentBalanceWeeklyRow(
            lease_id=1047,
            driver_name="Mike Johnson",
            hack_license="5109234",
            vehicle_plate="T345678",
            medallion_number="3W49",
            net_earnings=Decimal("125.75"),
            cc_earnings_wtd=Decimal("650.00"),
            lease_fee=Decimal("400.00"),
            ezpass_wtd=Decimal("28.25"),
            mta_tif_wtd=Decimal("13.50"),
            violations_wtd=Decimal("50.00"),
            tlc_tickets_wtd=Decimal("32.50"),
            repairs_wtd_due=Decimal("0.00"),
            loans_wtd_due=Decimal("0.00"),
            misc_charges_wtd=Decimal("0.00"),
            deposit_amount=Decimal("500.00"),
            prior_balance=Decimal("0.00"),
            payment_type=PaymentType.CASH,
            lease_status=LeaseStatus.ACTIVE,
            driver_status=DriverStatus.ACTIVE,
            dtr_status=DTRStatus.NOT_GENERATED
        )
    ]
    
    return CurrentBalancesStubResponse(
        items=stub_items,
        total=3,
        page=1,
        page_size=20,
        total_pages=1,
        week_start=current_week_start,
        week_end=current_week_end,
        last_updated=datetime.now(),
        is_stub=True
    )
"""
app/current_balances/router.py - Part 2

Export endpoint with comprehensive filtering
"""

from decimal import Decimal


# === Export Endpoint ===

@router.get(
    "/export/{format}",
    summary="Export Current Balances",
    description="""
    Export current balances to Excel, PDF, CSV, or JSON format.
    
    **Supported Formats:** excel, pdf, csv, json
    
    **Features:**
    - Supports all same filters as list endpoint
    - No pagination limit (exports all matching records)
    - Formatted for reporting and reconciliation
    
    **Use Case:** Download weekly balances for external analysis or reporting.
    """
)
def export_current_balances(
    format: str,
    week_start: Optional[date] = Query(None, description="Week start (Sunday)"),
    week_end: Optional[date] = Query(None, description="Week end (Saturday)"),
    search: Optional[str] = Query(None, description="Search term"),
    lease_status: Optional[str] = Query(None, description="Filter by lease status"),
    driver_status: Optional[str] = Query(None, description="Filter by driver status"),
    payment_type: Optional[str] = Query(None, description="Filter by payment type"),
    dtr_status: Optional[str] = Query(None, description="Filter by DTR status"),
    sort_by: str = Query("lease_id", description="Sort field"),
    sort_order: str = Query("asc", pattern="^(asc|desc)$", description="Sort order"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Export current balances to file
    
    Exports all matching records (no pagination) to the specified format.
    """
    try:
        # Validate format
        if format.lower() not in ['excel', 'pdf', 'csv', 'json']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid format. Supported: excel, pdf, csv, json"
            )
        
        service = CurrentBalancesService(db)
        
        # Use current week if not specified
        if not week_start or not week_end:
            week_start, week_end = service.get_current_week()
        
        # Get all balances (no pagination for export)
        result = service.list_current_balances(
            week_start=week_start,
            week_end=week_end,
            page=1,
            page_size=10000,  # Large number to get all records
            search=search,
            lease_status=lease_status,
            driver_status=driver_status,
            payment_type=payment_type,
            dtr_status=dtr_status,
            sort_by=sort_by,
            sort_order=sort_order
        )
        
        if not result.items:
            raise NoDataFoundException(
                "No balance data found for export with the specified filters"
            )
        
        # Prepare data for export
        export_data = []
        for row in result.items:
            export_data.append({
                "Lease ID": row.lease_id,
                "Driver Name": row.driver_name,
                "Hack License": row.hack_license or "",
                "Vehicle Plate": row.vehicle_plate or "",
                "Medallion Number": row.medallion_number or "",
                "Net Earnings": float(row.net_earnings),
                "CC Earnings WTD": float(row.cc_earnings_wtd),
                "Lease Fee": float(row.lease_fee),
                "EZ-Pass WTD": float(row.ezpass_wtd),
                "MTA/TIF WTD": float(row.mta_tif_wtd),
                "Violations WTD": float(row.violations_wtd),
                "TLC Tickets WTD": float(row.tlc_tickets_wtd),
                "Repairs WTD Due": float(row.repairs_wtd_due),
                "Loans WTD Due": float(row.loans_wtd_due),
                "Misc Charges WTD": float(row.misc_charges_wtd),
                "Deposit Amount": float(row.deposit_amount),
                "Prior Balance": float(row.prior_balance),
                "Payment Type": row.payment_type.value,
                "Lease Status": row.lease_status.value,
                "Driver Status": row.driver_status.value,
                "DTR Status": row.dtr_status.value,
                "Week Start": week_start.isoformat(),
                "Week End": week_end.isoformat()
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
        
        filename = f"current_balances_{week_start.strftime('%Y%m%d')}_{week_end.strftime('%Y%m%d')}.{extensions[format.lower()]}"
        
        logger.info(
            f"Exported {len(result.items)} balances to {format} by user {current_user.id}"
        )
        
        return StreamingResponse(
            file_buffer,
            media_type=media_types[format.lower()],
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )
        
    except NoDataFoundException as e:
        logger.warning(f"No data found for export: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e.detail)
        ) from e
    except InvalidWeekPeriodException as e:
        logger.warning(f"Invalid week period: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e.detail)
        ) from e
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to export current balances: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to export current balances: {str(e)}"
        ) from e
