# EZPass Module - Integration Guide

## Prerequisites

- Python 3.10+
- PostgreSQL 14+
- Redis (for Celery)
- CURB module installed and operational
- Ledger module installed and operational
- Vehicles module with plate numbers

## Step-by-Step Integration

### Step 1: Install Dependencies

All required dependencies are already in project requirements:
```bash
# Verify these are in requirements.txt
sqlalchemy>=2.0.0
pydantic>=2.0.0
celery>=5.3.0
redis>=5.0.0
```

### Step 2: Create Database Tables

Run database migration:
```bash
# Generate migration
alembic revision --autogenerate -m "add_ezpass_tables"

# Apply migration
alembic upgrade head

# Verify tables created
psql -U user -d bat_database -c "\dt ezpass_*"
```

**Expected tables:**
- `ezpass_transactions`
- `ezpass_import_history`

### Step 3: Add Router to Main Application

Update `app/main.py`:
```python
from fastapi import FastAPI
from app.ezpass.router import router as ezpass_router

app = FastAPI(title="BAT Payment Engine")

# Include EZPass router
app.include_router(ezpass_router, prefix="/api/v1")

# Other routers...
```

### Step 4: Configure Celery Tasks

Update `app/worker/config.py`:
```python
# Add to beat_schedule
beat_schedule = {
    # ... existing tasks ...
    
    # EZPass tasks
    'process-unmapped-ezpass': {
        'task': 'ezpass.process_unmapped_transactions',
        'schedule': crontab(hour=6, minute=0),
        'options': {'timezone': 'America/New_York'}
    },
    
    'retry-failed-ezpass-postings': {
        'task': 'ezpass.retry_failed_postings',
        'schedule': crontab(hour='*/4'),
        'options': {'timezone': 'America/New_York'}
    },
    
    'auto-resolve-ezpass': {
        'task': 'ezpass.auto_resolve_paid_tolls',
        'schedule': crontab(hour=7, minute=0, day_of_week='mon'),
        'options': {'timezone': 'America/New_York'}
    }
}
```

Update `app/worker/app.py`:
```python
from celery import Celery

app = Celery("BAT_scheduler")
app.config_from_object("app.worker.config")

# Auto-discover tasks
app.autodiscover_tasks([
    "app.worker",
    "app.curb",
    "app.ledger",
    "app.ezpass",  # Add this line
])
```

### Step 5: Start Celery Workers
```bash
# Start Celery worker
celery -A app.worker.app worker --loglevel=info --queue=default

# Start Celery beat (scheduler)
celery -A app.worker.app beat --loglevel=info
```

### Step 6: Start Application
```bash
# Development
uvicorn app.main:app --reload --port 8000

# Production
gunicorn app.main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

### Step 7: Verify Installation
```bash
# Check API documentation
open http://localhost:8000/docs

# Verify EZPass endpoints appear
# Should see:
# - POST /api/v1/ezpass/upload
# - GET /api/v1/ezpass/transactions
# - GET /api/v1/ezpass/import/history
# - etc.
```

### Step 8: Test CSV Import

**1. Prepare test CSV:**
```csv
POSTING DATE,TRANSACTION DATE,TAG/PLATE NUMBER,AGENCY,ACTIVITY,PLAZA ID,ENTRY TIME,ENTRY PLAZA,ENTRY LANE,EXIT TIME,EXIT PLAZA,EXIT LANE,VEHICLE TYPE CODE,AMOUNT,PREPAID,PLAN/RATE,FARE TYPE,BALANCE
10/20/2025,10/20/2025,YV0234C,MTABT,TOLL,22,14:30:00,M18BAT,1,14:35:00,M18BAT,2,2,$8.11,NO,EZ-PASS,STANDARD,$250.00
```

**2. Upload via API:**
```bash
curl -X POST "http://localhost:8000/api/v1/ezpass/upload" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@test_ezpass.csv" \
  -F "perform_matching=true" \
  -F "post_to_ledger=true" \
  -F "auto_match_threshold=0.90"
```

**3. Check response:**
```json
{
  "batch_id": "EZPASS-20251028-143022",
  "status": "COMPLETED",
  "message": "Import completed successfully",
  "total_rows_in_file": 1,
  "total_transactions_imported": 1,
  "total_auto_matched": 1,
  "total_posted_to_ledger": 1
}
```

### Step 9: Verify Database Records
```sql
-- Check transactions
SELECT * FROM ezpass_transactions LIMIT 5;

-- Check import history
SELECT * FROM ezpass_import_history ORDER BY started_at DESC LIMIT 5;

-- Check ledger postings
SELECT * FROM ledger_postings WHERE category = 'EZPASS' LIMIT 5;

-- Check ledger balances
SELECT * FROM ledger_balances WHERE category = 'EZPASS' LIMIT 5;
```

### Step 10: Monitor Scheduled Tasks
```bash
# Check Celery logs
tail -f logs/celery.log

# Monitor task execution
celery -A app.worker.app events

# Or use Flower (Celery monitoring tool)
pip install flower
celery -A app.worker.app flower
# Open http://localhost:5555
```

## Configuration

### Environment Variables

Add to `.env` file:
```bash
# EZPass Configuration
EZPASS_AUTO_MATCH_THRESHOLD=0.90
EZPASS_TIME_WINDOW_MINUTES=30
EZPASS_MAX_IMPORT_ROWS=10000
```

### Application Settings

Update `app/core/config.py`:
```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # ... existing settings ...
    
    # EZPass settings
    ezpass_auto_match_threshold: float = 0.90
    ezpass_time_window_minutes: int = 30
    ezpass_max_import_rows: int = 10000
    
    class Config:
        env_file = ".env"

settings = Settings()
```

## Integration with Existing Modules

### CURB Module

EZPass depends on CURB trips for matching:
```python
# Ensure CURB trips are imported regularly
# EZPass matching requires:
# - curb_trips.vehicle_id populated
# - curb_trips.start_datetime accurate
# - curb_trips.driver_id mapped
```

### Ledger Module

EZPass posts obligations to ledger:
```python
# Ledger posting creates:
# - PostingType.DEBIT (obligation)
# - PostingCategory.EZPASS (priority 2)
# - LedgerBalance record

# Payment hierarchy ensures EZPass paid after TAXES but before LEASE
```

### Vehicles Module

EZPass requires vehicles with plate numbers:
```python
# Ensure vehicles table has:
# - plate_number populated
# - plate_number unique per vehicle
# - plate_number matches EZPass CSV format
```

### DTR Generation

EZPass tolls appear in DTR:
```python
# DTR section: "EZPass Tolls"
# Shows all tolls for payment period
# Includes:
# - Transaction date/time
# - TLC license (from mapping)
# - Plate number
# - Agency, entry/exit
# - Toll amount
# - Prior balance
# - Payment applied (via hierarchy)
# - Balance carried forward
```

## Data Flow
```
┌─────────────────────────────────────────┐
│         CSV Upload (Weekly)              │
│  - EZPass sends CSV every weekend        │
│  - User uploads via API                  │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│         Parse & Import                   │
│  - Validate CSV format                   │
│  - Check duplicates                      │
│  - Calculate payment periods             │
│  - Save to ezpass_transactions           │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│         Map to Vehicle                   │
│  - Lookup by plate_number                │
│  - Link to vehicle_id                    │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│         Match to CURB Trip               │
│  - Find trips within ±30 min             │
│  - Score each potential match            │
│  - Auto-assign if confidence ≥ 0.90      │
│  - Flag for manual review if < 0.90      │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│         Post to Ledger                   │
│  - Create DEBIT obligation               │
│  - Category: EZPASS (priority 2)         │
│  - Link to ledger_balance                │
│  - Track posting status                  │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│         Payment via Hierarchy            │
│  - DTR generation applies payments       │
│  - TAXES paid first, then EZPASS         │
│  - Balance updated in ledger             │
│  - Resolution status set to RESOLVED     │
└─────────────────────────────────────────┘
```

## Testing Integration

### Manual Test Scenarios

**Scenario 1: Successful Auto-Match**
```
1. Import CURB trip at 14:30 for vehicle YV0234C
2. Upload EZPass CSV with toll at 14:35 for YV0234C
3. Verify: auto-matched, confidence ≥ 0.90, posted to ledger
```

**Scenario 2: Manual Review Required**
```
1. Upload EZPass CSV with toll for plate ABC123
2. No CURB trips within ±30 min
3. Verify: mapping_method = UNKNOWN, flagged for review
4. Manually remap to correct driver
5. Verify: posted to ledger after remapping
```

**Scenario 3: Duplicate Handling**
```
1. Upload EZPass CSV
2. Upload same CSV again
3. Verify: duplicates skipped, no errors
```

**Scenario 4: Ledger Integration**
```
1. Import and post EZPass toll
2. Generate DTR for driver
3. Verify: toll appears in DTR EZPass section
4. Apply payment via hierarchy
5. Verify: balance reduced, resolution_status = RESOLVED
```

### Automated Tests
```bash
# Run unit tests
pytest app/ezpass/tests/ -v

# Run integration tests
pytest app/ezpass/tests/test_integration.py -v

# Check test coverage
pytest app/ezpass/tests/ --cov=app.ezpass --cov-report=html
```

## Monitoring

### Key Metrics to Monitor

1. **Import Success Rate**
```sql
   SELECT 
     status,
     COUNT(*) as count,
     ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
   FROM ezpass_import_history
   WHERE started_at >= NOW() - INTERVAL '7 days'
   GROUP BY status;
```

2. **Auto-Match Rate**
```sql
   SELECT 
     mapping_method,
     COUNT(*) as count,
     ROUND(AVG(mapping_confidence), 2) as avg_confidence
   FROM ezpass_transactions
   WHERE imported_on >= NOW() - INTERVAL '7 days'
   GROUP BY mapping_method;
```

3. **Posting Success Rate**
```sql
   SELECT 
     posting_status,
     COUNT(*) as count
   FROM ezpass_transactions
   WHERE imported_on >= NOW() - INTERVAL '7 days'
   GROUP BY posting_status;
```

4. **Unmapped Transactions**
```sql
   SELECT COUNT(*) as unmapped_count
   FROM ezpass_transactions
   WHERE mapping_method = 'UNKNOWN'
   AND imported_on >= NOW() - INTERVAL '7 days';
```

### Alerts

Set up alerts for:
- Import failures (status = FAILED)
- Low auto-match rate (< 80%)
- High posting failure rate (> 5%)
- Large number of unmapped transactions (> 50)

## Troubleshooting

### Issue: Import Fails Immediately

**Symptoms:**
```json
{
  "status": "FAILED",
  "error": "..."
}
```

**Solutions:**
1. Check CSV format matches expected columns
2. Verify database connection
3. Check logs: `tail -f logs/ezpass.log`
4. Ensure vehicles table has plate numbers

### Issue: Low Auto-Match Rate

**Symptoms:**
```
total_auto_matched: 10
total_unmapped: 90
```

**Solutions:**
1. Verify CURB trips are being imported
2. Check transaction times are accurate
3. Verify plate numbers match between systems
4. Consider lowering auto_match_threshold temporarily
5. Check time window (±30 min) is appropriate

### Issue: Posting Failures

**Symptoms:**
```
total_posting_failures: 25
posting_error: "Missing driver_id"
```

**Solutions:**
1. Ensure transactions are mapped before posting
2. Check driver/lease associations exist
3. Verify ledger service is operational
4. Review posting errors in transaction records

### Issue: Celery Tasks Not Running

**Symptoms:**
- Unmapped transactions not being reprocessed
- Failed postings not retrying

**Solutions:**
1. Check Celery worker is running
2. Check Celery beat is running
3. Verify task configuration in beat_schedule
4. Check Celery logs: `tail -f logs/celery.log`
5. Restart Celery workers

## Production Checklist

- [ ] Database migration completed successfully
- [ ] All indexes created and optimized
- [ ] Celery workers running (at least 2 instances)
- [ ] Celery beat scheduler running
- [ ] Router integrated in main.py
- [ ] Environment variables configured
- [ ] Logging configured and working
- [ ] Test CSV import successful
- [ ] Auto-matching working correctly
- [ ] Ledger posting working correctly
- [ ] Remapping functionality tested
- [ ] Export functionality tested
- [ ] Scheduled tasks verified
- [ ] Monitoring dashboards set up
- [ ] Alerts configured
- [ ] Documentation reviewed by team
- [ ] Stakeholder training completed
- [ ] Backup and recovery plan in place

## Support

For issues during integration:

1. **Check Documentation:**
   - README.md for module overview
   - INTEGRATION.md (this file)
   - API docs at /docs endpoint

2. **Review Logs:**
   - Application: `logs/app.log`
   - EZPass: `logs/ezpass.log`
   - Celery: `logs/celery.log`

3. **Database Inspection:**
```sql
   -- Recent imports
   SELECT * FROM ezpass_import_history ORDER BY started_at DESC LIMIT 10;
   
   -- Recent transactions
   SELECT * FROM ezpass_transactions ORDER BY imported_on DESC LIMIT 10;
   
   -- Current statistics
   SELECT 
     mapping_method,
     posting_status,
     COUNT(*)
   FROM ezpass_transactions
   WHERE imported_on >= NOW() - INTERVAL '1 day'
   GROUP BY mapping_method, posting_status;
```

4. **Contact:**
   - Development team
   - GitHub Issues
   - Slack: #payment-engine

---

**Integration Guide Version:** 1.0
**Last Updated:** October 28, 2025
**Status:** Production Ready ✅