# Driver Loans API Reference

Complete API endpoint documentation with request/response examples.

## Base URL
```
/api/v1/loans
```

## Authentication
All endpoints require Bearer token authentication:
```
Authorization: Bearer {token}
```

---

## Endpoints Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/` | Create new loan |
| GET | `/` | List loans with filters |
| GET | `/{loan_id}` | Get loan details |
| PUT | `/{loan_id}/status` | Update loan status |
| GET | `/statistics/summary` | Get loan statistics |
| POST | `/installments/post` | Post installments to ledger |
| GET | `/installments/unposted` | Find unposted installments |
| GET | `/export/{format}` | Export loans |
| GET | `/installments/export/{format}` | Export installments |

---

## 1. Create Loan

### Endpoint
```
POST /loans/
```

### Description
Creates a new driver loan with automatic installment schedule generation based on loan repayment matrix.

### Request Body
```json
{
  "driver_id": 123,
  "lease_id": 456,
  "loan_amount": 1500.00,
  "interest_rate": 10.0,
  "start_week": "2025-11-03",
  "purpose": "Vehicle repairs",
  "notes": "Emergency loan for transmission repair"
}
```

### Field Validation
- `driver_id`: Required, must exist
- `lease_id`: Required, must exist
- `loan_amount`: Required, > 0
- `interest_rate`: Optional, default 0.00, range 0-100
- `start_week`: Required, must be a Sunday
- `purpose`: Optional, max 255 chars
- `notes`: Optional, text

### Success Response (201 Created)
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
  "start_week": "2025-11-03",
  "end_week": "2025-12-15",
  "status": "ACTIVE",
  "total_principal_paid": 0.00,
  "total_interest_paid": 0.00,
  "outstanding_balance": 1500.00,
  "approved_by": null,
  "approved_on": null,
  "closed_on": null,
  "closure_reason": null,
  "created_on": "2025-10-29T10:30:00Z",
  "updated_on": "2025-10-29T10:30:00Z",
  "created_by": 1,
  "total_installments": 6,
  "paid_installments": 0,
  "pending_installments": 6,
  "installments": [
    {
      "id": 1,
      "installment_id": "DL-2025-0001-INST-01",
      "loan_id": "DL-2025-0001",
      "installment_number": 1,
      "due_date": "2025-11-09",
      "week_start": "2025-11-03",
      "week_end": "2025-11-09",
      "principal_amount": 250.00,
      "interest_amount": 5.75,
      "total_due": 255.75,
      "principal_paid": 0.00,
      "interest_paid": 0.00,
      "outstanding_balance": 255.75,
      "status": "SCHEDULED",
      "ledger_balance_id": null,
      "posted_to_ledger": false,
      "posted_on": null,
      "posted_by": null,
      "created_on": "2025-10-29T10:30:00Z",
      "updated_on": "2025-10-29T10:30:00Z"
    }
  ]
}
```

### Error Responses

**400 Bad Request - Invalid Amount**
```json
{
  "detail": "Loan amount must be greater than 0"
}
```

**400 Bad Request - Invalid Start Week**
```json
{
  "detail": "Start week must be a Sunday"
}
```

**400 Bad Request - Driver Not Found**
```json
{
  "detail": "Driver with ID 123 not found"
}
```

---

## 2. List Loans

### Endpoint
```
GET /loans/
```

### Description
Retrieve a paginated list of loans with optional filters and sorting.

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| driver_id | integer | No | - | Filter by driver ID |
| lease_id | integer | No | - | Filter by lease ID |
| status | string | No | - | Filter by status (ACTIVE, CLOSED, ON_HOLD, CANCELLED) |
| date_from | date | No | - | Filter loans from this date (YYYY-MM-DD) |
| date_to | date | No | - | Filter loans until this date (YYYY-MM-DD) |
| page | integer | No | 1 | Page number (min: 1) |
| page_size | integer | No | 50 | Items per page (min: 1, max: 500) |
| sort_by | string | No | created_on | Sort field (loan_date, loan_amount, outstanding_balance) |
| sort_order | string | No | desc | Sort order (asc, desc) |

### Example Requests

**Get all active loans:**
```
GET /loans/?status=ACTIVE
```

**Get loans for specific driver:**
```
GET /loans/?driver_id=123&page=1&page_size=20
```

**Get loans created in date range:**
```
GET /loans/?date_from=2025-01-01&date_to=2025-12-31
```

**Get loans sorted by outstanding balance:**
```
GET /loans/?sort_by=outstanding_balance&sort_order=desc
```

### Success Response (200 OK)
```json
{
  "items": [
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
      "start_week": "2025-11-03",
      "end_week": "2025-12-15",
      "status": "ACTIVE",
      "total_principal_paid": 250.00,
      "total_interest_paid": 5.75,
      "outstanding_balance": 1250.00,
      "created_on": "2025-10-29T10:30:00Z",
      "updated_on": "2025-11-15T08:00:00Z",
      "created_by": 1
    }
  ],
  "total": 1,
  "page": 1,
  "page_size": 50,
  "total_pages": 1
}
```

---

## 3. Get Loan Detail

### Endpoint
```
GET /loans/{loan_id}
```

### Description
Retrieve complete loan information including all installments.

### Path Parameters
- `loan_id`: Loan identifier (e.g., DL-2025-0001)

### Example Request
```
GET /loans/DL-2025-0001
```

### Success Response (200 OK)
Same structure as create response, includes all installments.

### Error Response

**404 Not Found**
```json
{
  "detail": "Loan DL-2025-0999 not found"
}
```

---

## 4. Update Loan Status

### Endpoint
```
PUT /loans/{loan_id}/status
```

### Description
Update the status of a loan with validation of allowed transitions.

### Path Parameters
- `loan_id`: Loan identifier

### Request Body
```json
{
  "status": "ON_HOLD",
  "reason": "Driver requested temporary pause due to medical leave"
}
```

### Status Transitions

| From | To | Condition |
|------|----|-----------| 
| DRAFT | ACTIVE, CANCELLED | Any time |
| ACTIVE | ON_HOLD, CLOSED, CANCELLED | CLOSED only when fully paid |
| ON_HOLD | ACTIVE, CANCELLED | Any time |
| CLOSED | - | Terminal state |
| CANCELLED | - | Terminal state |

### Example Requests

**Put loan on hold:**
```json
{
  "status": "ON_HOLD",
  "reason": "Driver on medical leave"
}
```

**Cancel loan (before postings):**
```json
{
  "status": "CANCELLED",
  "reason": "Loan approved in error"
}
```

**Resume loan:**
```json
{
  "status": "ACTIVE",
  "reason": "Driver returned from leave"
}
```

### Success Response (200 OK)
```json
{
  "id": 1,
  "loan_id": "DL-2025-0001",
  "status": "ON_HOLD",
  "closure_reason": "Driver requested temporary pause due to medical leave",
  "loan_amount": 1500.00,
  "outstanding_balance": 1250.00
}
```

### Error Responses

**400 Bad Request - Invalid Transition**
```json
{
  "detail": "Cannot transition from CLOSED to ACTIVE"
}
```

**400 Bad Request - Has Postings**
```json
{
  "detail": "Cannot cancel loan with posted installments. Use ON_HOLD status instead."
}
```

---

## 5. Get Loan Statistics

### Endpoint
```
GET /loans/statistics/summary
```

### Description
Get aggregated loan statistics with optional filters.

### Query Parameters
- `driver_id` (optional): Filter by driver
- `lease_id` (optional): Filter by lease
- `date_from` (optional): Filter from date
- `date_to` (optional): Filter to date

### Example Requests

**All loans:**
```
GET /loans/statistics/summary
```

**Specific driver:**
```
GET /loans/statistics/summary?driver_id=123
```

**Date range:**
```
GET /loans/statistics/summary?date_from=2025-01-01&date_to=2025-12-31
```

### Success Response (200 OK)
```json
{
  "total_loans": 25,
  "active_loans": 15,
  "closed_loans": 8,
  "on_hold_loans": 2,
  "total_amount_disbursed": 45000.00,
  "total_amount_collected": 28000.00,
  "total_outstanding": 17000.00,
  "total_interest_collected": 1250.00
}
```

---

## 6. Post Installments to Ledger

### Endpoint
```
POST /loans/installments/post
```

### Description
Post due loan installments to the centralized ledger. Creates DEBIT postings and balance records.

### Request Body
```json
{
  "loan_id": "DL-2025-0001",
  "payment_period_start": "2025-11-03",
  "payment_period_end": "2025-11-09",
  "dry_run": false
}
```

### Field Descriptions
- `loan_id`: Optional, post installments for specific loan only
- `payment_period_start`: Optional, defaults to current week Sunday
- `payment_period_end`: Optional, defaults to current week Saturday
- `dry_run`: Optional, simulate posting without committing (default: false)

### Example Requests

**Post current week (automatic):**
```json
{
  "dry_run": false
}
```

**Post specific loan for specific period:**
```json
{
  "loan_id": "DL-2025-0001",
  "payment_period_start": "2025-11-03",
  "payment_period_end": "2025-11-09",
  "dry_run": false
}
```

**Dry run (test without committing):**
```json
{
  "payment_period_start": "2025-11-03",
  "payment_period_end": "2025-11-09",
  "dry_run": true
}
```

### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Posted 3/3 installments",
  "installments_processed": 3,
  "installments_posted": 3,
  "total_amount_posted": 765.45,
  "errors": null
}
```

### Partial Success Response
```json
{
  "success": false,
  "message": "Posted 2/3 installments",
  "installments_processed": 3,
  "installments_posted": 2,
  "total_amount_posted": 510.30,
  "errors": [
    "Failed to post installment DL-2025-0003-INST-02: Driver not found"
  ]
}
```

### No Installments Response
```json
{
  "success": true,
  "message": "No installments to post for the specified period",
  "installments_processed": 0,
  "installments_posted": 0,
  "total_amount_posted": 0.00,
  "errors": null
}
```

---

## 7. Get Unposted Installments

### Endpoint
```
GET /loans/installments/unposted
```

### Description
Find unposted loan installments with comprehensive filtering capabilities. Supports filtering by loan, driver, lease, medallion, vehicle, period, or any combination.

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| loan_id | string | No | - | Filter by loan ID |
| driver_id | integer | No | - | Filter by driver ID |
| lease_id | integer | No | - | Filter by lease ID |
| medallion_id | integer | No | - | Filter by medallion ID |
| vehicle_id | integer | No | - | Filter by vehicle ID |
| period_start | date | No | - | Filter by period start date |
| period_end | date | No | - | Filter by period end date |
| status | string | No | - | Filter by status (SCHEDULED, DUE, POSTED, PAID, SKIPPED) |
| page | integer | No | 1 | Page number |
| page_size | integer | No | 50 | Items per page (max: 500) |
| sort_by | string | No | due_date | Sort field |
| sort_order | string | No | asc | Sort order (asc, desc) |

### Example Requests

**All unposted installments for a driver:**
```
GET /loans/installments/unposted?driver_id=123
```

**Installments for specific period:**
```
GET /loans/installments/unposted?period_start=2025-11-03&period_end=2025-11-09
```

**Installments for a medallion:**
```
GET /loans/installments/unposted?medallion_id=789
```

**Combine multiple filters:**
```
GET /loans/installments/unposted?driver_id=123&period_start=2025-11-01&status=DUE
```

**All due installments across system:**
```
GET /loans/installments/unposted?status=DUE&page_size=100
```

### Success Response (200 OK)
```json
{
  "items": [
    {
      "id": 1,
      "installment_id": "DL-2025-0001-INST-01",
      "loan_id": "DL-2025-0001",
      "installment_number": 1,
      "due_date": "2025-11-09",
      "week_start": "2025-11-03",
      "week_end": "2025-11-09",
      "principal_amount": 250.00,
      "interest_amount": 5.75,
      "total_due": 255.75,
      "principal_paid": 0.00,
      "interest_paid": 0.00,
      "outstanding_balance": 255.75,
      "status": "DUE",
      "ledger_balance_id": null,
      "posted_to_ledger": false,
      "posted_on": null,
      "posted_by": null,
      "created_on": "2025-10-29T10:30:00Z",
      "updated_on": "2025-11-03T05:00:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "page_size": 50,
  "total_pages": 1
}
```

---

## 8. Export Loans

### Endpoint
```
GET /loans/export/{format}
```

### Description
Export loans to various formats (Excel, PDF, CSV, JSON).

### Path Parameters
- `format`: File format (excel, pdf, csv, json)

### Query Parameters
Same filters as list loans endpoint:
- driver_id
- lease_id
- status
- date_from
- date_to
- sort_by
- sort_order

### Example Requests

**Export all active loans to Excel:**
```
GET /loans/export/excel?status=ACTIVE
```

**Export driver's loans to PDF:**
```
GET /loans/export/pdf?driver_id=123
```

**Export loans in date range to CSV:**
```
GET /loans/export/csv?date_from=2025-01-01&date_to=2025-12-31
```

**Export to JSON:**
```
GET /loans/export/json
```

### Response
- Content-Type: Based on format
- Content-Disposition: `attachment; filename=driver_loans_export.{ext}`
- File download initiated

### File Contents

**Excel/CSV/JSON Columns:**
- Loan ID
- Driver ID
- Lease ID
- Loan Amount
- Interest Rate (%)
- Status
- Loan Date
- Start Week
- End Week
- Total Principal Paid
- Total Interest Paid
- Outstanding Balance
- Purpose
- Created On

**PDF Format:**
Formatted table with all columns, professional layout.

### Error Response

**404 Not Found**
```json
{
  "detail": "No loans found for export"
}
```

**400 Bad Request**
```json
{
  "detail": "Invalid format. Supported: excel, pdf, csv, json"
}
```

---

## 9. Export Installments

### Endpoint
```
GET /loans/installments/export/{format}
```

### Description
Export loan installments to various formats.

### Path Parameters
- `format`: File format (excel, pdf, csv, json)

### Query Parameters
Same filters as unposted installments endpoint:
- loan_id
- driver_id
- lease_id
- medallion_id
- vehicle_id
- period_start
- period_end
- status
- sort_by
- sort_order

### Example Requests

**Export unposted installments:**
```
GET /loans/installments/export/excel?posted_to_ledger=false
```

**Export installments for driver:**
```
GET /loans/installments/export/pdf?driver_id=123
```

**Export installments for period:**
```
GET /loans/installments/export/csv?period_start=2025-11-01&period_end=2025-11-30
```

### File Contents

**Excel/CSV/JSON Columns:**
- Installment ID
- Loan ID
- Installment Number
- Due Date
- Week Start
- Week End
- Principal Amount
- Interest Amount
- Total Due
- Principal Paid
- Interest Paid
- Outstanding Balance
- Status
- Posted to Ledger
- Ledger Balance ID
- Posted On

---

## Common Error Responses

### 400 Bad Request
Invalid input data or business rule violation.
```json
{
  "detail": "Error message describing the validation failure"
}
```

### 401 Unauthorized
Missing or invalid authentication token.
```json
{
  "detail": "Not authenticated"
}
```

### 403 Forbidden
Insufficient permissions.
```json
{
  "detail": "Not enough permissions"
}
```

### 404 Not Found
Resource not found.
```json
{
  "detail": "Loan DL-2025-0999 not found"
}
```

### 500 Internal Server Error
Server-side error.
```json
{
  "detail": "Internal server error message"
}
```

---

## Rate Limits

Standard API rate limits apply:
- 1000 requests per hour per user
- 100 requests per minute per user

Exceed limits receive:
```json
{
  "detail": "Rate limit exceeded"
}
```

---

## Best Practices

### Pagination
- Use reasonable page_size (50-100 for UI, 500 max for exports)
- Don't request all data at once
- Use export endpoints for bulk data

### Filtering
- Combine filters for precise queries
- Use date ranges to limit result sets
- Filter by status for operational queries

### Error Handling
- Always check response status code
- Handle validation errors gracefully
- Retry failed requests with exponential backoff
- Log errors for debugging

### Performance
- Use specific filters to reduce query time
- Sort by indexed fields (due_date, loan_date, status)
- Cache frequently accessed data
- Use batch operations when possible

---

## Postman Collection

Import this collection to test all endpoints:

```json
{
  "info": {
    "name": "Driver Loans API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Create Loan",
      "request": {
        "method": "POST",
        "url": "{{baseUrl}}/loans/",
        "body": {
          "mode": "raw",
          "raw": "{\n  \"driver_id\": 123,\n  \"lease_id\": 456,\n  \"loan_amount\": 1500.00,\n  \"interest_rate\": 10.0,\n  \"start_week\": \"2025-11-03\",\n  \"purpose\": \"Vehicle repairs\"\n}"
        }
      }
    }
  ]
}
```

---

**Last Updated:** October 29, 2025