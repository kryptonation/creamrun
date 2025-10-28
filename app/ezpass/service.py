"""
app/ezpass/service.py

Service layer for EZPass business logic
Handles CSV import, CURB trip matching, and ledger posting
"""

import json
import csv
from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import List, Optional, Tuple, Dict, Any
import traceback
from io import StringIO

from sqlalchemy.orm import Session
from sqlalchemy import and_, func

from app.ezpass.models import (
    EZPassTransaction, EZPassImportHistory,
    MappingMethod, ImportStatus, PostingStatus, ResolutionStatus
)
from app.ezpass.repository import (
    EZPassTransactionRepository, EZPassImportHistoryRepository
)
from app.ezpass.exceptions import (
    EZPassImportError, EZPassMappingError, EZPassPostingError
)

# Import existing models
from app.drivers.models import Driver, TLCLicense
from app.vehicles.models import Vehicle
from app.medallions.models import Medallion
from app.leases.models import Lease
from app.curb.models import CurbTrip

# Import ledger service
from app.ledger.service import LedgerService
from app.ledger.models import PostingType, PostingCategory

from app.utils.logger import get_logger

logger = get_logger(__name__)


class EZPassImportService:
    """
    Service for EZPass CSV import and processing
    Orchestrates import, matching, and ledger posting
    """
    
    def __init__(self, db: Session):
        self.db = db
        self.transaction_repo = EZPassTransactionRepository(db)
        self.history_repo = EZPassImportHistoryRepository(db)
        self.ledger_service = LedgerService(db)
    
    def import_csv_file(
        self,
        csv_content: str,
        file_name: str,
        perform_matching: bool = True,
        post_to_ledger: bool = True,
        auto_match_threshold: Decimal = Decimal('0.90'),
        triggered_by: str = "API",
        triggered_by_user_id: Optional[int] = None
    ) -> Tuple[EZPassImportHistory, List[str]]:
        """
        Main CSV import orchestration method
        
        Args:
            csv_content: CSV file content as string
            file_name: Original filename
            perform_matching: Whether to match with CURB trips
            post_to_ledger: Whether to post to ledger
            auto_match_threshold: Minimum confidence for auto-matching (0.00-1.00)
            triggered_by: API, CELERY, or MANUAL
            triggered_by_user_id: User who triggered import
            
        Returns:
            Tuple of (import_history, error_messages)
        """
        # Generate batch ID
        batch_id = f"EZPASS-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
        
        # Create import history record
        import_history = EZPassImportHistory(
            batch_id=batch_id,
            import_type='CSV_UPLOAD',
            file_name=file_name,
            status=ImportStatus.IN_PROGRESS,
            total_rows_in_file=0,
            triggered_by=triggered_by,
            triggered_by_user_id=triggered_by_user_id,
            started_at=datetime.utcnow()
        )
        import_history = self.history_repo.create(import_history)
        self.db.commit()
        
        errors = []
        transactions_imported = []
        
        try:
            # Parse CSV
            csv_reader = csv.DictReader(StringIO(csv_content))
            rows = list(csv_reader)
            import_history.total_rows_in_file = len(rows)
            
            logger.info(f"Starting EZPass import: batch={batch_id}, rows={len(rows)}")
            
            # Process each row
            for idx, row in enumerate(rows, start=1):
                try:
                    transaction = self._process_csv_row(
                        row=row,
                        batch_id=batch_id,
                        perform_matching=perform_matching,
                        auto_match_threshold=auto_match_threshold
                    )
                    
                    if transaction:
                        transactions_imported.append(transaction)
                        
                except Exception as e:
                    error_msg = f"Row {idx}: {str(e)}"
                    errors.append(error_msg)
                    logger.warning(f"Error processing row {idx}: {e}")
            
            # Update statistics
            import_history.total_transactions_imported = len(transactions_imported)
            import_history.total_duplicates_skipped = len(rows) - len(transactions_imported) - len(errors)
            import_history.total_errors = len(errors)
            
            # Count by mapping method
            auto_matched = sum(1 for t in transactions_imported 
                             if t.mapping_method == MappingMethod.AUTO_CURB_MATCH)
            unmapped = sum(1 for t in transactions_imported 
                          if t.mapping_method == MappingMethod.UNKNOWN)
            manual_review = len(transactions_imported) - auto_matched - unmapped
            
            import_history.total_auto_matched = auto_matched
            import_history.total_unmapped = unmapped
            import_history.total_manual_review = manual_review
            
            # Post to ledger if requested
            if post_to_ledger:
                posted_count = 0
                posting_failures = 0
                
                for transaction in transactions_imported:
                    if transaction.driver_id and transaction.lease_id:
                        try:
                            self._post_transaction_to_ledger(transaction)
                            posted_count += 1
                        except Exception as e:
                            posting_failures += 1
                            error_msg = f"Posting failed for ticket {transaction.ticket_number}: {str(e)}"
                            errors.append(error_msg)
                            logger.error(error_msg)
                
                import_history.total_posted_to_ledger = posted_count
                import_history.total_posting_failures = posting_failures
            
            # Finalize import
            import_history.completed_at = datetime.utcnow()
            import_history.duration_seconds = int(
                (import_history.completed_at - import_history.started_at).total_seconds()
            )
            
            if errors:
                import_history.status = ImportStatus.COMPLETED_WITH_ERRORS
                import_history.error_log = json.dumps(errors[:100])  # Store first 100 errors
            else:
                import_history.status = ImportStatus.COMPLETED
            
            import_history.summary = (
                f"Imported {import_history.total_transactions_imported} transactions. "
                f"Auto-matched: {import_history.total_auto_matched}, "
                f"Unmapped: {import_history.total_unmapped}, "
                f"Posted to ledger: {import_history.total_posted_to_ledger}"
            )
            
            self.db.commit()
            
            logger.info(
                f"EZPass import completed: batch={batch_id}, "
                f"status={import_history.status.value}, "
                f"imported={import_history.total_transactions_imported}, "
                f"posted={import_history.total_posted_to_ledger}"
            )
            
            return import_history, errors
            
        except Exception as e:
            self.db.rollback()
            import_history.status = ImportStatus.FAILED
            import_history.completed_at = datetime.utcnow()
            import_history.error_log = json.dumps([str(e), traceback.format_exc()])
            self.db.commit()
            
            logger.error(f"EZPass import failed: batch={batch_id}, error={str(e)}")
            raise EZPassImportError(f"Import failed: {str(e)}")
    
    def _process_csv_row(
        self,
        row: Dict[str, Any],
        batch_id: str,
        perform_matching: bool,
        auto_match_threshold: Decimal
    ) -> Optional[EZPassTransaction]:
        """
        Process a single CSV row
        
        CSV Format:
        POSTING DATE, TRANSACTION DATE, TAG/PLATE NUMBER, AGENCY, ACTIVITY,
        PLAZA ID, ENTRY TIME, ENTRY PLAZA, ENTRY LANE, EXIT TIME, EXIT PLAZA,
        EXIT LANE, VEHICLE TYPE CODE, AMOUNT, PREPAID, PLAN/RATE, FARE TYPE, BALANCE
        """
        # Extract ticket number (use combination if not provided)
        ticket_number = row.get('TICKET NUMBER') or row.get('TAG/PLATE NUMBER')
        if not ticket_number:
            # Generate from plate + date + time
            plate = row.get('TAG/PLATE NUMBER', 'UNKNOWN')
            trans_date = row.get('TRANSACTION DATE', 'UNKNOWN')
            trans_time = row.get('ENTRY TIME', '00:00:00')
            ticket_number = f"{plate}-{trans_date}-{trans_time}".replace('/', '').replace(' ', '')
        
        # Check for duplicate
        if self.transaction_repo.exists_by_ticket_number(ticket_number):
            logger.debug(f"Skipping duplicate ticket: {ticket_number}")
            return None
        
        # Parse dates
        posting_date = self._parse_date(row.get('POSTING DATE'))
        transaction_date = self._parse_date(row.get('TRANSACTION DATE'))
        
        if not transaction_date:
            raise EZPassImportError(f"Invalid transaction date for ticket {ticket_number}")
        
        # Parse time and create datetime
        transaction_time = row.get('ENTRY TIME') or row.get('EXIT TIME')
        transaction_datetime = None
        if transaction_time:
            try:
                transaction_datetime = datetime.combine(
                    transaction_date,
                    datetime.strptime(transaction_time, '%H:%M:%S').time()
                )
            except:
                transaction_datetime = datetime.combine(transaction_date, datetime.min.time())
        
        # Parse amount
        amount_str = row.get('AMOUNT', '0')
        if isinstance(amount_str, str):
            amount_str = amount_str.replace('$', '').replace(',', '').strip()
        toll_amount = Decimal(amount_str) if amount_str else Decimal('0.00')
        
        # Get plate number
        plate_number = row.get('TAG/PLATE NUMBER', '').strip()
        if not plate_number:
            raise EZPassImportError(f"Missing plate number for ticket {ticket_number}")
        
        # Calculate payment period (Sunday to Saturday)
        period_start, period_end = self._get_payment_period(transaction_date)
        
        # Create transaction
        transaction = EZPassTransaction(
            ticket_number=ticket_number,
            transaction_id=row.get('TRANSACTION ID'),
            posting_date=posting_date or transaction_date,
            transaction_date=transaction_date,
            transaction_time=transaction_time,
            transaction_datetime=transaction_datetime,
            plate_number=plate_number,
            toll_amount=toll_amount,
            agency=row.get('AGENCY'),
            activity=row.get('ACTIVITY'),
            plaza_id=row.get('PLAZA ID'),
            entry_time=row.get('ENTRY TIME'),
            entry_plaza=row.get('ENTRY PLAZA'),
            entry_lane=row.get('ENTRY LANE'),
            exit_time=row.get('EXIT TIME'),
            exit_plaza=row.get('EXIT PLAZA'),
            exit_lane=row.get('EXIT LANE'),
            vehicle_type_code=row.get('VEHICLE TYPE CODE'),
            prepaid=row.get('PREPAID'),
            plan_rate=row.get('PLAN/RATE'),
            fare_type=row.get('FARE TYPE'),
            balance=self._parse_decimal(row.get('BALANCE')),
            payment_period_start=period_start,
            payment_period_end=period_end,
            import_batch_id=batch_id,
            imported_on=datetime.utcnow(),
            mapping_method=MappingMethod.UNKNOWN,
            posting_status=PostingStatus.NOT_POSTED,
            resolution_status=ResolutionStatus.UNRESOLVED
        )
        
        # Perform matching if requested
        if perform_matching:
            self._match_transaction_to_entities(transaction, auto_match_threshold)
        
        # Save transaction
        transaction = self.transaction_repo.create(transaction)
        
        return transaction
    
    def _match_transaction_to_entities(
        self,
        transaction: EZPassTransaction,
        auto_match_threshold: Decimal = Decimal('0.90')
    ):
        """
        Match EZPass transaction to driver/lease via CURB trip correlation
        
        Matching Strategy:
        1. Find vehicle by plate number
        2. Find CURB trips for that vehicle within time window (±30 min)
        3. Score each potential match
        4. If confidence >= threshold, auto-assign
        5. Otherwise mark for manual review
        """
        # Step 1: Find vehicle by plate
        vehicle = self.db.query(Vehicle).filter(
            Vehicle.plate_number == transaction.plate_number
        ).first()
        
        if not vehicle:
            transaction.mapping_notes = f"Vehicle not found for plate: {transaction.plate_number}"
            logger.debug(transaction.mapping_notes)
            return
        
        transaction.vehicle_id = vehicle.id
        
        # Step 2: Find potential CURB trips within time window
        if not transaction.transaction_datetime:
            transaction.mapping_notes = "No transaction datetime available for matching"
            return
        
        time_window_start = transaction.transaction_datetime - timedelta(minutes=30)
        time_window_end = transaction.transaction_datetime + timedelta(minutes=30)
        
        potential_trips = self.db.query(CurbTrip).filter(
            and_(
                CurbTrip.vehicle_id == vehicle.id,
                CurbTrip.start_datetime <= time_window_end,
                CurbTrip.end_datetime >= time_window_start
            )
        ).all()
        
        if not potential_trips:
            transaction.mapping_notes = (
                f"No CURB trips found for vehicle {vehicle.id} "
                f"within ±30 min of {transaction.transaction_datetime}"
            )
            logger.debug(transaction.mapping_notes)
            return
        
        # Step 3: Score each potential match
        best_match = None
        best_score = Decimal('0.00')
        
        for trip in potential_trips:
            score = self._calculate_match_confidence(transaction, trip)
            if score > best_score:
                best_score = score
                best_match = trip
        
        # Step 4: Assign based on confidence
        if best_match and best_score >= auto_match_threshold:
            transaction.driver_id = best_match.driver_id
            transaction.lease_id = best_match.lease_id
            transaction.medallion_id = best_match.medallion_id
            transaction.hack_license_number = best_match.hack_license_number
            transaction.matched_trip_id = best_match.record_id
            transaction.mapping_method = MappingMethod.AUTO_CURB_MATCH
            transaction.mapping_confidence = best_score
            transaction.mapping_notes = (
                f"Auto-matched to CURB trip {best_match.record_id} "
                f"with confidence {best_score}"
            )
            logger.info(
                f"EZPass ticket {transaction.ticket_number} auto-matched "
                f"to driver {transaction.driver_id} with confidence {best_score}"
            )
        else:
            transaction.mapping_confidence = best_score if best_match else Decimal('0.00')
            transaction.mapping_notes = (
                f"Best match confidence {best_score} below threshold {auto_match_threshold}. "
                f"Requires manual review."
            )
            logger.info(
                f"EZPass ticket {transaction.ticket_number} requires manual review "
                f"(confidence: {best_score})"
            )
    
    def _calculate_match_confidence(
        self,
        transaction: EZPassTransaction,
        trip: CurbTrip
    ) -> Decimal:
        """
        Calculate confidence score for matching EZPass transaction to CURB trip
        
        Factors:
        - Time proximity (closer = higher score)
        - Driver consistency (same driver for vehicle)
        - Location consistency (plaza near trip route)
        
        Returns score 0.00 to 1.00
        """
        score = Decimal('0.00')
        
        if not transaction.transaction_datetime or not trip.start_datetime:
            return score
        
        # Time proximity score (max 0.70)
        time_diff_minutes = abs(
            (transaction.transaction_datetime - trip.start_datetime).total_seconds() / 60
        )
        
        if time_diff_minutes <= 5:
            time_score = Decimal('0.70')
        elif time_diff_minutes <= 15:
            time_score = Decimal('0.50')
        elif time_diff_minutes <= 30:
            time_score = Decimal('0.30')
        else:
            time_score = Decimal('0.10')
        
        score += time_score
        
        # Vehicle match (max 0.20) - already matched, so guaranteed
        score += Decimal('0.20')
        
        # Date match (max 0.10)
        if transaction.transaction_date == trip.start_datetime.date():
            score += Decimal('0.10')
        
        return min(score, Decimal('1.00'))
    
    def _post_transaction_to_ledger(self, transaction: EZPassTransaction):
        """
        Post EZPass toll to ledger as obligation
        
        Creates:
        - DEBIT posting (obligation)
        - Ledger balance record
        """
        if not transaction.driver_id or not transaction.lease_id:
            raise EZPassPostingError(
                f"Cannot post transaction {transaction.ticket_number}: "
                "missing driver_id or lease_id"
            )
        
        if transaction.posting_status == PostingStatus.POSTED:
            logger.warning(
                f"Transaction {transaction.ticket_number} already posted to ledger"
            )
            return
        
        try:
            # Create obligation in ledger
            balance = self.ledger_service.create_obligation(
                driver_id=transaction.driver_id,
                lease_id=transaction.lease_id,
                vehicle_id=transaction.vehicle_id,
                medallion_id=transaction.medallion_id,
                category=PostingCategory.EZPASS,
                amount=transaction.toll_amount,
                reference_type="EZPASS_TRANSACTION",
                reference_id=str(transaction.id),
                due_date=transaction.payment_period_end,
                payment_period_start=transaction.payment_period_start,
                payment_period_end=transaction.payment_period_end,
                description=f"EZPass toll - {transaction.agency or 'Unknown'} - {transaction.ticket_number}",
                notes=f"Plate: {transaction.plate_number}, Plaza: {transaction.entry_plaza or 'N/A'}",
                created_by=1  # System user
            )
            
            # Update transaction
            transaction.posting_status = PostingStatus.POSTED
            transaction.ledger_balance_id = balance.balance_id
            transaction.posted_on = datetime.utcnow()
            transaction.posting_error = None
            
            logger.info(
                f"Posted EZPass transaction {transaction.ticket_number} to ledger: "
                f"balance_id={balance.balance_id}, amount={transaction.toll_amount}"
            )
            
        except Exception as e:
            transaction.posting_status = PostingStatus.FAILED
            transaction.posting_error = str(e)
            logger.error(
                f"Failed to post EZPass transaction {transaction.ticket_number}: {str(e)}"
            )
            raise EZPassPostingError(f"Ledger posting failed: {str(e)}")
    
    def remap_transaction(
        self,
        transaction_id: int,
        driver_id: Optional[int] = None,
        lease_id: Optional[int] = None,
        medallion_id: Optional[int] = None,
        vehicle_id: Optional[int] = None,
        reason: str = "",
        post_to_ledger: bool = True,
        remapped_by_user_id: Optional[int] = None
    ) -> EZPassTransaction:
        """
        Manually remap EZPass transaction to different entities
        
        Used for:
        - Correcting auto-match errors
        - Assigning unmapped transactions
        - Handling edge cases
        """
        transaction = self.transaction_repo.get_by_id(transaction_id)
        if not transaction:
            raise EZPassMappingError(f"Transaction {transaction_id} not found")
        
        # Store old values for history
        old_driver_id = transaction.driver_id
        old_lease_id = transaction.lease_id
        
        # Update mapping
        if driver_id is not None:
            transaction.driver_id = driver_id
        if lease_id is not None:
            transaction.lease_id = lease_id
        if medallion_id is not None:
            transaction.medallion_id = medallion_id
        if vehicle_id is not None:
            transaction.vehicle_id = vehicle_id
        
        transaction.mapping_method = MappingMethod.MANUAL_ASSIGNMENT
        transaction.mapping_confidence = Decimal('1.00')  # Manual = 100% confident
        transaction.remapped_from_driver_id = old_driver_id
        transaction.remapped_on = datetime.utcnow()
        transaction.remapped_by = remapped_by_user_id
        transaction.remap_reason = reason
        
        # Update mapping notes
        transaction.mapping_notes = (
            f"Manually remapped from driver {old_driver_id} to {driver_id}. "
            f"Reason: {reason}"
        )
        
        # Reset posting status if remapped
        if transaction.posting_status == PostingStatus.POSTED:
            transaction.posting_status = PostingStatus.NOT_POSTED
            transaction.ledger_balance_id = None
            transaction.posted_on = None
        
        self.transaction_repo.update(transaction)
        
        # Post to ledger if requested
        if post_to_ledger and transaction.driver_id and transaction.lease_id:
            try:
                self._post_transaction_to_ledger(transaction)
            except Exception as e:
                logger.error(f"Failed to post remapped transaction: {str(e)}")
        
        self.db.commit()
        
        logger.info(
            f"Remapped EZPass transaction {transaction.ticket_number}: "
            f"driver {old_driver_id} → {driver_id}, lease {old_lease_id} → {lease_id}"
        )
        
        return transaction
    
    def bulk_post_to_ledger(
        self,
        transaction_ids: List[int]
    ) -> Tuple[int, int, List[str]]:
        """
        Post multiple transactions to ledger
        
        Returns:
            Tuple of (success_count, failure_count, error_messages)
        """
        success_count = 0
        failure_count = 0
        errors = []
        
        for transaction_id in transaction_ids:
            try:
                transaction = self.transaction_repo.get_by_id(transaction_id)
                if not transaction:
                    errors.append(f"Transaction {transaction_id} not found")
                    failure_count += 1
                    continue
                
                if not transaction.driver_id or not transaction.lease_id:
                    errors.append(
                        f"Transaction {transaction.ticket_number} not mapped to driver/lease"
                    )
                    failure_count += 1
                    continue
                
                self._post_transaction_to_ledger(transaction)
                success_count += 1
                
            except Exception as e:
                errors.append(
                    f"Transaction {transaction_id}: {str(e)}"
                )
                failure_count += 1
        
        self.db.commit()
        
        logger.info(
            f"Bulk posting completed: success={success_count}, "
            f"failures={failure_count}"
        )
        
        return success_count, failure_count, errors
    
    # === Utility Methods ===
    
    def _parse_date(self, date_str: str) -> Optional[date]:
        """Parse date from string (handles multiple formats)"""
        if not date_str:
            return None
        
        date_formats = [
            '%m/%d/%Y',  # 10/20/2025
            '%Y-%m-%d',  # 2025-10-20
            '%m-%d-%Y',  # 10-20-2025
            '%d/%m/%Y',  # 20/10/2025
        ]
        
        for fmt in date_formats:
            try:
                return datetime.strptime(date_str.strip(), fmt).date()
            except:
                continue
        
        return None
    
    def _parse_decimal(self, value: Any) -> Optional[Decimal]:
        """Parse decimal from string"""
        if not value:
            return None
        
        if isinstance(value, (int, float, Decimal)):
            return Decimal(str(value))
        
        if isinstance(value, str):
            value = value.replace('$', '').replace(',', '').strip()
            try:
                return Decimal(value)
            except:
                return None
        
        return None
    
    def _get_payment_period(self, transaction_date: date) -> Tuple[date, date]:
        """
        Calculate payment period (Sunday to Saturday) for a transaction date
        
        Returns:
            Tuple of (period_start, period_end)
        """
        # Find the Sunday of the week
        days_since_sunday = transaction_date.weekday() + 1  # Monday = 0, Sunday = 6
        if days_since_sunday == 7:  # If transaction is on Sunday
            days_since_sunday = 0
        
        period_start = transaction_date - timedelta(days=days_since_sunday)
        period_end = period_start + timedelta(days=6)
        
        return period_start, period_end