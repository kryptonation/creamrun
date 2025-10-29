"""
app/repairs/tasks.py

Celery tasks for automated repair installment posting
Scheduled to run every Sunday at 05:00 AM
"""

from datetime import date
from celery import shared_task

from app.core.db import SessionLocal
from app.repairs.service import RepairService
from app.utils.logger import get_logger

logger = get_logger(__name__)


@shared_task(name="repairs.post_weekly_installments")
def post_weekly_repair_installments_task():
    """
    Post repair installments due for current week to ledger
    
    Scheduled to run: Every Sunday at 05:00 AM
    
    Process:
    1. Find all installments with week_start <= current_date
    2. Filter for unposted installments (posted_to_ledger = 0)
    3. Post each to ledger with REPAIRS category
    4. Update installment status to POSTED
    5. Update repair payment tracking
    
    Returns:
    {
        'success_count': int,
        'failure_count': int,
        'posted_installments': List[str],
        'failed_installments': List[dict]
    }
    """
    logger.info("Starting weekly repair installments posting task")
    
    db = SessionLocal()
    
    try:
        service = RepairService(db)
        
        current_date = date.today()
        result = service.post_weekly_installments(current_date)
        
        db.commit()
        
        logger.info(
            f"Weekly repair installments posting completed: "
            f"{result['success_count']} posted, {result['failure_count']} failed"
        )
        
        if result['failure_count'] > 0:
            logger.warning(f"Failed installments: {result['failed_installments']}")
        
        return result
        
    except Exception as e:
        db.rollback()
        logger.error(f"Weekly repair installments posting task failed: {str(e)}")
        raise
        
    finally:
        db.close()


# Configuration for Celery Beat schedule
# Add this to your celery beat schedule configuration:
"""
from celery.schedules import crontab

app.conf.beat_schedule = {
    'post-weekly-repair-installments': {
        'task': 'repairs.post_weekly_installments',
        'schedule': crontab(hour=5, minute=0, day_of_week=0),  # Sunday 05:00 AM
        'options': {
            'expires': 3600,  # Task expires after 1 hour if not executed
        }
    },
}
"""