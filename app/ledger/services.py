# app/ledger/services.py

from decimal import Decimal
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timezone, timedelta

from fastapi import Depends
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.db import get_db
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


def get_ledger_repository(db: Session = Depends(get_db)) -> LedgerRepository:
    """Dependency injector to get an instance of LedgerRepository."""
    return LedgerRepository(db)


class LedgerService:
    """
    Business Logic Layer for the Centralized Ledger.
    This service is the single entry point for all ledger operations.
    """

    def __init__(self, repo: LedgerRepository = Depends(get_ledger_repository)):
        self.repo = repo

    def create_obligation(
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
            self.repo.create_posting(posting)

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
            new_balance = self.repo.create_balance(balance)

            self.repo.db.commit()
            logger.info(
                "Successfully created obligation.",
                category=category.value,
                amount=amount,
                reference_id=reference_id,
                driver_id=driver_id,
            )
            return new_balance
        except SQLAlchemyError as e:
            self.repo.db.rollback()
            logger.error("Failed to create obligation.", error=str(e), exc_info=True)
            raise LedgerError(f"Failed to create obligation: {str(e)}") from e

    def apply_interim_payment(
        self,
        payment_amount: Decimal,
        allocations: Dict[str, Decimal],
        driver_id: int,
        lease_id: Optional[int] = None,
        payment_method: str = "CASH",
    ) -> List[LedgerPosting]:
        """
        Applies an interim payment by creating CREDIT postings and updating balances.
        """
        if payment_amount <= 0:
            raise InvalidLedgerOperationError("Payment amount must be positive.")

        total_allocated = sum(allocations.values())
        if total_allocated > payment_amount:
            raise InvalidLedgerOperationError(
                f"Total allocated amount ({total_allocated}) exceeds payment amount ({payment_amount})."
            )

        created_postings = []
        try:
            for reference_id, allocation_amount in allocations.items():
                if allocation_amount <= 0:
                    continue

                balance = self.repo.get_balance_by_reference_id(reference_id)
                if not balance:
                    raise BalanceNotFoundError(f"Balance with reference_id {reference_id} not found.")

                if balance.status != BalanceStatus.OPEN:
                    raise InvalidLedgerOperationError(
                        f"Cannot apply payment to a balance with status {balance.status}."
                    )

                # Create CREDIT posting
                credit_posting = LedgerPosting(
                    category=balance.category,
                    amount=-allocation_amount,
                    entry_type=EntryType.CREDIT,
                    status=PostingStatus.POSTED,
                    reference_id=f"PAYMENT-{payment_method}-{reference_id}",
                    driver_id=driver_id,
                    lease_id=lease_id or balance.lease_id,
                    vehicle_id=balance.vehicle_id,
                    medallion_id=balance.medallion_id,
                )
                self.repo.create_posting(credit_posting)
                created_postings.append(credit_posting)

                # Update balance
                new_balance_amount = Decimal(balance.balance) - Decimal(allocation_amount)
                new_status = BalanceStatus.CLOSED if new_balance_amount <= 0 else BalanceStatus.OPEN
                self.repo.update_balance(balance, new_balance_amount, new_status)

            self.repo.db.commit()
            logger.info(
                "Successfully applied interim payment.",
                driver_id=driver_id,
                payment_amount=payment_amount,
                allocations=allocations,
            )
            return created_postings
        except (SQLAlchemyError, LedgerError) as e:
            self.repo.db.rollback()
            logger.error("Failed to apply interim payment.", error=str(e), exc_info=True)
            raise

    def apply_weekly_earnings(
        self, driver_id: int, earnings_amount: Decimal, lease_id: Optional[int] = None
    ) -> Dict[str, Decimal]:
        """
        Applies weekly earnings to open balances according to payment hierarchy.
        Returns a dictionary of reference_id: amount_applied.
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
            self.repo.create_posting(earnings_posting)
            created_postings.append(earnings_posting)

            open_balances = self.repo.get_open_balances_for_driver(driver_id)

            for balance in open_balances:
                if remaining_earnings <= 0:
                    break

                payment_amount = min(remaining_earnings, balance.balance)
                new_balance_amount = balance.balance - payment_amount
                self.repo.update_balance(
                    balance=balance,
                    new_balance_amount=new_balance_amount,
                    payment_ref_id=earnings_posting.id,
                )
                remaining_earnings -= payment_amount

            self.repo.db.commit()
            logger.info("Successfully applied weekly earnings.", driver_id=driver_id, total_earnings=earnings_amount)
            return created_postings
        except (SQLAlchemyError, LedgerError) as e:
            self.repo.db.rollback()
            logger.error("Failed to apply weekly earnings.", driver_id=driver_id, error=str(e), exc_info=True)
            raise

    def void_posting(self, posting_id: str, reason: str) -> LedgerPosting:
        """
        Voids a posting by creating a reversal entry and updating the original status.
        """
        try:
            original_posting = self.repo.get_posting_by_id(posting_id)

            if original_posting.status == PostingStatus.VOIDED:
                raise InvalidLedgerOperationError(
                    f"Posting {posting_id} is already voided."
                )

            # Create reversal posting
            reversal_amount = -original_posting.amount
            new_reversal = LedgerPosting(
                category=original_posting.category,
                amount=reversal_amount,
                entry_type=EntryType.CREDIT if original_posting.entry_type == EntryType.DEBIT else EntryType.DEBIT,
                status=PostingStatus.POSTED,
                reference_id=f"VOID-{original_posting.reference_id}",
                driver_id=original_posting.driver_id,
                lease_id=original_posting.lease_id,
                vehicle_id=original_posting.vehicle_id,
                medallion_id=original_posting.medallion_id,
                reversal_for_id=original_posting.id,
            )
            self.repo.create_posting(new_reversal)

            # Update original posting status
            self.repo.update_posting_status(original_posting, PostingStatus.VOIDED)

            # Update corresponding balance if it exists
            balance = self.repo.get_balance_by_reference_id(original_posting.reference_id)
            if balance:
                new_balance_amount = balance.balance - original_posting.amount
                new_status = BalanceStatus.CLOSED if new_balance_amount <= 0 else BalanceStatus.OPEN
                self.repo.update_balance(balance, new_balance_amount, new_status)

            self.repo.db.commit()
            logger.info("Successfully voided posting.", posting_id=posting_id, reversal_id=new_reversal.id)
            return new_reversal
        except (SQLAlchemyError, LedgerError, PostingNotFoundError) as e:
            self.repo.db.rollback()
            logger.error("Failed to void posting.", posting_id=posting_id, error=str(e), exc_info=True)
            raise

    def list_postings(
        self, **kwargs
    ) -> Tuple[List[LedgerPostingResponse], int]:
        """
        Fetches and formats a list of ledger postings.
        """
        postings, total_items = self.repo.list_postings(**kwargs)

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

    def list_balances(
        self, **kwargs
    ) -> Tuple[List[LedgerBalanceResponse], int]:
        """
        Fetches and formats a list of ledger balances.
        """
        balances, total_items = self.repo.list_balances(**kwargs)

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