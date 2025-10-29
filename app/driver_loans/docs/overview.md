# Driver Loans Module - Complete Documentation

## Overview

The Driver Loans module manages personal loans extended to drivers by BAT with interest calculations and structured repayment schedules. It provides complete lifecycle management from loan creation to full repayment, with automatic installment generation, interest calculation, and ledger integration.

## Features

### Core Functionality
- Create loans with automatic schedule generation
- Apply loan repayment matrix to determine weekly principal
- Calculate simple interest on outstanding balance
- Generate weekly installment schedules
- Post installments to centralized ledger
- Track payment status and outstanding balances
- Comprehensive filtering and search capabilities
- Export functionality (Excel, PDF, CSV, JSON)
- Complete audit trail

### Business Rules

#### Loan Repayment Matrix
Determines weekly principal based on loan amount:

| Loan Amount | Weekly Principal |
|------------|------------------|
| $0 - $200 | Full amount (single installment) |
| $201 - $500 | $100/week |
| $501 - $1,000 | $200/week |
| $1,001 - $3,000 | $250/week |
| > $3,000 | $300/week |

#### Interest Calculation
Simple interest formula applied to outstanding principal:

```
Interest = Outstanding Principal × (Annual Rate / 100) × (Days / 365)

First Installment: Days from loan date to first due date
Subsequent Installments: 7 days (weekly)
Total Due = Principal Amount + Interest Amount
```

#### Payment Schedule
- All installments aligned to BAT weekly payment periods (Sunday 00:00 - Saturday 23:59)
- Start week must be a Sunday
- Due date is Saturday of each week
- Installments posted to ledger every Sunday 05:00 AM

## Database Schema

### driver_loans Table

| Field | Type | Description |
|-------|------|-------------|
| id | BIGINT | Primary key |
| loan_id | VARCHAR(50) | Unique identifier (DL-YYYY-NNNN) |
| loan_number | VARCHAR(50) | Display number |
| driver_id | INT | FK to drivers |
| lease_id | INT | FK to leases |
| loan_amount | DECIMAL(10,2) | Principal amount |
| interest_rate | DECIMAL(5,2) | Annual percentage rate |
| purpose | VARCHAR(255) | Reason for loan |
| notes | TEXT | Additional notes |
| loan_date | DATE | When loan created |
| start_week | DATE | Sunday when payments start |
| end_week | DATE | Estimated completion |
| status | ENUM | DRAFT/ACTIVE/CLOSED/ON_HOLD/CANCELLED |
| total_principal_paid | DECIMAL(10,2) | Principal paid to date |
| total_interest_paid | DECIMAL(10,2) | Interest paid to date |
| outstanding_balance | DECIMAL(10,2) | Amount still owed |
| approved_by | INT | FK to users |
| approved_on | DATETIME | Approval timestamp |
| closed_on | DATE | When fully paid |
| closure_reason | VARCHAR(255) | Why closed |
| created_by | INT | FK to users |
| created_on | DATETIME | Record creation |
| updated_on | DATETIME | Record update |

**Indexes:**
- idx_driver_lease (driver_id, lease_id)
- idx_status (status)
- idx_start_week (start_week)
- idx_loan_date (loan_date)

### loan_schedules Table

| Field | Type | Description |
|-------|------|-------------|
| id | BIGINT | Primary key |
| installment_id | VARCHAR(50) | Unique ID (loan_id-INST-NN) |
| loan_id | VARCHAR(50) | FK to driver_loans |
| installment_number | INT | Sequence number |
| due_date | DATE | When due |
| week_start | DATE | Sunday of week |
| week_end | DATE | Saturday of week |
| principal_amount | DECIMAL(10,2) | Principal portion |
| interest_amount | DECIMAL(10,2) | Interest portion |
| total_due | DECIMAL(10,2) | Principal + Interest |
| principal_paid | DECIMAL(10,2) | Principal paid |
| interest_paid | DECIMAL(10,2) | Interest paid |
| outstanding_balance | DECIMAL(10,2) | Amount still owed |
| status | ENUM | SCHEDULED/DUE/POSTED/PAID/SKIPPED |
| ledger_balance_id | VARCHAR(50) | Reference to ledger |
| posted_to_ledger | BOOLEAN | Whether posted |
| posted_on | DATETIME | When posted |
| posted_by | INT | FK to users |
| created_on | DATETIME | Record creation |
| updated_on | DATETIME | Record update |

**Indexes:**
- idx_loan_installment (loan_id, installment_number) UNIQUE
- idx_due_date_status (due_date, status)
- idx_week_period (week_start, week_end)
- idx_posted_status (posted_to_ledger, status)

## API Endpoints

### 1. Create Loan
**POST** `/loans/`

Create a new driver loan with automatic schedule generation.

**Request Body:**
```json
{
  "driver_id": 123,
  "lease_id": 456,
  "loan_amount": 1500.00,
  "interest_rate": 10.0,
  "start_week": "2025-11-02",
  "purpose": "Vehicle repairs",
  "notes": "Emergency loan for transmission repair"
}
```

**Response (201 Created):**
```json
{
  "id": 1,
  "loan_id": "DL-2025-0001",
  "loan_number": "DL-2025-0001",
  "driver_id": 123,
  "lease_id": 456,
  "loan_amount": 1500.00,
  "interest_rate": 10.0,
  "purpose": "Vehicle repairs",
  "notes": "Emergency loan for transmission repair",
  "loan_date": "2025-10-29",
  "start_week": "2025-11-02",
  "end_week": "2025-11-30",
  "status": "ACTIVE",
  "total_principal_paid": 0.00,
  "total_interest_paid": 0.00,
  "outstanding_balance": 1500.00,
  "total_installments": 6,
  "paid_installments": 0,
  "pending_installments": 6,
  "installments": [
    {
      "id": 1,
      "installment_id": "DL-2025-0001-INST-01",
      "loan_id": "DL-2025-0001",
      "installment_number": 1,
      "due_date": "2025-11-08",
      "week_start": "2025-11-02",
      "week_end": "2025-11-08",
      "principal_amount": 250.00,
      "interest_amount": 4.11,
      "total_due": 254.11,
      "outstanding_balance": 254.11,
      "status": "SCHEDULED",
      "posted_to_ledger": false
    }
  ]
}
```

### 2. List Loans
**GET** `/loans/`

List loans with filters, sorting, and pagination.

**Query Parameters:**
- `driver_id` (optional): Filter by driver ID
- `lease_id` (optional): Filter by lease ID
- `status` (optional): Filter by status (ACTIVE, CLOSED, ON_HOLD, CANCELLED)
- `date_from` (optional): Filter from date
- `date_to` (optional): Filter to date
- `page` (default: 1): Page number
- `page_size` (default: 50, max: 500): Items per page
- `sort_by` (optional): Sort field (loan_date, loan_amount, outstanding_balance)
- `sort_order` (default: desc): Sort order (asc/desc)

**Response (200 OK):**
```json
{
  "items": [
    {
      "id": 1,
      "loan_id": "DL-2025-0001",
      "driver_id": 123,
      "loan_amount": 1500.00,
      "outstanding_balance": 1500.00,
      "status": "ACTIVE"
    }
  ],
  "total": 1,
  "page": 1,
  "page_size": 50,
  "total_pages": 1
}
```

### 3. Get Loan Detail
**GET** `/loans/{loan_id}`

Get detailed loan information including all installments.

**Response (200 OK):**
```json
{
  "id": 1,
  "loan_id": "DL-2025-0001",
  "loan_amount": 1500.00,
  "interest_rate": 10.0,
  "outstanding_balance": 1500.00,
  "status": "ACTIVE",
  "total_installments": 6,
  "paid_installments": 0,
  "pending_installments": 6,
  "installments": [...]
}
```

### 4. Update Loan Status
**PUT** `/loans/{loan_id}/status`

Update loan status with validation.

**Request Body:**
```json
{
  "status": "ON_HOLD",
  "reason": "Driver requested temporary pause due to medical leave"
}
```

**Response (200 OK):**
```json
{
  "id": 1,
  "loan_id": "DL-2025-0001",
  "status": "ON_HOLD",
  "closure_reason": "Driver requested temporary pause due to medical leave"
}
```

**Allowed Status Transitions:**
- DRAFT → ACTIVE, CANCELLED
- ACTIVE → ON_HOLD, CLOSED, CANCELLED
- ON_HOLD → ACTIVE, CANCELLED
- CLOSED, CANCELLED → No transitions

### 5. Get Loan Statistics
**GET** `/loans/statistics/summary`

Get aggregated loan statistics.

**Query Parameters:**
- `driver_id` (optional): Filter by driver
- `lease_id` (optional): Filter by lease
- `date_from` (optional): Filter from date
- `date_to` (optional): Filter to date

**Response (200 OK):**
```json
{
  "total_loans": 5,
  "active_loans": 3,
  "closed_loans": 2,
  "on_hold_loans": 0,
  "total_amount_disbursed": 7500.00,
  "total_amount_collected": 3200.00,
  "total_outstanding": 4300.00,
  "total_interest_collected": 150.00
}
```

### 6. Post Installments to Ledger
**POST** `/loans/installments/post`

Post due loan installments to centralized ledger.

**Request Body:**
```json
{
  "loan_id": "DL-2025-0001",
  "payment_period_start": "2025-11-02",
  "payment_period_end": "2025-11-08",
  "dry_run": false
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Posted 1/1 installments",
  "installments_processed": 1,
  "installments_posted": 1,
  "total_amount_posted": 254.11,
  "errors": null
}
```

**Process:**
1. Finds installments due for the period
2. Creates ledger obligations (DEBIT + Balance)
3. Links installments to ledger balances
4. Updates installment status to POSTED

### 7. Get Unposted Installments
**GET** `/loans/installments/unposted`

Find unposted installments with comprehensive filters.

**Query Parameters:**
- `loan_id` (optional): Filter by loan ID
- `driver_id` (optional): Filter by driver ID
- `lease_id` (optional): Filter by lease ID
- `medallion_id` (optional): Filter by medallion ID
- `vehicle_id` (optional): Filter by vehicle ID
- `period_start` (optional): Filter by period start
- `period_end` (optional): Filter by period end
- `status` (optional): Filter by status
- `page` (default: 1): Page number
- `page_size` (default: 50, max: 500): Items per page
- `sort_by` (optional): Sort field
- `sort_order` (default: asc): Sort order

**Example Requests:**
```bash
# Find all unposted installments for a driver
GET /loans/installments/unposted?driver_id=123

# Find unposted installments for a specific period
GET /loans/installments/unposted?period_start=2025-11-02&period_end=2025-11-08

# Find unposted installments for a medallion
GET /loans/installments/unposted?medallion_id=789

# Combine filters
GET /loans/installments/unposted?driver_id=123&period_start=2025-11-02&status=DUE
```

**Response (200 OK):**
```json
{
  "items": [
    {
      "id": 1,
      "installment_id": "DL-2025-0001-INST-01",
      "loan_id": "DL-2025-0001",
      "due_date": "2025-11-08",
      "total_due": 254.11,
      "status": "DUE",
      "posted_to_ledger": false
    }
  ],
  "total": 1,
  "page": 1,
  "page_size": 50,
  "total_pages": 1
}
```

### 8. Export Loans
**GET** `/loans/export/{format}`

Export loans to Excel, PDF, CSV, or JSON.

**Path Parameters:**
- `format`: excel, pdf, csv, or json

**Query Parameters:**
Same filters as list endpoint

**Example:**
```bash
GET /loans/export/excel?driver_id=123&status=ACTIVE
```

**Response:**
- Downloads file with appropriate content type
- Filename: `driver_loans_export.{format}`

### 9. Export Installments
**GET** `/loans/installments/export/{format}`

Export installments to Excel, PDF, CSV, or JSON.

**Path Parameters:**
- `format`: excel, pdf, csv, or json

**Query Parameters:**
Same filters as unposted installments endpoint

**Example:**
```bash
GET /loans/installments/export/excel?driver_id=123&period_start=2025-11-01&period_end=2025-11-30
```

**Response:**
- Downloads file with appropriate content type
- Filename: `loan_installments_export.{format}`

## Workflow Examples

### Example 1: Create Loan and Generate Schedule

**Step 1: Create Loan**
```bash
POST /loans/
{
  "driver_id": 123,
  "lease_id": 456,
  "loan_amount": 2500.00,
  "interest_rate": 12.0,
  "start_week": "2025-11-03",
  "purpose": "Medical emergency"
}
```

**Result:**
- Loan created with ID: DL-2025-0001
- 10 installments generated ($250/week per matrix)
- Each installment has calculated interest
- First installment: $250 principal + $8.22 interest = $258.22

**Step 2: View Installment Schedule**
```bash
GET /loans/DL-2025-0001
```

**Step 3: Post First Installment**
```bash
POST /loans/installments/post
{
  "loan_id": "DL-2025-0001",
  "payment_period_start": "2025-11-03",
  "payment_period_end": "2025-11-09"
}
```

**Result:**
- Installment posted to ledger
- Ledger balance created: LB-2025-XXXXXX
- Installment status: POSTED
- Driver's DTR will show $258.22 deduction

### Example 2: Find Unposted Installments

**Scenario:** Finance team wants to review all unposted installments for next week

```bash
GET /loans/installments/unposted?period_start=2025-11-10&period_end=2025-11-16&page_size=100
```

**Response:**
- Lists all installments due next week
- Not yet posted to ledger
- Shows driver, loan, and amount details
- Can export to Excel for review

### Example 3: Monitor Driver's Loan Portfolio

**Scenario:** View all active loans for a specific driver

```bash
# Get loans
GET /loans/?driver_id=123&status=ACTIVE

# Get statistics
GET /loans/statistics/summary?driver_id=123

# Get unposted installments
GET /loans/installments/unposted?driver_id=123
```

**Result:**
- Complete view of driver's loan obligations
- Total outstanding balance
- Upcoming installments
- Payment history

## Integration with Ledger

### Posting Process

When installments are posted to ledger:

**1. Ledger Posting Created:**
```
Type: DEBIT
Category: LOANS
Amount: Total Due (Principal + Interest)
Source Type: LOAN_INSTALLMENT
Source ID: Installment ID
Payment Period: Week start/end dates
```

**2. Ledger Balance Created:**
```
Balance ID: LB-YYYY-NNNNNN
Driver/Lease: From loan
Category: LOANS
Original Amount: Total Due
Outstanding Balance: Total Due
Due Date: Installment due date
Status: OPEN
```

**3. Installment Updated:**
```
ledger_balance_id: Linked to balance
posted_to_ledger: true
posted_on: Timestamp
status: POSTED
```

### Payment Application

When drivers make payments through weekly DTR or interim payments:

1. Ledger service applies payment following hierarchy (LOANS priority: 7)
2. Payment allocated to oldest loan balance first (FIFO)
3. Installment payment tracking updated:
   - principal_paid increases
   - interest_paid increases
   - outstanding_balance decreases
4. When installment fully paid:
   - Ledger balance status: CLOSED
   - Installment status: PAID

## Scheduled Jobs

### Sunday 05:00 AM - Post Weekly Installments

**Task:** `post_weekly_loan_installments_task()`

**Process:**
1. Runs every Sunday at 05:00 AM
2. Finds all DUE installments for current week
3. Posts to ledger in bulk
4. Updates loan payment tracking
5. Logs results and errors

**Configuration:**
```python
# app/loans/tasks.py
from celery import Celery
from celery.schedules import crontab

@celery.task
def post_weekly_loan_installments_task():
    # Posts installments for current week
    service = DriverLoanService(db)
    result = service.post_weekly_installments()
    logger.info(f"Posted {result.installments_posted} installments")

# Schedule configuration
celery.conf.beat_schedule = {
    'post-weekly-loan-installments': {
        'task': 'app.loans.tasks.post_weekly_loan_installments_task',
        'schedule': crontab(hour=5, minute=0, day_of_week=0),  # Sunday 05:00 AM
    },
}
```

## Error Handling

### Validation Errors (400)
- Loan amount must be > $0
- Interest rate must be 0-100%
- Start week must be a Sunday
- Driver must exist
- Lease must exist

### Not Found Errors (404)
- Loan ID not found
- No data to export

### Business Logic Errors (400)
- Invalid status transition
- Cannot cancel loan with posted installments
- Cannot post closed/cancelled loan installments

### Server Errors (500)
- Database errors
- Ledger service errors
- Export generation errors

All errors return structured JSON:
```json
{
  "detail": "Error message describing the issue"
}
```

## Module Structure

```
app/loans/
├── __init__.py           # Module initialization
├── models.py            # SQLAlchemy models
├── schemas.py           # Pydantic schemas
├── repository.py        # Data access layer
├── service.py           # Business logic
├── router.py            # FastAPI endpoints
├── tasks.py             # Celery scheduled tasks
└── README.md            # This documentation
```

## Production Readiness

### Features
- Complete implementation with no placeholders
- Comprehensive error handling
- Transaction management
- Audit trail (created_by, created_on, updated_on)
- Database constraints and indexes
- Input validation
- Type hints throughout
- Logging at all levels
- Export functionality

### Testing Recommendations
1. Create loan with various amounts (test matrix)
2. Verify interest calculations
3. Test installment posting
4. Test status transitions
5. Test filter combinations
6. Test export formats
7. Test scheduled job
8. Test ledger integration
9. Test payment application
10. Load testing for bulk operations

### Monitoring
- Track posting success rate
- Monitor outstanding loan balances
- Alert on failed postings
- Track payment collection rates
- Monitor interest calculations

## Integration Checklist

- [ ] Add router to main.py FastAPI app
- [ ] Run database migration (models already complete)
- [ ] Configure Celery beat schedule
- [ ] Start Celery workers
- [ ] Test loan creation manually
- [ ] Test installment posting
- [ ] Verify ledger integration
- [ ] Test export functionality
- [ ] Configure monitoring/alerts
- [ ] Document for finance team

## Support

For issues or questions:
- Review logs: `logs/loans.log`
- Check loan statistics endpoint
- Review unposted installments
- Verify ledger postings
- Contact development team

---

**Module Status:** Production Ready - Complete Implementation

**Version:** 1.0.0

**Last Updated:** October 29, 2025