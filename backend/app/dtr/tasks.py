"""
app/dtr/tasks.py

Celery tasks for automated DTR generation
Scheduled to run every Sunday at 05:00 AM
"""

from datetime import date, timedelta
from celery import shared_task

from app.core.db import SessionLocal
from app.dtr.service import DTRService
from app.utils.logger import get_logger

logger = get_logger(__name__)


@shared_task(name="dtr.generate_weekly_dtrs")
def generate_weekly_dtrs_task():
    """
    Generate DTRs for the previous week
    
    Scheduled to run: Every Sunday at 05:00 AM
    
    Process:
    1. Calculate previous week's period (Sunday to Saturday)
    2. Find all active leases for the period
    3. Generate DTR for each lease:
        - Collect financial data from ledger
        - Calculate totals
        - Generate PDF
        - Upload to S3
        - Create DTR record
    4. Log results and handle errors
    
    Returns:
        Dictionary with generation results:
        {
            'success': bool,
            'total_generated': int,
            'total_failed': int,
            'generated_dtr_ids': List[str],
            'failed_lease_ids': List[int],
            'errors': List[str]
        }
    """
    logger.info("Starting weekly DTR generation task")
    
    db = SessionLocal()
    
    try:
        # Calculate previous week (Sunday to Saturday)
        today = date.today()
        
        # Get last Sunday
        days_since_sunday = (today.weekday() + 1) % 7
        if days_since_sunday == 0:
            # Today is Sunday, get previous week
            period_end = today - timedelta(days=1)
        else:
            # Get the Sunday before today
            period_end = today - timedelta(days=days_since_sunday + 1)
        
        # Period end should be Saturday
        period_start = period_end - timedelta(days=6)
        
        logger.info(
            f"Generating DTRs for period: {period_start} to {period_end}"
        )
        
        # Generate DTRs
        service = DTRService(db)
        result = service.generate_dtrs_for_period(
            period_start=period_start,
            period_end=period_end,
            lease_ids=None,  # All active leases
            regenerate=False,
            triggered_by="CELERY_TASK",
            triggered_by_user_id=None
        )
        
        logger.info(
            f"Weekly DTR generation completed: "
            f"{result['total_generated']} generated, {result['total_failed']} failed"
        )
        
        if result['total_failed'] > 0:
            logger.warning(f"Failed DTRs: {result['errors']}")
        
        return result
        
    except Exception as e:
        db.rollback()
        logger.error(f"Weekly DTR generation task failed: {str(e)}", exc_info=True)
        raise
        
    finally:
        db.close()


# Configuration for Celery Beat schedule
# Add this to your celery beat schedule configuration in app/worker/config.py:
"""
from celery.schedules import crontab

beat_schedule = {
    ...
    'generate-weekly-dtrs': {
        'task': 'dtr.generate_weekly_dtrs',
        'schedule': crontab(hour=5, minute=0, day_of_week=0),  # Sunday 05:00 AM
        'options': {
            'expires': 3600,  # Task expires after 1 hour if not executed
            'timezone': 'America/New_York'
        }
    },
    ...
}
"""