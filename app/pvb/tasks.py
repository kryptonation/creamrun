"""
app/pvb/tasks.py

Celery tasks for scheduled PVB operations
"""

from datetime import date

from celery import shared_task

from app.core.db import SessionLocal
from app.pvb.service import PVBImportService
from app.pvb.models import MappingMethod
from app.utils.logger import get_logger

logger = get_logger(__name__)


@shared_task(name="pvb.process_unmapped_violations", bind=True, max_retries=3)
def process_unmapped_violations_task(self, auto_match_threshold: float = 0.90):
    """
    Scheduled task to re-attempt matching for unmapped PVB violations
    
    Runs daily to check if new CURB trips now match previously unmapped violations
    
    Schedule in Celery beat:
```python
    'process-unmapped-pvb': {
        'task': 'pvb.process_unmapped_violations',
        'schedule': crontab(hour=6, minute=30),  # Daily at 6:30 AM
    }
```
    """
    db = SessionLocal()
    
    try:
        logger.info("Starting unmapped PVB violations processing")
        
        service = PVBImportService(db)
        repo = service.violation_repo
        
        # Get unmapped violations
        unmapped, count = repo.get_unmapped_violations(limit=1000)
        
        logger.info(f"Found {count} unmapped PVB violations")
        
        matched_count = 0
        posted_count = 0
        
        for violation in unmapped:
            try:
                # Re-attempt matching
                service._match_violation_to_entities(
                    violation,
                    auto_match_threshold=auto_match_threshold
                )
                
                if violation.mapping_method == MappingMethod.AUTO_CURB_MATCH:
                    matched_count += 1
                    
                    # Post to ledger if successfully mapped
                    if violation.driver_id and violation.lease_id:
                        try:
                            service._post_violation_to_ledger(violation)
                            posted_count += 1
                        except Exception as e:
                            logger.warning(
                                f"Failed to post violation {violation.summons_number}: {str(e)}"
                            )
                
            except Exception as e:
                logger.warning(
                    f"Failed to process violation {violation.summons_number}: {str(e)}"
                )
        
        db.commit()
        
        logger.info(
            f"Unmapped violations processing completed: "
            f"matched={matched_count}, posted={posted_count}"
        )
        
        return {
            'success': True,
            'total_unmapped': count,
            'matched': matched_count,
            'posted': posted_count
        }
        
    except Exception as e:
        db.rollback()
        logger.error(f"Unmapped violations processing failed: {str(e)}")
        raise self.retry(exc=e, countdown=300)  # Retry after 5 minutes
        
    finally:
        db.close()


@shared_task(name="pvb.post_unposted_violations", bind=True, max_retries=3)
def post_unposted_violations_task(self):
    """
    Scheduled task to post mapped but unposted violations to ledger
    
    Runs daily to ensure all mapped violations are posted
    
    Schedule in Celery beat:
```python
    'post-unposted-pvb': {
        'task': 'pvb.post_unposted_violations',
        'schedule': crontab(hour=7, minute=0),  # Daily at 7:00 AM
    }
```
    """
    db = SessionLocal()
    
    try:
        logger.info("Starting unposted PVB violations posting")
        
        service = PVBImportService(db)
        repo = service.violation_repo
        
        # Get unposted violations
        unposted, count = repo.get_unposted_violations(limit=1000)
        
        logger.info(f"Found {count} unposted PVB violations")
        
        posted_count = 0
        failed_count = 0
        
        for violation in unposted:
            try:
                service._post_violation_to_ledger(violation)
                posted_count += 1
            except Exception as e:
                failed_count += 1
                logger.warning(
                    f"Failed to post violation {violation.summons_number}: {str(e)}"
                )
        
        db.commit()
        
        logger.info(
            f"Unposted violations posting completed: "
            f"posted={posted_count}, failed={failed_count}"
        )
        
        return {
            'success': True,
            'total_unposted': count,
            'posted': posted_count,
            'failed': failed_count
        }
        
    except Exception as e:
        db.rollback()
        logger.error(f"Unposted violations posting failed: {str(e)}")
        raise self.retry(exc=e, countdown=300)  # Retry after 5 minutes
        
    finally:
        db.close()


@shared_task(name="pvb.generate_weekly_report", bind=True)
def generate_weekly_report_task(self):
    """
    Generate weekly PVB summary report
    
    Schedule in Celery beat:
```python
    'pvb-weekly-report': {
        'task': 'pvb.generate_weekly_report',
        'schedule': crontab(hour=8, minute=0, day_of_week=1),  # Monday at 8 AM
    }
```
    """
    db = SessionLocal()
    
    try:
        logger.info("Generating weekly PVB report")
        
        from datetime import timedelta
        
        repo = PVBImportService(db).violation_repo
        
        # Get stats for last 7 days
        today = date.today()
        week_ago = today - timedelta(days=7)
        
        stats = repo.get_statistics(date_from=week_ago, date_to=today)
        
        logger.info(f"Weekly PVB report: {stats}")
        
        # Here you could send the report via email or save to file
        # For now, just log it
        
        return {
            'success': True,
            'period': f"{week_ago} to {today}",
            'stats': stats
        }
        
    except Exception as e:
        logger.error(f"Weekly report generation failed: {str(e)}")
        return {'success': False, 'error': str(e)}
        
    finally:
        db.close()