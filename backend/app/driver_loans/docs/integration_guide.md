# Driver Loans Module - Integration Guide

Step-by-step guide for integrating the Driver Loans module into the BAT Payment Engine.

## Prerequisites

Ensure these modules are already implemented:
- Centralized Ledger (Phase 1)
- Drivers module
- Leases module
- Users module
- Authentication/Authorization

## Step 1: Module Structure

Create the loans module directory structure:

```bash
mkdir -p app/loans
touch app/loans/__init__.py
touch app/loans/models.py
touch app/loans/schemas.py
touch app/loans/repository.py
touch app/loans/service.py
touch app/loans/router.py
touch app/loans/tasks.py
touch app/loans/README.md
```

## Step 2: Add Models

Copy the models from `models.py` artifact to `app/loans/models.py`.

Key points:
- Defines DriverLoan and LoanSchedule models
- Includes all enums (LoanStatus, InstallmentStatus)
- Has proper foreign keys and relationships
- Includes database constraints and indexes

## Step 3: Database Migration

Since you mentioned no migration files are needed, ensure the tables are created. If using Alembic:

```python
# In your migration
from app.loans.models import DriverLoan, LoanSchedule

# Tables will be auto-created based on models
# Verify with:
# alembic revision --autogenerate -m "Add driver loans tables"
# alembic upgrade head
```

Or if creating tables manually:

```sql
-- Verify tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('driver_loans', 'loan_schedules');
```

## Step 4: Add Schemas

Copy the schemas from `schemas.py` artifact to `app/loans/schemas.py`.

## Step 5: Add Repository Layer

Copy the repository from `repository.py` artifact to `app/loans/repository.py`.

## Step 6: Add Service Layer

Copy the service from both service parts to `app/loans/service.py`.

Combine:
- Service Part 1: Main service class, creation, validation
- Service Part 2: Posting logic, finding methods

## Step 7: Add Router

Copy the router from `router.py` artifact to `app/loans/router.py`.

## Step 8: Register Router in Main Application

Add the loans router to your main FastAPI application:

```python
# app/main.py

from fastapi import FastAPI
from app.loans.router import router as loans_router

app = FastAPI()

# Register loans router
app.include_router(
    loans_router,
    prefix="/api/v1",
    tags=["Driver Loans"]
)
```

## Step 9: Add Celery Scheduled Task

Create the scheduled task for automatic posting:

```python
# app/loans/tasks.py

from datetime import date, timedelta
from celery import Celery
from celery.schedules import crontab

from app.core.db import SessionLocal
from app.loans.service import DriverLoanService
from app.utils.logger import get_logger

logger = get_logger(__name__)

celery = Celery('bat_tasks')


@celery.task(name='post_weekly_loan_installments')
def post_weekly_loan_installments_task():
    """
    Scheduled task to post weekly loan installments
    Runs every Sunday at 05:00 AM
    """
    db = SessionLocal()
    try:
        service = DriverLoanService(db)
        
        # Calculate current week
        today = date.today()
        days_since_sunday = (today.weekday() + 1) % 7
        period_start = today - timedelta(days=days_since_sunday)
        period_end = period_start + timedelta(days=6)
        
        logger.info(f"Starting weekly loan installment posting for {period_start} to {period_end}")
        
        result = service.post_weekly_installments(
            payment_period_start=period_start,
            payment_period_end=period_end
        )
        
        logger.info(
            f"Completed loan installment posting: "
            f"{result.installments_posted}/{result.installments_processed} posted, "
            f"Total: ${result.total_amount_posted}"
        )
        
        if result.errors:
            logger.error(f"Errors during posting: {result.errors}")
        
        return {
            "success": result.success,
            "posted": result.installments_posted,
            "total": result.installments_processed,
            "amount": float(result.total_amount_posted)
        }
        
    except Exception as e:
        logger.error(f"Failed to post loan installments: {str(e)}")
        raise
    finally:
        db.close()


# Configure beat schedule
celery.conf.beat_schedule = {
    'post-weekly-loan-installments': {
        'task': 'post_weekly_loan_installments',
        'schedule': crontab(hour=5, minute=0, day_of_week=0),  # Sunday 05:00 AM
        'args': ()
    },
}

celery.conf.timezone = 'America/New_York'  # Adjust to your timezone
```

## Step 10: Update Celery Configuration

Add to your Celery configuration:

```python
# app/core/celery_config.py

from celery import Celery

celery_app = Celery('bat_tasks')

celery_app.config_from_object({
    'broker_url': 'redis://localhost:6379/0',
    'result_backend': 'redis://localhost:6379/0',
    'task_serializer': 'json',
    'result_serializer': 'json',
    'accept_content': ['json'],
    'timezone': 'America/New_York',
    'enable_utc': True,
    'imports': [
        'app.loans.tasks',
        # ... other task modules
    ]
})
```

## Step 11: Start Celery Workers

Start Celery worker and beat scheduler:

```bash
# Start Celery worker
celery -A app.core.celery_config:celery_app worker --loglevel=info

# Start Celery beat (scheduler)
celery -A app.core.celery_config:celery_app beat --loglevel=info
```

Or use a process manager like supervisord:

```ini
[program:celery-worker]
command=celery -A app.core.celery_config:celery_app worker --loglevel=info
directory=/path/to/app
user=www-data
autostart=true
autorestart=true
redirect_stderr=true

[program:celery-beat]
command=celery -A app.core.celery_config:celery_app beat --loglevel=info
directory=/path/to/app
user=www-data
autostart=true
autorestart=true
redirect_stderr=true
```

## Step 12: Add Module Initialization

Update `app/loans/__init__.py`:

```python
# app/loans/__init__.py

from app.loans.models import DriverLoan, LoanSchedule, LoanStatus, InstallmentStatus
from app.loans.router import router
from app.loans.service import DriverLoanService

__all__ = [
    'DriverLoan',
    'LoanSchedule',
    'LoanStatus',
    'InstallmentStatus',
    'router',
    'DriverLoanService'
]
```

## Step 13: Test Installation

### Test 1: Verify Tables

```python
# test_tables.py
from sqlalchemy import inspect
from app.core.db import engine

inspector = inspect(engine)
tables = inspector.get_table_names()

assert 'driver_loans' in tables, "driver_loans table not found"
assert 'loan_schedules' in tables, "loan_schedules table not found"

print("✓ Tables created successfully")
```

### Test 2: Test Loan Creation

```python
# test_loan_creation.py
from datetime import date, timedelta
from decimal import Decimal
from app.core.db import SessionLocal
from app.loans.service import DriverLoanService

db = SessionLocal()
service = DriverLoanService(db)

# Calculate next Sunday
today = date.today()
days_until_sunday = (6 - today.weekday()) % 7
if days_until_sunday == 0:
    days_until_sunday = 7
next_sunday = today + timedelta(days=days_until_sunday)

try:
    loan = service.create_loan(
        driver_id=1,  # Adjust to existing driver
        lease_id=1,   # Adjust to existing lease
        loan_amount=Decimal('1500.00'),
        interest_rate=Decimal('10.0'),
        start_week=next_sunday,
        purpose="Test loan",
        created_by=1
    )
    
    print(f"✓ Loan created: {loan.loan_id}")
    print(f"  Installments: {len(loan.installments)}")
    print(f"  First installment: ${loan.installments[0].total_due}")
    
except Exception as e:
    print(f"✗ Failed to create loan: {str(e)}")
    raise
finally:
    db.close()
```

### Test 3: Test API Endpoints

```bash
# Test create loan endpoint
curl -X POST "http://localhost:8000/api/v1/loans/" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "driver_id": 1,
    "lease_id": 1,
    "loan_amount": 1500.00,
    "interest_rate": 10.0,
    "start_week": "2025-11-03",
    "purpose": "Test loan"
  }'

# Test list loans
curl -X GET "http://localhost:8000/api/v1/loans/" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test get loan detail
curl -X GET "http://localhost:8000/api/v1/loans/DL-2025-0001" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Step 14: Configure Monitoring

Add logging configuration:

```python
# app/core/logging_config.py

import logging
from logging.handlers import RotatingFileHandler

# Create loans logger
loans_logger = logging.getLogger('app.loans')
loans_logger.setLevel(logging.INFO)

# File handler
handler = RotatingFileHandler(
    'logs/loans.log',
    maxBytes=10485760,  # 10MB
    backupCount=10
)

formatter = logging.Formatter(
    '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
handler.setFormatter(formatter)
loans_logger.addHandler(handler)
```

Add metrics tracking:

```python
# app/loans/metrics.py

from prometheus_client import Counter, Histogram

loan_creation_counter = Counter(
    'loans_created_total',
    'Total number of loans created'
)

installment_posting_counter = Counter(
    'installments_posted_total',
    'Total number of installments posted'
)

loan_amount_histogram = Histogram(
    'loan_amount_dollars',
    'Distribution of loan amounts'
)
```

## Step 15: Add Documentation

Copy documentation files:
- README.md → `app/loans/README.md`
- API_REFERENCE.md → `app/loans/API_REFERENCE.md`
- INTEGRATION.md → `app/loans/INTEGRATION.md` (this file)

## Step 16: Security Configuration

Ensure proper permissions:

```python
# app/core/permissions.py

from enum import Enum

class Permission(str, Enum):
    # Loan permissions
    CREATE_LOAN = "loans:create"
    VIEW_LOAN = "loans:view"
    UPDATE_LOAN = "loans:update"
    POST_INSTALLMENTS = "loans:post"
    EXPORT_LOANS = "loans:export"

# Add to role definitions
FINANCE_ROLE = {
    Permission.CREATE_LOAN,
    Permission.VIEW_LOAN,
    Permission.UPDATE_LOAN,
    Permission.POST_INSTALLMENTS,
    Permission.EXPORT_LOANS
}

MANAGER_ROLE = {
    Permission.VIEW_LOAN,
    Permission.EXPORT_LOANS
}
```

## Step 17: Environment Configuration

Add to `.env`:

```bash
# Loan Configuration
LOAN_DEFAULT_INTEREST_RATE=0.00
LOAN_MAX_INTEREST_RATE=20.00
LOAN_POSTING_HOUR=5
LOAN_POSTING_DAY=0  # 0 = Sunday

# Celery Configuration
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0
```

## Step 18: Deployment Checklist

- [ ] Database tables created
- [ ] Models registered with SQLAlchemy
- [ ] Router registered in main app
- [ ] Celery tasks configured
- [ ] Celery workers started
- [ ] Celery beat scheduler started
- [ ] Logging configured
- [ ] Permissions configured
- [ ] Environment variables set
- [ ] Documentation added
- [ ] API tested manually
- [ ] Scheduled job tested
- [ ] Monitoring configured
- [ ] Backup procedures updated

## Step 19: Verify Ledger Integration

Test that installments post correctly to ledger:

```python
# test_ledger_integration.py
from app.core.db import SessionLocal
from app.loans.service import DriverLoanService
from app.ledger.service import LedgerService
from app.ledger.models import PostingCategory

db = SessionLocal()
loan_service = DriverLoanService(db)
ledger_service = LedgerService(db)

try:
    # Post installments
    result = loan_service.post_weekly_installments()
    
    print(f"Posted {result.installments_posted} installments")
    
    # Verify ledger balances created
    if result.installments_posted > 0:
        # Check for LOANS category balances
        balances = ledger_service.balance_repo.find_open_balances(
            driver_id=1,  # Adjust to test driver
            lease_id=1,   # Adjust to test lease
            category=PostingCategory.LOANS
        )
        
        print(f"✓ Found {len(balances)} LOANS balances in ledger")
        
        for balance in balances:
            print(f"  Balance: {balance.balance_id}, Amount: ${balance.outstanding_balance}")
    
except Exception as e:
    print(f"✗ Ledger integration test failed: {str(e)}")
    raise
finally:
    db.close()
```

## Step 20: Training Materials

Create user guide for finance team:

**For Loan Creation:**
1. Navigate to Loans module
2. Click "Create Loan"
3. Select driver (scan TLC license or search)
4. Select lease/medallion
5. Enter loan amount
6. Set interest rate (default 0%)
7. Select start week (must be Sunday)
8. Add purpose/notes
9. Review generated schedule
10. Click "Create"

**For Monitoring:**
1. View "Unposted Installments" report
2. Filter by driver/period as needed
3. Verify amounts before posting
4. Run manual posting if needed
5. Check ledger balances after posting
6. Export reports for reconciliation

## Troubleshooting

### Issue: Celery task not running

**Solution:**
```bash
# Check Celery worker is running
ps aux | grep celery

# Check Celery beat is running
ps aux | grep "celery beat"

# Check logs
tail -f logs/celery.log

# Manually trigger task for testing
celery -A app.core.celery_config:celery_app call post_weekly_loan_installments
```

### Issue: Tables not created

**Solution:**
```bash
# Check database connection
python -c "from app.core.db import engine; print(engine.table_names())"

# Force table creation
python -c "from app.core.db import Base; from app.loans.models import *; Base.metadata.create_all(engine)"
```

### Issue: Import errors

**Solution:**
```bash
# Verify module structure
ls -la app/loans/

# Check imports
python -c "from app.loans.service import DriverLoanService; print('OK')"

# Check all dependencies
pip install -r requirements.txt
```

### Issue: Ledger posting fails

**Solution:**
Check logs for specific error, common issues:
- Driver/lease not found → Verify IDs
- Ledger service error → Check ledger module
- Database transaction error → Check connection

## Performance Optimization

### Add Database Indexes

Already included in models, but verify:

```sql
-- Verify indexes exist
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename IN ('driver_loans', 'loan_schedules');

-- Should see:
-- idx_driver_lease
-- idx_status
-- idx_start_week
-- idx_loan_installment (unique)
-- idx_due_date_status
-- idx_posted_status
```

### Query Optimization

For large datasets, consider:

```python
# Add query timeout
from sqlalchemy import create_engine

engine = create_engine(
    DATABASE_URL,
    pool_size=20,
    max_overflow=40,
    pool_pre_ping=True,
    connect_args={
        "options": "-c statement_timeout=30000"  # 30 seconds
    }
)
```

## Support

For issues during integration:
- Check logs: `logs/loans.log`
- Review API documentation
- Test endpoints with Postman
- Contact development team

## Next Steps

After successful integration:
1. Train finance team on new module
2. Schedule first batch of loan postings
3. Monitor for one week
4. Review reports and reconciliation
5. Gather feedback
6. Plan for additional features

---

**Integration Version:** 1.0.0

**Last Updated:** October 29, 2025

**Status:** Ready for Production Deployment