### app/pvb/services.py

import csv
import io
from datetime import date, datetime, time, timedelta
from decimal import Decimal
from typing import Dict, List, Optional

from celery import shared_task
from sqlalchemy.orm import Session

from app.core.db import SessionLocal
from app.curb.models import CurbTrip
from app.ledger.models import PostingCategory
from app.ledger.services import LedgerService
from app.pvb.exceptions import (
    PVBAssociationError,
    PVBCSVParseError,
    PVBError,
    PVBImportInProgressError,
    PVBLedgerPostingError,
    PVBValidationError,
)
from app.pvb.models import (
    PVBImport,
    PVBImportStatus,
    PVBSource,
    PVBViolation,
    PVBViolationStatus,
)
from app.pvb.repository import PVBRepository
from app.utils.general import parse_custom_time
from app.utils.logger import get_logger
from app.vehicles.models import VehicleRegistration

logger = get_logger(__name__)

# In-memory flag to prevent concurrent imports. A distributed lock (Redis) is recommended for multi-worker environments.
IMPORT_IN_PROGRESS_FLAG = False


class PVBService:
    """
    Service layer for PVB violations, handling CSV imports, manual creation,
    association logic, and ledger posting.
    """

    def __init__(self, db: Session):
        self.db = db
        self.repo = PVBRepository(db)

    def process_uploaded_csv(
        self, file_stream: io.BytesIO, file_name: str, user_id: int
    ):
        """
        Parses an uploaded PVB CSV, creates an import record, saves raw transaction
        data, and triggers the asynchronous association task.
        """
        global IMPORT_IN_PROGRESS_FLAG
        if IMPORT_IN_PROGRESS_FLAG:
            raise PVBImportInProgressError()

        IMPORT_IN_PROGRESS_FLAG = True
        import_record = None
        try:
            logger.info(f"Starting PVB CSV import for file: {file_name}")
            content = file_stream.read().decode(
                "utf-8-sig"
            )  # Use utf-8-sig to handle potential BOM
            csv_reader = csv.reader(io.StringIO(content))
            header = next(csv_reader)
            rows = list(csv_reader)

            if not rows:
                logger.warning(f"PVB CSV file '{file_name}' is empty.")
                return {"message": "File is empty, no violations were imported."}

            import_record = self.repo.create_import_record(file_name, len(rows))

            violations_to_insert = []
            failed_rows_count = 0

            for i, row in enumerate(rows):
                try:
                    if len(row) < 29:
                        raise ValueError(
                            f"Expected at least 29 columns, but got {len(row)}"
                        )

                    issue_date_str = row[6].strip() if row[6] else None
                    issue_time_str = row[7].strip() if row[7] else None

                    issue_time_str = parse_custom_time(issue_time_str)

                    try:
                        issue_date = datetime.strptime(issue_date_str, "%m/%d/%Y").date()
                    except ValueError:
                        issue_date = datetime.strptime(issue_date_str, "%m/%d/%y").date()
                        
                    issue_time = issue_time_str if issue_time_str else None

                    violation_data = {
                        "import_id": import_record.id,
                        "source": PVBSource.CSV_IMPORT,
                        "plate": row[0],
                        "state": row[1],
                        "type": row[2],
                        "summons": row[4],
                        "issue_date": issue_date,
                        "issue_time": issue_time,
                        "fine": Decimal(row[14] or "0"),
                        "penalty": Decimal(row[15] or "0"),
                        "interest": Decimal(row[16] or "0"),
                        "reduction": Decimal(row[17] or "0"),
                        "amount_due": Decimal(row[20] or "0"),
                        "created_by": user_id,
                        "status": PVBViolationStatus.IMPORTED,
                    }
                    violations_to_insert.append(violation_data)
                except (ValueError, IndexError) as e:
                    logger.warning(
                        f"Skipping malformed row {i + 2} in {file_name}: {e}. Data: {row}"
                    )
                    failed_rows_count += 1

            self.repo.bulk_insert_violations(violations_to_insert)
            self.repo.update_import_record_status(
                import_id=import_record.id,
                status=PVBImportStatus.COMPLETED,
                successful=len(violations_to_insert),
                failed=failed_rows_count,
            )
            self.db.commit()

            logger.info(
                f"Imported {len(violations_to_insert)} records from {file_name}. Triggering association task."
            )
            self.associate_violations()

            return {
                "message": "File uploaded and import process initiated.",
                "import_id": import_record.id,
                "total_rows": len(rows),
                "imported_records": len(violations_to_insert),
                "failed_rows": failed_rows_count,
            }
        except Exception as e:
            self.db.rollback()
            logger.error(
                f"Fatal error during PVB CSV processing for {file_name}: {e}",
                exc_info=True,
            )
            if import_record:
                self.repo.update_import_record_status(
                    import_record.id,
                    PVBImportStatus.FAILED,
                    0,
                    len(rows) if "rows" in locals() else 0,
                )
                self.db.commit()
            raise PVBError(f"Could not process PVB file: {e}") from e
        finally:
            IMPORT_IN_PROGRESS_FLAG = False

    def associate_violations(self):
        """
        Background task logic to associate imported PVB violations with drivers/leases
        by cross-referencing vehicle and CURB trip data.
        """
        logger.info("Starting PVB violation association task.")
        violations_to_process = self.repo.get_violations_by_status(
            PVBViolationStatus.IMPORTED
        )

        successful_count, failed_count = 0, 0

        for violation in violations_to_process:
            updates = {"status": PVBViolationStatus.ASSOCIATION_FAILED}
            try:
                # 1. Find Vehicle by Plate
                vehicle_reg = (
                    self.db.query(VehicleRegistration)
                    .filter(
                        VehicleRegistration.plate_number.ilike(f"%{violation.plate}%")
                    )
                    .first()
                )
                if not vehicle_reg or not vehicle_reg.vehicle:
                    raise PVBAssociationError(
                        violation.summons,
                        f"No vehicle found for plate '{violation.plate}'",
                    )

                vehicle = vehicle_reg.vehicle
                updates["vehicle_id"] = vehicle.id

                # 2. Find CURB trip to identify Driver and Lease
                violation_datetime = datetime.combine(
                    violation.issue_date, violation.issue_time or time.min
                )
                time_buffer = timedelta(hours=2)  # A wider buffer for violations
                trip_start = violation_datetime - time_buffer
                trip_end = violation_datetime + time_buffer

                curb_trip = (
                    self.db.query(CurbTrip)
                    .filter(
                        CurbTrip.vehicle_id == vehicle.id,
                        CurbTrip.start_time <= trip_end,
                        CurbTrip.end_time >= trip_start,
                    )
                    .order_by(CurbTrip.start_time.desc())
                    .first()
                )

                if not curb_trip or not curb_trip.driver_id:
                    raise PVBAssociationError(
                        violation.summons,
                        f"No active CURB trip found for vehicle {vehicle.id} around {violation_datetime}",
                    )

                updates.update(
                    {
                        "driver_id": curb_trip.driver_id,
                        "lease_id": curb_trip.lease_id,
                        "medallion_id": curb_trip.medallion_id,
                        "status": PVBViolationStatus.ASSOCIATED,
                        "failure_reason": None,
                    }
                )
                successful_count += 1

            except PVBAssociationError as e:
                updates["failure_reason"] = e.reason
                failed_count += 1
                logger.warning(
                    f"Association failed for summons {violation.summons}: {e.reason}"
                )
            except Exception as e:
                updates["failure_reason"] = f"An unexpected error occurred: {str(e)}"
                failed_count += 1
                logger.error(
                    f"Error associating summons {violation.summons}: {e}", exc_info=True
                )
            finally:
                self.repo.update_violation(violation.id, updates)

        self.db.commit()
        logger.info(
            f"Association task finished. Processed: {len(violations_to_process)}, Successful: {successful_count}, Failed: {failed_count}"
        )

        if successful_count > 0:
            post_pvb_violations_to_ledger_task.delay()

        return {
            "processed": len(violations_to_process),
            "successful": successful_count,
            "failed": failed_count,
        }

    def post_violations_to_ledger(self, ledger_service: LedgerService):
        """
        Posts successfully associated PVB violations to the Centralized Ledger.
        """
        logger.info("Starting task to post PVB violations to ledger.")
        violations_to_post = self.repo.get_violations_by_status(
            PVBViolationStatus.ASSOCIATED
        )

        posted_count, failed_count = 0, 0

        for violation in violations_to_post:
            updates = {"status": PVBViolationStatus.POSTING_FAILED}
            try:
                if not all(
                    [violation.driver_id, violation.lease_id, violation.amount_due > 0]
                ):
                    raise PVBLedgerPostingError(
                        violation.summons,
                        "Missing required driver, lease, or positive amount due.",
                    )

                ledger_service.create_obligation(
                    category=PostingCategory.PVB,
                    amount=violation.amount_due,
                    reference_id=violation.summons,
                    driver_id=violation.driver_id,
                    lease_id=violation.lease_id,
                    vehicle_id=violation.vehicle_id,
                    medallion_id=violation.medallion_id,
                )

                updates.update(
                    {
                        "status": PVBViolationStatus.POSTED_TO_LEDGER,
                        "failure_reason": None,
                        "posting_date": datetime.utcnow(),
                    }
                )
                posted_count += 1
            except Exception as e:
                updates["failure_reason"] = f"Ledger service error: {str(e)}"
                failed_count += 1
                logger.error(
                    f"Failed to post PVB summons {violation.summons} to ledger: {e}",
                    exc_info=True,
                )
            finally:
                self.repo.update_violation(violation.id, updates)

        self.db.commit()
        logger.info(
            f"Ledger posting for PVB finished. Posted: {posted_count}, Failed: {failed_count}"
        )
        return {"posted": posted_count, "failed": failed_count}

    def create_manual_violation(
        self, case_no: str, violation_data: dict, user_id: int
    ) -> PVBViolation:
        """
        Creates a PVB violation from the manual entry (BPM) workflow.
        """
        try:
            summons = violation_data.get("summons")
            if not summons:
                raise PVBValidationError("Summons number is required.")

            if self.repo.get_violation_by_summons(summons):
                raise PVBValidationError(
                    f"A violation with summons number '{summons}' already exists."
                )

            new_violation = PVBViolation(
                source=PVBSource.MANUAL_ENTRY,
                case_no=case_no,
                created_by=user_id,
                **violation_data,
            )
            self.db.add(new_violation)
            self.db.flush()  # Let the service commit

            logger.info(
                f"Manual PVB violation created with summons {summons} for case {case_no}."
            )
            return new_violation
        except Exception as e:
            logger.error(f"Error creating manual PVB violation: {e}", exc_info=True)
            raise


# --- Celery Tasks ---


@shared_task(name="pvb.associate_violations")
def associate_pvb_violations_task():
    """Background task to associate imported PVB violations."""
    logger.info("Executing Celery task: associate_pvb_violations_task")
    db: Session = SessionLocal()
    try:
        service = PVBService(db)
        result = service.associate_violations()
        return result
    except Exception as e:
        logger.error(
            f"Celery task associate_pvb_violations_task failed: {e}", exc_info=True
        )
        db.rollback()
        raise
    finally:
        db.close()


@shared_task(name="pvb.post_violations_to_ledger")
def post_pvb_violations_to_ledger_task():
    """Background task to post associated PVB violations to the ledger."""
    logger.info("Executing Celery task: post_pvb_violations_to_ledger_task")
    db: Session = SessionLocal()
    try:
        ledger_service = LedgerService(db)
        pvb_service = PVBService(db)
        result = pvb_service.post_violations_to_ledger(ledger_service)
        return result
    except Exception as e:
        logger.error(
            f"Celery task post_pvb_violations_to_ledger_task failed: {e}", exc_info=True
        )
        db.rollback()
        raise
    finally:
        db.close()
