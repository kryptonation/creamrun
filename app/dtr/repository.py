# app/dtr/repository.py

from datetime import date
from typing import List, Optional

from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.dtr.models import DTR, DTRStatus


class DTRRepository:
    """
    DTR Repository - Supports lease-based queries
    
    Key Changes:
    - get_by_lease_period: Query by lease and period (not driver)
    - Removed driver_id from unique lookups
    - All methods updated for lease-centric approach
    """
    
    def __init__(self, db: Session):
        self.db = db
    
    def create(self, dtr_data: dict) -> DTR:
        """Create a new DTR"""
        dtr = DTR(**dtr_data)
        self.db.add(dtr)
        self.db.flush()  # Flush to get ID without committing
        return dtr
    
    def get_by_id(self, dtr_id: int) -> Optional[DTR]:
        """Get DTR by ID"""
        return self.db.query(DTR).filter(DTR.id == dtr_id).first()
    
    def get_by_dtr_number(self, dtr_number: str) -> Optional[DTR]:
        """Get DTR by DTR number"""
        return self.db.query(DTR).filter(DTR.dtr_number == dtr_number).first()
    
    def get_by_receipt_number(self, receipt_number: str) -> Optional[DTR]:
        """Get DTR by receipt number"""
        return self.db.query(DTR).filter(DTR.receipt_number == receipt_number).first()
    
    def get_by_lease_period(
        self, 
        lease_id: int, 
        period_start: date, 
        period_end: date
    ) -> Optional[DTR]:
        """
        CORRECTED: Get DTR by lease and period (removed driver_id).
        
        Returns the DTR for the given lease and period.
        Should only return ONE DTR per lease per period due to unique constraint.
        """
        return self.db.query(DTR).filter(
            and_(
                DTR.lease_id == lease_id,
                DTR.period_start_date == period_start,
                DTR.period_end_date == period_end
            )
        ).first()
    
    def check_dtr_exists(
        self, 
        lease_id: int, 
        period_start: date
    ) -> bool:
        """
        CORRECTED: Check if DTR exists for lease and period start.
        
        Simplified - no longer needs driver_id.
        """
        return self.db.query(DTR).filter(
            and_(
                DTR.lease_id == lease_id,
                DTR.period_start_date == period_start
            )
        ).first() is not None
    
    def get_dtrs_by_lease(
        self, 
        lease_id: int,
        status: Optional[DTRStatus] = None,
        limit: Optional[int] = None
    ) -> List[DTR]:
        """Get all DTRs for a lease"""
        query = self.db.query(DTR).filter(DTR.lease_id == lease_id)
        
        if status:
            query = query.filter(DTR.status == status)
        
        query = query.order_by(DTR.period_start_date.desc())
        
        if limit:
            query = query.limit(limit)
        
        return query.all()
    
    def get_dtrs_by_driver(
        self, 
        driver_id: int,
        status: Optional[DTRStatus] = None,
        limit: Optional[int] = None
    ) -> List[DTR]:
        """
        Get DTRs where driver is the primary leaseholder.
        
        Note: This only returns DTRs where the driver is the primary driver.
        Additional driver information is in the additional_drivers_detail JSON.
        """
        query = self.db.query(DTR).filter(DTR.driver_id == driver_id)
        
        if status:
            query = query.filter(DTR.status == status)
        
        query = query.order_by(DTR.period_start_date.desc())
        
        if limit:
            query = query.limit(limit)
        
        return query.all()
    
    def get_dtrs_by_period(
        self,
        period_start: date,
        period_end: date,
        status: Optional[DTRStatus] = None
    ) -> List[DTR]:
        """Get all DTRs for a specific period"""
        query = self.db.query(DTR).filter(
            and_(
                DTR.period_start_date == period_start,
                DTR.period_end_date == period_end
            )
        )
        
        if status:
            query = query.filter(DTR.status == status)
        
        return query.order_by(DTR.lease_id).all()
    
    def get_dtrs_by_status(self, status: DTRStatus) -> List[DTR]:
        """Get all DTRs with specific status"""
        return self.db.query(DTR).filter(DTR.status == status).all()
    
    def get_unpaid_dtrs(self, lease_id: Optional[int] = None) -> List[DTR]:
        """Get all unpaid DTRs (FINALIZED but not PAID)"""
        query = self.db.query(DTR).filter(
            DTR.status == DTRStatus.FINALIZED
        )
        
        if lease_id:
            query = query.filter(DTR.lease_id == lease_id)
        
        return query.order_by(DTR.period_start_date).all()
    
    def get_last_dtr_for_lease(self, lease_id: int) -> Optional[DTR]:
        """Get the most recent DTR for a lease"""
        return self.db.query(DTR).filter(
            DTR.lease_id == lease_id
        ).order_by(DTR.period_end_date.desc()).first()
    
    def update(self, dtr_id: int, update_data: dict) -> DTR:
        """Update DTR"""
        dtr = self.get_by_id(dtr_id)
        if not dtr:
            raise ValueError(f"DTR with ID {dtr_id} not found")
        
        for key, value in update_data.items():
            if hasattr(dtr, key):
                setattr(dtr, key, value)
        
        self.db.flush()
        return dtr
    
    def delete(self, dtr_id: int) -> bool:
        """Delete DTR"""
        dtr = self.get_by_id(dtr_id)
        if not dtr:
            return False
        
        self.db.delete(dtr)
        self.db.flush()
        return True
    
    def update_status(self, dtr_id: int, new_status: DTRStatus) -> DTR:
        """Update DTR status"""
        return self.update(dtr_id, {'status': new_status})
    
    def mark_as_paid(
        self, 
        dtr_id: int, 
        payment_method: str,
        payment_date: date,
        ach_batch_number: Optional[str] = None,
        check_number: Optional[str] = None
    ) -> DTR:
        """Mark DTR as paid"""
        update_data = {
            'status': DTRStatus.PAID,
            'payment_method': payment_method,
            'payment_date': payment_date
        }
        
        if ach_batch_number:
            update_data['ach_batch_number'] = ach_batch_number
        
        if check_number:
            update_data['check_number'] = check_number
        
        return self.update(dtr_id, update_data)
    
    def void_dtr(self, dtr_id: int, reason: str) -> DTR:
        """Void a DTR"""
        return self.update(dtr_id, {
            'status': DTRStatus.VOIDED,
            'voided_reason': reason
        })
    
    def search_dtrs(
        self,
        lease_id: Optional[int] = None,
        driver_id: Optional[int] = None,
        vehicle_id: Optional[int] = None,
        medallion_id: Optional[int] = None,
        status: Optional[DTRStatus] = None,
        period_start_from: Optional[date] = None,
        period_start_to: Optional[date] = None,
        dtr_number: Optional[str] = None,
        receipt_number: Optional[str] = None,
        page: int = 1,
        page_size: int = 50
    ) -> tuple[List[DTR], int]:
        """
        Search DTRs with multiple filters.
        
        Returns: (list of DTRs, total count)
        """
        query = self.db.query(DTR)
        
        if lease_id:
            query = query.filter(DTR.lease_id == lease_id)
        
        if driver_id:
            query = query.filter(DTR.driver_id == driver_id)
        
        if vehicle_id:
            query = query.filter(DTR.vehicle_id == vehicle_id)
        
        if medallion_id:
            query = query.filter(DTR.medallion_id == medallion_id)
        
        if status:
            query = query.filter(DTR.status == status)
        
        if period_start_from:
            query = query.filter(DTR.period_start_date >= period_start_from)
        
        if period_start_to:
            query = query.filter(DTR.period_start_date <= period_start_to)
        
        if dtr_number:
            query = query.filter(DTR.dtr_number.ilike(f"%{dtr_number}%"))
        
        if receipt_number:
            query = query.filter(DTR.receipt_number.ilike(f"%{receipt_number}%"))
        
        # Get total count
        total = query.count()
        
        # Apply pagination
        dtrs = query.order_by(DTR.period_start_date.desc())\
                   .offset((page - 1) * page_size)\
                   .limit(page_size)\
                   .all()
        
        return dtrs, total
    
    def get_dtrs_for_ach_batch(
        self,
        status: DTRStatus = DTRStatus.FINALIZED,
        payment_method: str = 'ACH'
    ) -> List[DTR]:
        """Get DTRs eligible for ACH batch processing"""
        return self.db.query(DTR).filter(
            and_(
                DTR.status == status,
                DTR.payment_method == payment_method,
                DTR.ach_batch_number.is_(None)  # Not already in a batch
            )
        ).order_by(DTR.period_start_date).all()
    
    def get_statistics(
        self,
        period_start: Optional[date] = None,
        period_end: Optional[date] = None
    ) -> dict:
        """Get DTR statistics for reporting"""
        query = self.db.query(DTR)
        
        if period_start:
            query = query.filter(DTR.period_start_date >= period_start)
        
        if period_end:
            query = query.filter(DTR.period_end_date <= period_end)
        
        all_dtrs = query.all()
        
        from decimal import Decimal
        from collections import Counter
        
        total_count = len(all_dtrs)
        status_counts = Counter(dtr.status.value for dtr in all_dtrs)
        
        total_gross_earnings = sum((dtr.total_gross_earnings for dtr in all_dtrs), Decimal("0.00"))
        total_deductions = sum((dtr.subtotal_deductions for dtr in all_dtrs), Decimal("0.00"))
        total_net_earnings = sum((dtr.net_earnings for dtr in all_dtrs), Decimal("0.00"))
        total_due_to_drivers = sum((dtr.total_due_to_driver for dtr in all_dtrs), Decimal("0.00"))
        
        return {
            'total_dtrs': total_count,
            'by_status': dict(status_counts),
            'total_gross_earnings': float(total_gross_earnings),
            'total_deductions': float(total_deductions),
            'total_net_earnings': float(total_net_earnings),
            'total_due_to_drivers': float(total_due_to_drivers),
            'average_dtr_amount': float(total_due_to_drivers / total_count) if total_count > 0 else 0
        }