### app/misc_expenses/repository.py

from datetime import date, datetime
from typing import List, Optional, Tuple

from sqlalchemy import func, update
from sqlalchemy.orm import Session, joinedload

from app.drivers.models import Driver
from app.interim_payments.models import InterimPayment
from app.leases.models import Lease
from app.medallions.models import Medallion
from app.misc_expenses.models import MiscellaneousExpense, MiscellaneousExpenseStatus
from app.vehicles.models import Vehicle
from app.utils.logger import get_logger

logger = get_logger(__name__)


class MiscellaneousExpenseRepository:
    """
    Data Access Layer for Miscellaneous Expenses.
    Handles all database interactions for the MiscellaneousExpense model.
    """

    def __init__(self, db: Session):
        self.db = db

    def create_expense(self, expense: MiscellaneousExpense) -> MiscellaneousExpense:
        """Adds a new MiscellaneousExpense record to the session."""
        self.db.add(expense)
        self.db.flush()
        self.db.refresh(expense)
        logger.info("Created new MiscellaneousExpense", expense_id=expense.expense_id)
        return expense

    def get_expense_by_id(self, expense_pk_id: int) -> Optional[MiscellaneousExpense]:
        """Fetches a single miscellaneous expense by its primary key."""
        return self.db.query(MiscellaneousExpense).filter(MiscellaneousExpense.id == expense_pk_id).first()

    def get_expense_by_expense_id(self, expense_id: str) -> Optional[MiscellaneousExpense]:
        """Fetches a single miscellaneous expense by the system-generated Expense ID."""
        return self.db.query(MiscellaneousExpense).filter(MiscellaneousExpense.expense_id == expense_id).first()
    
    def get_last_expense_id_for_year(self, year: int) -> Optional[str]:
        """Finds the last used expense_id for a given year to determine the next sequence number."""
        prefix = f"MISC-{year}-"
        return (
            self.db.query(MiscellaneousExpense.expense_id)
            .filter(MiscellaneousExpense.expense_id.like(f"{prefix}%"))
            .order_by(MiscellaneousExpense.expense_id.desc())
            .first()
        )

    def list_expenses(
        self,
        page: int,
        per_page: int,
        sort_by: str,
        sort_order: str,
        expense_id: Optional[str] = None,
        reference_no: Optional[str] = None,
        category: Optional[str] = None,
        expense_date: Optional[date] = None,
        driver_name: Optional[str] = None,
        lease_id: Optional[str] = None,
        vin: Optional[str] = None,
        plate_no: Optional[str] = None,
        medallion_no: Optional[str] = None,
    ) -> Tuple[List[MiscellaneousExpense], int]:
        """
        Retrieves a paginated, sorted, and filtered list of Miscellaneous Expenses.
        """
        query = (
            self.db.query(MiscellaneousExpense)
            .options(
                joinedload(MiscellaneousExpense.driver),
                joinedload(MiscellaneousExpense.lease),
                joinedload(MiscellaneousExpense.vehicle),
                joinedload(MiscellaneousExpense.medallion),
            )
            .join(Driver, MiscellaneousExpense.driver_id == Driver.id)
            .join(Lease, MiscellaneousExpense.lease_id == Lease.id)
            .join(Vehicle, MiscellaneousExpense.vehicle_id == Vehicle.id)
            .outerjoin(Medallion, MiscellaneousExpense.medallion_id == Medallion.id)
        )

        # Apply filters
        if expense_id:
            query = query.filter(MiscellaneousExpense.expense_id.ilike(f"%{expense_id}%"))
        if reference_no:
            query = query.filter(MiscellaneousExpense.reference_number.ilike(f"%{reference_no}%"))
        if category:
            query = query.filter(MiscellaneousExpense.category.ilike(f"%{category}%"))
        if expense_date:
            start_of_day = datetime.combine(expense_date, datetime.min.time())
            end_of_day = datetime.combine(expense_date, datetime.max.time())
            query = query.filter(MiscellaneousExpense.expense_date.between(start_of_day, end_of_day))
        if driver_name:
            query = query.filter(Driver.full_name.ilike(f"%{driver_name}%"))
        if lease_id:
            query = query.filter(Lease.lease_id.ilike(f"%{lease_id}%"))
        if vin:
            query = query.filter(Vehicle.vin.ilike(f"%{vin}%"))
        if plate_no:
            # Assumes plate number is on the vehicle or a related table
            from app.vehicles.models import VehicleRegistration
            query = query.join(VehicleRegistration, Vehicle.id == VehicleRegistration.vehicle_id).filter(VehicleRegistration.plate_number.ilike(f"%{plate_no}%"))
        if medallion_no:
            query = query.filter(Medallion.medallion_number.ilike(f"%{medallion_no}%"))

        total_items = query.with_entities(func.count(MiscellaneousExpense.id)).scalar()

        # Apply sorting
        sort_column_map = {
            "expense_id": MiscellaneousExpense.expense_id,
            "reference_no": MiscellaneousExpense.reference_number,
            "category": MiscellaneousExpense.category,
            "date": MiscellaneousExpense.expense_date,
            "amount": MiscellaneousExpense.amount,
            "driver": Driver.full_name,
            "lease_id": Lease.lease_id,
            "vin_no": Vehicle.vin,
            "medallion_no": Medallion.medallion_number,
        }
        
        sort_column = sort_column_map.get(sort_by, MiscellaneousExpense.expense_date)
        if sort_order.lower() == "desc":
            query = query.order_by(sort_column.desc())
        else:
            query = query.order_by(sort_column.asc())

        query = query.offset((page - 1) * per_page).limit(per_page)

        return query.all(), total_items