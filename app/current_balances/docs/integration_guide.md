# Current Balances Module - Integration Guide

Step-by-step guide for integrating the Current Balances module into the BAT Payment Engine.

## Prerequisites

Ensure these modules are already implemented:
- Centralized Ledger (Phase 1)
- Drivers module
- Leases module
- Vehicles module
- Medallions module
- DTR module
- Users module
- Authentication/Authorization

## Step 1: Copy Module Files

Copy all module files to the application:

```bash
mkdir -p app/current_balances
cp models.py app/current_balances/
cp schemas.py app/current_balances/
cp exceptions.py app/current_balances/
cp repository.py app/current_balances/
cp service.py app/current_balances/
cp router.py app/current_balances/
cp __init__.py app/current_balances/
cp README.md app/current_balances/
```

## Step 2: Register Router in Main Application

Add the router to `app/main.py`:

```python
from app.current_balances.router import router as current_balances_router

# Register router
bat_app.include_router(
    current_balances_router,
    prefix="/api/v1",
    tags=["Current Balances"]
)
```

## Step 3: Verify Dependencies

Ensure all required dependencies are available:

### Database Models
- ✅ Lease (app.leases.models)
- ✅ Driver (app.drivers.models)
- ✅ Vehicle (app.vehicles.models)
- ✅ Medallion (app.medallions.models)
- ✅ LedgerPosting (app.ledger.models)
- ✅ LedgerBalance (app.ledger.models)
- ✅ DTR (app.dtr.models)

### Utilities
- ✅ ExporterFactory (app.utils.exporter_utils)
- ✅ Logger (app.utils.logger)

### Auth
- ✅ get_current_user (app.users.utils)
- ✅ get_db (app.core.db)

## Step 4: Test Endpoints

Access FastAPI docs at `/docs` and test:

### 1. Test Stub Response
```bash
GET /current-balances/?use_stub=true
```
Should return 3 sample records.

### 2. Test Current Week List
```bash
GET /current-balances/
```
Should return actual current week data.

### 3. Test Search
```bash
GET /current-balances/?search=John
```
Should filter results by search term.

### 4. Test Detail View
```bash
GET /current-balances/{lease_id}
```
Should return weekly summary with daily breakdown.

### 5. Test Daily Charges
```bash
GET /current-balances/{lease_id}/daily-charges?target_date=2025-10-27&category=EZPASS
```
Should return individual charge details.

### 6. Test Statistics
```bash
GET /current-balances/statistics/summary
```
Should return aggregate statistics.

### 7. Test Export
```bash
GET /current-balances/export/excel
```
Should download Excel file.

## Step 5: Verify Data Flow

### Check Data Sources

1. **Verify Ledger Postings**
   ```sql
   SELECT COUNT(*) FROM ledger_postings 
   WHERE category = 'EARNINGS' AND posting_type = 'CREDIT';
   ```
   Should have earnings data.

2. **Verify Ledger Balances**
   ```sql
   SELECT COUNT(*) FROM ledger_balances 
   WHERE status = 'OPEN';
   ```
   Should have outstanding balances.

3. **Verify Active Leases**
   ```sql
   SELECT COUNT(*) FROM leases 
   WHERE start_date <= CURRENT_DATE 
   AND (end_date IS NULL OR end_date >= CURRENT_DATE);
   ```
   Should have active leases.

## Step 6: Test Week Selection

### Test Current Week
```bash
GET /current-balances/
```
- Should show DTR status = NOT_GENERATED
- Should show live data

### Test Historical Week
```bash
GET /current-balances/?week_start=2025-10-19&week_end=2025-10-25
```
- Should show DTR status = GENERATED (if DTR exists)
- Should show finalized data

### Test Invalid Week
```bash
GET /current-balances/?week_start=2025-10-20&week_end=2025-10-26
```
- Should return 400 error (not Sunday-Saturday)

## Step 7: Test Filtering and Sorting

### Test Status Filters
```bash
GET /current-balances/?lease_status=ACTIVE
GET /current-balances/?driver_status=SUSPENDED
GET /current-balances/?payment_type=ACH
GET /current-balances/?dtr_status=GENERATED
```

### Test Sorting
```bash
GET /current-balances/?sort_by=net_earnings&sort_order=desc
GET /current-balances/?sort_by=driver_name&sort_order=asc
```

### Test Search
```bash
GET /current-balances/?search=1045  # By lease ID
GET /current-balances/?search=John  # By driver name
GET /current-balances/?search=5087912  # By hack license
GET /current-balances/?search=T123456  # By plate
GET /current-balances/?search=1W47  # By medallion
```

## Step 8: Test Pagination

```bash
GET /current-balances/?page=1&page_size=10
GET /current-balances/?page=2&page_size=10
GET /current-balances/?page=1&page_size=50
```

Verify:
- ✅ Correct number of items per page
- ✅ Total count is accurate
- ✅ Total pages calculated correctly
- ✅ Navigation works

## Step 9: Test Export Formats

### Excel
```bash
curl -X GET "http://localhost:8000/current-balances/export/excel" \
  -H "Authorization: Bearer {token}" \
  --output balances.xlsx
```

### PDF
```bash
curl -X GET "http://localhost:8000/current-balances/export/pdf" \
  -H "Authorization: Bearer {token}" \
  --output balances.pdf
```

### CSV
```bash
curl -X GET "http://localhost:8000/current-balances/export/csv" \
  -H "Authorization: Bearer {token}" \
  --output balances.csv
```

### JSON
```bash
curl -X GET "http://localhost:8000/current-balances/export/json" \
  -H "Authorization: Bearer {token}" \
  --output balances.json
```

## Step 10: Performance Testing

### Test Large Result Sets
```bash
# Get all records (no filters)
GET /current-balances/?page_size=100
```

### Test Export Performance
```bash
# Export all records
GET /current-balances/export/excel
```

Monitor:
- Response time should be < 5s for 1000 records
- Memory usage should be reasonable
- No timeout errors

## Step 11: Error Handling Verification

### Test Invalid Lease ID
```bash
GET /current-balances/99999
```
Should return 404 error.

### Test Invalid Week Period
```bash
GET /current-balances/?week_start=2025-10-20&week_end=2025-10-27
```
Should return 400 error with message about Sunday-Saturday.

### Test Invalid Category
```bash
GET /current-balances/1045/daily-charges?target_date=2025-10-27&category=INVALID
```
Should return 400 error with message about invalid category.

## Step 12: Integration with Frontend

### Week Selector Component
```javascript
// Fetch current week
fetch('/api/v1/current-balances/')
  .then(res => res.json())
  .then(data => {
    console.log('Week:', data.week_start, 'to', data.week_end);
    console.log('Balances:', data.items);
  });
```

### Search Component
```javascript
// Search by term
const search = 'John';
fetch(`/api/v1/current-balances/?search=${search}`)
  .then(res => res.json())
  .then(data => {
    console.log('Search results:', data.items);
  });
```

### Expandable Row Component
```javascript
// Get daily breakdown
fetch(`/api/v1/current-balances/${leaseId}`)
  .then(res => res.json())
  .then(data => {
    console.log('Daily breakdown:', data.daily_breakdown);
    console.log('Delayed charges:', data.delayed_charges);
  });
```

### Export Button
```javascript
// Export to Excel
window.open(`/api/v1/current-balances/export/excel?${filters}`, '_blank');
```

## Step 13: Monitoring Setup

### Add Logging Alerts

Monitor for these log patterns:
- `ERROR: Failed to retrieve balance data`
- `WARNING: No data found for given filters`
- `ERROR: Export failed`

### Add Performance Metrics

Track:
- Average response time per endpoint
- Export requests by format
- Most used filters
- Search patterns

### Add Usage Analytics

Track:
- Daily active users
- Most viewed leases
- Export frequency
- Week selection patterns

## Troubleshooting

### Issue: No data returned
**Solution:** 
- Verify leases exist in database
- Check ledger postings have data
- Verify date range is correct

### Issue: Export fails
**Solution:**
- Check ExporterFactory is available
- Verify data is not empty
- Check file permissions

### Issue: Slow performance
**Solution:**
- Add database indexes on foreign keys
- Optimize ledger queries
- Consider caching for current week

### Issue: Daily breakdown missing
**Solution:**
- Verify ledger postings have transaction_date
- Check date range overlaps with week period
- Verify posting categories are correct

## Production Deployment Checklist

- [ ] All module files copied
- [ ] Router registered in main.py
- [ ] Dependencies verified
- [ ] All endpoints tested
- [ ] Data flow verified
- [ ] Week selection tested
- [ ] Filtering and sorting tested
- [ ] Export formats tested
- [ ] Error handling verified
- [ ] Performance tested
- [ ] Monitoring configured
- [ ] Frontend integration complete
- [ ] Documentation reviewed
- [ ] Stakeholders trained

## Post-Deployment Verification

1. **Day 1**: Monitor error logs
2. **Week 1**: Track usage patterns
3. **Week 2**: Review performance metrics
4. **Month 1**: Gather user feedback

## Support

For issues or questions:
1. Check logs for error messages
2. Review API documentation at `/docs`
3. Refer to README.md for business rules
4. Contact development team

---

**Module:** Current Balances  
**Version:** 1.0  
**Last Updated:** October 31, 2025  
**Status:** Ready for Production