# DTR Module Integration Guide

## Overview

This guide walks through integrating the DTR module into the BAT Payment Engine.

## Prerequisites

Before integrating, ensure:
1. All dependent modules are installed and working:
   - Leases
   - Drivers
   - Vehicles
   - Medallions
   - CURB
   - Ledger
   - EZPass
   - PVB
   - TLC Violations
   - Repairs
   - Driver Loans
   - Miscellaneous Charges

2. Infrastructure is ready:
   - PostgreSQL database
   - Redis for Celery
   - S3 bucket for PDFs
   - Celery workers running

3. Dependencies installed:
   - reportlab>=4.0.0
   - celery>=5.3.0
   - boto3>=1.28.0

## Step-by-Step Integration

### Step 1: Database Migration

Run the database migration to create DTR tables:
```bash
# The migration creates:
# - dtr table
# - dtr_generation_history table
# - All indexes and constraints

alembic upgrade head
```

Verify tables created:
```sql
-- Check DTR table
SELECT COUNT(*) FROM dtr;

-- Check generation history table
SELECT COUNT(*) FROM dtr_generation_history;
```

### Step 2: Register Router

Add DTR router to main application:
```python
# app/main.py

from fastapi import FastAPI
from app.dtr.router import router as dtr_router

app = FastAPI(title="BAT Payment Engine")

# Include DTR router
app.include_router(dtr_router, prefix="/api", tags=["DTR"])

# Other routers...
```

### Step 3: Configure Celery Beat

Add weekly DTR generation to Celery beat schedule:
```python
# app/worker/config.py

from celery.schedules import crontab

beat_schedule = {
    # ... existing tasks ...
    
    'generate-weekly-dtrs': {
        'task': 'dtr.generate_weekly_dtrs',
        'schedule': crontab(hour=5, minute=0, day_of_week=0),  # Sunday 05:00 AM
        'options': {
            'expires': 3600,  # Task expires after 1 hour
            'timezone': 'America/New_York'
        }
    },
}
```

### Step 4: Environment Configuration

Ensure environment variables are set:
```bash
# .env or environment

# S3 Configuration (for PDF storage)
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
S3_BUCKET_NAME=bat-dtrs

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/bat_db

# Redis (for Celery)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_USERNAME=
REDIS_PASSWORD=

# Application
ENVIRONMENT=production
```

### Step 5: S3 Bucket Setup

Create S3 bucket and configure:
```bash
# Using AWS CLI
aws s3 mb s3://bat-dtrs --region us-east-1

# Set bucket policy for private access
aws s3api put-bucket-policy --bucket bat-dtrs --policy file://bucket-policy.json
```

Bucket structure:
```
s3://bat-dtrs/
└── dtrs/
    ├── 2025/
    │   ├── 10/
    │   │   ├── DTR-1045-2025-10-27.pdf
    │   │   └── DTR-1046-2025-10-27.pdf
    │   └── 11/
    │       └── DTR-1045-2025-11-03.pdf
    └── 2026/
```

### Step 6: Start Services

Start all required services:
```bash
# 1. Start application
uvicorn app.main:app --host 0.0.0.0 --port 8000

# 2. Start Celery worker (in another terminal)
celery -A app.worker.app worker --loglevel=info

# 3. Start Celery beat (in another terminal)
celery -A app.worker.app beat --loglevel=info
```

For production, use process managers:
```bash
# Using systemd or supervisor
systemctl start bat-api
systemctl start bat-celery-worker
systemctl start bat-celery-beat
```

### Step 7: Verify Installation

Test the installation:
```bash
# 1. Check API health
curl http://localhost:8000/api/health

# 2. Get DTR statistics
curl http://localhost:8000/api/dtr/statistics/summary \
  -H "Authorization: Bearer YOUR_TOKEN"

# 3. List DTRs (should be empty initially)
curl http://localhost:8000/api/dtr/ \
  -H "Authorization: Bearer YOUR_TOKEN"

# 4. Check Celery tasks
celery -A app.worker.app inspect registered | grep dtr
```

### Step 8: Manual Test Generation

Generate DTRs for a test period:
```bash
curl -X POST http://localhost:8000/api/dtr/generate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "period_start": "2025-10-27",
    "period_end": "2025-11-02",
    "regenerate": false
  }'
```

Expected response:
```json
{
  "success": true,
  "message": "Generated 45 DTRs",
  "total_generated": 45,
  "total_failed": 0,
  "generated_dtr_ids": ["DTR-1045-2025-10-27", ...],
  "failed_lease_ids": [],
  "errors": []
}
```

### Step 9: Verify PDF Generation

Check that PDFs were created:
```bash
# 1. List DTRs
curl http://localhost:8000/api/dtr/?page=1&page_size=1 \
  -H "Authorization: Bearer YOUR_TOKEN"

# 2. Download a PDF
curl http://localhost:8000/api/dtr/DTR-1045-2025-10-27/pdf \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o test_dtr.pdf

# 3. Verify PDF file
file test_dtr.pdf
# Should output: test_dtr.pdf: PDF document, version 1.4
```

### Step 10: Test Scheduled Task

Manually trigger the Celery task:
```bash
# Using Celery command
celery -A app.worker.app call dtr.generate_weekly_dtrs
```

Check logs:
```bash
tail -f logs/celery.log | grep DTR
```

Expected log output:
```
[INFO] Starting weekly DTR generation task
[INFO] Generating DTRs for period: 2025-10-27 to 2025-11-02
[INFO] Generated DTR DTR-1045-2025-10-27 for lease 1045
[INFO] Weekly DTR generation completed: 45 generated, 0 failed
```

## Verification Checklist

- [ ] Database tables created
- [ ] Router registered in main.py
- [ ] Celery beat schedule configured
- [ ] Environment variables set
- [ ] S3 bucket created and accessible
- [ ] All services running
- [ ] API endpoints responding
- [ ] Manual DTR generation successful
- [ ] PDFs generated and stored in S3
- [ ] PDFs downloadable via API
- [ ] Scheduled task registered in Celery
- [ ] No errors in application logs
- [ ] No errors in Celery logs

## Common Issues

### Issue 1: "S3 upload failed"
**Solution:**
- Check AWS credentials
- Verify S3 bucket exists
- Check bucket permissions
- Verify network connectivity to S3

### Issue 2: "No CURB data found"
**Solution:**
- Ensure CURB module has imported trips
- Verify trips are posted to ledger
- Check date ranges match

### Issue 3: "Lease not found"
**Solution:**
- Verify lease is ACTIVE status
- Check lease dates overlap with period
- Ensure lease has primary driver

### Issue 4: "PDF generation failed"
**Solution:**
- Check ReportLab installation
- Verify sufficient memory
- Check logs for specific error
- Ensure all required data available

### Issue 5: "Celery task not running"
**Solution:**
- Verify Celery beat is running
- Check task is in beat_schedule
- Verify timezone configuration
- Check Redis connection

## Monitoring Setup

### Application Logs
```python
# app/core/config.py
LOG_LEVEL=INFO
LOG_FILE=/var/log/bat/application.log
```

### Celery Logs
```bash
# Start with file logging
celery -A app.worker.app worker \
  --loglevel=info \
  --logfile=/var/log/bat/celery.log
```

### S3 Monitoring
Set up CloudWatch alerts for:
- Upload failures
- Storage size
- Access denied errors

### Database Monitoring
Monitor:
- DTR table growth
- Generation history entries
- Failed status count

### Alerting
Set up alerts for:
- DTR generation failures
- High failure rate (>5%)
- PDF generation errors
- S3 upload failures

## Performance Optimization

### Database Indexes
Ensure these indexes exist:
```sql
CREATE INDEX idx_dtr_lease_period ON dtr(lease_id, period_start, period_end);
CREATE INDEX idx_dtr_driver_period ON dtr(driver_id, period_start, period_end);
CREATE INDEX idx_dtr_status_period ON dtr(status, period_start);
```

### Celery Configuration
```python
# app/worker/config.py
worker_prefetch_multiplier = 1
task_acks_late = True
worker_max_tasks_per_child = 1000
```

### S3 Optimization
- Enable S3 Transfer Acceleration
- Use multipart uploads for large PDFs
- Set appropriate lifecycle policies

## Security

### API Authentication
All DTR endpoints require authentication:
```python
current_user: User = Depends(get_current_user)
```

### S3 Access
- Use presigned URLs (30-day expiry)
- Never expose S3 credentials in logs
- Rotate access keys regularly

### Data Privacy
- DTRs contain sensitive financial data
- Implement audit logging
- Restrict access by role

## Next Steps

After successful integration:

1. **User Training**
   - How to generate DTRs manually
   - How to download PDFs
   - How to update payment information

2. **Documentation**
   - Update user guides
   - Create troubleshooting FAQ
   - Document common workflows

3. **Monitoring**
   - Set up dashboards
   - Configure alerts
   - Monitor success rates

4. **Optimization**
   - Monitor generation time
   - Optimize PDF generation if needed
   - Scale Celery workers if needed

5. **Maintenance**
   - Regular S3 cleanup
   - Archive old DTRs
   - Monitor storage costs

## Support

For integration issues:
- Email: development@bigappletaxi.com
- Slack: #bat-development
- Documentation: https://docs.bigappletaxi.com/dtr

---

**Integration Status:** Complete ✅

**Ready for Production Deployment**