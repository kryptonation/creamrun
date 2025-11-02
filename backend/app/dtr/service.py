"""
app/dtr/service.py

Business logic for DTR module
"""

import time
from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional, Tuple, Dict, Any
from io import BytesIO

from sqlalchemy import and_, or_, func
from sqlalchemy.orm import Session

from app.dtr.models import DTR, DTRStatus, DTRPaymentType, DTRGenerationHistory
from app.dtr.repository import DTRRepository, DTRGenerationHistoryRepository
from app.dtr.exceptions import (
    DTRNotFoundError, DTRInvalidPeriodError,
    DTRGenerationError, DTRVoidedError,
    DTRPaymentUpdateError
)
from app.dtr.pdf_generator import DTRPDFGenerator

from app.leases.models import Lease
from app.leases.schemas import LeaseStatus
from app.drivers.models import Driver
from app.vehicles.models import Vehicle
from app.medallions.models import Medallion
from app.ledger.models import LedgerBalance, PostingCategory
from app.curb.models import CurbTrip

from app.utils.s3_utils import S3Utils
from app.utils.logger import get_logger

logger = get_logger(__name__)


class DTRService:
    """Service for DTR business logic"""
    
    def __init__(self, db: Session):
        self.db = db
        self.repo = DTRRepository(db)
        self.history_repo = DTRGenerationHistoryRepository(db)
        self.s3_utils = S3Utils()
        self.pdf_generator = DTRPDFGenerator()
    
    def generate_dtrs_for_period(
        self,
        period_start: date,
        period_end: date,
        lease_ids: Optional[List[int]] = None,
        regenerate: bool = False,
        triggered_by: str = "USER",
        triggered_by_user_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Generate DTRs for all active leases in the given period
        
        Args:
            period_start: Payment period start (must be Sunday)
            period_end: Payment period end (must be Saturday)
            lease_ids: Optional list of specific lease IDs
            regenerate: If True, regenerate existing DTRs
            triggered_by: Who triggered the generation
            triggered_by_user_id: User ID if triggered manually
        
        Returns:
            Dictionary with generation results
        """
        start_time = time.time()
        
        # Validate period
        self._validate_period(period_start, period_end)
        
        # Get active leases
        leases = self._get_active_leases(period_start, period_end, lease_ids)
        
        logger.info(
            f"Starting DTR generation for period {period_start} to {period_end}. "
            f"Total leases: {len(leases)}"
        )
        
        # Track results
        generated_dtr_ids = []
        failed_lease_ids = []
        errors = []
        
        for lease in leases:
            try:
                # Check if DTR already exists
                existing_dtr = self.repo.get_by_lease_and_period(
                    lease.id, period_start, period_end
                )
                
                if existing_dtr and not regenerate:
                    logger.info(
                        f"DTR already exists for lease {lease.id}, skipping. "
                        f"DTR ID: {existing_dtr.dtr_id}"
                    )
                    continue
                
                if existing_dtr and regenerate:
                    # Void existing DTR
                    existing_dtr.status = DTRStatus.VOIDED
                    existing_dtr.voided_at = datetime.utcnow()
                    existing_dtr.voided_reason = "Regenerated"
                    self.repo.update(existing_dtr)
                    logger.info(f"Voided existing DTR {existing_dtr.dtr_id} for regeneration")
                
                # Generate new DTR
                dtr = self._generate_dtr_for_lease(
                    lease, period_start, period_end, triggered_by_user_id
                )
                
                generated_dtr_ids.append(dtr.dtr_id)
                logger.info(f"Successfully generated DTR {dtr.dtr_id} for lease {lease.id}")
                
            except Exception as e:
                failed_lease_ids.append(lease.id)
                error_msg = f"Lease {lease.id}: {str(e)}"
                errors.append(error_msg)
                logger.error(f"Failed to generate DTR for lease {lease.id}: {str(e)}")
        
        # Commit all changes
        try:
            self.db.commit()
        except Exception as e:
            self.db.rollback()
            raise DTRGenerationError(f"Failed to commit DTR generation: {str(e)}")
        
        # Record generation history
        generation_time = time.time() - start_time
        self._record_generation_history(
            period_start=period_start,
            period_end=period_end,
            total_generated=len(generated_dtr_ids),
            total_failed=len(failed_lease_ids),
            generation_time=generation_time,
            status="SUCCESS" if len(failed_lease_ids) == 0 else "PARTIAL_SUCCESS",
            triggered_by=triggered_by,
            triggered_by_user_id=triggered_by_user_id,
            error_message="; ".join(errors) if errors else None
        )
        
        return {
            'success': len(failed_lease_ids) == 0,
            'message': f"Generated {len(generated_dtr_ids)} DTRs, {len(failed_lease_ids)} failed",
            'total_generated': len(generated_dtr_ids),
            'total_failed': len(failed_lease_ids),
            'generated_dtr_ids': generated_dtr_ids,
            'failed_lease_ids': failed_lease_ids,
            'errors': errors,
            'generation_time_seconds': round(generation_time, 2)
        }
    
    def _generate_dtr_for_lease(
        self,
        lease: Lease,
        period_start: date,
        period_end: date,
        generated_by_user_id: Optional[int] = None
    ) -> DTR:
        """
        Generate a single DTR for a lease
        
        This is the core DTR generation logic that:
        1. Collects data from ledger balances
        2. Calculates all financial amounts
        3. Generates PDF
        4. Stores to S3
        5. Creates DTR record
        """
        # Get primary driver
        driver = self._get_primary_driver(lease)
        
        # Get vehicle and medallion
        vehicle = lease.vehicle
        medallion = lease.medallion
        
        # Generate DTR ID and receipt number
        dtr_id = self._generate_dtr_id(lease.id, period_start)
        receipt_number = self._generate_receipt_number()
        
        # Collect financial data from ledger
        financial_data = self._collect_financial_data(
            lease_id=lease.id,
            driver_id=driver.id,
            period_start=period_start,
            period_end=period_end
        )
        
        # Get security deposit
        deposit_amount = lease.deposit_amount_paid or Decimal('0.00')
        
        # Calculate totals
        total_earnings = financial_data['cc_earnings'] + financial_data['cash_earnings']
        total_deductions = (
            financial_data['taxes_amount'] +
            financial_data['ezpass_amount'] +
            financial_data['lease_amount'] +
            financial_data['pvb_amount'] +
            financial_data['tlc_amount'] +
            financial_data['repairs_amount'] +
            financial_data['loans_amount'] +
            financial_data['misc_amount']
        )
        net_earnings = total_earnings - total_deductions
        total_due = net_earnings + financial_data['prior_balance']
        
        # Create DTR object
        dtr = DTR(
            dtr_id=dtr_id,
            receipt_number=receipt_number,
            receipt_date=date.today(),
            period_start=period_start,
            period_end=period_end,
            lease_id=lease.id,
            driver_id=driver.id,
            vehicle_id=vehicle.id if vehicle else None,
            medallion_id=medallion.id if medallion else None,
            cc_earnings=financial_data['cc_earnings'],
            cash_earnings=financial_data['cash_earnings'],
            total_earnings=total_earnings,
            taxes_amount=financial_data['taxes_amount'],
            ezpass_amount=financial_data['ezpass_amount'],
            lease_amount=financial_data['lease_amount'],
            pvb_amount=financial_data['pvb_amount'],
            tlc_amount=financial_data['tlc_amount'],
            repairs_amount=financial_data['repairs_amount'],
            loans_amount=financial_data['loans_amount'],
            misc_amount=financial_data['misc_amount'],
            total_deductions=total_deductions,
            prior_balance=financial_data['prior_balance'],
            net_earnings=net_earnings,
            total_due=total_due,
            deposit_amount=deposit_amount,
            payment_type=DTRPaymentType.PENDING,
            status=DTRStatus.PROCESSING,
            generated_by_user_id=generated_by_user_id,
            generated_at=datetime.utcnow()
        )
        
        # Create DTR in database
        dtr = self.repo.create(dtr)
        self.db.flush()
        
        # Generate PDF
        try:
            pdf_data = self._generate_pdf(dtr, lease, driver, vehicle, medallion, financial_data)
            
            # Upload to S3
            s3_key = self._upload_pdf_to_s3(dtr.dtr_id, pdf_data)
            
            # Update DTR with S3 info
            dtr.pdf_s3_key = s3_key
            dtr.pdf_url = self.s3_utils.generate_presigned_url(s3_key, expiration=30*24*3600)  # 30 days
            dtr.status = DTRStatus.GENERATED
            
            self.repo.update(dtr)
            
        except Exception as e:
            dtr.status = DTRStatus.FAILED
            self.repo.update(dtr)
            raise DTRGenerationError(f"Failed to generate PDF for DTR {dtr.dtr_id}: {str(e)}")
        
        return dtr
    
    def _collect_financial_data(
        self,
        lease_id: int,
        driver_id: int,
        period_start: date,
        period_end: date
    ) -> Dict[str, Decimal]:
        """
        Collect all financial data from ledger balances for the payment period
        
        Returns dictionary with all amounts
        """
        # Get CURB earnings
        cc_earnings = self._get_curb_earnings(driver_id, period_start, period_end)
        cash_earnings = Decimal('0.00')  # Cash earnings not tracked in Phase 1
        
        # Get deductions from ledger balances
        taxes_amount = self._get_ledger_amount(
            lease_id, driver_id, PostingCategory.TAXES, period_start, period_end
        )
        
        ezpass_amount = self._get_ledger_amount(
            lease_id, driver_id, PostingCategory.EZPASS, period_start, period_end
        )
        
        lease_amount = self._get_ledger_amount(
            lease_id, driver_id, PostingCategory.LEASE, period_start, period_end
        )
        
        pvb_amount = self._get_ledger_amount(
            lease_id, driver_id, PostingCategory.PVB, period_start, period_end
        )
        
        tlc_amount = self._get_ledger_amount(
            lease_id, driver_id, PostingCategory.TLC, period_start, period_end
        )
        
        repairs_amount = self._get_ledger_amount(
            lease_id, driver_id, PostingCategory.REPAIRS, period_start, period_end
        )
        
        loans_amount = self._get_ledger_amount(
            lease_id, driver_id, PostingCategory.LOANS, period_start, period_end
        )
        
        misc_amount = self._get_ledger_amount(
            lease_id, driver_id, PostingCategory.MISC, period_start, period_end
        )
        
        # Get prior balance (sum of all outstanding balances from previous periods)
        prior_balance = self._get_prior_balance(lease_id, driver_id, period_start)
        
        return {
            'cc_earnings': cc_earnings,
            'cash_earnings': cash_earnings,
            'taxes_amount': taxes_amount,
            'ezpass_amount': ezpass_amount,
            'lease_amount': lease_amount,
            'pvb_amount': pvb_amount,
            'tlc_amount': tlc_amount,
            'repairs_amount': repairs_amount,
            'loans_amount': loans_amount,
            'misc_amount': misc_amount,
            'prior_balance': prior_balance
        }
    
    def _get_curb_earnings(
        self,
        driver_id: int,
        period_start: date,
        period_end: date
    ) -> Decimal:
        """Get credit card earnings from CURB for the period"""
        result = self.db.query(func.sum(CurbTrip.net_earnings)).filter(
            and_(
                CurbTrip.driver_id == driver_id,
                CurbTrip.trip_date >= period_start,
                CurbTrip.trip_date <= period_end,
                CurbTrip.posted_to_ledger == 1
            )
        ).scalar()
        
        return result or Decimal('0.00')
    
    def _get_ledger_amount(
        self,
        lease_id: int,
        driver_id: int,
        category: PostingCategory,
        period_start: date,
        period_end: date
    ) -> Decimal:
        """Get total amount from ledger balances for a specific category and period"""
        result = self.db.query(func.sum(LedgerBalance.current_balance)).filter(
            and_(
                LedgerBalance.lease_id == lease_id,
                LedgerBalance.driver_id == driver_id,
                LedgerBalance.category == category,
                LedgerBalance.due_date >= period_start,
                LedgerBalance.due_date <= period_end,
                LedgerBalance.balance_status == "OPEN"
            )
        ).scalar()
        
        return result or Decimal('0.00')
    
    def _get_prior_balance(
        self,
        lease_id: int,
        driver_id: int,
        period_start: date
    ) -> Decimal:
        """Get sum of all outstanding balances from periods before period_start"""
        result = self.db.query(func.sum(LedgerBalance.current_balance)).filter(
            and_(
                LedgerBalance.lease_id == lease_id,
                LedgerBalance.driver_id == driver_id,
                LedgerBalance.due_date < period_start,
                LedgerBalance.balance_status == "OPEN"
            )
        ).scalar()
        
        return result or Decimal('0.00')
    
    def _generate_pdf(
        self,
        dtr: DTR,
        lease: Lease,
        driver: Driver,
        vehicle: Optional[Vehicle],
        medallion: Optional[Medallion],
        financial_data: Dict[str, Decimal]
    ) -> bytes:
        """Generate PDF for DTR"""
        pdf_data = self.pdf_generator.generate(
            dtr=dtr,
            lease=lease,
            driver=driver,
            vehicle=vehicle,
            medallion=medallion,
            financial_data=financial_data,
            db=self.db
        )
        
        return pdf_data
    
    def _upload_pdf_to_s3(self, dtr_id: str, pdf_data: bytes) -> str:
        """Upload PDF to S3 and return key"""
        # Generate S3 key
        today = date.today()
        s3_key = f"dtrs/{today.year}/{today.month:02d}/{dtr_id}.pdf"
        
        # Upload to S3
        pdf_buffer = BytesIO(pdf_data)
        success = self.s3_utils.upload_file(
            file_obj=pdf_buffer,
            key=s3_key,
            content_type="application/pdf"
        )
        
        if not success:
            raise DTRGenerationError(f"Failed to upload PDF to S3 for DTR {dtr_id}")
        
        logger.info(f"Uploaded DTR PDF to S3: {s3_key}")
        
        return s3_key
    
    def _get_active_leases(
        self,
        period_start: date,
        period_end: date,
        lease_ids: Optional[List[int]] = None
    ) -> List[Lease]:
        """Get all active leases for the period"""
        query = self.db.query(Lease).filter(
            and_(
                Lease.lease_status == LeaseStatus.ACTIVE,
                Lease.lease_start_date <= period_end,
                or_(
                    Lease.lease_end_date.is_(None),
                    Lease.lease_end_date >= period_start
                )
            )
        )
        
        if lease_ids:
            query = query.filter(Lease.id.in_(lease_ids))
        
        return query.all()
    
    def _get_primary_driver(self, lease: Lease) -> Driver:
        """Get primary driver for lease"""
        if not lease.primary_driver_id:
            raise DTRGenerationError(f"Lease {lease.id} has no primary driver")
        
        driver = self.db.query(Driver).filter(Driver.id == lease.primary_driver_id).first()
        
        if not driver:
            raise DTRGenerationError(f"Primary driver {lease.primary_driver_id} not found for lease {lease.id}")
        
        return driver
    
    def _validate_period(self, period_start: date, period_end: date):
        """Validate period dates"""
        if period_start.weekday() != 6:  # Sunday = 6
            raise DTRInvalidPeriodError("Period start must be a Sunday")
        
        if period_end.weekday() != 5:  # Saturday = 5
            raise DTRInvalidPeriodError("Period end must be a Saturday")
        
        delta = (period_end - period_start).days
        if delta != 6:
            raise DTRInvalidPeriodError("Period must be exactly 7 days")
    
    def _generate_dtr_id(self, lease_id: int, period_start: date) -> str:
        """Generate unique DTR ID"""
        return f"DTR-{lease_id}-{period_start.strftime('%Y-%m-%d')}"
    
    def _generate_receipt_number(self) -> str:
        """Generate unique receipt number"""
        # Get current year and count
        current_year = date.today().year
        count = self.db.query(func.count(DTR.dtr_id)).filter(
            func.extract('year', DTR.receipt_date) == current_year
        ).scalar() or 0
        
        return f"RCPT-{current_year}-{(count + 1):06d}"
    
    def _record_generation_history(
        self,
        period_start: date,
        period_end: date,
        total_generated: int,
        total_failed: int,
        generation_time: float,
        status: str,
        triggered_by: str,
        triggered_by_user_id: Optional[int] = None,
        error_message: Optional[str] = None
    ):
        """Record DTR generation in history"""
        history = DTRGenerationHistory(
            generation_date=datetime.utcnow(),
            period_start=period_start,
            period_end=period_end,
            total_dtrs_generated=total_generated,
            total_failed=total_failed,
            generation_time_seconds=Decimal(str(round(generation_time, 2))),
            status=status,
            error_message=error_message,
            triggered_by=triggered_by,
            triggered_by_user_id=triggered_by_user_id
        )
        
        self.history_repo.create(history)
        self.db.commit()
    
    def get_dtr_by_id(self, dtr_id: str) -> DTR:
        """Get DTR by ID"""
        dtr = self.repo.get_by_id(dtr_id)
        
        if not dtr:
            raise DTRNotFoundError(f"DTR not found: {dtr_id}")
        
        return dtr
    
    def get_dtr_by_receipt_number(self, receipt_number: str) -> DTR:
        """Get DTR by receipt number"""
        dtr = self.repo.get_by_receipt_number(receipt_number)
        
        if not dtr:
            raise DTRNotFoundError(f"DTR not found with receipt number: {receipt_number}")
        
        return dtr
    
    def find_dtrs(
        self,
        dtr_id: Optional[str] = None,
        receipt_number: Optional[str] = None,
        lease_id: Optional[int] = None,
        driver_id: Optional[int] = None,
        medallion_id: Optional[int] = None,
        vehicle_id: Optional[int] = None,
        period_start: Optional[date] = None,
        period_end: Optional[date] = None,
        status: Optional[DTRStatus] = None,
        payment_type: Optional[DTRPaymentType] = None,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
        page: int = 1,
        page_size: int = 20,
        sort_by: str = "period_start",
        sort_order: str = "desc"
    ) -> Tuple[List[DTR], int]:
        """Find DTRs with filters"""
        return self.repo.find_all(
            dtr_id=dtr_id,
            receipt_number=receipt_number,
            lease_id=lease_id,
            driver_id=driver_id,
            medallion_id=medallion_id,
            vehicle_id=vehicle_id,
            period_start=period_start,
            period_end=period_end,
            status=status,
            payment_type=payment_type,
            date_from=date_from,
            date_to=date_to,
            page=page,
            page_size=page_size,
            sort_by=sort_by,
            sort_order=sort_order
        )
    
    def update_payment_info(
        self,
        dtr_id: str,
        payment_type: DTRPaymentType,
        batch_number: Optional[str] = None,
        payment_date: Optional[date] = None,
        updated_by_user_id: Optional[int] = None
    ) -> DTR:
        """Update payment information for a DTR"""
        dtr = self.get_dtr_by_id(dtr_id)
        
        if dtr.status == DTRStatus.VOIDED:
            raise DTRVoidedError(f"Cannot update payment info for voided DTR {dtr_id}")
        
        if dtr.status != DTRStatus.GENERATED:
            raise DTRPaymentUpdateError(f"DTR must be GENERATED status to update payment info. Current status: {dtr.status}")
        
        dtr.payment_type = payment_type
        dtr.batch_number = batch_number
        dtr.payment_date = payment_date or date.today()
        
        self.repo.update(dtr)
        self.db.commit()
        
        logger.info(f"Updated payment info for DTR {dtr_id}: {payment_type}, {batch_number}")
        
        return dtr
    
    def void_dtr(
        self,
        dtr_id: str,
        reason: str,
        voided_by_user_id: int
    ) -> DTR:
        """Void a DTR"""
        dtr = self.get_dtr_by_id(dtr_id)
        
        if dtr.status == DTRStatus.VOIDED:
            raise DTRVoidedError(f"DTR {dtr_id} is already voided")
        
        dtr.status = DTRStatus.VOIDED
        dtr.voided_at = datetime.utcnow()
        dtr.voided_by_user_id = voided_by_user_id
        dtr.voided_reason = reason
        
        self.repo.update(dtr)
        self.db.commit()
        
        logger.info(f"Voided DTR {dtr_id}. Reason: {reason}")
        
        return dtr
    
    def get_statistics(self) -> dict:
        """Get DTR statistics"""
        return self.repo.get_statistics()
    
    def get_generation_history(
        self,
        period_start: Optional[date] = None,
        period_end: Optional[date] = None,
        status: Optional[str] = None,
        limit: int = 20
    ) -> List[DTRGenerationHistory]:
        """Get generation history"""
        return self.history_repo.get_history(
            period_start=period_start,
            period_end=period_end,
            status=status,
            limit=limit
        )