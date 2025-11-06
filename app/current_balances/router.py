"""
app/current_balances/router.py

FastAPI router for Current Balances endpoints
"""

from datetime import date, datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.users.models import User
from app.users.utils import get_current_user
from app.current_balances.services import CurrentBalancesService
from app.current_balances.schemas import (
    CurrentBalancesResponse,
    CurrentBalancesFilter,
    WeeklyBalanceDetail,
    WeekPeriod,
    LeaseStatusEnum,
    DriverStatusEnum,
    PaymentTypeEnum,
    DTRStatusEnum
)
from app.utils.logger import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/current-balances", tags=["Current Balances"])


def get_service(db: Session = Depends(get_db)) -> CurrentBalancesService:
    """Dependency to get CurrentBalancesService instance"""
    return CurrentBalancesService(db)


@router.get(
    "",
    response_model=CurrentBalancesResponse,
    summary="Get current balances for all leases",
    description="Displays week-to-date financial position for each lease. Current week shows live data, past weeks show finalized DTR data."
)
async def get_current_balances(
    week_start: Optional[date] = Query(
        None,
        description="Week start date (Sunday). If not provided, defaults to current week."
    ),
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(25, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(
        None,
        description="Search by lease ID, driver name, TLC license, medallion number, or plate number"
    ),
    lease_status: Optional[LeaseStatusEnum] = Query(None, description="Filter by lease status"),
    driver_status: Optional[DriverStatusEnum] = Query(None, description="Filter by driver status"),
    payment_type: Optional[PaymentTypeEnum] = Query(None, description="Filter by payment type"),
    dtr_status: Optional[DTRStatusEnum] = Query(None, description="Filter by DTR status"),
    service: CurrentBalancesService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """
    Get current balances for all active leases for a specific week.
    
    - For the current week: Shows real-time, live calculated data (DTR Status = NOT_GENERATED)
    - For past weeks: Shows finalized data from generated DTRs (DTR Status = GENERATED)
    
    The week is always Sunday to Saturday. If no week_start is provided, defaults to the current week.
    """
    try:
        # Determine week range
        if week_start is None:
            week_start, week_end = service.get_current_week()
        else:
            # Validate that week_start is a Sunday
            if week_start.weekday() != 6:  # 6 = Sunday in Python
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="week_start must be a Sunday"
                )
            week_end = week_start + timedelta(days=6)
        
        # Create filters
        filters = CurrentBalancesFilter(
            search=search,
            lease_status=lease_status,
            driver_status=driver_status,
            payment_type=payment_type,
            dtr_status=dtr_status
        )
        
        # Get balances
        balance_rows, total_items = service.get_lease_balances(
            week_start=week_start,
            week_end=week_end,
            page=page,
            per_page=per_page,
            filters=filters
        )
        
        # Create week period info
        week_period = service.create_week_period(week_start, week_end)
        
        # Calculate total pages
        total_pages = (total_items + per_page - 1) // per_page
        
        logger.info(
            f"Retrieved {len(balance_rows)} balance rows for week {week_start} to {week_end}",
            user_id=current_user.id
        )
        
        return CurrentBalancesResponse(
            week_period=week_period,
            items=balance_rows,
            total_items=total_items,
            page=page,
            per_page=per_page,
            total_pages=total_pages,
            last_refresh=datetime.utcnow()
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching current balances: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while fetching current balances"
        ) from e


@router.get(
    "/lease/{lease_id}",
    response_model=WeeklyBalanceDetail,
    summary="Get detailed balance for a specific lease",
    description="Returns detailed balance with daily breakdown and delayed charges for a specific lease"
)
async def get_lease_balance_detail(
    lease_id: str,
    week_start: Optional[date] = Query(
        None,
        description="Week start date (Sunday). Defaults to current week if not provided."
    ),
    service: CurrentBalancesService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """
    Get detailed balance for a specific lease including:
    - All financial data
    - Daily breakdown (Sunday through Saturday)
    - Delayed charges from previous weeks
    
    This is used for the expandable row view in the UI.
    """
    try:
        # Determine week range
        if week_start is None:
            week_start, week_end = service.get_current_week()
        else:
            # Validate that week_start is a Sunday
            if week_start.weekday() != 6:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="week_start must be a Sunday"
                )
            week_end = week_start + timedelta(days=6)
        
        # Get detailed balance
        detail = service.get_lease_detail_with_daily_breakdown(
            lease_id=lease_id,
            week_start=week_start,
            week_end=week_end
        )
        
        if not detail:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Lease with ID {lease_id} not found"
            )
        
        # Add week period info
        week_period = service.create_week_period(week_start, week_end)
        detail['week_period'] = week_period
        
        logger.info(
            f"Retrieved detailed balance for lease {lease_id}, week {week_start}",
            user_id=current_user.id
        )
        
        return WeeklyBalanceDetail(**detail)
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching lease balance detail: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while fetching lease balance detail"
        ) from e


@router.get(
    "/weeks/available",
    response_model=list[WeekPeriod],
    summary="Get list of available weeks",
    description="Returns a list of weeks that can be queried (current week and past finalized weeks)"
)
async def get_available_weeks(
    limit: int = Query(12, ge=1, le=52, description="Number of past weeks to include"),
    service: CurrentBalancesService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """
    Get a list of available weeks for querying.
    
    Returns the current week plus the specified number of past weeks.
    Users can only view full weeks (Sunday to Saturday).
    """
    try:
        weeks = []
        current_week_start, current_week_end = service.get_current_week()
        
        # Add current week
        weeks.append(service.create_week_period(current_week_start, current_week_end))
        
        # Add past weeks
        for i in range(1, limit + 1):
            week_start = current_week_start - timedelta(days=7 * i)
            week_end = week_start + timedelta(days=6)
            weeks.append(service.create_week_period(week_start, week_end))
        
        logger.info(f"Retrieved {len(weeks)} available weeks", user_id=current_user.id)
        
        return weeks
    
    except Exception as e:
        logger.error(f"Error fetching available weeks: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while fetching available weeks"
        ) from e


@router.get(
    "/summary",
    summary="Get summary statistics for current balances",
    description="Returns aggregate statistics for the current week"
)
async def get_balances_summary(
    week_start: Optional[date] = Query(None, description="Week start date (Sunday)"),
    service: CurrentBalancesService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """
    Get summary statistics for current balances.
    
    Returns aggregated data like:
    - Total number of active leases
    - Total CC earnings
    - Total deductions
    - Total net earnings
    - Number of leases by DTR status
    """
    try:
        # Determine week range
        if week_start is None:
            week_start, week_end = service.get_current_week()
        else:
            if week_start.weekday() != 6:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="week_start must be a Sunday"
                )
            week_end = week_start + timedelta(days=6)
        
        # Get all balances (no pagination)
        balance_rows, total_items = service.get_lease_balances(
            week_start=week_start,
            week_end=week_end,
            page=1,
            per_page=10000,  # Get all
            filters=None
        )
        
        # Calculate summary statistics
        from decimal import Decimal
        
        total_cc_earnings = sum(row.cc_earnings for row in balance_rows)
        total_deductions = sum(row.subtotal_deductions for row in balance_rows)
        total_net_earnings = sum(row.net_earnings for row in balance_rows)
        
        dtrs_generated = sum(1 for row in balance_rows if row.dtr_status == DTRStatusEnum.GENERATED)
        dtrs_not_generated = sum(1 for row in balance_rows if row.dtr_status == DTRStatusEnum.NOT_GENERATED)
        
        ach_count = sum(1 for row in balance_rows if row.payment_type == PaymentTypeEnum.ACH)
        cash_count = sum(1 for row in balance_rows if row.payment_type == PaymentTypeEnum.CASH)
        
        week_period = service.create_week_period(week_start, week_end)
        
        logger.info(
            f"Generated summary for week {week_start} to {week_end}",
            user_id=current_user.id
        )
        
        return {
            "week_period": week_period,
            "total_leases": total_items,
            "total_cc_earnings": float(total_cc_earnings),
            "total_deductions": float(total_deductions),
            "total_net_earnings": float(total_net_earnings),
            "dtrs_generated": dtrs_generated,
            "dtrs_not_generated": dtrs_not_generated,
            "payment_breakdown": {
                "ach": ach_count,
                "cash": cash_count
            },
            "generated_at": datetime.utcnow()
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating balances summary: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while generating summary"
        ) from e


@router.post(
    "/export",
    summary="Export current balances",
    description="Export current balances data to Excel or CSV format"
)
async def export_current_balances(
    week_start: Optional[date] = Query(None, description="Week start date (Sunday)"),
    format: str = Query("excel", regex="^(excel|csv)$", description="Export format"),
    search: Optional[str] = Query(None, description="Search filter"),
    lease_status: Optional[LeaseStatusEnum] = Query(None),
    driver_status: Optional[DriverStatusEnum] = Query(None),
    payment_type: Optional[PaymentTypeEnum] = Query(None),
    dtr_status: Optional[DTRStatusEnum] = Query(None),
    service: CurrentBalancesService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """
    Export current balances data to Excel or CSV.
    
    The export includes all filtered data (not paginated) for the specified week.
    """
    try:
        # Determine week range
        if week_start is None:
            week_start, week_end = service.get_current_week()
        else:
            if week_start.weekday() != 6:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="week_start must be a Sunday"
                )
            week_end = week_start + timedelta(days=6)
        
        # Create filters
        filters = CurrentBalancesFilter(
            search=search,
            lease_status=lease_status,
            driver_status=driver_status,
            payment_type=payment_type,
            dtr_status=dtr_status
        )
        
        # Get all balances (no pagination for export)
        balance_rows, _ = service.get_lease_balances(
            week_start=week_start,
            week_end=week_end,
            page=1,
            per_page=10000,
            filters=filters
        )
        
        # Convert to export format
        from io import BytesIO
        import pandas as pd
        from fastapi.responses import StreamingResponse
        
        # Prepare data
        data = []
        for row in balance_rows:
            data.append({
                'Lease ID': row.lease_id,
                'Driver Name': row.driver_name,
                'TLC License': row.tlc_license or '',
                'Medallion': row.medallion_number,
                'Plate': row.plate_number,
                'Lease Status': row.lease_status.value,
                'DTR Status': row.dtr_status.value,
                'Payment Type': row.payment_type.value,
                'CC Earnings': float(row.cc_earnings),
                'Lease Fee': float(row.weekly_lease_fee),
                'MTA/TIF': float(row.mta_tif),
                'EZPass': float(row.ezpass_tolls),
                'PVB Violations': float(row.pvb_violations),
                'TLC Tickets': float(row.tlc_tickets),
                'Repairs WTD': float(row.repairs_wtd),
                'Loans WTD': float(row.loans_wtd),
                'Misc Charges': float(row.misc_charges),
                'Subtotal': float(row.subtotal_deductions),
                'Prior Balance': float(row.prior_balance),
                'Net Earnings': float(row.net_earnings)
            })
        
        df = pd.DataFrame(data)
        
        # Generate file
        output = BytesIO()
        
        if format == "excel":
            df.to_excel(output, index=False, engine='openpyxl')
            media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            filename = f"current_balances_{week_start}.xlsx"
        else:  # csv
            df.to_csv(output, index=False)
            media_type = "text/csv"
            filename = f"current_balances_{week_start}.csv"
        
        output.seek(0)
        
        logger.info(
            f"Exported current balances in {format} format for week {week_start}",
            user_id=current_user.id
        )
        
        return StreamingResponse(
            output,
            media_type=media_type,
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error exporting current balances: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while exporting data"
        ) from e