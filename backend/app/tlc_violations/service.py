"""
app/tlc_violations/service.py

Service layer for TLC Violations business logic
Handles violation management, CURB matching, and ledger integration
"""

from datetime import datetime, date, time, timedelta
from decimal import Decimal
from typing import List, Optional, Tuple, Dict, Any
import traceback

from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.tlc_violations.models import (
    TLCViolation, TLCViolationDocument,
    ViolationType, ViolationStatus, HearingLocation,
    Disposition, Borough, PostingStatus
)
from app.tlc_violations.repository import (
    TLCViolationRepository, TLCViolationDocumentRepository
)
from app.tlc_violations.exceptions import *

# Import existing models
from app.drivers.models import Driver
from app.vehicles.models import Vehicle
from app.medallions.models import Medallion
from app.leases.models import Lease
from app.curb.models import CurbTrip

# Import ledger service
from app.ledger.service import LedgerService
from app.ledger.models import PostingCategory, PostingType

from app.utils.logger import get_logger

logger = get_logger(__name__)


class TLCViolationService:
    """Service for TLC violation business logic"""

    def __init__(self, db: Session):
        self.db = db
        self.violation_repo = TLCViolationRepository(db)
        self.document_repo = TLCViolationDocumentRepository(db)
        self.ledger_service = LedgerService(db)

    def generate_violation_id(self) -> str:
        """Generate unique violation ID"""
        year = datetime.now().year
        prefix = f"TLC-{year}-"
        
        # Get the latest violation for current year
        latest = self.db.query(TLCViolation).filter(
            TLCViolation.violation_id.like(f"{prefix}%")
        ).order_by(TLCViolation.id.desc()).first()
        
        if latest:
            last_num = int(latest.violation_id.split("-")[-1])
            new_num = last_num + 1
        else:
            new_num = 1
        
        return f"{prefix}{new_num:06d}"

    def generate_document_id(self) -> str:
        """Generate unique document ID"""
        year = datetime.now().year
        prefix = f"TLCDOC-{year}-"
        
        # Get the latest document for current year
        latest = self.db.query(TLCViolationDocument).filter(
            TLCViolationDocument.document_id.like(f"{prefix}%")
        ).order_by(TLCViolationDocument.id.desc()).first()
        
        if latest:
            last_num = int(latest.document_id.split("-")[-1])
            new_num = last_num + 1
        else:
            new_num = 1
        
        return f"{prefix}{new_num:06d}"

    def create_violation(
        self,
        summons_number: str,
        tlc_license_number: str,
        respondent_name: str,
        occurrence_date: date,
        occurrence_time: time,
        occurrence_place: Optional[str],
        borough: Borough,
        rule_section: str,
        violation_type: ViolationType,
        violation_description: str,
        fine_amount: Decimal,
        penalty_notes: Optional[str],
        hearing_date: Optional[date],
        hearing_time: Optional[time],
        hearing_location: Optional[HearingLocation],
        medallion_id: int,
        driver_id: Optional[int],
        vehicle_id: Optional[int],
        lease_id: Optional[int],
        admin_notes: Optional[str],
        created_by_user_id: Optional[int],
        auto_match_curb: bool = True
    ) -> TLCViolation:
        """
        Create a new TLC violation
        
        Process:
        1. Validate entities
        2. Check for duplicate summons
        3. Attempt CURB matching if driver not provided
        4. Create violation record
        """
        logger.info(f"Creating TLC violation for summons {summons_number}")
        
        # Check for duplicate summons number
        existing = self.violation_repo.get_by_summons_number(summons_number)
        if existing:
            raise TLCViolationAlreadyExistsError(
                f"Violation with summons number {summons_number} already exists"
            )
        
        # Validate medallion
        medallion = self._validate_medallion(medallion_id)
        
        # Validate driver if provided
        if driver_id:
            driver = self._validate_driver(driver_id)
            # If driver provided, try to find active lease
            if not lease_id:
                lease_id = self._find_active_lease_for_driver(driver_id, occurrence_date)
        
        # Validate vehicle if provided
        if vehicle_id:
            vehicle = self._validate_vehicle(vehicle_id)
        
        # Validate lease if provided
        if lease_id:
            lease = self._validate_lease(lease_id)
        
        # Attempt CURB matching if driver not provided and auto_match enabled
        curb_trip_id = None
        mapped_via_curb = False
        
        if not driver_id and auto_match_curb:
            try:
                curb_match = self._match_to_curb_trip(
                    medallion_id=medallion_id,
                    occurrence_date=occurrence_date,
                    occurrence_time=occurrence_time
                )
                if curb_match:
                    driver_id = curb_match["driver_id"]
                    vehicle_id = curb_match.get("vehicle_id")
                    lease_id = curb_match.get("lease_id")
                    curb_trip_id = curb_match.get("curb_trip_id")
                    mapped_via_curb = True
                    logger.info(f"Auto-matched violation to driver {driver_id} via CURB")
            except Exception as e:
                logger.warning(f"CURB matching failed: {str(e)}")
        
        # Create violation
        violation = TLCViolation(
            violation_id=self.generate_violation_id(),
            summons_number=summons_number,
            tlc_license_number=tlc_license_number,
            respondent_name=respondent_name,
            occurrence_date=occurrence_date,
            occurrence_time=occurrence_time,
            occurrence_place=occurrence_place,
            borough=borough,
            rule_section=rule_section,
            violation_type=violation_type,
            violation_description=violation_description,
            fine_amount=fine_amount,
            penalty_notes=penalty_notes,
            hearing_date=hearing_date,
            hearing_time=hearing_time,
            hearing_location=hearing_location,
            medallion_id=medallion_id,
            driver_id=driver_id,
            vehicle_id=vehicle_id,
            lease_id=lease_id,
            curb_trip_id=curb_trip_id,
            mapped_via_curb=mapped_via_curb,
            admin_notes=admin_notes,
            status=ViolationStatus.NEW,
            disposition=Disposition.PENDING,
            created_by_user_id=created_by_user_id,
            created_on=datetime.utcnow()
        )
        
        violation = self.violation_repo.create(violation)
        logger.info(f"Created TLC violation {violation.violation_id}")
        
        return violation

    def update_violation(
        self,
        violation_id: int,
        respondent_name: Optional[str] = None,
        occurrence_place: Optional[str] = None,
        borough: Optional[Borough] = None,
        rule_section: Optional[str] = None,
        violation_type: Optional[ViolationType] = None,
        violation_description: Optional[str] = None,
        fine_amount: Optional[Decimal] = None,
        penalty_notes: Optional[str] = None,
        hearing_date: Optional[date] = None,
        hearing_time: Optional[time] = None,
        hearing_location: Optional[HearingLocation] = None,
        status: Optional[ViolationStatus] = None,
        admin_notes: Optional[str] = None,
        updated_by_user_id: Optional[int] = None
    ) -> TLCViolation:
        """
        Update violation details
        Cannot update if posted to ledger or voided
        """
        violation = self._get_violation_or_raise(violation_id)
        
        # Check if can be updated
        if violation.is_voided:
            raise TLCViolationAlreadyVoidedError(
                f"Cannot update voided violation {violation.violation_id}"
            )
        
        if violation.posted_to_ledger:
            raise TLCViolationAlreadyPostedError(
                f"Cannot update posted violation {violation.violation_id}. "
                f"Please void and recreate if correction needed."
            )
        
        # Update fields if provided
        if respondent_name is not None:
            violation.respondent_name = respondent_name
        if occurrence_place is not None:
            violation.occurrence_place = occurrence_place
        if borough is not None:
            violation.borough = borough
        if rule_section is not None:
            violation.rule_section = rule_section
        if violation_type is not None:
            violation.violation_type = violation_type
        if violation_description is not None:
            violation.violation_description = violation_description
        if fine_amount is not None:
            if fine_amount <= 0:
                raise TLCViolationValidationError("Fine amount must be greater than 0")
            violation.fine_amount = fine_amount
        if penalty_notes is not None:
            violation.penalty_notes = penalty_notes
        if hearing_date is not None:
            violation.hearing_date = hearing_date
        if hearing_time is not None:
            violation.hearing_time = hearing_time
        if hearing_location is not None:
            violation.hearing_location = hearing_location
        if status is not None:
            violation.status = status
        if admin_notes is not None:
            violation.admin_notes = admin_notes
        
        violation.updated_by_user_id = updated_by_user_id
        violation.updated_on = datetime.utcnow()
        
        violation = self.violation_repo.update(violation)
        logger.info(f"Updated TLC violation {violation.violation_id}")
        
        return violation

    def update_disposition(
        self,
        violation_id: int,
        disposition: Disposition,
        disposition_date: date,
        disposition_notes: Optional[str],
        updated_by_user_id: Optional[int]
    ) -> TLCViolation:
        """Update hearing disposition"""
        violation = self._get_violation_or_raise(violation_id)
        
        if violation.is_voided:
            raise TLCViolationAlreadyVoidedError(
                f"Cannot update disposition for voided violation {violation.violation_id}"
            )
        
        violation.disposition = disposition
        violation.disposition_date = disposition_date
        violation.disposition_notes = disposition_notes
        
        # Update status based on disposition
        if disposition in [Disposition.PAID, Disposition.DISMISSED]:
            violation.status = ViolationStatus.RESOLVED
        elif disposition == Disposition.GUILTY:
            violation.status = ViolationStatus.DECISION_RECEIVED
        
        violation.updated_by_user_id = updated_by_user_id
        violation.updated_on = datetime.utcnow()
        
        violation = self.violation_repo.update(violation)
        logger.info(f"Updated disposition for violation {violation.violation_id} to {disposition.value}")
        
        return violation

    def _validate_driver(self, driver_id: int) -> Driver:
        """Validate driver exists"""
        driver = self.db.query(Driver).filter(Driver.id == driver_id).first()
        if not driver:
            raise TLCViolationDriverNotFoundError(f"Driver {driver_id} not found")
        return driver

    def _validate_vehicle(self, vehicle_id: int) -> Vehicle:
        """Validate vehicle exists"""
        vehicle = self.db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
        if not vehicle:
            raise TLCViolationVehicleNotFoundError(f"Vehicle {vehicle_id} not found")
        return vehicle

    def _validate_medallion(self, medallion_id: int) -> Medallion:
        """Validate medallion exists"""
        medallion = self.db.query(Medallion).filter(Medallion.id == medallion_id).first()
        if not medallion:
            raise TLCViolationMedallionNotFoundError(f"Medallion {medallion_id} not found")
        return medallion

    def _validate_lease(self, lease_id: int) -> Lease:
        """Validate lease exists"""
        lease = self.db.query(Lease).filter(Lease.id == lease_id).first()
        if not lease:
            raise TLCViolationLeaseNotFoundError(f"Lease {lease_id} not found")
        return lease

    def _find_active_lease_for_driver(self, driver_id: int, as_of_date: date) -> Optional[int]:
        """Find active lease for driver on given date"""
        lease = self.db.query(Lease).filter(
            Lease.lease_driver[0].driver_id == driver_id,
            Lease.lease_start_date <= as_of_date,
            or_(Lease.lease_end_date.is_(None), Lease.lease_end_date >= as_of_date)
        ).first()
        return lease.id if lease else None

    def _get_violation_or_raise(self, violation_id: int) -> TLCViolation:
        """Get violation or raise exception"""
        violation = self.violation_repo.get_by_id(violation_id)
        if not violation:
            raise TLCViolationNotFoundError(f"Violation {violation_id} not found")
        return violation

    def _match_to_curb_trip(
        self,
        medallion_id: int,
        occurrence_date: date,
        occurrence_time: time
    ) -> Optional[Dict[str, Any]]:
        """
        Match violation to CURB trip using time window
        
        Logic:
        1. Find vehicle by medallion
        2. Search CURB trips within ±30 min window
        3. Return best match with driver info
        """
        # Find vehicle linked to medallion
        vehicle = self.db.query(Vehicle).filter(
            Vehicle.medallion_id == medallion_id
        ).first()
        
        if not vehicle:
            logger.warning(f"No vehicle found for medallion {medallion_id}")
            return None
        
        # Combine date and time
        occurrence_datetime = datetime.combine(occurrence_date, occurrence_time)
        
        # Search window: ±30 minutes
        window_start = occurrence_datetime - timedelta(minutes=30)
        window_end = occurrence_datetime + timedelta(minutes=30)
        
        # Find CURB trips in window
        trips = self.db.query(CurbTrip).filter(
            CurbTrip.vehicle_id == vehicle.id,
            CurbTrip.start_datetime >= window_start,
            CurbTrip.start_datetime <= window_end
        ).all()
        
        if not trips:
            logger.info(f"No CURB trips found in time window for vehicle {vehicle.id}")
            return None
        
        # Return the closest trip
        best_trip = min(trips, key=lambda t: abs((t.trip_start_time - occurrence_datetime).total_seconds()))
        
        # Find active lease for the driver at that time
        lease = self.db.query(Lease).filter(
            Lease.driver_id == best_trip.driver_id,
            Lease.start_date <= occurrence_date,
            or_(Lease.end_date.is_(None), Lease.end_date >= occurrence_date)
        ).first()
        
        return {
            "driver_id": best_trip.driver_id,
            "vehicle_id": vehicle.id,
            "lease_id": lease.id if lease else None,
            "curb_trip_id": best_trip.id,
            "confidence": 0.85  # High confidence for time-window match
        }

    def remap_violation(
        self,
        violation_id: int,
        new_driver_id: int,
        new_lease_id: Optional[int],
        reason: str,
        updated_by_user_id: Optional[int]
    ) -> TLCViolation:
        """
        Remap violation to different driver
        Requires voiding and reposting if already posted to ledger
        """
        violation = self._get_violation_or_raise(violation_id)
        
        if violation.is_voided:
            raise TLCViolationAlreadyVoidedError(
                f"Cannot remap voided violation {violation.violation_id}"
            )
        
        # Validate new driver
        new_driver = self._validate_driver(new_driver_id)
        
        # Validate new lease if provided
        if new_lease_id:
            new_lease = self._validate_lease(new_lease_id)
        else:
            # Try to find active lease for new driver
            new_lease_id = self._find_active_lease_for_driver(
                new_driver_id,
                violation.occurrence_date
            )
        
        # If already posted, need to void and repost
        if violation.posted_to_ledger:
            logger.info(f"Violation {violation.violation_id} already posted, voiding first")
            
            try:
                # Create reversal posting
                original_posting, reversal_posting = self.ledger_service.void_posting(
                    posting_id=violation.ledger_posting_id,
                    reason=f"Remapping violation to driver {new_driver_id}: {reason}",
                    user_id=updated_by_user_id
                )
                
                violation.reversal_posting_id = reversal_posting.posting_id
                violation.posted_to_ledger = False
                violation.posting_status = PostingStatus.PENDING
                
            except Exception as e:
                logger.error(f"Failed to void posting for remapping: {str(e)}")
                raise TLCViolationRemapError(f"Failed to void existing posting: {str(e)}") from e
        
        # Update driver and lease
        old_driver_id = violation.driver_id
        violation.driver_id = new_driver_id
        violation.lease_id = new_lease_id
        violation.mapped_via_curb = False  # Manual remapping
        violation.curb_trip_id = None
        
        # Add to admin notes
        remap_note = (
            f"\n[{datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')}] "
            f"Remapped from driver {old_driver_id} to {new_driver_id}. "
            f"Reason: {reason}"
        )
        violation.admin_notes = (violation.admin_notes or "") + remap_note
        
        violation.updated_by_user_id = updated_by_user_id
        violation.updated_on = datetime.utcnow()
        
        violation = self.violation_repo.update(violation)
        logger.info(f"Remapped violation {violation.violation_id} to driver {new_driver_id}")
        
        return violation

    def post_to_ledger(
        self,
        violation_id: int,
        posted_by_user_id: Optional[int],
        notes: Optional[str] = None
    ) -> TLCViolation:
        """
        Post violation fine to driver ledger
        
        Creates DEBIT posting in TLC category
        """
        violation = self._get_violation_or_raise(violation_id)
        
        # Validation checks
        if violation.is_voided:
            raise TLCViolationPostingError(
                f"Cannot post voided violation {violation.violation_id}"
            )
        
        if violation.posted_to_ledger:
            raise TLCViolationAlreadyPostedError(
                f"Violation {violation.violation_id} already posted to ledger"
            )
        
        if not violation.driver_id:
            raise TLCViolationPostingError(
                f"Cannot post violation {violation.violation_id} without driver assignment"
            )
        
        if not violation.lease_id:
            raise TLCViolationPostingError(
                f"Cannot post violation {violation.violation_id} without lease assignment"
            )
        
        try:
            logger.info(f"Posting violation {violation.violation_id} to ledger")
            
            # Prepare posting description
            description = (
                f"TLC Violation - {violation.violation_type.value} - "
                f"Summons: {violation.summons_number}"
            )
            if notes:
                description += f" | {notes}"
            
            # Create DEBIT posting via ledger service
            # Convert date objects to datetime objects for ledger service
            occurrence_datetime = datetime.combine(violation.occurrence_date, datetime.min.time())
            due_datetime = datetime.combine(
                violation.hearing_date or violation.occurrence_date, 
                datetime.min.time()
            )
            
            posting, balance = self.ledger_service.create_obligation(
                driver_id=violation.driver_id,
                lease_id=violation.lease_id,
                category=PostingCategory.TLC,
                amount=violation.fine_amount,
                reference_type="TLC_VIOLATION",
                reference_id=violation.violation_id,
                payment_period_start=occurrence_datetime,
                payment_period_end=occurrence_datetime,
                due_date=due_datetime,
                description=description
            )
            
            # Update violation with ledger info
            violation.posted_to_ledger = True
            violation.posting_status = PostingStatus.POSTED
            violation.ledger_posting_id = posting.posting_id
            violation.ledger_balance_id = balance.balance_id
            violation.posted_on = datetime.utcnow()
            violation.posted_by_user_id = posted_by_user_id
            violation.posting_error = None
            
            violation = self.violation_repo.update(violation)
            
            logger.info(
                f"Successfully posted violation {violation.violation_id} to ledger. "
                f"Posting ID: {posting.posting_id}, Balance ID: {balance.balance_id}"
            )
            
            return violation
            
        except Exception as e:
            logger.error(f"Failed to post violation {violation.violation_id}: {str(e)}")
            logger.error(traceback.format_exc())
            
            # Update with error
            violation.posting_status = PostingStatus.FAILED
            violation.posting_error = str(e)[:500]
            self.violation_repo.update(violation)
            
            raise TLCViolationPostingError(f"Failed to post to ledger: {str(e)}")

    def batch_post_to_ledger(
        self,
        violation_ids: List[int],
        posted_by_user_id: Optional[int]
    ) -> Dict[str, Any]:
        """
        Post multiple violations to ledger in batch
        
        Returns summary of successes and failures
        """
        results = {
            "total_requested": len(violation_ids),
            "successful": 0,
            "failed": 0,
            "success_ids": [],
            "failed_ids": [],
            "errors": []
        }
        
        for violation_id in violation_ids:
            try:
                self.post_to_ledger(violation_id, posted_by_user_id)
                results["successful"] += 1
                results["success_ids"].append(violation_id)
                
            except Exception as e:
                results["failed"] += 1
                results["failed_ids"].append(violation_id)
                results["errors"].append({
                    "violation_id": violation_id,
                    "error": str(e)
                })
                logger.error(f"Batch posting failed for violation {violation_id}: {str(e)}")
        
        logger.info(
            f"Batch posting completed: {results['successful']} successful, "
            f"{results['failed']} failed"
        )
        
        return results

    def void_violation(
        self,
        violation_id: int,
        reason: str,
        voided_by_user_id: Optional[int]
    ) -> TLCViolation:
        """
        Void a violation
        If posted to ledger, creates reversal posting
        """
        violation = self._get_violation_or_raise(violation_id)
        
        if violation.is_voided:
            raise TLCViolationAlreadyVoidedError(
                f"Violation {violation.violation_id} already voided"
            )
        
        try:
            # If posted to ledger, create reversal
            if violation.posted_to_ledger and violation.ledger_posting_id:
                logger.info(
                    f"Creating reversal posting for voided violation {violation.violation_id}"
                )
                
                original_posting, reversal_posting = self.ledger_service.void_posting(
                    posting_id=violation.ledger_posting_id,
                    reason=f"TLC Violation voided: {reason}",
                    user_id=voided_by_user_id
                )
                
                violation.reversal_posting_id = reversal_posting.posting_id
            
            # Mark violation as voided
            violation.is_voided = True
            violation.voided_on = datetime.utcnow()
            violation.voided_by_user_id = voided_by_user_id
            violation.void_reason = reason
            violation.status = ViolationStatus.VOIDED
            
            violation = self.violation_repo.update(violation)
            
            logger.info(f"Voided violation {violation.violation_id}")
            
            return violation
            
        except Exception as e:
            logger.error(f"Failed to void violation {violation.violation_id}: {str(e)}")
            raise TLCViolationVoidError(f"Failed to void violation: {str(e)}")

    def upload_document(
        self,
        violation_id: int,
        file_name: str,
        file_path: str,
        file_size: int,
        file_type: str,
        document_type: str,
        description: Optional[str],
        uploaded_by_user_id: Optional[int]
    ) -> TLCViolationDocument:
        """Upload a document for violation"""
        violation = self._get_violation_or_raise(violation_id)
        
        # Validate file size (5MB limit)
        max_size = 5 * 1024 * 1024  # 5MB in bytes
        if file_size > max_size:
            raise TLCViolationDocumentSizeError(
                f"File size {file_size} exceeds maximum of {max_size} bytes"
            )
        
        # Validate file type
        allowed_types = ["application/pdf", "image/jpeg", "image/jpg", "image/png"]
        if file_type not in allowed_types:
            raise TLCViolationDocumentTypeError(
                f"File type {file_type} not allowed. Allowed types: {allowed_types}"
            )
        
        document = TLCViolationDocument(
            document_id=self.generate_document_id(),
            violation_id=violation.id,
            file_name=file_name,
            file_path=file_path,
            file_size=file_size,
            file_type=file_type,
            document_type=document_type,
            description=description,
            uploaded_by_user_id=uploaded_by_user_id,
            uploaded_on=datetime.utcnow()
        )
        
        document = self.document_repo.create(document)
        logger.info(f"Uploaded document {document.document_id} for violation {violation.violation_id}")
        
        return document

    def verify_document(
        self,
        document_id: int,
        verified_by_user_id: Optional[int]
    ) -> TLCViolationDocument:
        """Mark document as verified"""
        document = self.document_repo.get_by_id(document_id)
        if not document:
            raise TLCViolationDocumentNotFoundError(f"Document {document_id} not found")
        
        document.is_verified = True
        document.verified_on = datetime.utcnow()
        document.verified_by_user_id = verified_by_user_id
        
        document = self.document_repo.update(document)
        logger.info(f"Verified document {document.document_id}")
        
        return document

    def get_violation(self, violation_id: int) -> TLCViolation:
        """Get violation by ID"""
        return self._get_violation_or_raise(violation_id)

    def get_violation_with_details(self, violation_id: int) -> TLCViolation:
        """Get violation with all related entities"""
        violation = self.violation_repo.get_with_details(violation_id)
        if not violation:
            raise TLCViolationNotFoundError(f"Violation {violation_id} not found")
        return violation

    def list_violations(
        self,
        filters: Dict[str, Any],
        page: int = 1,
        page_size: int = 50,
        sort_by: str = "occurrence_date",
        sort_order: str = "desc"
    ) -> Tuple[List[TLCViolation], int]:
        """List violations with filters and pagination"""
        return self.violation_repo.find_with_filters(
            page=page,
            page_size=page_size,
            sort_by=sort_by,
            sort_order=sort_order,
            **filters
        )

    def find_unposted_violations(self) -> List[TLCViolation]:
        """Find all violations not posted to ledger"""
        return self.violation_repo.find_unposted()

    def find_unmapped_violations(self) -> List[TLCViolation]:
        """Find violations without driver assignment"""
        return self.violation_repo.find_unmapped()

    def find_upcoming_hearings(self, days_ahead: int = 30) -> List[TLCViolation]:
        """Find violations with upcoming hearings"""
        return self.violation_repo.find_upcoming_hearings(days_ahead)

    def find_overdue_hearings(self) -> List[TLCViolation]:
        """Find violations with overdue hearings"""
        return self.violation_repo.find_overdue_hearings()

    def get_statistics(self) -> Dict[str, Any]:
        """Get violation statistics"""
        return self.violation_repo.get_statistics()

    def get_documents(self, violation_id: int) -> List[TLCViolationDocument]:
        """Get all documents for a violation"""
        violation = self._get_violation_or_raise(violation_id)
        return self.document_repo.find_by_violation(violation.id)