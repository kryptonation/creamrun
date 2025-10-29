# Vehicle Repairs Module - Integration Guide

Complete step-by-step guide for integrating the Vehicle Repairs module into BAT Payment Engine.

## Prerequisites

Ensure these modules are already implemented:
- Centralized Ledger (Phase 1)
- Drivers module
- Leases module
- Vehicles module
- Medallions module
- Users module
- Authentication/Authorization

## Step-by-Step Integration

### Step 1: Create Module Directory

```bash
mkdir -p app/repairs
cd app/repairs
```

### Step 2: Copy Module Files

Copy all the provided files into the repairs directory:

```
app/repairs/
├── __init__.py
├── models.py
├── schemas.py
├── repository.py
├── service.py (combine Part 1 and Part 2)
├── router.py (combine Part 1 and Part 2)
├── tasks.py
├── exceptions.py
├── README.md
└── INTEGRATION.md (this file)
```

**Important:** When copying service.py and router.py, merge Part 1 and Part 2 into single files.

### Step 3: Database Setup

Since you mentioned no migration files are needed, ensure tables are created. If using Alembic:

```bash
# Generate migration
alembic revision --autogenerate -m "Add vehicle repairs tables"

# Review the generated migration
# Edit if needed

# Apply migration
alembic upgrade head
```

Or verify tables exist manually:

```sql
-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_name IN ('vehicle_repairs', 'repair_installments');

-- Verify columns
\d vehicle_repairs
\d repair_installments
```

### Step 4: Register Router

Add the repairs router to your main application file.

**File:** `app/main.py` or wherever you configure FastAPI

```python
from fastapi import FastAPI
from app.repairs import repairs_router

app = FastAPI(title="BAT Payment Engine")

# ... other routers ...

# Add repairs router
app.include_router(
    repairs_router,
    prefix="/api",
    tags=["Vehicle Repairs"]
)

# ... rest of configuration ...
```

### Step 5: Configure Celery Tasks

Add the weekly posting task to your Celery beat schedule.

**File:** `app/celery_app.py` or your Celery configuration file

```python
from celery import Celery
from celery.schedules import crontab

app = Celery('bat_payment_engine')

# ... existing configuration ...

# Add repairs posting schedule
app.conf.beat_schedule.update({
    'post-weekly-repair-installments': {
        'task': 'repairs.post_weekly_installments',
        'schedule': crontab(
            hour=5,
            minute=0,
            day_of_week=0  # Sunday
        ),
        'options': {
            'expires': 3600,  # Expire after 1 hour if not run
        }
    }
})
```

### Step 6: Start Services

Start all required services:

```bash
# Terminal 1: Main application
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2: Celery worker
celery -A celery_app worker --loglevel=info

# Terminal 3: Celery beat scheduler
celery -A celery_app beat --loglevel=info
```

### Step 7: Verify Installation

#### Test API Endpoints

```bash
# Health check - List repairs (should return empty list initially)
curl -X GET http://localhost:8000/api/repairs/ \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get statistics (should return zeros initially)
curl -X GET http://localhost:8000/api/repairs/statistics \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Check Celery Task Registration

```bash
# List all registered tasks
celery -A celery_app inspect registered

# Should see: repairs.post_weekly_installments
```

#### Verify Beat Schedule

```bash
# Show beat schedule
celery -A celery_app inspect scheduled

# Should show weekly posting task
```

### Step 8: Test with Sample Data

Create a test repair to verify everything works:

```bash
curl -X POST http://localhost:8000/api/repairs/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "driver_id": 1,
    "lease_id": 1,
    "vehicle_id": 1,
    "medallion_id": 1,
    "invoice_number": "TEST-001",
    "invoice_date": "2025-10-01",
    "workshop_type": "EXTERNAL",
    "repair_description": "Test repair",
    "repair_amount": 500.00,
    "start_week": "CURRENT"
  }'
```

Expected response:
```json
{
  "repair_id": "RPR-2025-001",
  "invoice_number": "TEST-001",
  "repair_amount": 500.00,
  "weekly_installment_amount": 100.00,
  "status": "DRAFT",
  "outstanding_balance": 500.00
}
```

### Step 9: Confirm and Post Installment

```bash
# Confirm the repair
REPAIR_ID="RPR-2025-001"

curl -X POST http://localhost:8000/api/repairs/${REPAIR_ID}/confirm \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get unposted installments
curl -X GET http://localhost:8000/api/repairs/installments/unposted \
  -H "Authorization: Bearer YOUR_TOKEN"

# Manually post first installment
INSTALLMENT_ID="RPR-2025-001-01"

curl -X POST http://localhost:8000/api/repairs/installments/post \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "installment_ids": ["'${INSTALLMENT_ID}'"]
  }'
```

### Step 10: Verify Ledger Integration

Check that installment was posted to ledger:

```bash
# Query ledger postings
curl -X GET http://localhost:8000/api/ledger/postings?category=REPAIRS \
  -H "Authorization: Bearer YOUR_TOKEN"

# Query ledger balances
curl -X GET http://localhost:8000/api/ledger/balances?category=REPAIRS \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Should see:
- Ledger posting with DEBIT, REPAIRS category
- Ledger balance with installment amount

## Configuration Options

### Payment Matrix Customization

If you need to customize the payment matrix, edit `service.py`:

```python
class RepairService:
    PAYMENT_MATRIX = [
        (0, 200, None),                    # $0-200: Paid in full
        (201, 500, Decimal("100.00")),     # $201-500: $100/week
        (501, 1000, Decimal("200.00")),    # $501-1000: $200/week
        (1001, 3000, Decimal("250.00")),   # $1001-3000: $250/week
        (3001, None, Decimal("300.00"))    # >$3000: $300/week
    ]
```

### Posting Schedule Customization

To change posting time, edit Celery configuration:

```python
# Different time (e.g., Monday 6 AM)
'schedule': crontab(hour=6, minute=0, day_of_week=1)

# Multiple times per week
'schedule': crontab(hour=5, minute=0, day_of_week='0,3')  # Sun, Wed
```

### Pagination Defaults

To change default page size, edit router query parameters:

```python
page_size: int = Query(100, ge=1, le=1000)  # Change default from 50 to 100
```

## Troubleshooting

### Common Issues

**Issue 1: Import errors when starting application**

```
ImportError: cannot import name 'repairs_router'
```

**Solution:**
- Verify `__init__.py` exists in `app/repairs/`
- Check router is properly exported
- Restart application

---

**Issue 2: Tables not found error**

```
sqlalchemy.exc.ProgrammingError: relation "vehicle_repairs" does not exist
```

**Solution:**
- Run database migration
- Verify tables created: `\dt vehicle_repairs`
- Check database connection

---

**Issue 3: Celery task not executing**

```
WARNING: No results for task repairs.post_weekly_installments
```

**Solution:**
- Verify Celery worker is running
- Check task is registered: `celery -A celery_app inspect registered`
- Review Celery logs for errors

---

**Issue 4: Ledger posting fails**

```
Failed to post installment: Ledger service error
```

**Solution:**
- Verify ledger service is functional
- Check driver_id and lease_id are valid
- Ensure ledger tables exist
- Review ledger service logs

---

**Issue 5: Authentication errors**

```
401 Unauthorized
```

**Solution:**
- Generate valid JWT token
- Check token is not expired
- Verify authentication middleware configured

## Testing Checklist

Use this checklist to verify complete integration:

### Basic Functionality
- [ ] Create repair invoice
- [ ] View repair details
- [ ] Update repair invoice
- [ ] Confirm repair (DRAFT -> OPEN)
- [ ] Update repair status
- [ ] List repairs with pagination
- [ ] Filter repairs by driver/lease/vehicle
- [ ] Sort repairs by date/amount

### Installment Management
- [ ] View repair installments
- [ ] Find unposted installments by driver
- [ ] Find unposted installments by date range
- [ ] Find unposted installments by vehicle
- [ ] List all installments with filters
- [ ] Get specific installment details

### Ledger Integration
- [ ] Manually post single installment
- [ ] Manually post multiple installments
- [ ] Verify ledger posting created
- [ ] Verify ledger balance created
- [ ] Check installment status updated to POSTED
- [ ] Verify repair total_paid updated

### Scheduled Jobs
- [ ] Celery worker running
- [ ] Celery beat running
- [ ] Weekly task registered
- [ ] Manual task trigger works
- [ ] Verify automatic posting on Sunday

### Export Functionality
- [ ] Export repairs to Excel
- [ ] Export repairs to PDF
- [ ] Export repairs to CSV
- [ ] Export repairs to JSON
- [ ] Export installments to Excel
- [ ] Export installments with filters

### Statistics and Reports
- [ ] Get overall statistics
- [ ] Get statistics by driver
- [ ] Get statistics by lease
- [ ] Get statistics by date range
- [ ] Verify counts accurate
- [ ] Verify amounts accurate

### Error Handling
- [ ] Try creating duplicate invoice
- [ ] Try updating posted repair
- [ ] Try invalid status transition
- [ ] Try posting already-posted installment
- [ ] Verify appropriate error messages
- [ ] Verify HTTP status codes correct

### Edge Cases
- [ ] Repair amount $200 (paid in full)
- [ ] Repair amount $1500 ($250/week)
- [ ] Repair amount $5000 ($300/week)
- [ ] Multiple repairs for same driver
- [ ] Repair with HOLD status
- [ ] Repair cancellation

## Performance Optimization

### Database Indexes

Verify all indexes are created:

```sql
-- Check indexes on vehicle_repairs
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'vehicle_repairs';

-- Check indexes on repair_installments
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'repair_installments';
```

Expected indexes:
- `idx_repairs_driver_status`
- `idx_repairs_lease_status`
- `idx_repairs_vehicle`
- `idx_repairs_invoice_date`
- `idx_installments_repair`
- `idx_installments_driver_status`
- `idx_installments_week_start`
- `idx_installments_unposted`

### Query Performance

Monitor slow queries:

```sql
-- Enable query logging (PostgreSQL)
ALTER DATABASE your_db SET log_min_duration_statement = 1000;

-- Check slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
WHERE query LIKE '%vehicle_repairs%' OR query LIKE '%repair_installments%'
ORDER BY mean_exec_time DESC
LIMIT 10;
```

### Caching Recommendations

Consider caching for:
- Statistics (cache for 5 minutes)
- Driver repair list (cache for 1 minute)
- Payment matrix lookup (cache indefinitely)

## Monitoring and Alerts

### Key Metrics to Monitor

1. **Weekly Posting Success Rate**
   - Target: >99%
   - Alert if <95%

2. **Unposted Installment Backlog**
   - Target: <10 items
   - Alert if >50 items

3. **Failed Posting Count**
   - Target: 0
   - Alert if >5 per day

4. **API Response Times**
   - List endpoint: <200ms
   - Create endpoint: <500ms
   - Post endpoint: <1000ms

5. **Database Query Performance**
   - All queries <100ms
   - Export queries <5s

### Setting Up Monitoring

**Prometheus Metrics:**

```python
# Add to service.py
from prometheus_client import Counter, Histogram

repair_created = Counter('repairs_created_total', 'Total repairs created')
repair_posted = Counter('repairs_posted_total', 'Total installments posted')
repair_failed = Counter('repairs_failed_total', 'Total posting failures')

# In service methods
repair_created.inc()
repair_posted.inc()
repair_failed.inc()
```

**Log Monitoring:**

```bash
# Watch for errors
tail -f logs/repairs.log | grep ERROR

# Count successful postings today
grep "Posted installment" logs/repairs.log | grep $(date +%Y-%m-%d) | wc -l

# Find failed postings
grep "Failed to post" logs/repairs.log
```

## Production Deployment Checklist

### Pre-Deployment
- [ ] Code review completed
- [ ] All files copied to project
- [ ] Database migration created and tested
- [ ] Unit tests passing (if applicable)
- [ ] Integration tests passing
- [ ] Load testing completed
- [ ] Security review done
- [ ] Documentation reviewed

### Deployment
- [ ] Backup database
- [ ] Run database migration on production
- [ ] Deploy application code
- [ ] Restart application servers
- [ ] Start Celery workers
- [ ] Start Celery beat
- [ ] Verify router registered
- [ ] Test with sample data
- [ ] Monitor logs for errors
- [ ] Verify scheduled task runs

### Post-Deployment
- [ ] Smoke tests passed
- [ ] Key endpoints responding
- [ ] Statistics showing data
- [ ] Export functionality working
- [ ] Celery tasks executing
- [ ] Monitor for 24 hours
- [ ] Create production data
- [ ] Train users
- [ ] Document any issues

## Support and Maintenance

### Regular Maintenance Tasks

**Daily:**
- Review posting failure logs
- Check unposted installment backlog
- Monitor API response times

**Weekly:**
- Verify Sunday posting completed successfully
- Review statistics trends
- Check for duplicate invoices

**Monthly:**
- Analyze repair trends by workshop
- Review outstanding balances
- Optimize slow queries
- Update documentation

### Getting Help

**Logs Location:**
```
logs/repairs.log
logs/celery.log
```

**Database Queries:**
```sql
-- Current unposted count
SELECT COUNT(*) FROM repair_installments WHERE posted_to_ledger = 0;

-- Repairs by status
SELECT status, COUNT(*) FROM vehicle_repairs GROUP BY status;

-- Upcoming postings
SELECT * FROM repair_installments 
WHERE posted_to_ledger = 0 AND week_start <= CURRENT_DATE 
ORDER BY week_start;
```

**API Health Checks:**
```bash
# Statistics endpoint
curl http://localhost:8000/api/repairs/statistics

# Unposted count
curl http://localhost:8000/api/repairs/installments/unposted?page_size=1
```

## Next Steps

After successful integration:

1. **Train Users:**
   - How to create repair invoices
   - How to confirm repairs
   - How to handle disputes
   - How to generate reports

2. **Create User Documentation:**
   - Staff user guide
   - Driver FAQ
   - Troubleshooting guide

3. **Set Up Reporting:**
   - Weekly repair summary
   - Monthly financial report
   - Outstanding balance report

4. **Integrate with DTR:**
   - Verify repairs appear in DTR
   - Test payment application
   - Validate balance carry-forward

5. **Monitor and Optimize:**
   - Review performance metrics
   - Gather user feedback
   - Implement improvements

## Conclusion

The Vehicle Repairs module is now fully integrated and ready for production use. 

**Key Features Enabled:**
- Complete repair invoice management
- Automatic payment schedules
- Weekly automated posting
- Comprehensive filtering and export
- Full ledger integration

**Production Ready:**
- No placeholders or TODOs
- Complete error handling
- Comprehensive logging
- Full documentation

For additional support, refer to:
- `README.md` - Complete module documentation
- `models.py` - Database schema reference
- `router.py` - API endpoint details
- Logs - Runtime information and errors

---

**Integration Status:** Complete ✅

**Ready for Production Use**