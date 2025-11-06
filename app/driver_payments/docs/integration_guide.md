# Driver Payments Module - Integration Guide

## Overview

This guide provides step-by-step instructions to integrate the new Driver Payments module into your BAT Connect application.

## Prerequisites

Ensure you have all these files in the `app/driver_payments/` directory:

1. `__init__.py` (empty file)
2. `models.py` (database models)
3. `exceptions.py` (custom exceptions)
4. `repository.py` (data access layer)
5. `schemas.py` (Pydantic schemas)
6. `services.py` (business logic)
7. `tasks.py` (Celery tasks)
8. `router.py` (FastAPI endpoints)

---

## Step 1: Update Database Schema

The new models require three new tables in your database. Generate and apply a database migration using Alembic.

### 1.1 Ensure Model Discovery

In your Alembic `env.py` (or central models file), add:

```python
from app.driver_payments.models import (
    DriverTransactionReceipt,
    ACHBatch,
    CompanyBankConfiguration
)
```

### 1.2 Generate Migration Script

```bash
alembic revision --autogenerate -m "Add Driver Payments tables"
```

### 1.3 Apply Migration

```bash
alembic upgrade head
```

---

## Step 2: Integrate the API Router

Make the Driver Payments API endpoints accessible by including the router in your main FastAPI application.

### Edit `app/main.py`

```python
# FILE: app/main.py

# Add import
from app.driver_payments.router import router as driver_payment_routes

# Include router (add after existing routers)
bat_app.include_router(driver_payment_routes)
```

---

## Step 3: Configure Celery Tasks

The Driver Payments module includes Celery tasks for automated DTR generation.

### 3.1 Register Tasks in Celery

Edit `app/core/celery_app.py`:

```python
# FILE: app/core/celery_app.py

app.autodiscover_tasks([
    "app.notifications",
    "app.worker",
    "app.curb",
    "app.bpm.sla",
    "app.leases",
    "app.driver_payments",  # <<< ADD THIS LINE
])
```

### 3.2 Configure Celery Beat Schedule

Edit `app/worker/config.py` to add the weekly DTR generation task:

```python
# FILE: app/worker/config.py

from celery.schedules import crontab

beat_schedule = {
    # ... existing tasks ...
    
    # Weekly DTR Generation - runs every Sunday at 5:00 AM
    "driver-payments-generate-weekly-dtrs": {
        "task": "driver_payments.generate_weekly_dtrs",
        "schedule": crontab(hour=5, minute=0, day_of_week="sun"),
        "options": {"timezone": "America/New_York"},
    },
    
    # Optional: NACHA file cleanup - runs monthly
    "driver-payments-cleanup-nacha-files": {
        "task": "driver_payments.cleanup_old_nacha_files",
        "schedule": crontab(hour=2, minute=0, day_of_month=1),
        "options": {"timezone": "America/New_York"},
    },
}
```

---

## Step 4: Update Driver Model

The Driver Payments module relies on drivers having ACH bank information. Update your `app/drivers/models.py` if needed.

### Add ACH Fields (if not already present)

```python
# FILE: app/drivers/models.py

class Driver(Base):
    # ... existing fields ...
    
    # Payment configuration
    pay_to_mode = Column(String(128), nullable=True, comment="ACH or Check")
    ach_routing_number = Column(String(9), nullable=True, comment="9-digit routing number")
    ach_account_number = Column(String(17), nullable=True, comment="Bank account number")
    bank_name = Column(String(255), nullable=True, comment="Bank name")
```

---

## Step 5: Initialize Company Bank Configuration

Before generating NACHA files, you need to configure your company's bank information.

### 5.1 Create Configuration via SQL

```sql
INSERT INTO company_bank_configuration (
    company_name,
    company_tax_id,
    bank_name,
    bank_routing_number,
    bank_account_number,
    immediate_origin,
    immediate_destination,
    company_entry_description,
    is_active,
    created_on
) VALUES (
    'Big Apple Taxi Management LLC',
    'P963014763',  -- Your 10-digit EIN
    'ConnectOne Bank',
    '021213944',  -- Your bank's 9-digit routing number
    'YOUR_ACCOUNT_NUMBER',  -- Your company account number
    'P963014763',  -- Usually same as tax ID
    '0212139440',  -- Bank routing with check digit
    'DRVPAY',
    true,
    NOW()
);
```

### 5.2 Or Create via API (future enhancement)

You can create an endpoint to manage this configuration through the UI.

---

## Step 6: Verification

After completing the integration steps, restart your services:

```bash
# Restart FastAPI application
uvicorn app.main:bat_app --reload

# Restart Celery worker
celery -A app.core.celery_app worker --loglevel=info

# Restart Celery Beat (scheduler)
celery -A app.core.celery_app beat --loglevel=info
```

### 6.1 Test API Endpoints

```bash
# List DTRs
curl -X GET "http://localhost:8000/payments/driver-payments" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get ACH-eligible DTRs
curl -X GET "http://localhost:8000/payments/driver-payments/ach-eligible" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 6.2 Test DTR Generation

```bash
# Manually trigger DTR generation for a specific week
curl -X POST "http://localhost:8000/payments/driver-payments/generate" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"week_start_date": "2025-10-27"}'
```

---

## Step 7: Workflow Overview

### 7.1 Weekly DTR Generation (Automated)

Every Sunday at 5:00 AM:

1. Celery task `generate_weekly_dtrs_task` runs
2. Queries Centralized Ledger for all driver earnings and deductions
3. Generates DTRs for all active drivers
4. DTRs appear in the system with status `GENERATED`

### 7.2 ACH Payment Processing

Finance user workflow:

1. Navigate to Driver Payments page
2. Click "ACH Batch Mode"
3. Select unpaid DTRs for ACH drivers
4. Click "Generate ACH Batch"
5. System creates batch with number (e.g., `2510-001`)
6. Click "Generate NACHA File"
7. Download NACHA file
8. Upload to bank's ACH portal
9. Bank processes payments (1-2 business days)

### 7.3 Check Payment Processing

Finance user workflow:

1. Navigate to Driver Payments page
2. Find unpaid DTR for check payment driver
3. Click "Pay by Check"
4. Enter check number
5. System marks DTR as paid

### 7.4 Batch Reversal (Error Correction)

If errors occur:

1. Navigate to ACH batch detail
2. Click "Reverse Batch"
3. Enter reason
4. All DTRs in batch return to unpaid status
5. Correct driver information
6. Create new batch with corrected data

---

## Step 8: NACHA Library Installation (Optional)

For production-grade NACHA file generation, consider using the `ach` library:

```bash
pip install ach
```

Then update `services.py` to use the library instead of manual formatting:

```python
from ach.builder import AchFile

def _build_nacha_file(self, batch, dtrs, config):
    """Build NACHA file using the ach library."""
    ach_file = AchFile(
        file_id_modifier='A',
        immediate_destination=config.immediate_destination,
        immediate_origin=config.immediate_origin,
        immediate_destination_name=config.bank_name,
        immediate_origin_name=config.company_name
    )
    
    # Create batch
    batch_obj = ach_file.add_batch(
        company_name=config.company_name,
        company_identification=config.company_tax_id,
        company_entry_description=config.company_entry_description,
        effective_entry_date=batch.effective_date,
        originating_dfi_identification=config.bank_routing_number[:8]
    )
    
    # Add entries
    for dtr in dtrs:
        batch_obj.add_entry(
            transaction_code='22',  # Checking Credit
            receiving_dfi_identification=dtr.driver.ach_routing_number[:8],
            check_digit=dtr.driver.ach_routing_number[8],
            receiving_dfi_account_number=dtr.driver.ach_account_number,
            amount=int(dtr.total_due_to_driver * 100),
            individual_id_number=f"DRV{dtr.driver.id}",
            individual_name=f"{dtr.driver.first_name} {dtr.driver.last_name}".upper(),
            trace_number=self._generate_trace_number(dtr)
        )
    
    return ach_file.render()
```

---

## Troubleshooting

### Issue: DTRs not generating

**Solution**: Check Celery logs. Ensure:
- Celery Beat is running
- Task is scheduled correctly in `config.py`
- Centralized Ledger has data for the period

### Issue: NACHA file generation fails

**Solution**: Verify:
- Company bank configuration exists and is active
- All drivers in batch have valid routing numbers
- Routing numbers pass checksum validation

### Issue: ACH batch reversal doesn't work

**Solution**: Check:
- Batch is not already reversed
- User has correct permissions
- Database transaction completes successfully

---

## Security Considerations

1. **Bank Information**: Store ACH account/routing numbers encrypted
2. **NACHA Files**: Store securely in S3 with encryption
3. **Access Control**: Restrict ACH batch operations to Finance role only
4. **Audit Trail**: All payment operations are logged
5. **Two-Person Approval**: Consider requiring dual approval for large batches

---

## Next Steps

1. **Testing**: Test thoroughly in staging environment
2. **Training**: Train finance staff on ACH batch workflow
3. **Documentation**: Create user guides with screenshots
4. **Monitoring**: Set up alerts for failed DTR generation
5. **Bank Integration**: Coordinate with bank for ACH portal access

---

## Support

For questions or issues:
- Check application logs in `/var/log/batm_app.log`
- Review Celery logs for task failures
- Contact development team for assistance