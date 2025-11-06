### app/driver_payments/tasks.py

"""
Celery tasks for Driver Payments module.
Handles scheduled DTR generation and other background jobs.
"""

from datetime import date, datetime, timedelta, timezone
from app.core.celery_app import app
from app.core.db import get_db
from app.driver_payments.services import DriverPaymentService
from app.utils.logger import get_logger

logger = get_logger(__name__)


@app.task(name="driver_payments.generate_weekly_dtrs")
def generate_weekly_dtrs_task():
    """
    Celery task to generate weekly DTRs for all drivers.
    Runs every Sunday at 5:00 AM.
    
    This generates DTRs for the week that just ended (previous Sunday through Saturday).
    """
    logger.info("Starting scheduled weekly DTR generation task")
    
    db = next(get_db())
    try:
        service = DriverPaymentService(db)
        
        # Calculate the week that just ended
        # Today is Sunday, so we want last Sunday through yesterday (Saturday)
        today = date.today()
        
        # Find the most recent Saturday
        days_since_saturday = (today.weekday() + 2) % 7
        if days_since_saturday == 0:
            days_since_saturday = 7
        last_saturday = today - timedelta(days=days_since_saturday)
        
        # Find the Sunday before that
        week_start_date = last_saturday - timedelta(days=6)
        
        logger.info(f"Generating DTRs for week: {week_start_date} to {last_saturday}")
        
        # Generate DTRs
        result = service.generate_weekly_dtrs(week_start_date)
        
        logger.info(f"DTR generation task completed: {result}")
        return result
        
    except Exception as e:
        logger.error(f"Error in DTR generation task: {e}", exc_info=True)
        raise
    finally:
        db.close()


@app.task(name="driver_payments.generate_dtrs_for_specific_week")
def generate_dtrs_for_specific_week_task(week_start_date_str: str):
    """
    Celery task to generate DTRs for a specific week.
    Can be called manually for backfilling or corrections.
    
    Args:
        week_start_date_str: Date string in format 'YYYY-MM-DD' (must be a Sunday)
    """
    logger.info(f"Generating DTRs for specific week: {week_start_date_str}")
    
    db = next(get_db())
    try:
        service = DriverPaymentService(db)
        
        # Parse date
        week_start_date = datetime.strptime(week_start_date_str, '%Y-%m-%d').date()
        
        # Validate it's a Sunday
        if week_start_date.weekday() != 6:
            raise ValueError(f"Week start date must be a Sunday. {week_start_date_str} is not a Sunday.")
        
        # Generate DTRs
        result = service.generate_weekly_dtrs(week_start_date)
        
        logger.info(f"Specific week DTR generation completed: {result}")
        return result
        
    except Exception as e:
        logger.error(f"Error generating DTRs for specific week: {e}", exc_info=True)
        raise
    finally:
        db.close()


@app.task(name="driver_payments.send_payment_notifications")
def send_payment_notifications_task(batch_id: int):
    """
    Send email/SMS notifications to drivers about their payments.
    This would integrate with your notification system.
    
    Args:
        batch_id: ID of the ACH batch that was processed
    """
    logger.info(f"Sending payment notifications for batch {batch_id}")
    
    db = next(get_db())
    try:
        service = DriverPaymentService(db)
        batch = service.get_ach_batch(batch_id)
        
        if not batch:
            logger.error(f"Batch {batch_id} not found")
            return {"error": "Batch not found"}
        
        notifications_sent = 0
        
        for receipt in batch.receipts:
            try:
                # Here you would call your notification service
                # notification_service.send_payment_notification(
                #     driver=receipt.driver,
                #     amount=receipt.total_due_to_driver,
                #     receipt_number=receipt.receipt_number
                # )
                notifications_sent += 1
                logger.info(f"Sent notification to driver {receipt.driver_id}")
            except Exception as e:
                logger.error(f"Failed to send notification to driver {receipt.driver_id}: {e}")
        
        return {
            "batch_number": batch.batch_number,
            "notifications_sent": notifications_sent,
            "total_drivers": len(batch.receipts)
        }
        
    except Exception as e:
        logger.error(f"Error sending payment notifications: {e}", exc_info=True)
        raise
    finally:
        db.close()


@app.task(name="driver_payments.cleanup_old_nacha_files")
def cleanup_old_nacha_files_task(days_to_keep: int = 90):
    """
    Clean up old NACHA files from storage.
    Runs monthly to remove files older than the specified days.
    
    Args:
        days_to_keep: Number of days to keep NACHA files (default 90)
    """
    logger.info(f"Cleaning up NACHA files older than {days_to_keep} days")
    
    db = next(get_db())
    try:
        from app.driver_payments.repository import ACHBatchRepository
        
        repo = ACHBatchRepository(db)
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=days_to_keep)
        
        # Query old batches with NACHA files
        old_batches = (
            db.query(repo.db.query.__self__)
            .filter(
                db.query.__self__.nacha_generated_at < cutoff_date,
                db.query.__self__.nacha_file_path.isnot(None)
            )
            .all()
        )
        
        cleaned_count = 0
        for batch in old_batches:
            try:
                # Here you would delete from S3 or file system
                # s3_client.delete_object(bucket=bucket, key=batch.nacha_file_path)
                
                # Clear the file path in database
                batch.nacha_file_path = None
                cleaned_count += 1
                
            except Exception as e:
                logger.error(f"Failed to clean NACHA file for batch {batch.batch_number}: {e}")
        
        db.commit()
        
        logger.info(f"Cleaned up {cleaned_count} old NACHA files")
        return {"cleaned_count": cleaned_count}
        
    except Exception as e:
        logger.error(f"Error cleaning up NACHA files: {e}", exc_info=True)
        raise
    finally:
        db.close()