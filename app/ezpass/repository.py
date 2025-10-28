"""
app/ezpass/repository.py

Data access layer for EZPass transactions
"""

from datetime import date
from typing import List, Optional, Tuple
from decimal import Decimal

from sqlalchemy import func, and_, or_, desc
from sqlalchemy.orm import Session

from app.ezpass.models import (
    EZPassTransaction, EZPassImportHistory,
    MappingMethod, ImportStatus, PostingStatus, ResolutionStatus
)


class EZPassTransactionRepository:
    """Repository for EZPass transaction operations"""

    def __init__(self, db: Session):
        self.db = db

    def create(self, transaction: EZPassTransaction) -> EZPassTransaction:
        """Create a new EZPass transaction"""
        self.db.add(transaction)
        self.db.flush()
        return transaction
    
    def create_bulk(self, transactions: List[EZPassTransaction]) -> List[EZPassTransaction]:
        """Create multiple transactions"""
        self.db.add_all(transactions)
        self.db.flush()
        return transactions
    
    def get_by_id(self, transaction_id: int) -> Optional[EZPassTransaction]:
        """Get transaction by ID with related entities"""
        return self.db.query(EZPassTransaction).filter(
            EZPassTransaction.id == transaction_id
        ).first()
    
    def get_by_ticket_number(self, ticket_number: str) -> Optional[EZPassTransaction]:
        """Get transaction by ticket number"""
        return self.db.query(EZPassTransaction).filter(
            EZPassTransaction.ticket_number == ticket_number
        ).first()
    
    def exists_by_ticket_number(self, ticket_number: str) -> bool:
        """Check if transaction exists"""
        return self.db.query(
            self.db.query(EZPassTransaction).filter(
                EZPassTransaction.ticket_number == ticket_number
            ).exists()
        ).scalar()
    
    def get_transactions_by_filters(
        self,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
        driver_id: Optional[int] = None,
        lease_id: Optional[int] = None,
        vehicle_id: Optional[int] = None,
        medallion_id: Optional[int] = None,
        plate_number: Optional[str] = None,
        mapping_method: Optional[MappingMethod] = None,
        posting_status: Optional[PostingStatus] = None,
        resolution_status: Optional[ResolutionStatus] = None,
        import_batch_id: Optional[str] = None,
        payment_period_start: Optional[date] = None,
        payment_period_end: Optional[date] = None,
        limit: int = 50,
        offset: int = 0,
        sort_by: str = "transaction_date",
        sort_order: str = "desc"
    ) -> Tuple[List[EZPassTransaction], int]:
        """Get transactions with filters, pagination, and sorting"""
        
        query = self.db.query(EZPassTransaction)
        
        # Apply filters
        if date_from:
            query = query.filter(EZPassTransaction.transaction_date >= date_from)
        if date_to:
            query = query.filter(EZPassTransaction.transaction_date <= date_to)
        if driver_id:
            query = query.filter(EZPassTransaction.driver_id == driver_id)
        if lease_id:
            query = query.filter(EZPassTransaction.lease_id == lease_id)
        if vehicle_id:
            query = query.filter(EZPassTransaction.vehicle_id == vehicle_id)
        if medallion_id:
            query = query.filter(EZPassTransaction.medallion_id == medallion_id)
        if plate_number:
            query = query.filter(EZPassTransaction.plate_number.ilike(f"%{plate_number}%"))
        if mapping_method:
            query = query.filter(EZPassTransaction.mapping_method == mapping_method)
        if posting_status:
            query = query.filter(EZPassTransaction.posting_status == posting_status)
        if resolution_status:
            query = query.filter(EZPassTransaction.resolution_status == resolution_status)
        if import_batch_id:
            query = query.filter(EZPassTransaction.import_batch_id == import_batch_id)
        if payment_period_start:
            query = query.filter(EZPassTransaction.payment_period_start == payment_period_start)
        if payment_period_end:
            query = query.filter(EZPassTransaction.payment_period_end == payment_period_end)
        
        # Get total count
        total_count = query.count()
        
        # Apply sorting
        if hasattr(EZPassTransaction, sort_by):
            sort_column = getattr(EZPassTransaction, sort_by)
            if sort_order == "desc":
                query = query.order_by(desc(sort_column))
            else:
                query = query.order_by(sort_column)
        
        # Apply pagination
        query = query.limit(limit).offset(offset)
        
        transactions = query.all()
        return transactions, total_count
    
    def get_unmapped_transactions(
        self,
        limit: int = 100,
        offset: int = 0
    ) -> Tuple[List[EZPassTransaction], int]:
        """Get transactions that haven't been mapped to driver/lease"""
        query = self.db.query(EZPassTransaction).filter(
            or_(
                EZPassTransaction.mapping_method == MappingMethod.UNKNOWN,
                and_(
                    EZPassTransaction.driver_id.is_(None),
                    EZPassTransaction.lease_id.is_(None)
                )
            )
        ).order_by(EZPassTransaction.transaction_date.desc())
        
        total_count = query.count()
        transactions = query.limit(limit).offset(offset).all()
        return transactions, total_count
    
    def get_unposted_transactions(
        self,
        limit: int = 100,
        offset: int = 0
    ) -> Tuple[List[EZPassTransaction], int]:
        """Get mapped transactions that haven't been posted to ledger"""
        query = self.db.query(EZPassTransaction).filter(
            and_(
                EZPassTransaction.posting_status == PostingStatus.NOT_POSTED,
                EZPassTransaction.driver_id.isnot(None),
                EZPassTransaction.lease_id.isnot(None)
            )
        ).order_by(EZPassTransaction.transaction_date.desc())
        
        total_count = query.count()
        transactions = query.limit(limit).offset(offset).all()
        return transactions, total_count
    
    def get_transactions_by_payment_period(
        self,
        driver_id: int,
        lease_id: int,
        period_start: date,
        period_end: date
    ) -> List[EZPassTransaction]:
        """Get all transactions for a driver/lease in a payment period"""
        return self.db.query(EZPassTransaction).filter(
            and_(
                EZPassTransaction.driver_id == driver_id,
                EZPassTransaction.lease_id == lease_id,
                EZPassTransaction.payment_period_start == period_start,
                EZPassTransaction.payment_period_end == period_end
            )
        ).order_by(EZPassTransaction.transaction_date).all()
    
    def update(self, transaction: EZPassTransaction) -> EZPassTransaction:
        """Update transaction"""
        self.db.flush()
        return transaction
    
    def get_statistics(
        self,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
        driver_id: Optional[int] = None,
        lease_id: Optional[int] = None
    ) -> dict:
        """Get aggregated statistics"""
        query = self.db.query(EZPassTransaction)
        
        if date_from:
            query = query.filter(EZPassTransaction.transaction_date >= date_from)
        if date_to:
            query = query.filter(EZPassTransaction.transaction_date <= date_to)
        if driver_id:
            query = query.filter(EZPassTransaction.driver_id == driver_id)
        if lease_id:
            query = query.filter(EZPassTransaction.lease_id == lease_id)
        
        total_transactions = query.count()
        total_toll_amount = query.with_entities(
            func.sum(EZPassTransaction.toll_amount)
        ).scalar() or Decimal('0.00')
        
        mapped_transactions = query.filter(
            EZPassTransaction.mapping_method != MappingMethod.UNKNOWN
        ).count()
        
        unmapped_transactions = query.filter(
            EZPassTransaction.mapping_method == MappingMethod.UNKNOWN
        ).count()
        
        posted_transactions = query.filter(
            EZPassTransaction.posting_status == PostingStatus.POSTED
        ).count()
        
        unposted_transactions = query.filter(
            EZPassTransaction.posting_status == PostingStatus.NOT_POSTED
        ).count()
        
        # Group by mapping method
        by_mapping_method = {}
        for method in MappingMethod:
            count = query.filter(EZPassTransaction.mapping_method == method).count()
            by_mapping_method[method.value] = count
        
        # Group by posting status
        by_posting_status = {}
        for status in PostingStatus:
            count = query.filter(EZPassTransaction.posting_status == status).count()
            by_posting_status[status.value] = count
        
        # Group by agency
        by_agency = {}
        agency_results = self.db.query(
            EZPassTransaction.agency,
            func.count(EZPassTransaction.id).label('count')
        ).filter(
            EZPassTransaction.agency.isnot(None)
        ).group_by(EZPassTransaction.agency).all()
        
        for agency, count in agency_results:
            by_agency[agency] = count
        
        return {
            'total_transactions': total_transactions,
            'total_toll_amount': total_toll_amount,
            'mapped_transactions': mapped_transactions,
            'unmapped_transactions': unmapped_transactions,
            'posted_transactions': posted_transactions,
            'unposted_transactions': unposted_transactions,
            'by_mapping_method': by_mapping_method,
            'by_posting_status': by_posting_status,
            'by_agency': by_agency
        }


class EZPassImportHistoryRepository:
    """Repository for import history operations"""

    def __init__(self, db: Session):
        self.db = db

    def create(self, history: EZPassImportHistory) -> EZPassImportHistory:
        """Create import history record"""
        self.db.add(history)
        self.db.flush()
        return history
    
    def get_by_id(self, history_id: int) -> Optional[EZPassImportHistory]:
        """Get import history by ID"""
        return self.db.query(EZPassImportHistory).filter(
            EZPassImportHistory.id == history_id
        ).first()
    
    def get_by_batch_id(self, batch_id: str) -> Optional[EZPassImportHistory]:
        """Get import history by batch ID"""
        return self.db.query(EZPassImportHistory).filter(
            EZPassImportHistory.batch_id == batch_id
        ).first()
    
    def get_all_imports(
        self,
        status: Optional[ImportStatus] = None,
        limit: int = 50,
        offset: int = 0
    ) -> Tuple[List[EZPassImportHistory], int]:
        """Get all import history records with pagination"""
        query = self.db.query(EZPassImportHistory)
        
        if status:
            query = query.filter(EZPassImportHistory.status == status)
        
        total_count = query.count()
        
        imports = query.order_by(
            desc(EZPassImportHistory.started_at)
        ).limit(limit).offset(offset).all()
        
        return imports, total_count
    
    def update(self, history: EZPassImportHistory) -> EZPassImportHistory:
        """Update import history"""
        self.db.flush()
        return history