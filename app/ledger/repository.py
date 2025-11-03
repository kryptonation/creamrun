# app/ledger/repository.py

from datetime import date, timedelta
from decimal import Decimal
from typing import List, Optional, Tuple

from sqlalchemy import case, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.drivers.models import Driver
from app.leases.models import Lease
from app.ledger.exceptions import BalanceNotFoundError, PostingNotFoundError
from app.ledger.models import (
    BalanceStatus,
    EntryType,
    LedgerBalance,
    LedgerPosting,
    PostingCategory,
    PostingStatus,
)
from app.medallions.models import Medallion
from app.vehicles.models import Vehicle
from app.utils.logger import get_logger

logger = get_logger(__name__)


class LedgerRepository:
    """
    Data Access Layer for the Centralized Ledger.
    Handles all database interactions for LedgerPosting and LedgerBalance models.
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_posting(self, posting: LedgerPosting) -> LedgerPosting:
        """
        Adds a new LedgerPosting record to the session.
        The caller is responsible for committing the transaction.
        """
        self.db.add(posting)
        await self.db.flush()
        await self.db.refresh(posting)
        logger.info("Created new LedgerPosting", posting_id=posting.id, category=posting.category, amount=posting.amount)
        return posting

    async def get_posting_by_id(self, posting_id: str) -> LedgerPosting:
        """
        Fetches a single ledger posting by its unique ID.
        Raises PostingNotFoundError if not found.
        """
        stmt = select(LedgerPosting).where(LedgerPosting.id == posting_id)
        result = await self.db.execute(stmt)
        posting = result.scalar_one_or_none()
        if not posting:
            raise PostingNotFoundError(posting_id=posting_id)
        return posting

    async def update_posting_status(
        self, posting: LedgerPosting, status: PostingStatus
    ) -> LedgerPosting:
        """Updates the status of an existing LedgerPosting (e.g., to VOIDED)."""
        posting.status = status
        await self.db.flush()
        await self.db.refresh(posting)
        logger.info("Updated LedgerPosting status", posting_id=posting.id, new_status=status.value)
        return posting

    async def create_balance(self, balance: LedgerBalance) -> LedgerBalance:
        """
        Adds a new LedgerBalance record to the session.
        The caller is responsible for committing the transaction.
        """
        self.db.add(balance)
        await self.db.flush()
        await self.db.refresh(balance)
        logger.info("Created new LedgerBalance", balance_id=balance.id, reference_id=balance.reference_id, amount=balance.original_amount)
        return balance

    async def get_balance_by_reference(
        self, reference_id: str, driver_id: int
    ) -> LedgerBalance:
        """
        Fetches the current open balance for a specific source obligation and driver.
        Raises BalanceNotFoundError if not found.
        """
        stmt = select(LedgerBalance).where(
            LedgerBalance.reference_id == reference_id,
            LedgerBalance.driver_id == driver_id,
            LedgerBalance.status == BalanceStatus.OPEN,
        )
        result = await self.db.execute(stmt)
        balance = result.scalar_one_or_none()
        if not balance:
            raise BalanceNotFoundError(reference_id=reference_id)
        return balance

    async def get_open_balances_for_driver(
        self, driver_id: int
    ) -> List[LedgerBalance]:
        """
        Fetches all OPEN balances for a specific driver, sorted by the required
        hierarchical and chronological order for payment application.
        """
        # Define the strict priority hierarchy for categories
        category_priority = case(
            (LedgerBalance.category == PostingCategory.TAXES, 1),
            (LedgerBalance.category == PostingCategory.EZPASS, 2),
            (LedgerBalance.category == PostingCategory.LEASE, 3),
            (LedgerBalance.category == PostingCategory.PVB, 4),
            (LedgerBalance.category == PostingCategory.TLC, 5),
            (LedgerBalance.category == PostingCategory.REPAIR, 6),
            (LedgerBalance.category == PostingCategory.LOAN, 7),
            (LedgerBalance.category == PostingCategory.MISC, 8),
            else_=99,
        )

        stmt = (
            select(LedgerBalance)
            .where(
                LedgerBalance.driver_id == driver_id,
                LedgerBalance.status == BalanceStatus.OPEN,
                LedgerBalance.balance > 0,
            )
            .order_by(category_priority.asc(), LedgerBalance.created_on.asc())
        ) # Sort by category priority, then oldest first

        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def update_balance(
        self,
        balance: LedgerBalance,
        new_balance_amount: Decimal,
        payment_ref_id: Optional[str] = None,
    ) -> LedgerBalance:
        """
        Updates the amount of a LedgerBalance and optionally appends a payment reference.
        Also handles closing the balance if the amount becomes zero.
        """
        balance.balance = new_balance_amount

        if payment_ref_id:
            # Safely append to the JSON list of payment references
            if balance.applied_payment_refs is None:
                balance.applied_payment_refs = []
            
            # Ensure we're working with a mutable list
            refs = list(balance.applied_payment_refs)
            refs.append(payment_ref_id)
            balance.applied_payment_refs = refs

        if balance.balance <= Decimal("0.00"):
            balance.status = BalanceStatus.CLOSED
            logger.info("LedgerBalance closed", balance_id=balance.id, reference_id=balance.reference_id)

        await self.db.flush()
        await self.db.refresh(balance)
        logger.info("Updated LedgerBalance", balance_id=balance.id, new_balance=balance.balance, status=balance.status.value)
        return balance

    async def list_postings(
        self,
        page: int,
        per_page: int,
        sort_by: Optional[str],
        sort_order: str,
        start_date: Optional[date],
        end_date: Optional[date],
        status: Optional[PostingStatus],
        category: Optional[PostingCategory],
        entry_type: Optional[EntryType],
        driver_name: Optional[str],
        lease_id: Optional[int],
        vehicle_vin: Optional[str],
        medallion_no: Optional[str],
        include_all: bool = False, # New flag for export to bypass pagination
    ) -> Tuple[List[LedgerPosting], int]:
        """
        Retrieves a paginated, sorted, and filtered list of ledger postings.
        Eagerly loads related driver, vehicle, medallion, and lease info.
        """
        stmt = (
            select(LedgerPosting)
            .options(
                joinedload(LedgerPosting.driver),
                joinedload(LedgerPosting.vehicle),
                joinedload(LedgerPosting.medallion),
                joinedload(LedgerPosting.lease),
            )
            .outerjoin(Driver, LedgerPosting.driver_id == Driver.id)
            .outerjoin(Vehicle, LedgerPosting.vehicle_id == Vehicle.id)
            .outerjoin(Medallion, LedgerPosting.medallion_id == Medallion.id)
            .outerjoin(Lease, LedgerPosting.lease_id == Lease.id)
        )

        # Apply filters
        if start_date:
            stmt = stmt.where(LedgerPosting.created_on >= start_date)
        if end_date:
            # Include the entire end_date day
            stmt = stmt.where(LedgerPosting.created_on < end_date + timedelta(days=1))
        if status:
            stmt = stmt.where(LedgerPosting.status == status)
        if category:
            stmt = stmt.where(LedgerPosting.category == category)
        if entry_type:
            stmt = stmt.where(LedgerPosting.entry_type == entry_type)
        if driver_name:
            stmt = stmt.where(
                or_(
                    Driver.first_name.ilike(f"%{driver_name}%"),
                    Driver.last_name.ilike(f"%{driver_name}%"),
                    Driver.full_name.ilike(f"%{driver_name}%"),
                )
            )
        if lease_id:
            stmt = stmt.where(LedgerPosting.lease_id == lease_id)
        if vehicle_vin:
            stmt = stmt.where(LedgerPosting.vin.ilike(f"%{vehicle_vin}%"))
        if medallion_no:
            stmt = stmt.where(LedgerPosting.medallion.has(Medallion.medallion_number.ilike(f"%{medallion_no}%")))

        # Determine total items before pagination
        total_items_stmt = select(func.count()).select_from(stmt.subquery())
        total_items_result = await self.db.execute(total_items_stmt)
        total_items = total_items_result.scalar_one()

        # Apply sorting
        sort_column_mapping = {
            "posting_id": LedgerPosting.id,
            "status": LedgerPosting.status,
            "date": LedgerPosting.created_on,
            "category": LedgerPosting.category,
            "type": LedgerPosting.entry_type,
            "amount": LedgerPosting.amount,
            "reference_id": LedgerPosting.reference_id,
            "driver": Driver.full_name,
            "lease_id": LedgerPosting.lease_id,
            "vehicle": LedgerPosting.vin,
            "medallion_no": Medallion.medallion_number,
        }
        effective_sort_by = sort_column_mapping.get(sort_by, LedgerPosting.created_on)

        stmt = stmt.order_by(
            effective_sort_by.desc() if sort_order == "desc" else effective_sort_by.asc()
        )

        # Apply pagination unless include_all is True
        if not include_all:
            stmt = stmt.offset((page - 1) * per_page).limit(per_page)

        result = await self.db.execute(stmt)
        postings = result.scalars().all()

        return postings, total_items

    async def list_balances(
        self,
        page: int,
        per_page: int,
        sort_by: Optional[str],
        sort_order: str,
        driver_name: Optional[str],
        lease_id: Optional[int],
        status: Optional[BalanceStatus],
        category: Optional[PostingCategory],
        include_all: bool = False, # New flag for export to bypass pagination
    ) -> Tuple[List[LedgerBalance], int]:
        """
        Retrieves a paginated, sorted, and filtered list of ledger balances.
        Eagerly loads related driver, vehicle, medallion, and lease info.
        """
        stmt = (
            select(LedgerBalance)
            .options(
                joinedload(LedgerBalance.driver),
                joinedload(LedgerBalance.vehicle),
                joinedload(LedgerBalance.medallion),
                joinedload(LedgerBalance.lease),
            )
            .outerjoin(Driver, LedgerBalance.driver_id == Driver.id)
            .outerjoin(Vehicle, LedgerBalance.vehicle_id == Vehicle.id)
            .outerjoin(Medallion, LedgerBalance.medallion_id == Medallion.id)
            .outerjoin(Lease, LedgerBalance.lease_id == Lease.id)
        )

        # Apply filters
        if driver_name:
            stmt = stmt.where(
                or_(
                    Driver.first_name.ilike(f"%{driver_name}%"),
                    Driver.last_name.ilike(f"%{driver_name}%"),
                    Driver.full_name.ilike(f"%{driver_name}%"),
                )
            )
        if lease_id:
            stmt = stmt.where(LedgerBalance.lease_id == lease_id)
        if status:
            stmt = stmt.where(LedgerBalance.status == status)
        if category:
            stmt = stmt.where(LedgerBalance.category == category)
        
        # Determine total items before pagination
        total_items_stmt = select(func.count()).select_from(stmt.subquery())
        total_items_result = await self.db.execute(total_items_stmt)
        total_items = total_items_result.scalar_one()

        # Apply sorting
        sort_column_mapping = {
            "balance_id": LedgerBalance.id,
            "category": LedgerBalance.category,
            "status": LedgerBalance.status,
            "reference_id": LedgerBalance.reference_id,
            "driver": Driver.full_name,
            "lease_id": LedgerBalance.lease_id,
            "vehicle": LedgerBalance.vin,
            "original_amount": LedgerBalance.original_amount,
            "prior_balance": LedgerBalance.prior_balance,
            "balance": LedgerBalance.balance,
            "created_on": LedgerBalance.created_on,
            "updated_on": LedgerBalance.updated_on,
        }
        effective_sort_by = sort_column_mapping.get(sort_by, LedgerBalance.created_on)

        stmt = stmt.order_by(
            effective_sort_by.desc() if sort_order == "desc" else effective_sort_by.asc()
        )

        # Apply pagination unless include_all is True
        if not include_all:
            stmt = stmt.offset((page - 1) * per_page).limit(per_page)

        result = await self.db.execute(stmt)
        balances = result.scalars().all()

        return balances, total_items