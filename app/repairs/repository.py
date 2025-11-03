### app/repairs/repository.py

from datetime import date
from typing import List, Optional, Tuple

from sqlalchemy import func, update
from sqlalchemy.orm import Session, joinedload

from app.drivers.models import Driver
from app.medallions.models import Medallion
from app.repairs.models import (
    RepairInstallment,
    RepairInstallmentStatus,
    RepairInvoice,
    RepairInvoiceStatus,
)
from app.utils.logger import get_logger

logger = get_logger(__name__)


class RepairRepository:
    """
    Data Access Layer for Vehicle Repairs.
    Handles all database interactions for RepairInvoice and RepairInstallment models.
    """

    def __init__(self, db: Session):
        self.db = db

    def create_invoice(self, invoice: RepairInvoice) -> RepairInvoice:
        """Adds a new RepairInvoice record to the session."""
        self.db.add(invoice)
        self.db.flush()
        self.db.refresh(invoice)
        logger.info("Created new RepairInvoice", repair_id=invoice.repair_id)
        return invoice

    def get_invoice_by_id(self, invoice_id: int) -> Optional[RepairInvoice]:
        """Fetches a single repair invoice by its primary key."""
        return self.db.query(RepairInvoice).filter(RepairInvoice.id == invoice_id).first()

    def get_invoice_by_repair_id(self, repair_id: str) -> Optional[RepairInvoice]:
        """Fetches a single repair invoice by the system-generated Repair ID."""
        return self.db.query(RepairInvoice).filter(RepairInvoice.repair_id == repair_id).first()

    def get_last_repair_id_for_year(self, year: int) -> Optional[str]:
        """Finds the last used repair_id for a given year to determine the next sequence number."""
        prefix = f"RPR-{year}-"
        return (
            self.db.query(RepairInvoice.repair_id)
            .filter(RepairInvoice.repair_id.like(f"{prefix}%"))
            .order_by(RepairInvoice.repair_id.desc())
            .first()
        )

    def bulk_insert_installments(self, installments: List[RepairInstallment]):
        """Performs a bulk insert of new RepairInstallment records."""
        if installments:
            self.db.add_all(installments)

    def update_invoice(self, invoice_id: int, updates: dict):
        """Updates specific fields of a single invoice record."""
        stmt = (
            update(RepairInvoice)
            .where(RepairInvoice.id == invoice_id)
            .values(**updates)
        )
        self.db.execute(stmt)

    def get_due_installments_to_post(self, post_date: date) -> List[RepairInstallment]:
        """
        Fetches all repair installments that are scheduled and due on or before
        the specified posting date.
        """
        return (
            self.db.query(RepairInstallment)
            .join(RepairInvoice)
            .filter(
                RepairInstallment.status == RepairInstallmentStatus.SCHEDULED,
                RepairInstallment.week_start_date <= post_date,
                RepairInvoice.status == RepairInvoiceStatus.OPEN,
            )
            .all()
        )

    def update_installment(self, installment_id: int, updates: dict):
        """Updates specific fields of a single installment record."""
        stmt = (
            update(RepairInstallment)
            .where(RepairInstallment.id == installment_id)
            .values(**updates)
        )
        self.db.execute(stmt)

    def list_invoices(
        self,
        page: int,
        per_page: int,
        sort_by: str,
        sort_order: str,
        repair_id: Optional[str] = None,
        invoice_number: Optional[str] = None,
        date: Optional[date] = None,
        status: Optional[str] = None,
        driver_name: Optional[str] = None,
        medallion_no: Optional[str] = None,
    ) -> Tuple[List[RepairInvoice], int]:
        """
        Retrieves a paginated, sorted, and filtered list of Repair Invoices.
        """
        query = (
            self.db.query(RepairInvoice)
            .options(
                joinedload(RepairInvoice.driver),
                joinedload(RepairInvoice.medallion),
            )
            .outerjoin(Driver, RepairInvoice.driver_id == Driver.id)
            .outerjoin(Medallion, RepairInvoice.medallion_id == Medallion.id)
        )

        # Apply filters
        if repair_id:
            query = query.filter(RepairInvoice.repair_id.ilike(f"%{repair_id}%"))
        if invoice_number:
            query = query.filter(RepairInvoice.invoice_number.ilike(f"%{invoice_number}%"))
        if date:
            query = query.filter(RepairInvoice.invoice_date == date)
        if status:
            try:
                status_enum = RepairInvoiceStatus[status.upper()]
                query = query.filter(RepairInvoice.status == status_enum)
            except KeyError:
                logger.warning(f"Invalid status filter for repairs: {status}")
        if driver_name:
            query = query.filter(Driver.full_name.ilike(f"%{driver_name}%"))
        if medallion_no:
            query = query.filter(Medallion.medallion_number.ilike(f"%{medallion_no}%"))

        total_items = query.with_entities(func.count(RepairInvoice.id)).scalar()

        # Apply sorting
        sort_column_map = {
            "repair_id": RepairInvoice.repair_id,
            "invoice_number": RepairInvoice.invoice_number,
            "date": RepairInvoice.invoice_date,
            "status": RepairInvoice.status,
            "driver": Driver.full_name,
            "medallion_no": Medallion.medallion_number,
            "amount": RepairInvoice.total_amount,
        }
        
        sort_column = sort_column_map.get(sort_by, RepairInvoice.invoice_date)
        if sort_order.lower() == "desc":
            query = query.order_by(sort_column.desc())
        else:
            query = query.order_by(sort_column.asc())

        query = query.offset((page - 1) * per_page).limit(per_page)

        return query.all(), total_items