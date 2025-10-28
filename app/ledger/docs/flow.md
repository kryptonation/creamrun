# 📊 **PAYMENT ALLOCATION EXAMPLE & DATABASE SCHEMA DOCUMENTATION**

---

## **SECTION 1: PAYMENT ALLOCATION EXAMPLE WITH CALCULATIONS**

### **📋 Sheet 1: SCENARIO SETUP**

**Driver Information:**
```
Driver: John Doe
Driver ID: 1001
TLC License: 5123456
Lease ID: LSE-2025-001
Medallion: 2Y47
Week Ending: October 26, 2025 (Saturday)
Payment Period: Oct 20 (Sun) - Oct 26 (Sat)
```

---

### **📋 Sheet 2: INITIAL OBLIGATIONS (Before Payment)**

| Category | Reference Type | Reference ID | Due Date | Original Amount | Prior Balance | Current Charge | Total Outstanding | Status |
|----------|---------------|--------------|----------|-----------------|---------------|----------------|-------------------|--------|
| TAXES | MTA_SURCHARGE | CURB-TRIPS | 10/26/2025 | $45.50 | $0.00 | $45.50 | $45.50 | OPEN |
| TAXES | TIF | CURB-TRIPS | 10/26/2025 | $27.00 | $0.00 | $27.00 | $27.00 | OPEN |
| TAXES | CONGESTION | CURB-TRIPS | 10/26/2025 | $65.00 | $0.00 | $65.00 | $65.00 | OPEN |
| TAXES | CBDT | CURB-TRIPS | 10/26/2025 | $18.75 | $0.00 | $18.75 | $18.75 | OPEN |
| TAXES | AIRPORT | CURB-TRIPS | 10/26/2025 | $35.00 | $0.00 | $35.00 | $35.00 | OPEN |
| EZPASS | TOLL | TKT-789012 | 10/19/2025 | $8.11 | $8.11 | $0.00 | $8.11 | OPEN |
| EZPASS | TOLL | TKT-789013 | 10/20/2025 | $15.00 | $0.00 | $15.00 | $15.00 | OPEN |
| EZPASS | TOLL | TKT-789014 | 10/23/2025 | $8.11 | $0.00 | $8.11 | $8.11 | OPEN |
| LEASE | LEASE_FEE | WEEK-42-2025 | 10/26/2025 | $500.00 | $0.00 | $500.00 | $500.00 | OPEN |
| PVB | VIOLATION | PVB-1234567 | 10/15/2025 | $65.00 | $65.00 | $0.00 | $65.00 | OPEN |
| PVB | VIOLATION | PVB-1234568 | 10/21/2025 | $115.00 | $0.00 | $115.00 | $115.00 | OPEN |
| TLC | INSPECTION | TLC-INS-2025 | 10/10/2025 | $75.00 | $75.00 | $0.00 | $75.00 | OPEN |
| REPAIRS | REPAIR_INST_1 | VR-2025-045-INST-01 | 10/19/2025 | $200.00 | $50.00 | $0.00 | $50.00 | OPEN |
| REPAIRS | REPAIR_INST_2 | VR-2025-045-INST-02 | 10/26/2025 | $200.00 | $0.00 | $200.00 | $200.00 | OPEN |
| LOANS | LOAN_INST_1 | DL-2025-012-INST-03 | 10/19/2025 | $252.30 | $52.30 | $0.00 | $52.30 | OPEN |
| LOANS | LOAN_INST_2 | DL-2025-012-INST-04 | 10/26/2025 | $252.30 | $0.00 | $252.30 | $252.30 | OPEN |
| MISC | CAR_WASH | MC-2025-089 | 10/22/2025 | $25.00 | $0.00 | $25.00 | $25.00 | OPEN |

**TOTAL OUTSTANDING: $1,630.18**

---

### **📋 Sheet 3: EARNINGS FOR THE WEEK**

| Date | Trip ID | Payment Type | Gross Fare | Tip | Total | CC Earnings |
|------|---------|--------------|------------|-----|-------|-------------|
| 10/20 | TRP-100001 | CREDIT_CARD | $45.00 | $9.00 | $54.00 | $54.00 |
| 10/20 | TRP-100002 | CASH | $25.00 | $0.00 | $25.00 | $0.00 |
| 10/21 | TRP-100003 | CREDIT_CARD | $62.00 | $12.00 | $74.00 | $74.00 |
| 10/22 | TRP-100004 | CREDIT_CARD | $38.00 | $8.00 | $46.00 | $46.00 |
| 10/22 | TRP-100005 | CASH | $30.00 | $0.00 | $30.00 | $0.00 |
| 10/23 | TRP-100006 | CREDIT_CARD | $55.00 | $11.00 | $66.00 | $66.00 |
| 10/24 | TRP-100007 | CREDIT_CARD | $72.00 | $14.00 | $86.00 | $86.00 |
| 10/25 | TRP-100008 | CREDIT_CARD | $48.00 | $10.00 | $58.00 | $58.00 |
| 10/25 | TRP-100009 | CASH | $35.00 | $0.00 | $35.00 | $0.00 |
| 10/26 | TRP-100010 | CREDIT_CARD | $68.00 | $13.00 | $81.00 | $81.00 |

**SUMMARY:**
- Total Gross Fares: $478.00
- Total Tips: $77.00
- Total Earnings: $555.00
- **Credit Card Earnings (Available for Allocation): $465.00**
- Cash Earnings (Kept by Driver): $90.00

---

### **📋 Sheet 4: PAYMENT ALLOCATION PROCESS (Step-by-Step)**

**PAYMENT HIERARCHY ORDER:**
1. Taxes → 2. EZPass → 3. Lease → 4. PVB → 5. TLC → 6. Repairs → 7. Loans → 8. Misc

**Available to Allocate: $465.00**

---

#### **STEP 1: TAXES (Category Priority = 1)**

| Sub-Category | Balance ID | Outstanding | Payment Applied | Remaining Balance | Running Total Used |
|--------------|-----------|-------------|-----------------|-------------------|-------------------|
| MTA_SURCHARGE | LB-2025-00123 | $45.50 | $45.50 | $0.00 | $45.50 |
| TIF | LB-2025-00124 | $27.00 | $27.00 | $0.00 | $72.50 |
| CONGESTION | LB-2025-00125 | $65.00 | $65.00 | $0.00 | $137.50 |
| CBDT | LB-2025-00126 | $18.75 | $18.75 | $0.00 | $156.25 |
| AIRPORT | LB-2025-00127 | $35.00 | $35.00 | $0.00 | $191.25 |

**Category Total: $191.25 applied**
**Remaining Available: $465.00 - $191.25 = $273.75**

---

#### **STEP 2: EZPASS (Category Priority = 2)**

**Note:** Within category, oldest due date first (FIFO)

| Ticket Number | Balance ID | Due Date | Outstanding | Payment Applied | Remaining Balance | Running Total Used |
|---------------|-----------|----------|-------------|-----------------|-------------------|-------------------|
| TKT-789012 | LB-2025-00128 | 10/19/2025 | $8.11 | $8.11 | $0.00 | $199.36 |
| TKT-789013 | LB-2025-00129 | 10/20/2025 | $15.00 | $15.00 | $0.00 | $214.36 |
| TKT-789014 | LB-2025-00130 | 10/23/2025 | $8.11 | $8.11 | $0.00 | $222.47 |

**Category Total: $31.22 applied**
**Remaining Available: $273.75 - $31.22 = $242.53**

---

#### **STEP 3: LEASE (Category Priority = 3)**

| Reference | Balance ID | Due Date | Outstanding | Payment Applied | Remaining Balance | Running Total Used |
|-----------|-----------|----------|-------------|-----------------|-------------------|-------------------|
| WEEK-42-2025 | LB-2025-00131 | 10/26/2025 | $500.00 | $242.53 | $257.47 | $465.00 |

**Category Total: $242.53 applied (PARTIAL PAYMENT)**
**Remaining Available: $242.53 - $242.53 = $0.00**

**⚠️ ALLOCATION STOPPED - No more earnings available**

---

#### **STEP 4-8: REMAINING CATEGORIES (NOT PAID THIS WEEK)**

These obligations remain OPEN and will carry forward:

| Category | Total Outstanding | Status |
|----------|------------------|--------|
| PVB | $180.00 | Unpaid - Carries to next week |
| TLC | $75.00 | Unpaid - Carries to next week |
| REPAIRS | $250.00 | Unpaid - Carries to next week |
| LOANS | $304.60 | Unpaid - Carries to next week |
| MISC | $25.00 | Unpaid - Carries to next week |

**Total Unpaid: $834.60**

---

### **📋 Sheet 5: FINAL STATE (After Allocation)**

| Category | Reference | Original Outstanding | Payment Applied | New Balance | Status |
|----------|-----------|---------------------|-----------------|-------------|--------|
| TAXES | ALL | $191.25 | $191.25 | $0.00 | ✅ CLOSED |
| EZPASS | TKT-789012 | $8.11 | $8.11 | $0.00 | ✅ CLOSED |
| EZPASS | TKT-789013 | $15.00 | $15.00 | $0.00 | ✅ CLOSED |
| EZPASS | TKT-789014 | $8.11 | $8.11 | $0.00 | ✅ CLOSED |
| LEASE | WEEK-42-2025 | $500.00 | $242.53 | **$257.47** | ⚠️ OPEN (Partial) |
| PVB | PVB-1234567 | $65.00 | $0.00 | $65.00 | ⚠️ OPEN |
| PVB | PVB-1234568 | $115.00 | $0.00 | $115.00 | ⚠️ OPEN |
| TLC | TLC-INS-2025 | $75.00 | $0.00 | $75.00 | ⚠️ OPEN |
| REPAIRS | VR-2025-045-INST-01 | $50.00 | $0.00 | $50.00 | ⚠️ OPEN |
| REPAIRS | VR-2025-045-INST-02 | $200.00 | $0.00 | $200.00 | ⚠️ OPEN |
| LOANS | DL-2025-012-INST-03 | $52.30 | $0.00 | $52.30 | ⚠️ OPEN |
| LOANS | DL-2025-012-INST-04 | $252.30 | $0.00 | $252.30 | ⚠️ OPEN |
| MISC | MC-2025-089 | $25.00 | $0.00 | $25.00 | ⚠️ OPEN |

---

### **📋 Sheet 6: DTR SUMMARY**

```
═══════════════════════════════════════════════════════════════
              DRIVER TRANSACTION RECEIPT (DTR)
═══════════════════════════════════════════════════════════════

Receipt Number: DTR-2025-102654
Driver/Leaseholder: John Doe
TLC License: 5123456
Medallion: 2Y47
Payment Period: October 20 - 26, 2025

───────────────────────────────────────────────────────────────
GROSS EARNINGS SNAPSHOT
───────────────────────────────────────────────────────────────
Credit Card Earnings                                    $465.00
Cash Earnings (Informational)                            $90.00
                                                        --------
TOTAL GROSS EARNINGS                                    $555.00

───────────────────────────────────────────────────────────────
ACCOUNT BALANCE FOR PAYMENT PERIOD
───────────────────────────────────────────────────────────────
                                Prior    Current    Payment    Balance
                               Balance   Charge     Applied    Forward
                               ────────  ────────   ────────   ────────
Taxes (MTA/TIF/Cong/CBDT/Air)    $0.00   $191.25    $191.25     $0.00
EZPass Tolls                     $8.11    $23.11     $31.22     $0.00
Lease Payment                    $0.00   $500.00    $242.53   $257.47
PVB Violations                  $65.00   $115.00      $0.00   $180.00
TLC Tickets                     $75.00     $0.00      $0.00    $75.00
Repairs & Maintenance           $50.00   $200.00      $0.00   $250.00
Driver Loans                    $52.30   $252.30      $0.00   $304.60
Miscellaneous Charges            $0.00    $25.00      $0.00    $25.00
                               ────────  ────────   ────────   ────────
TOTAL DEDUCTIONS                $250.41 $1,306.66    $465.00 $1,092.07

───────────────────────────────────────────────────────────────
PAYMENT CALCULATION
───────────────────────────────────────────────────────────────
Credit Card Earnings                                    $465.00
Total Deductions Applied                               ($465.00)
                                                        ────────
NET EARNINGS THIS WEEK                                    $0.00
Prior Balance Carried Forward                            $250.41
Balance Due Next Week                                 $1,092.07
                                                        ════════
TOTAL DUE TO DRIVER                                      ($842.07)
                                                        ════════

Payment Type: ACH
Payment Status: UNPAID (Driver owes BAT $842.07)

═══════════════════════════════════════════════════════════════
```

---

### **📋 Sheet 7: ALLOCATION EXPLANATION**

#### **Why This Order?**

```yaml
PAYMENT_HIERARCHY_LOGIC:

PRIORITY_1_TAXES:
  Reason: Regulatory obligations paid first
  BAT must remit to government
  Cannot operate without tax compliance
  Result: $191.25 fully paid ✅

PRIORITY_2_EZPASS:
  Reason: Tolls accrue penalties if unpaid
  Multiple agencies involved (MTA, Port Authority)
  Older toll (10/19) paid before newer toll (10/23)
  Result: All tolls fully paid ✅

PRIORITY_3_LEASE:
  Reason: Core revenue for BAT
  Driver cannot operate without lease
  Result: Partially paid $242.53 of $500.00 ⚠️
  Remaining $257.47 carries to next week

PRIORITY_4-8_REMAINING:
  No earnings left to allocate
  All balances carry forward to next week
  Driver sees these in "Balance Forward" column
  Will be paid in future weeks as earnings available
```

#### **FIFO Within Category Example (EZPass):**

```
Three EZPass tolls with different due dates:
  1. TKT-789012: Due 10/19/2025 → Paid FIRST
  2. TKT-789013: Due 10/20/2025 → Paid SECOND  
  3. TKT-789014: Due 10/23/2025 → Paid THIRD

This is FIFO (First In, First Out):
Oldest obligation paid before newer obligations
```

#### **Partial Payment Example (Lease):**

```
Lease Fee: $500.00
Available: $242.53

ALLOCATION LOGIC:
  - System allocates all remaining earnings ($242.53)
  - Lease balance reduces to $257.47
  - Status remains OPEN (not fully paid)
  - Next week: $257.47 will be Priority 3 again
  - If next week has enough earnings, lease paid first
```

---

### **📋 Sheet 8: LEDGER POSTINGS CREATED**

These are the actual ledger entries created during allocation:

| Posting ID | Type | Category | Amount | Source | Balance ID | Description |
|------------|------|----------|--------|--------|------------|-------------|
| LP-2025-123401 | CREDIT | TAXES | $45.50 | EARNINGS | LB-2025-00123 | Payment to MTA Surcharge |
| LP-2025-123402 | CREDIT | TAXES | $27.00 | EARNINGS | LB-2025-00124 | Payment to TIF |
| LP-2025-123403 | CREDIT | TAXES | $65.00 | EARNINGS | LB-2025-00125 | Payment to Congestion |
| LP-2025-123404 | CREDIT | TAXES | $18.75 | EARNINGS | LB-2025-00126 | Payment to CBDT |
| LP-2025-123405 | CREDIT | TAXES | $35.00 | EARNINGS | LB-2025-00127 | Payment to Airport Fee |
| LP-2025-123406 | CREDIT | EZPASS | $8.11 | EARNINGS | LB-2025-00128 | Payment to TKT-789012 |
| LP-2025-123407 | CREDIT | EZPASS | $15.00 | EARNINGS | LB-2025-00129 | Payment to TKT-789013 |
| LP-2025-123408 | CREDIT | EZPASS | $8.11 | EARNINGS | LB-2025-00130 | Payment to TKT-789014 |
| LP-2025-123409 | CREDIT | LEASE | $242.53 | EARNINGS | LB-2025-00131 | Partial payment to Lease Fee |

**Total Posted: $465.00** (exactly equals CC Earnings)

---

### **📋 Sheet 9: WHAT IF INTERIM PAYMENT?**

**Scenario:** Driver makes $300 cash payment on Tuesday, wants to pay toward PVB violation

```yaml
INTERIM_PAYMENT_BYPASSES_HIERARCHY:

Normal Flow (Without Interim):
  $465 earnings → Taxes → EZPass → Lease (partial)
  PVB unpaid

With Interim Payment ($300 to PVB):
  Tuesday: Driver pays $300 cash
  System: 
    - Records interim_payment
    - Applies DIRECTLY to PVB-1234568 ($115) and PVB-1234567 ($65)
    - Allocates remaining $120 to LEASE (excess auto-applies)
  
  Sunday DTR Generation:
    - PVB balances already reduced by $180
    - $465 earnings flows through normal hierarchy
    - Result: More goes to Lease and other obligations

ALLOCATION WITH INTERIM:
  Taxes: $191.25 (same)
  EZPass: $31.22 (same)
  Lease: $242.53 + $120 (from interim excess) = $362.53
  PVB: Already paid via interim
```

---

## **SECTION 2: DATABASE SCHEMA DOCUMENTATION**

### **📋 TABLE 1: ledger_postings**

**Purpose:** Immutable record of every financial event

| Field Name | Data Type | Size | Description | Nullable | Constraints |
|------------|-----------|------|-------------|----------|-------------|
| id | BIGINT | - | Primary key, auto-increment | NO | PRIMARY KEY, AUTO_INCREMENT |
| posting_id | VARCHAR | 50 | Unique identifier (LP-YYYY-NNNNNN) | NO | UNIQUE, NOT NULL |
| driver_id | INT | - | Reference to driver | NO | FOREIGN KEY → drivers(id) |
| lease_id | INT | - | Reference to lease | NO | FOREIGN KEY → leases(id) |
| vehicle_id | INT | - | Reference to vehicle | YES | FOREIGN KEY → vehicles(id) |
| medallion_id | INT | - | Reference to medallion | YES | FOREIGN KEY → medallions(id) |
| posting_date | DATETIME | - | When posting occurred | NO | NOT NULL |
| posting_type | ENUM | - | DEBIT or CREDIT | NO | ENUM('DEBIT', 'CREDIT') |
| category | ENUM | - | Financial category | NO | ENUM('EARNINGS','TAXES','EZPASS','LEASE','PVB','TLC','REPAIRS','LOANS','MISC','DEPOSIT','INTERIM_PAYMENT') |
| sub_category | VARCHAR | 50 | Detailed category (e.g., MTA_SURCHARGE) | YES | NULL allowed |
| source_type | VARCHAR | 50 | Origin system | NO | NOT NULL |
| source_id | VARCHAR | 100 | Reference in source system | NO | NOT NULL |
| reference_id | VARCHAR | 100 | Links to obligation | YES | NULL allowed |
| amount | DECIMAL | 10,2 | Transaction amount | NO | NOT NULL, CHECK (amount > 0) |
| description | TEXT | - | Human-readable description | YES | NULL allowed |
| notes | TEXT | - | Additional notes | YES | NULL allowed |
| payment_period_start | DATE | - | Sunday of payment week | NO | NOT NULL |
| payment_period_end | DATE | - | Saturday of payment week | NO | NOT NULL |
| status | ENUM | - | Posting status | NO | ENUM('PENDING','POSTED','VOIDED'), DEFAULT 'PENDING' |
| voided_by_posting_id | VARCHAR | 50 | Reference to reversal posting | YES | FOREIGN KEY → ledger_postings(posting_id) |
| voided_reason | TEXT | - | Why voided | YES | NULL allowed |
| created_by | INT | - | User who created | YES | FOREIGN KEY → users(id) |
| posted_by | INT | - | User who posted | YES | FOREIGN KEY → users(id) |
| posted_on | DATETIME | - | When posted | YES | NULL allowed |
| created_on | DATETIME | - | Record creation timestamp | NO | DEFAULT CURRENT_TIMESTAMP |
| updated_on | DATETIME | - | Record update timestamp | YES | ON UPDATE CURRENT_TIMESTAMP |

**Indexes:**
- `idx_driver_lease (driver_id, lease_id)`
- `idx_posting_date (posting_date)`
- `idx_period (payment_period_start, payment_period_end)`
- `idx_category (category)`
- `idx_source (source_type, source_id)`
- `idx_status (status)`

---

### **📋 TABLE 2: ledger_balances**

**Purpose:** Aggregated view of outstanding obligations

| Field Name | Data Type | Size | Description | Nullable | Constraints |
|------------|-----------|------|-------------|----------|-------------|
| id | BIGINT | - | Primary key, auto-increment | NO | PRIMARY KEY, AUTO_INCREMENT |
| balance_id | VARCHAR | 50 | Unique identifier (LB-YYYY-NNNNNN) | NO | UNIQUE, NOT NULL |
| driver_id | INT | - | Reference to driver | NO | FOREIGN KEY → drivers(id) |
| lease_id | INT | - | Reference to lease | NO | FOREIGN KEY → leases(id) |
| vehicle_id | INT | - | Reference to vehicle | YES | FOREIGN KEY → vehicles(id) |
| medallion_id | INT | - | Reference to medallion | YES | FOREIGN KEY → medallions(id) |
| category | VARCHAR | 50 | Financial category | NO | NOT NULL |
| sub_category | VARCHAR | 50 | Detailed category | YES | NULL allowed |
| reference_type | VARCHAR | 50 | Type of obligation (REPAIR, LOAN, etc.) | NO | NOT NULL |
| reference_id | VARCHAR | 100 | ID in source system | NO | NOT NULL |
| original_amount | DECIMAL | 10,2 | Initial obligation amount | NO | NOT NULL, CHECK (original_amount > 0) |
| prior_balance | DECIMAL | 10,2 | Carried from previous period | NO | DEFAULT 0.00 |
| current_amount | DECIMAL | 10,2 | This period's charge | NO | NOT NULL |
| payment_applied | DECIMAL | 10,2 | Total payments made | NO | DEFAULT 0.00 |
| outstanding_balance | DECIMAL | 10,2 | Amount still owed | NO | NOT NULL, CHECK (outstanding_balance >= 0) |
| due_date | DATE | - | When payment is due | NO | NOT NULL |
| payment_period_start | DATE | - | Sunday of payment week | NO | NOT NULL |
| payment_period_end | DATE | - | Saturday of payment week | NO | NOT NULL |
| status | ENUM | - | Balance status | NO | ENUM('OPEN','CLOSED','DISPUTED'), DEFAULT 'OPEN' |
| payment_reference | JSON | - | Array of payment IDs applied | YES | NULL allowed |
| disputed_on | DATETIME | - | When dispute raised | YES | NULL allowed |
| disputed_by | INT | - | User who disputed | YES | FOREIGN KEY → users(id) |
| dispute_reason | TEXT | - | Reason for dispute | YES | NULL allowed |
| dispute_resolved_on | DATETIME | - | When dispute resolved | YES | NULL allowed |
| created_by | INT | - | User who created | YES | FOREIGN KEY → users(id) |
| modified_by | INT | - | User who last modified | YES | FOREIGN KEY → users(id) |
| created_on | DATETIME | - | Record creation timestamp | NO | DEFAULT CURRENT_TIMESTAMP |
| updated_on | DATETIME | - | Record update timestamp | YES | ON UPDATE CURRENT_TIMESTAMP |

**Indexes:**
- `idx_driver_lease_status (driver_id, lease_id, status)`
- `idx_category_status (category, status)`
- `idx_due_date (due_date)`
- `idx_reference (reference_type, reference_id)`
- `idx_period (payment_period_start, payment_period_end)`

**Constraints:**
- `CHECK (outstanding_balance = original_amount - payment_applied)`

---

### **📋 TABLE 3: curb_trips**

**Purpose:** Store trip data from CURB API

| Field Name | Data Type | Size | Description | Nullable | Constraints |
|------------|-----------|------|-------------|----------|-------------|
| id | BIGINT | - | Primary key, auto-increment | NO | PRIMARY KEY, AUTO_INCREMENT |
| trip_id | VARCHAR | 100 | Unique trip ID from CURB | NO | UNIQUE, NOT NULL |
| trip_start_datetime | DATETIME | - | When trip started | NO | NOT NULL |
| trip_end_datetime | DATETIME | - | When trip ended | NO | NOT NULL |
| pickup_location | VARCHAR | 255 | Pickup address | YES | NULL allowed |
| dropoff_location | VARCHAR | 255 | Dropoff address | YES | NULL allowed |
| hack_license_number | VARCHAR | 50 | TLC License from CURB | NO | NOT NULL |
| driver_id | INT | - | Mapped internal driver | YES | FOREIGN KEY → drivers(id) |
| cab_number | VARCHAR | 50 | Medallion number from CURB | NO | NOT NULL |
| medallion_id | INT | - | Mapped internal medallion | YES | FOREIGN KEY → medallions(id) |
| vehicle_id | INT | - | Mapped internal vehicle | YES | FOREIGN KEY → vehicles(id) |
| lease_id | INT | - | Mapped internal lease | YES | FOREIGN KEY → leases(id) |
| fare_amount | DECIMAL | 10,2 | Base fare | NO | NOT NULL, CHECK (fare_amount >= 0) |
| tip_amount | DECIMAL | 10,2 | Tip given | NO | DEFAULT 0.00 |
| tolls_amount | DECIMAL | 10,2 | Tolls paid during trip | NO | DEFAULT 0.00 |
| extra_amount | DECIMAL | 10,2 | Extra charges | NO | DEFAULT 0.00 |
| total_amount | DECIMAL | 10,2 | Total trip amount | NO | NOT NULL |
| payment_type | ENUM | - | How trip was paid | NO | ENUM('CASH','CREDIT_CARD','OTHER') |
| cc_earnings | DECIMAL | 10,2 | Credit card earnings (if CC) | NO | DEFAULT 0.00 |
| mta_surcharge | DECIMAL | 10,2 | MTA tax | NO | DEFAULT 0.00 |
| tif_fee | DECIMAL | 10,2 | Taxi Improvement Fund | NO | DEFAULT 0.00 |
| congestion_surcharge | DECIMAL | 10,2 | Congestion tax | NO | DEFAULT 0.00 |
| cbdt_fee | DECIMAL | 10,2 | Central Business District Toll | NO | DEFAULT 0.00 |
| airport_fee | DECIMAL | 10,2 | Airport access fee | NO | DEFAULT 0.00 |
| total_taxes | DECIMAL | 10,2 | Sum of all taxes | NO | DEFAULT 0.00 |
| payment_period_start | DATE | - | Sunday of payment week | NO | NOT NULL |
| payment_period_end | DATE | - | Saturday of payment week | NO | NOT NULL |
| import_batch_id | VARCHAR | 50 | Reference to import batch | NO | NOT NULL |
| imported_on | DATETIME | - | When imported | NO | DEFAULT CURRENT_TIMESTAMP |
| mapping_status | ENUM | - | Driver/lease mapping status | NO | ENUM('MAPPED','UNMAPPED','FAILED'), DEFAULT 'UNMAPPED' |
| mapping_confidence | DECIMAL | 3,2 | Confidence score (0.00-1.00) | NO | DEFAULT 0.00, CHECK (mapping_confidence BETWEEN 0 AND 1) |
| mapping_notes | TEXT | - | Mapping details or errors | YES | NULL allowed |
| posted_to_ledger | BOOLEAN | - | Whether posted to ledger | NO | DEFAULT FALSE |
| ledger_posting_ids | JSON | - | Array of posting IDs | YES | NULL allowed |
| created_on | DATETIME | - | Record creation timestamp | NO | DEFAULT CURRENT_TIMESTAMP |
| updated_on | DATETIME | - | Record update timestamp | YES | ON UPDATE CURRENT_TIMESTAMP |

**Indexes:**
- `idx_trip_datetime (trip_start_datetime, trip_end_datetime)`
- `idx_hack_license (hack_license_number)`
- `idx_cab_number (cab_number)`
- `idx_driver (driver_id)`
- `idx_lease (lease_id)`
- `idx_period (payment_period_start, payment_period_end)`
- `idx_payment_type (payment_type)`
- `idx_import_batch (import_batch_id)`
- `idx_mapping_status (mapping_status)`

---

### **📋 TABLE 4: ezpass_transactions**

**Purpose:** Store EZPass toll transactions

| Field Name | Data Type | Size | Description | Nullable | Constraints |
|------------|-----------|------|-------------|----------|-------------|
| id | BIGINT | - | Primary key, auto-increment | NO | PRIMARY KEY, AUTO_INCREMENT |
| transaction_id | VARCHAR | 100 | Transaction ID from EZPass | YES | NULL allowed |
| ticket_number | VARCHAR | 100 | Unique ticket/reference number | NO | UNIQUE, NOT NULL |
| transaction_datetime | DATETIME | - | When toll incurred | NO | NOT NULL |
| plate_number | VARCHAR | 20 | Vehicle plate | NO | NOT NULL |
| vehicle_id | INT | - | Mapped internal vehicle | YES | FOREIGN KEY → vehicles(id) |
| hack_license_number | VARCHAR | 50 | Mapped from CURB | YES | NULL allowed |
| driver_id | INT | - | Mapped driver | YES | FOREIGN KEY → drivers(id) |
| lease_id | INT | - | Mapped lease | YES | FOREIGN KEY → leases(id) |
| medallion_id | INT | - | Mapped medallion | YES | FOREIGN KEY → medallions(id) |
| agency_name | VARCHAR | 100 | Toll agency (MTA, Port Authority) | YES | NULL allowed |
| entry_lane | VARCHAR | 100 | Entry toll plaza | YES | NULL allowed |
| exit_lane | VARCHAR | 100 | Exit toll plaza | YES | NULL allowed |
| toll_plaza | VARCHAR | 100 | Toll plaza name | YES | NULL allowed |
| toll_amount | DECIMAL | 10,2 | Toll charge | NO | NOT NULL, CHECK (toll_amount > 0) |
| payment_period_start | DATE | - | Sunday of payment week | NO | NOT NULL |
| payment_period_end | DATE | - | Saturday of payment week | NO | NOT NULL |
| matched_trip_id | VARCHAR | 100 | Reference to curb_trips | YES | FOREIGN KEY → curb_trips(trip_id) |
| mapping_method | ENUM | - | How driver was identified | NO | ENUM('AUTO_CURB_MATCH','MANUAL_ASSIGNMENT','UNKNOWN'), DEFAULT 'UNKNOWN' |
| mapping_confidence | DECIMAL | 3,2 | Confidence score (0.00-1.00) | NO | DEFAULT 0.00, CHECK (mapping_confidence BETWEEN 0 AND 1) |
| time_difference_minutes | INT | - | Minutes between toll and trip | YES | NULL allowed |
| mapping_notes | TEXT | - | Matching details | YES | NULL allowed |
| manually_assigned | BOOLEAN | - | Was manually assigned | NO | DEFAULT FALSE |
| assigned_by | INT | - | User who assigned | YES | FOREIGN KEY → users(id) |
| assigned_on | DATETIME | - | When assigned | YES | NULL allowed |
| assignment_reason | TEXT | - | Why manually assigned | YES | NULL allowed |
| import_batch_id | VARCHAR | 50 | Reference to import batch | NO | NOT NULL |
| imported_on | DATETIME | - | When imported | NO | DEFAULT CURRENT_TIMESTAMP |
| posted_to_ledger | BOOLEAN | - | Whether posted to ledger | NO | DEFAULT FALSE |
| ledger_balance_id | VARCHAR | 50 | Reference to ledger balance | YES | NULL allowed |
| resolution_status | ENUM | - | Status of resolution | NO | ENUM('UNRESOLVED','RESOLVED','DISPUTED'), DEFAULT 'UNRESOLVED' |
| created_on | DATETIME | - | Record creation timestamp | NO | DEFAULT CURRENT_TIMESTAMP |
| updated_on | DATETIME | - | Record update timestamp | YES | ON UPDATE CURRENT_TIMESTAMP |

**Indexes:**
- `idx_transaction_datetime (transaction_datetime)`
- `idx_plate_number (plate_number)`
- `idx_vehicle (vehicle_id)`
- `idx_driver_lease (driver_id, lease_id)`
- `idx_period (payment_period_start, payment_period_end)`
- `idx_mapping_method (mapping_method)`
- `idx_resolution (resolution_status)`
- `idx_import_batch (import_batch_id)`
- `idx_trip_match (matched_trip_id)`

---

### **📋 TABLE 5: driver_loans**

**Purpose:** Master record for driver loans

| Field Name | Data Type | Size | Description | Nullable | Constraints |
|------------|-----------|------|-------------|----------|-------------|
| id | BIGINT | - | Primary key, auto-increment | NO | PRIMARY KEY, AUTO_INCREMENT |
| loan_id | VARCHAR | 50 | Unique identifier (DL-YYYY-NNNN) | NO | UNIQUE, NOT NULL |
| loan_number | VARCHAR | 50 | Display number | YES | NULL allowed |
| driver_id | INT | - | Borrower | NO | FOREIGN KEY → drivers(id) |
| lease_id | INT | - | Associated lease | NO | FOREIGN KEY → leases(id) |
| loan_amount | DECIMAL | 10,2 | Principal amount | NO | NOT NULL, CHECK (loan_amount > 0) |
| interest_rate | DECIMAL | 5,2 | Annual percentage rate | NO | DEFAULT 0.00, CHECK (interest_rate BETWEEN 0 AND 100) |
| purpose | VARCHAR | 255 | Reason for loan | YES | NULL allowed |
| notes | TEXT | - | Additional notes | YES | NULL allowed |
| loan_date | DATE | - | When loan created | NO | NOT NULL |
| start_week | DATE | - | Sunday when payments start | NO | NOT NULL |
| end_week | DATE | - | Estimated completion | YES | NULL allowed |
| status | ENUM | - | Loan status | NO | ENUM('ACTIVE','CLOSED','ON_HOLD','CANCELLED'), DEFAULT 'ACTIVE' |
| total_principal_paid | DECIMAL | 10,2 | Principal paid to date | NO | DEFAULT 0.00 |
| total_interest_paid | DECIMAL | 10,2 | Interest paid to date | NO | DEFAULT 0.00 |
| outstanding_balance | DECIMAL | 10,2 | Amount still owed | NO | NOT NULL |
| approved_by | INT | - | User who approved | YES | FOREIGN KEY → users(id) |
| approved_on | DATETIME | - | Approval timestamp | YES | NULL allowed |
| closed_on | DATE | - | When fully paid | YES | NULL allowed |
| closure_reason | VARCHAR | 255 | Why closed | YES | NULL allowed |
| created_by | INT | - | User who created | NO | FOREIGN KEY → users(id) |
| modified_by | INT | - | User who last modified | YES | FOREIGN KEY → users(id) |
| created_on | DATETIME | - | Record creation timestamp | NO | DEFAULT CURRENT_TIMESTAMP |
| updated_on | DATETIME | - | Record update timestamp | YES | ON UPDATE CURRENT_TIMESTAMP |

**Indexes:**
- `idx_driver_lease (driver_id, lease_id)`
- `idx_status (status)`
- `idx_start_week (start_week)`
- `idx_loan_date (loan_date)`

**Constraints:**
- `CHECK (start_week is a Sunday)` - enforced at application level
- `CHECK (outstanding_balance = loan_amount - total_principal_paid)`

---

### **📋 TABLE 6: loan_schedules**

**Purpose:** Individual loan installments

| Field Name | Data Type | Size | Description | Nullable | Constraints |
|------------|-----------|------|-------------|----------|-------------|
| id | BIGINT | - | Primary key, auto-increment | NO | PRIMARY KEY, AUTO_INCREMENT |
| installment_id | VARCHAR | 50 | Unique ID ({loan_id}-INST-NN) | NO | UNIQUE, NOT NULL |
| loan_id | VARCHAR | 50 | Parent loan | NO | FOREIGN KEY → driver_loans(loan_id) ON DELETE CASCADE |
| installment_number | INT | - | Sequence number | NO | NOT NULL |
| due_date | DATE | - | When due | NO | NOT NULL |
| week_start | DATE | - | Sunday of week | NO | NOT NULL |
| week_end | DATE | - | Saturday of week | NO | NOT NULL |
| principal_amount | DECIMAL | 10,2 | Principal portion | NO | NOT NULL, CHECK (principal_amount > 0) |
| interest_amount | DECIMAL | 10,2 | Interest portion | NO | DEFAULT 0.00 |
| total_due | DECIMAL | 10,2 | Principal + Interest | NO | NOT NULL |
| principal_paid | DECIMAL | 10,2 | Principal paid | NO | DEFAULT 0.00 |
| interest_paid | DECIMAL | 10,2 | Interest paid | NO | DEFAULT 0.00 |
| outstanding_balance | DECIMAL | 10,2 | Amount still owed | NO | NOT NULL |
| status | ENUM | - | Installment status | NO | ENUM('SCHEDULED','DUE','POSTED','PAID','SKIPPED'), DEFAULT 'SCHEDULED' |
| ledger_balance_id | VARCHAR | 50 | Reference to ledger | YES | NULL allowed |
| posted_to_ledger | BOOLEAN | - | Whether posted | NO | DEFAULT FALSE |
| posted_on | DATETIME | - | When posted | YES | NULL allowed |
| created_on | DATETIME | - | Record creation timestamp | NO | DEFAULT CURRENT_TIMESTAMP |
| updated_on | DATETIME | - | Record update timestamp | YES | ON UPDATE CURRENT_TIMESTAMP |

**Indexes:**
- `idx_loan_id (loan_id)`
- `idx_due_date (due_date)`
- `idx_status (status)`
- `idx_week (week_start, week_end)`

**Unique Constraint:**
- `UNIQUE (loan_id, installment_number)`

**Constraints:**
- `CHECK (total_due = principal_amount + interest_amount)`
- `CHECK (outstanding_balance = total_due - principal_paid - interest_paid)`

---

### **📋 TABLE 7: driver_transaction_receipts (DTR)**

**Purpose:** Weekly driver payment receipts

| Field Name | Data Type | Size | Description | Nullable | Constraints |
|------------|-----------|------|-------------|----------|-------------|
| id | BIGINT | - | Primary key, auto-increment | NO | PRIMARY KEY, AUTO_INCREMENT |
| receipt_number | VARCHAR | 50 | Unique ID (DTR-YYYY-NNNNNN) | NO | UNIQUE, NOT NULL |
| driver_id | INT | - | Driver | NO | FOREIGN KEY → drivers(id) |
| lease_id | INT | - | Lease | NO | FOREIGN KEY → leases(id) |
| medallion_id | INT | - | Medallion | YES | FOREIGN KEY → medallions(id) |
| vehicle_id | INT | - | Vehicle | YES | FOREIGN KEY → vehicles(id) |
| week_start | DATE | - | Sunday | NO | NOT NULL |
| week_end | DATE | - | Saturday | NO | NOT NULL |
| generation_datetime | DATETIME | - | When DTR generated | NO | NOT NULL |
| cc_earnings | DECIMAL | 10,2 | Credit card earnings | NO | DEFAULT 0.00 |
| cash_earnings | DECIMAL | 10,2 | Cash earnings (informational) | NO | DEFAULT 0.00 |
| total_earnings | DECIMAL | 10,2 | CC + Cash | NO | DEFAULT 0.00 |
| taxes_total | DECIMAL | 10,2 | All tax deductions | NO | DEFAULT 0.00 |
| ezpass_total | DECIMAL | 10,2 | EZPass deductions | NO | DEFAULT 0.00 |
| lease_total | DECIMAL | 10,2 | Lease fee deductions | NO | DEFAULT 0.00 |
| pvb_total | DECIMAL | 10,2 | PVB violation deductions | NO | DEFAULT 0.00 |
| tlc_total | DECIMAL | 10,2 | TLC ticket deductions | NO | DEFAULT 0.00 |
| repairs_total | DECIMAL | 10,2 | Repair deductions | NO | DEFAULT 0.00 |
| loans_total | DECIMAL | 10,2 | Loan payment deductions | NO | DEFAULT 0.00 |
| misc_total | DECIMAL | 10,2 | Miscellaneous deductions | NO | DEFAULT 0.00 |
| total_deductions | DECIMAL | 10,2 | Sum of all deductions | NO | DEFAULT 0.00 |
| net_earnings | DECIMAL | 10,2 | Earnings - Deductions | NO | DEFAULT 0.00 |
| prior_balance | DECIMAL | 10,2 | Carried from previous week | NO | DEFAULT 0.00 |
| total_due_to_driver | DECIMAL | 10,2 | Final amount (can be negative) | NO | NOT NULL |
| payment_type | ENUM | - | ACH, Check, or Cash | NO | ENUM('ACH','CHECK','CASH') |
| payment_status | ENUM | - | Payment status | NO | ENUM('UNPAID','PAID','PROCESSING','FAILED'), DEFAULT 'UNPAID' |
| ach_batch_number | VARCHAR | 50 | ACH batch reference | YES | NULL allowed |
| ach_processed_on | DATE | - | When ACH processed | YES | NULL allowed |
| check_number | VARCHAR | 50 | Check number | YES | NULL allowed |
| check_issued_on | DATE | - | When check issued | YES | NULL allowed |
| pdf_generated | BOOLEAN | - | PDF created | NO | DEFAULT FALSE |
| pdf_s3_key | VARCHAR | 500 | S3 path to PDF | YES | NULL allowed |
| email_sent | BOOLEAN | - | Email delivered | NO | DEFAULT FALSE |
| email_sent_on | DATETIME | - | When email sent | YES | NULL allowed |
| email_recipient | VARCHAR | 255 | Email address | YES | NULL allowed |
| ledger_snapshot_id | VARCHAR | 50 | Ledger snapshot reference | YES | NULL allowed |
| generated_by | INT | - | User who generated | YES | FOREIGN KEY → users(id) |
| generation_type | ENUM | - | Scheduled or Manual | NO | ENUM('SCHEDULED','MANUAL') |
| created_on | DATETIME | - | Record creation timestamp | NO | DEFAULT CURRENT_TIMESTAMP |
| updated_on | DATETIME | - | Record update timestamp | YES | ON UPDATE CURRENT_TIMESTAMP |

**Indexes:**
- `idx_driver_lease (driver_id, lease_id)`
- `idx_week (week_start, week_end)`
- `idx_payment_status (payment_status)`
- `idx_ach_batch (ach_batch_number)`
- `idx_generation_datetime (generation_datetime)`

**Constraints:**
- `CHECK (total_deductions = taxes_total + ezpass_total + lease_total + pvb_total + tlc_total + repairs_total + loans_total + misc_total)`
- `CHECK (net_earnings = cc_earnings - total_deductions)`

---

### **📋 TABLE 8: ach_batches**

**Purpose:** ACH payment batch tracking

| Field Name | Data Type | Size | Description | Nullable | Constraints |
|------------|-----------|------|-------------|----------|-------------|
| id | BIGINT | - | Primary key, auto-increment | NO | PRIMARY KEY, AUTO_INCREMENT |
| batch_number | VARCHAR | 50 | Unique ID (YYMM-NNN) | NO | UNIQUE, NOT NULL |
| batch_date | DATE | - | When batch created | NO | NOT NULL |
| effective_date | DATE | - | ACH effective date | NO | NOT NULL |
| total_payments | INT | - | Number of payments in batch | NO | DEFAULT 0 |
| total_amount | DECIMAL | 10,2 | Sum of all payments | NO | DEFAULT 0.00 |
| status | ENUM | - | Batch status | NO | ENUM('CREATED','FILE_GENERATED','SUBMITTED','PROCESSED','FAILED','REVERSED'), DEFAULT 'CREATED' |
| nacha_file_generated | BOOLEAN | - | NACHA file created | NO | DEFAULT FALSE |
| nacha_file_s3_key | VARCHAR | 500 | S3 path to NACHA file | YES | NULL allowed |
| nacha_file_generated_on | DATETIME | - | When file created | YES | NULL allowed |
| submitted_to_bank | BOOLEAN | - | Submitted for processing | NO | DEFAULT FALSE |
| submitted_on | DATETIME | - | When submitted | YES | NULL allowed |
| submitted_by | INT | - | User who submitted | YES | FOREIGN KEY → users(id) |
| bank_processed_on | DATE | - | When bank processed | YES | NULL allowed |
| bank_confirmation_number | VARCHAR | 100 | Bank reference | YES | NULL allowed |
| reversed_on | DATETIME | - | When reversed | YES | NULL allowed |
| reversed_by | INT | - | User who reversed | YES | FOREIGN KEY → users(id) |
| reversal_reason | TEXT | - | Why reversed | YES | NULL allowed |
| created_by | INT | - | User who created | NO | FOREIGN KEY → users(id) |
| created_on | DATETIME | - | Record creation timestamp | NO | DEFAULT CURRENT_TIMESTAMP |
| updated_on | DATETIME | - | Record update timestamp | YES | ON UPDATE CURRENT_TIMESTAMP |

**Indexes:**
- `idx_batch_date (batch_date)`
- `idx_status (status)`