"""
app/ezpass/tasks.py

Celery tasks for scheduled EZPass operations
"""

from datetime import datetime
from celery import shared_task

from app.core.db import SessionLocal
from app.ezpass.services import EZPassImportService
from app.utils.logger import get_logger

logger = get_logger(__name__)


@shared_task(name="ezpass.process_unmapped_transactions", bind=True, max_retries=3)
def process_unmapped_transactions_task(self, auto_match_threshold: float = 0.90):
    """
    Scheduled task to re-attempt matching for unmapped EZPass transactions
    
    Runs daily to check if new CURB trips now match previously unmapped tolls
    
    Schedule in Celery beat:
```python
    'process-unmapped-ezpass': {
        'task': 'ezpass.process_unmapped_transactions',
        'schedule': crontab(hour=6, minute=0),  # Daily at 6 AM
    }
```
    """
    db = SessionLocal()
    
    try:
        logger.info("Starting unmapped EZPass transactions processing")
        
        service = EZPassImportService(db)
        repo = service.transaction_repo
        
        # Get unmapped transactions
        unmapped, count = repo.get_unmapped_transactions(limit=1000)
        
        logger.info(f"Found {count} unmapped EZPass transactions")
        
        matched_count = 0
        
        for transaction in unmapped:
            try:
                # Re-attempt matching
                service._match_transaction_to_entities(
                    transaction,
                    auto_match_threshold=auto_match_threshold
                )
                
                if transaction.mapping_method == MappingMethod.AUTO_CURB_MATCH:
                    matched_count += 1
                    
                    # Post to ledger if successfully matched
                    try:
                        service._post_transaction_to_ledger(transaction)
                    except Exception as e:
                        logger.error(
                            f"Failed to post transaction {transaction.ticket_number}: {e}"
                        )
                
            except Exception as e:
                logger.warning(
                    f"Failed to process transaction {transaction.id}: {e}"
                )
        
        db.commit()
        
        logger.info(
            f"Unmapped processing completed: "
            f"processed={len(unmapped)}, matched={matched_count}"
        )
        
        return {
            'success': True,
            'processed': len(unmapped),
            'matched': matched_count
        }
        
    except Exception as e:
        db.rollback()
        logger.error(f"Unmapped processing task failed: {str(e)}")
        raise self.retry(exc=e, countdown=300)  # Retry after 5 minutes
        
    finally:
        db.close()


@shared_task(name="ezpass.retry_failed_postings", bind=True, max_retries=3)
def retry_failed_postings_task(self):
    """
    Retry posting EZPass transactions that previously failed
    
    Runs periodically to recover from temporary ledger posting errors
    
    Schedule in Celery beat:
```python
    'retry-failed-ezpass-postings': {
        'task': 'ezpass.retry_failed_postings',
        'schedule': crontab(hour='*/4'),  # Every 4 hours
    }
```
    """
    db = SessionLocal()
    
    try:
        logger.info("Starting failed EZPass postings retry")
        
        service = EZPassImportService(db)
        repo = service.transaction_repo
        
        # Get mapped transactions with failed postings
        failed_transactions, count = repo.get_transactions_by_filters(
            posting_status=PostingStatus.FAILED,
            limit=500,
            offset=0
        )
        
        logger.info(f"Found {count} failed EZPass postings")
        
        success_count = 0
        
        for transaction in failed_transactions:
            try:
                service._post_transaction_to_ledger(transaction)
                success_count += 1
            except Exception as e:
                logger.warning(
                    f"Still failing to post transaction {transaction.ticket_number}: {e}"
                )
        
        db.commit()
        
        logger.info(
            f"Failed postings retry completed: "
            f"attempted={len(failed_transactions)}, succeeded={success_count}"
        )
        
        return {
            'success': True,
            'attempted': len(failed_transactions),
            'succeeded': success_count
        }
        
    except Exception as e:
        db.rollback()
        logger.error(f"Failed postings retry task failed: {str(e)}")
        raise self.retry(exc=e, countdown=600)  # Retry after 10 minutes
        
    finally:
        db.close()


@shared_task(name="ezpass.auto_resolve_paid_tolls", bind=True, max_retries=3)
def auto_resolve_paid_tolls_task(self):
    """
    Auto-resolve EZPass tolls that have been paid via payment hierarchy
    
    Checks ledger balances and marks tolls as resolved when fully paid
    
    Schedule in Celery beat:
```python
    'auto-resolve-ezpass': {
        'task': 'ezpass.auto_resolve_paid_tolls',
        'schedule': crontab(hour=7, minute=0, day_of_week='mon'),  # Weekly on Monday
    }
```
    """
    db = SessionLocal()
    
    try:
        logger.info("Starting EZPass auto-resolution")
        
        from app.ezpass.models import EZPassTransaction, PostingStatus, ResolutionStatus
        from app.ledger.models import LedgerBalance, BalanceStatus
        
        # Get posted but unresolved transactions
        unresolved = db.query(EZPassTransaction).filter(
            and_(
                EZPassTransaction.posting_status == PostingStatus.POSTED,
                EZPassTransaction.resolution_status == ResolutionStatus.UNRESOLVED,
                EZPassTransaction.ledger_balance_id.isnot(None)
            )
        ).limit(1000).all()
        
        resolved_count = 0
        
        for transaction in unresolved:
            # Check ledger balance status
            balance = db.query(LedgerBalance).filter(
                LedgerBalance.balance_id == transaction.ledger_balance_id
            ).first()
            
            if balance and balance.status == BalanceStatus.CLOSED:
                transaction.resolution_status = ResolutionStatus.RESOLVED
                transaction.resolved_on = datetime.utcnow()
                resolved_count += 1
        
        db.commit()
        
        logger.info(
            f"Auto-resolution completed: "
            f"checked={len(unresolved)}, resolved={resolved_count}"
        )
        
        return {
            'success': True,
            'checked': len(unresolved),
            'resolved': resolved_count
        }
        
    except Exception as e:
        db.rollback()
        logger.error(f"Auto-resolution task failed: {str(e)}")
        raise self.retry(exc=e, countdown=1800)  # Retry after 30 minutes
        
    finally:
        db.close()