# NACH Batch Module - Integration Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Installation Steps](#installation-steps)
3. [Configuration](#configuration)
4. [Database Setup](#database-setup)
5. [Testing](#testing)
6. [Deployment](#deployment)
7. [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Modules
Ensure these modules are already installed and working:
- ✅ Ledger module
- ✅ DTR module
- ✅ Driver module
- ✅ Users module

### Required Python Packages
```bash
pip install ach --break-system-packages
```

The `ach` library is used for NACHA file generation. Verify installation:
```python
python -c "from ach.builder import AchFile; print('ACH library installed successfully')"
```

### Database Requirements
- MySQL/MariaDB 5.7+
- `ach_batches` table (created via migration)
- Existing tables: `dtrs`, `drivers`, `bank_account`, `users`

## Installation Steps

### Step 1: Copy Module Files

Copy all NACH batch module files to your project:
```bash
app/nach_batches/
├── __init__.py
├── models.py
├── schemas.py
├── repository.py
├── service.py
├── router.py
├── exceptions.py
├── nacha_generator.py
├── README.md
└── INTEGRATION.md
```

### Step 2: Register Router

Edit `app/main.py` to include the NACH batches router:
```python
# app/main.py

from app.nach_batches.router import router as nach_batches_router

# Register the router
bat_app.include_router(
    nach_batches_router,
    prefix="/api/v1",
    tags=["NACH Batches"]
)
```

### Step 3: Verify Imports

Ensure all required models and utilities are importable:
```python
# Test imports
from app.dtr.models import DTR, DTRPaymentType
from app.drivers.models import Driver
from app.entities.models import BankAccount
from app.users.models import User
from app.utils.exporter_utils import ExporterFactory
from app.utils.logger import get_logger
```

If any import fails, verify that module is installed and paths are correct.

### Step 4: Database Migration

Create and run the migration for the `ach_batches` table.

**Migration File:** `app/migrations/versions/YYYYMMDDHHMMSS_create_ach_batches.py`
```python
"""create ach_batches table

Revision ID: abc123def456
Revises: previous_migration_id
Create Date: 2025-10-31 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql

# revision identifiers
revision = 'abc123def456'
down_revision = 'previous_migration_id'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'ach_batches',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False, comment='Primary key, auto-increment'),
        sa.Column('batch_number', sa.String(length=50), nullable=False, comment='Unique batch ID (YYMM-NNN format)'),
        sa.Column('batch_date', sa.Date(), nullable=False, comment='When batch was created'),
        sa.Column('effective_date', sa.Date(), nullable=False, comment='ACH effective date for bank processing'),
        sa.Column('total_payments', sa.Integer(), nullable=False, server_default='0', comment='Number of payments in batch'),
        sa.Column('total_amount', sa.Numeric(precision=10, scale=2), nullable=False, server_default='0.00', comment='Sum of all payment amounts'),
        sa.Column('status', sa.Enum('CREATED', 'FILE_GENERATED', 'SUBMITTED', 'PROCESSED', 'FAILED', 'REVERSED', name='achbatchstatus'), nullable=False, server_default='CREATED', comment='Current batch status'),
        sa.Column('nacha_file_generated', sa.Boolean(), nullable=False, server_default='0', comment='Whether NACHA file has been created'),
        sa.Column('nacha_file_s3_key', sa.String(length=500), nullable=True, comment='S3 path to stored NACHA file'),
        sa.Column('nacha_file_generated_on', sa.DateTime(), nullable=True, comment='Timestamp when NACHA file was created'),
        sa.Column('submitted_to_bank', sa.Boolean(), nullable=False, server_default='0', comment='Whether batch has been submitted for processing'),
        sa.Column('submitted_on', sa.DateTime(), nullable=True, comment='When batch was submitted to bank'),
        sa.Column('submitted_by', sa.Integer(), nullable=True, comment='User who submitted to bank'),
        sa.Column('bank_processed_on', sa.Date(), nullable=True, comment='When bank completed processing'),
        sa.Column('bank_confirmation_number', sa.String(length=100), nullable=True, comment='Bank confirmation reference number'),
        sa.Column('reversed_on', sa.DateTime(), nullable=True, comment='When batch was reversed'),
        sa.Column('reversed_by', sa.Integer(), nullable=True, comment='User who reversed the batch'),
        sa.Column('reversal_reason', sa.Text(), nullable=True, comment='Reason for batch reversal'),
        sa.Column('created_by', sa.Integer(), nullable=False, comment='User who created the batch'),
        sa.Column('created_on', sa.DateTime(), nullable=False, comment='Record creation timestamp'),
        sa.Column('updated_on', sa.DateTime(), nullable=True, comment='Record update timestamp'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('batch_number'),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], name='fk_ach_batches_created_by'),
        sa.ForeignKeyConstraint(['submitted_by'], ['users.id'], name='fk_ach_batches_submitted_by'),
        sa.ForeignKeyConstraint(['reversed_by'], ['users.id'], name='fk_ach_batches_reversed_by'),
        mysql_charset='utf8mb4',
        mysql_collate='utf8mb4_unicode_ci'
    )
    
    # Create indexes
    op.create_index('idx_ach_batch_date', 'ach_batches', ['batch_date'])
    op.create_index('idx_ach_batch_status', 'ach_batches', ['status'])
    op.create_index('idx_ach_batch_number', 'ach_batches', ['batch_number'])


def downgrade():
    op.drop_index('idx_ach_batch_number', 'ach_batches')
    op.drop_index('idx_ach_batch_status', 'ach_batches')
    op.drop_index('idx_ach_batch_date', 'ach_batches')
    op.drop_table('ach_batches')
```

Run the migration:
```bash
alembic upgrade head
```

Verify table creation:
```sql
DESCRIBE ach_batches;
```

## Configuration

### Company Settings

Update the `_get_company_config()` method in `app/nach_batches/service.py` with your actual company information:
```python
def _get_company_config(self) -> Dict[str, Any]:
    """Get company configuration for NACHA file generation"""
    return {
        'company_name': 'BIG APPLE TAXI',           # Company name (max 16 chars for batch)
        'company_tax_id': '1234567890',              # 10-digit tax ID or EIN
        'company_routing': '021000021',              # 9-digit ABA routing number
        'company_account': '1234567890',             # Company bank account number
        'bank_name': 'CONNECTONE BANK'               # Bank name (max 23 chars)
    }
```

**Important:** These are placeholder values. Replace with actual company information before production use.

### Environment Variables (Optional)

For better security, consider using environment variables:
```python
# In app/config.py or settings file
import os

ACH_COMPANY_NAME = os.getenv('ACH_COMPANY_NAME', 'BIG APPLE TAXI')
ACH_COMPANY_TAX_ID = os.getenv('ACH_COMPANY_TAX_ID', '1234567890')
ACH_COMPANY_ROUTING = os.getenv('ACH_COMPANY_ROUTING', '021000021')
ACH_COMPANY_ACCOUNT = os.getenv('ACH_COMPANY_ACCOUNT', '1234567890')
ACH_BANK_NAME = os.getenv('ACH_BANK_NAME', 'CONNECTONE BANK')
```

Then update service to use these settings:
```python
from app.config import (
    ACH_COMPANY_NAME,
    ACH_COMPANY_TAX_ID,
    ACH_COMPANY_ROUTING,
    ACH_COMPANY_ACCOUNT,
    ACH_BANK_NAME
)

def _get_company_config(self) -> Dict[str, Any]:
    return {
        'company_name': ACH_COMPANY_NAME,
        'company_tax_id': ACH_COMPANY_TAX_ID,
        'company_routing': ACH_COMPANY_ROUTING,
        'company_account': ACH_COMPANY_ACCOUNT,
        'bank_name': ACH_BANK_NAME
    }
```

### Routing Number Validation

Verify your company's routing number is valid:
```python
from app.nach_batches.nacha_generator import NACHAGenerator

routing = '021000021'  # Your routing number
is_valid = NACHAGenerator.validate_routing_number(routing)
print(f"Routing number {routing} is {'valid' if is_valid else 'invalid'}")
```

## Database Setup

### Verify Driver Bank Accounts

Ensure all ACH drivers have valid bank account information:
```sql
-- Check drivers with ACH payment type but no bank account
SELECT 
    d.id,
    d.first_name,
    d.last_name,
    d.pay_to_mode,
    d.bank_account_id
FROM drivers d
WHERE d.pay_to_mode = 'ACH'
AND d.bank_account_id IS NULL;

-- Check bank accounts with missing information
SELECT 
    ba.id,
    d.first_name,
    d.last_name,
    ba.bank_name,
    ba.bank_routing_number,
    ba.bank_account_number
FROM bank_account ba
JOIN drivers d ON d.bank_account_id = ba.id
WHERE d.pay_to_mode = 'ACH'
AND (ba.bank_routing_number IS NULL 
     OR ba.bank_account_number IS NULL);
```

Fix any missing data before creating batches.

### Test Data Setup

For testing, create some test DTRs with ACH payment type:
```sql
-- Verify test DTRs exist
SELECT 
    dtr.id,
    dtr.receipt_number,
    d.first_name,
    d.last_name,
    dtr.total_due,
    dtr.payment_type,
    dtr.batch_number
FROM dtrs dtr
JOIN drivers d ON d.id = dtr.driver_id
WHERE dtr.payment_type = 'ACH'
AND dtr.batch_number IS NULL
AND dtr.total_due > 0
LIMIT 10;
```

## Testing

### Step 1: Verify Installation

Access the API documentation:
```
http://localhost:8000/docs
```

Look for "NACH Batches" section with endpoints:
- POST /api/v1/nach-batches/
- GET /api/v1/nach-batches/
- GET /api/v1/nach-batches/{batch_id}
- POST /api/v1/nach-batches/{batch_id}/generate-nacha
- POST /api/v1/nach-batches/{batch_id}/reverse
- GET /api/v1/nach-batches/statistics/summary
- GET /api/v1/nach-batches/export/{format}

### Step 2: Test with Stub Data

Test the list endpoint with stub data:
```bash
curl -X GET "http://localhost:8000/api/v1/nach-batches/?use_stub=true" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Expected response: 3 sample batches

### Step 3: Create Test Batch

Get some unpaid ACH DTR IDs from the database, then create a batch:
```bash
curl -X POST "http://localhost:8000/api/v1/nach-batches/" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "dtr_ids": [1, 2, 3, 4, 5]
  }'
```

Expected response:
```json
{
  "id": 1,
  "batch_number": "2510-001",
  "batch_date": "2025-10-31",
  "effective_date": "2025-11-04",
  "total_payments": 5,
  "total_amount": 2450.50,
  "status": "CREATED",
  "nacha_file_generated": false,
  ...
}
```

### Step 4: Generate NACHA File

Generate and download NACHA file for the batch:
```bash
curl -X POST "http://localhost:8000/api/v1/nach-batches/1/generate-nacha" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o "2510-001.ach"
```

Expected: File downloaded successfully

Verify file format (should be 94-character fixed-width records):
```bash
# Check line lengths
awk '{ print length }' 2510-001.ach | sort -u
# Should output: 94
```

### Step 5: Test Batch Reversal

Reverse the batch:
```bash
curl -X POST "http://localhost:8000/api/v1/nach-batches/1/reverse" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "batch_id": 1,
    "reversal_reason": "Testing batch reversal functionality"
  }'
```

Verify DTRs are unmarked:
```sql
SELECT id, receipt_number, batch_number 
FROM dtrs 
WHERE id IN (1, 2, 3, 4, 5);
-- batch_number should be NULL for all
```

### Step 6: Test Export

Export batches to Excel:
```bash
curl -X GET "http://localhost:8000/api/v1/nach-batches/export/excel" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o "batches_export.xlsx"
```

Open file to verify formatting.

### Step 7: Test Statistics

Get batch statistics:
```bash
curl -X GET "http://localhost:8000/api/v1/nach-batches/statistics/summary" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Expected response with counts and totals.

## Deployment

### Pre-Deployment Checklist

- [ ] Database migration completed successfully
- [ ] Company configuration updated with actual values
- [ ] Routing number validated
- [ ] All driver bank accounts verified
- [ ] Test batch created and NACHA file generated
- [ ] NACHA file format verified (94-character records)
- [ ] Test batch reversed successfully
- [ ] Export functionality tested
- [ ] API documentation accessible
- [ ] Logging verified in application logs

### Production Deployment Steps

1. **Backup Database**
```bash
   mysqldump -u user -p database_name > backup_before_nach.sql
```

2. **Deploy Code**
```bash
   git pull origin main
   # Or your deployment process
```

3. **Run Migration**
```bash
   alembic upgrade head
```

4. **Restart Application**
```bash
   systemctl restart bat-payment-engine
   # Or your restart command
```

5. **Verify Deployment**
```bash
   curl -X GET "http://your-domain.com/api/v1/nach-batches/statistics/summary" \
     -H "Authorization: Bearer YOUR_TOKEN"
```

6. **Monitor Logs**
```bash
   tail -f /var/log/bat-payment-engine/app.log
```

### Post-Deployment

1. **Create First Production Batch**
   - Use UI or API to select unpaid ACH DTRs
   - Create batch with 1-2 payments for initial test
   - Generate NACHA file
   - Verify file format with bank before submitting

2. **Bank Coordination**
   - Send test NACHA file to bank for validation
   - Confirm file format is acceptable
   - Set up SFTP credentials if using automated upload
   - Establish bank confirmation process

3. **Train Finance Team**
   - Batch creation workflow
   - NACHA file generation
   - File submission to bank
   - Batch reversal process
   - Error handling procedures

## Troubleshooting

### Issue: Import Error for `ach` Library

**Error:**
```
ModuleNotFoundError: No module named 'ach'
```

**Solution:**
```bash
pip install ach --break-system-packages
```

Verify installation:
```python
python -c "from ach.builder import AchFile; print('OK')"
```

### Issue: Invalid Routing Number

**Error:**
```
InvalidRoutingNumberException: Driver John Smith has invalid routing number: 123456789
```

**Solution:**
1. Verify routing number is correct 9-digit ABA number
2. Use ABA routing number lookup: https://www.routingnumbers.info/
3. Update driver's bank account with correct routing number
4. Routing number must pass checksum validation

Test routing number:
```python
from app.nach_batches.nacha_generator import NACHAGenerator
NACHAGenerator.validate_routing_number('021000021')  # Should return True
```

### Issue: Missing Bank Account Information

**Error:**
```
InvalidDTRException: Driver Jane Doe has no bank account configured
```

**Solution:**
1. Check driver's pay_to_mode is 'ACH'
2. Verify driver has bank_account_id
3. Verify bank account has routing_number and account_number
```sql
SELECT 
    d.id,
    d.first_name,
    d.last_name,
    d.bank_account_id,
    ba.bank_routing_number,
    ba.bank_account_number
FROM drivers d
LEFT JOIN bank_account ba ON ba.id = d.bank_account_id
WHERE d.id = 123;  -- Replace with driver ID
```

Update missing information via driver management interface.

### Issue: DTR Already in Batch

**Error:**
```
InvalidDTRException: DTR 456 already assigned to batch 2510-001
```

**Solution:**
This DTR is already paid. Either:
1. Use different DTRs that are unpaid
2. If batch needs correction, reverse the batch first:
```bash
   POST /nach-batches/{batch_id}/reverse
```

### Issue: NACHA File Generation Fails

**Error:**
```
NACHAFileGenerationException: Failed to generate NACHA file: ...
```

**Solution:**
1. Check application logs for detailed error
2. Verify all payments have valid bank info
3. Ensure company configuration is complete
4. Check batch is in CREATED status

Debug steps:
```python
# In Python console
from app.nach_batches.service import NACHBatchService
from app.database import SessionLocal

db = SessionLocal()
service = NACHBatchService(db)
config = service._get_company_config()
print(config)  # Verify all fields are present
```

### Issue: Database Migration Fails

**Error:**
```
sqlalchemy.exc.OperationalError: (1050, "Table 'ach_batches' already exists")
```

**Solution:**
Table already exists. Either:
1. Skip migration if table is correct
2. Drop table and re-run migration (development only)
```sql
-- Check if table exists
SHOW TABLES LIKE 'ach_batches';

-- Development only: drop and recreate
DROP TABLE IF EXISTS ach_batches;
```

Then run migration again.

### Issue: Permission Denied

**Error:**
```
403 Forbidden: You don't have permission to access this resource
```

**Solution:**
Ensure user has proper role/permissions. NACH batch operations typically require Finance role.

Check user roles:
```sql
SELECT u.id, u.email_address, r.name as role
FROM users u
JOIN user_roles ur ON ur.user_id = u.id
JOIN roles r ON r.id = ur.role_id
WHERE u.id = 123;  -- Your user ID
```

### Issue: Batch Reversal Fails

**Error:**
```
InvalidBatchStateException: Batch 2510-001 is already reversed
```

**Solution:**
Batch can only be reversed once. If you need to reprocess:
1. Create a new batch with the same DTRs
2. DTRs should be unmarked after reversal

Verify DTR status:
```sql
SELECT id, batch_number FROM dtrs WHERE id IN (1,2,3,4,5);
```

### Issue: Export Timeout

**Error:**
```
504 Gateway Timeout
```

**Solution:**
Too many records for export. Solutions:
1. Add date filters to limit results
2. Increase request timeout in server config
3. Export in smaller batches
```bash
# Export with date filter
curl -X GET "http://localhost:8000/api/v1/nach-batches/export/excel?date_from=2025-10-01&date_to=2025-10-31"
```

## Monitoring

### Key Metrics to Track

1. **Batch Creation Rate**
```sql
   SELECT DATE(batch_date) as date, COUNT(*) as batches_created
   FROM ach_batches
   GROUP BY DATE(batch_date)
   ORDER BY date DESC
   LIMIT 30;
```

2. **Average Batch Size**
```sql
   SELECT 
       AVG(total_payments) as avg_payments,
       AVG(total_amount) as avg_amount
   FROM ach_batches
   WHERE status != 'REVERSED';
```

3. **Reversal Rate**
```sql
   SELECT 
       status,
       COUNT(*) as count,
       ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM ach_batches), 2) as percentage
   FROM ach_batches
   GROUP BY status;
```

4. **File Generation Success Rate**
```sql
   SELECT 
       SUM(CASE WHEN nacha_file_generated THEN 1 ELSE 0 END) as generated,
       COUNT(*) as total,
       ROUND(SUM(CASE WHEN nacha_file_generated THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as success_rate
   FROM ach_batches
   WHERE status != 'REVERSED';
```

### Log Monitoring

Monitor application logs for errors:
```bash
# Follow logs in real-time
tail -f /var/log/bat-payment-engine/app.log | grep -i "nach\|ach\|nacha"

# Check for errors in last hour
grep -i "error.*nach" /var/log/bat-payment-engine/app.log | tail -n 50
```

Key log patterns to watch:
- `Created ACH batch` - Successful batch creation
- `NACHA file generated successfully` - File generation success
- `Batch reversed` - Reversal operations
- `Failed to` - Any failures requiring attention

### Health Check Endpoint

Create a simple health check:
```python
@router.get("/health")
def health_check():
    """NACH batch module health check"""
    return {
        "module": "nach_batches",
        "status": "healthy",
        "version": "1.0"
    }
```

Test:
```bash
curl http://localhost:8000/api/v1/nach-batches/health
```

## Support Contacts

### Internal Support
- **Development Team**: dev-team@bigappletaxi.com
- **Database Team**: dba-team@bigappletaxi.com
- **Finance Team**: finance@bigappletaxi.com

### External Support
- **Bank ACH Support**: Contact your bank's ACH department
- **NACHA Standards**: https://www.nacha.org/

## Additional Resources

### NACHA File Format
- [NACHA File Format Specification](https://www.nacha.org/content/ach-file-specifications)
- [ABA Routing Number Database](https://www.routingnumbers.info/)

### ACH Library Documentation
- [Python ACH Library](https://github.com/glenselle/ach)

### Internal Documentation
- DTR Module Documentation: `app/dtr/docs/README.md`
- Driver Module Documentation: `app/drivers/docs/README.md`
- Ledger Module Documentation: `app/ledger/docs/README.md`

---

**Integration Guide Version:** 1.0  
**Last Updated:** October 31, 2025  
**Status:** Production Ready