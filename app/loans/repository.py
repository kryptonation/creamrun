### app/loans/repository.py

from datetime import date
from typing import List, Optional, Tuple

from sqlalchemy import func, update
from sqlalchemy.orm import Session, joinedload

from app.drivers.models import Driver
from app.leases.models import Lease
from app.medallions.models import Medallion
from app.loans.models import (
    DriverLoan,
    LoanInstallment,
    LoanInstallmentStatus,
    LoanStatus,
)
from app.utils.logger import get_logger

logger = get_logger(__name__)


class LoanRepository:
    """
    Data Access Layer for Driver Loans.
    Handles all database interactions for DriverLoan and LoanInstallment models.
    """

    def __init__(self, db: Session):
        self.db = db

    def create_loan(self, loan: DriverLoan) -> DriverLoan:
        """Adds a new DriverLoan record to the session."""
        self.db.add(loan)
        self.db.flush()
        self.db.refresh(loan)
        logger.info("Created new DriverLoan", loan_id=loan.loan_id)
        return loan

    def get_loan_by_id(self, loan_pk_id: int) -> Optional[DriverLoan]:
        """Fetches a single driver loan by its primary key."""
        return self.db.query(DriverLoan).filter(DriverLoan.id == loan_pk_id).first()

    def get_loan_by_loan_id(self, loan_id: str) -> Optional[DriverLoan]:
        """Fetches a single driver loan by the system-generated Loan ID."""
        return self.db.query(DriverLoan).filter(DriverLoan.loan_id == loan_id).first()

    def get_last_loan_id_for_year(self, year: int) -> Optional[str]:
        """Finds the last used loan_id for a given year to determine the next sequence number."""
        prefix = f"DLN-{year}-"
        return (
            self.db.query(DriverLoan.loan_id)
            .filter(DriverLoan.loan_id.like(f"{prefix}%"))
            .order_by(DriverLoan.loan_id.desc())
            .first()
        )

    def bulk_insert_installments(self, installments: List[LoanInstallment]):
        """Performs a bulk insert of new LoanInstallment records."""
        if installments:
            self.db.add_all(installments)

    def update_loan(self, loan_id: int, updates: dict):
        """Updates specific fields of a single loan record."""
        stmt = (
            update(DriverLoan)
            .where(DriverLoan.id == loan_id)
            .values(**updates)
        )
        self.db.execute(stmt)

    def get_due_installments_to_post(self, post_date: date) -> List[LoanInstallment]:
        """
        Fetches all loan installments that are scheduled and due on or before
        the specified posting date for all OPEN loans.
        """
        return (
            self.db.query(LoanInstallment)
            .join(DriverLoan)
            .filter(
                LoanInstallment.status == LoanInstallmentStatus.SCHEDULED,
                LoanInstallment.week_start_date <= post_date,
                DriverLoan.status == LoanStatus.OPEN,
            )
            .all()
        )

    def update_installment(self, installment_id: int, updates: dict):
        """Updates specific fields of a single installment record."""
        stmt = (
            update(LoanInstallment)
            .where(LoanInstallment.id == installment_id)
            .values(**updates)
        )
        self.db.execute(stmt)

    def list_loans(
        self,
        page: int,
        per_page: int,
        sort_by: str,
        sort_order: str,
        loan_id: Optional[str] = None,
        status: Optional[str] = None,
        driver_name: Optional[str] = None,
        medallion_no: Optional[str] = None,
        lease_type: Optional[str] = None,
        start_week: Optional[date] = None,
    ) -> Tuple[List[DriverLoan], int]:
        """
        Retrieves a paginated, sorted, and filtered list of Driver Loans.
        """
        query = (
            self.db.query(DriverLoan)
            .options(
                joinedload(DriverLoan.driver),
                joinedload(DriverLoan.medallion),
                joinedload(DriverLoan.lease),
            )
            .outerjoin(Driver, DriverLoan.driver_id == Driver.id)
            .outerjoin(Medallion, DriverLoan.medallion_id == Medallion.id)
            .outerjoin(Lease, DriverLoan.lease_id == Lease.id)
        )

        # Apply filters
        if loan_id:
            query = query.filter(DriverLoan.loan_id.ilike(f"%{loan_id}%"))
        if status:
            try:
                status_enum = LoanStatus[status.upper()]
                query = query.filter(DriverLoan.status == status_enum)
            except KeyError:
                logger.warning(f"Invalid status filter for loans: {status}")
        if driver_name:
            query = query.filter(Driver.full_name.ilike(f"%{driver_name}%"))
        if medallion_no:
            query = query.filter(Medallion.medallion_number.ilike(f"%{medallion_no}%"))
        if lease_type:
            query = query.filter(Lease.lease_type.ilike(f"%{lease_type}%"))
        if start_week:
            query = query.filter(DriverLoan.start_week == start_week)

        total_items = query.with_entities(func.count(DriverLoan.id)).scalar()

        # Apply sorting
        sort_column_map = {
            "loan_id": DriverLoan.loan_id,
            "status": DriverLoan.status,
            "driver": Driver.full_name,
            "medallion_no": Medallion.medallion_number,
            "lease_type": Lease.lease_type,
            "amount": DriverLoan.principal_amount,
            "rate": DriverLoan.interest_rate,
            "start_week": DriverLoan.start_week,
        }
        
        sort_column = sort_column_map.get(sort_by, DriverLoan.loan_date)
        if sort_order.lower() == "desc":
            query = query.order_by(sort_column.desc())
        else:
            query = query.order_by(sort_column.asc())

        query = query.offset((page - 1) * per_page).limit(per_page)

        return query.all(), total_items