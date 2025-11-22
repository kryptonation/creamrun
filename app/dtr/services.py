# app/dtr/services.py

from datetime import date, datetime
from decimal import Decimal
from typing import List, Dict, Optional, Tuple

from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, func

from app.dtr.models import DTR, DTRStatus
from app.dtr.repository import DTRRepository
from app.dtr.exceptions import (
    DTRGenerationError, DTRNotFoundError, DTRValidationError, DTRAlreadyExistsError
)
from app.leases.models import Lease
from app.drivers.models import Driver
from app.vehicles.models import Vehicle
from app.medallions.models import Medallion
from app.utils.logger import get_logger

logger = get_logger(__name__)


class DTRService:
    """
    DTR Service - Implements ONE DTR PER LEASE business rule
    
    - Generate DTRs per LEASE, not per driver
    - Consolidate earnings from ALL drivers (primary + additional)
    - Apply charge attribution rules (primary vs additional)
    - Generate additional driver detail sections
    - Handle all drivers associated with a lease
    """
    
    def __init__(self, db: Session):
        self.db = db
        self.repository = DTRRepository(db)
    
    def generate_dtr(
        self, lease_id: int, period_start: date, period_end: date,
        auto_finalize: bool = False
    ) -> DTR:
        """
        Generate DTR for a LEASE for the specified period.
        
        This method:
        1. Validates the lease exists and is active
        2. Gets ALL drivers associated with the lease (primary + additional)
        3. Consolidates earnings from ALL drivers
        4. Applies charge attribution rules
        5. Generates additional driver detail sections
        6. Creates single DTR for the lease
        
        Args:
            lease_id: The lease ID
            period_start: Start of payment period (Sunday)
            period_end: End of payment period (Saturday)
            auto_finalize: Whether to auto-finalize the DTR
            
        Returns:
            Generated DTR object
        """
        try:
            logger.info("Generating DTR for lease", lease_id=lease_id, period_start=period_start, period_end=period_end)
            
            # 1. Validate lease
            lease = self._validate_and_get_lease(lease_id, period_start, period_end)
            
            # 2. Check if DTR already exists for this lease/period
            existing_dtr = self.repository.get_by_lease_period(lease_id, period_start, period_end)
            if existing_dtr:
                raise DTRAlreadyExistsError(
                    f"DTR already exists for lease {lease.lease_id} for period {period_start} to {period_end}: {existing_dtr.dtr_number}"
                )
            
            # 3. Get ALL drivers for this lease
            drivers_info = self._get_all_lease_drivers(lease)
            if not drivers_info['primary_driver']:
                raise DTRValidationError(f"Lease {lease.lease_id} has no primary driver")
            
            primary_driver = drivers_info['primary_driver']
            additional_drivers = drivers_info['additional_drivers']
            
            logger.info(
                "Lease drivers retrieved",
                lease_id=lease.lease_id,
                primary_driver_id=primary_driver.id,
                additional_drivers_count=len(additional_drivers)
            )
            
            # 4. Generate DTR and receipt numbers
            generation_date = datetime.now()
            year = generation_date.year
            month = generation_date.month
            
            dtr_sequence = self.get_next_dtr_sequence(year)
            dtr_number = self.generate_dtr_number(year, dtr_sequence)
            
            receipt_sequence = self.get_next_receipt_sequence(year, month)
            receipt_number = self.generate_receipt_number(year, month, receipt_sequence)
            
            # 5. Consolidate earnings from ALL drivers
            consolidated_earnings = self._consolidate_all_driver_earnings(
                lease, primary_driver, additional_drivers, period_start, period_end
            )
            
            # 6. Calculate charges with proper attribution
            charges = self._calculate_lease_charges(
                lease, primary_driver, additional_drivers, period_start, period_end
            )
            
            # 7. Generate additional driver detail sections
            additional_drivers_detail = self._generate_additional_drivers_detail(
                lease, additional_drivers, period_start, period_end
            )
            
            # 8. Get detailed breakdowns
            tax_breakdown = self._get_tax_breakdown(lease, period_start, period_end)
            ezpass_detail = self._get_ezpass_detail(lease, period_start, period_end)
            pvb_detail = self._get_pvb_detail(lease, period_start, period_end)
            tlc_detail = self._get_tlc_detail(lease, period_start, period_end)
            repair_detail = self._get_repair_detail(lease, primary_driver, period_start, period_end)
            loan_detail = self._get_loan_detail(lease, primary_driver, period_start, period_end)
            trip_log = self._get_consolidated_trip_log(lease, period_start, period_end)
            
            # 9. Get alerts for vehicle and all drivers
            vehicle_alerts = self._get_vehicle_alerts(lease.vehicle, lease.medallion)
            all_driver_alerts = self._get_all_drivers_alerts(primary_driver, additional_drivers)
            
            # 10. Calculate totals
            subtotal_deductions = (
                charges['lease_amount'] +
                charges['mta_tif_fees'] +
                charges['ezpass_tolls'] +
                charges['violation_tickets'] +
                charges['tlc_tickets'] +
                charges['repairs'] +
                charges['driver_loans'] +
                charges['misc_charges']
            )
            
            prior_balance = self._get_prior_balance(lease_id, period_start)
            net_earnings = consolidated_earnings['total_cc_earnings'] - subtotal_deductions - prior_balance
            total_due = max(Decimal("0.00"), net_earnings)
            
            # 11. Get payment info
            account_masked = self._mask_account_number(primary_driver)
            
            # 12. Create DTR data
            dtr_data = {
                "dtr_number": dtr_number,
                "receipt_number": receipt_number,
                "period_start_date": period_start,
                "period_end_date": period_end,
                "generation_date": generation_date,
                "lease_id": lease.id,
                "driver_id": primary_driver.id,  # Primary driver for reference
                "vehicle_id": lease.vehicle_id,
                "medallion_id": lease.medallion_id,
                "status": DTRStatus.DRAFT,
                
                # Consolidated earnings from ALL drivers
                "gross_cc_earnings": consolidated_earnings['total_cc_earnings'],
                "gross_cash_earnings": consolidated_earnings['total_cash_earnings'],
                "total_gross_earnings": consolidated_earnings['total_cc_earnings'] + consolidated_earnings['total_cash_earnings'],
                
                # Charges
                "lease_amount": charges['lease_amount'],
                "mta_tif_fees": charges['mta_tif_fees'],
                "ezpass_tolls": charges['ezpass_tolls'],
                "violation_tickets": charges['violation_tickets'],
                "tlc_tickets": charges['tlc_tickets'],
                "repairs": charges['repairs'],
                "driver_loans": charges['driver_loans'],
                "misc_charges": charges['misc_charges'],
                
                # Calculated totals
                "subtotal_deductions": subtotal_deductions,
                "prior_balance": prior_balance,
                "net_earnings": net_earnings,
                "total_due_to_driver": total_due,
                
                # Payment info
                "payment_method": self._get_payment_method(primary_driver),
                "account_number_masked": account_masked,
                
                # Additional drivers detail - NEW
                "additional_drivers_detail": additional_drivers_detail,
                
                # Detailed breakdowns
                "tax_breakdown": tax_breakdown,
                "ezpass_detail": ezpass_detail,
                "pvb_detail": pvb_detail,
                "tlc_detail": tlc_detail,
                "repair_detail": repair_detail,
                "loan_detail": loan_detail,
                "trip_log": trip_log,
                "alerts": {
                    "vehicle": vehicle_alerts,
                    "drivers": all_driver_alerts  # Array with all drivers
                }
            }
            
            dtr = self.repository.create(dtr_data)
            self.db.commit()
            
            if auto_finalize:
                dtr = self.finalize_dtr(dtr.id)
            
            logger.info("Successfully generated DTR", lease_id=lease.lease_id, dtr_number=dtr.dtr_number)
            return dtr
            
        except Exception as e:
            self.db.rollback()
            logger.error("Error generating DTR", lease_id=lease_id, error=str(e), exc_info=True)
            raise DTRGenerationError(f"Failed to generate DTR: {str(e)}") from e
    
    def _validate_and_get_lease(self, lease_id: int, period_start: date, period_end: date) -> Lease:
        """Validate lease exists and is active during the period"""
        lease = self.db.query(Lease).filter(Lease.id == lease_id).first()
        
        if not lease:
            raise DTRValidationError(f"Lease with ID {lease_id} not found")
        
        # Check if lease was active during the period
        if lease.lease_start_date and lease.lease_start_date > period_end:
            raise DTRValidationError(f"Lease {lease.lease_id} starts after the period end")
        
        if lease.lease_end_date and lease.lease_end_date < period_start:
            raise DTRValidationError(f"Lease {lease.lease_id} ended before the period start")
        
        return lease
    
    def _get_all_lease_drivers(self, lease: Lease) -> Dict:
        """
        Get all drivers associated with the lease.
        
        Returns dict with:
        - primary_driver: The leaseholder (Driver object)
        - additional_drivers: List of additional drivers (Driver objects)
        """
        primary_driver = None
        additional_drivers = []
        
        for lease_driver in lease.lease_driver:
            # Skip inactive drivers
            if not lease_driver.is_active:
                continue
            
            driver = lease_driver.driver
            
            if lease_driver.is_additional_driver:
                additional_drivers.append(driver)
            else:
                primary_driver = driver # Primary driver (leaseholder)
        
        return {
            'primary_driver': primary_driver,
            'additional_drivers': additional_drivers
        }
    
    def _consolidate_all_driver_earnings(
        self, lease: Lease, primary_driver: Driver, additional_drivers: List[Driver],
        period_start: date, period_end: date
    ) -> Dict[str, Decimal]:
        """
        Consolidate earnings from ALL drivers (primary + additional).
        
        Returns:
            Dict with total_cc_earnings, total_cash_earnings, earnings_by_driver
        """
        all_drivers = [primary_driver] + additional_drivers
        driver_ids = [d.id for d in all_drivers]
        
        # Query CURB earnings for all drivers
        from app.curb.models import CurbTrip
        
        earnings_query = self.db.query(
            CurbTrip.driver_id,
            func.sum(CurbTrip.total_amount).label('total_earnings')
        ).filter(
            and_(
                CurbTrip.driver_id.in_(driver_ids),
                CurbTrip.start_time >= period_start,
                CurbTrip.start_time <= period_end,
                CurbTrip.payment_type == 'CREDIT_CARD'
            )
        ).group_by(CurbTrip.driver_id).all()
        
        earnings_by_driver = {row.driver_id: Decimal(str(row.total_earnings)) for row in earnings_query}
        total_cc_earnings = sum(earnings_by_driver.values(), Decimal("0.00"))
        
        logger.info(f"Consolidated earnings for lease {lease.id}: Primary {primary_driver.id}: ${earnings_by_driver.get(primary_driver.id, 0)}, "
                   f"Additional: {len(additional_drivers)} drivers, Total: ${total_cc_earnings}")
        
        return {
            'total_cc_earnings': total_cc_earnings,
            'total_cash_earnings': Decimal("0.00"),  # Cash not tracked in this system
            'earnings_by_driver': earnings_by_driver
        }
    
    def _calculate_lease_charges(
        self, lease: Lease, primary_driver: Driver, additional_drivers: List[Driver],
        period_start: date, period_end: date
    ) -> Dict[str, Decimal]:
        """
        Calculate all charges with proper attribution.
        
        CHARGE ATTRIBUTION RULES:
        - Lease Amount: Primary driver only
        - MTA/TIF/Taxes: ALL drivers proportionally
        - EZPass: ALL drivers (by TLC license)
        - PVB Violations: ALL drivers (by TLC license)
        - TLC Tickets: Lease level only (not driver-specific)
        - Repairs: Primary driver only
        - Loans: Primary driver only
        - Misc: Primary driver only
        """
        charges = {
            'lease_amount': Decimal("0.00"),
            'mta_tif_fees': Decimal("0.00"),
            'ezpass_tolls': Decimal("0.00"),
            'violation_tickets': Decimal("0.00"),
            'tlc_tickets': Decimal("0.00"),
            'repairs': Decimal("0.00"),
            'driver_loans': Decimal("0.00"),
            'misc_charges': Decimal("0.00")
        }
        
        # Lease Amount - primary driver only
        charges['lease_amount'] = self._get_lease_amount(lease, period_start, period_end)
        
        # MTA/TIF/Taxes - ALL drivers
        all_driver_ids = [primary_driver.id] + [d.id for d in additional_drivers]
        charges['mta_tif_fees'] = self._get_mta_tif_charges(all_driver_ids, period_start, period_end)
        
        # EZPass - ALL drivers (by TLC license)
        charges['ezpass_tolls'] = self._get_ezpass_charges(lease, all_driver_ids, period_end)
        
        # PVB Violations - ALL drivers (by TLC license)
        charges['violation_tickets'] = self._get_pvb_charges(lease, all_driver_ids, period_end)
        
        # TLC Tickets - lease/medallion level only
        charges['tlc_tickets'] = self._get_tlc_charges(lease, period_end)
        
        # Repairs - primary driver only
        charges['repairs'] = self._get_repair_charges(lease, primary_driver.id, period_start, period_end)
        
        # Loans - primary driver only
        charges['driver_loans'] = self._get_loan_charges(primary_driver.id, period_start, period_end)
        
        # Misc - primary driver only
        charges['misc_charges'] = self._get_misc_charges(lease, primary_driver.id, period_start, period_end)
        
        return charges
    
    def _generate_additional_drivers_detail(
        self, lease: Lease, additional_drivers: List[Driver],
        period_start: date, period_end: date
    ) -> Optional[List[Dict]]:
        """
        Generate detail sections for each additional driver.
        
        Each section contains:
        - Driver identification (name, TLC license)
        - Their CC earnings
        - Their applicable charges (taxes, EZPass, PVB only)
        - Their trip log
        - Their alerts
        
        Returns None if no additional drivers.
        """
        if not additional_drivers:
            return None
        
        details = []
        
        for add_driver in additional_drivers:
            # Get this driver's earnings
            driver_earnings = self._get_driver_earnings(add_driver.id, period_start, period_end)
            
            # Get this driver's applicable charges
            driver_charges = {
                'mta_tif_fees': self._get_mta_tif_charges([add_driver.id], period_start, period_end),
                'ezpass_tolls': self._get_driver_ezpass_charges(add_driver, period_end),
                'violation_tickets': self._get_driver_pvb_charges(add_driver, period_end)
            }
            
            # Get this driver's trips
            driver_trips = self._get_driver_trip_log(add_driver, period_start, period_end)
            
            # Get this driver's alerts
            driver_alerts = self._get_driver_alerts(add_driver)
            
            # Tax breakdown for this driver
            driver_tax_breakdown = self._get_driver_tax_breakdown(add_driver.id, period_start, period_end)
            
            # EZPass detail for this driver
            driver_ezpass_detail = self._get_driver_ezpass_detail(add_driver, period_start, period_end)
            
            # PVB detail for this driver
            driver_pvb_detail = self._get_driver_pvb_detail(add_driver, period_start, period_end)
            
            # Calculate subtotal and net for this additional driver
            subtotal = (
                driver_charges['mta_tif_fees'] +
                driver_charges['ezpass_tolls'] +
                driver_charges['violation_tickets']
            )
            
            net_earnings = driver_earnings - subtotal
            
            detail = {
                'driver_id': add_driver.id,
                'driver_name': f"{add_driver.first_name} {add_driver.last_name}",
                'tlc_license': add_driver.tlc_license.tlc_license_number if add_driver.tlc_license else None,
                'cc_earnings': float(driver_earnings),
                'charges': {
                    'mta_tif_fees': float(driver_charges['mta_tif_fees']),
                    'ezpass_tolls': float(driver_charges['ezpass_tolls']),
                    'violation_tickets': float(driver_charges['violation_tickets'])
                },
                'subtotal': float(subtotal),
                'net_earnings': float(net_earnings),
                'tax_breakdown': driver_tax_breakdown,
                'ezpass_detail': driver_ezpass_detail,
                'pvb_detail': driver_pvb_detail,
                'trip_log': driver_trips,
                'alerts': driver_alerts
            }
            
            details.append(detail)
        
        return details
    
    # Helper methods for charge calculations
    
    def _get_lease_amount(self, lease: Lease, period_start: date, period_end: date) -> Decimal:
        """Get weekly lease amount from lease schedule for the specific period"""
        from app.leases.models import LeaseSchedule
        
        lease_schedule = self.db.query(LeaseSchedule).filter(
            and_(
                LeaseSchedule.lease_id == lease.id,
                LeaseSchedule.period_start_date == period_start,
                LeaseSchedule.period_end_date == period_end
            )
        ).first()
        
        if lease_schedule and lease_schedule.installment_amount:
            return Decimal(str(lease_schedule.installment_amount))
        
        return Decimal("0.00")
    
    def _get_mta_tif_charges(self, driver_ids: List[int], period_start: date, period_end: date) -> Decimal:
        """Get MTA/TIF/Congestion/CBDT/Airport fees from CURB for given drivers"""
        from app.curb.models import CurbTrip
        
        result = self.db.query(
            func.sum(
                func.coalesce(CurbTrip.surcharge, 0) +
                func.coalesce(CurbTrip.improvement_surcharge, 0) +
                func.coalesce(CurbTrip.congestion_fee, 0) +
                func.coalesce(CurbTrip.airport_fee, 0)
            ).label('total_taxes')
        ).filter(
            and_(
                CurbTrip.driver_id.in_(driver_ids),
                CurbTrip.start_time >= period_start,
                CurbTrip.start_time <= period_end
            )
        ).scalar()
        
        return Decimal(str(result)) if result else Decimal("0.00")
    
    def _get_ezpass_charges(self, lease: Lease, driver_ids: List[int], as_of_date: date) -> Decimal:
        """Get all outstanding EZPass charges as of the period end"""
        from app.ezpass.models import EZPassTransaction
        
        # Get all outstanding tolls for the lease/vehicle up to period end
        result = self.db.query(
            func.sum(EZPassTransaction.amount).label('total_tolls')
        ).filter(
            and_(
                or_(
                    EZPassTransaction.lease_id == lease.id,
                    EZPassTransaction.vehicle_id == lease.vehicle_id,
                    EZPassTransaction.medallion_id == lease.medallion_id
                ),
                EZPassTransaction.transaction_datetime <= as_of_date
            )
        ).scalar()
        
        return Decimal(str(result)) if result else Decimal("0.00")
    
    def _get_pvb_charges(self, lease: Lease, driver_ids: List[int], as_of_date: date) -> Decimal:
        """Get all outstanding PVB violations as of the period end"""
        from app.pvb.models import PVBViolation
        
        result = self.db.query(
            func.sum(PVBViolation.fine).label('total_fines')
        ).filter(
            and_(
                or_(
                    PVBViolation.lease_id == lease.id,
                    PVBViolation.vehicle_id == lease.vehicle_id
                ),
                PVBViolation.issue_date <= as_of_date
            )
        ).scalar()
        
        return Decimal(str(result)) if result else Decimal("0.00")
    
    def _get_tlc_charges(self, lease: Lease, as_of_date: date) -> Decimal:
        """Get TLC tickets (medallion/lease level only)"""
        from app.tlc.models import TLCViolation, TLCViolationStatus
        
        result = self.db.query(
            func.sum(TLCViolation.amount).label('total_fines')
        ).filter(
            and_(
                or_(
                    TLCViolation.lease_id == lease.id,
                    TLCViolation.medallion_id == lease.medallion_id
                ),
                TLCViolation.issue_date <= as_of_date,
                TLCViolation.status == TLCViolationStatus.PENDING
            )
        ).scalar()
        
        return Decimal(str(result)) if result else Decimal("0.00")
    
    def _get_repair_charges(self, lease: Lease, driver_id: int, period_start: date, period_end: date) -> Decimal:
        """Get repair installments due for this period (primary driver only)"""
        from app.repairs.models import RepairInstallment, RepairInstallmentStatus, RepairInvoice
        
        result = self.db.query(
            func.sum(RepairInstallment.principal_amount).label('total_due')
        ).join(
            RepairInvoice, RepairInstallment.invoice_id == RepairInvoice.id
        ).filter(
            and_(
                RepairInvoice.lease_id == lease.id,
                RepairInvoice.driver_id == driver_id,
                RepairInstallment.week_start_date >= period_start,
                RepairInstallment.week_start_date <= period_end,
                RepairInstallment.status == RepairInstallmentStatus.DUE
            )
        ).scalar()
        
        return Decimal(str(result)) if result else Decimal("0.00")
    
    def _get_loan_charges(self, driver_id: int, period_start: date, period_end: date) -> Decimal:
        """Get loan installments due for this period (primary driver only)"""
        from app.loans.models import LoanInstallment, LoanInstallmentStatus, DriverLoan
        
        result = self.db.query(
            func.sum(LoanInstallment.total_due).label('total_due')
        ).join(
            DriverLoan, LoanInstallment.loan_id == DriverLoan.id
        ).filter(
            and_(
                DriverLoan.driver_id == driver_id,
                LoanInstallment.week_start_date >= period_start,
                LoanInstallment.week_start_date <= period_end,
                LoanInstallment.status == LoanInstallmentStatus.DUE
            )
        ).scalar()
        
        return Decimal(str(result)) if result else Decimal("0.00")
    
    def _get_misc_charges(self, lease: Lease, driver_id: int, period_start: date, period_end: date) -> Decimal:
        """Get miscellaneous charges (primary driver only)"""
        from app.misc_expenses.models import MiscellaneousExpense, MiscellaneousExpenseStatus
        
        result = self.db.query(
            func.sum(MiscellaneousExpense.amount).label('total_charges')
        ).filter(
            and_(
                MiscellaneousExpense.lease_id == lease.id,
                MiscellaneousExpense.driver_id == driver_id,
                MiscellaneousExpense.expense_date >= period_start,
                MiscellaneousExpense.expense_date <= period_end,
                MiscellaneousExpense.status == MiscellaneousExpenseStatus.OPEN
            )
        ).scalar()
        
        return Decimal(str(result)) if result else Decimal("0.00")
    
    def _get_driver_earnings(self, driver_id: int, period_start: date, period_end: date) -> Decimal:
        """Get CC earnings for a specific driver"""
        from app.curb.models import CurbTrip
        
        result = self.db.query(
            func.sum(CurbTrip.total_amount).label('total_earnings')
        ).filter(
            and_(
                CurbTrip.driver_id == driver_id,
                CurbTrip.start_time >= period_start,
                CurbTrip.start_time <= period_end,
                CurbTrip.payment_type == 'CREDIT_CARD'
            )
        ).scalar()
        
        return Decimal(str(result)) if result else Decimal("0.00")
    
    def _get_driver_ezpass_charges(self, driver: Driver, as_of_date: date) -> Decimal:
        """Get EZPass charges for specific driver by TLC license"""
        from app.ezpass.models import EZPassTransaction
        from app.drivers.models import TLCLicense
        
        if not driver.tlc_license:
            return Decimal("0.00")
        
        result = self.db.query(
            func.sum(EZPassTransaction.amount).label('total_tolls')
        ).join(
            Driver, EZPassTransaction.driver_id == Driver.id
        ).join(
            TLCLicense, Driver.tlc_license_number_id == TLCLicense.id
        ).filter(
            and_(
                TLCLicense.tlc_license_number == driver.tlc_license.tlc_license_number,
                EZPassTransaction.posting_date <= as_of_date
            )
        ).scalar()
        
        return Decimal(str(result)) if result else Decimal("0.00")
    
    def _get_driver_pvb_charges(self, driver: Driver, as_of_date: date) -> Decimal:
        """Get PVB violations for specific driver by TLC license"""
        from app.pvb.models import PVBViolation, PVBViolationStatus
        from app.drivers.models import TLCLicense
        
        if not driver.tlc_license:
            return Decimal("0.00")
        
        result = self.db.query(
            func.sum(PVBViolation.fine).label('total_fines')
        ).join(
            Driver, PVBViolation.driver_id == Driver.id
        ).join(
            TLCLicense, Driver.tlc_license_number_id == TLCLicense.id
        ).filter(
            and_(
                TLCLicense.tlc_license_number == driver.tlc_license.tlc_license_number,
                PVBViolation.issue_date <= as_of_date,
                PVBViolation.status == PVBViolationStatus.POSTING_PENDING
            )
        ).scalar()
        
        return Decimal(str(result)) if result else Decimal("0.00")
    
    def _get_consolidated_trip_log(self, lease: Lease, period_start: date, period_end: date) -> Dict:
        """Get consolidated trip log from ALL drivers"""
        from app.curb.models import CurbTrip
        
        trips = self.db.query(CurbTrip).filter(
            and_(
                CurbTrip.lease_id == lease.id,
                CurbTrip.start_time >= period_start,
                CurbTrip.start_time <= period_end,
                CurbTrip.payment_type == 'CREDIT_CARD'
            )
        ).order_by(CurbTrip.start_time).all()
        
        trip_list = []
        for trip in trips:
            driver = self.db.query(Driver).filter(Driver.id == trip.driver_id).first()
            tlc_license = driver.tlc_license.tlc_license_number if driver and driver.tlc_license else "UNKNOWN"
            
            trip_list.append({
                'trip_date': trip.start_time.isoformat(),
                'tlc_license': tlc_license,
                'trip_number': trip.curb_trip_id,
                'amount': float(trip.total_amount)
            })
        
        return {
            'total_trips': len(trip_list),
            'trips': trip_list
        }
    
    def _get_driver_trip_log(self, driver: Driver, period_start: date, period_end: date) -> List[Dict]:
        """Get trip log for a specific driver"""
        from app.curb.models import CurbTrip
        
        trips = self.db.query(CurbTrip).filter(
            and_(
                CurbTrip.driver_id == driver.id,
                CurbTrip.start_time >= period_start,
                CurbTrip.start_time <= period_end,
                CurbTrip.payment_type == 'CREDIT_CARD'
            )
        ).order_by(CurbTrip.start_time).all()
        
        return [{
            'trip_date': trip.start_time.isoformat(),
            'trip_number': trip.curb_trip_id,
            'amount': float(trip.total_amount)
        } for trip in trips]
    
    def _get_prior_balance(self, lease_id: int, period_start: date) -> Decimal:
        """Get prior balance from last DTR"""
        last_dtr = self.db.query(DTR).filter(
            and_(
                DTR.lease_id == lease_id,
                DTR.period_end_date < period_start
            )
        ).order_by(DTR.period_end_date.desc()).first()
        
        if last_dtr:
            # Prior balance is the unpaid portion from last period
            if last_dtr.net_earnings < 0:
                return abs(last_dtr.net_earnings)
        
        return Decimal("0.00")
    
    def _get_vehicle_alerts(self, vehicle: Optional[Vehicle], medallion: Optional[Medallion]) -> List[Dict]:
        """Get vehicle-related alerts"""
        from app.vehicles.models import VehicleInspection, VehicleRegistration
        
        alerts = []
        
        if vehicle:
            # Get latest TLC inspection
            latest_inspection = self.db.query(VehicleInspection).filter(
                VehicleInspection.vehicle_id == vehicle.id
            ).order_by(VehicleInspection.next_inspection_due_date.desc()).first()
            
            if latest_inspection and latest_inspection.next_inspection_due_date:
                alerts.append({
                    'type': 'TLC Inspection',
                    'expiry_date': latest_inspection.next_inspection_due_date.isoformat()
                })
            
            # Get latest DMV registration
            latest_registration = self.db.query(VehicleRegistration).filter(
                VehicleRegistration.vehicle_id == vehicle.id
            ).order_by(VehicleRegistration.registration_expiry_date.desc()).first()
            
            if latest_registration and latest_registration.registration_expiry_date:
                alerts.append({
                    'type': 'DMV Registration',
                    'expiry_date': latest_registration.registration_expiry_date.isoformat()
                })
        
        return alerts
    
    def _get_all_drivers_alerts(self, primary_driver: Driver, additional_drivers: List[Driver]) -> List[Dict]:
        """Get alerts for all drivers"""
        all_alerts = []
        
        # Primary driver alerts
        primary_alerts = self._get_driver_alerts(primary_driver)
        all_alerts.append({
            'driver_role': 'Primary',
            'driver_id': primary_driver.id,
            'driver_name': f"{primary_driver.first_name} {primary_driver.last_name}",
            'alerts': primary_alerts
        })
        
        # Additional driver alerts
        for idx, add_driver in enumerate(additional_drivers, start=2):
            add_alerts = self._get_driver_alerts(add_driver)
            all_alerts.append({
                'driver_role': f'Driver {idx}',
                'driver_id': add_driver.id,
                'driver_name': f"{add_driver.first_name} {add_driver.last_name}",
                'alerts': add_alerts
            })
        
        return all_alerts
    
    def _get_driver_alerts(self, driver: Driver) -> List[Dict]:
        """Get alerts for a specific driver"""
        alerts = []
        
        if driver.tlc_license and driver.tlc_license.tlc_license_expiry_date:
            alerts.append({
                'type': 'TLC License',
                'expiry_date': driver.tlc_license.tlc_license_expiry_date.isoformat()
            })
        
        if driver.dmv_license and driver.dmv_license.dmv_license_expiry_date:
            alerts.append({
                'type': 'DMV License',
                'expiry_date': driver.dmv_license.dmv_license_expiry_date.isoformat()
            })
        
        return alerts
    
    def _get_tax_breakdown(self, lease: Lease, period_start: date, period_end: date) -> Dict:
        """Get detailed tax breakdown consolidated for all drivers on lease"""
        from app.curb.models import CurbTrip
        
        driver_ids = [ld.driver_id for ld in lease.lease_driver if ld.is_active]
        if not driver_ids:
            return {"mta": 0.00, "tif": 0.00, "congestion": 0.00, "cbdt": 0.00, "airport": 0.00, "total": 0.00}
        
        result = self.db.query(
            func.sum(func.coalesce(CurbTrip.surcharge, 0)).label('mta'),
            func.sum(func.coalesce(CurbTrip.improvement_surcharge, 0)).label('tif'),
            func.sum(func.coalesce(CurbTrip.congestion_fee, 0)).label('congestion'),
            func.sum(func.coalesce(CurbTrip.cbdt_fee, 0)).label('cbdt'),
            func.sum(func.coalesce(CurbTrip.airport_fee, 0)).label('airport')
        ).filter(
            and_(CurbTrip.driver_id.in_(driver_ids), CurbTrip.start_time >= period_start, CurbTrip.start_time <= period_end)
        ).first()
        
        if not result:
            return {"mta": 0.00, "tif": 0.00, "congestion": 0.00, "cbdt": 0.00, "airport": 0.00, "total": 0.00}
        
        mta = float(result.mta or 0)
        tif = float(result.tif or 0)
        congestion = float(result.congestion or 0)
        cbdt = float(result.cbdt or 0)
        airport = float(result.airport or 0)
        
        return {"mta": mta, "tif": tif, "congestion": congestion, "cbdt": cbdt, "airport": airport, "total": mta + tif + congestion + cbdt + airport}


    def _get_driver_tax_breakdown(self, driver_id: int, period_start: date, period_end: date) -> Dict:
        """Get tax breakdown for specific driver"""
        from app.curb.models import CurbTrip
        
        result = self.db.query(
            func.sum(func.coalesce(CurbTrip.surcharge, 0)).label('mta'),
            func.sum(func.coalesce(CurbTrip.improvement_surcharge, 0)).label('tif'),
            func.sum(func.coalesce(CurbTrip.congestion_fee, 0)).label('congestion'),
            func.sum(func.coalesce(CurbTrip.cbdt_fee, 0)).label('cbdt'),
            func.sum(func.coalesce(CurbTrip.airport_fee, 0)).label('airport')
        ).filter(
            and_(CurbTrip.driver_id == driver_id, CurbTrip.start_time >= period_start, CurbTrip.start_time <= period_end)
        ).first()
        
        if not result:
            return {"mta": 0.00, "tif": 0.00, "congestion": 0.00, "cbdt": 0.00, "airport": 0.00, "total": 0.00}
        
        mta = float(result.mta or 0)
        tif = float(result.tif or 0)
        congestion = float(result.congestion or 0)
        cbdt = float(result.cbdt or 0)
        airport = float(result.airport or 0)
        
        return {"mta": mta, "tif": tif, "congestion": congestion, "cbdt": cbdt, "airport": airport, "total": mta + tif + congestion + cbdt + airport}


    def _get_ezpass_detail(self, lease: Lease, period_start: date, period_end: date) -> Dict:
        """Get detailed EZPass transactions consolidated for all drivers"""
        from app.ezpass.models import EZPassTransaction
        
        transactions = self.db.query(EZPassTransaction).filter(
            and_(
                or_(EZPassTransaction.vehicle_id == lease.vehicle_id, EZPassTransaction.medallion_id == lease.medallion_id),
                EZPassTransaction.transaction_datetime <= period_end,
                EZPassTransaction.status.in_(['ASSOCIATED', 'POSTED_TO_LEDGER'])
            )
        ).order_by(EZPassTransaction.transaction_datetime).all()
        
        if not transactions:
            return {"transactions": [], "total": 0.00}
        
        formatted_transactions = []
        total = Decimal("0.00")
        
        for trans in transactions:
            amount = Decimal(str(trans.toll_amount or 0))
            total += amount
            formatted_transactions.append({
                "date_time": trans.transaction_datetime.isoformat() if trans.transaction_datetime else "",
                "tag_plate": trans.tag_number or trans.plate_number or "",
                "transaction_id": trans.transaction_id or "",
                "plaza": trans.plaza or "",
                "toll": float(amount),
                "balance": float(amount)
            })
        
        return {"transactions": formatted_transactions, "total": float(total)}


    def _get_driver_ezpass_detail(self, driver: Driver, period_start: date, period_end: date) -> Dict:
        """Get EZPass detail for specific driver"""
        from app.ezpass.models import EZPassTransaction
        
        transactions = self.db.query(EZPassTransaction).filter(
            and_(
                EZPassTransaction.driver_id == driver.id,
                EZPassTransaction.transaction_datetime >= period_start,
                EZPassTransaction.transaction_datetime <= period_end,
                EZPassTransaction.status.in_(['ASSOCIATED', 'POSTED_TO_LEDGER'])
            )
        ).order_by(EZPassTransaction.transaction_datetime).all()
        
        if not transactions:
            return {"transactions": [], "total": 0.00}
        
        formatted_transactions = []
        total = Decimal("0.00")
        
        for trans in transactions:
            amount = Decimal(str(trans.toll_amount or 0))
            total += amount
            formatted_transactions.append({
                "date_time": trans.transaction_datetime.isoformat() if trans.transaction_datetime else "",
                "tag_plate": trans.tag_number or trans.plate_number or "",
                "plaza": trans.plaza or "",
                "toll": float(amount),
                "balance": float(amount)
            })
        
        return {"transactions": formatted_transactions, "total": float(total)}


    def _get_pvb_detail(self, lease: Lease, period_start: date, period_end: date) -> Dict:
        """Get detailed PVB violations consolidated for all drivers"""
        from app.pvb.models import PVBViolation
        
        violations = self.db.query(PVBViolation).filter(
            and_(
                or_(PVBViolation.vehicle_id == lease.vehicle_id, PVBViolation.lease_id == lease.id),
                PVBViolation.issue_date <= period_end,
                PVBViolation.status.in_(['ASSOCIATED', 'POSTED_TO_LEDGER'])
            )
        ).order_by(PVBViolation.issue_date).all()
        
        if not violations:
            return {"tickets": [], "total": 0.00}
        
        formatted_violations = []
        total = Decimal("0.00")
        
        for viol in violations:
            fine = Decimal(str(viol.fine_amount or 0))
            charge = Decimal(str(viol.penalty or 0))
            violation_total = fine + charge
            total += violation_total
            
            formatted_violations.append({
                "summons": viol.summons_number or "",
                "issue_date": viol.issue_date.isoformat() if viol.issue_date else "",
                "violation": viol.violation_description or "",
                "county": viol.county or "",
                "license": viol.plate_number or "",
                "fine": float(fine),
                "charge": float(charge),
                "total": float(violation_total),
                "balance": float(violation_total)
            })
        
        return {"tickets": formatted_violations, "total": float(total)}


    def _get_driver_pvb_detail(self, driver: Driver, period_start: date, period_end: date) -> Dict:
        """Get PVB detail for specific driver"""
        from app.pvb.models import PVBViolation
        
        violations = self.db.query(PVBViolation).filter(
            and_(
                PVBViolation.driver_id == driver.id,
                PVBViolation.issue_date >= period_start,
                PVBViolation.issue_date <= period_end,
                PVBViolation.status.in_(['ASSOCIATED', 'POSTED_TO_LEDGER'])
            )
        ).order_by(PVBViolation.issue_date).all()
        
        if not violations:
            return {"tickets": [], "total": 0.00}
        
        formatted_violations = []
        total = Decimal("0.00")
        
        for viol in violations:
            fine = Decimal(str(viol.fine_amount or 0))
            charge = Decimal(str(viol.penalty or 0))
            violation_total = fine + charge
            total += violation_total
            
            formatted_violations.append({
                "summons": viol.summons_number or "",
                "issue_date": viol.issue_date.isoformat() if viol.issue_date else "",
                "violation": viol.violation_description or "",
                "fine": float(fine),
                "charge": float(charge),
                "total": float(violation_total),
                "balance": float(violation_total)
            })
        
        return {"tickets": formatted_violations, "total": float(total)}


    def _get_tlc_detail(self, lease: Lease, period_start: date, period_end: date) -> Dict:
        """Get TLC ticket details (lease level only)"""
        from app.tlc.models import TLCViolation
        
        violations = self.db.query(TLCViolation).filter(
            and_(
                or_(TLCViolation.lease_id == lease.id, TLCViolation.medallion_id == lease.medallion_id),
                TLCViolation.issue_date <= period_end,
                TLCViolation.status.in_(['OPEN', 'PARTIAL'])
            )
        ).order_by(TLCViolation.issue_date).all()
        
        if not violations:
            return {"tickets": [], "total": 0.00}
        
        formatted_tickets = []
        total = Decimal("0.00")
        
        for ticket in violations:
            fine = Decimal(str(ticket.fine_amount or 0))
            payment = Decimal(str(ticket.amount_paid or 0))
            balance = fine - payment
            total += balance
            
            formatted_tickets.append({
                "date_time": ticket.issue_date.isoformat() if ticket.issue_date else "",
                "ticket_no": ticket.summons_number or "",
                "tlc_license": ticket.tlc_license_number or "",
                "medallion": ticket.medallion_number or "",
                "note": ticket.violation_description or "",
                "fine": float(fine),
                "payment": float(payment)
            })
        
        return {"tickets": formatted_tickets, "total": float(total)}


    def _get_repair_detail(self, lease: Lease, driver: Driver, period_start: date, period_end: date) -> Dict:
        """Get repair invoice details"""
        from app.repairs.models import RepairInvoice, RepairInstallment
        
        repairs = self.db.query(RepairInvoice).filter(
            and_(RepairInvoice.vehicle_id == lease.vehicle_id, RepairInvoice.status.in_(['APPROVED', 'PARTIALLY_PAID', 'OPEN']))
        ).order_by(RepairInvoice.invoice_date).all()
        
        if not repairs:
            return {"invoices": [], "installments": [], "total": 0.00}
        
        formatted_invoices = []
        formatted_installments = []
        total_due = Decimal("0.00")
        
        for repair in repairs:
            invoice_amount = Decimal(str(repair.total_amount or 0))
            amount_paid = Decimal(str(repair.amount_paid or 0))
            balance = invoice_amount - amount_paid
            
            formatted_invoices.append({
                "repair_id": repair.id,
                "invoice_no": repair.invoice_number or "",
                "invoice_date": repair.invoice_date.isoformat() if repair.invoice_date else "",
                "workshop": repair.vendor_name or "Big Apple Workshop",
                "invoice_amount": float(invoice_amount),
                "amount_paid": float(amount_paid),
                "balance": float(balance)
            })
            
            installments = self.db.query(RepairInstallment).filter(
                and_(
                    RepairInstallment.repair_id == repair.id,
                    RepairInstallment.due_date >= period_start,
                    RepairInstallment.due_date <= period_end,
                    RepairInstallment.status == 'PENDING'
                )
            ).all()
            
            for inst in installments:
                inst_amount = Decimal(str(inst.amount or 0))
                total_due += inst_amount
                formatted_installments.append({
                    "installment_id": inst.id,
                    "due_date": inst.due_date.isoformat() if inst.due_date else "",
                    "amount_due": float(inst_amount),
                    "amount_payable": float(inst_amount),
                    "payment": 0.00,
                    "balance": float(inst_amount)
                })
        
        return {"invoices": formatted_invoices, "installments": formatted_installments, "total": float(total_due)}


    def _get_loan_detail(self, lease: Lease, driver: Driver, period_start: date, period_end: date) -> Dict:
        """Get loan installment details"""
        from app.loans.models import DriverLoan, LoanInstallment
        
        loans = self.db.query(DriverLoan).filter(
            and_(DriverLoan.driver_id == driver.id, DriverLoan.status.in_(['ACTIVE', 'PARTIALLY_PAID']))
        ).all()
        
        if not loans:
            return {"loans": [], "installments": [], "total": 0.00}
        
        formatted_loans = []
        formatted_installments = []
        total_due = Decimal("0.00")
        
        for loan in loans:
            loan_amount = Decimal(str(loan.loan_amount or 0))
            amount_paid = Decimal(str(loan.amount_paid or 0))
            balance = loan_amount - amount_paid
            interest_rate = float(loan.interest_rate or 0)
            
            formatted_loans.append({
                "loan_id": loan.id,
                "loan_date": loan.loan_date.isoformat() if loan.loan_date else "",
                "loan_amount": float(loan_amount),
                "interest_rate": interest_rate,
                "total_due": float(loan_amount),
                "amount_paid": float(amount_paid),
                "balance": float(balance)
            })
            
            installments = self.db.query(LoanInstallment).filter(
                and_(
                    LoanInstallment.loan_id == loan.id,
                    LoanInstallment.due_date >= period_start,
                    LoanInstallment.due_date <= period_end,
                    LoanInstallment.status == 'PENDING'
                )
            ).all()
            
            for inst in installments:
                principal = Decimal(str(inst.principal_amount or 0))
                interest = Decimal(str(inst.interest_amount or 0))
                inst_total = principal + interest
                total_due += inst_total
                
                formatted_installments.append({
                    "installment_id": inst.id,
                    "due_date": inst.due_date.isoformat() if inst.due_date else "",
                    "principal": float(principal),
                    "interest": float(interest),
                    "total_due": float(inst_total),
                    "total_payable": float(inst_total),
                    "payment": 0.00,
                    "balance": float(inst_total)
                })
        
        return {"loans": formatted_loans, "installments": formatted_installments, "total": float(total_due)}


    def _get_consolidated_trip_log(self, lease: Lease, period_start: date, period_end: date) -> Dict:
        """Get consolidated trip log for ALL drivers"""
        from app.curb.models import CurbTrip
        
        driver_ids = [ld.driver_id for ld in lease.lease_driver if ld.is_active]
        if not driver_ids:
            return {"trips": [], "total_trips": 0}
        
        trips = self.db.query(CurbTrip).filter(
            and_(
                CurbTrip.driver_id.in_(driver_ids),
                CurbTrip.start_time >= period_start,
                CurbTrip.start_time <= period_end,
                CurbTrip.payment_type == 'CREDIT_CARD'
            )
        ).order_by(CurbTrip.start_time, CurbTrip.start_time).all()
        
        formatted_trips = []
        for trip in trips:
            driver = self.db.query(Driver).filter(Driver.id == trip.driver_id).first()
            tlc_license = driver.tlc_license.tlc_license_number if driver and driver.tlc_license else "Unknown"
            
            formatted_trips.append({
                "trip_date": trip.start_time.isoformat() if trip.start_time else "",
                "tlc_license": tlc_license,
                "trip_number": trip.curb_trip_id or "",
                "amount": float(Decimal(str(trip.total_amount or 0)))
            })
        
        return {"trips": formatted_trips, "total_trips": len(formatted_trips)}


    def _get_driver_trip_log(self, driver: Driver, period_start: date, period_end: date) -> List[Dict]:
        """Get trip log for specific driver"""
        from app.curb.models import CurbTrip
        
        trips = self.db.query(CurbTrip).filter(
            and_(
                CurbTrip.driver_id == driver.id,
                CurbTrip.start_time >= period_start,
                CurbTrip.start_time <= period_end,
                CurbTrip.payment_type == 'CREDIT_CARD'
            )
        ).order_by(CurbTrip.start_time, CurbTrip.start_time).all()
        
        tlc_license = driver.tlc_license.tlc_license_number if driver.tlc_license else "Unknown"
        
        return [{
            "trip_date": trip.start_time.isoformat() if trip.start_time else "",
            "tlc_license": tlc_license,
            "trip_number": trip.curb_trip_id or "",
            "amount": float(Decimal(str(trip.total_amount or 0)))
        } for trip in trips]
    
    def _mask_account_number(self, driver: Driver) -> Optional[str]:
        """Mask bank account number"""
        if hasattr(driver, 'ach_account_number') and driver.ach_account_number:
            account = str(driver.ach_account_number)
            if len(account) > 4:
                return f"****{account[-4:]}"
        return None
    
    def _get_payment_method(self, driver: Driver):
        """Get payment method from driver"""
        if hasattr(driver, 'pay_to_mode'):
            if driver.pay_to_mode and 'ACH' in driver.pay_to_mode.upper():
                return 'ACH'
            elif driver.pay_to_mode and 'CHECK' in driver.pay_to_mode.upper():
                return 'CHECK'
        return None
    
    def generate_dtr_number(self, year: int, sequence: int) -> str:
        """Generate DTR number: DTR-YYYY-NNNNN"""
        return f"DTR-{year}-{sequence:05d}"
    
    def generate_receipt_number(self, year: int, month: int, sequence: int) -> str:
        """Generate receipt number: RCPT-YYMM-NNNNN"""
        return f"RCPT-{year%100:02d}{month:02d}-{sequence:05d}"
    
    def get_next_dtr_sequence(self, year: int) -> int:
        """Get next DTR sequence number for the year"""
        last_dtr = self.db.query(DTR).filter(
            DTR.dtr_number.like(f"DTR-{year}-%")
        ).order_by(DTR.id.desc()).first()
        
        if last_dtr:
            try:
                last_seq = int(last_dtr.dtr_number.split('-')[2])
                return last_seq + 1
            except:
                return 1
        return 1
    
    def get_next_receipt_sequence(self, year: int, month: int) -> int:
        """Get next receipt sequence number for the month"""
        prefix = f"RCPT-{year%100:02d}{month:02d}-"
        last_receipt = self.db.query(DTR).filter(
            DTR.receipt_number.like(f"{prefix}%")
        ).order_by(DTR.id.desc()).first()
        
        if last_receipt:
            try:
                last_seq = int(last_receipt.receipt_number.split('-')[2])
                return last_seq + 1
            except:
                return 1
        return 1
    
    def generate_dtrs_for_period(
        self,
        period_start: date,
        period_end: date,
        auto_finalize: bool = False,
        regenerate_existing: bool = False,
        lease_status_filter: Optional[str] = None
    ) -> Dict:
        """
        Generate DTRs for all active leases for the period.
        
        CORRECTED: Generates ONE DTR PER LEASE, not per driver.
        """
        logger.info(f"Starting DTR generation for period {period_start} to {period_end}")
        
        # Validate period is Sunday to Saturday
        if period_start.weekday() != 6:  # Sunday
            raise DTRValidationError("Period must start on Sunday")
        if period_end.weekday() != 5:  # Saturday
            raise DTRValidationError("Period must end on Saturday")
        
        # Get all active leases for the period
        query = self.db.query(Lease).filter(
            and_(
                or_(
                    Lease.lease_start_date.is_(None),
                    Lease.lease_start_date <= period_end
                ),
                or_(
                    Lease.lease_end_date.is_(None),
                    Lease.lease_end_date >= period_start
                )
            )
        )
        
        if lease_status_filter:
            query = query.filter(Lease.lease_status == lease_status_filter)
        
        leases = query.all()
        
        result = {
            'total_leases': len(leases),
            'generated_count': 0,
            'skipped_count': 0,
            'failed_count': 0,
            'generated': [],
            'skipped': [],
            'failed': []
        }
        
        for lease in leases:
            try:
                # Check if DTR already exists
                existing = self.repository.get_by_lease_period(lease.id, period_start, period_end)
                
                if existing and not regenerate_existing:
                    logger.info(f"DTR already exists for lease {lease.lease_id}: {existing.dtr_number}")
                    result['skipped_count'] += 1
                    result['skipped'].append({
                        'lease_id': lease.lease_id,
                        'reason': 'DTR already exists',
                        'existing_dtr': existing.dtr_number
                    })
                    continue
                
                # Delete existing if regenerating
                if existing and regenerate_existing:
                    self.repository.delete(existing.id)
                    self.db.commit()
                
                # Generate new DTR
                dtr = self.generate_dtr(
                    lease_id=lease.id,
                    period_start=period_start,
                    period_end=period_end,
                    auto_finalize=auto_finalize
                )
                
                result['generated_count'] += 1
                result['generated'].append({
                    'lease_id': lease.lease_id,
                    'dtr_number': dtr.dtr_number,
                    'receipt_number': dtr.receipt_number,
                    'status': dtr.status.value
                })
                
                logger.info(f"Generated DTR {dtr.dtr_number} for lease {lease.lease_id}")
                
            except Exception as e:
                result['failed_count'] += 1
                result['failed'].append({
                    'lease_id': lease.lease_id,
                    'error': str(e)
                })
                logger.error(f"Failed to generate DTR for lease {lease.lease_id}: {str(e)}", exc_info=True)
        
        logger.info(f"DTR generation complete: {result['generated_count']} generated, "
                   f"{result['skipped_count']} skipped, {result['failed_count']} failed")
        
        return result
    
    def finalize_dtr(self, dtr_id: int) -> DTR:
        """Finalize a draft DTR"""
        dtr = self.repository.get_by_id(dtr_id)
        if not dtr:
            raise DTRNotFoundError(f"DTR with ID {dtr_id} not found")
        
        if dtr.status != DTRStatus.DRAFT:
            raise DTRValidationError(f"Only draft DTRs can be finalized. Current status: {dtr.status.value}")
        
        dtr.status = DTRStatus.FINALIZED
        self.db.commit()
        
        logger.info(f"Finalized DTR {dtr.dtr_number}")
        return dtr
    
    def list_dtrs(
        self,
        lease_id: Optional[int] = None,
        driver_id: Optional[int] = None,
        status: Optional[DTRStatus] = None,
        period_start: Optional[date] = None,
        period_end: Optional[date] = None,
        page: int = 1,
        page_size: int = 50
    ) -> Tuple[List[DTR], int]:
        """List DTRs with filters"""
        query = self.db.query(DTR)
        
        if lease_id:
            query = query.filter(DTR.lease_id == lease_id)
        if driver_id:
            query = query.filter(DTR.driver_id == driver_id)
        if status:
            query = query.filter(DTR.status == status)
        if period_start:
            query = query.filter(DTR.period_start_date >= period_start)
        if period_end:
            query = query.filter(DTR.period_end_date <= period_end)
        
        total = query.count()
        
        dtrs = query.order_by(DTR.period_start_date.desc())\
                   .offset((page - 1) * page_size)\
                   .limit(page_size)\
                   .all()
        
        return dtrs, total