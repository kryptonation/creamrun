# PVB Module Integration Guide

## Step 1: Add Router to Main Application

Update `app/main.py`:
```python
from app.pvb.router import router as pvb_router

# Add PVB router
app.include_router(pvb_router)
```

## Step 2: Configure Celery Beat Schedule

Update `app/worker/config.py`:
```python
beat_schedule = {
    # ... existing schedules ...
    
    # PVB tasks
    'process-unmapped-pvb': {
        'task': 'pvb.process_unmapped_violations',
        'schedule': crontab(hour=6, minute=30),
        'options': {
            'timezone': 'America/New_York'
        }
    },
    'post-unposted-pvb': {
        'task': 'pvb.post_unposted_violations',
        'schedule': crontab(hour=7, minute=0),
        'options': {
            'timezone': 'America/New_York'
        }
    },
    'pvb-weekly-report': {
        'task': 'pvb.generate_weekly_report',
        'schedule': crontab(hour=8, minute=0, day_of_week=1),
        'options': {
            'timezone': 'America/New_York'
        }
    }
}
```

## Step 3: Update Celery App

Update `app/worker/app.py`:
```python
app.autodiscover_tasks([
    "app.worker",
    "app.curb",
    "app.ezpass",
    "app.pvb",  # Add this
    "app.ledger",
])
```

## Step 4: Environment Configuration

No additional environment variables required. Uses existing:
- Database connection
- Redis for Celery
- Existing user authentication

## Step 5: Start Services
```bash
# Start Celery workers
celery -A app.worker.app worker --loglevel=info

# Start Celery beat scheduler
celery -A app.worker.app beat --loglevel=info

# Start API server
uvicorn app.main:app --reload
```

## Step 6: Test Implementation

### Test CSV Import
```bash
curl -X POST "http://localhost:8000/pvb/upload" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@pvb_sample.csv" \
  -F "perform_matching=true" \
  -F "post_to_ledger=true"
```

### Test Manual Entry
```bash
curl -X POST "http://localhost:8000/pvb/violations/manual" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "summons_number": "TEST-123",
    "plate_number": "Y123456C",
    "state": "NJ",
    "violation_date": "2025-10-29T14:30:00",
    "violation_description": "Test violation",
    "fine_amount": 115.00,
    "post_to_ledger": false
  }'
```

### Test Query
```bash
curl -X GET "http://localhost:8000/pvb/violations?page=1&page_size=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Step 7: Monitor

### Check Import History
```bash
curl -X GET "http://localhost:8000/pvb/import/history?limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Check Statistics
```bash
curl -X GET "http://localhost:8000/pvb/violations/statistics" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Monitor Celery Tasks
```bash
# Check task status
celery -A app.worker.app inspect active

# Check scheduled tasks
celery -A app.worker.app inspect scheduled
```

## Step 8: Production Deployment

### Pre-Deployment Checklist

- [ ] Database migration completed
- [ ] All tests passing
- [ ] CSV sample files validated
- [ ] CURB import running and stable
- [ ] Ledger module functioning correctly
- [ ] Error handling tested
- [ ] Logging configured
- [ ] Monitoring alerts set up

### Post-Deployment Verification

1. Import sample CSV file
2. Verify matching works with CURB trips
3. Check ledger postings created correctly
4. Test manual violation entry
5. Test remapping functionality
6. Verify export works
7. Monitor scheduled tasks for 1 week

## Troubleshooting

See README.md for detailed troubleshooting guide.

---

**Integration Complete!**

The PVB module is now fully integrated and operational.