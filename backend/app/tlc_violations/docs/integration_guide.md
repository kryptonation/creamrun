# TLC Violations Module - Integration Guide

Step-by-step guide for integrating the TLC Violations module into the BAT Payment Engine.

## Prerequisites

Ensure these modules are already implemented:
- Centralized Ledger (Phase 1)
- CURB Module (Phase 2A)
- Drivers module
- Vehicles module
- Medallions module
- Leases module
- Users module
- Authentication/Authorization

## Integration Steps

### Step 1: Module Files

Copy all TLC Violations module files to your project:

```bash
mkdir -p app/tlc_violations
cp models.py app/tlc_violations/
cp schemas.py app/tlc_violations/
cp repository.py app/tlc_violations/
cp service.py app/tlc_violations/
cp router.py app/tlc_violations/
cp exceptions.py app/tlc_violations/
cp __init__.py app/tlc_violations/
```

### Step 2: Database Migration

Create and run database migration to add the TLC violations tables:

```python
# In your migration file (alembic or similar)

# Tables will be created based on models:
# - tlc_violations
# - tlc_violation_documents

# Key indexes:
# - idx_tlc_summons_driver (summons_number, driver_id)
# - idx_tlc_occurrence_date_time (occurrence_date, occurrence_time)
# - idx_tlc_status_posting (status, posting_status)
# - idx_tlc_hearing_date (hearing_date)
# - idx_tlc_doc_violation (violation_id, uploaded_on)
```

### Step 3: Register Router

Add the TLC Violations router to your main FastAPI application:

```python
# In app/main.py

from app.tlc_violations.router import router as tlc_violations_router

# Register router
bat_app.include_router(
    tlc_violations_router,
    prefix="/api/v1",
    tags=["TLC Violations"]
)
```

### Step 4: Verify Dependencies

Ensure all required dependencies are available:

**Database Models:**
- Driver
- Vehicle
- Medallion
- Lease
- CurbTrip
- LedgerPosting
- LedgerBalance
- User

**Services:**
- LedgerService (for posting violations)
- Ledger models (PostingCategory, PostingType)

**Utilities:**
- exporter_utils.py (for Excel/PDF/CSV/JSON export)
- logger (logging utility)
- S3 or file storage (for document uploads)

**Authentication:**
- get_current_user dependency
- get_db database session dependency

### Step 5: Environment Configuration

Add any required environment variables:

```bash
# If using S3 for document storage
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_S3_BUCKET=your_bucket_name
AWS_REGION=us-east-1

# Database
DATABASE_URL=postgresql://user:password@localhost/batconnect

# Logging
LOG_LEVEL=INFO
```

### Step 6: Test Installation

Verify the module is properly installed:

```bash
# Start application
uvicorn app.main:app --reload

# Check API documentation
curl http://localhost:8000/docs

# Test health endpoint
curl http://localhost:8000/api/v1/tlc-violations/statistics
```

## Usage Examples

### Example 1: Create Violation from Mailed Summons

```python
import requests

# Create violation
response = requests.post(
    "http://localhost:8000/api/v1/tlc-violations",
    json={
        "summons_number": "FN0013186",
        "tlc_license_number": "5F69",
        "respondent_name": "TRUE BLUE CAB LLC",
        "occurrence_date": "2025-09-16",
        "occurrence_time": "17:00:00",
        "occurrence_place": "24-55 BQE West, Woodside, NY",
        "borough": "QUEENS",
        "rule_section": "58-30(B)",
        "violation_type": "LICENSING_DOCUMENTATION",
        "violation_description": "Failure to comply with notice to correct defect",
        "fine_amount": 50.00,
        "hearing_date": "2025-11-13",
        "hearing_time": "10:00:00",
        "hearing_location": "OATH_QUEENS",
        "medallion_id": 123,
        "admin_notes": "Received via mail on 10/15/2025"
    },
    headers={"Authorization": "Bearer YOUR_TOKEN"}
)

violation = response.json()
print(f"Created violation: {violation['violation_id']}")
```

### Example 2: Auto-Match Driver via CURB

```python
# Create violation with auto-matching enabled
response = requests.post(
    "http://localhost:8000/api/v1/tlc-violations?auto_match_curb=true",
    json={
        "summons_number": "FN0013187",
        "tlc_license_number": "5F69",
        # ... other fields ...
        "medallion_id": 123,
        # No driver_id provided - will auto-match via CURB
    },
    headers={"Authorization": "Bearer YOUR_TOKEN"}
)

violation = response.json()
if violation['mapped_via_curb']:
    print(f"Auto-matched to driver: {violation['driver_id']}")
else:
    print("No CURB match found - manual assignment required")
```

### Example 3: Upload Summons Document

```python
# Upload PDF summons
with open("summons_FN0013186.pdf", "rb") as file:
    response = requests.post(
        f"http://localhost:8000/api/v1/tlc-violations/{violation_id}/documents/upload",
        files={"file": file},
        params={
            "document_type": "SUMMONS",
            "description": "Original summons received via mail"
        },
        headers={"Authorization": "Bearer YOUR_TOKEN"}
    )

document = response.json()
print(f"Uploaded document: {document['document_id']}")
```

### Example 4: Post to Ledger

```python
# Post violation to driver ledger
response = requests.post(
    f"http://localhost:8000/api/v1/tlc-violations/{violation_id}/post",
    json={"notes": "Posted after hearing confirmation"},
    headers={"Authorization": "Bearer YOUR_TOKEN"}
)

violation = response.json()
print(f"Posted to ledger: Posting ID {violation['ledger_posting_id']}")
```

### Example 5: Update Disposition After Hearing

```python
# Update disposition after hearing
response = requests.patch(
    f"http://localhost:8000/api/v1/tlc-violations/{violation_id}/disposition",
    json={
        "disposition": "GUILTY",
        "disposition_date": "2025-11-13",
        "disposition_notes": "Fine upheld, no reduction"
    },
    headers={"Authorization": "Bearer YOUR_TOKEN"}
)

violation = response.json()
print(f"Disposition updated to: {violation['disposition']}")
```

### Example 6: Batch Post Unposted Violations

```python
# Get all unposted violations
response = requests.get(
    "http://localhost:8000/api/v1/tlc-violations/unposted/find",
    headers={"Authorization": "Bearer YOUR_TOKEN"}
)
unposted = response.json()

# Batch post them
violation_ids = [v['id'] for v in unposted['violations']]
response = requests.post(
    "http://localhost:8000/api/v1/tlc-violations/post-batch",
    json={"violation_ids": violation_ids},
    headers={"Authorization": "Bearer YOUR_TOKEN"}
)

results = response.json()
print(f"Posted {results['successful']} violations, {results['failed']} failed")
```

### Example 7: Export to Excel

```python
# Export all violations for a driver to Excel
response = requests.get(
    "http://localhost:8000/api/v1/tlc-violations/export/excel",
    params={"driver_id": 456, "occurrence_date_from": "2025-01-01"},
    headers={"Authorization": "Bearer YOUR_TOKEN"}
)

with open("violations_report.xlsx", "wb") as f:
    f.write(response.content)
print("Exported to violations_report.xlsx")
```

## Common Workflows

### Workflow 1: Manual Violation Entry

1. Staff receives summons via mail/email
2. Create violation via POST `/tlc-violations`
   - Provide all summons details
   - Let auto_match_curb=true for automatic driver identification
3. Upload summons document via POST `/tlc-violations/{id}/documents/upload`
4. If auto-match failed, manually assign driver via PATCH `/tlc-violations/{id}`
5. Post to ledger via POST `/tlc-violations/{id}/post`
6. Track hearing via GET `/tlc-violations/hearings/upcoming`
7. After hearing, update disposition via PATCH `/tlc-violations/{id}/disposition`

### Workflow 2: Batch Processing

1. Collect all unposted violations via GET `/tlc-violations/unposted/find`
2. Review and verify driver assignments
3. Batch post via POST `/tlc-violations/post-batch`
4. Review results for any failures
5. Manually handle any failed postings

### Workflow 3: Driver Remapping

1. Identify violation needing remapping
2. Verify correct driver
3. Remap via POST `/tlc-violations/{id}/remap`
   - System automatically voids old posting if already posted
4. Repost to new driver's ledger via POST `/tlc-violations/{id}/post`

### Workflow 4: Hearing Management

1. Get upcoming hearings via GET `/tlc-violations/hearings/upcoming?days_ahead=7`
2. Prepare hearing documentation
3. After hearing, update disposition via PATCH `/tlc-violations/{id}/disposition`
4. Upload hearing results via POST `/tlc-violations/{id}/documents/upload`
5. If dismissed, void violation via POST `/tlc-violations/{id}/void`

## Monitoring & Maintenance

### Daily Tasks

**Check Unmapped Violations:**
```bash
curl http://localhost:8000/api/v1/tlc-violations/unmapped/find
```

**Check Unposted Violations:**
```bash
curl http://localhost:8000/api/v1/tlc-violations/unposted/find
```

**Check Overdue Hearings:**
```bash
curl http://localhost:8000/api/v1/tlc-violations/hearings/overdue
```

### Weekly Reports

**Generate Statistics:**
```bash
curl http://localhost:8000/api/v1/tlc-violations/statistics
```

**Export All Violations:**
```bash
curl "http://localhost:8000/api/v1/tlc-violations/export/excel?created_date_from=2025-10-24&created_date_to=2025-10-31" \
  -o weekly_violations_report.xlsx
```

### Performance Monitoring

**Key Metrics to Track:**
- Auto-match success rate (target: >95%)
- Posting success rate (target: >99%)
- Average time from creation to posting
- Hearing outcome distribution
- Violations by borough/type

**Database Query Performance:**
```sql
-- Check most common queries
SELECT query, calls, mean_exec_time
FROM pg_stat_statements
WHERE query LIKE '%tlc_violations%'
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Check index usage
SELECT indexrelname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public' AND indexrelname LIKE 'idx_tlc%';
```

## Troubleshooting

### Issue: CURB Auto-Match Not Working

**Symptoms:** Violations created without driver assignment despite auto_match_curb=true

**Check:**
1. CURB trip data exists for the time window
2. Vehicle is properly linked to medallion
3. Time window is ±30 minutes from occurrence time
4. CURB module is operational

**Solution:**
- Manually assign driver using PATCH endpoint
- Check CURB data import logs
- Verify vehicle-medallion linkage

### Issue: Cannot Post to Ledger

**Symptoms:** Posting fails with error

**Common Causes:**
1. Driver not assigned
2. Lease not assigned
3. Violation already posted
4. Violation voided
5. Ledger service unavailable

**Solution:**
```python
# Check violation details
response = requests.get(f"/tlc-violations/{violation_id}")
violation = response.json()

# Verify driver and lease
assert violation['driver_id'] is not None
assert violation['lease_id'] is not None
assert not violation['posted_to_ledger']
assert not violation['is_voided']
```

### Issue: Batch Posting Failures

**Symptoms:** Some violations fail in batch posting

**Check Errors:**
```python
results = response.json()
for error in results['errors']:
    print(f"Violation {error['violation_id']}: {error['error']}")
```

**Common Issues:**
- Missing driver/lease assignments
- Already posted violations
- Invalid balances

### Issue: Export Taking Too Long

**Symptoms:** Export endpoint times out

**Solution:**
- Add more specific filters to reduce result set
- Use pagination for large datasets
- Consider scheduled export jobs for very large reports

## Best Practices

### Data Entry

1. **Always provide complete summons details** - The more information, the better for matching and tracking
2. **Use auto-match first** - Let CURB matching handle driver assignment when possible
3. **Upload documents immediately** - Attach summons as soon as violation is created
4. **Add admin notes** - Document source, receipt date, and any special circumstances

### Posting Management

1. **Batch post daily** - Use batch posting endpoint for efficiency
2. **Review failures** - Always check batch posting results for errors
3. **Post before hearing** - Ensure violations are posted before scheduled hearings
4. **Verify assignments** - Double-check driver/lease before posting

### Hearing Tracking

1. **Monitor upcoming hearings** - Check weekly for hearings in next 30 days
2. **Update dispositions promptly** - Record outcomes same day as hearing
3. **Handle overdue hearings** - Investigate and update any overdue hearings
4. **Upload hearing results** - Attach disposition documentation

### Error Recovery

1. **Void and recreate** - For posted violations with errors, void and create new
2. **Use remapping carefully** - Only remap when absolutely certain of correct driver
3. **Document void reasons** - Always provide clear reason for voiding
4. **Track posting errors** - Monitor posting_error field for failed attempts

## Security Considerations

### Access Control

Ensure proper role-based access:
- **Admin/Accounting**: Full access to all operations
- **Staff**: Create, view, upload documents
- **Drivers**: View own violations only (if driver portal implemented)

### Data Protection

1. **PII in summons** - Treat violation data as sensitive
2. **Document storage** - Ensure encrypted storage for uploaded files
3. **Audit logging** - All operations tracked with user and timestamp
4. **API authentication** - Always use authenticated endpoints

## Performance Optimization

### Database Indexes

Ensure these indexes exist:
```sql
CREATE INDEX idx_tlc_summons_driver ON tlc_violations(summons_number, driver_id);
CREATE INDEX idx_tlc_occurrence_date_time ON tlc_violations(occurrence_date, occurrence_time);
CREATE INDEX idx_tlc_status_posting ON tlc_violations(status, posting_status);
CREATE INDEX idx_tlc_hearing_date ON tlc_violations(hearing_date);
CREATE INDEX idx_tlc_doc_violation ON tlc_violation_documents(violation_id, uploaded_on);
```

### Query Optimization

For large datasets:
- Use pagination (page_size <= 100)
- Apply date range filters
- Index frequently filtered fields
- Use eager loading for related entities

### Caching

Consider caching for:
- Statistics (5-minute cache)
- Upcoming hearings (1-hour cache)
- Violation counts by status (5-minute cache)

## Version History

**v1.0.0** - Initial Production Release
- Complete violation lifecycle management
- CURB integration for auto-matching
- Ledger integration with TLC category
- Document upload and management
- Comprehensive filtering and export
- Hearing tracking and disposition management

---

**Integration Status:** Complete and Production-Ready ✅

For questions or support, contact the development team.