### app/repairs/services.py

from datetime import datetime, timedelta , date
from decimal import Decimal

from sqlalchemy.orm import Session

from app.bpm.services import bpm_service
from app.core.db import SessionLocal
from app.ledger.models import PostingCategory
from app.ledger.services import LedgerService
from app.repairs.exceptions import (
    InvalidRepairOperationError,
    PaymentScheduleGenerationError,
)
from app.repairs.models import (
    RepairInstallment,
    RepairInstallmentStatus,
    RepairInvoice,
    RepairInvoiceStatus,
    WorkshopType,
)
from app.repairs.repository import RepairRepository
from app.utils.logger import get_logger

logger = get_logger(__name__)

REPAYMENT_MATRIX = [
    {"min": 0, "max": 200, "installment": "full"},
    {"min": 201, "max": 500, "installment": 100},
    {"min": 501, "max": 1000, "installment": 200},
    {"min": 1001, "max": 3000, "installment": 250},
    {"min": 3001, "max": float('inf'), "installment": 300},
]

class RepairService:
    """
    Service layer for managing the lifecycle of vehicle repair invoices and their
    integration with the Centralized Ledger.
    """
    def __init__(self, db: Session):
        self.db = db
        self.repo = RepairRepository(db)

    def _generate_next_repair_id(self) -> str:
        """Generates a new, unique Repair ID in the format RPR-YYYY-#####."""
        current_year = datetime.utcnow().year
        last_id_record = self.repo.get_last_repair_id_for_year(current_year)
        
        sequence = 1
        if last_id_record:
            last_sequence = int(last_id_record[0].split('-')[-1])
            sequence = last_sequence + 1
            
        return f"RPR-{current_year}-{str(sequence).zfill(5)}"

    def _get_weekly_principal(self, total_amount: Decimal) -> Decimal:
        """Determines the weekly installment amount based on the repayment matrix."""
        for rule in REPAYMENT_MATRIX:
            if rule["min"] <= total_amount <= rule["max"]:
                if rule["installment"] == "full":
                    return total_amount
                return Decimal(str(rule["installment"]))
        return Decimal("300") # Default for amounts over the max defined

    def create_repair_invoice(self, case_no: str, invoice_data: dict, user_id: int) -> RepairInvoice:
        """
        Creates a new Repair Invoice, generates its payment schedule, and moves it to OPEN status.
        This is the main entry point from the BPM flow.
        """
        try:
            # 1. Generate unique Repair ID
            repair_id = self._generate_next_repair_id()

            # 2. Create the master invoice record in DRAFT status
            new_invoice = RepairInvoice(
                repair_id=repair_id,
                invoice_number=invoice_data["invoice_number"],
                invoice_date=invoice_data["invoice_date"],
                driver_id=invoice_data["driver_id"],
                lease_id=invoice_data["lease_id"],
                vehicle_id=invoice_data["vehicle_id"],
                medallion_id=invoice_data["medallion_id"],
                workshop_type=WorkshopType(invoice_data["workshop_type"]),
                description=invoice_data.get("notes"),
                total_amount=Decimal(invoice_data["total_amount"]),
                start_week=invoice_data["start_week"],
                status=RepairInvoiceStatus.DRAFT,
                created_by=user_id,
            )
            self.repo.create_invoice(new_invoice)

            # 3. Generate the payment schedule
            self.generate_payment_schedule(new_invoice)

            # 4. Finalize invoice status to OPEN
            new_invoice.status = RepairInvoiceStatus.OPEN
            self.db.flush()

            # 5. Link invoice to the BPM case
            bpm_service.create_case_entity(
                self.db, case_no, "repair_invoice", "id", str(new_invoice.id)
            )
            
            self.db.commit()
            logger.info(f"Successfully created and opened Repair Invoice {repair_id}.")
            return new_invoice
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to create repair invoice: {e}", exc_info=True)
            raise InvalidRepairOperationError(f"Could not create repair invoice: {e}") from e

    def generate_payment_schedule(self, invoice: RepairInvoice):
        """
        Calculates and stores the weekly installment schedule for a given invoice.
        """
        try:
            total_amount = invoice.total_amount
            if total_amount <= 0:
                raise PaymentScheduleGenerationError("Total amount must be positive.")

            weekly_principal = self._get_weekly_principal(total_amount)
            
            remaining_balance = total_amount
            current_start_date = invoice.start_week
            installments = []
            seq = 1

            while remaining_balance > 0:
                installment_amount = min(weekly_principal, remaining_balance)
                
                installment = RepairInstallment(
                    invoice_id=invoice.id,
                    installment_id=f"{invoice.repair_id}-{str(seq).zfill(2)}",
                    week_start_date=current_start_date,
                    week_end_date=current_start_date + timedelta(days=6),
                    principal_amount=installment_amount,
                    status=RepairInstallmentStatus.SCHEDULED,
                )
                installments.append(installment)

                remaining_balance -= installment_amount
                current_start_date += timedelta(weeks=1)
                seq += 1

            self.repo.bulk_insert_installments(installments)
            self.db.flush()
            logger.info(f"Generated {len(installments)} installments for Repair ID {invoice.repair_id}.")
        except Exception as e:
            logger.error(f"Error generating payment schedule for {invoice.repair_id}: {e}", exc_info=True)
            raise PaymentScheduleGenerationError(f"Could not generate payment schedule: {e}")

    def post_due_installments_to_ledger(self):
        """
        Finds all due repair installments and posts them as obligations to the ledger.
        This is designed to be called by a scheduled Celery task.
        """
        logger.info("Starting task to post due repair installments to ledger.")
        db = SessionLocal()
        ledger_service = LedgerService(db)
        repo = RepairRepository(db)
        
        posted_count, failed_count = 0, 0
        try:
            # Post for today's date to catch all due installments
            installments_to_post = repo.get_due_installments_to_post(datetime.utcnow().date())

            if not installments_to_post:
                logger.info("No due repair installments to post.")
                return {"posted": 0, "failed": 0}

            for installment in installments_to_post:
                try:
                    ledger_service.create_obligation(
                        category=PostingCategory.REPAIR,
                        amount=installment.principal_amount,
                        reference_id=installment.installment_id,
                        driver_id=installment.invoice.driver_id,
                        lease_id=installment.invoice.lease_id,
                        vehicle_id=installment.invoice.vehicle_id,
                        medallion_id=installment.invoice.medallion_id,
                    )
                    
                    repo.update_installment(installment.id, {
                        "status": RepairInstallmentStatus.POSTED,
                        "posted_on": datetime.utcnow()
                    })
                    posted_count += 1
                except Exception as e:
                    failed_count += 1
                    reason = f"Ledger service error: {str(e)}"
                    repo.update_installment(installment.id, {"status": RepairInstallmentStatus.POSTED, "failure_reason": reason})
                    logger.error(f"Failed to post installment {installment.installment_id} to ledger: {e}", exc_info=True)

            db.commit()
            logger.info(f"Repair installment posting task finished. Posted: {posted_count}, Failed: {failed_count}")
            return {"posted": posted_count, "failed": failed_count}
        except Exception as e:
            db.rollback()
            logger.error(f"Fatal error in post_due_installments_to_ledger: {e}", exc_info=True)
            raise
        finally:
            db.close()

    def get_repair_invoice(self,
                           lookup_id: int = None,
                           repair_id: int = None,
                           vehicle_id: int = None,
                           lease_id: int = None,
                           driver_id: int = None,
                           medallion_id: int = None,
                           invoice_number: str = None,
                           invoice_date: date = None,
                           sort_by: str = None,
                           sort_order: str = None,
                           multiple: bool = False               
                           ) -> RepairInvoice:
        
        """
        Retrieves a Repair Invoice based on various identifiers.
        """

        try:
            query = self.db.query(RepairInvoice)

            if lookup_id:
                query = query.filter(RepairInvoice.id == lookup_id)
            if repair_id:
                query = query.filter(RepairInvoice.repair_id == repair_id)
            if vehicle_id:
                query = query.filter(RepairInvoice.vehicle_id == vehicle_id)
            if lease_id:
                query = query.filter(RepairInvoice.lease_id == lease_id)
            if driver_id:
                query = query.filter(RepairInvoice.driver_id == driver_id)
            if medallion_id:
                query = query.filter(RepairInvoice.medallion_id == medallion_id)
            if invoice_number:
                query = query.filter(RepairInvoice.invoice_number == invoice_number)
            if invoice_date:
                query = query.filter(RepairInvoice.invoice_date == invoice_date)

            if sort_by:
                sort_column = getattr(RepairInvoice, sort_by, None)
                if sort_column is not None:
                    if sort_order and sort_order.lower() == "desc":
                        query = query.order_by(sort_column.desc())
                    else:
                        query = query.order_by(sort_column.asc())
            else:
                query = query.order_by(RepairInvoice.created_on.desc())
            
            if multiple:
                invoices = query.all()
                return invoices
            
            invoice = query.first()
            return invoice
        except Exception as e:
            logger.error(f"Error retrieving repair invoice: {e}", exc_info=True)
            raise InvalidRepairOperationError(f"Could not retrieve repair invoice: {e}") from e