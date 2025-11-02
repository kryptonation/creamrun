# CURB Import Module

## Overview

The CURB Import Module handles the complete workflow for importing taxi trip data from the CURB API, associating trips with BAT system entities (drivers, medallions, vehicles, leases), and posting financial data to the centralized ledger.

## Architecture

```
┌─────────────────────────────────────────┐
│         Router (API Endpoints)           │
│  - Import trips                          │
│  - Query trips                           │
│  - View import history                   │
│  - Manual remapping                      │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│      Service Layer (Business Logic)      │
│  - Import orchestration                  │
│  - Entity association                    │
│  - Ledger posting                        │
│  - Reconciliation                        │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│      Repository (Data Access)            │
│  - CRUD operations                       │
│  - Query building                        │
│  - Statistics                            │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│         CURB API Client (SOAP)           │
│  - GET_TRIPS_LOG10                       │
│  - Get_Trans_By_Date_Cab12               │
│  - Reconciliation_TRIP_LOG               │
└─────────────────────────────────────────┘
```

## Features

### ✅ Three-Part Import Process

1. **Import CURB Data from Server**
   - Fetches trips from GET_TRIPS_LOG10 endpoint
   - Fetches transactions from Get_Trans_By_Date_Cab12 endpoint
   - Handles pagination and API errors
   - Stores raw data in database

2. **Associate Data to Entities**
   - Maps hack_license_number → Driver (via TLC license)
   - Maps cab_number → Medallion
   - Finds active Lease for driver + medallion + date
   - Links Vehicle from lease
   - Records mapping confidence and method

3. **Post to Ledger**
   - Creates CREDIT posting for net earnings
   - Creates DEBIT postings for each tax:
     - MTA Tax (health_fee)
     - TIF (ehail_fee)
     - Congestion Fee
     - Airport Fee
     - CBDT Fee
   - Links postings to driver, lease, vehicle, medallion
   - Assigns to correct payment period (Sunday-Saturday)

### ✅ Import History Tracking

- Batch ID for each import run
- Status tracking (IN_PROGRESS, COMPLETED, FAILED, PARTIAL)
- Statistics: fetched, imported, mapped, posted, failed counts
- Duration and error logging
- Triggered by (API, CELERY, MANUAL)

### ✅ Scheduled Daily Import

Celery task runs daily at 5:00 AM:
- Imports previous day's trips
- Auto-associates to entities
- Posts to ledger
- Reconciles with CURB (production only)

### ✅ Reconciliation

- Marks trips as reconciled in CURB system
- Uses production endpoints only
- Tracks reconciliation status and timestamp
- Unique reconciliation ID per batch

### ✅ Manual Operations

- Remap trips to different driver/lease
- Process unmapped trips
- Post unposted trips
- View statistics and audit trail

## Database Models

### CurbTrip

Main trip record from CURB:
- **Identifiers**: record_id + period (composite unique key)
- **Financial**: trip_amount, tips, taxes, total_amount
- **Tax Breakdown**: ehail_fee, health_fee, congestion_fee, airport_fee, cbdt_fee
- **Payment**: payment_type (CASH, CREDIT_CARD, PRIVATE_CARD)
- **Location**: GPS coordinates, addresses
- **Entity Links**: driver_id, medallion_id, vehicle_id, lease_id
- **Mapping**: method, confidence, notes, manual assignment tracking
- **Ledger**: posted_to_ledger, ledger_posting_ids, posted_on
- **Reconciliation**: status, reconciled_on, curb_recon_id

### CurbTransaction

Transaction record from CURB:
- Separate from trips (different API endpoint)
- Links to trips via matching logic
- Tracks credit card transactions

### CurbImportHistory

Audit log for import batches:
- Batch ID, date range, filters
- Status and timestamps
- Statistics for trips and transactions
- Error tracking

## API Endpoints

### Import Operations

**POST /curb/import**
- Import trips for date range
- Optional filters: driver_id, cab_number
- Flags: perform_association, post_to_ledger, reconcile_with_curb

**GET /curb/import/history**
- View recent import batches
- Pagination support

**GET /curb/import/history/{batch_id}**
- Get specific batch details

### Trip Queries

**GET /curb/trips**
- List trips with filters
- Pagination (page, page_size)
- Filters: date range, driver, medallion, vehicle, lease, payment_type, posted_to_ledger

**GET /curb/trips/{trip_id}**
- Get detailed trip information

**GET /curb/trips/statistics**
- Aggregated statistics
- Total earnings, taxes, trip counts
- Breakdown by status

**GET /curb/trips/unmapped**
- Trips requiring manual review

**GET /curb/trips/unposted**
- Trips ready for ledger posting

### Manual Operations

**POST /curb/trips/{trip_id}/remap**
- Manually assign trip to driver/lease
- Requires reason for audit trail
- Voids old postings and creates new ones

## Celery Tasks

### Daily Import (Scheduled)

```python
# Runs at 5:00 AM daily
@shared_task(name="curb.import_daily_trips")
def import_daily_trips_task():
    # Import previous day's trips
    # Associate to entities
    # Post to ledger
    # Reconcile with CURB
```

Schedule in celerybeat:
```python
CELERYBEAT_SCHEDULE = {
    'import-curb-daily': {
        'task': 'curb.import_daily_trips',
        'schedule': crontab(hour=5, minute=0),
    }
}
```

### Manual Tasks

**import_date_range_task**: Import specific date range
**process_unmapped_trips_task**: Re-attempt mapping for unmapped trips
**post_unposted_trips_task**: Post mapped but unposted trips

## Configuration

Add to `app/core/config.py`:

```python
class Settings(BaseSettings):
    # CURB API credentials
    curb_user_id: str = Field(..., env='CURB_USER_ID')
    curb_password: str = Field(..., env='CURB_PASSWORD')
    curb_merchant: str = Field(..., env='CURB_MERCHANT')
    
    # Environment determines API URL
    # production → https://api.taxitronic.org/vts_service/taxi_service.asmx
    # development → https://demo.taxitronic.org/vts_service/taxi_service.asmx
```

Add to `.env`:
```
CURB_USER_ID=your_user_id
CURB_PASSWORD=your_password
CURB_MERCHANT=your_merchant_id
```

## Integration with Ledger

### Earnings Posting

```python
# Net earnings after taxes
net_earnings = total_amount - (ehail_fee + health_fee + congestion_fee + airport_fee + cbdt_fee)

# Create CREDIT posting
ledger_service.create_posting(
    driver_id=trip.driver_id,
    lease_id=trip.lease_id,
    posting_type=PostingType.CREDIT,
    category=PostingCategory.EARNINGS,
    amount=net_earnings,
    source_type='CURB_TRIP',
    source_id=f"{record_id}-{period}",
    payment_period_start=sunday,
    payment_period_end=saturday
)
```

### Tax Postings

```python
# Each tax as separate DEBIT obligation
tax_mappings = [
    ('MTA_TAX', health_fee),
    ('TIF', ehail_fee),
    ('CONGESTION', congestion_fee),
    ('AIRPORT_FEE', airport_fee),
    ('CBDT', cbdt_fee)
]

for tax_name, tax_amount in tax_mappings:
    if tax_amount > 0:
        ledger_service.create_obligation(
            driver_id=trip.driver_id,
            lease_id=trip.lease_id,
            category=PostingCategory.TAXES,
            amount=tax_amount,
            source_type='CURB_TAX',
            source_id=f"{record_id}-{period}-{tax_name}"
        )
```

## Payment Period Calculation

CURB trips are assigned to payment periods (Sunday to Saturday):

```python
def _get_payment_period(trip_date: date) -> Tuple[date, date]:
    """
    Payment periods run Sunday 00:00 to Saturday 23:59
    """
    # Find Sunday of the week
    days_since_sunday = trip_date.weekday()
    if trip_date.weekday() == 6:  # Sunday
        period_start = trip_date
    else:
        period_start = trip_date - timedelta(days=days_since_sunday + 1)
    
    period_end = period_start + timedelta(days=6)  # Saturday
    
    return period_start, period_end
```

## Entity Association Logic

### Driver Mapping

```
CURB driver_id (hack license) 
    → TlcLicense.tlc_license_number
    → TlcLicense.driver_id
    → Driver
```

### Medallion Mapping

```
CURB cab_number
    → Medallion.medallion_number
    → Medallion
```

### Lease Mapping

```
Driver + Medallion + Trip Date
    → Active Lease (via lease_drivers join)
    → Lease.vehicle_id
    → Vehicle
```

Mapping confidence:
- 1.00: All entities mapped (driver, medallion, lease, vehicle)
- 0.50: Driver and medallion found, no active lease
- 0.00: Could not map driver or medallion

## Error Handling

### Graceful Degradation

- Import continues even if some trips fail
- Status marked as PARTIAL if any errors
- Errors logged with details
- Failed trips can be retried

### Retry Logic

- Celery tasks have automatic retry (3 attempts)
- 5-minute delay between retries
- Manual tasks for processing failed records

### Validation

- Duplicate check (record_id + period)
- Amount validation (must be positive)
- Date range validation
- Entity existence validation for manual remapping

## Testing Checklist

### Unit Tests (Not Required Per Instructions)

- Service layer methods
- Repository queries
- Mapping logic
- Payment period calculation

### Integration Tests (Not Required Per Instructions)

- Full import workflow
- API endpoints
- Ledger posting
- Reconciliation

### Manual Testing

1. **Import Test**:
   ```bash
   POST /curb/import
   {
     "date_from": "2025-10-27",
     "date_to": "2025-10-27",
     "perform_association": true,
     "post_to_ledger": true,
     "reconcile_with_curb": false
   }
   ```

2. **Query Test**:
   ```bash
   GET /curb/trips?date_from=2025-10-27&page=1&page_size=50
   ```

3. **Statistics Test**:
   ```bash
   GET /curb/trips/statistics?date_from=2025-10-27&date_to=2025-10-27
   ```

4. **Remap Test**:
   ```bash
   POST /curb/trips/123/remap
   {
     "driver_id": 456,
     "lease_id": 789,
     "reason": "Driver switched vehicles mid-day"
   }
   ```

## Monitoring

### Key Metrics

- Daily import success rate
- Average import duration
- Mapping success rate (% trips auto-mapped)
- Posting success rate (% trips posted to ledger)
- Reconciliation success rate

### Alerts

- Import failures (send notification)
- High unmapped trip count (>10%)
- API errors from CURB
- Long import duration (>30 minutes)

## Troubleshooting

### Common Issues

**Issue**: Trips not mapping to drivers
- **Check**: TLC license numbers match CURB hack licenses
- **Fix**: Update TLC license table or manually remap

**Issue**: Trips not posting to ledger
- **Check**: Trips have driver_id and lease_id
- **Check**: Ledger service errors
- **Fix**: Run post_unposted_trips_task

**Issue**: Duplicate trip errors
- **Check**: Same record_id + period already imported
- **Fix**: CURB recycles IDs quarterly; use composite key

**Issue**: CURB API timeouts
- **Check**: Network connectivity
- **Check**: CURB API status
- **Fix**: Retry or import smaller date range

## Future Enhancements

- [ ] Support for cash trip obligations (optional)
- [ ] Advanced matching algorithms (fuzzy matching)
- [ ] Real-time import via webhooks
- [ ] Dashboard for import monitoring
- [ ] Export functionality for reconciliation reports
- [ ] Integration with DTR generation

## Support

For issues or questions:
1. Check logs: `app/curb/` module logs
2. Review import history: GET /curb/import/history
3. Check unmapped trips: GET /curb/trips/unmapped
4. Contact BAT development team