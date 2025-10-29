"""
app/pvb/tasks.py

Celery tasks for PVB module
"""

from celery import shared_task
from datetime import datetime, timedelta
from decimal import Decimal

from app.core.db import SessionLocal
from app.pvb.services import PVBImportService
from app.pvb.repository import PVBViolationRepository
from app.pvb.models import MappingMethod, PostingStatus
from app.utils.logger import get_logger

logger = get_logger(__name__)


@shared_task(name="import_weekly_dof_pvb")
def import_weekly_dof_pvb_task():
    """
    Scheduled task: Import weekly DOF PVB CSV
    
    Schedule: Every Saturday at 5:00 AM
    
    Checks for new DOF CSV file and imports automatically
    """
    db = SessionLocal()
    try:
        logger.info("Starting weekly DOF PVB import task")
        
        # In production, this would check S3/email for new CSV file
        # For now, just log that task executed
        
        # Example implementation:
        # from app.utils.s3_utils import s3_utils
        # csv_file = s3_utils.download_file('pvb/weekly/PVB_Log_latest.csv')
        # 
        # if csv_file:
        #     service = PVBImportService(db)
        #     service.import_csv_file(
        #         csv_content=csv_file.decode('utf-8'),
        #         file_name=f"DOF_Weekly_{datetime.now().strftime('%Y%m%d')}.csv",
        #         perform_matching=True,
        #         post_to_ledger=True,
        #         auto_match_threshold=Decimal('0.90'),
        #         triggered_by="CELERY",
        #         triggered_by_user_id=None
        #     )
        
        logger.info("Weekly DOF PVB import task completed")
        
    except Exception as e:
        logger.error(f"Weekly DOF PVB import task failed: {str(e)}", exc_info=True)
        raise
    finally:
        db.close()


@shared_task(name="retry_unmapped_pvb")
def retry_unmapped_pvb_task():
    """
    Scheduled task: Retry matching for unmapped violations
    
    Schedule: Daily at 6:00 AM
    
    Re-attempts to match unmapped violations using updated CURB trip data
    """
    db = SessionLocal()
    try:
        logger.info("Starting retry unmapped PVB task")
        
        repo = PVBViolationRepository(db)
        service = PVBImportService(db)
        
        # Get unmapped violations
        unmapped = repo.get_unmapped_violations(limit=500)
        
        matched_count = 0
        failed_count = 0
        
        for violation in unmapped:
            try:
                # Re-attempt matching
                service._match_violation_to_entities(
                    violation,
                    auto_match_threshold=Decimal('0.90')
                )
                
                if violation.mapping_method != MappingMethod.UNKNOWN:
                    matched_count += 1
                    
                    # Try to post if matched
                    if violation.driver_id and violation.lease_id and not violation.posted_to_ledger:
                        try:
                            service._post_violation_to_ledger(violation)
                        except Exception as e:
                            logger.error(f"Failed to post violation {violation.id}: {str(e)}")
                
            except Exception as e:
                failed_count += 1
                logger.error(f"Failed to retry matching for violation {violation.id}: {str(e)}")
        
        db.commit()
        
        logger.info(f"Retry unmapped PVB task completed: matched={matched_count}, failed={failed_count}")
        
        return {
            "processed": len(unmapped),
            "matched": matched_count,
            "failed": failed_count
        }
        
    except Exception as e:
        logger.error(f"Retry unmapped PVB task failed: {str(e)}", exc_info=True)
        db.rollback()
        raise
    finally:
        db.close()


@shared_task(name="post_unposted_pvb")
def post_unposted_pvb_task():
    """
    Scheduled task: Post mapped but unposted violations to ledger
    
    Schedule: Daily at 7:00 AM
    
    Posts violations that have been successfully mapped but not yet posted
    """
    db = SessionLocal()
    try:
        logger.info("Starting post unposted PVB task")
        
        repo = PVBViolationRepository(db)
        service = PVBImportService(db)
        
        # Get unposted violations
        unposted = repo.get_unposted_violations(limit=500)
        
        posted_count = 0
        failed_count = 0
        
        for violation in unposted:
            try:
                service._post_violation_to_ledger(violation)
                posted_count += 1
                
            except Exception as e:
                failed_count += 1
                logger.error(f"Failed to post violation {violation.id}: {str(e)}")
        
        db.commit()
        
        logger.info(f"Post unposted PVB task completed: posted={posted_count}, failed={failed_count}")
        
        return {
            "processed": len(unposted),
            "posted": posted_count,
            "failed": failed_count
        }
        
    except Exception as e:
        logger.error(f"Post unposted PVB task failed: {str(e)}", exc_info=True)
        db.rollback()
        raise
    finally:
        db.close()


@shared_task(name="import_pvb_csv_async")
def import_pvb_csv_task(
    csv_content: str,
    file_name: str,
    perform_matching: bool = True,
    post_to_ledger: bool = True,
    auto_match_threshold: str = "0.90",
    triggered_by_user_id: int = None
):
    """
    Async task: Import PVB CSV file
    
    Used for large CSV files that need async processing
    """
    db = SessionLocal()
    try:
        logger.info(f"Starting async PVB CSV import: {file_name}")
        
        service = PVBImportService(db)
        import_history, errors = service.import_csv_file(
            csv_content=csv_content,
            file_name=file_name,
            perform_matching=perform_matching,
            post_to_ledger=post_to_ledger,
            auto_match_threshold=Decimal(auto_match_threshold),
            triggered_by="CELERY",
            triggered_by_user_id=triggered_by_user_id
        )
        
        logger.info(f"Async PVB CSV import completed: {import_history.batch_id}")
        
        return {
            "batch_id": import_history.batch_id,
            "status": import_history.status.value,
            "total_imported": import_history.total_imported,
            "total_failed": import_history.total_failed
        }
        
    except Exception as e:
        logger.error(f"Async PVB CSV import failed: {str(e)}", exc_info=True)
        raise
    finally:
        db.close()


@shared_task(name="bulk_remap_pvb")
def bulk_remap_pvb_task(
    violation_ids: list,
    driver_id: int,
    lease_id: int,
    reason: str,
    assigned_by_user_id: int
):
    """
    Async task: Bulk remap multiple violations
    
    Used when multiple violations need to be remapped to same driver
    """
    db = SessionLocal()
    try:
        logger.info(f"Starting bulk PVB remap: {len(violation_ids)} violations")
        
        service = PVBImportService(db)
        
        success_count = 0
        failed_count = 0
        
        for violation_id in violation_ids:
            try:
                service.remap_violation_manually(
                    violation_id=violation_id,
                    driver_id=driver_id,
                    lease_id=lease_id,
                    reason=reason,
                    assigned_by_user_id=assigned_by_user_id
                )
                success_count += 1
                
            except Exception as e:
                failed_count += 1
                logger.error(f"Failed to remap violation {violation_id}: {str(e)}")
        
        logger.info(f"Bulk PVB remap completed: success={success_count}, failed={failed_count}")
        
        return {
            "total": len(violation_ids),
            "success": success_count,
            "failed": failed_count
        }
        
    except Exception as e:
        logger.error(f"Bulk PVB remap task failed: {str(e)}", exc_info=True)
        raise
    finally:
        db.close()


# Celery Beat Schedule Configuration
# Add this to your celery_beat_schedule in celery app configuration:
"""
from celery.schedules import crontab

celery_beat_schedule = {
    'import-weekly-dof-pvb': {
        'task': 'import_weekly_dof_pvb',
        'schedule': crontab(hour=5, minute=0, day_of_week=6),  # Saturday 5 AM
    },
    'retry-unmapped-pvb': {
        'task': 'retry_unmapped_pvb',
        'schedule': crontab(hour=6, minute=0),  # Daily 6 AM
    },
    'post-unposted-pvb': {
        'task': 'post_unposted_pvb',
        'schedule': crontab(hour=7, minute=0),  # Daily 7 AM
    },
}
"""