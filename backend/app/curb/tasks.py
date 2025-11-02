"""
app/curb/tasks.py

Celery tasks for scheduled CURB import
"""

from datetime import date, datetime, timedelta
from celery import shared_task

from app.core.db import SessionLocal
from app.curb.service import CurbImportService
from app.utils.logger import get_logger

logger = get_logger(__name__)


@shared_task(name="curb.import_daily_trips", bind=True, max_retries=3)
def import_daily_trips_task(self):
    """
    Daily scheduled task to import CURB trips
    
    Runs daily at 5:00 AM
    - Imports trips from previous day
    - Associates trips to entities
    - Posts earnings and taxes to ledger
    - Reconciles with CURB in production
    
    Schedule in Celery beat:
    ```python
    'import-curb-daily': {
        'task': 'curb.import_daily_trips',
        'schedule': crontab(hour=5, minute=0),
    }
    ```
    """
    db = SessionLocal()
    
    try:
        logger.info("Starting daily CURB import task")
        
        # Import previous day's trips
        yesterday = date.today() - timedelta(days=1)
        
        service = CurbImportService(db)
        import_history, errors = service.import_curb_data(
            date_from=yesterday,
            date_to=yesterday,
            driver_id=None,  # All drivers
            cab_number=None,  # All cabs
            perform_association=True,
            post_to_ledger=True,
            reconcile_with_curb=True,  # Only works in production
            triggered_by="CELERY",
            triggered_by_user_id=None
        )
        
        logger.info(
            f"Daily CURB import completed: "
            f"batch={import_history.batch_id}, "
            f"status={import_history.status.value}, "
            f"trips_imported={import_history.total_trips_imported}, "
            f"trips_posted={import_history.total_trips_posted}"
        )
        
        if errors:
            logger.warning(f"Import completed with {len(errors)} errors")
        
        return {
            'success': True,
            'batch_id': import_history.batch_id,
            'status': import_history.status.value,
            'trips_imported': import_history.total_trips_imported,
            'trips_posted': import_history.total_trips_posted,
            'errors': len(errors)
        }
        
    except Exception as e:
        logger.error(f"Daily CURB import failed: {str(e)}")
        
        # Retry on failure
        try:
            self.retry(countdown=300)  # Retry after 5 minutes
        except self.MaxRetriesExceededError:
            logger.error("Max retries exceeded for daily CURB import")
            return {
                'success': False,
                'error': str(e)
            }
    
    finally:
        db.close()


@shared_task(name="curb.import_date_range", bind=True)
def import_date_range_task(
    date_from_str: str,
    date_to_str: str,
    driver_id: str = None,
    cab_number: str = None,
    perform_association: bool = True,
    post_to_ledger: bool = True,
    reconcile_with_curb: bool = False
):
    """
    Ad-hoc task to import CURB trips for a date range
    
    Can be triggered manually via API or admin interface
    
    Args:
        date_from_str: Start date (YYYY-MM-DD)
        date_to_str: End date (YYYY-MM-DD)
        driver_id: Optional CURB driver ID filter
        cab_number: Optional cab number filter
        perform_association: Whether to associate trips to entities
        post_to_ledger: Whether to post to ledger
        reconcile_with_curb: Whether to reconcile with CURB
    """
    db = SessionLocal()
    
    try:
        logger.info(f"Starting CURB import for date range: {date_from_str} to {date_to_str}")
        
        # Parse dates
        date_from = datetime.strptime(date_from_str, '%Y-%m-%d').date()
        date_to = datetime.strptime(date_to_str, '%Y-%m-%d').date()
        
        service = CurbImportService(db)
        import_history, errors = service.import_curb_data(
            date_from=date_from,
            date_to=date_to,
            driver_id=driver_id,
            cab_number=cab_number,
            perform_association=perform_association,
            post_to_ledger=post_to_ledger,
            reconcile_with_curb=reconcile_with_curb,
            triggered_by="CELERY",
            triggered_by_user_id=None
        )
        
        logger.info(
            f"CURB import completed: "
            f"batch={import_history.batch_id}, "
            f"status={import_history.status.value}"
        )
        
        return {
            'success': True,
            'batch_id': import_history.batch_id,
            'status': import_history.status.value,
            'trips_imported': import_history.total_trips_imported,
            'trips_posted': import_history.total_trips_posted,
            'errors': len(errors)
        }
        
    except Exception as e:
        logger.error(f"CURB import failed: {str(e)}")
        return {
            'success': False,
            'error': str(e)
        }
    
    finally:
        db.close()


@shared_task(name="curb.process_unmapped_trips", bind=True)
def process_unmapped_trips_task(self, limit: int = 100):
    """
    Task to process trips that couldn't be auto-mapped
    
    Re-attempts association for unmapped trips
    Useful for handling late driver/lease updates
    """
    db = SessionLocal()
    
    try:
        logger.info("Processing unmapped CURB trips")
        
        from app.curb.repository import CurbTripRepository
        repo = CurbTripRepository(db)
        
        # Get unmapped trips
        unmapped_trips = repo.get_unmapped_trips(limit=limit)
        
        if not unmapped_trips:
            logger.info("No unmapped trips to process")
            return {
                'success': True,
                'processed': 0,
                'mapped': 0
            }
        
        # Re-attempt association
        service = CurbImportService(db)
        mapped_count = service._associate_trips_to_entities(unmapped_trips)
        
        # Post newly mapped trips to ledger
        newly_mapped = [t for t in unmapped_trips if t.driver_id and t.lease_id and not t.posted_to_ledger]
        posted_count = service._post_trips_to_ledger(newly_mapped)
        
        db.commit()
        
        logger.info(
            f"Processed {len(unmapped_trips)} unmapped trips: "
            f"mapped={mapped_count}, posted={posted_count}"
        )
        
        return {
            'success': True,
            'processed': len(unmapped_trips),
            'mapped': mapped_count,
            'posted': posted_count
        }
        
    except Exception as e:
        logger.error(f"Failed to process unmapped trips: {str(e)}")
        return {
            'success': False,
            'error': str(e)
        }
    
    finally:
        db.close()


@shared_task(name="curb.post_unposted_trips", bind=True)
def post_unposted_trips_task(self, limit: int = 100):
    """
    Task to post trips that have been mapped but not yet posted to ledger
    
    Useful for handling trips that were imported but posting failed
    """
    db = SessionLocal()
    
    try:
        logger.info("Posting unposted CURB trips")
        
        from app.curb.repository import CurbTripRepository
        repo = CurbTripRepository(db)
        
        # Get unposted trips
        unposted_trips = repo.get_unposted_trips(limit=limit)
        
        if not unposted_trips:
            logger.info("No unposted trips to process")
            return {
                'success': True,
                'processed': 0,
                'posted': 0
            }
        
        # Post to ledger
        service = CurbImportService(db)
        posted_count = service._post_trips_to_ledger(unposted_trips)
        
        db.commit()
        
        logger.info(
            f"Processed {len(unposted_trips)} unposted trips: "
            f"posted={posted_count}"
        )
        
        return {
            'success': True,
            'processed': len(unposted_trips),
            'posted': posted_count
        }
        
    except Exception as e:
        logger.error(f"Failed to post unposted trips: {str(e)}")
        return {
            'success': False,
            'error': str(e)
        }
    
    finally:
        db.close()