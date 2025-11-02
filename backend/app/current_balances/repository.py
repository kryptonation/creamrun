"""
app/current_balances/repository.py

Repository layer for Current Balances module
Handles all database queries and data retrieval
"""

from datetime import date, timedelta
from decimal import Decimal
from typing import List, Optional, Dict, Any, Tuple

from sqlalchemy.orm import Session
from sqlalchemy import or_, func, String

from app.leases.models import Lease
from app.leases.schemas import LeaseStatus as DBLeaseStatus
from app.drivers.models import Driver
from app.drivers.schemas import DriverStatus as DBDriverStatus
from app.vehicles.models import Vehicle
from app.medallions.models import Medallion
from app.ledger.models import LedgerPosting, LedgerBalance, PostingCategory, BalanceStatus
from app.current_balances.exceptions import DataRetrievalException
from app.dtr.models import DTR

from app.utils.logger import get_logger

logger = get_logger(__name__)


class CurrentBalancesRepository:
    """Repository for current balances data access"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_current_week_period(self) -> Tuple[date, date]:
        """
        Get current week period (Sunday to Saturday)
        
        Returns:
            Tuple of (week_start, week_end)
        """
        today = date.today()
        # Calculate days since last Sunday
        days_since_sunday = (today.weekday() + 1) % 7
        week_start = today - timedelta(days=days_since_sunday)
        week_end = week_start + timedelta(days=6)
        
        logger.info(f"Current week period: {week_start} to {week_end}")
        return week_start, week_end
    
    def validate_week_period(self, week_start: date, week_end: date) -> bool:
        """
        Validate that period is exactly Sunday to Saturday
        
        Args:
            week_start: Start date
            week_end: End date
            
        Returns:
            True if valid
            
        Raises:
            ValueError if invalid
        """
        if week_start.weekday() != 6:  # Sunday = 6
            raise ValueError("Week start must be a Sunday")
        
        if week_end.weekday() != 5:  # Saturday = 5
            raise ValueError("Week end must be a Saturday")
        
        if (week_end - week_start).days != 6:
            raise ValueError("Week period must be exactly 7 days")
        
        return True
    
    def is_current_week(self, week_start: date, week_end: date) -> bool:
        """Check if given period is the current week"""
        current_start, current_end = self.get_current_week_period()
        return week_start == current_start and week_end == current_end
    
    def get_active_leases_for_week(
        self,
        week_start: date,
        week_end: date,
        search: Optional[str] = None,
        lease_status: Optional[str] = None,
        driver_status: Optional[str] = None,
        payment_type: Optional[str] = None,
        lease_ids: Optional[List[int]] = None
    ) -> List[Lease]:
        """
        Get active leases for the given week with filters
        
        Args:
            week_start: Week start date
            week_end: Week end date
            search: Search term (lease ID, driver name, hack license, plate, medallion)
            lease_status: Filter by lease status
            driver_status: Filter by driver status
            payment_type: Filter by payment type
            lease_ids: Specific lease IDs to include
            
        Returns:
            List of Lease objects
        """
        try:
            query = self.db.query(Lease).join(
                Driver, Lease.driver_id == Driver.id
            ).outerjoin(
                Vehicle, Lease.vehicle_id == Vehicle.id
            ).outerjoin(
                Medallion, Lease.medallion_id == Medallion.id
            ).filter(
                # Lease must be active during the week period
                Lease.start_date <= week_end,
                or_(
                    Lease.end_date.is_(None),
                    Lease.end_date >= week_start
                )
            )
            
            # Apply filters
            if search:
                search_term = f"%{search}%"
                query = query.filter(
                    or_(
                        Lease.id.cast(String).like(search_term),
                        Driver.first_name.ilike(search_term),
                        Driver.last_name.ilike(search_term),
                        func.concat(Driver.first_name, ' ', Driver.last_name).ilike(search_term),
                        Driver.hack_license.ilike(search_term),
                        Vehicle.plate_number.ilike(search_term),
                        Medallion.medallion_number.ilike(search_term)
                    )
                )
            
            if lease_status:
                query = query.filter(Lease.lease_status == lease_status)
            
            if driver_status:
                query = query.filter(Driver.driver_status == driver_status)
            
            if payment_type:
                query = query.filter(Lease.payment_type == payment_type)
            
            if lease_ids:
                query = query.filter(Lease.id.in_(lease_ids))
            
            leases = query.all()
            logger.info(f"Found {len(leases)} leases for week {week_start} to {week_end}")
            return leases
            
        except Exception as e:
            logger.error(f"Error retrieving leases: {str(e)}", exc_info=True)
            raise DataRetrievalException(f"Failed to retrieve leases: {str(e)}")
    
    def get_cc_earnings_for_week(
        self,
        lease_id: int,
        driver_id: int,
        week_start: date,
        week_end: date
    ) -> Decimal:
        """
        Get CC earnings for the week from ledger postings
        
        Args:
            lease_id: Lease ID
            driver_id: Driver ID
            week_start: Week start
            week_end: Week end
            
        Returns:
            Total CC earnings
        """
        try:
            # Query CREDIT postings with EARNINGS category for the week
            result = self.db.query(
                func.coalesce(func.sum(LedgerPosting.amount), Decimal("0.00"))
            ).filter(
                LedgerPosting.driver_id == driver_id,
                LedgerPosting.lease_id == lease_id,
                LedgerPosting.category == PostingCategory.EARNINGS,
                LedgerPosting.posting_type == 'CREDIT',
                LedgerPosting.payment_period_start >= week_start,
                LedgerPosting.payment_period_end <= week_end,
                LedgerPosting.void_reason != None
            ).scalar()
            
            return result or Decimal("0.00")
            
        except Exception as e:
            logger.error(f"Error getting CC earnings for lease {lease_id}: {str(e)}")
            return Decimal("0.00")
    
    def get_charges_wtd_by_category(
        self,
        lease_id: int,
        driver_id: int,
        week_start: date,
        week_end: date,
        category: PostingCategory
    ) -> Decimal:
        """
        Get total charges for a category for the week
        
        Args:
            lease_id: Lease ID
            driver_id: Driver ID
            week_start: Week start
            week_end: Week end
            category: Posting category
            
        Returns:
            Total charges for category
        """
        try:
            # Query DEBIT postings for the category in the week
            result = self.db.query(
                func.coalesce(func.sum(LedgerPosting.amount), Decimal("0.00"))
            ).filter(
                LedgerPosting.driver_id == driver_id,
                LedgerPosting.lease_id == lease_id,
                LedgerPosting.category == category,
                LedgerPosting.posting_type == 'DEBIT',
                LedgerPosting.payment_period_start >= week_start,
                LedgerPosting.payment_period_end <= week_end,
                LedgerPosting.is_voided == False
            ).scalar()
            
            return result or Decimal("0.00")
            
        except Exception as e:
            logger.error(
                f"Error getting {category} charges for lease {lease_id}: {str(e)}"
            )
            return Decimal("0.00")
    
    def get_prior_balance(
        self,
        lease_id: int,
        driver_id: int,
        before_date: date
    ) -> Decimal:
        """
        Get prior balance carried forward from before the week
        
        Args:
            lease_id: Lease ID
            driver_id: Driver ID
            before_date: Get balance before this date (week start)
            
        Returns:
            Prior balance (negative means owed to driver, positive means owed to company)
        """
        try:
            # Sum all open balances created before the week start
            result = self.db.query(
                func.coalesce(func.sum(LedgerBalance.outstanding_amount), Decimal("0.00"))
            ).filter(
                LedgerBalance.driver_id == driver_id,
                LedgerBalance.lease_id == lease_id,
                LedgerBalance.status == BalanceStatus.OPEN,
                LedgerBalance.created_on < before_date
            ).scalar()
            
            return result or Decimal("0.00")
            
        except Exception as e:
            logger.error(f"Error getting prior balance for lease {lease_id}: {str(e)}")
            return Decimal("0.00")
    
    def get_dtr_status_for_week(
        self,
        lease_id: int,
        week_start: date,
        week_end: date
    ) -> str:
        """
        Get DTR status for the week
        
        Args:
            lease_id: Lease ID
            week_start: Week start
            week_end: Week end
            
        Returns:
            DTR status string
        """
        try:
            dtr = self.db.query(DTR).filter(
                DTR.lease_id == lease_id,
                DTR.period_start == week_start,
                DTR.period_end == week_end
            ).first()
            
            if dtr:
                return dtr.status.value
            else:
                return "NOT_GENERATED"
                
        except Exception as e:
            logger.error(f"Error getting DTR status for lease {lease_id}: {str(e)}")
            return "NOT_GENERATED"
    
    def get_lease_by_id(self, lease_id: int) -> Optional[Lease]:
        """Get lease by ID with relationships"""
        try:
            return self.db.query(Lease).filter(Lease.id == lease_id).first()
        except Exception as e:
            logger.error(f"Error getting lease {lease_id}: {str(e)}")
            return None
    
    def count_leases_for_week(
        self,
        week_start: date,
        week_end: date,
        search: Optional[str] = None,
        lease_status: Optional[str] = None,
        driver_status: Optional[str] = None,
        payment_type: Optional[str] = None
    ) -> int:
        """
        Count total leases matching filters
        
        Args:
            week_start: Week start date
            week_end: Week end date
            search: Search term
            lease_status: Filter by lease status
            driver_status: Filter by driver status
            payment_type: Filter by payment type
            
        Returns:
            Total count
        """
        try:
            query = self.db.query(func.count(Lease.id)).join(
                Driver, Lease.driver_id == Driver.id
            ).outerjoin(
                Vehicle, Lease.vehicle_id == Vehicle.id
            ).outerjoin(
                Medallion, Lease.medallion_id == Medallion.id
            ).filter(
                Lease.start_date <= week_end,
                or_(
                    Lease.end_date.is_(None),
                    Lease.end_date >= week_start
                )
            )
            
            if search:
                search_term = f"%{search}%"
                query = query.filter(
                    or_(
                        Lease.id.cast(String).like(search_term),
                        Driver.first_name.ilike(search_term),
                        Driver.last_name.ilike(search_term),
                        func.concat(Driver.first_name, ' ', Driver.last_name).ilike(search_term),
                        Driver.hack_license.ilike(search_term),
                        Vehicle.plate_number.ilike(search_term),
                        Medallion.medallion_number.ilike(search_term)
                    )
                )
            
            if lease_status:
                query = query.filter(Lease.lease_status == lease_status)
            
            if driver_status:
                query = query.filter(Driver.driver_status == driver_status)
            
            if payment_type:
                query = query.filter(Lease.payment_type == payment_type)
            
            return query.scalar() or 0
            
        except Exception as e:
            logger.error(f"Error counting leases: {str(e)}", exc_info=True)
            return 0

    def get_daily_cc_earnings(
        self,
        lease_id: int,
        driver_id: int,
        start_date: date,
        end_date: date
    ) -> Dict[date, Decimal]:
        """
        Get CC earnings broken down by day
        
        Args:
            lease_id: Lease ID
            driver_id: Driver ID
            start_date: Start date
            end_date: End date
            
        Returns:
            Dictionary mapping date to earnings amount
        """
        try:
            # Query postings grouped by transaction_date
            results = self.db.query(
                func.date(LedgerPosting.transaction_date).label('posting_date'),
                func.sum(LedgerPosting.amount).label('daily_total')
            ).filter(
                LedgerPosting.driver_id == driver_id,
                LedgerPosting.lease_id == lease_id,
                LedgerPosting.category == PostingCategory.EARNINGS,
                LedgerPosting.posting_type == 'CREDIT',
                func.date(LedgerPosting.transaction_date) >= start_date,
                func.date(LedgerPosting.transaction_date) <= end_date,
                LedgerPosting.is_voided == False
            ).group_by(
                func.date(LedgerPosting.transaction_date)
            ).all()
            
            # Convert to dictionary
            daily_earnings = {}
            for row in results:
                daily_earnings[row.posting_date] = row.daily_total or Decimal("0.00")
            
            return daily_earnings
            
        except Exception as e:
            logger.error(f"Error getting daily CC earnings for lease {lease_id}: {str(e)}")
            return {}
    
    def get_daily_charges_by_category(
        self,
        lease_id: int,
        driver_id: int,
        start_date: date,
        end_date: date,
        category: PostingCategory
    ) -> Dict[date, Decimal]:
        """
        Get charges broken down by day for a specific category
        
        Args:
            lease_id: Lease ID
            driver_id: Driver ID
            start_date: Start date
            end_date: End date
            category: Posting category
            
        Returns:
            Dictionary mapping date to charge amount
        """
        try:
            results = self.db.query(
                func.date(LedgerPosting.transaction_date).label('posting_date'),
                func.sum(LedgerPosting.amount).label('daily_total')
            ).filter(
                LedgerPosting.driver_id == driver_id,
                LedgerPosting.lease_id == lease_id,
                LedgerPosting.category == category,
                LedgerPosting.posting_type == 'DEBIT',
                func.date(LedgerPosting.transaction_date) >= start_date,
                func.date(LedgerPosting.transaction_date) <= end_date,
                LedgerPosting.is_voided == False
            ).group_by(
                func.date(LedgerPosting.transaction_date)
            ).all()
            
            daily_charges = {}
            for row in results:
                daily_charges[row.posting_date] = row.daily_total or Decimal("0.00")
            
            return daily_charges
            
        except Exception as e:
            logger.error(
                f"Error getting daily {category} charges for lease {lease_id}: {str(e)}"
            )
            return {}
    
    def get_delayed_charges(
        self,
        lease_id: int,
        driver_id: int,
        week_start: date,
        week_end: date
    ) -> Dict[str, Decimal]:
        """
        Get delayed charges (charges from previous weeks posted this week)
        
        Args:
            lease_id: Lease ID
            driver_id: Driver ID
            week_start: Current week start
            week_end: Current week end
            
        Returns:
            Dictionary with delayed charges by category
        """
        try:
            delayed = {
                'ezpass': Decimal("0.00"),
                'violations': Decimal("0.00"),
                'tlc_tickets': Decimal("0.00")
            }
            
            # Get charges where transaction_date < week_start but posted during the week
            # (system_entry_date or created_on is within the week)
            
            # EZ-Pass delayed charges
            ezpass_delayed = self.db.query(
                func.coalesce(func.sum(LedgerPosting.amount), Decimal("0.00"))
            ).filter(
                LedgerPosting.driver_id == driver_id,
                LedgerPosting.lease_id == lease_id,
                LedgerPosting.category == PostingCategory.EZPASS,
                LedgerPosting.posting_type == 'DEBIT',
                func.date(LedgerPosting.transaction_date) < week_start,
                LedgerPosting.created_on >= week_start,
                LedgerPosting.created_on <= week_end,
                LedgerPosting.is_voided == False
            ).scalar()
            
            delayed['ezpass'] = ezpass_delayed or Decimal("0.00")
            
            # PVB delayed charges
            pvb_delayed = self.db.query(
                func.coalesce(func.sum(LedgerPosting.amount), Decimal("0.00"))
            ).filter(
                LedgerPosting.driver_id == driver_id,
                LedgerPosting.lease_id == lease_id,
                LedgerPosting.category == PostingCategory.PVB,
                LedgerPosting.posting_type == 'DEBIT',
                func.date(LedgerPosting.transaction_date) < week_start,
                LedgerPosting.created_on >= week_start,
                LedgerPosting.created_on <= week_end,
                LedgerPosting.is_voided == False
            ).scalar()
            
            delayed['violations'] = pvb_delayed or Decimal("0.00")
            
            # TLC delayed charges
            tlc_delayed = self.db.query(
                func.coalesce(func.sum(LedgerPosting.amount), Decimal("0.00"))
            ).filter(
                LedgerPosting.driver_id == driver_id,
                LedgerPosting.lease_id == lease_id,
                LedgerPosting.category == PostingCategory.TLC,
                LedgerPosting.posting_type == 'DEBIT',
                func.date(LedgerPosting.transaction_date) < week_start,
                LedgerPosting.created_on >= week_start,
                LedgerPosting.created_on <= week_end,
                LedgerPosting.is_voided == False
            ).scalar()
            
            delayed['tlc_tickets'] = tlc_delayed or Decimal("0.00")
            
            return delayed
            
        except Exception as e:
            logger.error(f"Error getting delayed charges for lease {lease_id}: {str(e)}")
            return {
                'ezpass': Decimal("0.00"),
                'violations': Decimal("0.00"),
                'tlc_tickets': Decimal("0.00")
            }
    
    def get_charge_details_for_day(
        self,
        lease_id: int,
        driver_id: int,
        target_date: date,
        category: PostingCategory
    ) -> List[Dict[str, Any]]:
        """
        Get detailed charge information for a specific day and category
        
        Args:
            lease_id: Lease ID
            driver_id: Driver ID
            target_date: Specific date
            category: Posting category
            
        Returns:
            List of charge detail dictionaries
        """
        try:
            postings = self.db.query(LedgerPosting).filter(
                LedgerPosting.driver_id == driver_id,
                LedgerPosting.lease_id == lease_id,
                LedgerPosting.category == category,
                LedgerPosting.posting_type == 'DEBIT',
                func.date(LedgerPosting.transaction_date) == target_date,
                LedgerPosting.is_voided == False
            ).all()
            
            details = []
            for posting in postings:
                details.append({
                    'charge_date': posting.transaction_date.date() if posting.transaction_date else target_date,
                    'charge_time': posting.transaction_date,
                    'charge_type': posting.category.value,
                    'amount': posting.amount,
                    'description': posting.description,
                    'reference_number': posting.source_id,
                    'source': posting.source_type or 'API',
                    'original_charge_date': posting.transaction_date.date() if posting.transaction_date else None,
                    'system_entry_date': posting.created_on.date() if posting.created_on else None
                })
            
            return details
            
        except Exception as e:
            logger.error(
                f"Error getting charge details for lease {lease_id}, date {target_date}: {str(e)}"
            )
            return []
    
    def get_statistics_for_week(
        self,
        week_start: date,
        week_end: date
    ) -> Dict[str, Any]:
        """
        Get aggregate statistics for the week
        
        Args:
            week_start: Week start
            week_end: Week end
            
        Returns:
            Dictionary with statistics
        """
        try:
            # Get all active leases
            leases = self.get_active_leases_for_week(week_start, week_end)
            total_leases = len(leases)
            
            # Count active leases
            active_leases = sum(
                1 for lease in leases 
                if lease.lease_status == DBLeaseStatus.ACTIVE
            )
            
            # Sum earnings and deductions
            total_earnings = Decimal("0.00")
            total_deductions = Decimal("0.00")
            
            for lease in leases:
                earnings = self.get_cc_earnings_for_week(
                    lease.id, lease.driver_id, week_start, week_end
                )
                total_earnings += earnings
                
                # Sum all deduction categories
                for category in [
                    PostingCategory.LEASE, PostingCategory.EZPASS,
                    PostingCategory.PVB, PostingCategory.TLC,
                    PostingCategory.REPAIRS, PostingCategory.LOANS,
                    PostingCategory.MISC
                ]:
                    deductions = self.get_charges_wtd_by_category(
                        lease.id, lease.driver_id, week_start, week_end, category
                    )
                    total_deductions += deductions
            
            net_earnings = total_earnings - total_deductions
            avg_per_lease = net_earnings / total_leases if total_leases > 0 else Decimal("0.00")
            
            # Get overall DTR status
            is_current = self.is_current_week(week_start, week_end)
            dtr_status = "NOT_GENERATED" if is_current else "GENERATED"
            
            return {
                'total_leases': total_leases,
                'active_leases': active_leases,
                'total_cc_earnings': total_earnings,
                'total_deductions': total_deductions,
                'total_net_earnings': net_earnings,
                'average_net_per_lease': avg_per_lease,
                'dtr_status': dtr_status
            }
            
        except Exception as e:
            logger.error(f"Error calculating statistics for week: {str(e)}")
            raise DataRetrievalException(f"Failed to calculate statistics: {str(e)}")