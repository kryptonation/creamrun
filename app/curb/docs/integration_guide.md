# CURB Module Integration Guide

## Step-by-Step Integration

### 1. Update Main Application

**File: `app/main.py`**

```python
# Add CURB router import at the top with other routers
from app.curb.router import router as curb_routes

# Register CURB router
bat_app.include_router(curb_routes)
```

The updated section should look like:
```python
# --- Payment Engine Routes ---
from app.ledger.router import router as ledger_routes
from app.curb.router import router as curb_routes  # NEW

# Include routers
bat_app.include_router(ledger_routes)
bat_app.include_router(curb_routes)  # NEW
```

### 2. Update Configuration

**File: `app/core/config.py`**

Add CURB API credentials to your Settings class:

```python
from pydantic_settings import BaseSettings
from pydantic import Field

class Settings(BaseSettings):
    # ... existing settings ...
    
    # CURB API Configuration
    curb_user_id: Optional[str] = Field(None, env='CURB_USER_ID')
    curb_password: Optional[str] = Field(None, env='CURB_PASSWORD')
    curb_merchant: Optional[str] = Field(None, env='CURB_MERCHANT')
    
    class Config:
        env_file = ".env"
```

### 3. Update Environment Variables

**File: `.env`**

Add CURB credentials:

```bash
# CURB API Configuration
CURB_USER_ID=your_user_id_here
CURB_PASSWORD=your_password_here
CURB_MERCHANT=your_merchant_id_here

# Environment (determines which CURB API URL to use)
# production → https://api.taxitronic.org/vts_service/taxi_service.asmx
# development → https://demo.taxitronic.org/vts_service/taxi_service.asmx
ENVIRONMENT=development
```

### 4. Install Required Dependencies

**File: `requirements.txt`**

Add if not already present:

```txt
requests>=2.31.0
celery>=5.3.0
redis>=5.0.0  # For Celery broker
```

Install:
```bash
pip install -r requirements.txt
```

### 5. Configure Celery Beat Schedule

**File: `app/celery_config.py` (or wherever Celery is configured)**

```python
from celery import Celery
from celery.schedules import crontab
from app.core.config import settings

celery_app = Celery('bat_app')

# Configure beat schedule
celery_app.conf.beat_schedule = {
    'import-curb-daily': {
        'task': 'curb.import_daily_trips',
        'schedule': crontab(hour=5, minute=0),  # 5:00 AM daily
        'options': {
            'expires': 3600,  # Expire after 1 hour
        }
    },
    'process-unmapped-trips-hourly': {
        'task': 'curb.process_unmapped_trips',
        'schedule': crontab(minute=0),  # Every hour
        'kwargs': {'limit': 100},
        'options': {
            'expires': 1800,
        }
    },
}

celery_app.conf.timezone = 'America/New_York'  # Adjust to your timezone
```

### 6. Database Migration (Already Created - Reference Only)

The models are already defined. Run Alembic to create tables:

```bash
# Generate migration
alembic revision --autogenerate -m "add_curb_tables"

# Apply migration
alembic upgrade head
```

Expected tables:
- `curb_trips`
- `curb_transactions`
- `curb_import_history`

### 7. Verify Installation

**Check API Documentation**:
```bash
# Start application
uvicorn app.main:app --reload

# Open Swagger UI
http://localhost:8000/docs
```

You should see new endpoints under "CURB Import" tag:
- POST /curb/import
- GET /curb/trips
- GET /curb/import/history
- etc.

**Test Import (Development)**:
```bash
curl -X POST "http://localhost:8000/curb/import" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "date_from": "2025-10-27",
    "date_to": "2025-10-27",
    "perform_association": true,
    "post_to_ledger": true,
    "reconcile_with_curb": false
  }'
```

### 8. Start Celery Workers

**Development**:
```bash
# Start Celery worker
celery -A app.celery_app worker --loglevel=info

# Start Celery beat (scheduler)
celery -A app.celery_app beat --loglevel=info
```

**Production** (using systemd):

Create `/etc/systemd/system/celery-bat-worker.service`:
```ini
[Unit]
Description=BAT Celery Worker
After=network.target

[Service]
Type=forking
User=bat
Group=bat
WorkingDirectory=/opt/bat
ExecStart=/opt/bat/venv/bin/celery -A app.celery_app worker --loglevel=info --pidfile=/var/run/celery/worker.pid
PIDFile=/var/run/celery/worker.pid
Restart=always

[Install]
WantedBy=multi-user.target
```

Create `/etc/systemd/system/celery-bat-beat.service`:
```ini
[Unit]
Description=BAT Celery Beat
After=network.target

[Service]
Type=forking
User=bat
Group=bat
WorkingDirectory=/opt/bat
ExecStart=/opt/bat/venv/bin/celery -A app.celery_app beat --loglevel=info --pidfile=/var/run/celery/beat.pid
PIDFile=/var/run/celery/beat.pid
Restart=always

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable celery-bat-worker celery-bat-beat
sudo systemctl start celery-bat-worker celery-bat-beat
```

### 9. Monitor Celery Tasks

**Using Flower** (optional):
```bash
pip install flower
celery -A app.celery_app flower --port=5555
```

Access: http://localhost:5555

## Testing the Integration

### 1. Manual Import Test

```python
# In Python shell or Jupyter notebook
from app.core.db import SessionLocal
from app.curb.service import CurbImportService
from datetime import date, timedelta

db = SessionLocal()
service = CurbImportService(db)

# Import yesterday's trips
yesterday = date.today() - timedelta(days=1)
history, errors = service.import_curb_data(
    date_from=yesterday,
    date_to=yesterday,
    perform_association=True,
    post_to_ledger=True,
    reconcile_with_curb=False  # Keep False for testing
)

print(f"Batch ID: {history.batch_id}")
print(f"Status: {history.status.value}")
print(f"Trips imported: {history.total_trips_imported}")
print(f"Trips posted: {history.total_trips_posted}")
print(f"Errors: {len(errors)}")

db.close()
```

### 2. Check Import History

```bash
curl -X GET "http://localhost:8000/curb/import/history?limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. View Trips

```bash
curl -X GET "http://localhost:8000/curb/trips?page=1&page_size=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 4. Check Statistics

```bash
curl -X GET "http://localhost:8000/curb/trips/statistics?date_from=2025-10-27&date_to=2025-10-27" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 5. Verify Ledger Postings

```bash
# Check if CURB trips created ledger postings
curl -X GET "http://localhost:8000/ledger/postings?source_type=CURB_TRIP&page=1&page_size=10" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Check tax postings
curl -X GET "http://localhost:8000/ledger/postings?source_type=CURB_TAX&page=1&page_size=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Production Deployment Checklist

- [ ] CURB API credentials configured in production environment
- [ ] Database migration applied
- [ ] Celery worker running
- [ ] Celery beat scheduler running
- [ ] Monitoring configured (Flower or similar)
- [ ] Logs configured and rotating
- [ ] Backup schedule for curb_trips table
- [ ] Alert notifications configured
- [ ] Test import successful in production
- [ ] Reconciliation working (if enabled)
- [ ] Integration with DTR generation tested

## Rollback Plan

If issues occur:

1. **Stop Celery Beat**: `sudo systemctl stop celery-bat-beat`
2. **Disable Daily Import**: Comment out in beat schedule
3. **Check Logs**: Review application and Celery logs
4. **Rollback Database** (if needed):
   ```bash
   alembic downgrade -1  # Go back one migration
   ```
5. **Fix Issues**: Address errors
6. **Re-deploy**: Follow integration steps again

## Common Integration Issues

### Issue: Import task not running

**Check**:
```bash
# Verify Celery beat is running
sudo systemctl status celery-bat-beat

# Check beat schedule
celery -A app.celery_app inspect scheduled
```

**Fix**: Restart Celery beat

### Issue: Trips not posting to ledger

**Check**:
- Trips have driver_id and lease_id populated
- Check ledger service logs
- Verify ledger tables exist

**Fix**: 
```python
# Manually post unposted trips
from app.curb.tasks import post_unposted_trips_task
result = post_unposted_trips_task.delay()
```

### Issue: CURB API connection errors

**Check**:
- CURB credentials correct
- Network connectivity
- API URL (production vs development)

**Fix**: Update credentials in .env, restart application

## Performance Considerations

### Database Indexes

Ensure these indexes exist (created in models):
- `idx_curb_trips_record_period` (record_id, period)
- `idx_curb_trips_datetime` (start_datetime, end_datetime)
- `idx_curb_trips_driver_lease` (driver_id, lease_id)
- `idx_curb_trips_payment_period` (payment_period_start, payment_period_end)

### Scaling

For high-volume imports:
- Increase Celery worker concurrency
- Use bulk inserts (already implemented)
- Consider partitioning curb_trips table by date
- Add read replicas for query endpoints

### Optimization

- Import runs during off-peak hours (5 AM)
- Batch size: 1000 trips per API call (configurable in client)
- Database commits after each batch, not per trip
- Connection pooling configured in SQLAlchemy

## Support & Maintenance

### Logs Location

- Application logs: `/var/log/bat/app.log`
- Celery logs: `/var/log/celery/worker.log`, `/var/log/celery/beat.log`

### Monitoring Queries

```sql
-- Check recent imports
SELECT batch_id, date_from, date_to, status, total_trips_imported, total_trips_posted
FROM curb_import_history
ORDER BY started_at DESC
LIMIT 10;

-- Check unmapped trips count
SELECT COUNT(*) FROM curb_trips WHERE driver_id IS NULL OR lease_id IS NULL;

-- Check unposted trips count
SELECT COUNT(*) FROM curb_trips WHERE posted_to_ledger = FALSE;

-- Today's import statistics
SELECT 
    COUNT(*) as total_trips,
    SUM(CASE WHEN posted_to_ledger THEN 1 ELSE 0 END) as posted,
    SUM(total_amount) as total_earnings
FROM curb_trips
WHERE DATE(start_datetime) = CURRENT_DATE;
```

## Next Steps

After successful integration:

1. **Monitor for 1 week**: Watch daily imports, check for errors
2. **Enable reconciliation**: Set `reconcile_with_curb: true` in production
3. **Integrate with DTR**: Use CURB trip data for DTR generation (Phase 8)
4. **Dashboard**: Build monitoring dashboard for import metrics
5. **Alerts**: Set up alerts for failures or anomalies