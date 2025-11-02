# Vehicle Repairs Module - Complete Documentation

## Overview

The Vehicle Repairs module manages the complete lifecycle of vehicle repair expenses charged to drivers. It provides repair invoice tracking, automatic payment schedule generation, and systematic reconciliation through weekly DTRs.

### Key Features

- Invoice capture with OCR document support
- Automatic payment schedule generation using Repair Payment Matrix
- Weekly installment posting to centralized ledger
- Balance tracking and carry-forward
- Comprehensive filtering and export capabilities
- Integration with Driver, Lease, Vehicle, and Medallion entities
- Scheduled automated posting (Sunday 05:00 AM)

### Business Benefits

- Prevents large repair costs from overwhelming driver's weekly earnings
- Ensures BAT recovers repair expenses reliably
- Provides complete transparency for both BAT staff and drivers
- Maintains audit trail for all financial transactions

## Architecture

### Module Structure

```
app/repairs/
├── __init__.py           # Module initialization
├── models.py             # SQLAlchemy models (VehicleRepair, RepairInstallment)
├── schemas.py            # Pydantic request/response schemas
├── repository.py         # Data access layer
├── service.py            # Business logic layer
├── router.py             # FastAPI endpoints
├── tasks.py              # Celery scheduled tasks
├── exceptions.py         # Custom exception classes
└── README.md             # This documentation
```

### Design Pattern

**Layered Architecture:**
- **Models Layer:** Database entities and relationships
- **Repository Layer:** CRUD operations and queries
- **Service Layer:** Business logic and orchestration
- **Router Layer:** API endpoints and request handling
- **Tasks Layer:** Scheduled automation

## Repair Payment Matrix

Determines weekly installment amount based on total repair cost:

| Repair Amount | Weekly Installment |
|---------------|-------------------|
| $0 - $200 | Paid in full (single installment) |
| $201 - $500 | $100 per week |
| $501 - $1,000 | $200 per week |
| $1,001 - $3,000 | $250 per week |
| > $3,000 | $300 per week |

**Note:** Final installment is automatically adjusted if remaining balance is less than standard installment amount.

## Database Schema

### vehicle_repairs Table

Master repair invoice records:

| Column | Type | Description |
|--------|------|-------------|
| repair_id (PK) | String(50) | Unique ID (format: RPR-YYYY-NNN) |
| driver_id (FK) | Integer | Driver responsible for payment |
| lease_id (FK) | Integer | Active lease at time of repair |
| vehicle_id (FK) | Integer | Vehicle that was repaired |
| medallion_id (FK) | Integer | Medallion (nullable) |
| vin | String(50) | Vehicle VIN |
| plate_number | String(20) | Vehicle plate |
| hack_license | String(50) | Driver TLC license |
| invoice_number | String(100) | Workshop invoice number |
| invoice_date | Date | Invoice issue date |
| workshop_type | Enum | BIG_APPLE or EXTERNAL |
| repair_description | Text | Description of work |
| repair_amount | Numeric(10,2) | Total repair cost |
| start_week | Enum | CURRENT or NEXT |
| start_week_date | Date | First installment Sunday |
| weekly_installment_amount | Numeric(10,2) | Standard weekly payment |
| total_paid | Numeric(10,2) | Sum of paid installments |
| outstanding_balance | Numeric(10,2) | Remaining unpaid balance |
| status | Enum | DRAFT, OPEN, CLOSED, HOLD, CANCELLED |
| invoice_document_id (FK) | Integer | Uploaded invoice document |
| confirmed_at | DateTime | When status changed to OPEN |
| closed_at | DateTime | When fully paid |

**Indexes:**
- `idx_repairs_driver_status` (driver_id, status)
- `idx_repairs_lease_status` (lease_id, status)
- `idx_repairs_vehicle` (vehicle_id)
- `idx_repairs_invoice_date` (invoice_date)

### repair_installments Table

Individual weekly installments:

| Column | Type | Description |
|--------|------|-------------|
| installment_id (PK) | String(60) | Unique ID (format: RPR-YYYY-NNN-NN) |
| repair_id (FK) | String(50) | Parent repair invoice |
| installment_number | Integer | Sequential number (1, 2, 3...) |
| driver_id | Integer | Denormalized from repair |
| lease_id | Integer | Denormalized from repair |
| vehicle_id | Integer | Denormalized from repair |
| medallion_id | Integer | Denormalized from repair |
| week_start | Date | Sunday 00:00:00 |
| week_end | Date | Saturday 23:59:59 |
| due_date | Date | Due date (typically Saturday) |
| installment_amount | Numeric(10,2) | Amount due this period |
| amount_paid | Numeric(10,2) | Amount actually paid |
| prior_balance | Numeric(10,2) | Carried forward balance |
| balance | Numeric(10,2) | Remaining after this installment |
| status | Enum | SCHEDULED, DUE, POSTED, PAID |
| posted_to_ledger | Integer | 0=unposted, 1=posted |
| ledger_posting_id | String(50) | Ledger entry ID |
| ledger_balance_id | String(50) | Ledger balance ID |
| posted_at | DateTime | Posting timestamp |

**Indexes:**
- `idx_installments_repair` (repair_id, installment_number)
- `idx_installments_driver_status` (driver_id, status)
- `idx_installments_week_start` (week_start)
- `idx_installments_unposted` (posted_to_ledger, week_start)
- `idx_installments_lease` (lease_id, status)

## API Endpoints

### Repair Management

#### POST /repairs/

Create new repair invoice.

**Request:**
```json
{
  "driver_id": 123,
  "lease_id": 456,
  "vehicle_id": 789,
  "medallion_id": 101,
  "invoice_number": "EXT-4589",
  "invoice_date": "2025-10-01",
  "workshop_type": "EXTERNAL",
  "repair_description": "Brake system overhaul",
  "repair_amount": 1200.00,
  "start_week": "CURRENT",
  "invoice_document_id": 5001
}
```

**Response (201):**
```json
{
  "repair_id": "RPR-2025-001",
  "driver_id": 123,
  "lease_id": 456,
  "vehicle_id": 789,
  "invoice_number": "EXT-4589",
  "invoice_date": "2025-10-01",
  "workshop_type": "EXTERNAL",
  "repair_amount": 1200.00,
  "weekly_installment_amount": 250.00,
  "start_week": "CURRENT",
  "start_week_date": "2025-10-05",
  "status": "DRAFT",
  "outstanding_balance": 1200.00,
  "total_paid": 0.00,
  "created_on": "2025-10-01T14:30:00Z"
}
```

#### GET /repairs/{repair_id}

Get repair details with installments.

**Response (200):**
```json
{
  "repair_id": "RPR-2025-001",
  "invoice_number": "EXT-4589",
  "repair_amount": 1200.00,
  "status": "OPEN",
  "installments": [
    {
      "installment_id": "RPR-2025-001-01",
      "installment_number": 1,
      "week_start": "2025-10-05",
      "week_end": "2025-10-11",
      "installment_amount": 250.00,
      "status": "POSTED",
      "posted_to_ledger": 1
    },
    {
      "installment_id": "RPR-2025-001-02",
      "installment_number": 2,
      "week_start": "2025-10-12",
      "week_end": "2025-10-18",
      "installment_amount": 250.00,
      "status": "SCHEDULED",
      "posted_to_ledger": 0
    }
  ]
}
```

#### PUT /repairs/{repair_id}

Update repair invoice (DRAFT only).

#### POST /repairs/{repair_id}/confirm

Confirm repair (DRAFT -> OPEN).

#### PATCH /repairs/{repair_id}/status

Update repair status.

**Request:**
```json
{
  "status": "HOLD",
  "reason": "Driver dispute pending resolution"
}
```

#### GET /repairs/

List repairs with filters and pagination.

**Query Parameters:**
- `driver_id` - Filter by driver
- `lease_id` - Filter by lease
- `vehicle_id` - Filter by vehicle
- `status` - Filter by status
- `invoice_date_from` - Start date filter
- `invoice_date_to` - End date filter
- `page` - Page number (default: 1)
- `page_size` - Items per page (default: 50, max: 1000)
- `sort_by` - Field to sort by (default: invoice_date)
- `sort_order` - asc or desc (default: desc)

**Response (200):**
```json
{
  "repairs": [...],
  "total": 150,
  "page": 1,
  "page_size": 50,
  "total_pages": 3
}
```

### Installment Queries

#### GET /repairs/installments/unposted

**KEY ENDPOINT:** Find unposted repair installments.

**Query Parameters:**
- `repair_id` - Specific repair
- `driver_id` - All unposted for driver
- `lease_id` - All unposted for lease
- `vehicle_id` - All unposted for vehicle
- `medallion_id` - All unposted for medallion
- `period_start` - Payment period start
- `period_end` - Payment period end
- `status` - Installment status
- `page`, `page_size`, `sort_by`, `sort_order`

**Use Cases:**
- Weekly posting: Find all due this week
- Driver view: Show upcoming payments
- Vehicle tracking: Pending repairs for vehicle
- Period reconciliation: Unposted in date range

**Example Request:**
```
GET /repairs/installments/unposted?driver_id=123&period_start=2025-10-05&period_end=2025-10-11
```

**Response (200):**
```json
{
  "installments": [
    {
      "installment_id": "RPR-2025-001-01",
      "repair_id": "RPR-2025-001",
      "driver_id": 123,
      "week_start": "2025-10-05",
      "week_end": "2025-10-11",
      "installment_amount": 250.00,
      "status": "DUE",
      "posted_to_ledger": 0
    }
  ],
  "total": 1,
  "page": 1,
  "page_size": 50,
  "total_pages": 1
}
```

#### GET /repairs/installments/

List all installments (posted and unposted).

#### GET /repairs/installments/{installment_id}

Get specific installment details.

### Ledger Posting

#### POST /repairs/installments/post

Manually post installments to ledger.

**Request:**
```json
{
  "installment_ids": [
    "RPR-2025-001-01",
    "RPR-2025-001-02",
    "RPR-2025-002-01"
  ]
}
```

**Response (200):**
```json
{
  "success_count": 2,
  "failure_count": 1,
  "posted_installments": [
    "RPR-2025-001-01",
    "RPR-2025-001-02"
  ],
  "failed_installments": [
    {
      "installment_id": "RPR-2025-002-01",
      "error": "Repair status is DRAFT, must be OPEN"
    }
  ],
  "message": "Posted 2 installments successfully, 1 failed"
}
```

### Statistics and Export

#### GET /repairs/statistics

Get aggregated statistics.

**Query Parameters:**
- `driver_id` - Filter by driver
- `lease_id` - Filter by lease
- `date_from` - Start date
- `date_to` - End date

**Response (200):**
```json
{
  "total_repairs": 45,
  "open_repairs": 12,
  "closed_repairs": 30,
  "draft_repairs": 2,
  "hold_repairs": 1,
  "total_repair_amount": 54000.00,
  "total_paid": 32500.00,
  "total_outstanding": 21500.00,
  "total_installments": 180,
  "scheduled_installments": 45,
  "posted_installments": 120,
  "paid_installments": 95,
  "average_repair_amount": 1200.00,
  "average_weekly_installment": 225.00
}
```

#### GET /repairs/export/{format}

Export repairs to file.

**Formats:** excel, pdf, csv, json

**Example:**
```
GET /repairs/export/excel?driver_id=123&status=OPEN
```

Returns downloadable file.

#### GET /repairs/installments/export/{format}

Export installments to file.

## Scheduled Tasks

### Weekly Installment Posting

**Task:** `post_weekly_repair_installments_task`  
**Schedule:** Every Sunday at 05:00 AM  
**Trigger:** Celery Beat

**Process:**
1. Find installments with week_start <= current_date
2. Filter unposted (posted_to_ledger = 0)
3. Post each to ledger (REPAIRS category)
4. Update installment status to POSTED
5. Update repair payment tracking

**Configuration:**
```python
from celery.schedules import crontab

app.conf.beat_schedule = {
    'post-weekly-repair-installments': {
        'task': 'repairs.post_weekly_installments',
        'schedule': crontab(hour=5, minute=0, day_of_week=0),
        'options': {'expires': 3600}
    }
}
```

## Business Logic

### Repair Creation Flow

1. **Validate Entities**
   - Check driver, lease, vehicle exist
   - Verify lease is active

2. **Check Duplicates**
   - Prevent duplicate invoice number for same vehicle/date

3. **Calculate Installment**
   - Apply Repair Payment Matrix
   - Determine weekly amount

4. **Determine Start Week**
   - CURRENT: Next Sunday (or today if Sunday)
   - NEXT: Sunday after next

5. **Generate Schedule**
   - Create installments until balance = $0
   - Adjust final installment if needed

6. **Save Records**
   - Create repair in DRAFT status
   - Create all installments as SCHEDULED

### Installment Lifecycle

```
SCHEDULED → DUE → POSTED → PAID
```

- **SCHEDULED:** Installment created, not yet due
- **DUE:** Payment period has started (week_start <= current_date)
- **POSTED:** Posted to ledger, appears in DTR
- **PAID:** Payment applied from ledger

### Ledger Integration

When posting installment:

```python
ledger_service.create_obligation(
    driver_id=installment.driver_id,
    lease_id=installment.lease_id,
    category=PostingCategory.REPAIRS,  # 6th in payment hierarchy
    amount=installment.installment_amount,
    reference_type="REPAIR_INSTALLMENT",
    reference_id=installment.installment_id,
    payment_period_start=week_start,
    payment_period_end=week_end,
    due_date=due_date
)
```

Creates:
- **LedgerPosting:** DEBIT with REPAIRS category
- **LedgerBalance:** Obligation balance to be paid

### Status Transitions

**Repair Status:**

```
DRAFT → OPEN → CLOSED
  ↓       ↓
CANCELLED HOLD
         ↓
        OPEN
```

**Allowed Transitions:**
- DRAFT → OPEN, CANCELLED
- OPEN → HOLD, CLOSED, CANCELLED
- HOLD → OPEN, CANCELLED
- CLOSED → (terminal)
- CANCELLED → (terminal)

## Error Handling

### Custom Exceptions

All exceptions inherit from `RepairsException`:

- **RepairNotFoundException:** Repair ID not found
- **InstallmentNotFoundException:** Installment ID not found
- **RepairValidationException:** Data validation failed
- **DuplicateInvoiceException:** Invoice already exists
- **InvalidStatusTransitionException:** Status change not allowed
- **RepairAlreadyPostedException:** Cannot modify posted repair
- **InstallmentAlreadyPostedException:** Cannot modify posted installment
- **RepairPostingException:** Ledger posting failed
- **EntityNotFoundException:** Driver/Lease/Vehicle not found
- **LeaseNotActiveException:** Lease is inactive

### HTTP Status Codes

- **200:** Success
- **201:** Created
- **400:** Bad Request (validation error)
- **404:** Not Found
- **409:** Conflict (duplicate)
- **500:** Internal Server Error

## Validation Rules

### Invoice-Level

1. **Mandatory Fields:** invoice_number, invoice_date, workshop_type, repair_amount
2. **Entity Linkage:** driver_id, lease_id, vehicle_id must be valid
3. **Unique Invoice:** No duplicate invoice_number for same vehicle/date
4. **Amount Integrity:** repair_amount must equal sum of installments
5. **Start Week:** Must align to valid payment period

### Schedule-Level

1. **Matrix Compliance:** Installments follow payment matrix (except final)
2. **Installment ID:** Each must be unique and linked to parent
3. **Period Alignment:** week_start = Sunday, week_end = Saturday
4. **Continuity:** No gaps or overlaps in installment periods
5. **Balance Accuracy:** balance = repair_amount - sum(paid installments)

### Posting-Level

1. **Posting Trigger:** Only when payment period arrives (Sunday 05:00)
2. **Ledger Linkage:** Each posting has 1:1 mapping to installment
3. **Reconciliation:** Total postings must match DTR deductions
4. **Immutability:** Once posted, cannot be deleted (use adjustments)

## Integration Points

### Required Services

- **Drivers:** Driver entity validation
- **Leases:** Lease entity validation and status check
- **Vehicles:** Vehicle entity validation
- **Medallions:** Medallion entity (optional)
- **Ledger:** Obligation posting and balance tracking
- **Documents:** Invoice document upload/retrieval

### DTR Integration

The DTR pulls repair data from `Ledger_Balances`, not directly from repairs:

1. System posts installment to ledger (Sunday 05:00)
2. Ledger creates balance record
3. DTR generation queries ledger balances
4. Driver sees weekly deduction in "Repairs" section
5. Prior balance and remaining balance shown for transparency

## Production Deployment

### Prerequisites

1. Database tables created
2. Ledger service functional
3. Driver, Lease, Vehicle entities available
4. Celery configured and running
5. Authentication/authorization enabled

### Deployment Steps

1. **Add Router to main.py:**
```python
from app.repairs import repairs_router

app.include_router(repairs_router, prefix="/api")
```

2. **Configure Celery Beat:**
```python
# In celery_app.py
from celery.schedules import crontab

app.conf.beat_schedule = {
    'post-weekly-repair-installments': {
        'task': 'repairs.post_weekly_installments',
        'schedule': crontab(hour=5, minute=0, day_of_week=0)
    }
}
```

3. **Start Services:**
```bash
# Application
uvicorn main:app --reload

# Celery Worker
celery -A celery_app worker --loglevel=info

# Celery Beat
celery -A celery_app beat --loglevel=info
```

4. **Verify Endpoints:**
```bash
curl http://localhost:8000/api/repairs/
curl http://localhost:8000/api/repairs/statistics
```

### Monitoring

**Key Metrics:**
- Weekly posting success rate (should be >99%)
- Average repair amount
- Installment backlog (unposted count)
- Failed posting rate

**Logs to Monitor:**
- `Created repair {repair_id}`
- `Posted installment {installment_id} to ledger`
- `Weekly repair installments posting completed`
- Error logs for posting failures

### Troubleshooting

**Issue:** Installments not posting automatically  
**Check:**
- Celery beat is running
- Celery worker is processing tasks
- Installment week_start date is correct
- Repair status is OPEN

**Issue:** Duplicate invoice error  
**Check:**
- Invoice number matches existing
- Same vehicle_id and invoice_date
- Update existing or use different invoice number

**Issue:** Cannot confirm repair  
**Check:**
- Repair status is DRAFT
- No posted installments exist

## Testing Recommendations

### Unit Tests

- Repair creation with validation
- Payment schedule generation
- Weekly installment calculation
- Status transitions
- Ledger posting

### Integration Tests

- End-to-end repair creation and posting
- Schedule regeneration on amount change
- Multiple filter combinations
- Export functionality
- Bulk posting

### Manual Testing Checklist

- [ ] Create repair invoice
- [ ] Confirm repair (DRAFT -> OPEN)
- [ ] Verify installment schedule
- [ ] Manually post installment
- [ ] Check ledger balance created
- [ ] Update repair status
- [ ] List repairs with filters
- [ ] Export repairs to Excel/PDF
- [ ] Find unposted installments
- [ ] Test weekly automated posting

## Production Readiness Checklist

- [x] Complete implementation (no placeholders)
- [x] Type hints throughout
- [x] Error handling with custom exceptions
- [x] Logging at all levels
- [x] Input validation (Pydantic schemas)
- [x] Database indexes for performance
- [x] Comprehensive filtering and sorting
- [x] Export functionality (Excel, PDF, CSV, JSON)
- [x] Scheduled automation (Celery)
- [x] Audit trail (created_by, created_on, updated_on)
- [x] Transaction management
- [x] Documentation (this file)

## Version History

**v1.0.0** - Initial Production Release
- Complete repair invoice management
- Automatic payment schedule generation
- Ledger integration with REPAIRS category
- Multiple filter options
- Export functionality
- Scheduled weekly posting
- Comprehensive documentation

## Support

For issues or questions:
- Check logs: `logs/repairs.log`
- Review repair statistics: `GET /repairs/statistics`
- Contact development team

---

**Module Status:** Production Ready ✅

**No placeholders. Complete implementation.**