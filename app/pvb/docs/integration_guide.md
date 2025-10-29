# PVB Module - Integration Guide

## Prerequisites

Before integrating the PVB module, ensure the following are in place:

### Required Modules
- ✅ Ledger module (fully functional)
- ✅ CURB module (importing trips regularly)
- ✅ Drivers module
- ✅ Vehicles module
- ✅ Leases module
- ✅ Medallions module
- ✅ Uploads module

### System Requirements
- Python 3.9+
- PostgreSQL 13+
- Redis (for Celery)
- Celery workers running
- S3 bucket configured (for document storage)

### Database
- Sufficient storage for violations (estimate: 50KB per violation)
- Proper indexes on related tables
- Database migration tool configured

## Step-by-Step Integration

### Step 1: Add Module to Project

1. Copy the entire `app/pvb/` directory to your project
2. Verify all files are present:
   ```bash
   app/pvb/
   ├── __init__.py
   ├── models.py
   ├── repository.py
   ├── services.py
   ├── router.py
   ├── schemas.py
   ├── exceptions.py
   └── tasks.py
   ```

### Step 2: Database Migration

Create and run database migration:

```python
# Create migration file
alembic revision -m "Add PVB tables"

# Migration file content (example):
"""
def upgrade():
    # pvb_violations table
    op.create_table(
        'pvb_violations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('summons_number', sa.String(50), nullable=False),
        sa.Column('plate_number', sa.String(20), nullable=False),
        # ... (copy all columns from models.py)
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('summons_number')
    )
    
    # Create indexes
    op.create_index('idx_pvb_plate', 'pvb_violations', ['plate_number'])
    op.create_index('idx_pvb_issue_date', 'pvb_violations', ['issue_date'])
    # ... (all indexes from models.py)
    
    # Repeat for pvb_import_history, pvb_summons, pvb_import_failures
    
def downgrade():
    op.drop_table('pvb_import_failures')
    op.drop_table('pvb_summons')
    op.drop_table('pvb_import_history')
    op.drop_table('pvb_violations')
"""

# Run migration
alembic upgrade head
```

### Step 3: Register Router

Add PVB router to main FastAPI application:

```python
# app/main.py

from fastapi import FastAPI
from app.pvb import router as pvb_router

app = FastAPI()

# Add PVB router
app.include_router(pvb_router.router, prefix="/api")

# Other routers...
```

### Step 4: Configure Celery Tasks

Add PVB tasks to Celery configuration:

```python
# app/celery_app.py (or wherever Celery is configured)

from celery import Celery
from celery.schedules import crontab

app = Celery('bat_connect')

# Add beat schedule for PVB tasks
app.conf.beat_schedule = {
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
    # ... other tasks
}

# Import PVB tasks so Celery can discover them
from app.pvb import tasks
```

### Step 5: Environment Configuration

Add any necessary environment variables:

```bash
# .env file (if any PVB-specific configs needed)

# S3 bucket for summons documents (uses existing UPLOADS config)
# No additional env vars needed - uses existing configuration

# Celery configuration (if not already set)
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0
```

### Step 6: Start Services

Ensure all services are running:

```bash
# Start FastAPI application
uvicorn app.main:app --reload

# Start Celery worker (in separate terminal)
celery -A app.celery_app worker --loglevel=info

# Start Celery beat scheduler (in separate terminal)
celery -A app.celery_app beat --loglevel=info
```

### Step 7: Verify Installation

Run verification checks:

```bash
# Check database tables created
psql -d your_database -c "\dt pvb_*"

# Expected output:
# pvb_violations
# pvb_import_history
# pvb_summons
# pvb_import_failures

# Check API endpoints
curl http://localhost:8000/docs

# Look for /api/pvb/ endpoints

# Check Celery tasks registered
celery -A app.celery_app inspect registered

# Look for:
# - import_weekly_dof_pvb
# - retry_unmapped_pvb
# - post_unposted_pvb
```

### Step 8: Initial Data Import

Test with sample data:

```bash
# Using curl
curl -X POST "http://localhost:8000/api/pvb/upload" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@sample_pvb.csv" \
  -F "perform_matching=true" \
  -F "post_to_ledger=true"

# Expected response:
# {
#   "success": true,
#   "batch_id": "PVB-20251028-...",
#   "total_imported": 10,
#   "auto_matched_count": 8,
#   ...
# }
```

### Step 9: Verify Integrations

Check integration with other modules:

#### Ledger Integration
```python
# Verify PVB postings appear in ledger
from app.ledger.repository import LedgerPostingRepository

repo = LedgerPostingRepository(db)
pvb_postings = repo.find_by_category(PostingCategory.PVB)

# Should return PVB violation postings
```

#### CURB Integration
```python
# Verify CURB trips are being used for matching
from app.pvb.repository import PVBViolationRepository

repo = PVBViolationRepository(db)
matched = repo.find_violations(
    mapping_method=MappingMethod.AUTO_CURB_MATCH
)

# Should return auto-matched violations
```

#### Uploads Integration
```python
# Verify summons documents can be uploaded
# Test via API endpoint /pvb/violations/{id}/upload-summons
```

## Configuration Options

### Matching Threshold

Adjust auto-match confidence threshold:

```python
# In API calls or service layer
auto_match_threshold = Decimal('0.90')  # Default

# Lower threshold for more auto-matches (less strict)
auto_match_threshold = Decimal('0.80')

# Higher threshold for fewer auto-matches (more strict)
auto_match_threshold = Decimal('0.95')
```

### Time Window

Modify CURB trip matching time window:

```python
# In services.py, _match_violation_to_entities method

# Current: ±30 minutes
time_window_start = violation.issue_date - timedelta(minutes=30)
time_window_end = violation.issue_date + timedelta(minutes=30)

# Adjust as needed:
# Narrower window (more strict)
time_window_start = violation.issue_date - timedelta(minutes=15)
time_window_end = violation.issue_date + timedelta(minutes=15)

# Wider window (more lenient)
time_window_start = violation.issue_date - timedelta(minutes=45)
time_window_end = violation.issue_date + timedelta(minutes=45)
```

### Scheduled Task Timing

Modify Celery beat schedule:

```python
# Change import time from 5 AM to 6 AM
'import-weekly-dof-pvb': {
    'task': 'import_weekly_dof_pvb',
    'schedule': crontab(hour=6, minute=0, day_of_week=6),
},

# Change retry frequency from daily to twice daily
'retry-unmapped-pvb-morning': {
    'task': 'retry_unmapped_pvb',
    'schedule': crontab(hour=6, minute=0),
},
'retry-unmapped-pvb-evening': {
    'task': 'retry_unmapped_pvb',
    'schedule': crontab(hour=18, minute=0),
},
```

## Testing Integration

### Unit Tests

Create test file:

```python
# tests/test_pvb.py

import pytest
from decimal import Decimal
from datetime import datetime

from app.pvb.services import PVBImportService
from app.pvb.models import MappingMethod

def test_import_csv(db_session):
    """Test CSV import"""
    service = PVBImportService(db_session)
    
    csv_content = """PLATE,STATE,SUMMONS,ISSUE DATE,ISSUE TIME,FINE,AMOUNT DUE
Y205630C,NY,4046361992,7/3/2025,0752A,250,250"""
    
    history, errors = service.import_csv_file(
        csv_content=csv_content,
        file_name="test.csv",
        perform_matching=False,
        post_to_ledger=False,
        triggered_by="TEST"
    )
    
    assert history.total_imported == 1
    assert len(errors) == 0

def test_confidence_scoring(db_session):
    """Test matching confidence calculation"""
    # Setup: Create test violation, vehicle, CURB trip
    # Test: Calculate confidence
    # Assert: Confidence within expected range
    pass

def test_ledger_posting(db_session):
    """Test posting to ledger"""
    # Setup: Create mapped violation
    # Test: Post to ledger
    # Assert: Ledger balance created
    pass

def test_manual_remapping(db_session):
    """Test manual remapping"""
    # Setup: Create violation with auto-match
    # Test: Remap to different driver
    # Assert: Previous posting voided, new posting created
    pass
```

Run tests:
```bash
pytest tests/test_pvb.py -v
```

### Integration Tests

```python
# tests/integration/test_pvb_flow.py

def test_complete_flow(db_session):
    """Test complete flow: import → match → post → DTR"""
    
    # 1. Import violations
    service = PVBImportService(db_session)
    history, _ = service.import_csv_file(...)
    
    # 2. Verify matching occurred
    violation_repo = PVBViolationRepository(db_session)
    violations = violation_repo.find_violations(
        import_batch_id=history.batch_id
    )
    
    matched = [v for v in violations if v.driver_id is not None]
    assert len(matched) > 0
    
    # 3. Verify ledger posting
    from app.ledger.repository import LedgerBalanceRepository
    balance_repo = LedgerBalanceRepository(db_session)
    
    for v in matched:
        if v.posted_to_ledger:
            balance = balance_repo.get_by_id(v.ledger_balance_id)
            assert balance is not None
            assert balance.category == PostingCategory.PVB
    
    # 4. Verify DTR generation includes PVB
    # (Requires DTR module to be implemented)
```

### Manual API Testing

Use provided Postman/Insomnia collection or curl:

```bash
# 1. Upload CSV
curl -X POST "http://localhost:8000/api/pvb/upload" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test_pvb.csv"

# 2. List violations
curl "http://localhost:8000/api/pvb/violations?page=1&page_size=10" \
  -H "Authorization: Bearer $TOKEN"

# 3. Get violation detail
curl "http://localhost:8000/api/pvb/violations/1" \
  -H "Authorization: Bearer $TOKEN"

# 4. Create manual violation
curl -X POST "http://localhost:8000/api/pvb/create" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "plate_number": "ABC1234",
    "summons_number": "1234567890",
    "issue_date": "2025-10-28T10:00:00",
    "fine_amount": 115.00,
    "amount_due": 115.00
  }'

# 5. Get statistics
curl "http://localhost:8000/api/pvb/statistics" \
  -H "Authorization: Bearer $TOKEN"

# 6. Export to Excel
curl "http://localhost:8000/api/pvb/export?format=excel" \
  -H "Authorization: Bearer $TOKEN" \
  -o violations.xlsx
```

## Troubleshooting

### Issue: Import Fails with "Invalid CSV Format"

**Symptoms**: 400 error on CSV upload

**Solution**:
1. Verify CSV has all required columns
2. Check encoding (should be UTF-8)
3. Ensure no extra blank rows
4. Validate date format (MM/DD/YYYY)

### Issue: No Violations Being Auto-Matched

**Symptoms**: All violations have mapping_method = UNKNOWN

**Possible Causes**:
1. CURB trips not being imported
2. Vehicle plate numbers don't match
3. Time window too narrow
4. No CURB trips in time range

**Solution**:
```bash
# Check CURB trips exist
curl "http://localhost:8000/api/curb/trips" -H "Authorization: Bearer $TOKEN"

# Check vehicle exists
curl "http://localhost:8000/api/vehicles?plate_number=Y205630C" -H "Authorization: Bearer $TOKEN"

# Lower threshold temporarily
curl -X POST "http://localhost:8000/api/pvb/upload?auto_match_threshold=0.70" \
  -F "file=@test.csv"
```

### Issue: Violations Not Posting to Ledger

**Symptoms**: posted_to_ledger = False even though matched

**Possible Causes**:
1. Ledger service error
2. Missing driver_id or lease_id
3. amount_due = 0
4. Violation in DISPUTED status

**Solution**:
```python
# Check ledger service
from app.ledger.service import LedgerService

service = LedgerService(db)
# Test with manual posting...

# Check violation details
violation = violation_repo.get_by_id(violation_id)
print(f"Driver ID: {violation.driver_id}")
print(f"Lease ID: {violation.lease_id}")
print(f"Amount Due: {violation.amount_due}")
print(f"Status: {violation.violation_status}")

# Manually retry posting
if violation.driver_id and violation.lease_id and violation.amount_due > 0:
    pvb_service._post_violation_to_ledger(violation)
```

### Issue: Celery Tasks Not Running

**Symptoms**: Scheduled imports not occurring

**Solution**:
```bash
# Check Celery beat is running
ps aux | grep celery

# Check registered tasks
celery -A app.celery_app inspect registered | grep pvb

# Check beat schedule
celery -A app.celery_app inspect scheduled

# Manually trigger task for testing
celery -A app.celery_app call import_weekly_dof_pvb
```

## Monitoring and Maintenance

### Daily Checks

```bash
# Check import statistics
curl "http://localhost:8000/api/pvb/statistics" -H "Authorization: Bearer $TOKEN"

# Check unmapped count (should be low)
curl "http://localhost:8000/api/pvb/violations/unmapped" -H "Authorization: Bearer $TOKEN"

# Check unposted count (should be low)
curl "http://localhost:8000/api/pvb/violations/unposted" -H "Authorization: Bearer $TOKEN"

# Review recent imports
curl "http://localhost:8000/api/pvb/import/history?page=1&page_size=5" -H "Authorization: Bearer $TOKEN"
```

### Weekly Maintenance

1. Review unmapped violations and manually assign
2. Check import failure reasons
3. Verify ledger postings are accurate
4. Review matching confidence scores
5. Monitor database table sizes

### Monthly Maintenance

1. Archive old import history (>90 days)
2. Generate monthly reports
3. Review and adjust matching thresholds
4. Update violation code mappings if needed
5. Optimize database indexes if slow

## Performance Optimization

### Database Indexes

Ensure these indexes exist:

```sql
-- Essential indexes (created in migration)
CREATE INDEX idx_pvb_plate ON pvb_violations(plate_number);
CREATE INDEX idx_pvb_issue_date ON pvb_violations(issue_date);
CREATE INDEX idx_pvb_driver_lease ON pvb_violations(driver_id, lease_id);
CREATE INDEX idx_pvb_posting_status ON pvb_violations(posting_status, posted_to_ledger);

-- Optional indexes for heavy query patterns
CREATE INDEX idx_pvb_batch ON pvb_violations(import_batch_id);
CREATE INDEX idx_pvb_mapping ON pvb_violations(mapping_method);
CREATE INDEX idx_pvb_violation_status ON pvb_violations(violation_status);
```

### Query Optimization

For large datasets:

```python
# Use pagination
violations, total = repo.find_violations(
    limit=50,  # Don't fetch all at once
    offset=0
)

# Filter by date range
violations, total = repo.find_violations(
    date_from=datetime.now() - timedelta(days=90),  # Last 90 days only
    date_to=datetime.now()
)

# Use specific filters to reduce dataset
violations, total = repo.find_violations(
    driver_id=123,  # Specific driver
    violation_status=ViolationStatus.OPEN  # Only open violations
)
```

### Bulk Operations

For processing many violations:

```python
# Use bulk update for status changes
violation_ids = [1, 2, 3, 4, 5]
repo.bulk_update_posting_status(
    violation_ids=violation_ids,
    posting_status=PostingStatus.POSTED,
    posted_to_ledger=True
)

# Use async tasks for large imports
from app.pvb.tasks import import_pvb_csv_task

import_pvb_csv_task.delay(
    csv_content=large_csv_string,
    file_name="large_file.csv"
)
```

## Security Considerations

### Access Control

Implement role-based access:

```python
# In router.py, add role checking
from app.users.permissions import require_role

@router.post("/upload")
@require_role("finance_admin")  # Only finance admins can import
async def upload_pvb_csv(...):
    pass

@router.post("/violations/{id}/remap")
@require_role("finance_manager")  # Only managers can remap
def remap_violation(...):
    pass
```

### Audit Trail

All operations are logged:
- Import history with user ID
- Manual assignments with user ID and reason
- Remapping with before/after states
- Document uploads with user ID

### Data Validation

All inputs are validated:
- CSV format validation
- Required fields checking
- Data type validation
- Business rule enforcement

## Support and Contact

### Getting Help

1. Check this integration guide
2. Review API documentation at `/docs`
3. Check logs in `logs/pvb.log`
4. Contact development team

### Reporting Bugs

Include:
- Environment (dev/staging/production)
- Steps to reproduce
- Expected vs actual behavior
- Relevant log entries
- Batch ID or violation ID

### Feature Requests

Submit feature requests with:
- Use case description
- Expected behavior
- Business justification
- Priority level

---

**Integration Status**: Ready for Production ✅

**Last Updated**: October 2025

**Version**: 1.0.0