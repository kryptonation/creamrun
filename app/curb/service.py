"""
app/curb/service.py

Service layer for CURB import business logic
Handles import, association, and ledger posting
"""

import json
from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import List, Optional, Tuple
import traceback

from sqlalchemy.orm import Session
from sqlalchemy import and_, or_

from app.curb.models import (
    CurbTrip, CurbTransaction, CurbImportHistory,
    PaymentType, MappingMethod, ImportStatus, ReconciliationStatus
)
from app.curb.repository import (
    CurbTripRepository, CurbTransactionRepository, CurbImportHistoryRepository
)
from app.curb.curb_client import CurbAPIClient
from app.curb.schemas import CurbTripData, CurbTransactionData

# Import existing models
from app.drivers.models import Driver, TLCLicense
from app.medallions.models import Medallion
from app.leases.models import Lease

# Import ledger service for posting
from app.ledger.service import LedgerService
from app.ledger.models import PostingType, PostingCategory

from app.utils.logger import get_logger

logger = get_logger(__name__)


class CurbImportService:
    """
    Service for CURB data import operations
    Orchestrates fetching, association, and ledger posting
    """
    
    def __init__(self, db: Session):
        self.db = db
        self.trip_repo = CurbTripRepository(db)
        self.transaction_repo = CurbTransactionRepository(db)
        self.history_repo = CurbImportHistoryRepository(db)
        self.curb_client = CurbAPIClient()
        self.ledger_service = LedgerService(db)
    
    def import_curb_data(
        self,
        date_from: date,
        date_to: date,
        driver_id: Optional[str] = None,
        cab_number: Optional[str] = None,
        perform_association: bool = True,
        post_to_ledger: bool = True,
        reconcile_with_curb: bool = False,
        triggered_by: str = "API",
        triggered_by_user_id: Optional[int] = None
    ) -> Tuple[CurbImportHistory, List[str]]:
        """
        Main import orchestration method
        
        Returns:
            Tuple of (import_history, error_messages)
        """
        # Generate batch ID
        batch_id = f"CURB-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
        
        # Create import history record
        import_history = CurbImportHistory(
            batch_id=batch_id,
            import_type='DAILY' if not driver_id and not cab_number else 'MANUAL',
            date_from=date_from,
            date_to=date_to,
            driver_id_filter=driver_id,
            cab_number_filter=cab_number,
            status=ImportStatus.IN_PROGRESS,
            started_at=datetime.now(),
            triggered_by=triggered_by,
            triggered_by_user_id=triggered_by_user_id,
            reconciliation_attempted=reconcile_with_curb
        )
        import_history = self.history_repo.create(import_history)
        self.db.commit()
        
        errors = []
        
        try:
            logger.info(f"Starting CURB import batch: {batch_id}")
            
            # Step 1: Fetch trips from CURB API
            trip_data_list = self._fetch_trips_from_curb(
                date_from, date_to, driver_id, cab_number
            )
            import_history.total_trips_fetched = len(trip_data_list)
            
            # Step 2: Fetch transactions from CURB API
            transaction_data_list = self._fetch_transactions_from_curb(
                date_from, date_to, cab_number
            )
            import_history.total_transactions_fetched = len(transaction_data_list)
            
            # Step 3: Import trips into database
            imported_trips, trip_errors = self._import_trips(
                trip_data_list, batch_id
            )
            import_history.total_trips_imported = len(imported_trips)
            import_history.total_trips_failed = len(trip_errors)
            errors.extend(trip_errors)
            
            # Step 4: Import transactions into database
            imported_transactions, trans_errors = self._import_transactions(
                transaction_data_list, batch_id
            )
            import_history.total_transactions_imported = len(imported_transactions)
            errors.extend(trans_errors)
            
            # Step 5: Associate trips to entities (driver, medallion, vehicle, lease)
            if perform_association:
                mapped_count = self._associate_trips_to_entities(imported_trips)
                import_history.total_trips_mapped = mapped_count
            
            # Step 6: Post to ledger
            if post_to_ledger:
                posted_count = self._post_trips_to_ledger(imported_trips)
                import_history.total_trips_posted = posted_count
            
            # Step 7: Reconcile with CURB (if in production and requested)
            if reconcile_with_curb and self.curb_client.is_production:
                success = self._reconcile_with_curb(imported_trips, date_from)
                import_history.reconciliation_successful = success
            
            # Update import history
            import_history.status = ImportStatus.COMPLETED if not errors else ImportStatus.PARTIAL
            import_history.completed_at = datetime.now()
            import_history.duration_seconds = int(
                (import_history.completed_at - import_history.started_at).total_seconds()
            )
            
            if errors:
                import_history.error_details = json.dumps(errors[:100])  # Limit error storage
            
            self.history_repo.update(import_history)
            self.db.commit()
            
            logger.info(f"Completed CURB import batch: {batch_id}")
            return import_history, errors
            
        except Exception as e:
            logger.error(f"CURB import failed: {str(e)}\n{traceback.format_exc()}")
            
            # Update import history as failed
            import_history.status = ImportStatus.FAILED
            import_history.completed_at = datetime.now()
            import_history.duration_seconds = int(
                (import_history.completed_at - import_history.started_at).total_seconds()
            )
            import_history.error_message = str(e)
            import_history.error_details = traceback.format_exc()
            
            self.history_repo.update(import_history)
            self.db.commit()
            
            raise
    
    def _fetch_trips_from_curb(
        self,
        date_from: date,
        date_to: date,
        driver_id: Optional[str],
        cab_number: Optional[str]
    ) -> List[CurbTripData]:
        """Fetch trips from CURB API"""
        try:
            logger.info(f"Fetching trips from CURB: {date_from} to {date_to}")
            trips = self.curb_client.get_trips(
                date_from=date_from,
                date_to=date_to,
                driver_id=driver_id,
                cab_number=cab_number,
                recon_stat=0  # Only unreconciled trips
            )
            return trips
        except Exception as e:
            logger.error(f"Failed to fetch trips from CURB: {str(e)}")
            raise
    
    def _fetch_transactions_from_curb(
        self,
        date_from: date,
        date_to: date,
        cab_number: Optional[str]
    ) -> List[CurbTransactionData]:
        """Fetch transactions from CURB API"""
        try:
            logger.info(f"Fetching transactions from CURB: {date_from} to {date_to}")
            transactions = self.curb_client.get_transactions(
                date_from=date_from,
                date_to=date_to,
                cab_number=cab_number,
                tran_type='AP'  # Approved transactions only
            )
            return transactions
        except Exception as e:
            logger.error(f"Failed to fetch transactions from CURB: {str(e)}")
            # Don't fail import if transactions fetch fails
            return []
    
    def _import_trips(
        self,
        trip_data_list: List[CurbTripData],
        batch_id: str
    ) -> Tuple[List[CurbTrip], List[str]]:
        """Import trip data into database"""
        imported_trips = []
        errors = []
        
        for trip_data in trip_data_list:
            try:
                # Check if trip already exists
                if self.trip_repo.exists_by_record_and_period(
                    trip_data.record_id, trip_data.period
                ):
                    logger.debug(f"Trip {trip_data.record_id}-{trip_data.period} already exists")
                    continue
                
                # Determine payment period (Sunday to Saturday)
                payment_period_start, payment_period_end = self._get_payment_period(
                    trip_data.start_datetime.date()
                )
                
                # Parse payment type
                payment_type = self._parse_payment_type(trip_data.payment_type)
                
                # Create CurbTrip model
                trip = CurbTrip(
                    record_id=trip_data.record_id,
                    period=trip_data.period,
                    cab_number=trip_data.cab_number,
                    driver_id_curb=trip_data.driver_id,
                    num_service=trip_data.num_service,
                    start_datetime=trip_data.start_datetime,
                    end_datetime=trip_data.end_datetime,
                    trip_amount=trip_data.trip_amount,
                    tips=trip_data.tips,
                    extras=trip_data.extras,
                    tolls=trip_data.tolls,
                    tax=trip_data.tax,
                    imp_tax=trip_data.imp_tax,
                    total_amount=trip_data.total_amount,
                    payment_type=payment_type,
                    cc_number=trip_data.cc_number,
                    auth_code=trip_data.auth_code,
                    auth_amount=trip_data.auth_amount,
                    ehail_fee=trip_data.ehail_fee,
                    health_fee=trip_data.health_fee,
                    congestion_fee=trip_data.congestion_fee,
                    airport_fee=trip_data.airport_fee,
                    cbdt_fee=trip_data.cbdt_fee,
                    passenger_count=trip_data.passenger_count,
                    distance_service=trip_data.distance_service,
                    distance_bs=trip_data.distance_bs,
                    reservation_number=trip_data.reservation_number,
                    gps_start_lat=trip_data.gps_start_lat,
                    gps_start_lon=trip_data.gps_start_lon,
                    gps_end_lat=trip_data.gps_end_lat,
                    gps_end_lon=trip_data.gps_end_lon,
                    from_address=trip_data.from_address,
                    to_address=trip_data.to_address,
                    payment_period_start=payment_period_start,
                    payment_period_end=payment_period_end,
                    import_batch_id=batch_id,
                    imported_on=datetime.now(),
                    mapping_method=MappingMethod.UNKNOWN,
                    mapping_confidence=Decimal('0'),
                    posted_to_ledger=False,
                    reconciliation_status=ReconciliationStatus.NOT_RECONCILED
                )
                
                trip = self.trip_repo.create(trip)
                imported_trips.append(trip)
                
            except Exception as e:
                error_msg = f"Failed to import trip {trip_data.record_id}: {str(e)}"
                logger.warning(error_msg)
                errors.append(error_msg)
        
        self.db.flush()
        return imported_trips, errors
    
    def _import_transactions(
        self,
        transaction_data_list: List[CurbTransactionData],
        batch_id: str
    ) -> Tuple[List[CurbTransaction], List[str]]:
        """Import transaction data into database"""
        imported_transactions = []
        errors = []
        
        for trans_data in transaction_data_list:
            try:
                # Check if transaction already exists
                if self.transaction_repo.exists_by_row_id(trans_data.row_id):
                    logger.debug(f"Transaction {trans_data.row_id} already exists")
                    continue
                
                # Create CurbTransaction model
                transaction = CurbTransaction(
                    row_id=trans_data.row_id,
                    transaction_date=trans_data.transaction_date,
                    cab_number=trans_data.cab_number,
                    amount=trans_data.amount,
                    transaction_type=trans_data.transaction_type,
                    card_number=trans_data.card_number,
                    auth_code=trans_data.auth_code,
                    import_batch_id=batch_id,
                    imported_on=datetime.now(),
                    reconciliation_status=ReconciliationStatus.NOT_RECONCILED
                )
                
                transaction = self.transaction_repo.create(transaction)
                imported_transactions.append(transaction)
                
            except Exception as e:
                error_msg = f"Failed to import transaction {trans_data.row_id}: {str(e)}"
                logger.warning(error_msg)
                errors.append(error_msg)
        
        self.db.flush()
        return imported_transactions, errors
    
    def _associate_trips_to_entities(self, trips: List[CurbTrip]) -> int:
        """Associate trips to drivers, medallions, vehicles, and leases"""
        mapped_count = 0
        
        for trip in trips:
            try:
                # Skip if already mapped
                if trip.driver_id and trip.lease_id:
                    mapped_count += 1
                    continue
                
                # Map driver by hack license (driver_id_curb -> TLC license number)
                driver = self._find_driver_by_hack_license(trip.driver_id_curb)
                
                # Map medallion by cab number
                medallion = self._find_medallion_by_cab_number(trip.cab_number)
                
                if driver and medallion:
                    # Find active lease for this driver + medallion at trip time
                    lease = self._find_active_lease(
                        driver.id,
                        medallion.id,
                        trip.start_datetime.date()
                    )
                    
                    if lease:
                        # Successfully mapped to all entities
                        trip.driver_id = driver.id
                        trip.medallion_id = medallion.id
                        trip.vehicle_id = lease.vehicle_id
                        trip.lease_id = lease.id
                        trip.mapping_method = MappingMethod.AUTO_MATCH
                        trip.mapping_confidence = Decimal('1.00')
                        trip.mapping_notes = f"Auto-matched driver {driver.id}, lease {lease.id}"
                        
                        self.trip_repo.update(trip)
                        mapped_count += 1
                    else:
                        # Could not find lease
                        trip.driver_id = driver.id if driver else None
                        trip.medallion_id = medallion.id if medallion else None
                        trip.mapping_method = MappingMethod.UNKNOWN
                        trip.mapping_confidence = Decimal('0.50')
                        trip.mapping_notes = "Driver and medallion found, but no active lease"
                        self.trip_repo.update(trip)
                else:
                    # Partial or no mapping
                    trip.driver_id = driver.id if driver else None
                    trip.medallion_id = medallion.id if medallion else None
                    trip.mapping_method = MappingMethod.UNKNOWN
                    trip.mapping_confidence = Decimal('0.00')
                    trip.mapping_notes = f"Could not map: driver={bool(driver)}, medallion={bool(medallion)}"
                    self.trip_repo.update(trip)
                
            except Exception as e:
                logger.warning(f"Failed to associate trip {trip.id}: {str(e)}")
        
        self.db.flush()
        return mapped_count
    
    def _find_driver_by_hack_license(self, hack_license: str) -> Optional[Driver]:
        """Find driver by TLC hack license number"""
        try:
            # Query TLC license table
            tlc_license = self.db.query(TLCLicense).filter(
                TLCLicense.tlc_license_number == hack_license
            ).first()
            
            if tlc_license:
                # Get associated driver
                driver = self.db.query(Driver).filter(
                    Driver.id == tlc_license.driver_id
                ).first()
                return driver
            
            return None
        except Exception as e:
            logger.warning(f"Error finding driver by hack license {hack_license}: {str(e)}")
            return None
    
    def _find_medallion_by_cab_number(self, cab_number: str) -> Optional[Medallion]:
        """Find medallion by cab/medallion number"""
        try:
            medallion = self.db.query(Medallion).filter(
                Medallion.medallion_number == cab_number
            ).first()
            return medallion
        except Exception as e:
            logger.warning(f"Error finding medallion {cab_number}: {str(e)}")
            return None
    
    def _find_active_lease(
        self,
        driver_id: int,
        medallion_id: int,
        trip_date: date
    ) -> Optional[Lease]:
        """Find active lease for driver + medallion at specific date"""
        try:
            # Query leases table with driver association through lease_drivers
            from app.leases.models import LeaseDriver
            
            lease = self.db.query(Lease).join(
                LeaseDriver, Lease.id == LeaseDriver.lease_id
            ).filter(
                and_(
                    LeaseDriver.driver_id == driver_id,
                    Lease.medallion_id == medallion_id,
                    Lease.lease_start_date <= trip_date,
                    or_(
                        Lease.lease_end_date.is_(None),
                        Lease.lease_end_date >= trip_date
                    ),
                    Lease.lease_status == 'A'  # Active
                )
            ).first()
            
            return lease
        except Exception as e:
            logger.warning(f"Error finding lease: {str(e)}")
            return None
    
    def _post_trips_to_ledger(self, trips: List[CurbTrip]) -> int:
        """Post trips to ledger"""
        posted_count = 0
        
        for trip in trips:
            try:
                # Skip if already posted or not mapped
                if trip.posted_to_ledger or not trip.lease_id:
                    continue
                
                # Only post credit card earnings
                if trip.payment_type != PaymentType.CREDIT_CARD:
                    continue
                
                posting_ids = []
                
                # Convert date to datetime for ledger service
                period_start_dt = datetime.combine(trip.payment_period_start, datetime.min.time())
                period_end_dt = datetime.combine(trip.payment_period_end, datetime.max.time())
                
                # Calculate net earnings (trip amount after taxes)
                net_earnings = trip.total_amount - (
                    trip.ehail_fee + trip.health_fee + trip.congestion_fee +
                    trip.airport_fee + trip.cbdt_fee
                )
                
                # Post earnings as CREDIT
                if net_earnings > 0:
                    earnings_posting = self.ledger_service.create_posting(
                        driver_id=trip.driver_id,
                        lease_id=trip.lease_id,
                        posting_type=PostingType.CREDIT,
                        category=PostingCategory.EARNINGS,
                        amount=net_earnings,
                        source_type='CURB_TRIP',
                        source_id=f"{trip.record_id}-{trip.period}",
                        payment_period_start=period_start_dt,
                        payment_period_end=period_end_dt,
                        vehicle_id=trip.vehicle_id,
                        medallion_id=trip.medallion_id,
                        description=f"CURB trip earnings: {trip.start_datetime.strftime('%Y-%m-%d %H:%M')}"
                    )
                    posting_ids.append(earnings_posting.posting_id)
                
                # Post individual taxes as DEBIT obligations
                # Each tax creates both a posting and a balance automatically
                tax_postings = [
                    ('MTA_TAX', trip.health_fee, "MTA surcharge"),
                    ('TIF', trip.ehail_fee, "TIF improvement fee"),
                    ('CONGESTION', trip.congestion_fee, "Congestion surcharge"),
                    ('AIRPORT_FEE', trip.airport_fee, "Airport access fee"),
                    ('CBDT', trip.cbdt_fee, "Central Business District Toll")
                ]
                
                for tax_name, tax_amount, tax_desc in tax_postings:
                    if tax_amount > 0:
                        # Create tax obligation using create_posting with DEBIT type
                        # The ledger service handles creating both posting and balance
                        tax_posting = self.ledger_service.create_posting(
                            driver_id=trip.driver_id,
                            lease_id=trip.lease_id,
                            posting_type=PostingType.DEBIT,
                            category=PostingCategory.TAXES,
                            amount=tax_amount,
                            source_type='CURB_TAX',
                            source_id=f"{trip.record_id}-{trip.period}-{tax_name}",
                            payment_period_start=period_start_dt,
                            payment_period_end=period_end_dt,
                            vehicle_id=trip.vehicle_id,
                            medallion_id=trip.medallion_id,
                            description=f"{tax_desc} from trip {trip.start_datetime.strftime('%Y-%m-%d %H:%M')}"
                        )
                        posting_ids.append(tax_posting.posting_id)
                
                # Update trip as posted
                trip.posted_to_ledger = True
                trip.posted_on = datetime.now()
                trip.ledger_posting_ids = json.dumps(posting_ids)
                self.trip_repo.update(trip)
                
                posted_count += 1
                
            except Exception as e:
                logger.warning(f"Failed to post trip {trip.id} to ledger: {str(e)}")
                logger.debug(f"Error details: {traceback.format_exc()}")
        
        self.db.flush()
        return posted_count
    
    def _reconcile_with_curb(self, trips: List[CurbTrip], date_from: date) -> bool:
        """Reconcile trips with CURB system"""
        try:
            # Get trip IDs to reconcile
            trip_ids = [trip.record_id for trip in trips if trip.driver_id and trip.lease_id]
            
            if not trip_ids:
                return True
            
            # Generate unique reconciliation ID (batch timestamp)
            recon_id = int(datetime.now().timestamp())
            
            # Call CURB API to reconcile
            success = self.curb_client.reconcile_trips(
                date_from=date_from,
                recon_stat=recon_id,
                trip_ids=trip_ids
            )
            
            if success:
                # Update trip reconciliation status
                for trip in trips:
                    if trip.record_id in trip_ids:
                        trip.reconciliation_status = ReconciliationStatus.RECONCILED
                        trip.reconciled_on = datetime.now()
                        trip.curb_recon_id = str(recon_id)
                        self.trip_repo.update(trip)
                
                self.db.flush()
            
            return success
            
        except Exception as e:
            logger.error(f"Failed to reconcile with CURB: {str(e)}")
            return False
    
    def _parse_payment_type(self, t_value: str) -> PaymentType:
        """Parse CURB payment type"""
        mapping = {
            '$': PaymentType.CASH,
            'C': PaymentType.CREDIT_CARD,
            'P': PaymentType.PRIVATE_CARD
        }
        return mapping.get(t_value, PaymentType.CASH)
    
    def _get_payment_period(self, trip_date: date) -> Tuple[date, date]:
        """
        Get payment period (Sunday to Saturday) for a given date
        Payment periods always run from Sunday 00:00 to Saturday 23:59
        """
        # Find the Sunday of the week containing trip_date
        days_since_sunday = trip_date.weekday()  # Monday=0, Sunday=6
        if trip_date.weekday() == 6:  # Sunday
            period_start = trip_date
        else:
            period_start = trip_date - timedelta(days=days_since_sunday + 1)
        
        # Saturday is 6 days after Sunday
        period_end = period_start + timedelta(days=6)
        
        return period_start, period_end
    
    def remap_trip_manually(
        self,
        trip_id: int,
        driver_id: int,
        lease_id: int,
        reason: str,
        assigned_by: int
    ) -> CurbTrip:
        """Manually remap a trip to different driver/lease"""
        trip = self.trip_repo.get_by_id(trip_id)
        if not trip:
            raise ValueError(f"Trip {trip_id} not found")
        
        # Verify lease exists and get associated entities
        lease = self.db.query(Lease).filter(Lease.id == lease_id).first()
        if not lease:
            raise ValueError(f"Lease {lease_id} not found")
        
        # Verify driver
        driver = self.db.query(Driver).filter(Driver.id == driver_id).first()
        if not driver:
            raise ValueError(f"Driver {driver_id} not found")
        
        # Update trip mapping
        trip.driver_id = driver_id
        trip.lease_id = lease_id
        trip.medallion_id = lease.medallion_id
        trip.vehicle_id = lease.vehicle_id
        trip.mapping_method = MappingMethod.MANUAL_ASSIGNMENT
        trip.mapping_confidence = Decimal('1.00')
        trip.manually_assigned = True
        trip.assigned_by = assigned_by
        trip.assigned_on = datetime.now()
        trip.mapping_notes = f"Manually assigned by user {assigned_by}: {reason}"
        
        # If trip was already posted, we need to void old postings and create new ones
        if trip.posted_to_ledger:
            # Void existing postings and repost
            self._repost_trip_to_ledger(trip)
        
        self.trip_repo.update(trip)
        self.db.commit()
        
        return trip
    
    def _repost_trip_to_ledger(self, trip: CurbTrip):
        """Void existing postings and create new ones for remapped trip"""
        # Parse existing posting IDs
        if trip.ledger_posting_ids:
            try:
                old_posting_ids = json.loads(trip.ledger_posting_ids)
                
                # Void old postings
                for posting_id in old_posting_ids:
                    try:
                        self.ledger_service.void_posting(posting_id)
                    except Exception as e:
                        logger.warning(f"Failed to void posting {posting_id}: {str(e)}")
            except json.JSONDecodeError:
                logger.warning(f"Could not parse ledger_posting_ids for trip {trip.id}")
        
        # Reset posting status
        trip.posted_to_ledger = False
        trip.ledger_posting_ids = None
        trip.posted_on = None
        self.trip_repo.update(trip)
        self.db.flush()
        
        # Post to ledger again with new associations
        self._post_trips_to_ledger([trip])