"""
app/repairs/repository.py

Data access layer for Vehicle Repairs module
Handles all database operations for repairs and installments
"""

from datetime import date, datetime
from typing import List, Optional, Tuple
from decimal import Decimal

from sqlalchemy import func, desc, asc
from sqlalchemy.orm import Session

from app.repairs.models import VehicleRepair, RepairInstallment, RepairStatus, InstallmentStatus
from app.repairs.exceptions import RepairNotFoundException, InstallmentNotFoundException
from app.utils.logger import get_logger

logger = get_logger(__name__)


class RepairRepository:
    """Repository for VehicleRepair CRUD operations"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def create(self, repair: VehicleRepair) -> VehicleRepair:
        """Create a new repair invoice"""
        self.db.add(repair)
        self.db.flush()
        logger.info(f"Created repair: {repair.repair_id}")
        return repair
    
    def get_by_id(self, repair_id: str) -> Optional[VehicleRepair]:
        """Get repair by ID"""
        return self.db.query(VehicleRepair).filter(
            VehicleRepair.repair_id == repair_id
        ).first()
    
    def get_by_id_or_raise(self, repair_id: str) -> VehicleRepair:
        """Get repair by ID or raise exception"""
        repair = self.get_by_id(repair_id)
        if not repair:
            raise RepairNotFoundException(repair_id)
        return repair
    
    def update(self, repair: VehicleRepair) -> VehicleRepair:
        """Update existing repair"""
        self.db.flush()
        logger.info(f"Updated repair: {repair.repair_id}")
        return repair
    
    def find_repairs(
        self,
        repair_id: Optional[str] = None,
        driver_id: Optional[int] = None,
        lease_id: Optional[int] = None,
        vehicle_id: Optional[int] = None,
        medallion_id: Optional[int] = None,
        invoice_number: Optional[str] = None,
        workshop_type: Optional[str] = None,
        status: Optional[RepairStatus] = None,
        invoice_date_from: Optional[date] = None,
        invoice_date_to: Optional[date] = None,
        amount_min: Optional[Decimal] = None,
        amount_max: Optional[Decimal] = None,
        page: int = 1,
        page_size: int = 50,
        sort_by: str = "invoice_date",
        sort_order: str = "desc"
    ) -> Tuple[List[VehicleRepair], int]:
        """
        Find repairs with filters, pagination, and sorting
        Returns tuple of (repairs list, total count)
        """
        query = self.db.query(VehicleRepair)
        
        # Apply filters
        if repair_id:
            query = query.filter(VehicleRepair.repair_id == repair_id)
        if driver_id:
            query = query.filter(VehicleRepair.driver_id == driver_id)
        if lease_id:
            query = query.filter(VehicleRepair.lease_id == lease_id)
        if vehicle_id:
            query = query.filter(VehicleRepair.vehicle_id == vehicle_id)
        if medallion_id:
            query = query.filter(VehicleRepair.medallion_id == medallion_id)
        if invoice_number:
            query = query.filter(VehicleRepair.invoice_number.ilike(f"%{invoice_number}%"))
        if workshop_type:
            query = query.filter(VehicleRepair.workshop_type == workshop_type)
        if status:
            query = query.filter(VehicleRepair.status == status)
        if invoice_date_from:
            query = query.filter(VehicleRepair.invoice_date >= invoice_date_from)
        if invoice_date_to:
            query = query.filter(VehicleRepair.invoice_date <= invoice_date_to)
        if amount_min is not None:
            query = query.filter(VehicleRepair.repair_amount >= amount_min)
        if amount_max is not None:
            query = query.filter(VehicleRepair.repair_amount <= amount_max)
        
        # Get total count before pagination
        total = query.count()
        
        # Apply sorting
        if hasattr(VehicleRepair, sort_by):
            sort_column = getattr(VehicleRepair, sort_by)
            if sort_order.lower() == "desc":
                query = query.order_by(desc(sort_column))
            else:
                query = query.order_by(asc(sort_column))
        
        # Apply pagination
        offset = (page - 1) * page_size
        query = query.offset(offset).limit(page_size)
        
        repairs = query.all()
        logger.info(f"Found {len(repairs)} repairs out of {total} total")
        
        return repairs, total
    
    def check_duplicate_invoice(
        self,
        invoice_number: str,
        vehicle_id: int,
        invoice_date: date,
        exclude_repair_id: Optional[str] = None
    ) -> bool:
        """Check if invoice number already exists for vehicle on date"""
        query = self.db.query(VehicleRepair).filter(
            VehicleRepair.invoice_number == invoice_number,
            VehicleRepair.vehicle_id == vehicle_id,
            VehicleRepair.invoice_date == invoice_date
        )
        
        if exclude_repair_id:
            query = query.filter(VehicleRepair.repair_id != exclude_repair_id)
        
        return query.first() is not None
    
    def get_next_repair_id(self) -> str:
        """Generate next repair ID in format RPR-YYYY-NNN"""
        current_year = datetime.now().year
        
        # Get max sequence for current year
        max_id = self.db.query(func.max(VehicleRepair.repair_id)).filter(
            VehicleRepair.repair_id.like(f"RPR-{current_year}-%")
        ).scalar()
        
        if max_id:
            # Extract sequence number and increment
            sequence = int(max_id.split("-")[-1]) + 1
        else:
            sequence = 1
        
        return f"RPR-{current_year}-{sequence:03d}"
    
    def get_repairs_with_unposted_installments(self) -> List[VehicleRepair]:
        """Get repairs that have unposted installments"""
        return self.db.query(VehicleRepair).join(
            RepairInstallment,
            VehicleRepair.repair_id == RepairInstallment.repair_id
        ).filter(
            RepairInstallment.posted_to_ledger == 0,
            VehicleRepair.status == RepairStatus.OPEN
        ).distinct().all()


class InstallmentRepository:
    """Repository for RepairInstallment CRUD operations"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def create(self, installment: RepairInstallment) -> RepairInstallment:
        """Create a new installment"""
        self.db.add(installment)
        self.db.flush()
        logger.info(f"Created installment: {installment.installment_id}")
        return installment
    
    def bulk_create(self, installments: List[RepairInstallment]) -> List[RepairInstallment]:
        """Create multiple installments in bulk"""
        self.db.add_all(installments)
        self.db.flush()
        logger.info(f"Created {len(installments)} installments in bulk")
        return installments
    
    def get_by_id(self, installment_id: str) -> Optional[RepairInstallment]:
        """Get installment by ID"""
        return self.db.query(RepairInstallment).filter(
            RepairInstallment.installment_id == installment_id
        ).first()
    
    def get_by_id_or_raise(self, installment_id: str) -> RepairInstallment:
        """Get installment by ID or raise exception"""
        installment = self.get_by_id(installment_id)
        if not installment:
            raise InstallmentNotFoundException(installment_id)
        return installment
    
    def get_by_ids(self, installment_ids: List[str]) -> List[RepairInstallment]:
        """Get multiple installments by IDs"""
        return self.db.query(RepairInstallment).filter(
            RepairInstallment.installment_id.in_(installment_ids)
        ).all()
    
    def update(self, installment: RepairInstallment) -> RepairInstallment:
        """Update existing installment"""
        self.db.flush()
        logger.info(f"Updated installment: {installment.installment_id}")
        return installment
    
    def find_unposted_installments(
        self,
        repair_id: Optional[str] = None,
        driver_id: Optional[int] = None,
        lease_id: Optional[int] = None,
        vehicle_id: Optional[int] = None,
        medallion_id: Optional[int] = None,
        period_start: Optional[date] = None,
        period_end: Optional[date] = None,
        status: Optional[InstallmentStatus] = None,
        page: int = 1,
        page_size: int = 50,
        sort_by: str = "week_start",
        sort_order: str = "asc"
    ) -> Tuple[List[RepairInstallment], int]:
        """
        Find unposted installments with filters
        This is the key endpoint for finding installments ready for posting
        """
        query = self.db.query(RepairInstallment).filter(
            RepairInstallment.posted_to_ledger == 0
        )
        
        # Apply filters
        if repair_id:
            query = query.filter(RepairInstallment.repair_id == repair_id)
        if driver_id:
            query = query.filter(RepairInstallment.driver_id == driver_id)
        if lease_id:
            query = query.filter(RepairInstallment.lease_id == lease_id)
        if vehicle_id:
            query = query.filter(RepairInstallment.vehicle_id == vehicle_id)
        if medallion_id:
            query = query.filter(RepairInstallment.medallion_id == medallion_id)
        if period_start:
            query = query.filter(RepairInstallment.week_start >= period_start)
        if period_end:
            query = query.filter(RepairInstallment.week_end <= period_end)
        if status:
            query = query.filter(RepairInstallment.status == status)
        
        # Get total count
        total = query.count()
        
        # Apply sorting
        if hasattr(RepairInstallment, sort_by):
            sort_column = getattr(RepairInstallment, sort_by)
            if sort_order.lower() == "desc":
                query = query.order_by(desc(sort_column))
            else:
                query = query.order_by(asc(sort_column))
        
        # Apply pagination
        offset = (page - 1) * page_size
        query = query.offset(offset).limit(page_size)
        
        installments = query.all()
        logger.info(f"Found {len(installments)} unposted installments out of {total} total")
        
        return installments, total
    
    def find_installments(
        self,
        installment_id: Optional[str] = None,
        repair_id: Optional[str] = None,
        driver_id: Optional[int] = None,
        lease_id: Optional[int] = None,
        vehicle_id: Optional[int] = None,
        medallion_id: Optional[int] = None,
        period_start: Optional[date] = None,
        period_end: Optional[date] = None,
        status: Optional[InstallmentStatus] = None,
        posted_to_ledger: Optional[int] = None,
        page: int = 1,
        page_size: int = 50,
        sort_by: str = "week_start",
        sort_order: str = "asc"
    ) -> Tuple[List[RepairInstallment], int]:
        """Find installments with filters, pagination, and sorting"""
        query = self.db.query(RepairInstallment)
        
        # Apply filters
        if installment_id:
            query = query.filter(RepairInstallment.installment_id == installment_id)
        if repair_id:
            query = query.filter(RepairInstallment.repair_id == repair_id)
        if driver_id:
            query = query.filter(RepairInstallment.driver_id == driver_id)
        if lease_id:
            query = query.filter(RepairInstallment.lease_id == lease_id)
        if vehicle_id:
            query = query.filter(RepairInstallment.vehicle_id == vehicle_id)
        if medallion_id:
            query = query.filter(RepairInstallment.medallion_id == medallion_id)
        if period_start:
            query = query.filter(RepairInstallment.week_start >= period_start)
        if period_end:
            query = query.filter(RepairInstallment.week_end <= period_end)
        if status:
            query = query.filter(RepairInstallment.status == status)
        if posted_to_ledger is not None:
            query = query.filter(RepairInstallment.posted_to_ledger == posted_to_ledger)
        
        # Get total count
        total = query.count()
        
        # Apply sorting
        if hasattr(RepairInstallment, sort_by):
            sort_column = getattr(RepairInstallment, sort_by)
            if sort_order.lower() == "desc":
                query = query.order_by(desc(sort_column))
            else:
                query = query.order_by(asc(sort_column))
        
        # Apply pagination
        offset = (page - 1) * page_size
        query = query.offset(offset).limit(page_size)
        
        installments = query.all()
        
        return installments, total
    
    def get_installments_due_for_posting(self, current_date: date) -> List[RepairInstallment]:
        """
        Get installments that should be posted to ledger
        (payment period has arrived and not yet posted)
        """
        return self.db.query(RepairInstallment).filter(
            RepairInstallment.posted_to_ledger == 0,
            RepairInstallment.week_start <= current_date,
            RepairInstallment.status == InstallmentStatus.SCHEDULED
        ).all()
    
    def get_installments_by_repair(self, repair_id: str) -> List[RepairInstallment]:
        """Get all installments for a repair"""
        return self.db.query(RepairInstallment).filter(
            RepairInstallment.repair_id == repair_id
        ).order_by(RepairInstallment.installment_number).all()