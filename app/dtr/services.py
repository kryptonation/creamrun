# app/dtr/services.py

from typing import Dict, Any, List, Optional, Tuple
from datetime import date, datetime, timedelta
from decimal import Decimal

from sqlalchemy.orm import Session
from sqlalchemy import and_, func, or_

from app.dtr.models import DTR, DTRStatus, PaymentMethod
from app.dtr.repository import DTRRepository
from app.dtr.exceptions import (
    DTRGenerationError, DTRValidationError, DTRAlreadyExistsError,
    DTRNotFoundError
)
from app.ledger.models import LedgerBalance, PostingCategory, BalanceStatus
from app.ledger.services import LedgerService
from app.curb.models import CurbTrip, PaymentType
from app.ezpass.models import EZPassTransaction
from app.pvb.models import PVBViolation
from app.tlc.models import TLCViolation
from app.repairs.models import RepairInvoice
from app.loans.models import DriverLoan
from app.leases.models import Lease
from app.drivers.models import Driver
from app.vehicles.models import Vehicle
from app.leases.schemas import LeaseStatus
from app.utils.logger import get_logger

logger = get_logger(__name__)


class DTRService:
    """
    Service for DTR generation and management
    """
    
    def __init__(self, db: Session):
        self.db = db
        self.repository = DTRRepository(db)
        self.ledger_service = LedgerService(db)
    
    def generate_dtr_number(self, year: int, sequence: int) -> str:
        """
        Generate unique DTR number
        Format: DTR-YYYY-NNNNNN
        """
        return f"DTR-{year}-{sequence:06d}"
    
    def generate_receipt_number(self, year: int, month: int, sequence: int) -> str:
        """
        Generate unique receipt number
        Format: TW-YYMM-NNNNN
        """
        return f"TW{year % 100:02d}{month:02d}{sequence:05d}"
    
    def get_next_dtr_sequence(self, year: int) -> int:
        """Get next DTR sequence number for the year"""
        last_dtr = self.db.query(DTR).filter(
            DTR.dtr_number.like(f"DTR-{year}-%")
        ).order_by(DTR.id.desc()).first()
        
        if not last_dtr:
            return 1
        
        try:
            last_sequence = int(last_dtr.dtr_number.split('-')[2])
            return last_sequence + 1
        except (IndexError, ValueError):
            return 1
    
    def get_next_receipt_sequence(self, year: int, month: int) -> int:
        """Get next receipt sequence number for the month"""
        prefix = f"TW{year % 100:02d}{month:02d}"
        last_receipt = self.db.query(DTR).filter(
            DTR.receipt_number.like(f"{prefix}%")
        ).order_by(DTR.id.desc()).first()
        
        if not last_receipt:
            return 1
        
        try:
            last_sequence = int(last_receipt.receipt_number[-5:])
            return last_sequence + 1
        except (IndexError, ValueError):
            return 1
    
    def get_payment_period_dates(self, reference_date: date) -> Tuple[date, date]:
        """
        Get payment period start and end dates
        Period runs from Sunday 00:00 to Saturday 23:59
        """
        # Find the most recent Sunday
        days_since_sunday = reference_date.weekday() + 1  # Monday=0, so Sunday=6, adjust
        if days_since_sunday == 7:  # If today is Sunday
            period_start = reference_date
        else:
            period_start = reference_date - timedelta(days=days_since_sunday)
        
        period_end = period_start + timedelta(days=6)
        
        return period_start, period_end
    
    def validate_lease_and_driver(self, lease_id: int, driver_id: int) -> Tuple[Lease, Driver]:
        """Validate that lease and driver exist and are active"""
        lease = self.db.query(Lease).filter(Lease.id == lease_id).first()
        if not lease:
            raise DTRValidationError(f"Lease with ID {lease_id} not found")
        
        if not lease.is_active:
            raise DTRValidationError(f"Lease {lease.lease_id} is not active")
        
        driver = self.db.query(Driver).filter(Driver.id == driver_id).first()
        if not driver:
            raise DTRValidationError(f"Driver with ID {driver_id} not found")
        
        return lease, driver
    
    def get_curb_earnings(
        self, 
        driver_id: int, 
        period_start: date, 
        period_end: date
    ) -> Decimal:
        """Get total credit card earnings from CURB for the period"""
        total = self.db.query(
            func.coalesce(func.sum(CurbTrip.total_amount), 0)
        ).filter(
            and_(
                CurbTrip.driver_id == driver_id,
                func.date(CurbTrip.start_time) >= period_start,
                func.date(CurbTrip.start_time) <= period_end,
                CurbTrip.payment_type == PaymentType.CREDIT_CARD
            )
        ).scalar()
        
        return Decimal(str(total))
    
    def get_curb_trip_log(
        self,
        driver_id: int,
        period_start: date,
        period_end: date
    ) -> List[Dict[str, Any]]:
        """Get credit card trip log from CURB"""
        trips = self.db.query(CurbTrip).filter(
            and_(
                CurbTrip.driver_id == driver_id,
                func.date(CurbTrip.start_time) >= period_start,
                func.date(CurbTrip.start_time) <= period_end,
                CurbTrip.payment_type == PaymentType.CREDIT_CARD
            )
        ).order_by(CurbTrip.start_time).all()
        
        trip_log = []
        for trip in trips:
            net_fare = (trip.fare or 0) + (trip.tips or 0)
            trip_log.append({
                "trip_date": trip.start_time.date().isoformat() if trip.start_time else None,
                "tlc_license": trip.driver.tlc_license.tlc_license_number if trip.driver and trip.driver.tlc_license else None,
                "trip_number": trip.curb_trip_id,
                "amount": float(net_fare)
            })
        
        return trip_log
    
    def get_tax_breakdown(
        self,
        driver_id: int,
        period_start: date,
        period_end: date
    ) -> Dict[str, Any]:
        """Get detailed tax breakdown from CURB trips"""
        trips = self.db.query(CurbTrip).filter(
            and_(
                CurbTrip.driver_id == driver_id,
                func.date(CurbTrip.start_time) >= period_start,
                func.date(CurbTrip.start_time) <= period_end
            )
        ).all()
        
        # Initialize counters
        tax_totals = {
            "airport_access_fee": Decimal("0.00"),
            "cbdt": Decimal("0.00"),
            "congestion_tax": Decimal("0.00"),
            "mta_tax": Decimal("0.00"),
            "tif": Decimal("0.00")
        }
        
        trip_counts = {
            "airport_trips": 0,
            "cbdt_trips": 0,
            "congestion_trips": 0,
            "mta_trips": 0,
            "tif_trips": 0
        }
        
        trip_types = {
            "cash_trips": 0,
            "cc_trips": 0
        }
        
        for trip in trips:
            # Sum up taxes
            if trip.airport_fee:
                tax_totals["airport_access_fee"] += trip.airport_fee
                trip_counts["airport_trips"] += 1
            
            if trip.cbdt_fee:
                tax_totals["cbdt"] += trip.cbdt_fee
                trip_counts["cbdt_trips"] += 1
            
            if trip.congestion_fee:
                tax_totals["congestion_tax"] += trip.congestion_fee
                trip_counts["congestion_trips"] += 1
            
            if trip.surcharge:
                tax_totals["mta_tax"] += trip.surcharge
                trip_counts["mta_trips"] += 1
            
            if trip.improvement_surcharge:
                tax_totals["tif"] += trip.improvement_surcharge
                trip_counts["tif_trips"] += 1
            
            # Count trip types
            if trip.payment_type == PaymentType.CREDIT_CARD:
                trip_types["cc_trips"] += 1
            else:
                trip_types["cash_trips"] += 1
        
        # Calculate total
        total_taxes = sum(tax_totals.values())
        
        return {
            "charges": [
                {
                    "charge_type": "Airport Access Fee",
                    "amount": float(tax_totals["airport_access_fee"]),
                    "total_trips": trip_counts["airport_trips"],
                    "cash_trips": 0,  # Would need additional logic to split
                    "cc_trips": trip_counts["airport_trips"]
                },
                {
                    "charge_type": "CBDT",
                    "amount": float(tax_totals["cbdt"]),
                    "total_trips": trip_counts["cbdt_trips"],
                    "cash_trips": 0,
                    "cc_trips": trip_counts["cbdt_trips"]
                },
                {
                    "charge_type": "Congestion Tax - CPS",
                    "amount": float(tax_totals["congestion_tax"]),
                    "total_trips": trip_counts["congestion_trips"],
                    "cash_trips": 0,
                    "cc_trips": trip_counts["congestion_trips"]
                },
                {
                    "charge_type": "MTA Tax (TLC Rule 58-21(1)(d))",
                    "amount": float(tax_totals["mta_tax"]),
                    "total_trips": trip_counts["mta_trips"],
                    "cash_trips": 0,
                    "cc_trips": trip_counts["mta_trips"]
                },
                {
                    "charge_type": "Improvement Tax - TIF (TLC Rule 54-17(c))",
                    "amount": float(tax_totals["tif"]),
                    "total_trips": trip_counts["tif_trips"],
                    "cash_trips": 0,
                    "cc_trips": trip_counts["tif_trips"]
                }
            ],
            "total": float(total_taxes),
            "total_all_trips": len(trips),
            "total_cash_trips": trip_types["cash_trips"],
            "total_cc_trips": trip_types["cc_trips"]
        }
    
    # app/dtr/services.py (Part 2/2)
# Continuation of DTRService class

    def get_ezpass_charges(
        self,
        vehicle_id: int,
        period_start: date,
        period_end: date
    ) -> Tuple[Decimal, List[Dict[str, Any]]]:
        """Get EZPass toll charges and details"""
        # Get from ledger balances
        balances = self.db.query(LedgerBalance).filter(
            and_(
                LedgerBalance.vehicle_id == vehicle_id,
                LedgerBalance.category == PostingCategory.EZPASS,
                LedgerBalance.status == BalanceStatus.OPEN,
                LedgerBalance.created_on <= period_end
            )
        ).all()
        
        total_charges = sum([balance.balance for balance in balances], Decimal("0.00"))
        
        # Get transaction details
        transactions = self.db.query(EZPassTransaction).filter(
            and_(
                EZPassTransaction.vehicle_id == vehicle_id,
                EZPassTransaction.transaction_datetime >= datetime.combine(period_start, datetime.min.time()),
                EZPassTransaction.transaction_datetime <= datetime.combine(period_end, datetime.max.time())
            )
        ).all()
        
        details = []
        for txn in transactions:
            details.append({
                "transaction_date": txn.transaction_datetime.isoformat() if txn.transaction_datetime else None,
                "tlc_license": txn.driver.tlc_license.tlc_license_number if txn.driver and txn.driver.tlc_license else None,
                "plate_no": txn.plate_number,
                "agency": txn.agency_name,
                "entry": txn.entry_plaza,
                "exit_lane": txn.exit_plaza,
                "toll": float(txn.toll_amount) if txn.toll_amount else 0.00,
                "prior_balance": 0.00,  # Would come from previous DTR
                "payment": float(txn.toll_amount) if txn.toll_amount else 0.00,
                "balance": 0.00
            })
        
        return total_charges, details
    
    def get_pvb_violations(
        self,
        vehicle_id: int,
        period_start: date,
        period_end: date
    ) -> Tuple[Decimal, List[Dict[str, Any]]]:
        """Get PVB violations and details"""
        # Get from ledger balances
        balances = self.db.query(LedgerBalance).filter(
            and_(
                LedgerBalance.vehicle_id == vehicle_id,
                LedgerBalance.category == PostingCategory.PVB,
                LedgerBalance.status == BalanceStatus.OPEN,
                LedgerBalance.created_on <= period_end
            )
        ).all()
        
        total_charges = sum([balance.balance for balance in balances], Decimal("0.00"))
        
        # Get violation details
        violations = self.db.query(PVBViolation).filter(
            and_(
                PVBViolation.vehicle_id == vehicle_id,
                PVBViolation.issue_date <= period_end
            )
        ).all()
        
        details = []
        for vio in violations:
            details.append({
                "date_time": vio.issue_date.isoformat() if vio.issue_date else None,
                "ticket": vio.violation_number,
                "tlc_license": vio.driver.tlc_license.tlc_license_number if vio.driver and vio.driver.tlc_license else "Unknown",
                "note": vio.violation_description,
                "fine": float(vio.fine_amount) if vio.fine_amount else 0.00,
                "charge": float(vio.penalties) if vio.penalties else 0.00,
                "total": float((vio.fine_amount or 0) + (vio.penalties or 0)),
                "prior_balance": 0.00,
                "payment": 0.00,
                "balance": float((vio.fine_amount or 0) + (vio.penalties or 0))
            })
        
        return total_charges, details
    
    def get_tlc_tickets(
        self,
        medallion_id: int,
        period_start: date,
        period_end: date
    ) -> Tuple[Decimal, List[Dict[str, Any]]]:
        """Get TLC tickets and details"""
        # Get from ledger balances
        balances = self.db.query(LedgerBalance).filter(
            and_(
                LedgerBalance.medallion_id == medallion_id,
                LedgerBalance.category == PostingCategory.TLC,
                LedgerBalance.status == BalanceStatus.OPEN,
                LedgerBalance.created_on <= period_end
            )
        ).all()
        
        total_charges = sum([balance.balance for balance in balances], Decimal("0.00"))
        
        # Get ticket details
        tickets = self.db.query(TLCViolation).filter(
            and_(
                TLCViolation.medallion_id == medallion_id,
                TLCViolation.issue_date <= period_end
            )
        ).all()
        
        details = []
        for ticket in tickets:
            details.append({
                "date_time": ticket.issue_date.isoformat() if ticket.issue_date else None,
                "ticket": ticket.ticket_number,
                "tlc_license": ticket.driver.tlc_license.tlc_license_number if ticket.driver and ticket.driver.tlc_license else None,
                "medallion": ticket.medallion.medallion_number if ticket.medallion else None,
                "note": ticket.violation_description,
                "fine": float(ticket.fine_amount) if ticket.fine_amount else 0.00,
                "prior_balance": 0.00,
                "payment": 0.00,
                "balance": float(ticket.fine_amount) if ticket.fine_amount else 0.00
            })
        
        return total_charges, details
    
    def get_repair_charges(
        self,
        lease_id: int,
        period_start: date,
        period_end: date
    ) -> Tuple[Decimal, List[Dict[str, Any]]]:
        """Get repair charges and installment details"""
        # Get installments due in this period from ledger
        balances = self.db.query(LedgerBalance).filter(
            and_(
                LedgerBalance.lease_id == lease_id,
                LedgerBalance.category == PostingCategory.REPAIR,
                LedgerBalance.status == BalanceStatus.OPEN,
                LedgerBalance.created_on <= period_end
            )
        ).all()
        
        total_charges = sum([balance.balance for balance in balances], Decimal("0.00"))
        
        # Get repair details
        repairs = []
        for balance in balances:
            # Get the repair invoice
            repair_ref = balance.reference_id
            repair_invoice = self.db.query(RepairInvoice).filter(
                RepairInvoice.repair_id == repair_ref
            ).first()
            
            if repair_invoice:
                repairs.append({
                    "repair_id": repair_invoice.repair_id,
                    "invoice_no": repair_invoice.invoice_number,
                    "invoice_date": repair_invoice.invoice_date.isoformat() if repair_invoice.invoice_date else None,
                    "workshop": repair_invoice.workshop,
                    "invoice_amount": float(repair_invoice.total_amount) if repair_invoice.total_amount else 0.00,
                    "amount_paid": float(balance.original_amount - balance.balance),
                    "balance": float(balance.balance)
                })
        
        return total_charges, repairs
    
    def get_loan_charges(
        self,
        driver_id: int,
        period_start: date,
        period_end: date
    ) -> Tuple[Decimal, List[Dict[str, Any]]]:
        """Get loan installment charges"""
        # Get installments due from ledger
        balances = self.db.query(LedgerBalance).filter(
            and_(
                LedgerBalance.driver_id == driver_id,
                LedgerBalance.category == PostingCategory.LOAN,
                LedgerBalance.status == BalanceStatus.OPEN,
                LedgerBalance.created_on <= period_end
            )
        ).all()
        
        total_charges = sum([balance.balance for balance in balances], Decimal("0.00"))
        
        # Get loan details
        loans = []
        for balance in balances:
            loan_ref = balance.reference_id
            loan = self.db.query(DriverLoan).filter(
                DriverLoan.loan_id == loan_ref
            ).first()
            
            if loan:
                loans.append({
                    "loan_id": loan.loan_id,
                    "loan_date": loan.loan_date.isoformat() if loan.loan_date else None,
                    "loan_amount": float(loan.loan_amount) if loan.loan_amount else 0.00,
                    "interest_rate": float(loan.interest_rate) if loan.interest_rate else 0.00,
                    "total_due": float(loan.total_amount_due) if loan.total_amount_due else 0.00,
                    "amount_paid": float(balance.original_amount - balance.balance),
                    "balance": float(balance.balance)
                })
        
        return total_charges, loans
    
    def get_misc_charges(
        self,
        driver_id: int,
        period_start: date,
        period_end: date
    ) -> Decimal:
        """Get miscellaneous charges"""
        balances = self.db.query(LedgerBalance).filter(
            and_(
                LedgerBalance.driver_id == driver_id,
                LedgerBalance.category == PostingCategory.MISC,
                LedgerBalance.status == BalanceStatus.OPEN,
                LedgerBalance.created_on <= period_end
            )
        ).all()
        
        total_charges = sum([balance.balance for balance in balances], Decimal("0.00"))
        return total_charges
    
    def get_lease_amount(
        self,
        lease_id: int,
        period_start: date,
        period_end: date
    ) -> Decimal:
        """Get lease amount for the period"""
        # Get from ledger balances
        balances = self.db.query(LedgerBalance).filter(
            and_(
                LedgerBalance.lease_id == lease_id,
                LedgerBalance.category == PostingCategory.LEASE,
                LedgerBalance.status == BalanceStatus.OPEN,
                LedgerBalance.created_on <= period_end
            )
        ).all()
        
        total_lease = sum([balance.balance for balance in balances], Decimal("0.00"))
        return total_lease
    
    def get_prior_balance(
        self,
        driver_id: int,
        lease_id: int,
        period_start: date
    ) -> Decimal:
        """Get prior balance carried forward from previous periods"""
        # Get previous DTRs that are unpaid or have remaining balance
        previous_dtr = self.db.query(DTR).filter(
            and_(
                DTR.driver_id == driver_id,
                DTR.lease_id == lease_id,
                DTR.period_end_date < period_start,
                DTR.status != DTRStatus.VOIDED
            )
        ).order_by(DTR.period_end_date.desc()).first()
        
        if previous_dtr and previous_dtr.total_due_to_driver < 0:
            return abs(previous_dtr.total_due_to_driver)
        
        return Decimal("0.00")
    
    def get_vehicle_alerts(self, vehicle_id: int, reference_date: date) -> List[Dict[str, Any]]:
        """Get vehicle-related alerts (expiry dates, etc.)"""
        vehicle = self.db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
        if not vehicle:
            return []
        
        alerts = []
        
        # TLC Inspection alert - get from latest inspection
        if vehicle.inspections:
            latest_inspection = max(vehicle.inspections, key=lambda x: x.inspection_date or date.min)
            if latest_inspection and latest_inspection.next_inspection_due_date:
                alerts.append({
                    "type": "TLC Inspection",
                    "expiry_date": latest_inspection.next_inspection_due_date.isoformat()
                })
        
        # Mile Run alert - check if any inspection shows mile_run requirement
        if vehicle.inspections:
            for inspection in vehicle.inspections:
                if inspection.mile_run and inspection.next_inspection_due_date:
                    alerts.append({
                        "type": "Mile Run",
                        "expiry_date": inspection.next_inspection_due_date.isoformat()
                    })
                    break  # Only add one mile run alert
        
        # DMV Registration alert - get from latest registration
        if vehicle.registrations:
            latest_registration = max(vehicle.registrations, key=lambda x: x.created_on or date.min)
            if latest_registration and hasattr(latest_registration, 'registration_expiry_date') and latest_registration.registration_expiry_date:
                alerts.append({
                    "type": "DMV Registration",
                    "expiry_date": latest_registration.registration_expiry_date.isoformat()
                })
        
        return alerts
    
    def get_driver_alerts(self, driver_id: int, reference_date: date) -> List[Dict[str, Any]]:
        """Get driver-related alerts"""
        driver = self.db.query(Driver).filter(Driver.id == driver_id).first()
        if not driver:
            return []
        
        alerts = []
        
        # TLC License expiry - get from TLC license relationship
        if driver.tlc_license and driver.tlc_license.tlc_license_expiry_date:
            alerts.append({
                "license_type": "TLC License 1",
                "expiry_date": driver.tlc_license.tlc_license_expiry_date.isoformat()
            })
        
        # DMV License expiry - get from DMV license relationship  
        if driver.dmv_license and driver.dmv_license.dmv_license_expiry_date:
            alerts.append({
                "license_type": "DMV License",
                "expiry_date": driver.dmv_license.dmv_license_expiry_date.isoformat()
            })
        
        return alerts
    
    def generate_dtr(
        self,
        lease_id: int,
        driver_id: int,
        period_start: date,
        period_end: date,
        auto_finalize: bool = False
    ) -> DTR:
        """
        Generate DTR for a driver/lease for the specified period
        """
        try:
            logger.info(f"Generating DTR for driver_id={driver_id}, lease_id={lease_id}, period={period_start} to {period_end}")
            
            # 1. Validate lease and driver
            lease, driver = self.validate_lease_and_driver(lease_id, driver_id)
            
            # 2. Check if DTR already exists for this period
            existing_dtr = self.repository.get_by_period(driver_id, lease_id, period_start, period_end)
            if existing_dtr:
                raise DTRAlreadyExistsError(
                    f"DTR already exists for this period: {existing_dtr.dtr_number}"
                )
            
            # 3. Generate DTR and receipt numbers
            generation_date = datetime.now()
            year = generation_date.year
            month = generation_date.month
            
            dtr_sequence = self.get_next_dtr_sequence(year)
            dtr_number = self.generate_dtr_number(year, dtr_sequence)
            
            receipt_sequence = self.get_next_receipt_sequence(year, month)
            receipt_number = self.generate_receipt_number(year, month, receipt_sequence)
            
            # 4. Collect all earnings and charges
            
            # Earnings
            gross_cc_earnings = self.get_curb_earnings(driver_id, period_start, period_end)
            
            # Tax breakdown
            tax_breakdown = self.get_tax_breakdown(driver_id, period_start, period_end)
            mta_tif_fees = Decimal(str(tax_breakdown["total"]))
            
            # Lease charges
            lease_amount = self.get_lease_amount(lease_id, period_start, period_end)
            
            # EZPass
            ezpass_tolls, ezpass_detail = self.get_ezpass_charges(
                lease.vehicle_id, period_start, period_end
            )
            
            # PVB
            pvb_charges, pvb_detail = self.get_pvb_violations(
                lease.vehicle_id, period_start, period_end
            )
            
            # TLC
            tlc_charges, tlc_detail = self.get_tlc_tickets(
                lease.medallion_id, period_start, period_end
            )
            
            # Repairs
            repair_charges, repair_detail = self.get_repair_charges(
                lease_id, period_start, period_end
            )
            
            # Loans
            loan_charges, loan_detail = self.get_loan_charges(
                driver_id, period_start, period_end
            )
            
            # Miscellaneous
            misc_charges = self.get_misc_charges(driver_id, period_start, period_end)
            
            # Prior balance
            prior_balance = self.get_prior_balance(driver_id, lease_id, period_start)
            
            # 5. Calculate totals
            subtotal_charges = (
                lease_amount + mta_tif_fees + ezpass_tolls + pvb_charges +
                tlc_charges + repair_charges + loan_charges + misc_charges
            )
            
            net_earnings = gross_cc_earnings - subtotal_charges - prior_balance
            total_due_to_driver = net_earnings
            
            # 6. Get trip log and alerts
            trip_log = self.get_curb_trip_log(driver_id, period_start, period_end)
            vehicle_alerts = self.get_vehicle_alerts(lease.vehicle_id, period_end)
            driver_alerts = self.get_driver_alerts(driver_id, period_end)
            
            # 7. Get driver payment preferences
            payment_method = None
            account_masked = None
            if driver.pay_to_mode:
                # Convert pay_to_mode to PaymentMethod enum if it matches
                try:
                    payment_method = PaymentMethod(driver.pay_to_mode)
                except ValueError:
                    # If pay_to_mode doesn't match enum, default to None
                    payment_method = None
            
            if driver.driver_bank_account and driver.driver_bank_account.bank_account_number:
                # Mask account number - show only last 4 digits
                account_num_str = str(driver.driver_bank_account.bank_account_number)
                account_masked = "x" * (len(account_num_str) - 4) + account_num_str[-4:]
            
            # 8. Create DTR record
            dtr_data = {
                "dtr_number": dtr_number,
                "receipt_number": receipt_number,
                "period_start_date": period_start,
                "period_end_date": period_end,
                "generation_date": generation_date,
                "lease_id": lease_id,
                "driver_id": driver_id,
                "vehicle_id": lease.vehicle_id,
                "medallion_id": lease.medallion_id,
                "status": DTRStatus.FINALIZED if auto_finalize else DTRStatus.DRAFT,
                "gross_cc_earnings": gross_cc_earnings,
                "gross_cash_earnings": Decimal("0.00"),  # Cash not tracked in current system
                "total_gross_earnings": gross_cc_earnings,
                "lease_amount": lease_amount,
                "mta_tif_fees": mta_tif_fees,
                "ezpass_tolls": ezpass_tolls,
                "violation_tickets": pvb_charges,
                "tlc_tickets": tlc_charges,
                "repairs": repair_charges,
                "driver_loans": loan_charges,
                "misc_charges": misc_charges,
                "subtotal_charges": subtotal_charges,
                "prior_balance": prior_balance,
                "net_earnings": net_earnings,
                "total_due_to_driver": total_due_to_driver,
                "payment_method": payment_method,
                "account_number_masked": account_masked,
                "is_additional_driver_dtr": False,
                "tax_breakdown": tax_breakdown,
                "ezpass_detail": ezpass_detail,
                "pvb_detail": pvb_detail,
                "tlc_detail": tlc_detail,
                "repair_detail": repair_detail,
                "loan_detail": loan_detail,
                "trip_log": trip_log,
                "alerts": {
                    "vehicle": vehicle_alerts,
                    "driver": driver_alerts
                }
            }
            
            dtr = self.repository.create(dtr_data)
            self.db.commit()
            
            logger.info(f"Successfully generated DTR: {dtr.dtr_number}")
            return dtr
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error generating DTR: {str(e)}")
            raise DTRGenerationError(f"Failed to generate DTR: {str(e)}")
    
    def batch_generate_dtrs(
        self,
        period_start: date,
        period_end: date,
        auto_finalize: bool = False
    ) -> List[DTR]:
        """
        Generate DTRs for all active leases for the specified period
        """
        # Get all active leases
        active_leases = self.db.query(Lease).filter(
            Lease.is_active == True
        ).all()
        
        generated_dtrs = []
        errors = []
        
        for lease in active_leases:
            try:
                # Get primary driver for the lease
                # Assuming lease has a primary driver relationship
                if lease.driver_id:
                    dtr = self.generate_dtr(
                        lease_id=lease.id,
                        driver_id=lease.driver_id,
                        period_start=period_start,
                        period_end=period_end,
                        auto_finalize=auto_finalize
                    )
                    generated_dtrs.append(dtr)
                    logger.info(f"Generated DTR for lease {lease.lease_id}")
            except Exception as e:
                error_msg = f"Failed to generate DTR for lease {lease.lease_id}: {str(e)}"
                logger.error(error_msg)
                errors.append(error_msg)
                continue
        
        if errors:
            logger.warning(f"Batch generation completed with {len(errors)} errors")
        
        return generated_dtrs
    
    def finalize_dtr(self, dtr_id: int) -> DTR:
        """Finalize a draft DTR"""
        dtr = self.repository.get_by_id(dtr_id)
        if not dtr:
            raise DTRNotFoundError(f"DTR with ID {dtr_id} not found")
        
        if dtr.status != DTRStatus.DRAFT:
            raise DTRValidationError(f"Only draft DTRs can be finalized. Current status: {dtr.status}")
        
        dtr = self.repository.finalize_dtr(dtr_id)
        self.db.commit()
        
        logger.info(f"Finalized DTR: {dtr.dtr_number}")
        return dtr
    
    def void_dtr(self, dtr_id: int, reason: str) -> DTR:
        """Void a DTR"""
        dtr = self.repository.get_by_id(dtr_id)
        if not dtr:
            raise DTRNotFoundError(f"DTR with ID {dtr_id} not found")
        
        if dtr.status == DTRStatus.PAID:
            raise DTRValidationError("Cannot void a paid DTR. Please reverse the payment first.")
        
        dtr = self.repository.void_dtr(dtr_id, reason)
        self.db.commit()
        
        logger.info(f"Voided DTR: {dtr.dtr_number}, Reason: {reason}")
        return dtr
    
    def mark_dtr_as_paid(
        self,
        dtr_id: int,
        payment_method: PaymentMethod,
        payment_date: datetime,
        ach_batch_number: Optional[str] = None,
        check_number: Optional[str] = None
    ) -> DTR:
        """Mark DTR as paid"""
        dtr = self.repository.get_by_id(dtr_id)
        if not dtr:
            raise DTRNotFoundError(f"DTR with ID {dtr_id} not found")
        
        if dtr.status != DTRStatus.FINALIZED:
            raise DTRValidationError("Only finalized DTRs can be marked as paid")
        
        dtr = self.repository.mark_as_paid(
            dtr_id=dtr_id,
            payment_method=payment_method,
            payment_date=payment_date,
            ach_batch_number=ach_batch_number,
            check_number=check_number
        )
        self.db.commit()
        
        logger.info(f"Marked DTR as paid: {dtr.dtr_number}")
        return dtr
    
    def get_dtr(self, dtr_id: int) -> DTR:
        """Get DTR by ID"""
        dtr = self.repository.get_by_id(dtr_id)
        if not dtr:
            raise DTRNotFoundError(f"DTR with ID {dtr_id} not found")
        return dtr
    
    def get_dtr_by_number(self, dtr_number: str) -> DTR:
        """Get DTR by DTR number"""
        dtr = self.repository.get_by_dtr_number(dtr_number)
        if not dtr:
            raise DTRNotFoundError(f"DTR with number {dtr_number} not found")
        return dtr
    
    def list_dtrs(
        self,
        driver_id: Optional[int] = None,
        lease_id: Optional[int] = None,
        status: Optional[DTRStatus] = None,
        period_start: Optional[date] = None,
        period_end: Optional[date] = None,
        skip: int = 0,
        limit: int = 100
    ) -> tuple[List[DTR], int]:
        """List DTRs with filters"""
        return self.repository.list_dtrs(
            driver_id=driver_id,
            lease_id=lease_id,
            status=status,
            period_start=period_start,
            period_end=period_end,
            skip=skip,
            limit=limit
        )
    
    def generate_dtrs_for_period(
        self,
        period_start: date,
        period_end: date,
        auto_finalize: bool = False,
        regenerate_existing: bool = False,
        lease_status_filter: Optional[str] = None
    ) -> Dict:
        """
        Generate DTRs for all leases for a specified period.
        
        Args:
            period_start: Start date of the period
            period_end: End date of the period
            auto_finalize: Whether to automatically finalize generated DTRs
            regenerate_existing: Whether to regenerate existing DTRs
            lease_status_filter: Optional lease status filter (e.g., "ACTIVE")
            
        Returns:
            Dictionary with generation results:
            {
                'total_leases': int,
                'generated_count': int,
                'skipped_count': int,
                'failed_count': int,
                'generated': [list of generated DTR info],
                'skipped': [list of skipped lease info],
                'failed': [list of failed lease info with errors]
            }
        """
        try:
            logger.info(
                f"Generating DTRs for period {period_start} to {period_end}, "
                f"auto_finalize={auto_finalize}, regenerate={regenerate_existing}"
            )
            
            # Build query for active leases during the period
            query = self.db.query(Lease)
            
            # Filter leases that were active during the period
            query = query.filter(
                and_(
                    Lease.lease_start_date <= period_end,
                    or_(
                        Lease.lease_end_date.is_(None),
                        Lease.lease_end_date >= period_start
                    )
                )
            )
            
            # Apply status filter if provided
            if lease_status_filter:
                try:
                    status_enum = LeaseStatus[lease_status_filter.upper()]
                    query = query.filter(Lease.lease_status == status_enum)
                except KeyError as e:
                    raise DTRValidationError(
                        f"Invalid lease status: {lease_status_filter}. "
                        f"Valid statuses: {', '.join([s.name for s in LeaseStatus])}"
                    ) from e
            else:
                # Default: only active leases
                query = query.filter(Lease.lease_status == LeaseStatus.ACTIVE)
            
            # Get all matching leases
            leases = query.all()
            
            logger.info(f"Found {len(leases)} leases for DTR generation")
            
            results = {
                'total_leases': len(leases),
                'generated_count': 0,
                'skipped_count': 0,
                'failed_count': 0,
                'generated': [],
                'skipped': [],
                'failed': []
            }
            
            # Generate DTR for each lease
            for lease in leases:
                try:
                    # Check if DTR already exists for this period
                    existing_dtr = self.db.query(DTR).filter(
                        and_(
                            DTR.lease_id == lease.id,
                            DTR.period_start_date == period_start,
                            DTR.period_end_date == period_end
                        )
                    ).first()

                    driver_id = None
                    for driver in lease.lease_driver:
                        if not driver.is_additional_driver:
                            driver_id = driver.driver_id
                            break

                    from app.drivers.services import driver_service
                    driver = driver_service.get_drivers(db=self.db, tlc_license_number=driver_id)
                    
                    if existing_dtr and not regenerate_existing:
                        # Skip - DTR already exists
                        results['skipped_count'] += 1
                        results['skipped'].append({
                            'lease_id': lease.lease_id,
                            'driver_id': driver_id,
                            'driver_name': f"{driver.first_name} {driver.last_name}" if driver else None,
                            'dtr_number': existing_dtr.dtr_number,
                            'dtr_status': existing_dtr.status.value,
                            'reason': 'DTR already exists for this period'
                        })
                        logger.debug(f"Skipped lease {lease.lease_id} - DTR already exists")
                        continue
                    
                    # Delete existing DTR if regenerating
                    if existing_dtr and regenerate_existing:
                        logger.info(f"Regenerating DTR for lease {lease.lease_id}")
                        self.db.delete(existing_dtr)
                        self.db.commit()
                    
                    # Get driver for this lease
                    if not driver_id:
                        results['failed_count'] += 1
                        results['failed'].append({
                            'lease_id': lease.lease_id,
                            'driver_id': None,
                            'error': 'Lease has no assigned driver'
                        })
                        continue
                    
                    # Generate DTR
                    dtr = self.generate_dtr(
                        lease_id=lease.id,
                        driver_id=driver.id,
                        period_start=period_start,
                        period_end=period_end,
                        auto_finalize=auto_finalize
                    )
                    
                    results['generated_count'] += 1
                    results['generated'].append({
                        'lease_id': lease.lease_id,
                        'driver_id': driver_id,
                        'driver_name': f"{driver.first_name} {driver.last_name}" if driver else None,
                        'dtr_id': dtr.id,
                        'dtr_number': dtr.dtr_number,
                        'dtr_status': dtr.status.value,
                        'total_earnings': float(dtr.total_gross_earnings),
                        'net_earnings': float(dtr.net_earnings),
                        'total_due': float(dtr.total_due_to_driver)
                    })
                    
                    logger.debug(f"Generated DTR {dtr.dtr_number} for lease {lease.lease_id}")
                    
                except Exception as e:
                    # Log error and continue with next lease
                    results['failed_count'] += 1
                    results['failed'].append({
                        'lease_id': lease.lease_id,
                        'driver_id': driver_id if driver_id else None,
                        'error': str(e)
                    })
                    logger.error(
                        f"Failed to generate DTR for lease {lease.lease_id}: {str(e)}",
                        exc_info=True
                    )
                    # Rollback this transaction and continue
                    self.db.rollback()
            
            logger.info(
                f"DTR generation completed: {results['generated_count']} generated, "
                f"{results['skipped_count']} skipped, {results['failed_count']} failed"
            )
            
            return results
            
        except Exception as e:
            logger.error(f"Error in generate_dtrs_for_period: {str(e)}", exc_info=True)
            raise DTRGenerationError(f"Failed to generate DTRs for period: {str(e)}") from e