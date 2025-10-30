"""
DTR Repository Layer

This module handles all database operations for DTRs.
"""

from datetime import date, datetime
from typing import List, Optional, Tuple

from sqlalchemy import and_, or_, func, desc, asc
from sqlalchemy.orm import Session, joinedload

from app.dtr.models import (
    DriverTransactionReceipt,
    DTRAdditionalDriver,
    DTRStatus,
    PaymentStatus,
    PaymentType
)
from app.dtr.schemas import DTRFilterSchema


class DTRRepository:
    """Repository for DTR database operations"""
    
    def __init__(self, db: Session):
        self.db = db
    
    # =================================================================
    # CREATE OPERATIONS
    # =================================================================
    
    def create_dtr(self, **kwargs) -> DriverTransactionReceipt:
        """Create a new DTR record"""
        dtr = DriverTransactionReceipt(**kwargs)
        self.db.add(dtr)
        self.db.flush()
        self.db.refresh(dtr)
        return dtr
    
    def create_additional_driver_section(
        self,
        dtr_id: int,
        **kwargs
    ) -> DTRAdditionalDriver:
        """Create an additional driver section"""
        section = DTRAdditionalDriver(dtr_id=dtr_id, **kwargs)
        self.db.add(section)
        self.db.flush()
        self.db.refresh(section)
        return section
    
    # =================================================================
    # READ OPERATIONS
    # =================================================================
    
    def get_by_id(self, dtr_id: int) -> Optional[DriverTransactionReceipt]:
        """Get DTR by ID with relationships loaded"""
        return (
            self.db.query(DriverTransactionReceipt)
            .options(
                joinedload(DriverTransactionReceipt.driver),
                joinedload(DriverTransactionReceipt.lease),
                joinedload(DriverTransactionReceipt.vehicle),
                joinedload(DriverTransactionReceipt.medallion),
                joinedload(DriverTransactionReceipt.additional_driver_sections)
            )
            .filter(DriverTransactionReceipt.id == dtr_id)
            .first()
        )
    
    def get_by_receipt_number(
        self,
        receipt_number: str
    ) -> Optional[DriverTransactionReceipt]:
        """Get DTR by receipt number"""
        return (
            self.db.query(DriverTransactionReceipt)
            .options(
                joinedload(DriverTransactionReceipt.driver),
                joinedload(DriverTransactionReceipt.lease),
                joinedload(DriverTransactionReceipt.additional_driver_sections)
            )
            .filter(DriverTransactionReceipt.receipt_number == receipt_number)
            .first()
        )
    
    def get_by_lease_and_week(
        self,
        lease_id: int,
        week_start_date: date
    ) -> Optional[DriverTransactionReceipt]:
        """Get existing DTR for specific lease and week"""
        return (
            self.db.query(DriverTransactionReceipt)
            .filter(
                and_(
                    DriverTransactionReceipt.lease_id == lease_id,
                    DriverTransactionReceipt.week_start_date == week_start_date
                )
            )
            .first()
        )
    
    def list_dtrs(
        self,
        filters: DTRFilterSchema
    ) -> Tuple[List[DriverTransactionReceipt], int]:
        """
        List DTRs with filtering, pagination, and sorting.
        Returns (dtrs, total_count)
        """
        query = self.db.query(DriverTransactionReceipt)
        
        # Apply filters
        conditions = []
        
        if filters.driver_id:
            conditions.append(DriverTransactionReceipt.driver_id == filters.driver_id)
        
        if filters.lease_id:
            conditions.append(DriverTransactionReceipt.lease_id == filters.lease_id)
        
        if filters.medallion_id:
            conditions.append(DriverTransactionReceipt.medallion_id == filters.medallion_id)
        
        if filters.week_start_date:
            conditions.append(
                DriverTransactionReceipt.week_start_date >= filters.week_start_date
            )
        
        if filters.week_end_date:
            conditions.append(
                DriverTransactionReceipt.week_end_date <= filters.week_end_date
            )
        
        if filters.receipt_date_from:
            conditions.append(
                DriverTransactionReceipt.receipt_date >= filters.receipt_date_from
            )
        
        if filters.receipt_date_to:
            conditions.append(
                DriverTransactionReceipt.receipt_date <= filters.receipt_date_to
            )
        
        if filters.dtr_status:
            conditions.append(DriverTransactionReceipt.dtr_status == filters.dtr_status)
        
        if filters.payment_type:
            conditions.append(DriverTransactionReceipt.payment_type == filters.payment_type)
        
        if filters.payment_status:
            conditions.append(
                DriverTransactionReceipt.payment_status == filters.payment_status
            )
        
        if filters.ach_batch_number:
            conditions.append(
                DriverTransactionReceipt.ach_batch_number == filters.ach_batch_number
            )
        
        if filters.check_number:
            conditions.append(
                DriverTransactionReceipt.check_number == filters.check_number
            )
        
        if filters.has_additional_drivers is not None:
            conditions.append(
                DriverTransactionReceipt.has_additional_drivers == filters.has_additional_drivers
            )
        
        if filters.pdf_generated is not None:
            conditions.append(
                DriverTransactionReceipt.pdf_generated == filters.pdf_generated
            )
        
        if filters.email_sent is not None:
            conditions.append(
                DriverTransactionReceipt.email_sent == filters.email_sent
            )
        
        if filters.min_total_due is not None:
            conditions.append(
                DriverTransactionReceipt.total_due_to_driver >= filters.min_total_due
            )
        
        if filters.max_total_due is not None:
            conditions.append(
                DriverTransactionReceipt.total_due_to_driver <= filters.max_total_due
            )
        
        if filters.search:
            search_term = f"%{filters.search}%"
            conditions.append(
                or_(
                    DriverTransactionReceipt.receipt_number.ilike(search_term),
                    # Could join to driver/lease tables for name search
                )
            )
        
        if conditions:
            query = query.filter(and_(*conditions))
        
        # Get total count before pagination
        total_count = query.count()
        
        # Apply sorting
        sort_column = getattr(DriverTransactionReceipt, filters.sort_by, None)
        if sort_column:
            if filters.sort_order == "desc":
                query = query.order_by(desc(sort_column))
            else:
                query = query.order_by(asc(sort_column))
        else:
            # Default sort
            query = query.order_by(desc(DriverTransactionReceipt.receipt_date))
        
        # Apply pagination
        offset = (filters.page - 1) * filters.page_size
        query = query.offset(offset).limit(filters.page_size)
        
        # Execute query with eager loading
        dtrs = (
            query
            .options(
                joinedload(DriverTransactionReceipt.driver),
                joinedload(DriverTransactionReceipt.lease)
            )
            .all()
        )
        
        return dtrs, total_count
    
    def get_unpaid_dtrs_for_ach_batch(
        self,
        limit: Optional[int] = None
    ) -> List[DriverTransactionReceipt]:
        """
        Get unpaid DTRs eligible for ACH batch processing.
        
        Criteria:
        - payment_status = UNPAID
        - payment_type = ACH
        - total_due_to_driver > 0
        - dtr_status = APPROVED
        - ach_batch_number IS NULL
        """
        query = (
            self.db.query(DriverTransactionReceipt)
            .filter(
                and_(
                    DriverTransactionReceipt.payment_status == PaymentStatus.UNPAID,
                    DriverTransactionReceipt.payment_type == PaymentType.ACH,
                    DriverTransactionReceipt.total_due_to_driver > 0,
                    DriverTransactionReceipt.dtr_status == DTRStatus.APPROVED,
                    DriverTransactionReceipt.ach_batch_number.is_(None)
                )
            )
            .order_by(DriverTransactionReceipt.receipt_date)
        )
        
        if limit:
            query = query.limit(limit)
        
        return query.all()
    
    def get_dtrs_by_ach_batch(
        self,
        ach_batch_number: str
    ) -> List[DriverTransactionReceipt]:
        """Get all DTRs in a specific ACH batch"""
        return (
            self.db.query(DriverTransactionReceipt)
            .filter(DriverTransactionReceipt.ach_batch_number == ach_batch_number)
            .options(
                joinedload(DriverTransactionReceipt.driver),
                joinedload(DriverTransactionReceipt.lease)
            )
            .all()
        )
    
    def get_active_leases_for_week(
        self,
        week_start_date: date,
        week_end_date: date
    ) -> List[dict]:
        """
        Get all active leases for the specified week that need DTRs.
        
        Returns list of dicts with lease_id and driver_id.
        """
        # This would typically join to leases table
        # For now, returning a simple structure
        from app.leases.models import Lease
        
        leases = (
            self.db.query(Lease)
            .filter(
                and_(
                    Lease.lease_status == "Active",
                    Lease.lease_start_date <= week_end_date,
                    or_(
                        Lease.lease_end_date.is_(None),
                        Lease.lease_end_date >= week_start_date
                    )
                )
            )
            .all()
        )
        
        return [
            {
                "lease_id": lease.id,
                "driver_id": lease.driver_id,  # Assuming primary driver
                "vehicle_id": lease.vehicle_id,
                "medallion_id": lease.medallion_id
            }
            for lease in leases
        ]
    
    # =================================================================
    # UPDATE OPERATIONS
    # =================================================================
    
    def update_dtr(
        self,
        dtr_id: int,
        **kwargs
    ) -> Optional[DriverTransactionReceipt]:
        """Update DTR fields"""
        dtr = self.get_by_id(dtr_id)
        if not dtr:
            return None
        
        for key, value in kwargs.items():
            if hasattr(dtr, key):
                setattr(dtr, key, value)
        
        dtr.updated_at = datetime.utcnow()
        self.db.flush()
        self.db.refresh(dtr)
        return dtr
    
    def update_payment_status(
        self,
        dtr_id: int,
        payment_status: PaymentStatus,
        **kwargs
    ) -> Optional[DriverTransactionReceipt]:
        """Update payment status and related fields"""
        update_data = {
            "payment_status": payment_status,
            **kwargs
        }
        return self.update_dtr(dtr_id, **update_data)
    
    def assign_to_ach_batch(
        self,
        dtr_ids: List[int],
        ach_batch_number: str,
        ach_batch_date: date
    ) -> int:
        """
        Assign multiple DTRs to an ACH batch.
        Returns number of DTRs updated.
        """
        updated_count = (
            self.db.query(DriverTransactionReceipt)
            .filter(DriverTransactionReceipt.id.in_(dtr_ids))
            .update(
                {
                    "ach_batch_number": ach_batch_number,
                    "ach_batch_date": ach_batch_date,
                    "payment_status": PaymentStatus.PROCESSING,
                    "updated_at": datetime.utcnow()
                },
                synchronize_session=False
            )
        )
        self.db.flush()
        return updated_count
    
    def reverse_ach_batch(
        self,
        ach_batch_number: str
    ) -> int:
        """
        Reverse an ACH batch (unmark all DTRs in batch).
        Returns number of DTRs updated.
        """
        updated_count = (
            self.db.query(DriverTransactionReceipt)
            .filter(DriverTransactionReceipt.ach_batch_number == ach_batch_number)
            .update(
                {
                    "ach_batch_number": None,
                    "ach_batch_date": None,
                    "payment_status": PaymentStatus.UNPAID,
                    "updated_at": datetime.utcnow()
                },
                synchronize_session=False
            )
        )
        self.db.flush()
        return updated_count
    
    def mark_as_paid(
        self,
        dtr_id: int,
        paid_date: date,
        check_number: Optional[str] = None
    ) -> Optional[DriverTransactionReceipt]:
        """Mark DTR as paid"""
        update_data = {
            "payment_status": PaymentStatus.PAID,
            "paid_date": paid_date
        }
        
        if check_number:
            update_data["check_number"] = check_number
        
        return self.update_dtr(dtr_id, **update_data)
    
    def void_dtr(
        self,
        dtr_id: int,
        reason: str,
        voided_by: int
    ) -> Optional[DriverTransactionReceipt]:
        """Void a DTR"""
        return self.update_dtr(
            dtr_id,
            dtr_status=DTRStatus.VOIDED,
            voided_reason=reason,
            voided_by=voided_by,
            voided_at=datetime.utcnow()
        )
    
    def update_pdf_info(
        self,
        dtr_id: int,
        pdf_s3_key: str
    ) -> Optional[DriverTransactionReceipt]:
        """Update PDF generation info"""
        return self.update_dtr(
            dtr_id,
            pdf_generated=True,
            pdf_s3_key=pdf_s3_key,
            pdf_generated_at=datetime.utcnow()
        )
    
    def update_email_info(
        self,
        dtr_id: int
    ) -> Optional[DriverTransactionReceipt]:
        """Update email sent info"""
        return self.update_dtr(
            dtr_id,
            email_sent=True,
            email_sent_at=datetime.utcnow()
        )
    
    # =================================================================
    # DELETE OPERATIONS
    # =================================================================
    
    def delete_dtr(self, dtr_id: int) -> bool:
        """
        Delete a DTR (use sparingly, prefer voiding).
        Returns True if deleted, False if not found.
        """
        dtr = self.get_by_id(dtr_id)
        if not dtr:
            return False
        
        self.db.delete(dtr)
        self.db.flush()
        return True
    
    # =================================================================
    # STATISTICS & AGGREGATIONS
    # =================================================================
    
    def get_weekly_statistics(
        self,
        week_start_date: date,
        week_end_date: date
    ) -> dict:
        """Get statistics for DTRs in a specific week"""
        stats = (
            self.db.query(
                func.count(DriverTransactionReceipt.id).label("total_dtrs"),
                func.sum(DriverTransactionReceipt.cc_earnings).label("total_earnings"),
                func.sum(DriverTransactionReceipt.total_deductions).label("total_deductions"),
                func.sum(DriverTransactionReceipt.total_due_to_driver).label("total_due"),
                func.count(
                    func.nullif(DriverTransactionReceipt.payment_status == PaymentStatus.PAID, False)
                ).label("paid_count"),
                func.count(
                    func.nullif(DriverTransactionReceipt.payment_status == PaymentStatus.UNPAID, False)
                ).label("unpaid_count")
            )
            .filter(
                and_(
                    DriverTransactionReceipt.week_start_date == week_start_date,
                    DriverTransactionReceipt.week_end_date == week_end_date
                )
            )
            .first()
        )
        
        return {
            "total_dtrs": stats.total_dtrs or 0,
            "total_earnings": float(stats.total_earnings or 0),
            "total_deductions": float(stats.total_deductions or 0),
            "total_due": float(stats.total_due or 0),
            "paid_count": stats.paid_count or 0,
            "unpaid_count": stats.unpaid_count or 0
        }
    
    def get_driver_dtr_history(
        self,
        driver_id: int,
        limit: int = 10
    ) -> List[DriverTransactionReceipt]:
        """Get recent DTR history for a driver"""
        return (
            self.db.query(DriverTransactionReceipt)
            .filter(DriverTransactionReceipt.driver_id == driver_id)
            .order_by(desc(DriverTransactionReceipt.receipt_date))
            .limit(limit)
            .all()
        )
    
    # =================================================================
    # UTILITY METHODS
    # =================================================================
    
    def generate_receipt_number(self, year: int) -> str:
        """
        Generate next receipt number for the year.
        Format: DTR-YYYY-NNNNNN
        """
        # Get the latest receipt number for this year
        latest = (
            self.db.query(DriverTransactionReceipt.receipt_number)
            .filter(DriverTransactionReceipt.receipt_number.like(f"DTR-{year}-%"))
            .order_by(desc(DriverTransactionReceipt.receipt_number))
            .first()
        )
        
        if latest:
            # Extract sequence number and increment
            sequence = int(latest[0].split('-')[2]) + 1
        else:
            # First receipt of the year
            sequence = 1
        
        return f"DTR-{year}-{sequence:06d}"
    
    def commit(self):
        """Commit the current transaction"""
        self.db.commit()
    
    def rollback(self):
        """Rollback the current transaction"""
        self.db.rollback()