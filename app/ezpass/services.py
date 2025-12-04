### app/ezpass/services.py

import csv
import io
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import List, Optional

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

# Available log types for filtering
AVAILABLE_LOG_TYPES = [
    "Import",
    # Future: "Associate", "Post"
]

# Available log statuses for filtering
AVAILABLE_LOG_STATUSES = [
    "Success",
    "Partial Success", 
    "Failure",
    "Pending",
    "Processing"
]


class EZPassService:
    """
    Service layer for handling EZPass CSV imports, transaction association,
    and ledger posting.
    """

    def __init__(self, db: Session):
        self.db = db
        self.repo = EZPassRepository(db)

    def _map_csv_columns(self, header: list) -> dict:
        """
        Maps CSV column names to their indices, handling different column orders.
        Returns a dictionary with expected field names as keys and column indices as values.
        """
        # Define possible column name variations for each field
        column_mappings = {
            'transaction_id': ['transaction id', 'trans id', 'id', 'transaction_id', 'txn_id', 'lane txn id', 'lane transaction id'],
            'tag_or_plate': ['tag/plate', 'tag or plate', 'plate', 'tag', 'tag_or_plate', 'license_plate', 'tag/plate #', 'tag/plate number'],
            'agency': ['agency', 'toll agency', 'authority', 'agency_name'],
            'entry_plaza': ['entry plaza', 'entry', 'entry_plaza', 'on_plaza', 'entrance'],
            'exit_plaza': ['exit plaza', 'exit', 'exit_plaza', 'off_plaza', 'exit_point'],
            'ezpass_class': ['class', 'vehicle class', 'ezpass class', 'ezpass_class', 'veh_class'],
            'date': ['date', 'transaction date', 'trans date', 'txn_date', 'travel_date'],
            'time': ['time', 'transaction time', 'trans time', 'txn_time', 'travel_time'],
            'amount': ['amount', 'toll amount', 'charge', 'cost', 'fee', 'price'],
            'medallion': ['medallion', 'med', 'cab', 'medallion_no', 'med_no', 'cab_no'],
            'posted_date': ['posted date', 'posting date', 'post date'],
            'balance': ['balance', 'post txn balance', 'transaction balance', 'account balance']
        }
        
        # Normalize header names (lowercase, strip whitespace)
        normalized_header = [col.strip().lower() for col in header]
        
        # Find the index for each required field
        field_indices = {}
        
        for field, possible_names in column_mappings.items():
            index_found = None
            for i, col_name in enumerate(normalized_header):
                if any(possible_name in col_name for possible_name in possible_names):
                    index_found = i
                    break
            
            if index_found is not None:
                field_indices[field] = index_found
                logger.debug(f"Mapped field '{field}' to column index {index_found} ('{header[index_found]}')")
            else:
                logger.warning(f"Could not find column for field '{field}' in header: {header}")
        
        return field_indices

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

            # Map column names to indices dynamically
            column_indices = self._map_csv_columns(header)
            logger.info(f"Column mapping for {file_name}: {column_indices}")
            
            # Validate that required columns are present
            required_fields = ['transaction_id', 'tag_or_plate', 'agency', 'entry_plaza', 
                             'exit_plaza', 'ezpass_class', 'date', 'time', 'amount']
            missing_fields = [field for field in required_fields if field not in column_indices]
            
            if missing_fields:
                raise CSVParseError(f"Missing required columns: {missing_fields}. "
                                  f"Available columns: {header}")

            import_record = self.repo.create_import_record(file_name, len(rows))
            self.db.flush() # Ensure import_record has an ID

            transactions_to_insert = []
            failed_rows = []

            for i, row in enumerate(rows):
                try:
                    # Validate row has enough columns
                    max_index = max(column_indices.values())
                    if len(row) <= max_index:
                        raise ValueError(f"Row has {len(row)} columns but needs at least {max_index + 1}")
                    
                    logger.debug("Row information ******** ", row=row)
                    
                    # Extract data using dynamic column mapping
                    transaction_id = row[column_indices['transaction_id']].strip()
                    tag_or_plate = row[column_indices['tag_or_plate']].strip()
                    agency = row[column_indices['agency']].strip()
                    entry_plaza = row[column_indices['entry_plaza']].strip()
                    exit_plaza = row[column_indices['exit_plaza']].strip()
                    ezpass_class = row[column_indices['ezpass_class']].strip()
                    date_str = row[column_indices['date']].strip()
                    time_str = row[column_indices['time']].strip()
                    amount_str = row[column_indices['amount']].strip()
                    
                    # Process amount (handle parentheses for negative values, remove $ signs)
                    amount_str = amount_str.replace("(", "-").replace(")", "").replace("$", "")
                    
                    # Process datetime - combine date and time
                    transaction_datetime_str = f"{date_str} {time_str}"
                    # Try parsing with different formats
                    transaction_datetime = None
                    datetime_formats = [
                        "%m/%d/%Y %I:%M:%S %p",  # 10/28/2025 11:29:22 AM
                        "%m/%d/%Y %I:%M %p",     # 10/28/2025 11:29 AM
                        "%Y-%m-%d %H:%M:%S",     # 2025-10-28 11:29:22
                        "%Y-%m-%d %H:%M",       # 2025-10-28 11:29
                        "%m/%d/%Y %H:%M:%S",     # 10/28/2025 23:29:22
                        "%m/%d/%Y %H:%M"         # 10/28/2025 23:29
                    ]
                    
                    for fmt in datetime_formats:
                        try:
                            transaction_datetime = datetime.strptime(transaction_datetime_str, fmt)
                            break
                        except ValueError:
                            continue
                    
                    if transaction_datetime is None:
                        raise ValueError(f"Unable to parse datetime '{transaction_datetime_str}' with any known format")

                    # Get medallion if present (optional field)
                    medallion = None
                    if 'medallion' in column_indices and len(row) > column_indices['medallion']:
                        medallion = row[column_indices['medallion']].strip() or None

                    # Get posting date if present (optional field)
                    posting_date = None
                    if 'posted_date' in column_indices and len(row) > column_indices['posted_date']:
                        posted_date_str = row[column_indices['posted_date']].strip()
                        if posted_date_str:
                            # Try to parse posting date (usually just date, no time)
                            posting_date_formats = [
                                "%m/%d/%Y",      # 10/28/2025
                                "%Y-%m-%d",      # 2025-10-28
                                "%m-%d-%Y",      # 10-28-2025
                                "%d/%m/%Y",      # 28/10/2025
                            ]
                            
                            for fmt in posting_date_formats:
                                try:
                                    posting_date = datetime.strptime(posted_date_str, fmt)
                                    break
                                except ValueError:
                                    continue

                    transaction_data = {
                        "import_id": import_record.id,
                        "transaction_id": transaction_id,
                        "tag_or_plate": tag_or_plate,
                        "agency": agency,
                        "entry_plaza": entry_plaza,
                        "exit_plaza": exit_plaza,
                        "ezpass_class": ezpass_class,
                        "transaction_datetime": transaction_datetime,
                        "amount": Decimal(amount_str),
                        "med_from_csv": medallion,
                        "posting_date": posting_date,
                        "created_by": user_id,
                        "status": EZPassTransactionStatus.IMPORTED,
                    }
                    transactions_to_insert.append(transaction_data)
                except (ValueError, IndexError, KeyError) as e:
                    logger.warning(f"Skipping malformed row {i+2} in {file_name}: {e}. Row data: {row}")
                    failed_rows.append({"row_number": i + 2, "error": str(e)})

            # Process transactions with individual error handling
            total_inserted = 0
            total_failed = len(failed_rows)  # Start with parsing failures
            
            # Process all transactions at once - the repository now handles individual failures
            try:
                successful_inserts = self.repo.bulk_insert_transactions(transactions_to_insert)
                total_inserted = successful_inserts
                
                # Calculate failed insertions
                total_failed += (len(transactions_to_insert) - successful_inserts)
                
                # If some transactions failed during insertion, we need to identify which ones
                if successful_inserts < len(transactions_to_insert):
                    logger.warning(f"Some transactions failed during insertion: {len(transactions_to_insert) - successful_inserts} failed")
                    
                    # Add generic failure records for the difference
                    # (The specific errors are already logged in the repository)
                    failed_during_insert = len(transactions_to_insert) - successful_inserts
                    for i in range(failed_during_insert):
                        failed_rows.append({
                            "row_number": "unknown",
                            "transaction_id": "unknown", 
                            "error": "Database constraint violation or duplicate transaction"
                        })
                
            except Exception as e:
                # This should be rare now that repository handles individual failures
                logger.error(f"Unexpected error during bulk insert: {e}")
                total_failed += len(transactions_to_insert)
                for i, transaction_data in enumerate(transactions_to_insert):
                    failed_rows.append({
                        "row_number": i + 2,  # +2 for header and 1-based indexing
                        "transaction_id": transaction_data.get('transaction_id', 'unknown'),
                        "error": f"Bulk insert failed: {str(e)}"
                    })

            self.repo.update_import_record_status(
                import_id=import_record.id,
                status=EZPassImportStatus.COMPLETED if total_inserted > 0 else EZPassImportStatus.FAILED,
                successful=total_inserted,
                failed=total_failed,
            )
            self.db.commit()

            logger.info(f"Import completed for {file_name}: {total_inserted} successful, {total_failed} failed. Triggering association task.")
            
            # Only trigger association if we have successful imports
            if total_inserted > 0:
                self.associate_transactions()

            return {
                "message": f"File processed: {total_inserted} imported, {total_failed} failed.",
                "import_id": import_record.id,
                "total_rows": len(rows),
                "imported_records": total_inserted,
                "failed_rows": total_failed,
                "failed_details": failed_rows,
                "column_mapping": column_indices,
                "detected_columns": header,
            }

        except Exception as e:
            logger.error(f"Fatal error during CSV processing for {file_name}: {e}", exc_info=True)
            
            # Try to update import record with failure status
            try:
                if 'import_record' in locals() and import_record and import_record.id:
                    total_attempted = len(transactions_to_insert) if 'transactions_to_insert' in locals() else len(rows) if 'rows' in locals() else 0
                    # Create a new session for the failure update to avoid session state issues
                    from app.core.db import SessionLocal
                    failure_db = SessionLocal()
                    try:
                        failure_repo = EZPassRepository(failure_db)
                        failure_repo.update_import_record_status(
                            import_record.id, 
                            EZPassImportStatus.FAILED, 
                            0,  # successful = 0 
                            total_attempted  # all rows failed
                        )
                        failure_db.commit()
                        logger.info(f"Updated import record {import_record.id} with failure status using new session")
                    finally:
                        failure_db.close()
            except Exception as update_error:
                logger.error(f"Failed to update import record status: {update_error}")
            
            # Re-raise the original error with context
            if isinstance(e, (CSVParseError, ImportInProgressError)):
                raise  # Re-raise known exceptions as-is
            else:
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
    
    def manual_post_to_ledger(self, transaction_ids: List[int]) -> dict:
        """
        Manually post EZPass transactions to the centralized ledger.
        Used to force posting of ASSOCIATED transactions.
        """
        from app.ledger.services import LedgerService
        from app.ledger.repository import LedgerRepository

        logger.info("Manual posting of transactions to ledger", transactions_count=len(transaction_ids))

        ledger_repo = LedgerRepository(self.db)
        ledger_service = LedgerService(ledger_repo)
        success_count = 0
        failed_count = 0
        errors = []

        for txn_id in transaction_ids:
            try:
                transaction = self.repo.get_transaction_by_id(txn_id)
                if not transaction:
                    errors.append({
                        "transaction_id": txn_id,
                        "error": "Transaction not found"
                    })
                    failed_count += 1
                    continue

                # Validate transaction can be posted
                if transaction.status == EZPassTransactionStatus.POSTED_TO_LEDGER:
                    errors.append({
                        "transaction_id": txn_id,
                        "error": "Already posted to ledger"
                    })
                    failed_count += 1
                    continue

                if transaction.status != EZPassTransactionStatus.ASSOCIATED:
                    errors.append({
                        "transaction_id": txn_id,
                        "error": f"Cannot post - transaction status is {transaction.status.value}"
                    })
                    failed_count += 1
                    continue

                if not all([transaction.driver_id, transaction.lease_id, transaction.amount > 0]):
                    errors.append({
                        "transaction_id": txn_id,
                        "error": "Missing required fields (driver_id, lease_id, or valid amount)"
                    })
                    failed_count += 1
                    continue

                # Post to ledger
                ledger_service.create_obligation(
                    category=PostingCategory.EZPASS,
                    amount=transaction.amount,
                    reference_id=transaction.transaction_id,
                    driver_id=transaction.driver_id,
                    lease_id=transaction.lease_id,
                    vehicle_id=transaction.vehicle_id,
                    medallion_id=transaction.medallion_id,
                )

                # Update transaction status
                updates = {
                    "status": EZPassTransactionStatus.POSTED_TO_LEDGER,
                    "failure_reason": None,
                    "posting_date": datetime.now(timezone.utc)
                }
                self.repo.update_transaction(transaction.id, updates)
                success_count += 1
                logger.info("Transaction posted to ledger", transaction_id=transaction.transaction_id)

            except Exception as e:
                # Update transaction with error
                if transaction:
                    self.repo.update_transaction(transaction.id, {
                        "status": EZPassTransactionStatus.POSTING_FAILED,
                        "failure_reason": f"Manual posting error: {str(e)}"
                    })

                errors.append({
                    "transaction_id": txn_id,
                    "error": str(e)
                })
                failed_count += 1
                logger.error(f"Failed to post transaction {txn_id}: {e}", exc_info=True)

        self.db.commit()

        return {
            "success_count": success_count,
            "failed_count": failed_count,
            "errors": errors,
            "message": f"Successfully posted {success_count} transactions, {failed_count} failed."
        }
    
    def reassign_transactions(
        self, transaction_ids: List[int], new_driver_id: int, new_lease_id: int,
        new_medallion_id: Optional[int] = None, new_vehicle_id: Optional[int] = None
    ) -> dict:
        """
        Reassign EZPass transactions from one driver to another.
        This allows correcting incorrect associations.
        Can only reassign transactions that haven't been posted to ledger.
        """
        from app.drivers.models import Driver
        from app.leases.models import Lease

        logger.info("Reassigning transactions for driver", transactions_count=len(transaction_ids), driver_id=new_driver_id)

        # Validate new driver and lease
        new_driver = self.db.query(Driver).filter(Driver.id == new_driver_id).first()
        if not new_driver:
            raise EZPassError(f"New driver with ID {new_driver_id} not found.")
        
        new_lease = self.db.query(Lease).filter(Lease.id == new_lease_id).first()
        if not new_lease:
            raise EZPassError(f"New lease with ID {new_lease_id} not found.")
        
        # Validate new lease is an active lease for the new driver
        lease_drivers = new_lease.lease_driver
        is_primary_driver = False
        for ld in lease_drivers:
            if ld.driver_id == new_driver.driver_id and not ld.is_additional_driver:
                is_primary_driver = True
                break

        if not is_primary_driver:
            raise EZPassError(f"Lease {new_lease_id} does not belong to the driver {new_driver_id}")
        
        success_count = 0
        failed_count = 0
        errors = []

        for txn_id in transaction_ids:
            try:
                transaction = self.repo.get_transaction_by_id(txn_id)
                if not transaction:
                    errors.append({
                        "transaction_id": txn_id,
                        "error": "Transaction not found"
                    })
                    failed_count += 1
                    continue

                # Cannot reassign if already posted to ledger
                if transaction.status == EZPassTransactionStatus.POSTED_TO_LEDGER:
                    errors.append({
                        "transaction_id": txn_id,
                        "error": "Cannot reassign - transaction already posted to ledger"
                    })
                    failed_count += 1
                    continue

                # Store old assignment for logging
                old_driver_id = transaction.driver_id
                old_lease_id = transaction.lease_id

                # Reassign to new driver/lease
                updates = {
                    "driver_id": new_driver_id,
                    "lease_id": new_lease_id,
                    "medallion_id": new_medallion_id or new_lease.medallion_id,
                    "vehicle_id": new_vehicle_id or new_lease.vehicle_id,
                    "status": EZPassTransactionStatus.ASSOCIATED,
                    "failure_reason": None
                }

                self.repo.update_transaction(transaction.id, updates)
                success_count += 1
                logger.info(
                    f"Transaction {transaction.transaction_id} reassigned from "
                    f"driver {old_driver_id}/lease {old_lease_id} to "
                    f"driver {new_driver_id}/lease {new_lease_id}"
                )

            except Exception as e:
                errors.append({
                    "transaction_id": txn_id,
                    "error": str(e)
                })
                failed_count += 1
                logger.error(f"Failed to reassign transaction {txn_id}: {e}", exc_info=True)

        self.db.commit()

        return {
            "success_count": success_count,
            "failed_count": failed_count,
            "errors": errors,
            "message": f"Successfully reassigned {success_count} transactions, {failed_count} failed"
        }
    
    def retry_failed_associations(self, transaction_ids: Optional[List[int]] = None) -> dict:
        """
        Retry automatic association logic for failed or specific transactions.
        This uses the SAME association logic as the initial automatic process.
        
        If transaction_ids provided: Only retry those specific transactions
        If transaction_ids is None: Retry ALL ASSOCIATION_FAILED transactions
        
        Business Logic (same as automatic association):
        1. Extract plate number from tag_or_plate
        2. Find Vehicle via plate number
        3. Find CURB trip on that vehicle ±30 minutes of toll time
        4. If found: Associate driver_id, lease_id, medallion_id from CURB trip
        5. Update status to ASSOCIATED or ASSOCIATION_FAILED
        """
        logger.info(f"Retrying association for transactions: {transaction_ids or 'all failed'}")
        
        # Get transactions to retry
        if transaction_ids:
            # Retry specific transactions
            transactions_to_process = [
                self.repo.get_transaction_by_id(txn_id) 
                for txn_id in transaction_ids
            ]
            transactions_to_process = [t for t in transactions_to_process if t is not None]
        else:
            # Retry all ASSOCIATION_FAILED transactions
            transactions_to_process = self.repo.get_transactions_by_status(
                EZPassTransactionStatus.ASSOCIATION_FAILED
            )
        
        if not transactions_to_process:
            return {
                "processed": 0,
                "successful": 0,
                "failed": 0,
                "message": "No transactions to retry association"
            }
        
        successful_count = 0
        failed_count = 0
        
        for trans in transactions_to_process:
            updates = {"status": EZPassTransactionStatus.ASSOCIATION_FAILED}
            try:
                # 1. Find the vehicle using the plate number (same logic as automatic)
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
                    raise AssociationError(
                        trans.transaction_id, 
                        f"No active CURB trip found for vehicle {vehicle.id} around {trans.transaction_datetime}"
                    )
                
                # SUCCESS - Associate with driver/lease from CURB trip
                updates["driver_id"] = curb_trip.driver_id
                updates["lease_id"] = curb_trip.lease_id
                updates["medallion_id"] = curb_trip.medallion_id
                updates["status"] = EZPassTransactionStatus.ASSOCIATED
                updates["failure_reason"] = None
                successful_count += 1
                
            except AssociationError as e:
                updates["failure_reason"] = e.reason
                failed_count += 1
                logger.warning(f"Association retry failed for transaction {trans.transaction_id}: {e.reason}")

            except Exception as e:
                updates["failure_reason"] = f"Unexpected error during retry: {str(e)}"
                failed_count += 1
                logger.error(f"Unexpected error retrying transaction {trans.transaction_id}: {e}", exc_info=True)

            finally:
                self.repo.update_transaction(trans.id, updates)
        
        self.db.commit()
        logger.info(
            f"Association retry finished. Processed: {len(transactions_to_process)}, "
            f"Successful: {successful_count}, Failed: {failed_count}"
        )
        
        # If successful associations exist, trigger posting task
        if successful_count > 0:
            from app.ezpass.services import post_ezpass_tolls_to_ledger_task
            post_ezpass_tolls_to_ledger_task.delay()
        
        return {
            "processed": len(transactions_to_process),
            "successful": successful_count,
            "failed": failed_count,
            "message": f"Retried {len(transactions_to_process)} transactions: {successful_count} succeeded, {failed_count} failed"
        }


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


