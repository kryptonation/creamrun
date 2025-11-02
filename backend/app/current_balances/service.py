"""
app/current_balances/service.py

Service layer for Current Balances module
Contains business logic and orchestration
"""

from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import List, Optional, Tuple
from math import ceil

from sqlalchemy.orm import Session

from app.current_balances.repository import CurrentBalancesRepository
from app.current_balances.schemas import (
    CurrentBalanceWeeklyRow, PaginatedCurrentBalancesResponse,
    CurrentBalanceDetailResponse, DailyBreakdownItem,
    DelayedChargesBreakdown, CurrentBalancesStatisticsResponse,
    DailyChargeBreakdownResponse, DailyChargeDetail,
    DTRStatus, LeaseStatus, DriverStatus, PaymentType
)
from app.current_balances.exceptions import (
    InvalidWeekPeriodException, LeaseNotFoundException,
    DataRetrievalException, DailyBreakdownException,
    StatisticsCalculationException
)
from app.ledger.models import PostingCategory
from app.utils.logger import get_logger

logger = get_logger(__name__)


class CurrentBalancesService:
    """Service for current balances business logic"""
    
    def __init__(self, db: Session):
        self.db = db
        self.repo = CurrentBalancesRepository(db)
    
    def get_current_week(self) -> Tuple[date, date]:
        """Get current week period (Sunday to Saturday)"""
        return self.repo.get_current_week_period()
    
    def validate_week_period(self, week_start: date, week_end: date) -> None:
        """
        Validate week period
        
        Raises:
            InvalidWeekPeriodException if invalid
        """
        try:
            self.repo.validate_week_period(week_start, week_end)
        except ValueError as e:
            logger.warning(f"Invalid week period: {str(e)}")
            raise InvalidWeekPeriodException(str(e))
    
    def get_balance_for_lease(
        self,
        lease_id: int,
        week_start: date,
        week_end: date,
        include_daily_breakdown: bool = False
    ) -> CurrentBalanceWeeklyRow:
        """
        Get current balance for a single lease
        
        Args:
            lease_id: Lease ID
            week_start: Week start date
            week_end: Week end date
            include_daily_breakdown: Whether to include daily breakdown
            
        Returns:
            CurrentBalanceWeeklyRow with balance data
            
        Raises:
            LeaseNotFoundException if lease not found
            DataRetrievalException on data errors
        """
        try:
            # Get lease details
            lease = self.repo.get_lease_by_id(lease_id)
            if not lease:
                raise LeaseNotFoundException(lease_id)
            
            # Build weekly row
            weekly_row = self._build_weekly_row(lease, week_start, week_end)
            
            # Add daily breakdown if requested
            if include_daily_breakdown:
                daily_breakdown = self._build_daily_breakdown(
                    lease.id, lease.driver_id, week_start, week_end
                )
                delayed_charges = self._build_delayed_charges(
                    lease.id, lease.driver_id, week_start, week_end
                )
                weekly_row.daily_breakdown = daily_breakdown
                weekly_row.delayed_charges = delayed_charges
            
            logger.info(f"Retrieved balance for lease {lease_id}")
            return weekly_row
            
        except LeaseNotFoundException:
            raise
        except Exception as e:
            logger.error(f"Error getting balance for lease {lease_id}: {str(e)}", exc_info=True)
            raise DataRetrievalException(str(e))
    
    def list_current_balances(
        self,
        week_start: date,
        week_end: date,
        page: int = 1,
        page_size: int = 20,
        search: Optional[str] = None,
        lease_status: Optional[str] = None,
        driver_status: Optional[str] = None,
        payment_type: Optional[str] = None,
        dtr_status: Optional[str] = None,
        sort_by: str = "lease_id",
        sort_order: str = "asc"
    ) -> PaginatedCurrentBalancesResponse:
        """
        List current balances with pagination and filters
        
        Args:
            week_start: Week start date
            week_end: Week end date
            page: Page number (1-indexed)
            page_size: Items per page
            search: Search term
            lease_status: Filter by lease status
            driver_status: Filter by driver status
            payment_type: Filter by payment type
            dtr_status: Filter by DTR status
            sort_by: Sort field
            sort_order: asc or desc
            
        Returns:
            PaginatedCurrentBalancesResponse
            
        Raises:
            InvalidWeekPeriodException if week invalid
            DataRetrievalException on errors
        """
        try:
            # Validate week period
            self.validate_week_period(week_start, week_end)
            
            # Get total count
            total_count = self.repo.count_leases_for_week(
                week_start, week_end, search, lease_status, driver_status, payment_type
            )
            
            if total_count == 0:
                logger.info("No balances found for given filters")
                return PaginatedCurrentBalancesResponse(
                    items=[],
                    total=0,
                    page=page,
                    page_size=page_size,
                    total_pages=0,
                    week_start=week_start,
                    week_end=week_end,
                    last_updated=datetime.now()
                )
            
            # Get leases for current page
            offset = (page - 1) * page_size
            leases = self.repo.get_active_leases_for_week(
                week_start, week_end, search, lease_status, driver_status, payment_type
            )
            
            # Build weekly rows for each lease
            weekly_rows = []
            for lease in leases:
                try:
                    row = self._build_weekly_row(lease, week_start, week_end)
                    
                    # Apply DTR status filter if specified
                    if dtr_status and row.dtr_status.value != dtr_status:
                        continue
                    
                    weekly_rows.append(row)
                except Exception as e:
                    logger.error(f"Error building row for lease {lease.id}: {str(e)}")
                    continue
            
            # Apply sorting
            weekly_rows = self._sort_balance_rows(weekly_rows, sort_by, sort_order)
            
            # Apply pagination
            start_idx = offset
            end_idx = offset + page_size
            paginated_rows = weekly_rows[start_idx:end_idx]
            
            total_pages = ceil(len(weekly_rows) / page_size)
            
            logger.info(
                f"Retrieved {len(paginated_rows)} balances (page {page}/{total_pages})"
            )
            
            return PaginatedCurrentBalancesResponse(
                items=paginated_rows,
                total=len(weekly_rows),
                page=page,
                page_size=page_size,
                total_pages=total_pages,
                week_start=week_start,
                week_end=week_end,
                last_updated=datetime.now()
            )
            
        except InvalidWeekPeriodException:
            raise
        except Exception as e:
            logger.error(f"Error listing current balances: {str(e)}", exc_info=True)
            raise DataRetrievalException(str(e))
    
    def _build_weekly_row(
        self,
        lease,
        week_start: date,
        week_end: date
    ) -> CurrentBalanceWeeklyRow:
        """
        Build weekly balance row for a lease
        
        Args:
            lease: Lease object
            week_start: Week start
            week_end: Week end
            
        Returns:
            CurrentBalanceWeeklyRow
        """
        driver = lease.driver
        vehicle = lease.vehicle
        medallion = lease.medallion
        
        # Get financial data from repository
        cc_earnings = self.repo.get_cc_earnings_for_week(
            lease.id, driver.id, week_start, week_end
        )
        
        lease_fee = self.repo.get_charges_wtd_by_category(
            lease.id, driver.id, week_start, week_end, PostingCategory.LEASE
        )
        
        ezpass = self.repo.get_charges_wtd_by_category(
            lease.id, driver.id, week_start, week_end, PostingCategory.EZPASS
        )
        
        # MTA/TIF is represented as TAXES in ledger
        mta_tif = self.repo.get_charges_wtd_by_category(
            lease.id, driver.id, week_start, week_end, PostingCategory.TAXES
        )
        
        violations = self.repo.get_charges_wtd_by_category(
            lease.id, driver.id, week_start, week_end, PostingCategory.PVB
        )
        
        tlc_tickets = self.repo.get_charges_wtd_by_category(
            lease.id, driver.id, week_start, week_end, PostingCategory.TLC
        )
        
        repairs = self.repo.get_charges_wtd_by_category(
            lease.id, driver.id, week_start, week_end, PostingCategory.REPAIRS
        )
        
        loans = self.repo.get_charges_wtd_by_category(
            lease.id, driver.id, week_start, week_end, PostingCategory.LOANS
        )
        
        misc_charges = self.repo.get_charges_wtd_by_category(
            lease.id, driver.id, week_start, week_end, PostingCategory.MISC
        )
        
        prior_balance = self.repo.get_prior_balance(
            lease.id, driver.id, week_start
        )
        
        # Calculate net earnings
        total_deductions = (
            lease_fee + ezpass + mta_tif + violations + tlc_tickets +
            repairs + loans + misc_charges
        )
        net_earnings = cc_earnings - total_deductions
        
        # Get DTR status
        dtr_status_str = self.repo.get_dtr_status_for_week(
            lease.id, week_start, week_end
        )
        
        # Map database enums to response enums
        lease_status_enum = LeaseStatus(lease.lease_status.value) if hasattr(lease.lease_status, 'value') else LeaseStatus.ACTIVE
        driver_status_enum = DriverStatus(driver.driver_status.value) if hasattr(driver.driver_status, 'value') else DriverStatus.ACTIVE
        payment_type_enum = PaymentType(lease.payment_type.value) if hasattr(lease.payment_type, 'value') else PaymentType.CASH
        dtr_status_enum = DTRStatus(dtr_status_str)
        
        return CurrentBalanceWeeklyRow(
            lease_id=lease.id,
            driver_name=f"{driver.first_name} {driver.last_name}",
            hack_license=driver.hack_license,
            vehicle_plate=vehicle.plate_number if vehicle else None,
            medallion_number=medallion.medallion_number if medallion else None,
            net_earnings=net_earnings,
            cc_earnings_wtd=cc_earnings,
            lease_fee=lease_fee,
            ezpass_wtd=ezpass,
            mta_tif_wtd=mta_tif,
            violations_wtd=violations,
            tlc_tickets_wtd=tlc_tickets,
            repairs_wtd_due=repairs,
            loans_wtd_due=loans,
            misc_charges_wtd=misc_charges,
            deposit_amount=lease.deposit_amount_paid or Decimal("0.00"),
            prior_balance=prior_balance,
            payment_type=payment_type_enum,
            lease_status=lease_status_enum,
            driver_status=driver_status_enum,
            dtr_status=dtr_status_enum
        )
    
    def _build_daily_breakdown(
        self,
        lease_id: int,
        driver_id: int,
        week_start: date,
        week_end: date
    ) -> List[DailyBreakdownItem]:
        """
        Build daily breakdown for expandable view
        
        Args:
            lease_id: Lease ID
            driver_id: Driver ID
            week_start: Week start
            week_end: Week end
            
        Returns:
            List of DailyBreakdownItem
        """
        try:
            # Get daily data for each category
            daily_earnings = self.repo.get_daily_cc_earnings(
                lease_id, driver_id, week_start, week_end
            )
            daily_ezpass = self.repo.get_daily_charges_by_category(
                lease_id, driver_id, week_start, week_end, PostingCategory.EZPASS
            )
            daily_mta = self.repo.get_daily_charges_by_category(
                lease_id, driver_id, week_start, week_end, PostingCategory.TAXES
            )
            daily_violations = self.repo.get_daily_charges_by_category(
                lease_id, driver_id, week_start, week_end, PostingCategory.PVB
            )
            daily_tlc = self.repo.get_daily_charges_by_category(
                lease_id, driver_id, week_start, week_end, PostingCategory.TLC
            )
            
            # Build breakdown for each day of the week
            breakdown = []
            current_date = week_start
            day_names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
            
            while current_date <= week_end:
                earnings = daily_earnings.get(current_date, Decimal("0.00"))
                ezpass = daily_ezpass.get(current_date, Decimal("0.00"))
                mta = daily_mta.get(current_date, Decimal("0.00"))
                violations = daily_violations.get(current_date, Decimal("0.00"))
                tlc = daily_tlc.get(current_date, Decimal("0.00"))
                
                net_daily = earnings - (ezpass + mta + violations + tlc)
                
                day_name = day_names[current_date.weekday()]
                if current_date.weekday() == 6:  # Sunday
                    day_name = 'Sun'
                
                breakdown.append(DailyBreakdownItem(
                    day_of_week=day_name,
                    date=current_date,
                    cc_earnings=earnings,
                    ezpass=ezpass,
                    mta_tif=mta,
                    violations=violations,
                    tlc_tickets=tlc,
                    net_daily=net_daily
                ))
                
                current_date += timedelta(days=1)
            
            return breakdown
            
        except Exception as e:
            logger.error(f"Error building daily breakdown for lease {lease_id}: {str(e)}")
            raise DailyBreakdownException(lease_id, str(e))
    
    def _build_delayed_charges(
        self,
        lease_id: int,
        driver_id: int,
        week_start: date,
        week_end: date
    ) -> DelayedChargesBreakdown:
        """
        Build delayed charges breakdown
        
        Args:
            lease_id: Lease ID
            driver_id: Driver ID
            week_start: Week start
            week_end: Week end
            
        Returns:
            DelayedChargesBreakdown
        """
        try:
            delayed = self.repo.get_delayed_charges(
                lease_id, driver_id, week_start, week_end
            )
            
            return DelayedChargesBreakdown(
                ezpass=delayed.get('ezpass', Decimal("0.00")),
                violations=delayed.get('violations', Decimal("0.00")),
                tlc_tickets=delayed.get('tlc_tickets', Decimal("0.00"))
            )
            
        except Exception as e:
            logger.error(f"Error building delayed charges for lease {lease_id}: {str(e)}")
            return DelayedChargesBreakdown(
                ezpass=Decimal("0.00"),
                violations=Decimal("0.00"),
                tlc_tickets=Decimal("0.00")
            )
    
    def get_daily_charge_details(
        self,
        lease_id: int,
        target_date: date,
        category: str
    ) -> DailyChargeBreakdownResponse:
        """
        Get detailed charge breakdown for a specific day and category
        
        Args:
            lease_id: Lease ID
            target_date: Date to get details for
            category: Category (EZPASS, PVB, TLC, etc.)
            
        Returns:
            DailyChargeBreakdownResponse with charge details
            
        Raises:
            LeaseNotFoundException if lease not found
            DataRetrievalException on errors
        """
        try:
            # Get lease
            lease = self.repo.get_lease_by_id(lease_id)
            if not lease:
                raise LeaseNotFoundException(lease_id)
            
            # Map category string to PostingCategory enum
            category_map = {
                'EZPASS': PostingCategory.EZPASS,
                'VIOLATIONS': PostingCategory.PVB,
                'PVB': PostingCategory.PVB,
                'TLC': PostingCategory.TLC,
                'TLC_TICKETS': PostingCategory.TLC,
                'MTA': PostingCategory.TAXES,
                'MTA_TIF': PostingCategory.TAXES,
                'TAXES': PostingCategory.TAXES
            }
            
            posting_category = category_map.get(category.upper())
            if not posting_category:
                raise DataRetrievalException(f"Invalid category: {category}")
            
            # Get charge details
            details_data = self.repo.get_charge_details_for_day(
                lease_id, lease.driver_id, target_date, posting_category
            )
            
            # Convert to schema objects
            charges = [DailyChargeDetail(**detail) for detail in details_data]
            
            # Calculate total
            total_amount = sum(charge.amount for charge in charges)
            
            logger.info(
                f"Retrieved {len(charges)} charge details for lease {lease_id}, "
                f"date {target_date}, category {category}"
            )
            
            return DailyChargeBreakdownResponse(
                lease_id=lease_id,
                date=target_date,
                category=category.upper(),
                total_amount=total_amount,
                charges=charges
            )
            
        except LeaseNotFoundException:
            raise
        except Exception as e:
            logger.error(
                f"Error getting daily charge details for lease {lease_id}: {str(e)}",
                exc_info=True
            )
            raise DataRetrievalException(str(e))
    
    def get_statistics(
        self,
        week_start: date,
        week_end: date
    ) -> CurrentBalancesStatisticsResponse:
        """
        Get aggregate statistics for the week
        
        Args:
            week_start: Week start
            week_end: Week end
            
        Returns:
            CurrentBalancesStatisticsResponse
            
        Raises:
            InvalidWeekPeriodException if week invalid
            StatisticsCalculationException on errors
        """
        try:
            # Validate week
            self.validate_week_period(week_start, week_end)
            
            # Get statistics from repository
            stats = self.repo.get_statistics_for_week(week_start, week_end)
            
            logger.info(f"Calculated statistics for week {week_start} to {week_end}")
            
            return CurrentBalancesStatisticsResponse(
                total_leases=stats['total_leases'],
                active_leases=stats['active_leases'],
                total_cc_earnings=stats['total_cc_earnings'],
                total_deductions=stats['total_deductions'],
                total_net_earnings=stats['total_net_earnings'],
                average_net_per_lease=stats['average_net_per_lease'],
                week_start=week_start,
                week_end=week_end,
                dtr_status=DTRStatus(stats['dtr_status'])
            )
            
        except InvalidWeekPeriodException:
            raise
        except Exception as e:
            logger.error(f"Error calculating statistics: {str(e)}", exc_info=True)
            raise StatisticsCalculationException(str(e))
    
    def _sort_balance_rows(
        self,
        rows: List[CurrentBalanceWeeklyRow],
        sort_by: str,
        sort_order: str
    ) -> List[CurrentBalanceWeeklyRow]:
        """
        Sort balance rows by specified field
        
        Args:
            rows: List of rows to sort
            sort_by: Field name to sort by
            sort_order: 'asc' or 'desc'
            
        Returns:
            Sorted list
        """
        # Map sort field to row attribute
        sort_field_map = {
            'lease_id': 'lease_id',
            'driver_name': 'driver_name',
            'net_earnings': 'net_earnings',
            'cc_earnings_wtd': 'cc_earnings_wtd',
            'lease_fee': 'lease_fee',
            'ezpass_wtd': 'ezpass_wtd',
            'violations_wtd': 'violations_wtd',
            'tlc_tickets_wtd': 'tlc_tickets_wtd',
            'repairs_wtd_due': 'repairs_wtd_due',
            'loans_wtd_due': 'loans_wtd_due',
            'payment_type': 'payment_type',
            'lease_status': 'lease_status',
            'driver_status': 'driver_status',
            'dtr_status': 'dtr_status'
        }
        
        field = sort_field_map.get(sort_by, 'lease_id')
        reverse = (sort_order.lower() == 'desc')
        
        try:
            sorted_rows = sorted(
                rows,
                key=lambda x: getattr(x, field),
                reverse=reverse
            )
            return sorted_rows
        except Exception as e:
            logger.warning(f"Error sorting by {sort_by}: {str(e)}, returning unsorted")
            return rows
    
    def get_detailed_balance(
        self,
        lease_id: int,
        week_start: date,
        week_end: date
    ) -> CurrentBalanceDetailResponse:
        """
        Get detailed balance with daily breakdown for a lease
        
        Args:
            lease_id: Lease ID
            week_start: Week start
            week_end: Week end
            
        Returns:
            CurrentBalanceDetailResponse with full details
            
        Raises:
            LeaseNotFoundException if lease not found
            DataRetrievalException on errors
        """
        try:
            # Get weekly summary
            weekly_summary = self.get_balance_for_lease(
                lease_id, week_start, week_end, include_daily_breakdown=False
            )
            
            # Get daily breakdown
            daily_breakdown = self._build_daily_breakdown(
                lease_id, weekly_summary.lease_id, week_start, week_end
            )
            
            # Get delayed charges
            delayed_charges = self._build_delayed_charges(
                lease_id, weekly_summary.lease_id, week_start, week_end
            )
            
            logger.info(f"Retrieved detailed balance for lease {lease_id}")
            
            return CurrentBalanceDetailResponse(
                lease_summary=weekly_summary,
                daily_breakdown=daily_breakdown,
                delayed_charges=delayed_charges
            )
            
        except LeaseNotFoundException:
            raise
        except Exception as e:
            logger.error(
                f"Error getting detailed balance for lease {lease_id}: {str(e)}",
                exc_info=True
            )
            raise DataRetrievalException(str(e))