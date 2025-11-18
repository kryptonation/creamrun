### app/ezpass/services.py

import csv
import io
from datetime import datetime, timedelta
from decimal import Decimal

from celery import shared_task
from sqlalchemy.orm import Session

from app.core.db import SessionLocal
from app.curb.models import CurbTrip
from app.ezpass.exceptions import (
    AssociationError,
    CSVParseError,
    EZPassError,
    ImportInProgressError,
    LedgerPostingError,
)
from app.ezpass.models import (
    EZPassImportStatus,
    EZPassTransactionStatus,
)
from app.ezpass.repository import EZPassRepository
from app.ledger.models import PostingCategory
from app.ledger.services import LedgerService
from app.utils.logger import get_logger
from app.vehicles.models import VehicleRegistration

logger = get_logger(__name__)

# A simple in-memory flag to prevent concurrent imports. For a multi-worker setup,
# a distributed lock (e.g., using Redis) would be more robust.
IMPORT_IN_PROGRESS_FLAG = False


class EZPassService:
    """
    Service layer for handling EZPass CSV imports, transaction association,
    and ledger posting.
    """

    def __init__(self, db: Session):
        self.db = db
        self.repo = EZPassRepository(db)

    def process_uploaded_csv(self, file_stream: io.BytesIO, file_name: str, user_id: int):
        """
        Main entry point for processing a new CSV file. It validates, parses,
        and saves the raw transaction data, then triggers the background association task.
        """
        global IMPORT_IN_PROGRESS_FLAG
        if IMPORT_IN_PROGRESS_FLAG:
            raise ImportInProgressError()

        IMPORT_IN_PROGRESS_FLAG = True
        try:
            logger.info(f"Starting EZPass CSV import for file: {file_name}")
            
            # Read and decode the file stream
            try:
                content = file_stream.read().decode("utf-8")
                csv_reader = csv.reader(io.StringIO(content))
                header = next(csv_reader)
                rows = list(csv_reader)
            except Exception as e:
                raise CSVParseError(f"Failed to read or decode CSV content: {e}")

            if not rows:
                logger.warning(f"EZPass CSV file '{file_name}' is empty or has no data rows.")
                return {"message": "File is empty, no transactions were imported."}

            import_record = self.repo.create_import_record(file_name, len(rows))
            self.db.flush() # Ensure import_record has an ID

            transactions_to_insert = []
            failed_rows = []

            for i, row in enumerate(rows):
                try:
                    # Basic validation and parsing
                    if len(row) < 9:
                        raise ValueError("Incorrect number of columns")
                    
                    transaction_id = row[0]
                    amount_str = row[8].replace("(", "-").replace(")", "").replace("$", "")
                    
                    transaction_datetime_str = f"{row[6]} {row[7]}"
                    # Try parsing with seconds first, then without
                    try:
                        transaction_datetime = datetime.strptime(transaction_datetime_str, "%m/%d/%Y %I:%M:%S %p")
                    except ValueError:
                        transaction_datetime = datetime.strptime(transaction_datetime_str, "%m/%d/%Y %I:%M %p")

                    transaction_data = {
                        "import_id": import_record.id,
                        "transaction_id": transaction_id,
                        "tag_or_plate": row[1],
                        "agency": row[2],
                        "entry_plaza": row[3],
                        "exit_plaza": row[4],
                        "transaction_datetime": transaction_datetime,
                        "amount": Decimal(amount_str),
                        "med_from_csv": row[9] if len(row) > 9 else None,
                        "created_by": user_id,
                        "status": EZPassTransactionStatus.IMPORTED,
                    }
                    transactions_to_insert.append(transaction_data)
                except (ValueError, IndexError) as e:
                    logger.warning(f"Skipping malformed row {i+2} in {file_name}: {e}. Row data: {row}")
                    failed_rows.append({"row_number": i + 2, "error": str(e)})

            self.repo.bulk_insert_transactions(transactions_to_insert)
            self.repo.update_import_record_status(
                import_id=import_record.id,
                status=EZPassImportStatus.COMPLETED,
                successful=len(transactions_to_insert),
                failed=len(failed_rows),
            )
            self.db.commit()

            logger.info(f"Successfully imported {len(transactions_to_insert)} records from {file_name}. Triggering association task.")
            
            self.associate_transactions()

            return {
                "message": "File uploaded and import process initiated.",
                "import_id": import_record.id,
                "total_rows": len(rows),
                "imported_records": len(transactions_to_insert),
                "failed_rows": len(failed_rows),
            }

        except Exception as e:
            self.db.rollback()
            logger.error(f"Fatal error during CSV processing for {file_name}: {e}", exc_info=True)
            if 'import_record' in locals() and import_record.id:
                 self.repo.update_import_record_status(import_record.id, EZPassImportStatus.FAILED, 0, len(rows))
                 self.db.commit()
            raise EZPassError(f"Could not process CSV file: {e}") from e
        finally:
            IMPORT_IN_PROGRESS_FLAG = False

    def associate_transactions(self):
        """
        Business logic to associate imported EZPass transactions with drivers, leases, etc.
        This method is designed to be run in a background task.
        """
        logger.info("Starting EZPass transaction association task.")
        transactions_to_process = self.repo.get_transactions_by_status(EZPassTransactionStatus.IMPORTED)
        
        if not transactions_to_process:
            logger.info("No imported EZPass transactions to associate.")
            return {"processed": 0, "successful": 0, "failed": 0}

        successful_count = 0
        failed_count = 0

        for trans in transactions_to_process:
            updates = {"status": EZPassTransactionStatus.ASSOCIATION_FAILED}
            try:
                # 1. Find the vehicle using the plate number
                plate_number_full = trans.tag_or_plate
                plate_number = plate_number_full.split(' ')[1] if ' ' in plate_number_full else plate_number_full
                
                vehicle_reg = self.db.query(VehicleRegistration).filter(
                    VehicleRegistration.plate_number.ilike(f"%{plate_number}%")
                ).first()

                if not vehicle_reg or not vehicle_reg.vehicle:
                    raise AssociationError(trans.transaction_id, f"No vehicle found for plate '{plate_number}'")
                
                vehicle = vehicle_reg.vehicle
                updates["vehicle_id"] = vehicle.id

                # 2. Find the corresponding CURB trip to identify the driver
                # Look for a trip within a time window around the toll time
                time_buffer = timedelta(minutes=30)
                trip_start = trans.transaction_datetime - time_buffer
                trip_end = trans.transaction_datetime + time_buffer

                curb_trip = self.db.query(CurbTrip).filter(
                    CurbTrip.vehicle_id == vehicle.id,
                    CurbTrip.start_time <= trip_end,
                    CurbTrip.end_time >= trip_start
                ).order_by(CurbTrip.start_time.desc()).first()

                if not curb_trip or not curb_trip.driver_id:
                    raise AssociationError(trans.transaction_id, f"No active CURB trip found for vehicle {vehicle.id} around {trans.transaction_datetime}")
                
                updates["driver_id"] = curb_trip.driver_id
                updates["lease_id"] = curb_trip.lease_id
                updates["medallion_id"] = curb_trip.medallion_id
                updates["status"] = EZPassTransactionStatus.ASSOCIATED
                updates["failure_reason"] = None
                successful_count += 1
                
            except AssociationError as e:
                updates["failure_reason"] = e.reason
                failed_count += 1
                logger.warning(f"Association failed for transaction {trans.transaction_id}: {e.reason}")

            except Exception as e:
                updates["failure_reason"] = f"An unexpected error occurred: {str(e)}"
                failed_count += 1
                logger.error(f"Unexpected error associating transaction {trans.transaction_id}: {e}", exc_info=True)

            finally:
                self.repo.update_transaction(trans.id, updates)
        
        self.db.commit()
        logger.info(f"Association task finished. Processed: {len(transactions_to_process)}, Successful: {successful_count}, Failed: {failed_count}")
        
        if successful_count > 0:
            post_ezpass_tolls_to_ledger_task.delay()

        return {"processed": len(transactions_to_process), "successful": successful_count, "failed": failed_count}

    def post_tolls_to_ledger(self, ledger_service: LedgerService):
        """
        Posts successfully associated EZPass tolls as obligations to the Centralized Ledger.
        This is designed to be run as a background task.
        """
        logger.info("Starting task to post EZPass tolls to ledger.")
        transactions_to_post = self.repo.get_transactions_by_status(EZPassTransactionStatus.ASSOCIATED)

        if not transactions_to_post:
            logger.info("No associated EZPass transactions to post to ledger.")
            return {"posted": 0, "failed": 0}

        posted_count = 0
        failed_count = 0

        for trans in transactions_to_post:
            updates = {"status": EZPassTransactionStatus.POSTING_FAILED}
            try:
                if not all([trans.driver_id, trans.lease_id, trans.amount > 0]):
                    raise LedgerPostingError(trans.transaction_id, "Missing required driver, lease, or positive amount.")

                # The create_obligation method is atomic and handles both posting and balance creation
                ledger_service.create_obligation(
                    category=PostingCategory.EZPASS,
                    amount=trans.amount,
                    reference_id=trans.transaction_id,
                    driver_id=trans.driver_id,
                    lease_id=trans.lease_id,
                    vehicle_id=trans.vehicle_id,
                    medallion_id=trans.medallion_id,
                )
                
                updates["status"] = EZPassTransactionStatus.POSTED_TO_LEDGER
                updates["failure_reason"] = None
                updates["posting_date"] = datetime.utcnow()
                posted_count += 1

            except Exception as e:
                updates["failure_reason"] = f"Ledger service error: {str(e)}"
                failed_count += 1
                logger.error(f"Failed to post EZPass transaction {trans.transaction_id} to ledger: {e}", exc_info=True)
            
            finally:
                self.repo.update_transaction(trans.id, updates)

        self.db.commit()
        logger.info(f"Ledger posting task finished. Posted: {posted_count}, Failed: {failed_count}")
        return {"posted": posted_count, "failed": failed_count}


# --- Celery Tasks ---

@shared_task(name="ezpass.associate_transactions")
def associate_ezpass_transactions_task():
    """
    Background task to find the correct driver/lease for imported EZPass transactions.
    """
    logger.info("Executing Celery task: associate_ezpass_transactions_task")
    db: Session = SessionLocal()
    try:
        service = EZPassService(db)
        result = service.associate_transactions()
        return result
    except Exception as e:
        logger.error(f"Celery task associate_ezpass_transactions_task failed: {e}", exc_info=True)
        db.rollback()
        raise
    finally:
        db.close()

@shared_task(name="ezpass.post_tolls_to_ledger")
def post_ezpass_tolls_to_ledger_task():
    """
    Background task to post successfully associated EZPass tolls to the ledger.
    """
    logger.info("Executing Celery task: post_ezpass_tolls_to_ledger_task")
    db: Session = SessionLocal()
    try:
        ledger_service = LedgerService(db)
        ezpass_service = EZPassService(db)
        result = ezpass_service.post_tolls_to_ledger(ledger_service)
        return result
    except Exception as e:
        logger.error(f"Celery task post_ezpass_tolls_to_ledger_task failed: {e}", exc_info=True)
        db.rollback()
        raise
    finally:
        db.close()