# CURB API Endpoints - Frontend Integration Guide

Complete stub requests and responses for all CURB endpoints.

---

## Base URL
```
Development: http://localhost:8000
Production: https://api.yourdomain.com
```

## Authentication
All endpoints require Bearer token authentication:
```
Authorization: Bearer {your_jwt_token}
```

---

# 1. Import Operations

## 1.1 POST /curb/import
**Import CURB trips for date range**

### Request
```json
POST /curb/import
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

{
  "date_from": "2025-10-27",
  "date_to": "2025-10-27",
  "driver_id": null,
  "cab_number": null,
  "perform_association": true,
  "post_to_ledger": true,
  "reconcile_with_curb": false
}
```

### Success Response (200 OK)
```json
{
  "success": true,
  "batch_id": "CURB-20251028-140530",
  "message": "Import completed with status: COMPLETED",
  "trips_fetched": 156,
  "trips_imported": 156,
  "trips_mapped": 142,
  "trips_posted": 142,
  "trips_failed": 0,
  "transactions_fetched": 98,
  "transactions_imported": 98,
  "reconciliation_attempted": false,
  "reconciliation_successful": false,
  "duration_seconds": 45,
  "errors": null
}
```

### Partial Success Response (200 OK)
```json
{
  "success": true,
  "batch_id": "CURB-20251028-140530",
  "message": "Import completed with status: PARTIAL",
  "trips_fetched": 156,
  "trips_imported": 150,
  "trips_mapped": 140,
  "trips_posted": 135,
  "trips_failed": 6,
  "transactions_fetched": 98,
  "transactions_imported": 95,
  "reconciliation_attempted": false,
  "reconciliation_successful": false,
  "duration_seconds": 48,
  "errors": [
    "Failed to import trip 12345: Invalid driver ID",
    "Failed to map trip 67890: No active lease found",
    "Failed to post trip 11223: Ledger validation error"
  ]
}
```

### Error Response (500 Internal Server Error)
```json
{
  "detail": "Import failed: Connection to CURB API timed out"
}
```

### Validation Error (400 Bad Request)
```json
{
  "detail": [
    {
      "loc": ["body", "date_to"],
      "msg": "date_to must be >= date_from",
      "type": "value_error"
    }
  ]
}
```

---

## 1.2 GET /curb/import/history
**Get recent import history**

### Request
```
GET /curb/import/history?limit=20
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Success Response (200 OK)
```json
[
  {
    "id": 45,
    "batch_id": "CURB-20251028-140530",
    "import_type": "DAILY",
    "date_from": "2025-10-27",
    "date_to": "2025-10-27",
    "status": "COMPLETED",
    "started_at": "2025-10-28T14:05:30Z",
    "completed_at": "2025-10-28T14:06:15Z",
    "duration_seconds": 45,
    "total_trips_fetched": 156,
    "total_trips_imported": 156,
    "total_trips_mapped": 142,
    "total_trips_posted": 142,
    "total_trips_failed": 0,
    "total_transactions_fetched": 98,
    "total_transactions_imported": 98,
    "reconciliation_attempted": false,
    "reconciliation_successful": false,
    "error_message": null,
    "triggered_by": "CELERY",
    "triggered_by_user_id": null
  },
  {
    "id": 44,
    "batch_id": "CURB-20251027-140530",
    "import_type": "DAILY",
    "date_from": "2025-10-26",
    "date_to": "2025-10-26",
    "status": "COMPLETED",
    "started_at": "2025-10-27T14:05:30Z",
    "completed_at": "2025-10-27T14:06:22Z",
    "duration_seconds": 52,
    "total_trips_fetched": 178,
    "total_trips_imported": 178,
    "total_trips_mapped": 165,
    "total_trips_posted": 165,
    "total_trips_failed": 0,
    "total_transactions_fetched": 112,
    "total_transactions_imported": 112,
    "reconciliation_attempted": false,
    "reconciliation_successful": false,
    "error_message": null,
    "triggered_by": "CELERY",
    "triggered_by_user_id": null
  },
  {
    "id": 43,
    "batch_id": "CURB-20251026-093215",
    "import_type": "MANUAL",
    "date_from": "2025-10-20",
    "date_to": "2025-10-25",
    "status": "PARTIAL",
    "started_at": "2025-10-26T09:32:15Z",
    "completed_at": "2025-10-26T09:37:48Z",
    "duration_seconds": 333,
    "total_trips_fetched": 892,
    "total_trips_imported": 880,
    "total_trips_mapped": 845,
    "total_trips_posted": 820,
    "total_trips_failed": 12,
    "total_transactions_fetched": 567,
    "total_transactions_imported": 560,
    "reconciliation_attempted": false,
    "reconciliation_successful": false,
    "error_message": "Some trips failed to import",
    "triggered_by": "API",
    "triggered_by_user_id": 23
  }
]
```

---

## 1.3 GET /curb/import/history/{batch_id}
**Get specific batch details**

### Request
```
GET /curb/import/history/CURB-20251028-140530
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Success Response (200 OK)
```json
{
  "id": 45,
  "batch_id": "CURB-20251028-140530",
  "import_type": "DAILY",
  "date_from": "2025-10-27",
  "date_to": "2025-10-27",
  "status": "COMPLETED",
  "started_at": "2025-10-28T14:05:30Z",
  "completed_at": "2025-10-28T14:06:15Z",
  "duration_seconds": 45,
  "total_trips_fetched": 156,
  "total_trips_imported": 156,
  "total_trips_mapped": 142,
  "total_trips_posted": 142,
  "total_trips_failed": 0,
  "total_transactions_fetched": 98,
  "total_transactions_imported": 98,
  "reconciliation_attempted": false,
  "reconciliation_successful": false,
  "error_message": null,
  "triggered_by": "CELERY",
  "triggered_by_user_id": null
}
```

### Error Response (404 Not Found)
```json
{
  "detail": "Import batch CURB-20251028-999999 not found"
}
```

---

# 2. Trip Query Endpoints

## 2.1 GET /curb/trips
**List trips with filters and pagination**

### Request
```
GET /curb/trips?date_from=2025-10-27&date_to=2025-10-27&driver_id=123&posted_to_ledger=true&page=1&page_size=10
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Query Parameters
- `date_from` (optional): Filter by start date (YYYY-MM-DD)
- `date_to` (optional): Filter by end date (YYYY-MM-DD)
- `driver_id` (optional): Filter by BAT driver ID
- `medallion_id` (optional): Filter by medallion ID
- `vehicle_id` (optional): Filter by vehicle ID
- `lease_id` (optional): Filter by lease ID
- `payment_type` (optional): CASH | CREDIT_CARD | PRIVATE_CARD
- `posted_to_ledger` (optional): true | false
- `mapping_method` (optional): AUTO_MATCH | MANUAL_ASSIGNMENT | UNKNOWN
- `page` (default: 1): Page number
- `page_size` (default: 50): Items per page (1-500)

### Success Response (200 OK)
```json
{
  "trips": [
    {
      "id": 12456,
      "record_id": "175340",
      "period": "202510",
      "cab_number": "2T94",
      "driver_id_curb": "5445123",
      "start_datetime": "2025-10-27T08:15:26Z",
      "end_datetime": "2025-10-27T08:38:47Z",
      "trip_amount": 24.50,
      "tips": 5.00,
      "total_amount": 32.75,
      "payment_type": "CREDIT_CARD",
      "ehail_fee": 0.00,
      "health_fee": 0.50,
      "congestion_fee": 2.50,
      "airport_fee": 0.00,
      "cbdt_fee": 0.00,
      "driver_id": 123,
      "medallion_id": 456,
      "vehicle_id": 789,
      "lease_id": 321,
      "mapping_method": "AUTO_MATCH",
      "mapping_confidence": 1.00,
      "posted_to_ledger": true,
      "reconciliation_status": "RECONCILED",
      "from_address": "123 Main St, New York, NY",
      "to_address": "456 Broadway, New York, NY",
      "gps_start_lat": 40.7580,
      "gps_start_lon": -73.9855,
      "gps_end_lat": 40.7489,
      "gps_end_lon": -73.9680
    },
    {
      "id": 12457,
      "record_id": "175341",
      "period": "202510",
      "cab_number": "2T94",
      "driver_id_curb": "5445123",
      "start_datetime": "2025-10-27T09:05:12Z",
      "end_datetime": "2025-10-27T09:22:33Z",
      "trip_amount": 18.00,
      "tips": 3.60,
      "total_amount": 22.60,
      "payment_type": "CREDIT_CARD",
      "ehail_fee": 0.00,
      "health_fee": 0.50,
      "congestion_fee": 0.00,
      "airport_fee": 1.50,
      "cbdt_fee": 0.00,
      "driver_id": 123,
      "medallion_id": 456,
      "vehicle_id": 789,
      "lease_id": 321,
      "mapping_method": "AUTO_MATCH",
      "mapping_confidence": 1.00,
      "posted_to_ledger": true,
      "reconciliation_status": "RECONCILED",
      "from_address": "JFK Airport, Queens, NY",
      "to_address": "Grand Central Terminal, New York, NY",
      "gps_start_lat": 40.6413,
      "gps_start_lon": -73.7781,
      "gps_end_lat": 40.7527,
      "gps_end_lon": -73.9772
    }
  ],
  "total": 142,
  "page": 1,
  "page_size": 10,
  "total_pages": 15
}
```

### Empty Response (200 OK)
```json
{
  "trips": [],
  "total": 0,
  "page": 1,
  "page_size": 10,
  "total_pages": 0
}
```

---

## 2.2 GET /curb/trips/{trip_id}
**Get detailed trip information**

### Request
```
GET /curb/trips/12456
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Success Response (200 OK)
```json
{
  "id": 12456,
  "record_id": "175340",
  "period": "202510",
  "cab_number": "2T94",
  "driver_id_curb": "5445123",
  "start_datetime": "2025-10-27T08:15:26Z",
  "end_datetime": "2025-10-27T08:38:47Z",
  "trip_amount": 24.50,
  "tips": 5.00,
  "extras": 0.00,
  "tolls": 0.00,
  "tax": 0.50,
  "imp_tax": 2.25,
  "total_amount": 32.75,
  "payment_type": "CREDIT_CARD",
  "cc_number": "2133",
  "auth_code": "001426",
  "auth_amount": 32.75,
  "ehail_fee": 0.00,
  "health_fee": 0.50,
  "congestion_fee": 2.50,
  "airport_fee": 0.00,
  "cbdt_fee": 0.00,
  "passenger_count": 2,
  "distance_service": 4.25,
  "reservation_number": "17934",
  "driver_id": 123,
  "medallion_id": 456,
  "vehicle_id": 789,
  "lease_id": 321,
  "mapping_method": "AUTO_MATCH",
  "mapping_confidence": 1.00,
  "mapping_notes": "Auto-matched driver 123, lease 321",
  "manually_assigned": false,
  "assigned_by": null,
  "assigned_on": null,
  "payment_period_start": "2025-10-27",
  "payment_period_end": "2025-11-02",
  "import_batch_id": "CURB-20251028-140530",
  "imported_on": "2025-10-28T14:06:12Z",
  "posted_to_ledger": true,
  "ledger_posting_ids": "[\"LP-2025-000123\",\"LP-2025-000124\",\"LP-2025-000125\"]",
  "posted_on": "2025-10-28T14:06:13Z",
  "reconciliation_status": "RECONCILED",
  "from_address": "123 Main St, New York, NY 10001",
  "to_address": "456 Broadway, New York, NY 10013",
  "gps_start_lat": 40.7580,
  "gps_start_lon": -73.9855,
  "gps_end_lat": 40.7489,
  "gps_end_lon": -73.9680,
  "created_at": "2025-10-28T14:06:12Z",
  "created_by": null,
  "modified_at": null,
  "modified_by": null
}
```

### Error Response (404 Not Found)
```json
{
  "detail": "Trip 99999 not found"
}
```

---

## 2.3 GET /curb/trips/statistics
**Get aggregated trip statistics**

### Request
```
GET /curb/trips/statistics?date_from=2025-10-27&date_to=2025-10-27&driver_id=123
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Success Response (200 OK)
```json
{
  "total_trips": 24,
  "total_credit_card_trips": 18,
  "total_cash_trips": 6,
  "total_earnings": 856.50,
  "total_taxes": 42.75,
  "avg_trip_amount": 35.69,
  "trips_posted_to_ledger": 24,
  "trips_not_posted": 0,
  "trips_mapped": 24,
  "trips_unmapped": 0,
  "date_from": "2025-10-27",
  "date_to": "2025-10-27"
}
```

---

## 2.4 GET /curb/trips/unmapped
**Get trips requiring manual review**

### Request
```
GET /curb/trips/unmapped?limit=100
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Success Response (200 OK)
```json
[
  {
    "id": 12489,
    "record_id": "175899",
    "period": "202510",
    "cab_number": "3X45",
    "driver_id_curb": "9988776",
    "start_datetime": "2025-10-27T14:22:15Z",
    "end_datetime": "2025-10-27T14:45:30Z",
    "trip_amount": 28.50,
    "tips": 4.50,
    "total_amount": 35.25,
    "payment_type": "CREDIT_CARD",
    "ehail_fee": 0.00,
    "health_fee": 0.50,
    "congestion_fee": 2.50,
    "airport_fee": 0.00,
    "cbdt_fee": 0.00,
    "driver_id": null,
    "medallion_id": 567,
    "vehicle_id": null,
    "lease_id": null,
    "mapping_method": "UNKNOWN",
    "mapping_confidence": 0.00,
    "posted_to_ledger": false,
    "reconciliation_status": "NOT_RECONCILED",
    "from_address": "Penn Station, New York, NY",
    "to_address": "Times Square, New York, NY",
    "gps_start_lat": 40.7505,
    "gps_start_lon": -73.9934,
    "gps_end_lat": 40.7580,
    "gps_end_lon": -73.9855
  }
]
```

---

## 2.5 GET /curb/trips/unposted
**Get trips ready for ledger posting**

### Request
```
GET /curb/trips/unposted?limit=100
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Success Response (200 OK)
```json
[
  {
    "id": 12490,
    "record_id": "175900",
    "period": "202510",
    "cab_number": "2T94",
    "driver_id_curb": "5445123",
    "start_datetime": "2025-10-27T15:10:00Z",
    "end_datetime": "2025-10-27T15:28:15Z",
    "trip_amount": 22.00,
    "tips": 4.00,
    "total_amount": 28.75,
    "payment_type": "CREDIT_CARD",
    "ehail_fee": 0.00,
    "health_fee": 0.50,
    "congestion_fee": 2.50,
    "airport_fee": 0.00,
    "cbdt_fee": 0.00,
    "driver_id": 123,
    "medallion_id": 456,
    "vehicle_id": 789,
    "lease_id": 321,
    "mapping_method": "AUTO_MATCH",
    "mapping_confidence": 1.00,
    "posted_to_ledger": false,
    "reconciliation_status": "NOT_RECONCILED",
    "from_address": "Central Park West, New York, NY",
    "to_address": "Wall Street, New York, NY",
    "gps_start_lat": 40.7829,
    "gps_start_lon": -73.9654,
    "gps_end_lat": 40.7074,
    "gps_end_lon": -74.0113
  }
]
```

---

# 3. Manual Operations

## 3.1 POST /curb/trips/{trip_id}/remap
**Manually remap trip to different driver/lease**

### Request
```json
POST /curb/trips/12489/remap
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

{
  "driver_id": 145,
  "lease_id": 389,
  "reason": "Driver switched vehicles at 2 PM due to maintenance issue"
}
```

### Success Response (200 OK)
```json
{
  "id": 12489,
  "record_id": "175899",
  "period": "202510",
  "cab_number": "3X45",
  "driver_id_curb": "9988776",
  "start_datetime": "2025-10-27T14:22:15Z",
  "end_datetime": "2025-10-27T14:45:30Z",
  "trip_amount": 28.50,
  "tips": 4.50,
  "extras": 0.00,
  "tolls": 0.00,
  "tax": 0.50,
  "imp_tax": 2.25,
  "total_amount": 35.25,
  "payment_type": "CREDIT_CARD",
  "cc_number": "8899",
  "auth_code": "002341",
  "auth_amount": 35.25,
  "ehail_fee": 0.00,
  "health_fee": 0.50,
  "congestion_fee": 2.50,
  "airport_fee": 0.00,
  "cbdt_fee": 0.00,
  "passenger_count": 1,
  "distance_service": 3.85,
  "reservation_number": null,
  "driver_id": 145,
  "medallion_id": 567,
  "vehicle_id": 891,
  "lease_id": 389,
  "mapping_method": "MANUAL_ASSIGNMENT",
  "mapping_confidence": 1.00,
  "mapping_notes": "Manually assigned by user 23: Driver switched vehicles at 2 PM due to maintenance issue",
  "manually_assigned": true,
  "assigned_by": 23,
  "assigned_on": "2025-10-28T15:30:45Z",
  "payment_period_start": "2025-10-27",
  "payment_period_end": "2025-11-02",
  "import_batch_id": "CURB-20251028-140530",
  "imported_on": "2025-10-28T14:06:12Z",
  "posted_to_ledger": true,
  "ledger_posting_ids": "[\"LP-2025-000156\",\"LP-2025-000157\",\"LP-2025-000158\"]",
  "posted_on": "2025-10-28T15:30:46Z",
  "reconciliation_status": "NOT_RECONCILED",
  "from_address": "Penn Station, New York, NY",
  "to_address": "Times Square, New York, NY",
  "gps_start_lat": 40.7505,
  "gps_start_lon": -73.9934,
  "gps_end_lat": 40.7580,
  "gps_end_lon": -73.9855,
  "created_at": "2025-10-28T14:06:12Z",
  "created_by": null,
  "modified_at": "2025-10-28T15:30:45Z",
  "modified_by": 23
}
```

### Validation Error (400 Bad Request)
```json
{
  "detail": "Driver 999 not found"
}
```

### Error Response (404 Not Found)
```json
{
  "detail": "Trip 99999 not found"
}
```

---

# Quick Reference Table

| Endpoint | Method | Purpose | Auth Required |
|----------|--------|---------|---------------|
| `/curb/import` | POST | Import trips for date range | Yes |
| `/curb/import/history` | GET | List import batches | Yes |
| `/curb/import/history/{batch_id}` | GET | Get batch details | Yes |
| `/curb/trips` | GET | List trips with filters | Yes |
| `/curb/trips/{trip_id}` | GET | Get trip details | Yes |
| `/curb/trips/statistics` | GET | Get statistics | Yes |
| `/curb/trips/unmapped` | GET | Get unmapped trips | Yes |
| `/curb/trips/unposted` | GET | Get unposted trips | Yes |
| `/curb/trips/{trip_id}/remap` | POST | Manually remap trip | Yes |

---

# Common Response Codes

| Code | Meaning | When Used |
|------|---------|-----------|
| 200 | Success | Request successful |
| 400 | Bad Request | Validation error, invalid parameters |
| 401 | Unauthorized | Missing or invalid authentication token |
| 403 | Forbidden | User doesn't have permission |
| 404 | Not Found | Resource doesn't exist |
| 500 | Internal Server Error | Server error, check logs |

---

# Testing Tips for Frontend

## 1. Mock Service Setup
```javascript
// Example using MSW (Mock Service Worker)
import { rest } from 'msw';

const handlers = [
  rest.get('/curb/trips', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        trips: [...],
        total: 142,
        page: 1,
        page_size: 10,
        total_pages: 15
      })
    );
  }),
  
  rest.post('/curb/import', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        batch_id: "CURB-20251028-140530",
        message: "Import completed with status: COMPLETED",
        trips_fetched: 156,
        trips_imported: 156,
        trips_mapped: 142,
        trips_posted: 142,
        trips_failed: 0
      })
    );
  })
];
```

## 2. Axios Example
```javascript
import axios from 'axios';

// Import trips
const importTrips = async (dateFrom, dateTo) => {
  try {
    const response = await axios.post('/curb/import', {
      date_from: dateFrom,
      date_to: dateTo,
      perform_association: true,
      post_to_ledger: true,
      reconcile_with_curb: false
    }, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Import failed:', error.response.data);
    throw error;
  }
};

// Get trips
const getTrips = async (filters) => {
  try {
    const response = await axios.get('/curb/trips', {
      params: filters,
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Failed to fetch trips:', error);
    throw error;
  }
};
```

## 3. React Hook Example
```javascript
import { useState, useEffect } from 'react';

const useCurbTrips = (filters) => {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTrips = async () => {
      try {
        setLoading(true);
        const response = await fetch('/curb/trips?' + new URLSearchParams(filters), {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const data = await response.json();
        setTrips(data.trips);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTrips();
  }, [filters]);

  return { trips, loading, error };
};
```

---

# TypeScript Interfaces

```typescript
// Request Types
interface ImportCurbTripsRequest {
  date_from: string; // YYYY-MM-DD
  date_to: string; // YYYY-MM-DD
  driver_id?: string | null;
  cab_number?: string | null;
  perform_association: boolean;
  post_to_ledger: boolean;
  reconcile_with_curb: boolean;
}

interface RemapTripRequest {
  driver_id: number;
  lease_id: number;
  reason: string;
}

interface TripFilters {
  date_from?: string;
  date_to?: string;
  driver_id?: number;
  medallion_id?: number;
  vehicle_id?: number;
  lease_id?: number;
  payment_type?: 'CASH' | 'CREDIT_CARD' | 'PRIVATE_CARD';
  posted_to_ledger?: boolean;
  mapping_method?: 'AUTO_MATCH' | 'MANUAL_ASSIGNMENT' | 'UNKNOWN';
  page?: number;
  page_size?: number;
}

// Response Types
interface ImportCurbTripsResponse {
  success: boolean;
  batch_id: string;
  message: string;
  trips_fetched: number;
  trips_imported: number;
  trips_mapped: number;
  trips_posted: number;
  trips_failed: number;
  transactions_fetched: number;
  transactions_imported: number;
  reconciliation_attempted: boolean;
  reconciliation_successful: boolean;
  duration_seconds: number | null;
  errors: string[] | null;
}

interface CurbTrip {
  id: number;
  record_id: string;
  period: string;
  cab_number: string;
  driver_id_curb: string;
  start_datetime: string;
  end_datetime: string;
  trip_amount: number;
  tips: number;
  total_amount: number;
  payment_type: 'CASH' | 'CREDIT_CARD' | 'PRIVATE_CARD';
  ehail_fee: number;
  health_fee: number;
  congestion_fee: number;
  airport_fee: number;
  cbdt_fee: number;
  driver_id: number | null;
  medallion_id: number | null;
  vehicle_id: number | null;
  lease_id: number | null;
  mapping_method: 'AUTO_MATCH' | 'MANUAL_ASSIGNMENT' | 'UNKNOWN';
  mapping_confidence: number;
  posted_to_ledger: boolean;
  reconciliation_status: 'NOT_RECONCILED' | 'RECONCILED' | 'FAILED';
  from_address: string | null;
  to_address: string | null;
  gps_start_lat: number | null;
  gps_start_lon: number | null;
  gps_end_lat: number | null;
  gps_end_lon: number | null;
}

interface PaginatedTripsResponse {
  trips: CurbTrip[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

interface TripStatistics {
  total_trips: number;
  total_credit_card_trips: number;
  total_cash_trips: number;
  total_earnings: number;
  total_taxes: number;
  avg_trip_amount: number;
  trips_posted_to_ledger: number;
  trips_not_posted: number;
  trips_mapped: number;
  trips_unmapped: number;
  date_from: string | null;
  date_to: string | null;
}

interface CurbImportHistory {
  id: number;
  batch_id: string;
  import_type: string;
  date_from: string;
  date_to: string;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'PARTIAL';
  started_at: string;
  completed_at: string | null;
  duration_seconds: number | null;
  total_trips_fetched: number;
  total_trips_imported: number;
  total_trips_mapped: number;
  total_trips_posted: number;
  total_trips_failed: number;
  total_transactions_fetched: number;
  total_transactions_imported: number;
  reconciliation_attempted: boolean;
  reconciliation_successful: boolean;
  error_message: string | null;
  triggered_by: string;
  triggered_by_user_id: number | null;
}
```

---

# Notes for Frontend Team

1. **Pagination**: All list endpoints support pagination via `page` and `page_size` parameters
2. **Date Format**: All dates use ISO 8601 format (`YYYY-MM-DD` or `YYYY-MM-DDTHH:MM:SSZ`)
3. **Decimal Values**: All monetary amounts are returned as numbers with 2 decimal places
4. **Null Values**: Optional fields may be `null` - handle gracefully in UI
5. **Loading States**: Import operations can take 30-60 seconds - show progress indicators
6. **Error Handling**: Always check `success` field and handle `errors` array
7. **Real-time Updates**: Consider polling `/curb/import/history/{batch_id}` during imports
8. **Filters**: Multiple filters can be combined for precise queries
9. **Authentication**: All endpoints require valid JWT token in Authorization header
10. **Rate Limiting**: API may have rate limits - implement retry logic with exponential backoff