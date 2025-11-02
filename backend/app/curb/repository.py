"""
app/curb/repository.py

Repository layer for CURB data access
"""

from datetime import date, datetime
from typing import List, Optional, Tuple
from decimal import Decimal

from sqlalchemy import func, and_, or_
from sqlalchemy.orm import Session

from app.curb.models import (
    CurbTrip, CurbTransaction, CurbImportHistory,
    PaymentType, MappingMethod, ImportStatus
)

# === CURB Trip Repository ===

class CurbTripRepository:
    """Repository for CURB trip operations"""

    def __init__(self, db: Session):
        self.db = db

    def create(self, trip: CurbTrip) -> CurbTrip:
        """Create a new trip"""
        self.db.add(trip)
        self.db.flush()
        return trip
    
    def create_bulk(self, trips: List[CurbTrip]) -> List[CurbTrip]:
        """Create multiple trips"""
        self.db.add_all(trips)
        self.db.flush()
        return trips
    
    def get_by_id(self, trip_id: int) -> Optional[CurbTrip]:
        """Get trip by ID"""
        return self.db.query(CurbTrip).filter(CurbTrip.id == trip_id).first()
    
    def get_by_record_and_period(self, record_id: str, period: str) -> Optional[CurbTrip]:
        """Get trip by CURB record ID and period"""
        return self.db.query(CurbTrip).filter(
            and_(
                CurbTrip.record_id == record_id,
                CurbTrip.period == period
            )
        ).first()
    
    def exists_by_record_and_period(self, record_id: str, period: str) -> bool:
        """Check if trip exists"""
        return self.db.query(
            self.db.query(CurbTrip).filter(
                and_(
                    CurbTrip.record_id == record_id,
                    CurbTrip.period == period
                )
            ).exists()
        ).scalar()
    
    def get_trips_by_filters(
        self,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
        driver_id: Optional[int] = None,
        medallion_id: Optional[int] = None,
        vehicle_id: Optional[int] = None,
        lease_id: Optional[int] = None,
        payment_type: Optional[PaymentType] = None,
        posted_to_ledger: Optional[bool] = None,
        mapping_method: Optional[MappingMethod] = None,
        limit: int = 50,
        offset: int = 0
    ) -> Tuple[List[CurbTrip], int]:
        """Get trips with filters and pagination"""
        query = self.db.query(CurbTrip)
        
        # Apply filters
        if date_from:
            query = query.filter(CurbTrip.start_datetime >= datetime.combine(date_from, datetime.min.time()))
        if date_to:
            query = query.filter(CurbTrip.start_datetime <= datetime.combine(date_to, datetime.max.time()))
        if driver_id:
            query = query.filter(CurbTrip.driver_id == driver_id)
        if medallion_id:
            query = query.filter(CurbTrip.medallion_id == medallion_id)
        if vehicle_id:
            query = query.filter(CurbTrip.vehicle_id == vehicle_id)
        if lease_id:
            query = query.filter(CurbTrip.lease_id == lease_id)
        if payment_type:
            query = query.filter(CurbTrip.payment_type == payment_type)
        if posted_to_ledger is not None:
            query = query.filter(CurbTrip.posted_to_ledger == posted_to_ledger)
        if mapping_method:
            query = query.filter(CurbTrip.mapping_method == mapping_method)
        
        # Get total count
        total = query.count()
        
        # Apply pagination and ordering
        trips = query.order_by(CurbTrip.start_datetime.desc()).limit(limit).offset(offset).all()
        
        return trips, total
    
    def get_trips_for_payment_period(
        self,
        payment_period_start: date,
        payment_period_end: date,
        driver_id: Optional[int] = None,
        lease_id: Optional[int] = None
    ) -> List[CurbTrip]:
        """Get trips for a specific payment period"""
        query = self.db.query(CurbTrip).filter(
            and_(
                CurbTrip.payment_period_start == payment_period_start,
                CurbTrip.payment_period_end == payment_period_end
            )
        )
        
        if driver_id:
            query = query.filter(CurbTrip.driver_id == driver_id)
        if lease_id:
            query = query.filter(CurbTrip.lease_id == lease_id)
        
        return query.order_by(CurbTrip.start_datetime).all()
    
    def get_unmapped_trips(self, limit: int = 100) -> List[CurbTrip]:
        """Get trips that haven't been mapped to entities"""
        return self.db.query(CurbTrip).filter(
            or_(
                CurbTrip.driver_id.is_(None),
                CurbTrip.lease_id.is_(None)
            )
        ).limit(limit).all()
    
    def get_unposted_trips(self, limit: int = 100) -> List[CurbTrip]:
        """Get trips that haven't been posted to ledger"""
        return self.db.query(CurbTrip).filter(
            and_(
                CurbTrip.posted_to_ledger == False,
                CurbTrip.driver_id.isnot(None),
                CurbTrip.lease_id.isnot(None)
            )
        ).limit(limit).all()
    
    def update(self, trip: CurbTrip) -> CurbTrip:
        """Update trip"""
        self.db.flush()
        return trip
    
    def get_statistics(
        self,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
        driver_id: Optional[int] = None,
        lease_id: Optional[int] = None
    ) -> dict:
        """Get trip statistics"""
        query = self.db.query(CurbTrip)
        
        if date_from:
            query = query.filter(CurbTrip.start_datetime >= datetime.combine(date_from, datetime.min.time()))
        if date_to:
            query = query.filter(CurbTrip.start_datetime <= datetime.combine(date_to, datetime.max.time()))
        if driver_id:
            query = query.filter(CurbTrip.driver_id == driver_id)
        if lease_id:
            query = query.filter(CurbTrip.lease_id == lease_id)
        
        # Get aggregate statistics
        stats = query.with_entities(
            func.count(CurbTrip.id).label('total_trips'),
            func.sum(CurbTrip.total_amount).label('total_earnings'),
            func.sum(CurbTrip.ehail_fee + CurbTrip.health_fee + 
                    CurbTrip.congestion_fee + CurbTrip.airport_fee + 
                    CurbTrip.cbdt_fee).label('total_taxes'),
            func.avg(CurbTrip.total_amount).label('avg_trip_amount')
        ).first()
        
        # Count by payment type
        cc_count = query.filter(CurbTrip.payment_type == PaymentType.CREDIT_CARD).count()
        cash_count = query.filter(CurbTrip.payment_type == PaymentType.CASH).count()
        
        # Count by status
        posted_count = query.filter(CurbTrip.posted_to_ledger == True).count()
        mapped_count = query.filter(CurbTrip.driver_id.isnot(None)).count()
        
        return {
            'total_trips': stats.total_trips or 0,
            'total_credit_card_trips': cc_count,
            'total_cash_trips': cash_count,
            'total_earnings': stats.total_earnings or Decimal('0'),
            'total_taxes': stats.total_taxes or Decimal('0'),
            'avg_trip_amount': stats.avg_trip_amount or Decimal('0'),
            'trips_posted_to_ledger': posted_count,
            'trips_not_posted': stats.total_trips - posted_count if stats.total_trips else 0,
            'trips_mapped': mapped_count,
            'trips_unmapped': stats.total_trips - mapped_count if stats.total_trips else 0
        }
    
# === CURB Transaction Repository ===

class CurbTransactionRepository:
    """Repository for CURB transaction operations"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def create(self, transaction: CurbTransaction) -> CurbTransaction:
        """Create a new transaction"""
        self.db.add(transaction)
        self.db.flush()
        return transaction
    
    def create_bulk(self, transactions: List[CurbTransaction]) -> List[CurbTransaction]:
        """Create multiple transactions"""
        self.db.add_all(transactions)
        self.db.flush()
        return transactions
    
    def get_by_row_id(self, row_id: str) -> Optional[CurbTransaction]:
        """Get transaction by CURB ROWID"""
        return self.db.query(CurbTransaction).filter(
            CurbTransaction.row_id == row_id
        ).first()
    
    def exists_by_row_id(self, row_id: str) -> bool:
        """Check if transaction exists"""
        return self.db.query(
            self.db.query(CurbTransaction).filter(
                CurbTransaction.row_id == row_id
            ).exists()
        ).scalar()
    
    def get_transactions_by_date_range(
        self,
        date_from: date,
        date_to: date,
        cab_number: Optional[str] = None
    ) -> List[CurbTransaction]:
        """Get transactions by date range"""
        query = self.db.query(CurbTransaction).filter(
            and_(
                CurbTransaction.transaction_date >= datetime.combine(date_from, datetime.min.time()),
                CurbTransaction.transaction_date <= datetime.combine(date_to, datetime.max.time())
            )
        )
        
        if cab_number:
            query = query.filter(CurbTransaction.cab_number == cab_number)
        
        return query.order_by(CurbTransaction.transaction_date).all()
    
# === Import History Repository ===

class CurbImportHistoryRepository:
    """Repository for import history operations"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def create(self, history: CurbImportHistory) -> CurbImportHistory:
        """Create import history record"""
        self.db.add(history)
        self.db.flush()
        return history
    
    def get_by_batch_id(self, batch_id: str) -> Optional[CurbImportHistory]:
        """Get history by batch ID"""
        return self.db.query(CurbImportHistory).filter(
            CurbImportHistory.batch_id == batch_id
        ).first()
    
    def get_recent_imports(self, limit: int = 20) -> List[CurbImportHistory]:
        """Get recent import history"""
        return self.db.query(CurbImportHistory).order_by(
            CurbImportHistory.started_at.desc()
        ).limit(limit).all()
    
    def get_imports_by_date_range(
        self,
        date_from: date,
        date_to: date
    ) -> List[CurbImportHistory]:
        """Get imports covering a date range"""
        return self.db.query(CurbImportHistory).filter(
            and_(
                CurbImportHistory.date_from <= date_to,
                CurbImportHistory.date_to >= date_from
            )
        ).order_by(CurbImportHistory.started_at.desc()).all()
    
    def get_failed_imports(self, limit: int = 10) -> List[CurbImportHistory]:
        """Get failed imports"""
        return self.db.query(CurbImportHistory).filter(
            CurbImportHistory.status == ImportStatus.FAILED
        ).order_by(CurbImportHistory.started_at.desc()).limit(limit).all()
    
    def update(self, history: CurbImportHistory) -> CurbImportHistory:
        """Update import history"""
        self.db.flush()
        return history