### app/ezpass/repository.py

from datetime import date, datetime
from typing import List, Optional, Tuple

from sqlalchemy import func, update
from sqlalchemy.orm import Session, joinedload

from app.drivers.models import Driver
from app.ezpass.models import (
    EZPassImport,
    EZPassImportStatus,
    EZPassTransaction,
    EZPassTransactionStatus,
)
from app.medallions.models import Medallion
from app.vehicles.models import Vehicle
from app.utils.logger import get_logger

logger = get_logger(__name__)


class EZPassRepository:
    """
    Data Access Layer for EZPass Imports and Transactions.
    """

    def __init__(self, db: Session):
        self.db = db

    def create_import_record(self, file_name: str, total_records: int) -> EZPassImport:
        """Creates a new parent record for a CSV import batch."""
        import_record = EZPassImport(
            file_name=file_name,
            total_records=total_records,
            status=EZPassImportStatus.PROCESSING,
        )
        self.db.add(import_record)
        self.db.flush()  # Flush to get the ID for the transactions
        return import_record

    def update_import_record_status(
        self, import_id: int, status: EZPassImportStatus, successful: int, failed: int
    ):
        """Updates the status and counts of an import record upon completion."""
        stmt = (
            update(EZPassImport)
            .where(EZPassImport.id == import_id)
            .values(
                status=status,
                successful_records=successful,
                failed_records=failed,
                updated_on=datetime.utcnow(),
            )
        )
        self.db.execute(stmt)

    def bulk_insert_transactions(self, transactions_data: List[dict]):
        """Performs a bulk insert of new EZPassTransaction records."""
        if not transactions_data:
            return
        
        # Check for duplicates before inserting
        incoming_txn_ids = {t['transaction_id'] for t in transactions_data}
        existing_txn_ids = {
            res[0] for res in self.db.query(EZPassTransaction.transaction_id)
            .filter(EZPassTransaction.transaction_id.in_(incoming_txn_ids))
        }
        
        new_transactions = [
            EZPassTransaction(**data)
            for data in transactions_data
            if data['transaction_id'] not in existing_txn_ids
        ]

        if new_transactions:
            self.db.add_all(new_transactions)
        
        logger.info(f"Prepared {len(new_transactions)} new transactions for insertion. Skipped {len(existing_txn_ids)} duplicates.")


    def get_transactions_by_status(
        self, status: EZPassTransactionStatus
    ) -> List[EZPassTransaction]:
        """Retrieves all transactions currently in a specific status."""
        return (
            self.db.query(EZPassTransaction)
            .filter(EZPassTransaction.status == status)
            .all()
        )

    def update_transaction(self, transaction_id: int, updates: dict):
        """Updates specific fields of a single transaction record."""
        updates["updated_on"] = datetime.utcnow()
        stmt = (
            update(EZPassTransaction)
            .where(EZPassTransaction.id == transaction_id)
            .values(**updates)
        )
        self.db.execute(stmt)

    def list_transactions(
        self,
        page: int,
        per_page: int,
        sort_by: str,
        sort_order: str,
        transaction_date: Optional[date] = None,
        medallion_no: Optional[str] = None,
        driver_id: Optional[str] = None,
        plate_number: Optional[str] = None,
        status: Optional[str] = None,
    ) -> Tuple[List[EZPassTransaction], int]:
        """
        Retrieves a paginated, sorted, and filtered list of EZPass transactions.
        """
        query = (
            self.db.query(EZPassTransaction)
            .options(
                joinedload(EZPassTransaction.driver),
                joinedload(EZPassTransaction.medallion),
                joinedload(EZPassTransaction.vehicle),
            )
            .outerjoin(Driver, EZPassTransaction.driver_id == Driver.id)
            .outerjoin(Medallion, EZPassTransaction.medallion_id == Medallion.id)
            .outerjoin(Vehicle, EZPassTransaction.vehicle_id == Vehicle.id)
        )

        # Apply filters
        if transaction_date:
            start_of_day = datetime.combine(transaction_date, datetime.min.time())
            end_of_day = datetime.combine(transaction_date, datetime.max.time())
            query = query.filter(EZPassTransaction.transaction_datetime.between(start_of_day, end_of_day))
        if medallion_no:
            query = query.filter(Medallion.medallion_number.ilike(f"%{medallion_no}%"))
        if driver_id:
            query = query.filter(Driver.driver_id.ilike(f"%{driver_id}%"))
        if plate_number:
            # tag_or_plate can have state prefix, so use 'like'
            query = query.filter(EZPassTransaction.tag_or_plate.ilike(f"%{plate_number}%"))
        if status:
            try:
                status_enum = EZPassTransactionStatus[status.upper()]
                query = query.filter(EZPassTransaction.status == status_enum)
            except KeyError:
                logger.warning(f"Invalid status filter value received: {status}")

        total_items = query.with_entities(func.count(EZPassTransaction.id)).scalar()

        sort_column_map = {
            "transaction_date": EZPassTransaction.transaction_datetime,
            "medallion_no": Medallion.medallion_number,
            "driver_id": Driver.driver_id,
            "plate_number": EZPassTransaction.tag_or_plate,
            "posting_date": EZPassTransaction.posting_date,
            "status": EZPassTransaction.status,
        }

        sort_column = sort_column_map.get(sort_by, EZPassTransaction.transaction_datetime)
        if sort_order.lower() == "desc":
            query = query.order_by(sort_column.desc())
        else:
            query = query.order_by(sort_column.asc())

        query = query.offset((page - 1) * per_page).limit(per_page)

        return query.all(), total_items