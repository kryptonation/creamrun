"""
app/pvb/services.py

Service layer for PVB business logic
Handles CSV import, CURB trip matching, and ledger posting
"""

import json
import csv
from datetime import datetime, timedelta
from decimal import Decimal
from typing import List, Optional, Tuple, Dict, Any
import traceback
from io import StringIO

from sqlalchemy.orm import Session
from sqlalchemy import and_, func

from app.pvb.models import (
    PVBViolation, PVBImportHistory, PVBImportFailure,
    MappingMethod, ImportStatus, PostingStatus, ViolationStatus,
    ResolutionStatus, ImportSource
)
from app.pvb.repository import (
    PVBViolationRepository, PVBImportHistoryRepository,
    PVBSummonsRepository, PVBImportFailureRepository
)
from app.pvb.exceptions import (
    PVBImportError, PVBMappingError, PVBPostingError,
    PVBNotFoundException, PVBDuplicateError, PVBCSVFormatError
)

from app.vehicles.models import Vehicle
from app.drivers.models import Driver
from app.leases.models import Lease
from app.curb.models import CurbTrip

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
        self.summons_repo = PVBSummonsRepository(db)
        self.failure_repo = PVBImportFailureRepository(db)
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
    ) -> Tuple[PVBImportHistory, List[str]]:
        """
        Import PVB violations from CSV file
        
        Returns:
            Tuple of (import_history, error_messages)
        """
        batch_id = f"PVB-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
        start_time = datetime.utcnow()
        errors = []
        
        # Create import history record
        import_history = PVBImportHistory(
            batch_id=batch_id,
            import_source=ImportSource.DOF_CSV,
            file_name=file_name,
            file_size_kb=len(csv_content) // 1024,
            status=ImportStatus.IN_PROGRESS,
            started_at=start_time,
            perform_matching=perform_matching,
            post_to_ledger=post_to_ledger,
            auto_match_threshold=auto_match_threshold,
            triggered_by=triggered_by,
            triggered_by_user_id=triggered_by_user_id
        )
        import_history = self.history_repo.create(import_history)
        
        try:
            # Parse CSV
            violations_data, parse_errors = self._parse_csv(csv_content, batch_id)
            errors.extend(parse_errors)
            
            import_history.total_records_in_file = len(violations_data)
            
            # Process each violation
            imported_count = 0
            duplicate_count = 0
            failed_count = 0
            auto_matched = 0
            plate_only = 0
            unmapped = 0
            posted_count = 0
            
            for idx, violation_data in enumerate(violations_data):
                try:
                    # Check for duplicate
                    if self.violation_repo.exists_by_summons(violation_data['summons_number']):
                        duplicate_count += 1
                        continue
                    
                    # Create violation
                    violation = self._create_violation_from_data(
                        violation_data,
                        batch_id,
                        ImportSource.DOF_CSV,
                        file_name
                    )
                    
                    # Perform matching if requested
                    if perform_matching:
                        self._match_violation_to_entities(
                            violation,
                            auto_match_threshold
                        )
                        
                        # Track matching results
                        if violation.mapping_method == MappingMethod.AUTO_CURB_MATCH:
                            auto_matched += 1
                        elif violation.mapping_method == MappingMethod.PLATE_ONLY:
                            plate_only += 1
                        else:
                            unmapped += 1
                    
                    # Post to ledger if requested and mapped
                    if post_to_ledger and violation.driver_id and violation.lease_id:
                        try:
                            self._post_violation_to_ledger(violation)
                            posted_count += 1
                        except Exception as e:
                            logger.error(f"Failed to post violation {violation.summons_number}: {str(e)}")
                            errors.append(f"Posting failed for {violation.summons_number}: {str(e)}")
                    
                    imported_count += 1
                    
                except Exception as e:
                    failed_count += 1
                    error_msg = f"Row {idx + 1}: {str(e)}"
                    errors.append(error_msg)
                    logger.error(f"Failed to process violation: {error_msg}")
                    
                    # Record failure
                    failure = PVBImportFailure(
                        import_batch_id=batch_id,
                        row_number=idx + 1,
                        raw_data=json.dumps(violation_data),
                        error_type="PROCESSING_ERROR",
                        error_message=str(e),
                        field_name=None
                    )
                    self.failure_repo.create(failure)
            
            # Update import history
            import_history.total_imported = imported_count
            import_history.total_duplicates = duplicate_count
            import_history.total_failed = failed_count
            import_history.auto_matched_count = auto_matched
            import_history.plate_only_count = plate_only
            import_history.unmapped_count = unmapped
            import_history.posted_to_ledger_count = posted_count
            import_history.pending_posting_count = imported_count - posted_count
            
            import_history.status = ImportStatus.COMPLETED if failed_count == 0 else ImportStatus.PARTIAL
            import_history.completed_at = datetime.utcnow()
            import_history.duration_seconds = int((import_history.completed_at - start_time).total_seconds())
            
            if errors:
                import_history.error_message = f"{len(errors)} errors occurred"
                import_history.error_details = json.dumps(errors[:100])  # Store first 100 errors
            
            self.history_repo.update(import_history)
            self.db.commit()
            
            logger.info(f"PVB import completed: {batch_id}, imported={imported_count}, failed={failed_count}")
            
            return import_history, errors
            
        except Exception as e:
            logger.error(f"PVB import failed: {str(e)}", exc_info=True)
            import_history.status = ImportStatus.FAILED
            import_history.completed_at = datetime.utcnow()
            import_history.duration_seconds = int((import_history.completed_at - start_time).total_seconds())
            import_history.error_message = str(e)
            import_history.error_details = traceback.format_exc()
            self.history_repo.update(import_history)
            self.db.commit()
            
            raise PVBImportError(f"Import failed: {str(e)}") from e
    
    def _parse_csv(
        self,
        csv_content: str,
        batch_id: str
    ) -> Tuple[List[Dict[str, Any]], List[str]]:
        """
        Parse CSV content into violation data dictionaries
        """
        violations = []
        errors = []
        
        try:
            # Parse CSV with flexible delimiter detection
            csv_reader = csv.DictReader(StringIO(csv_content))
            
            # Validate headers
            required_fields = ['PLATE', 'SUMMONS', 'ISSUE DATE', 'FINE', 'AMOUNT DUE']
            headers = [h.strip() if h else '' for h in csv_reader.fieldnames or []]
            
            missing_fields = [f for f in required_fields if f not in headers]
            if missing_fields:
                raise PVBCSVFormatError(f"Missing required fields: {', '.join(missing_fields)}")
            
            for row_num, row in enumerate(csv_reader, start=2):
                try:
                    # Clean and extract data
                    violation_data = self._extract_violation_data(row)
                    violations.append(violation_data)
                    
                except Exception as e:
                    error_msg = f"Row {row_num}: {str(e)}"
                    errors.append(error_msg)
                    logger.warning(f"Failed to parse row {row_num}: {str(e)}")
                    
                    # Record parse failure
                    failure = PVBImportFailure(
                        import_batch_id=batch_id,
                        row_number=row_num,
                        raw_data=json.dumps(dict(row)),
                        error_type="PARSE_ERROR",
                        error_message=str(e),
                        field_name=None
                    )
                    self.failure_repo.create(failure)
            
            logger.info(f"Parsed {len(violations)} violations from CSV, {len(errors)} errors")
            return violations, errors
            
        except Exception as e:
            logger.error(f"CSV parse error: {str(e)}")
            raise PVBCSVFormatError(f"Failed to parse CSV: {str(e)}") from e
    
    def _extract_violation_data(self, row: Dict[str, str]) -> Dict[str, Any]:
        """Extract and clean violation data from CSV row"""
        def clean_str(val: Optional[str]) -> Optional[str]:
            if not val or not val.strip():
                return None
            return val.strip()
        
        def parse_decimal(val: Optional[str]) -> Decimal:
            if not val or not val.strip():
                return Decimal('0.00')
            try:
                # Remove currency symbols and commas
                cleaned = val.strip().replace('$', '').replace(',', '')
                return Decimal(cleaned)
            except:
                return Decimal('0.00')
        
        def parse_date(date_str: str, time_str: Optional[str] = None) -> datetime:
            """Parse date and optional time"""
            try:
                # Handle various date formats
                date_part = date_str.strip()
                
                # Try MM/DD/YYYY format
                if '/' in date_part:
                    month, day, year = date_part.split('/')
                    dt = datetime(int(year), int(month), int(day))
                else:
                    # Try other formats
                    dt = datetime.strptime(date_part, '%Y-%m-%d')
                
                # Add time if provided
                if time_str and time_str.strip():
                    time_part = time_str.strip()
                    # Handle formats like "0752A" or "07:52 AM"
                    if time_part[-1] in ['A', 'P']:
                        # Format: 0752A
                        hour = int(time_part[0:2])
                        minute = int(time_part[2:4])
                        if time_part[-1] == 'P' and hour < 12:
                            hour += 12
                        elif time_part[-1] == 'A' and hour == 12:
                            hour = 0
                        dt = dt.replace(hour=hour, minute=minute)
                
                return dt
            except Exception as e:
                logger.warning(f"Date parse error: {date_str}, {time_str} - {str(e)}")
                return datetime.now()
        
        # Extract all fields
        return {
            'plate_number': clean_str(row.get('PLATE', '')),
            'state': clean_str(row.get('STATE')),
            'vehicle_type': clean_str(row.get('TYPE')),
            'terminated': clean_str(row.get('TERMINATED')),
            'summons_number': clean_str(row.get('SUMMONS', '')),
            'issue_date': parse_date(row.get('ISSUE DATE', ''), row.get('ISSUE TIME')),
            'system_entry_date': parse_date(row.get('SYS ENTRY', '')) if row.get('SYS ENTRY') else None,
            'violation_code': clean_str(row.get('VC')),
            'hearing_indicator': clean_str(row.get('HEARING IND')),
            'penalty_warning': clean_str(row.get('PENALTY WARNING')),
            'judgment': clean_str(row.get('JUDGMENT')),
            'fine_amount': parse_decimal(row.get('FINE')),
            'penalty_amount': parse_decimal(row.get('PENALTY')),
            'interest_amount': parse_decimal(row.get('INTEREST')),
            'reduction_amount': parse_decimal(row.get('REDUCTION')),
            'payment_amount': parse_decimal(row.get('PAYMENT')),
            'amount_due': parse_decimal(row.get('AMOUNT DUE')),
            'county': clean_str(row.get('VIO COUNTY')),
            'front_or_opposite': clean_str(row.get('FRONT OR OPP')),
            'house_number': clean_str(row.get('HOUSE NUMBER')),
            'street_name': clean_str(row.get('STREET NAME')),
            'intersect_street': clean_str(row.get('INTERSECT STREET')),
        }
    
    def _create_violation_from_data(
        self,
        data: Dict[str, Any],
        batch_id: str,
        import_source: ImportSource,
        file_name: Optional[str] = None
    ) -> PVBViolation:
        """Create violation record from parsed data"""
        violation = PVBViolation(
            summons_number=data['summons_number'],
            plate_number=data['plate_number'],
            state=data.get('state'),
            vehicle_type=data.get('vehicle_type'),
            violation_code=data.get('violation_code'),
            issue_date=data['issue_date'],
            system_entry_date=data.get('system_entry_date'),
            county=data.get('county'),
            street_name=data.get('street_name'),
            house_number=data.get('house_number'),
            intersect_street=data.get('intersect_street'),
            front_or_opposite=data.get('front_or_opposite'),
            fine_amount=data['fine_amount'],
            penalty_amount=data['penalty_amount'],
            interest_amount=data['interest_amount'],
            reduction_amount=data['reduction_amount'],
            payment_amount=data['payment_amount'],
            amount_due=data['amount_due'],
            judgment=data.get('judgment'),
            penalty_warning=data.get('penalty_warning'),
            hearing_indicator=data.get('hearing_indicator'),
            terminated=data.get('terminated'),
            mapping_method=MappingMethod.UNKNOWN,
            posted_to_ledger=False,
            posting_status=PostingStatus.NOT_POSTED,
            violation_status=ViolationStatus.OPEN,
            resolution_status=ResolutionStatus.PENDING,
            import_batch_id=batch_id,
            import_source=import_source,
            source_file_name=file_name
        )
        
        return self.violation_repo.create(violation)
    
    def _match_violation_to_entities(
        self,
        violation: PVBViolation,
        auto_match_threshold: Decimal = Decimal('0.90')
    ):
        """
        Match violation to vehicle, driver, lease using CURB trips
        """
        try:
            # Step 1: Find vehicle by plate number
            vehicle = self.db.query(Vehicle).filter(
                Vehicle.plate_number == violation.plate_number
            ).first()
            
            if not vehicle:
                logger.info(f"No vehicle found for plate {violation.plate_number}")
                violation.mapping_method = MappingMethod.UNKNOWN
                violation.mapping_notes = "Vehicle not found in system"
                return
            
            violation.vehicle_id = vehicle.id
            
            # Get medallion if associated
            if vehicle.medallion_id:
                violation.medallion_id = vehicle.medallion_id
            
            # Step 2: Find CURB trips in time window (±30 minutes)
            time_window_start = violation.issue_date - timedelta(minutes=30)
            time_window_end = violation.issue_date + timedelta(minutes=30)
            
            potential_trips = self.db.query(CurbTrip).filter(
                and_(
                    CurbTrip.vehicle_id == vehicle.id,
                    CurbTrip.trip_start_datetime >= time_window_start,
                    CurbTrip.trip_start_datetime <= time_window_end,
                    CurbTrip.driver_id.isnot(None)
                )
            ).order_by(
                func.abs(
                    func.extract('epoch', CurbTrip.start_datetime) -
                    func.extract('epoch', violation.issue_date)
                )
            ).all()
            
            if not potential_trips:
                logger.info(f"No CURB trips found for violation {violation.summons_number}")
                violation.mapping_method = MappingMethod.PLATE_ONLY
                violation.mapping_notes = "No CURB trips in time window"
                return
            
            # Step 3: Calculate confidence for each trip
            best_trip = None
            best_confidence = Decimal('0.00')
            
            for trip in potential_trips:
                confidence = self._calculate_match_confidence(
                    violation,
                    trip,
                    vehicle
                )
                
                if confidence > best_confidence:
                    best_confidence = confidence
                    best_trip = trip
            
            # Step 4: Apply threshold and assign
            if best_confidence >= auto_match_threshold:
                violation.driver_id = best_trip.driver_id
                violation.lease_id = best_trip.lease_id
                violation.matched_curb_trip_id = best_trip.trip_id
                violation.mapping_confidence = best_confidence
                violation.mapping_method = MappingMethod.AUTO_CURB_MATCH
                violation.mapping_notes = f"Matched to CURB trip {best_trip.trip_id} with {float(best_confidence):.2f} confidence"
                logger.info(f"Auto-matched violation {violation.summons_number} to driver {best_trip.driver_id}")
            else:
                violation.mapping_method = MappingMethod.PLATE_ONLY
                violation.mapping_confidence = best_confidence
                violation.mapping_notes = f"Best match confidence {float(best_confidence):.2f} below threshold {float(auto_match_threshold):.2f}"
            
        except Exception as e:
            logger.error(f"Matching error for {violation.summons_number}: {str(e)}")
            violation.mapping_method = MappingMethod.UNKNOWN
            violation.mapping_notes = f"Matching failed: {str(e)}"
    
    def _calculate_match_confidence(
        self,
        violation: PVBViolation,
        trip: CurbTrip,
        vehicle: Vehicle
    ) -> Decimal:
        """
        Calculate confidence score for trip match
        
        Scoring:
        - Base: 0.50 (plate matched)
        - Time proximity: +0.30 max
        - Location match: +0.10
        - Driver consistency: +0.10
        """
        confidence = Decimal('0.50')  # Base for plate match
        
        # Time proximity scoring
        time_diff_minutes = abs((violation.issue_date - trip.trip_start_datetime).total_seconds() / 60)
        
        if time_diff_minutes <= 10:
            confidence += Decimal('0.30')
        elif time_diff_minutes <= 20:
            confidence += Decimal('0.20')
        elif time_diff_minutes <= 30:
            confidence += Decimal('0.10')
        
        # Location match (county/borough)
        if violation.county and trip.pickup_location:
            # Simple borough matching
            borough_map = {
                'MN': 'Manhattan',
                'BX': 'Bronx',
                'BK': 'Brooklyn',
                'QN': 'Queens',
                'SI': 'Staten Island'
            }
            violation_borough = borough_map.get(violation.county, violation.county)
            if violation_borough.lower() in trip.pickup_location.lower():
                confidence += Decimal('0.10')
        
        # Driver consistency (has used this vehicle before)
        # This would require a more complex query, simplified here
        if trip.driver_id:
            recent_trips_count = self.db.query(func.count(CurbTrip.id)).filter(
                and_(
                    CurbTrip.driver_id == trip.driver_id,
                    CurbTrip.vehicle_id == vehicle.id,
                    CurbTrip.trip_start_datetime < violation.issue_date
                )
            ).scalar()
            
            if recent_trips_count > 0:
                confidence += Decimal('0.10')
        
        return min(confidence, Decimal('1.00'))  # Cap at 1.00
    
    def _post_violation_to_ledger(self, violation: PVBViolation):
        """Post violation to ledger as PVB obligation"""
        if not violation.driver_id or not violation.lease_id:
            raise PVBPostingError("Cannot post violation without driver_id and lease_id")
        
        if violation.amount_due <= 0:
            logger.info(f"Skipping posting for {violation.summons_number} - no amount due")
            return
        
        if violation.posted_to_ledger:
            logger.warning(f"Violation {violation.summons_number} already posted")
            return
        
        try:
            # Determine payment period (Sunday-Saturday containing issue_date)
            issue_date = violation.issue_date
            days_since_sunday = (issue_date.weekday() + 1) % 7
            period_start = (issue_date - timedelta(days=days_since_sunday)).replace(
                hour=0, minute=0, second=0, microsecond=0
            )
            period_end = (period_start + timedelta(days=6)).replace(
                hour=23, minute=59, second=59, microsecond=999999
            )
            
            # Create obligation in ledger
            posting, balance = self.ledger_service.create_obligation(
                driver_id=violation.driver_id,
                lease_id=violation.lease_id,
                category=PostingCategory.PVB,
                amount=violation.amount_due,
                reference_type='PVB_VIOLATION',
                reference_id=str(violation.id),
                payment_period_start=period_start,
                payment_period_end=period_end,
                due_date=period_end,
                description=f"PVB violation {violation.summons_number} - {violation.violation_description or 'Parking violation'}"
            )
            
            # Update violation
            violation.posted_to_ledger = True
            violation.ledger_balance_id = balance.balance_id
            violation.posting_status = PostingStatus.POSTED
            violation.posted_at = datetime.utcnow()
            
            self.violation_repo.update(violation)
            
            logger.info(f"Posted violation {violation.summons_number} to ledger: {balance.balance_id}")
            
        except Exception as e:
            logger.error(f"Failed to post violation {violation.summons_number}: {str(e)}")
            raise PVBPostingError(f"Ledger posting failed: {str(e)}") from e
    
    def create_manual_violation(
        self,
        data: Dict[str, Any],
        created_by_user_id: int,
        perform_matching: bool = True,
        post_to_ledger: bool = True
    ) -> PVBViolation:
        """Create violation manually (from mail/email)"""
        try:
            # Check for duplicate
            if self.violation_repo.exists_by_summons(data['summons_number']):
                raise PVBDuplicateError(f"Summons {data['summons_number']} already exists")
            
            # Generate batch ID for manual entry
            batch_id = f"PVB-MANUAL-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
            
            # Calculate amount due
            amount_due = (
                data.get('fine_amount', Decimal('0.00')) +
                data.get('penalty_amount', Decimal('0.00')) +
                data.get('interest_amount', Decimal('0.00')) -
                data.get('reduction_amount', Decimal('0.00')) -
                data.get('payment_amount', Decimal('0.00'))
            )
            
            # Create violation
            violation = PVBViolation(
                summons_number=data['summons_number'],
                plate_number=data['plate_number'],
                state=data.get('state'),
                vehicle_type=data.get('vehicle_type'),
                violation_code=data.get('violation_code'),
                violation_description=data.get('violation_description'),
                issue_date=data['issue_date'],
                county=data.get('county'),
                street_name=data.get('street_name'),
                house_number=data.get('house_number'),
                intersect_street=data.get('intersect_street'),
                fine_amount=data.get('fine_amount', Decimal('0.00')),
                penalty_amount=data.get('penalty_amount', Decimal('0.00')),
                interest_amount=data.get('interest_amount', Decimal('0.00')),
                reduction_amount=data.get('reduction_amount', Decimal('0.00')),
                payment_amount=data.get('payment_amount', Decimal('0.00')),
                amount_due=amount_due,
                judgment=data.get('judgment'),
                penalty_warning=data.get('penalty_warning'),
                mapping_method=MappingMethod.UNKNOWN,
                posted_to_ledger=False,
                posting_status=PostingStatus.NOT_POSTED,
                violation_status=ViolationStatus.OPEN,
                resolution_status=ResolutionStatus.PENDING,
                import_batch_id=batch_id,
                import_source=ImportSource.MANUAL_ENTRY,
                created_by=created_by_user_id,
                mapping_notes=data.get('notes')
            )
            
            violation = self.violation_repo.create(violation)
            
            # Perform matching if requested
            if perform_matching:
                self._match_violation_to_entities(violation)
            
            # Post to ledger if requested and mapped
            if post_to_ledger and violation.driver_id and violation.lease_id:
                self._post_violation_to_ledger(violation)
            
            self.db.commit()
            
            logger.info(f"Created manual violation: {violation.summons_number}")
            return violation
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to create manual violation: {str(e)}")
            raise
    
    def remap_violation_manually(
        self,
        violation_id: int,
        driver_id: int,
        lease_id: int,
        reason: str,
        assigned_by_user_id: int,
        notes: Optional[str] = None
    ) -> PVBViolation:
        """Manually remap violation to different driver/lease"""
        violation = self.violation_repo.get_by_id(violation_id)
        if not violation:
            raise PVBNotFoundException(f"Violation {violation_id} not found")
        
        # Verify entities exist
        driver = self.db.query(Driver).filter(Driver.id == driver_id).first()
        if not driver:
            raise ValueError(f"Driver {driver_id} not found")
        
        lease = self.db.query(Lease).filter(Lease.id == lease_id).first()
        if not lease:
            raise ValueError(f"Lease {lease_id} not found")
        
        try:
            # Store previous mapping
            previous_driver = violation.driver_id
            previous_lease = violation.lease_id
            previous_balance_id = violation.ledger_balance_id
            
            # Void previous ledger posting if exists
            if violation.posted_to_ledger and violation.ledger_balance_id:
                try:
                    # Find the posting by balance reference
                    from app.ledger.repository import LedgerPostingRepository
                    posting_repo = LedgerPostingRepository(self.db)
                    postings = posting_repo.get_by_source('PVB_VIOLATION', str(violation.id))
                    
                    for posting in postings:
                        if posting.status.value != 'VOIDED':
                            self.ledger_service.void_posting(
                                posting_id=posting.posting_id,
                                reason=f"Remapped to different driver: {reason}",
                                user_id=assigned_by_user_id
                            )
                    
                    violation.posted_to_ledger = False
                    violation.posting_status = PostingStatus.NOT_POSTED
                    violation.ledger_balance_id = None
                    
                except Exception as e:
                    logger.error(f"Failed to void previous posting: {str(e)}")
            
            # Update violation mapping
            violation.driver_id = driver_id
            violation.lease_id = lease_id
            violation.mapping_method = MappingMethod.MANUAL_ASSIGNMENT
            violation.mapping_confidence = Decimal('1.00')
            violation.manually_assigned_by = assigned_by_user_id
            violation.manually_assigned_at = datetime.utcnow()
            
            remap_notes = f"Remapped from driver={previous_driver}, lease={previous_lease}. Reason: {reason}"
            if notes:
                remap_notes += f". Notes: {notes}"
            violation.mapping_notes = remap_notes
            
            # Create new ledger posting
            if violation.amount_due > 0:
                self._post_violation_to_ledger(violation)
            
            self.violation_repo.update(violation)
            self.db.commit()
            
            logger.info(f"Remapped violation {violation.summons_number} to driver {driver_id}, lease {lease_id}")
            return violation
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to remap violation: {str(e)}")
            raise PVBMappingError(f"Remapping failed: {str(e)}") from e