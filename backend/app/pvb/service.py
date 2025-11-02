"""
app/pvb/service.py

Service layer for PVB business logic
Handles CSV import, CURB trip matching, and ledger posting
"""

import json
import csv
from datetime import datetime, date, timedelta
from decimal import Decimal
from typing import List, Optional, Tuple, Dict, Any
import traceback
from io import StringIO

from sqlalchemy.orm import Session
from sqlalchemy import and_, func, or_

from app.pvb.models import (
    PVBViolation, PVBImportHistory,
    MappingMethod, PostingStatus, ImportStatus, ViolationSource, ViolationState
)
from app.pvb.repository import (
    PVBViolationRepository, PVBImportHistoryRepository
)
from app.pvb.exceptions import (
    PVBImportError, PVBMappingError, PVBPostingError
)

# Import existing models
from app.drivers.models import Driver, TLCLicense
from app.vehicles.models import Vehicle
from app.leases.models import Lease
from app.curb.models import CurbTrip

# Import ledger service
from app.ledger.service import LedgerService
from app.ledger.models import PostingCategory

from app.utils.logger import get_logger

logger = get_logger(__name__)


class PVBImportService:
    """
    Service for PVB CSV import and processing
    Orchestrates import, matching, and ledger posting
    """
    
    def __init__(self, db: Session):
        self.db = db
        self.violation_repo = PVBViolationRepository(db)
        self.history_repo = PVBImportHistoryRepository(db)
        self.ledger_service = LedgerService(db)
    
    def import_csv_file(
        self,
        csv_content: str,
        file_name: str,
        perform_matching: bool = True,
        post_to_ledger: bool = True,
        auto_match_threshold: float = 0.90,
        triggered_by: str = "API",
        triggered_by_user_id: Optional[int] = None
    ) -> Tuple[PVBImportHistory, List[str]]:
        """
        Import PVB violations from CSV file
        
        Process:
        1. Parse CSV
        2. Import violations to database
        3. Match violations to drivers via CURB trips
        4. Post matched violations to ledger
        
        Returns: (import_history, errors)
        """
        batch_id = self._generate_batch_id()
        errors = []
        
        # Create import history record
        import_history = PVBImportHistory(
            batch_id=batch_id,
            import_source=ViolationSource.DOF_CSV,
            file_name=file_name,
            status=ImportStatus.IN_PROGRESS,
            started_at=datetime.utcnow(),
            perform_matching=perform_matching,
            post_to_ledger=post_to_ledger,
            auto_match_threshold=Decimal(str(auto_match_threshold)),
            triggered_by=triggered_by,
            triggered_by_user_id=triggered_by_user_id
        )
        import_history = self.history_repo.create(import_history)
        
        try:
            logger.info(f"Starting PVB CSV import: batch_id={batch_id}, file={file_name}")
            
            # Parse CSV
            violations_data = self._parse_csv(csv_content)
            import_history.total_records_in_file = len(violations_data)
            
            logger.info(f"Parsed {len(violations_data)} records from CSV")
            
            # Process each violation
            imported_count = 0
            skipped_count = 0
            failed_count = 0
            mapped_count = 0
            posted_count = 0
            
            for row_data in violations_data:
                try:
                    # Check for duplicate
                    if self.violation_repo.exists_by_summons_number(row_data['summons_number']):
                        skipped_count += 1
                        logger.debug(f"Skipping duplicate summons: {row_data['summons_number']}")
                        continue
                    
                    # Create violation record
                    violation = self._create_violation_from_row(row_data, batch_id, file_name)
                    violation = self.violation_repo.create(violation)
                    imported_count += 1
                    
                    # Match to driver if requested
                    if perform_matching:
                        try:
                            self._match_violation_to_entities(
                                violation,
                                auto_match_threshold=auto_match_threshold
                            )
                            
                            if violation.mapping_method != MappingMethod.UNMAPPED:
                                mapped_count += 1
                        except Exception as e:
                            logger.warning(f"Matching failed for summons {violation.summons_number}: {str(e)}")
                    
                    # Post to ledger if mapped and requested
                    if post_to_ledger and violation.posting_status == PostingStatus.NOT_POSTED:
                        if violation.driver_id and violation.lease_id:
                            try:
                                self._post_violation_to_ledger(violation)
                                posted_count += 1
                            except Exception as e:
                                logger.warning(f"Ledger posting failed for summons {violation.summons_number}: {str(e)}")
                                errors.append(f"Posting failed for {violation.summons_number}: {str(e)}")
                    
                except Exception as e:
                    failed_count += 1
                    error_msg = f"Failed to process row {row_data.get('summons_number', 'UNKNOWN')}: {str(e)}"
                    errors.append(error_msg)
                    logger.error(error_msg)
                    logger.debug(traceback.format_exc())
            
            # Update import history with results
            import_history.records_imported = imported_count
            import_history.records_skipped = skipped_count
            import_history.records_failed = failed_count
            import_history.records_mapped = mapped_count
            import_history.records_posted = posted_count
            import_history.completed_at = datetime.utcnow()
            import_history.duration_seconds = int(
                (import_history.completed_at - import_history.started_at).total_seconds()
            )
            
            # Determine final status
            if failed_count == 0:
                import_history.status = ImportStatus.COMPLETED
            elif imported_count > 0:
                import_history.status = ImportStatus.PARTIAL
            else:
                import_history.status = ImportStatus.FAILED
            
            if errors:
                import_history.errors = json.dumps(errors)
            
            self.history_repo.update(import_history)
            self.db.commit()
            
            logger.info(
                f"PVB import completed: batch_id={batch_id}, "
                f"imported={imported_count}, skipped={skipped_count}, "
                f"failed={failed_count}, mapped={mapped_count}, posted={posted_count}"
            )
            
            return import_history, errors
            
        except Exception as e:
            self.db.rollback()
            import_history.status = ImportStatus.FAILED
            import_history.completed_at = datetime.utcnow()
            import_history.errors = json.dumps([str(e)])
            self.history_repo.update(import_history)
            self.db.commit()
            
            logger.error(f"PVB import failed: {str(e)}")
            logger.debug(traceback.format_exc())
            raise PVBImportError(f"Import failed: {str(e)}") from e
    
    def create_manual_violation(
        self,
        summons_number: str,
        plate_number: str,
        state: ViolationState,
        violation_date: datetime,
        violation_description: str,
        fine_amount: Decimal,
        penalty_amount: Decimal = Decimal('0.00'),
        interest_amount: Decimal = Decimal('0.00'),
        street_name: Optional[str] = None,
        county: Optional[str] = None,
        driver_id: Optional[int] = None,
        lease_id: Optional[int] = None,
        notes: Optional[str] = None,
        created_by_user_id: Optional[int] = None,
        post_to_ledger: bool = True
    ) -> PVBViolation:
        """
        Manually create a PVB violation (for out-of-state violations received by mail)
        
        Args:
            summons_number: Ticket/summons number
            plate_number: Vehicle plate
            state: State of violation
            violation_date: When violation occurred
            violation_description: Description
            fine_amount: Base fine
            penalty_amount: Penalty (if any)
            interest_amount: Interest (if any)
            street_name: Location
            county: County code
            driver_id: If known, assign to driver
            lease_id: If known, assign to lease
            notes: Additional notes
            created_by_user_id: User creating entry
            post_to_ledger: Whether to post immediately
        """
        # Check for duplicate
        if self.violation_repo.exists_by_summons_number(summons_number):
            raise PVBImportError(f"Violation with summons number {summons_number} already exists")
        
        # Calculate total amount due
        amount_due = fine_amount + penalty_amount + interest_amount
        
        # Find vehicle by plate
        vehicle = self.db.query(Vehicle).filter(
            Vehicle.plate_number == plate_number
        ).first()
        
        vehicle_id = vehicle.id if vehicle else None
        medallion_id = vehicle.medallion_id if vehicle else None
        
        # If driver/lease not provided, try to find from vehicle
        if vehicle and not driver_id and not lease_id:
            # Find active lease for this vehicle
            active_lease = self.db.query(Lease).filter(
                and_(
                    Lease.vehicle_id == vehicle.id,
                    Lease.start_date <= violation_date.date(),
                    or_(
                        Lease.end_date.is_(None),
                        Lease.end_date >= violation_date.date()
                    )
                )
            ).first()
            
            if active_lease:
                lease_id = active_lease.id
                driver_id = active_lease.driver_id
        
        # Determine mapping method
        if driver_id and lease_id:
            mapping_method = MappingMethod.MANUAL_ASSIGNMENT
            mapped_at = datetime.utcnow()
            mapped_by = created_by_user_id
        else:
            mapping_method = MappingMethod.UNMAPPED
            mapped_at = None
            mapped_by = None
        
        # Get hack license if driver is mapped
        hack_license_number = None
        if driver_id:
            driver = self.db.query(Driver).filter(Driver.id == driver_id).first()
            if driver:
                tlc_license = self.db.query(TLCLicense).filter(
                    TLCLicense.driver_id == driver.id
                ).first()
                if tlc_license:
                    hack_license_number = tlc_license.license_number
        
        # Determine payment period (week containing violation date)
        payment_period_start = self._get_week_start(violation_date.date())
        payment_period_end = self._get_week_end(violation_date.date())
        
        # Create violation
        violation = PVBViolation(
            summons_number=summons_number,
            plate_number=plate_number,
            state=state,
            violation_date=violation_date,
            violation_description=violation_description,
            fine_amount=fine_amount,
            penalty_amount=penalty_amount,
            interest_amount=interest_amount,
            amount_due=amount_due,
            street_name=street_name,
            county=county,
            driver_id=driver_id,
            vehicle_id=vehicle_id,
            medallion_id=medallion_id,
            lease_id=lease_id,
            hack_license_number=hack_license_number,
            mapping_method=mapping_method,
            mapping_notes=notes,
            mapped_at=mapped_at,
            mapped_by=mapped_by,
            import_source=ViolationSource.MANUAL_ENTRY,
            payment_period_start=datetime.combine(payment_period_start, datetime.min.time()),
            payment_period_end=datetime.combine(payment_period_end, datetime.max.time())
        )
        
        violation = self.violation_repo.create(violation)
        
        # Post to ledger if mapped and requested
        if post_to_ledger and driver_id and lease_id:
            try:
                self._post_violation_to_ledger(violation)
            except Exception as e:
                logger.error(f"Failed to post manual violation to ledger: {str(e)}")
                raise PVBPostingError(f"Failed to post to ledger: {str(e)}") from e
        
        self.db.commit()
        
        logger.info(f"Manual PVB violation created: summons={summons_number}")
        
        return violation
    
    def remap_violation(
        self,
        violation_id: int,
        driver_id: int,
        lease_id: int,
        reason: str,
        remapped_by_user_id: int,
        post_to_ledger: bool = True
    ) -> PVBViolation:
        """
        Manually remap a violation to a different driver/lease
        
        Process:
        1. Validate new driver and lease
        2. Void existing ledger postings if already posted
        3. Update violation associations
        4. Create new ledger postings
        """
        violation = self.violation_repo.get_by_id_or_raise(violation_id)
        
        # Validate driver exists
        driver = self.db.query(Driver).filter(Driver.id == driver_id).first()
        if not driver:
            raise PVBMappingError(f"Driver {driver_id} not found")
        
        # Validate lease exists and is associated with driver
        lease = self.db.query(Lease).filter(
            and_(
                Lease.id == lease_id,
                Lease.driver_id == driver_id
            )
        ).first()
        
        if not lease:
            raise PVBMappingError(
                f"Lease {lease_id} not found or not associated with driver {driver_id}"
            )
        
        # Get TLC license number
        tlc_license = self.db.query(TLCLicense).filter(
            TLCLicense.driver_id == driver_id
        ).first()
        hack_license_number = tlc_license.license_number if tlc_license else None
        
        # If already posted, void the old posting
        if violation.posting_status == PostingStatus.POSTED and violation.ledger_posting_id:
            try:
                self.ledger_service.void_posting(
                    posting_id=violation.ledger_posting_id,
                    reason=f"PVB remapping: {reason}",
                    user_id=remapped_by_user_id
                )
                logger.info(f"Voided old posting {violation.ledger_posting_id} for PVB remapping")
            except Exception as e:
                logger.error(f"Failed to void old posting: {str(e)}")
                raise PVBPostingError(f"Failed to void old posting: {str(e)}") from e
        
        # Update violation associations
        violation.driver_id = driver_id
        violation.lease_id = lease_id
        violation.vehicle_id = lease.vehicle_id
        violation.medallion_id = lease.medallion_id
        violation.hack_license_number = hack_license_number
        violation.mapping_method = MappingMethod.MANUAL_ASSIGNMENT
        violation.mapping_confidence = None
        violation.mapped_at = datetime.utcnow()
        violation.mapped_by = remapped_by_user_id
        violation.mapping_notes = f"Manual remapping: {reason}"
        violation.posting_status = PostingStatus.NOT_POSTED
        violation.ledger_posting_id = None
        violation.ledger_balance_id = None
        
        self.violation_repo.update(violation)
        
        # Post to ledger with new associations
        if post_to_ledger:
            try:
                self._post_violation_to_ledger(violation)
            except Exception as e:
                logger.error(f"Failed to post remapped violation: {str(e)}")
                raise PVBPostingError(f"Failed to post remapped violation: {str(e)}") from e
        
        self.db.commit()
        
        logger.info(
            f"PVB violation remapped: id={violation_id}, "
            f"driver={driver_id}, lease={lease_id}"
        )
        
        return violation
    
    def _parse_csv(self, csv_content: str) -> List[Dict[str, Any]]:
        """
        Parse PVB CSV file
        
        Expected CSV format (NYC DOF):
        Plate,License Type,State,Plate Type,Summons Number,Issue Date,
        Violation Time,Violation,Judgment Entry Date,Fine Amount,
        Penalty Amount,Interest Amount,Reduction Amount,Payment Amount,
        Amount Due,Precinct,County,Issuing Agency,Summons Image,
        Violation Status,Violation Description,Street Code1,Street Code2,Street Code3,
        Vehicle Make,House Number,Street Name,Intersecting Street
        """
        try:
            # Parse CSV
            csv_reader = csv.DictReader(StringIO(csv_content))
            
            violations_data = []
            
            for row in csv_reader:
                # Skip empty rows
                if not row.get('PLATE') and not row.get('Plate'):
                    continue
                
                # Normalize keys (handle both uppercase and mixed case)
                normalized_row = {k.lower().replace(' ', '_'): v for k, v in row.items()}
                
                # Extract and parse fields
                try:
                    plate = normalized_row.get('plate', '').strip()
                    if not plate:
                        continue
                    
                    summons = normalized_row.get('summons_number', '').strip()
                    if not summons:
                        continue
                    
                    # Parse date and time
                    issue_date_str = normalized_row.get('issue_date', '')
                    violation_time_str = normalized_row.get('violation_time', '').strip()
                    
                    # Parse violation date
                    violation_date = self._parse_violation_datetime(
                        issue_date_str, 
                        violation_time_str
                    )
                    
                    # Parse financial amounts
                    fine = self._parse_decimal(normalized_row.get('fine_amount', '0'))
                    penalty = self._parse_decimal(normalized_row.get('penalty_amount', '0'))
                    interest = self._parse_decimal(normalized_row.get('interest_amount', '0'))
                    reduction = self._parse_decimal(normalized_row.get('reduction_amount', '0'))
                    payment = self._parse_decimal(normalized_row.get('payment_amount', '0'))
                    amount_due = self._parse_decimal(normalized_row.get('amount_due', '0'))
                    
                    # If amount_due is not provided, calculate it
                    if amount_due == Decimal('0.00'):
                        amount_due = fine + penalty + interest - reduction - payment
                    
                    # Extract other fields
                    violations_data.append({
                        'summons_number': summons,
                        'plate_number': plate,
                        'state': normalized_row.get('state', 'NY').strip()[:2].upper(),
                        'vehicle_type': normalized_row.get('plate_type', '').strip(),
                        'violation_date': violation_date,
                        'violation_code': normalized_row.get('violation', '').strip(),
                        'violation_description': normalized_row.get('violation_description', '').strip(),
                        'county': normalized_row.get('county', '').strip(),
                        'issuing_agency': normalized_row.get('issuing_agency', '').strip(),
                        'street_name': normalized_row.get('street_name', '').strip(),
                        'intersecting_street': normalized_row.get('intersecting_street', '').strip(),
                        'house_number': normalized_row.get('house_number', '').strip(),
                        'fine_amount': fine,
                        'penalty_amount': penalty,
                        'interest_amount': interest,
                        'reduction_amount': reduction,
                        'payment_amount': payment,
                        'amount_due': amount_due,
                        'violation_status': normalized_row.get('violation_status', '').strip(),
                        'judgment_entry_date_str': normalized_row.get('judgment_entry_date', '').strip()
                    })
                    
                except Exception as e:
                    logger.warning(f"Failed to parse row: {str(e)}")
                    continue
            
            return violations_data
            
        except Exception as e:
            raise PVBImportError(f"CSV parsing failed: {str(e)}") from e
    
    def _create_violation_from_row(
        self, 
        row_data: Dict[str, Any],
        batch_id: str,
        file_name: str
    ) -> PVBViolation:
        """Create PVBViolation instance from parsed CSV row"""
        
        # Map state to enum
        try:
            state = ViolationState[row_data['state']]
        except KeyError:
            state = ViolationState.OTHER
        
        # Parse judgment entry date if provided
        judgment_entry_date = None
        if row_data.get('judgment_entry_date_str'):
            try:
                judgment_entry_date = datetime.strptime(
                    row_data['judgment_entry_date_str'], 
                    '%m/%d/%Y'
                )
            except ValueError:
                pass
        
        # Determine payment period
        payment_period_start = self._get_week_start(row_data['violation_date'].date())
        payment_period_end = self._get_week_end(row_data['violation_date'].date())
        
        violation = PVBViolation(
            summons_number=row_data['summons_number'],
            plate_number=row_data['plate_number'],
            state=state,
            vehicle_type=row_data['vehicle_type'],
            violation_date=row_data['violation_date'],
            violation_code=row_data['violation_code'],
            violation_description=row_data['violation_description'],
            county=row_data['county'],
            issuing_agency=row_data['issuing_agency'],
            street_name=row_data['street_name'],
            intersecting_street=row_data['intersecting_street'],
            house_number=row_data['house_number'],
            fine_amount=row_data['fine_amount'],
            penalty_amount=row_data['penalty_amount'],
            interest_amount=row_data['interest_amount'],
            reduction_amount=row_data['reduction_amount'],
            payment_amount=row_data['payment_amount'],
            amount_due=row_data['amount_due'],
            judgment_entry_date=judgment_entry_date,
            mapping_method=MappingMethod.UNMAPPED,
            posting_status=PostingStatus.NOT_POSTED,
            import_source=ViolationSource.DOF_CSV,
            import_batch_id=batch_id,
            import_file_name=file_name,
            payment_period_start=datetime.combine(payment_period_start, datetime.min.time()),
            payment_period_end=datetime.combine(payment_period_end, datetime.max.time())
        )
        
        return violation
    
    def _match_violation_to_entities(
        self,
        violation: PVBViolation,
        auto_match_threshold: float = 0.90
    ) -> None:
        """
        Match violation to driver via CURB trip correlation
        
        Matching algorithm:
        1. Find vehicle by plate number
        2. Find CURB trips for that vehicle within time window (±30 minutes)
        3. Score each match based on time proximity
        4. If confidence >= threshold, auto-assign
        5. Otherwise, leave as UNMAPPED for manual review
        """
        # Step 1: Find vehicle by plate number
        vehicle = self.db.query(Vehicle).filter(
            Vehicle.plate_number == violation.plate_number
        ).first()
        
        if not vehicle:
            logger.debug(f"No vehicle found for plate {violation.plate_number}")
            return
        
        violation.vehicle_id = vehicle.id
        violation.medallion_id = vehicle.medallion_id
        
        # Step 2: Find CURB trips within time window (±30 minutes)
        time_window_start = violation.violation_date - timedelta(minutes=30)
        time_window_end = violation.violation_date + timedelta(minutes=30)
        
        curb_trips = self.db.query(CurbTrip).filter(
            and_(
                CurbTrip.vehicle_id == vehicle.id,
                CurbTrip.trip_end_time >= time_window_start,
                CurbTrip.trip_end_time <= time_window_end
            )
        ).all()
        
        if not curb_trips:
            logger.debug(
                f"No CURB trips found for vehicle {vehicle.id} "
                f"near {violation.violation_date}"
            )
            return
        
        # Step 3: Score each match
        best_match = None
        best_confidence = 0.0
        
        for trip in curb_trips:
            confidence = self._calculate_match_confidence(
                violation,
                trip
            )
            
            if confidence > best_confidence:
                best_confidence = confidence
                best_match = trip
        
        # Step 4: Auto-assign if confidence meets threshold
        if best_confidence >= auto_match_threshold and best_match:
            violation.driver_id = best_match.driver_id
            violation.lease_id = best_match.lease_id
            violation.hack_license_number = best_match.hack_license_number
            violation.mapping_method = MappingMethod.AUTO_CURB_MATCH
            violation.mapping_confidence = Decimal(str(round(best_confidence, 2)))
            violation.matched_curb_trip_id = best_match.id
            violation.mapped_at = datetime.utcnow()
            
            logger.info(
                f"Auto-matched PVB violation {violation.summons_number} "
                f"to driver {violation.driver_id} with confidence {best_confidence:.2f}"
            )
        else:
            logger.debug(
                f"Best match confidence {best_confidence:.2f} below threshold {auto_match_threshold} "
                f"for summons {violation.summons_number}"
            )
    
    def _calculate_match_confidence(
        self,
        violation: PVBViolation,
        trip: CurbTrip
    ) -> float:
        """
        Calculate matching confidence score (0.0 - 1.0)
        
        Scoring factors:
        - Time proximity (40 points max): How close violation time to trip end time
        - Driver consistency (30 points max): If driver has multiple trips nearby
        - Location match (30 points max): If violation location on trip route
        
        Total: 100 points = 1.0 confidence
        """
        total_score = 0.0
        
        # Factor 1: Time proximity (40 points)
        time_diff = abs((violation.violation_date - trip.trip_end_time).total_seconds())
        time_diff_minutes = time_diff / 60
        
        if time_diff_minutes <= 15:
            total_score += 40
        elif time_diff_minutes <= 30:
            total_score += 30
        elif time_diff_minutes <= 60:
            total_score += 20
        else:
            total_score += 10
        
        # Factor 2: Driver consistency (30 points)
        # Check if this driver has other trips nearby in time
        nearby_trips_count = self.db.query(func.count(CurbTrip.id)).filter(
            and_(
                CurbTrip.driver_id == trip.driver_id,
                CurbTrip.vehicle_id == violation.vehicle_id,
                CurbTrip.trip_end_time >= violation.violation_date - timedelta(hours=1),
                CurbTrip.trip_end_time <= violation.violation_date + timedelta(hours=1)
            )
        ).scalar()
        
        if nearby_trips_count >= 3:
            total_score += 30
        elif nearby_trips_count == 2:
            total_score += 20
        else:
            total_score += 10
        
        # Factor 3: Location match (30 points)
        # Simple heuristic: if county matches
        if violation.county and trip.trip_end_location:
            # Extract borough/county from trip location if possible
            # This is simplified - in production you'd have more sophisticated matching
            if violation.county.upper() in ['MN', 'MANHATTAN']:
                location_score = 30 if 'MANHATTAN' in trip.trip_end_location.upper() else 10
            elif violation.county.upper() in ['BK', 'BROOKLYN']:
                location_score = 30 if 'BROOKLYN' in trip.trip_end_location.upper() else 10
            elif violation.county.upper() in ['QN', 'QUEENS']:
                location_score = 30 if 'QUEENS' in trip.trip_end_location.upper() else 10
            elif violation.county.upper() in ['BX', 'BRONX']:
                location_score = 30 if 'BRONX' in trip.trip_end_location.upper() else 10
            else:
                location_score = 10
            
            total_score += location_score
        else:
            total_score += 10
        
        # Normalize to 0.0-1.0
        confidence = total_score / 100.0
        
        return min(confidence, 1.0)
    
    def _post_violation_to_ledger(self, violation: PVBViolation) -> None:
        """
        Post PVB violation to ledger as obligation (DEBIT)
        
        Creates:
        - One DEBIT posting for the violation amount
        - One balance record for tracking payment
        """
        if not violation.driver_id or not violation.lease_id:
            raise PVBPostingError("Cannot post violation without driver_id and lease_id")
        
        if violation.posting_status == PostingStatus.POSTED:
            logger.warning(f"Violation {violation.summons_number} already posted")
            return
        
        try:
            # Create obligation (DEBIT + Balance)
            posting, balance = self.ledger_service.create_obligation(
                driver_id=violation.driver_id,
                lease_id=violation.lease_id,
                category=PostingCategory.PVB,
                amount=violation.amount_due,
                reference_type="PVB_VIOLATION",
                reference_id=violation.summons_number,
                payment_period_start=violation.payment_period_start,
                payment_period_end=violation.payment_period_end,
                due_date=violation.payment_period_end,
                description=f"PVB Violation: {violation.violation_description or violation.summons_number}"
            )
            
            # Update violation with ledger references
            violation.posting_status = PostingStatus.POSTED
            violation.ledger_posting_id = posting.posting_id
            violation.ledger_balance_id = balance.balance_id
            violation.posted_at = datetime.utcnow()
            violation.posting_error = None
            
            self.violation_repo.update(violation)
            
            logger.info(
                f"Posted PVB violation to ledger: summons={violation.summons_number}, "
                f"posting={posting.posting_id}, balance={balance.balance_id}"
            )
            
        except Exception as e:
            violation.posting_status = PostingStatus.FAILED
            violation.posting_error = str(e)
            self.violation_repo.update(violation)
            
            logger.error(f"Failed to post PVB violation to ledger: {str(e)}")
            raise PVBPostingError(f"Ledger posting failed: {str(e)}") from e
    
    def _generate_batch_id(self) -> str:
        """Generate unique batch ID"""
        timestamp = datetime.utcnow().strftime('%Y%m%d-%H%M%S')
        import random
        random_suffix = ''.join(random.choices('0123456789ABCDEF', k=5))
        return f"PVB-IMPORT-{timestamp}-{random_suffix}"
    
    def _parse_decimal(self, value: str) -> Decimal:
        """Parse decimal from string, handling various formats"""
        try:
            # Remove dollar signs, commas, spaces
            cleaned = value.replace('$', '').replace(',', '').replace(' ', '').strip()
            return Decimal(cleaned) if cleaned else Decimal('0.00')
        except:
            return Decimal('0.00')
    
    def _parse_violation_datetime(
        self, 
        date_str: str, 
        time_str: str
    ) -> datetime:
        """
        Parse violation date and time
        
        Date format: MM/DD/YYYY
        Time format: HHMMA or HHMMP (e.g., 0815A = 08:15 AM, 0645P = 06:45 PM)
        """
        try:
            # Parse date
            date_obj = datetime.strptime(date_str.strip(), '%m/%d/%Y')
            
            # Parse time if provided
            if time_str:
                time_str = time_str.strip().upper()
                
                # Handle formats like "0815A" or "0645P"
                if len(time_str) >= 5:
                    hour_str = time_str[:2]
                    minute_str = time_str[2:4]
                    meridiem = time_str[4]
                    
                    hour = int(hour_str)
                    minute = int(minute_str)
                    
                    # Convert to 24-hour format
                    if meridiem == 'P' and hour != 12:
                        hour += 12
                    elif meridiem == 'A' and hour == 12:
                        hour = 0
                    
                    return date_obj.replace(hour=hour, minute=minute)
            
            # If no time, default to noon
            return date_obj.replace(hour=12, minute=0)
            
        except Exception as e:
            logger.warning(f"Failed to parse date/time: {date_str} {time_str} - {str(e)}")
            # Return with noon as default
            try:
                return datetime.strptime(date_str.strip(), '%m/%d/%Y').replace(hour=12, minute=0)
            except:
                # Last resort: use current date
                return datetime.utcnow()
    
    def _get_week_start(self, dt: date) -> date:
        """Get the Sunday start of the week containing the given date"""
        # Python weekday: Monday=0, Sunday=6
        days_since_sunday = (dt.weekday() + 1) % 7
        return dt - timedelta(days=days_since_sunday)
    
    def _get_week_end(self, dt: date) -> date:
        """Get the Saturday end of the week containing the given date"""
        week_start = self._get_week_start(dt)
        return week_start + timedelta(days=6)