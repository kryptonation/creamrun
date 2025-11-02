"""
app/repairs/service.py - Part 1

Business logic for Vehicle Repairs module
Handles repair creation, payment schedule generation, and ledger integration
"""

from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import List, Tuple, Optional, Dict, Any

from sqlalchemy.orm import Session

from app.repairs.models import (
    VehicleRepair, RepairInstallment, WorkshopType, RepairStatus,
    InstallmentStatus, StartWeekOption
)
from app.repairs.repository import RepairRepository, InstallmentRepository
from app.repairs.exceptions import (
    RepairValidationException,
    RepairAmountException, DuplicateInvoiceException, InvalidStatusTransitionException,
    RepairAlreadyPostedException, EntityNotFoundException, LeaseNotActiveException,
)
from app.drivers.models import Driver
from app.leases.models import Lease
from app.vehicles.models import Vehicle
from app.medallions.models import Medallion
from app.utils.logger import get_logger

logger = get_logger(__name__)


class RepairService:
    """Service layer for Vehicle Repairs module"""
    
    # Repair Payment Matrix
    PAYMENT_MATRIX = [
        (0, 200, None),           # $0-200: Paid in full
        (201, 500, Decimal("100.00")),    # $201-500: $100/week
        (501, 1000, Decimal("200.00")),   # $501-1000: $200/week
        (1001, 3000, Decimal("250.00")),  # $1001-3000: $250/week
        (3001, None, Decimal("300.00"))   # >$3000: $300/week
    ]
    
    def __init__(self, db: Session):
        self.db = db
        self.repair_repo = RepairRepository(db)
        self.installment_repo = InstallmentRepository(db)
    
    # === Repair Creation and Management ===
    
    def create_repair(
        self,
        driver_id: int,
        lease_id: int,
        vehicle_id: int,
        medallion_id: Optional[int],
        invoice_number: str,
        invoice_date: date,
        workshop_type: WorkshopType,
        repair_description: Optional[str],
        repair_amount: Decimal,
        start_week: StartWeekOption,
        invoice_document_id: Optional[int],
        user_id: int
    ) -> VehicleRepair:
        """
        Create a new repair invoice and generate payment schedule
        
        Steps:
        1. Validate entities exist and lease is active
        2. Check for duplicate invoice
        3. Calculate weekly installment from payment matrix
        4. Determine start week date
        5. Generate repair ID
        6. Create repair record
        7. Generate installment schedule
        8. Save and return
        """
        logger.info(f"Creating repair for driver {driver_id}, invoice {invoice_number}")
        
        # Step 1: Validate entities
        driver = self.db.query(Driver).filter(Driver.id == driver_id).first()
        if not driver:
            raise EntityNotFoundException("Driver", driver_id)
        
        lease = self.db.query(Lease).filter(Lease.id == lease_id).first()
        if not lease:
            raise EntityNotFoundException("Lease", lease_id)
        
        # Check lease is active
        if not self._is_lease_active(lease):
            raise LeaseNotActiveException(lease_id)
        
        vehicle = self.db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
        if not vehicle:
            raise EntityNotFoundException("Vehicle", vehicle_id)
        
        medallion = None
        if medallion_id:
            medallion = self.db.query(Medallion).filter(Medallion.id == medallion_id).first()
        
        # Step 2: Check for duplicate invoice
        if self.repair_repo.check_duplicate_invoice(invoice_number, vehicle_id, invoice_date):
            raise DuplicateInvoiceException(invoice_number, vehicle_id, invoice_date)
        
        # Step 3: Validate and calculate installment amount
        if repair_amount <= 0:
            raise RepairAmountException(repair_amount)
        
        weekly_installment = self._get_weekly_installment(repair_amount)
        
        # Step 4: Determine start week date (must be a Sunday)
        start_week_date = self._calculate_start_week_date(start_week)
        
        # Step 5: Generate repair ID
        repair_id = self.repair_repo.get_next_repair_id()
        
        # Step 6: Create repair record
        repair = VehicleRepair(
            repair_id=repair_id,
            driver_id=driver_id,
            lease_id=lease_id,
            vehicle_id=vehicle_id,
            medallion_id=medallion_id,
            vin=vehicle.vin if hasattr(vehicle, 'vin') else None,
            plate_number=vehicle.plate_number if hasattr(vehicle, 'plate_number') else None,
            hack_license=driver.tlc_license_number if hasattr(driver, 'tlc_license_number') else None,
            invoice_number=invoice_number,
            invoice_date=invoice_date,
            workshop_type=workshop_type,
            repair_description=repair_description,
            repair_amount=repair_amount,
            start_week=start_week,
            start_week_date=start_week_date,
            weekly_installment_amount=weekly_installment,
            total_paid=Decimal("0.00"),
            outstanding_balance=repair_amount,
            status=RepairStatus.DRAFT,
            invoice_document_id=invoice_document_id,
            created_by=user_id
        )
        
        repair = self.repair_repo.create(repair)
        
        # Step 7: Generate installment schedule
        installments = self._generate_installment_schedule(repair)
        self.installment_repo.bulk_create(installments)
        
        logger.info(f"Created repair {repair_id} with {len(installments)} installments")
        
        return repair
    
    def confirm_repair(self, repair_id: str, user_id: int) -> VehicleRepair:
        """
        Confirm repair invoice and activate payment schedule
        Changes status from DRAFT to OPEN
        """
        repair = self.repair_repo.get_by_id_or_raise(repair_id)
        
        if repair.status != RepairStatus.DRAFT:
            raise InvalidStatusTransitionException(
                repair.status.value,
                RepairStatus.OPEN.value,
                "Only DRAFT repairs can be confirmed"
            )
        
        repair.status = RepairStatus.OPEN
        repair.confirmed_at = datetime.utcnow()
        repair.modified_by = user_id
        
        self.repair_repo.update(repair)
        
        logger.info(f"Confirmed repair {repair_id}")
        return repair
    
    def update_repair(
        self,
        repair_id: str,
        invoice_number: Optional[str] = None,
        invoice_date: Optional[date] = None,
        workshop_type: Optional[WorkshopType] = None,
        repair_description: Optional[str] = None,
        repair_amount: Optional[Decimal] = None,
        start_week: Optional[StartWeekOption] = None,
        invoice_document_id: Optional[int] = None,
        user_id: int = None
    ) -> VehicleRepair:
        """
        Update repair invoice details
        Can only update DRAFT repairs
        """
        repair = self.repair_repo.get_by_id_or_raise(repair_id)
        
        # Check if repair can be modified
        if repair.status not in [RepairStatus.DRAFT]:
            raise RepairAlreadyPostedException(repair_id)
        
        # Check if any installments are posted
        installments = self.installment_repo.get_installments_by_repair(repair_id)
        if any(inst.posted_to_ledger == 1 for inst in installments):
            raise RepairAlreadyPostedException(repair_id)
        
        # Update fields
        regenerate_schedule = False
        
        if invoice_number and invoice_number != repair.invoice_number:
            # Check for duplicate
            if self.repair_repo.check_duplicate_invoice(
                invoice_number, repair.vehicle_id, repair.invoice_date, repair_id
            ):
                raise DuplicateInvoiceException(invoice_number, repair.vehicle_id, repair.invoice_date)
            repair.invoice_number = invoice_number
        
        if invoice_date:
            repair.invoice_date = invoice_date
        
        if workshop_type:
            repair.workshop_type = workshop_type
        
        if repair_description is not None:
            repair.repair_description = repair_description
        
        if repair_amount and repair_amount != repair.repair_amount:
            if repair_amount <= 0:
                raise RepairAmountException(repair_amount)
            repair.repair_amount = repair_amount
            repair.outstanding_balance = repair_amount
            repair.weekly_installment_amount = self._get_weekly_installment(repair_amount)
            regenerate_schedule = True
        
        if start_week and start_week != repair.start_week:
            repair.start_week = start_week
            repair.start_week_date = self._calculate_start_week_date(start_week)
            regenerate_schedule = True
        
        if invoice_document_id is not None:
            repair.invoice_document_id = invoice_document_id
        
        if user_id:
            repair.modified_by = user_id
        
        # Regenerate schedule if amount or start week changed
        if regenerate_schedule:
            # Delete old installments
            for inst in installments:
                self.db.delete(inst)
            
            # Generate new schedule
            new_installments = self._generate_installment_schedule(repair)
            self.installment_repo.bulk_create(new_installments)
            logger.info(f"Regenerated {len(new_installments)} installments for repair {repair_id}")
        
        self.repair_repo.update(repair)
        logger.info(f"Updated repair {repair_id}")
        
        return repair
    
    def update_repair_status(
        self,
        repair_id: str,
        new_status: RepairStatus,
        reason: Optional[str],
        user_id: int
    ) -> VehicleRepair:
        """Update repair status with validation"""
        repair = self.repair_repo.get_by_id_or_raise(repair_id)
        
        # Validate status transition
        self._validate_status_transition(repair.status, new_status, reason)
        
        old_status = repair.status
        repair.status = new_status
        
        if new_status == RepairStatus.HOLD:
            repair.hold_reason = reason
        elif new_status == RepairStatus.CANCELLED:
            repair.cancelled_reason = reason
        elif new_status == RepairStatus.CLOSED:
            repair.closed_at = datetime.utcnow()
        
        repair.modified_by = user_id
        
        self.repair_repo.update(repair)
        logger.info(f"Updated repair {repair_id} status from {old_status} to {new_status}")
        
        return repair
    
    # === Helper Methods ===
    
    def _get_weekly_installment(self, repair_amount: Decimal) -> Decimal:
        """
        Calculate weekly installment amount based on payment matrix
        
        Matrix:
        - $0-200: Paid in full
        - $201-500: $100/week
        - $501-1000: $200/week
        - $1001-3000: $250/week
        - >$3000: $300/week
        """
        amount_float = float(repair_amount)
        
        for min_amount, max_amount, installment in self.PAYMENT_MATRIX:
            if max_amount is None:
                # Last range (>$3000)
                if amount_float >= min_amount:
                    return installment if installment else repair_amount
            elif min_amount <= amount_float <= max_amount:
                return installment if installment else repair_amount
        
        # Default: paid in full
        return repair_amount
    
    def _calculate_start_week_date(self, start_week: StartWeekOption) -> date:
        """
        Calculate the Sunday date when first installment is due
        
        Payment periods run Sunday 00:00 -> Saturday 23:59
        Postings happen Sunday 05:00 AM
        """
        today = date.today()
        
        # Find next Sunday
        days_until_sunday = (6 - today.weekday()) % 7
        if days_until_sunday == 0:
            days_until_sunday = 7
        next_sunday = today + timedelta(days=days_until_sunday)
        
        if start_week == StartWeekOption.CURRENT:
            # If today is Sunday, use today; otherwise use next Sunday
            if today.weekday() == 6:  # Sunday
                return today
            return next_sunday
        else:  # StartWeekOption.NEXT
            # Always use next Sunday after next
            return next_sunday + timedelta(days=7)
    
    def _is_lease_active(self, lease: Lease) -> bool:
        """Check if lease is active"""
        # Assuming lease has a status field or date range
        today = date.today()
        
        if hasattr(lease, 'lease_status'):
            return lease.lease_status == 'active'
        
        if hasattr(lease, 'start_date') and hasattr(lease, 'end_date'):
            return lease.start_date <= today <= lease.end_date
        
        # Default to True if no status fields
        return True
    
    def _validate_status_transition(
        self,
        current_status: RepairStatus,
        new_status: RepairStatus,
        reason: Optional[str]
    ):
        """Validate if status transition is allowed"""
        # Define allowed transitions
        allowed_transitions = {
            RepairStatus.DRAFT: [RepairStatus.OPEN, RepairStatus.CANCELLED],
            RepairStatus.OPEN: [RepairStatus.HOLD, RepairStatus.CLOSED, RepairStatus.CANCELLED],
            RepairStatus.HOLD: [RepairStatus.OPEN, RepairStatus.CANCELLED],
            RepairStatus.CLOSED: [],  # Cannot transition from CLOSED
            RepairStatus.CANCELLED: []  # Cannot transition from CANCELLED
        }
        
        if new_status not in allowed_transitions.get(current_status, []):
            raise InvalidStatusTransitionException(
                current_status.value,
                new_status.value,
                f"Transition from {current_status} to {new_status} is not allowed"
            )
        
        # Require reason for HOLD and CANCELLED
        if new_status in [RepairStatus.HOLD, RepairStatus.CANCELLED] and not reason:
            raise RepairValidationException(
                f"Reason is required when setting status to {new_status.value}"
            )
    
    # === Installment Schedule Generation ===
    
    def _generate_installment_schedule(self, repair: VehicleRepair) -> List[RepairInstallment]:
        """
        Generate weekly installment schedule for repair
        
        Logic:
        1. Determine number of installments needed
        2. Create installment for each week
        3. Adjust final installment if needed
        4. Return list of installments
        """
        installments = []
        
        remaining_balance = repair.repair_amount
        weekly_installment = repair.weekly_installment_amount
        installment_number = 1
        current_week_start = repair.start_week_date
        
        while remaining_balance > 0:
            # Calculate installment amount
            if remaining_balance <= weekly_installment:
                # Final installment - adjust to remaining balance
                installment_amount = remaining_balance
            else:
                installment_amount = weekly_installment
            
            # Calculate week end (Saturday)
            week_end = current_week_start + timedelta(days=6)
            
            # Calculate balance after this installment
            balance_after = remaining_balance - installment_amount
            
            # Create installment
            installment_id = f"{repair.repair_id}-{installment_number:02d}"
            
            installment = RepairInstallment(
                installment_id=installment_id,
                repair_id=repair.repair_id,
                installment_number=installment_number,
                driver_id=repair.driver_id,
                lease_id=repair.lease_id,
                vehicle_id=repair.vehicle_id,
                medallion_id=repair.medallion_id,
                week_start=current_week_start,
                week_end=week_end,
                due_date=week_end,  # Due on Saturday
                installment_amount=installment_amount,
                amount_paid=Decimal("0.00"),
                prior_balance=Decimal("0.00"),
                balance=balance_after,
                status=InstallmentStatus.SCHEDULED,
                posted_to_ledger=0,
                created_by=repair.created_by
            )
            
            installments.append(installment)
            
            # Move to next week
            remaining_balance -= installment_amount
            installment_number += 1
            current_week_start += timedelta(days=7)  # Next Sunday
        
        logger.info(f"Generated {len(installments)} installments for repair {repair.repair_id}")
        return installments
    
    # === Ledger Posting ===
    
    def post_installments_to_ledger(
        self,
        installment_ids: List[str],
        user_id: int,
        ledger_service = None
    ) -> Dict[str, Any]:
        """
        Post multiple installments to ledger
        
        Returns:
        {
            'success_count': int,
            'failure_count': int,
            'posted_installments': List[str],
            'failed_installments': List[dict]
        }
        """
        from app.ledger.service import LedgerService
        from app.ledger.models import PostingCategory
        
        if ledger_service is None:
            ledger_service = LedgerService(self.db)
        
        success_count = 0
        failure_count = 0
        posted_installments = []
        failed_installments = []
        
        for installment_id in installment_ids:
            try:
                installment = self.installment_repo.get_by_id(installment_id)
                
                if not installment:
                    failed_installments.append({
                        'installment_id': installment_id,
                        'error': 'Installment not found'
                    })
                    failure_count += 1
                    continue
                
                # Check if already posted
                if installment.posted_to_ledger == 1:
                    failed_installments.append({
                        'installment_id': installment_id,
                        'error': 'Already posted to ledger'
                    })
                    failure_count += 1
                    continue
                
                # Check if repair is in correct status
                repair = self.repair_repo.get_by_id(installment.repair_id)
                if repair.status != RepairStatus.OPEN:
                    failed_installments.append({
                        'installment_id': installment_id,
                        'error': f'Repair status is {repair.status.value}, must be OPEN'
                    })
                    failure_count += 1
                    continue
                
                # Post to ledger
                posting, balance = ledger_service.create_obligation(
                    driver_id=installment.driver_id,
                    lease_id=installment.lease_id,
                    category=PostingCategory.REPAIRS,
                    amount=installment.installment_amount,
                    reference_type="REPAIR_INSTALLMENT",
                    reference_id=installment.installment_id,
                    payment_period_start=datetime.combine(installment.week_start, datetime.min.time()),
                    payment_period_end=datetime.combine(installment.week_end, datetime.max.time()),
                    due_date=datetime.combine(installment.due_date, datetime.max.time()),
                    description=f"Repair installment {installment.installment_number} for invoice {repair.invoice_number}"
                )
                
                # Update installment
                installment.posted_to_ledger = 1
                installment.ledger_posting_id = posting.posting_id
                installment.ledger_balance_id = balance.balance_id
                installment.posted_at = datetime.utcnow()
                installment.status = InstallmentStatus.POSTED
                installment.modified_by = user_id
                
                self.installment_repo.update(installment)
                
                posted_installments.append(installment_id)
                success_count += 1
                
                logger.info(f"Posted installment {installment_id} to ledger")
                
            except Exception as e:
                logger.error(f"Failed to post installment {installment_id}: {str(e)}")
                failed_installments.append({
                    'installment_id': installment_id,
                    'error': str(e)
                })
                failure_count += 1
        
        # Update repair total_paid and outstanding_balance if any posted
        if posted_installments:
            self._update_repair_payment_tracking()
        
        result = {
            'success_count': success_count,
            'failure_count': failure_count,
            'posted_installments': posted_installments,
            'failed_installments': failed_installments
        }
        
        logger.info(f"Bulk post completed: {success_count} success, {failure_count} failures")
        return result
    
    def post_weekly_installments(self, current_date: Optional[date] = None) -> Dict[str, Any]:
        """
        Post all installments due for current week to ledger
        This is called by scheduled job every Sunday 05:00 AM
        
        Returns posting results
        """
        if current_date is None:
            current_date = date.today()
        
        # Get installments due for posting
        installments = self.installment_repo.get_installments_due_for_posting(current_date)
        
        logger.info(f"Found {len(installments)} installments due for posting on {current_date}")
        
        if not installments:
            return {
                'success_count': 0,
                'failure_count': 0,
                'posted_installments': [],
                'failed_installments': []
            }
        
        installment_ids = [inst.installment_id for inst in installments]
        
        return self.post_installments_to_ledger(installment_ids, user_id=1)  # System user
    
    def _update_repair_payment_tracking(self):
        """Update repair total_paid and outstanding_balance from installments"""
        # This could be optimized to update specific repairs, but for simplicity
        # we'll recalculate for all repairs with changes
        repairs = self.repair_repo.get_repairs_with_unposted_installments()
        
        for repair in repairs:
            installments = self.installment_repo.get_installments_by_repair(repair.repair_id)
            
            total_posted = sum(
                inst.installment_amount for inst in installments
                if inst.posted_to_ledger == 1
            )
            
            repair.total_paid = total_posted
            repair.outstanding_balance = repair.repair_amount - total_posted
            
            # Check if fully paid
            if repair.outstanding_balance <= 0 and repair.status == RepairStatus.OPEN:
                repair.status = RepairStatus.CLOSED
                repair.closed_at = datetime.utcnow()
            
            self.repair_repo.update(repair)
    
    # === Query Methods ===
    
    def get_repair_by_id(self, repair_id: str) -> VehicleRepair:
        """Get repair by ID with installments"""
        repair = self.repair_repo.get_by_id_or_raise(repair_id)
        return repair
    
    def find_repairs(self, filters: dict) -> Tuple[List[VehicleRepair], int]:
        """Find repairs with filters"""
        return self.repair_repo.find_repairs(**filters)
    
    def find_installments(self, filters: dict) -> Tuple[List[RepairInstallment], int]:
        """Find installments with filters"""
        return self.installment_repo.find_installments(**filters)
    
    def find_unposted_installments(self, filters: dict) -> Tuple[List[RepairInstallment], int]:
        """
        Find unposted installments with filters
        This is the key method for the unposted installments endpoint
        """
        return self.installment_repo.find_unposted_installments(**filters)
    
    def get_installment_by_id(self, installment_id: str) -> RepairInstallment:
        """Get installment by ID"""
        return self.installment_repo.get_by_id_or_raise(installment_id)
    
    def get_repair_statistics(
        self,
        driver_id: Optional[int] = None,
        lease_id: Optional[int] = None,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None
    ) -> Dict[str, Any]:
        """
        Get statistics for repairs
        
        Returns counts, totals, and averages
        """
        from sqlalchemy import func
        
        query = self.db.query(VehicleRepair)
        
        if driver_id:
            query = query.filter(VehicleRepair.driver_id == driver_id)
        if lease_id:
            query = query.filter(VehicleRepair.lease_id == lease_id)
        if date_from:
            query = query.filter(VehicleRepair.invoice_date >= date_from)
        if date_to:
            query = query.filter(VehicleRepair.invoice_date <= date_to)
        
        # Repair counts by status
        total_repairs = query.count()
        open_repairs = query.filter(VehicleRepair.status == RepairStatus.OPEN).count()
        closed_repairs = query.filter(VehicleRepair.status == RepairStatus.CLOSED).count()
        draft_repairs = query.filter(VehicleRepair.status == RepairStatus.DRAFT).count()
        hold_repairs = query.filter(VehicleRepair.status == RepairStatus.HOLD).count()
        
        # Financial totals
        totals = query.with_entities(
            func.sum(VehicleRepair.repair_amount).label('total_amount'),
            func.sum(VehicleRepair.total_paid).label('total_paid'),
            func.sum(VehicleRepair.outstanding_balance).label('total_outstanding'),
            func.avg(VehicleRepair.repair_amount).label('avg_amount'),
            func.avg(VehicleRepair.weekly_installment_amount).label('avg_weekly')
        ).first()
        
        # Installment counts
        inst_query = self.db.query(RepairInstallment)
        if driver_id:
            inst_query = inst_query.filter(RepairInstallment.driver_id == driver_id)
        if lease_id:
            inst_query = inst_query.filter(RepairInstallment.lease_id == lease_id)
        
        total_installments = inst_query.count()
        scheduled_installments = inst_query.filter(
            RepairInstallment.status == InstallmentStatus.SCHEDULED
        ).count()
        posted_installments = inst_query.filter(
            RepairInstallment.posted_to_ledger == 1
        ).count()
        paid_installments = inst_query.filter(
            RepairInstallment.status == InstallmentStatus.PAID
        ).count()
        
        return {
            'total_repairs': total_repairs,
            'open_repairs': open_repairs,
            'closed_repairs': closed_repairs,
            'draft_repairs': draft_repairs,
            'hold_repairs': hold_repairs,
            'total_repair_amount': totals.total_amount or Decimal("0.00"),
            'total_paid': totals.total_paid or Decimal("0.00"),
            'total_outstanding': totals.total_outstanding or Decimal("0.00"),
            'total_installments': total_installments,
            'scheduled_installments': scheduled_installments,
            'posted_installments': posted_installments,
            'paid_installments': paid_installments,
            'average_repair_amount': totals.avg_amount or Decimal("0.00"),
            'average_weekly_installment': totals.avg_weekly or Decimal("0.00")
        }