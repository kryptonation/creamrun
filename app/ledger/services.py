# app/ledger/services.py

from datetime import datetime, timezone
from decimal import Decimal
from typing import Dict, List, Optional, Tuple

from fastapi import Depends
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_async_db
from app.ledger.exceptions import (
    BalanceNotFoundError,
    InvalidLedgerOperationError,
    LedgerError,
    PostingNotFoundError,
)
from app.ledger.models import (
    BalanceStatus,
    EntryType,
    LedgerBalance,
    LedgerPosting,
    PostingCategory,
    PostingStatus,
)
from app.ledger.repository import LedgerRepository
from app.ledger.schemas import LedgerBalanceResponse, LedgerPostingResponse
from app.utils.logger import get_logger

logger = get_logger(__name__)


def get_ledger_repository(db: AsyncSession = Depends(get_async_db)) -> LedgerRepository:
    """Dependency injector to get an instance of LedgerRepository."""
    return LedgerRepository(db)


class LedgerService:
    """
    Business Logic Layer for the Centralized Ledger.
    This service is the single entry point for all ledger operations.
    """

    def __init__(self, repo: LedgerRepository = Depends(get_ledger_repository)):
        self.repo = repo

    async def create_obligation(
        self,
        category: PostingCategory,
        amount: Decimal,
        reference_id: str,
        driver_id: int,
        lease_id: Optional[int] = None,
        vehicle_id: Optional[int] = None,
        medallion_id: Optional[int] = None,
    ) -> LedgerBalance:
        """
        Creates a new financial obligation.
        This is an atomic operation that creates both a DEBIT posting and an OPEN balance.
        """
        if amount <= 0:
            raise InvalidLedgerOperationError("Obligation amount must be positive.")

        try:
            posting = LedgerPosting(
                category=category,
                amount=amount,
                entry_type=EntryType.DEBIT,
                status=PostingStatus.POSTED,
                reference_id=reference_id,
                driver_id=driver_id,
                lease_id=lease_id,
                vehicle_id=vehicle_id,
                medallion_id=medallion_id,
            )
            await self.repo.create_posting(posting)

            balance = LedgerBalance(
                category=category,
                reference_id=reference_id,
                original_amount=amount,
                balance=amount,
                status=BalanceStatus.OPEN,
                driver_id=driver_id,
                lease_id=lease_id,
                vehicle_id=vehicle_id,
                medallion_id=medallion_id,
            )
            new_balance = await self.repo.create_balance(balance)

            await self.repo.db.commit()
            logger.info(
                "Successfully created obligation.",
                reference_id=reference_id,
                posting_id=posting.id,
                balance_id=new_balance.id,
            )
            return new_balance
        except Exception as e:
            await self.repo.db.rollback()
            logger.error(
                "Failed to create obligation.", reference_id=reference_id, error=str(e), exc_info=True
            )
            raise LedgerError(f"Could not create obligation: {e}")

    async def apply_interim_payment(
        self,
        payment_amount: Decimal,
        allocations: Dict[str, Decimal],
        driver_id: int,
        lease_id: int,
        payment_method: str,
    ) -> List[LedgerPosting]:
        """
        Applies an ad-hoc driver payment to one or more specific obligations.
        """
        if payment_amount <= 0:
            raise InvalidLedgerOperationError("Payment amount must be positive.")
        
        total_allocated = sum(allocations.values())
        if total_allocated > payment_amount:
            raise InvalidLedgerOperationError("Total allocated amount exceeds payment amount.")

        created_postings = []
        try:
            for ref_id, alloc_amount in allocations.items():
                if alloc_amount <= 0:
                    continue

                balance = await self.repo.get_balance_by_reference(
                    reference_id=ref_id, driver_id=driver_id
                )

                if balance.balance < alloc_amount:
                    raise InvalidLedgerOperationError(
                        f"Allocation amount ${alloc_amount} for '{ref_id}' exceeds remaining balance of ${balance.balance}."
                    )

                posting = LedgerPosting(
                    category=PostingCategory.INTERIM_PAYMENT,
                    amount=-alloc_amount,
                    entry_type=EntryType.CREDIT,
                    reference_id=ref_id,
                    driver_id=driver_id,
                    lease_id=lease_id,
                )
                new_posting = await self.repo.create_posting(posting)
                created_postings.append(new_posting)

                new_balance_amount = balance.balance - alloc_amount
                await self.repo.update_balance(
                    balance=balance,
                    new_balance_amount=new_balance_amount,
                    payment_ref_id=new_posting.id,
                )

            unallocated = payment_amount - total_allocated
            if unallocated > 0:
                lease_ref_id = str(lease_id)
                try:
                    lease_balance = await self.repo.get_balance_by_reference(reference_id=lease_ref_id, driver_id=driver_id)
                    lease_posting = LedgerPosting(
                        category=PostingCategory.INTERIM_PAYMENT,
                        amount=-unallocated,
                        entry_type=EntryType.CREDIT,
                        reference_id=lease_ref_id,
                        driver_id=driver_id,
                        lease_id=lease_id
                    )
                    new_lease_posting = await self.repo.create_posting(lease_posting)
                    created_postings.append(new_lease_posting)
                    
                    new_lease_balance_amount = lease_balance.balance - unallocated
                    await self.repo.update_balance(
                        balance=lease_balance,
                        new_balance_amount=new_lease_balance_amount,
                        payment_ref_id=new_lease_posting.id
                    )
                except BalanceNotFoundError:
                    logger.warning("No primary lease balance found to apply unallocated interim payment.", lease_id=lease_id)

            await self.repo.db.commit()
            logger.info("Successfully applied interim payment.", driver_id=driver_id, total_amount=payment_amount)
            return created_postings
        except (SQLAlchemyError, LedgerError) as e:
            await self.repo.db.rollback()
            logger.error(
                "Failed to apply interim payment.", driver_id=driver_id, error=str(e), exc_info=True
            )
            raise

    async def apply_weekly_earnings(
        self, driver_id: int, earnings_amount: Decimal, lease_id: int
    ) -> List[LedgerPosting]:
        """
        Applies weekly CURB earnings to a driver's outstanding balances.
        """
        if earnings_amount <= 0:
            return []

        remaining_earnings = earnings_amount
        created_postings = []
        try:
            earnings_posting = LedgerPosting(
                category=PostingCategory.EARNINGS,
                amount=-earnings_amount,
                entry_type=EntryType.CREDIT,
                reference_id=f"EARNINGS-{datetime.now(timezone.utc).strftime('%Y%m%d')}",
                driver_id=driver_id,
                lease_id=lease_id,
            )
            await self.repo.create_posting(earnings_posting)
            created_postings.append(earnings_posting)

            open_balances = await self.repo.get_open_balances_for_driver(driver_id)

            for balance in open_balances:
                if remaining_earnings <= 0:
                    break

                payment_amount = min(remaining_earnings, balance.balance)
                new_balance_amount = balance.balance - payment_amount
                await self.repo.update_balance(
                    balance=balance,
                    new_balance_amount=new_balance_amount,
                    payment_ref_id=earnings_posting.id,
                )
                remaining_earnings -= payment_amount

            await self.repo.db.commit()
            logger.info("Successfully applied weekly earnings.", driver_id=driver_id, total_earnings=earnings_amount)
            return created_postings
        except (SQLAlchemyError, LedgerError) as e:
            await self.repo.db.rollback()
            logger.error("Failed to apply weekly earnings.", driver_id=driver_id, error=str(e), exc_info=True)
            raise

    async def void_posting(self, posting_id: str, reason: str) -> LedgerPosting:
        """
        Voids an existing ledger posting by creating a neutralizing reversal posting.
        """
        try:
            original_posting = await self.repo.get_posting_by_id(posting_id)

            if original_posting.status == PostingStatus.VOIDED:
                raise InvalidLedgerOperationError("Cannot void a posting that is already voided.")

            reversal_posting = LedgerPosting(
                category=original_posting.category,
                amount=-original_posting.amount,
                entry_type=(
                    EntryType.CREDIT
                    if original_posting.entry_type == EntryType.DEBIT
                    else EntryType.DEBIT
                ),
                status=PostingStatus.POSTED,
                reference_id=original_posting.reference_id,
                reversal_for_id=original_posting.id,
                driver_id=original_posting.driver_id,
                lease_id=original_posting.lease_id,
                vehicle_id=original_posting.vehicle_id,
                medallion_id=original_posting.medallion_id,
            )
            new_reversal = await self.repo.create_posting(reversal_posting)

            await self.repo.update_posting_status(
                posting=original_posting, status=PostingStatus.VOIDED
            )

            try:
                balance = await self.repo.get_balance_by_reference(
                    reference_id=original_posting.reference_id,
                    driver_id=original_posting.driver_id,
                )
                
                new_balance_amount = balance.balance - original_posting.amount
                if balance.status == BalanceStatus.CLOSED:
                    balance.status = BalanceStatus.OPEN

                await self.repo.update_balance(
                    balance=balance,
                    new_balance_amount=new_balance_amount,
                    payment_ref_id=new_reversal.id,
                )
            except BalanceNotFoundError:
                logger.warning(
                    "No corresponding balance found to adjust for voided posting.",
                    posting_id=posting_id,
                    reference_id=original_posting.reference_id
                )

            await self.repo.db.commit()
            logger.info("Successfully voided posting.", posting_id=posting_id, reversal_id=new_reversal.id)
            return new_reversal
        except (SQLAlchemyError, LedgerError, PostingNotFoundError) as e:
            await self.repo.db.rollback()
            logger.error("Failed to void posting.", posting_id=posting_id, error=str(e), exc_info=True)
            raise

    async def list_postings(
        self, **kwargs
    ) -> Tuple[List[LedgerPostingResponse], int]:
        """
        Fetches and formats a list of ledger postings.
        """
        postings, total_items = await self.repo.list_postings(**kwargs)

        # Map SQLAlchemy models to Pydantic response models
        response_items = [
            LedgerPostingResponse(
                posting_id=p.id,
                status=p.status,
                date=p.created_on,
                category=p.category,
                type=p.entry_type,
                amount=p.amount,
                driver_name=p.driver.full_name if p.driver else None,
                lease_id=p.lease_id,
                vehicle_vin=p.vin,
                medallion_no=p.medallion.medallion_number if p.medallion else None,
                reference_id=p.reference_id,
            )
            for p in postings
        ]

        return response_items, total_items

    async def list_balances(
        self, **kwargs
    ) -> Tuple[List[LedgerBalanceResponse], int]:
        """
        Fetches and formats a list of ledger balances.
        """
        balances, total_items = await self.repo.list_balances(**kwargs)

        # Map SQLAlchemy models to Pydantic response models
        response_items = [
            LedgerBalanceResponse(
                balance_id=b.id,
                category=b.category,
                status=b.status,
                reference_id=b.reference_id,
                driver_name=b.driver.full_name if b.driver else None,
                lease_id=b.lease_id,
                vehicle_vin=b.vin,
                original_amount=b.original_amount,
                prior_balance=b.prior_balance,
                balance=b.balance,
            )
            for b in balances
        ]

        return response_items, total_items