You're absolutely right! Let me provide you with a **complete, concise documentation package** that you can save to your project knowledge for future reference.

---

# 📘 **BAT PAYMENT ENGINE - MASTER IMPLEMENTATION GUIDE**

## **Document Purpose**
This document serves as the complete blueprint for developing the BAT Payment Engine. It should be included in project knowledge so future AI assistants can understand the entire system architecture, requirements, and implementation roadmap.

---

## **TABLE OF CONTENTS**

1. [System Overview](#1-system-overview)
2. [Core Business Rules](#2-core-business-rules)
3. [Data Architecture](#3-data-architecture)
4. [Development Roadmap](#4-development-roadmap)
5. [Phase Specifications](#5-phase-specifications)
6. [Integration Guidelines](#6-integration-guidelines)
7. [Testing Requirements](#7-testing-requirements)
8. [Glossary](#8-glossary)

---

# **1. SYSTEM OVERVIEW**

## **1.1 Purpose**
The BAT Payment Engine manages all financial transactions for taxi fleet operations:
- Driver earnings from trips (CURB)
- Obligations (tolls, violations, leases, repairs, loans)
- Weekly payment calculations (DTR generation)
- Payment distribution (ACH/Check)
- Real-time balance tracking

## **1.2 Core Principles**

```yaml
PRINCIPLE_1: Ledger as Single Source of Truth
  - All financial data flows through centralized ledger
  - No business logic in DTR generation (only reads ledger)
  - All balances calculated from ledger postings

PRINCIPLE_2: Lease-Centric Design
  - Every transaction tied to specific lease
  - Driver can have multiple leases (separate accounting)
  - Each lease financially independent

PRINCIPLE_3: Event-Sourced Architecture
  - Every financial event creates immutable posting
  - Balances derived from postings
  - Complete audit trail always available

PRINCIPLE_4: Payment Hierarchy (Non-Negotiable)
  ORDER: Taxes → EZPass → Lease → PVB → TLC → Repairs → Loans → Misc
  RULE: Within category, oldest obligation first (FIFO)
  EXCEPTION: Interim payments bypass hierarchy

PRINCIPLE_5: Double-Entry Accounting
  - DEBIT: Obligations (driver owes)
  - CREDIT: Payments/Earnings (reduces debt)
  - Balance = Original - Sum(Credits)
```

## **1.3 System Architecture**

```
┌─────────────────────────────────────────────┐
│          EXTERNAL SYSTEMS                    │
│   CURB API  │  EZPass CSV  │  PVB CSV       │
└──────┬──────────────┬────────────┬──────────┘
       │              │            │
       ▼              ▼            ▼
┌─────────────────────────────────────────────┐
│       IMPORT & MAPPING LAYER                 │
│  • CURB Trips                                │
│  • EZPass Tolls (time-window matching)      │
│  • PVB Violations (time-window matching)    │
│  • TLC Tickets                               │
└──────────────────┬──────────────────────────┘
                   ▼
┌─────────────────────────────────────────────┐
│      CENTRALIZED LEDGER (Core)               │
│  • Ledger Postings (immutable events)       │
│  • Ledger Balances (aggregated obligations) │
│  • Payment Hierarchy Engine                  │
└──────┬────────────────────────┬─────────────┘
       │                        │
       ▼                        ▼
┌──────────────┐      ┌──────────────────────┐
│  OBLIGATIONS │      │   DTR ENGINE         │
│  • Loans     │      │  • Weekly Generation │
│  • Repairs   │      │  • PDF Creation      │
│  • Deposits  │      │  • Distribution      │
│  • Leases    │      └──────────┬───────────┘
└──────────────┘                 │
                                 ▼
                        ┌─────────────────┐
                        │  ACH EXPORT     │
                        │  • NACHA Files  │
                        │  • Batch Mgmt   │
                        └─────────────────┘
```

---

# **2. CORE BUSINESS RULES**

## **2.1 Critical Business Rules**

```yaml
RULE_1: One Medallion, One Active Lease
  - A medallion can only be in ONE active lease at a time
  - Enforcement: Database constraint
  - Before activating lease, check no other active lease exists

RULE_2: Driver Manager vs Additional Driver
  - Only Driver Managers receive DTRs
  - Additional drivers are sub-contractors
  - All charges attributed to Driver Manager's lease
  - Tracked via: lease_drivers.is_driver_manager flag

RULE_3: Co-Leasing Support
  - One lease can have multiple driver managers (2+ people share vehicle)
  - Each co-leasee gets own DTR
  - Individual charges (EZPass matched to driver): 100% to that driver
  - Shared charges (repairs, lease): Split by share_percentage
  - Implementation: lease_drivers.share_percentage field

RULE_4: Weekly Period Definition
  - Start: Sunday 00:00:00
  - End: Saturday 23:59:59
  - DTR Generation: Sunday 05:00 AM
  - Cut-off: No backdating into closed periods

RULE_5: Payment Hierarchy (Strict Order)
  1. Taxes (MTA, TIF, Congestion, CBDT, Airport)
  2. EZPass
  3. Lease Fees
  4. PVB Violations
  5. TLC Tickets
  6. Repairs
  7. Driver Loans
  8. Miscellaneous
  
  Within Category: FIFO (oldest due date first)
  Exception: Interim payments go directly to selected obligation

RULE_6: Immutability & Audit
  - Ledger postings NEVER deleted
  - To reverse: Create offsetting posting with voided_by_posting_id
  - All postings tracked: created_by, created_on, posted_by, posted_on

RULE_7: Attribution Requirements
  CURB Trips:
    - Driver: Hack License Number (TLC License) - 100% confidence
    - Medallion: CAB Number - 100% confidence
  
  EZPass Tolls:
    - Vehicle: Plate Number
    - Driver: Time-window match to CURB trips (±30 min)
    - Confidence threshold: 0.90 auto-accept, 0.50 manual review
  
  PVB Violations:
    - Same as EZPass

RULE_8: Interest Calculation (Driver Loans)
  Formula: Interest = Outstanding × (Rate/100) × (Days/365)
  Parameters:
    - Outstanding: Loan balance before installment
    - Rate: Annual percentage (default: 0%)
    - Days: 7 (weekly installments)
  
  Example:
    Loan: $1,200 at 10% annual
    Interest = 1200 × (10/100) × (7/365) = $2.30

RULE_9: Loan Repayment Matrix
  $0 - $200:        Paid in full (single installment)
  $201 - $500:      $100 per week
  $501 - $1,000:    $200 per week
  $1,001 - $3,000:  $250 per week
  > $3,000:         $300 per week
  
  Note: Interest calculated separately and added to principal

RULE_10: Repair Repayment Matrix
  Same as loan matrix but NO INTEREST
  Only for DoV (Driver-Owned Vehicle) leases
  Other lease types: BAT pays repairs

RULE_11: Security Deposit Lifecycle
  Collection: At lease creation (full or 2 installments)
  Hold: 30 days post-termination (for late charges)
  Application: After 30 days, apply to outstanding obligations
  Refund: Remaining balance via ACH or check

RULE_12: Lease Proration
  First Week: (Weekly Fee / 7) × Days Remaining
  Last Week: (Weekly Fee / 7) × Days in Final Week
  Example: $500/week, starts Wednesday = ($500/7) × 4 = $285.71
```

## **2.2 Time-Window Matching Algorithm**

```yaml
PURPOSE: Match EZPass/PVB to CURB trips for driver attribution

PARAMETERS:
  time_tolerance_minutes: 30  # ±30 minutes
  confidence_thresholds:
    auto_accept: 0.90
    manual_review: 0.50
    auto_reject: 0.30

SCORING_FACTORS:
  1. Time Proximity (40 points max):
     - Within 15 min: 40 points
     - 15-30 min: 30 points
     - 30-60 min: 20 points
     - >60 min: 10 points
  
  2. Location Match (30 points max):
     - Toll plaza on route: 30 points
     - Nearby: 20 points
     - Unknown: 10 points
  
  3. Driver Consistency (30 points max):
     - Same driver has 3+ trips nearby: 30 points
     - 2 trips: 20 points
     - 1 trip: 10 points
  
  Total Score / 100 = Confidence

MULTI_MATCH_HANDLING:
  - If multiple trips match, select highest confidence
  - If tie, select closest time
  - Flag for manual review if confidence < 0.90

FALLBACK:
  - If no match or low confidence: Require manual assignment
  - Staff can override and assign directly
```

---

# **3. DATA ARCHITECTURE**

## **3.1 Database Schema Overview**

```
DATABASE: bat_database

EXISTING SCHEMAS (do not modify):
  - users/
  - bpm/
  - drivers/
  - vehicles/
  - medallions/
  - leases/

NEW SCHEMAS (payment engine):

├── ledger/                           # CORE - Phase 1
│   ├── ledger_postings              # Every financial event
│   ├── ledger_balances              # Aggregated obligations
│   └── payment_allocations          # Application history

├── imports/                          # DATA INGESTION - Phase 2
│   ├── curb_trips                   # Phase 2A
│   ├── curb_import_history
│   ├── ezpass_transactions          # Phase 2B
│   ├── ezpass_import_history
│   ├── pvb_violations               # Phase 2C
│   ├── pvb_import_history
│   ├── tlc_tickets                  # Phase 2D
│   └── tlc_import_history

├── obligations/                      # OBLIGATION MANAGEMENT - Phases 3-6
│   ├── lease_schedules              # Phase 3
│   ├── driver_loans                 # Phase 4
│   ├── loan_schedules
│   ├── vehicle_repairs              # Phase 5
│   ├── repair_schedules
│   ├── security_deposits            # Phase 6
│   └── miscellaneous_charges        # Phase 5B

├── payments/                         # PAYMENT PROCESSING - Phases 7-10
│   ├── interim_payments             # Phase 7
│   ├── driver_transaction_receipts  # Phase 8 (DTR)
│   ├── ach_batches                  # Phase 10
│   └── payment_exports

└── reconciliation/                   # REPORTING - Phase 9
    ├── balance_snapshots
    └── reconciliation_reports
```

## **3.2 Key Data Models**

### **Ledger Postings (Core)**
```sql
ledger_postings:
  - posting_id (PK, unique: LP-YYYY-NNNNNN)
  - driver_id, lease_id, vehicle_id, medallion_id (multi-entity)
  - posting_type (DEBIT/CREDIT)
  - category (EARNINGS, TAXES, EZPASS, LEASE, PVB, TLC, REPAIRS, LOANS, MISC)
  - amount
  - source_type, source_id (reference to origin)
  - payment_period_start, payment_period_end (Sunday-Saturday)
  - status (PENDING/POSTED/VOIDED)
  - voided_by_posting_id (reversal linkage)
```

### **Ledger Balances (Core)**
```sql
ledger_balances:
  - balance_id (PK, unique: LB-YYYY-NNNNNN)
  - driver_id, lease_id (mandatory)
  - category, reference_type, reference_id
  - original_amount, prior_balance, current_amount
  - payment_applied, outstanding_balance
  - due_date, payment_period_start, payment_period_end
  - status (OPEN/CLOSED/DISPUTED)
  - payment_reference (JSON array of payments applied)
```

### **CURB Trips**
```sql
curb_trips:
  - trip_id (PK, from CURB)
  - trip_start_datetime, trip_end_datetime
  - hack_license_number → driver_id (mapped)
  - cab_number → medallion_id (mapped)
  - lease_id (mapped)
  - cc_earnings, cash_earnings
  - taxes (mta_surcharge, tif, congestion, cbdt, airport)
  - mapping_status, mapping_confidence
  - posted_to_ledger, ledger_posting_ids
```

### **EZPass Transactions**
```sql
ezpass_transactions:
  - ticket_number (PK)
  - transaction_datetime
  - plate_number → vehicle_id
  - driver_id, lease_id (from CURB matching)
  - toll_amount
  - matched_trip_id (reference to curb_trips)
  - mapping_method (AUTO_CURB_MATCH/MANUAL_ASSIGNMENT/UNKNOWN)
  - mapping_confidence
  - posted_to_ledger, ledger_balance_id
```

### **Driver Loans**
```sql
driver_loans:
  - loan_id (PK: DL-YYYY-NNNN)
  - driver_id, lease_id
  - loan_amount, interest_rate
  - start_week, status
  - outstanding_balance

loan_schedules:
  - installment_id (PK)
  - loan_id (FK)
  - principal_amount, interest_amount, total_due
  - week_start, week_end, due_date
  - status (SCHEDULED/DUE/POSTED/PAID)
  - ledger_balance_id
```

### **DTR (Driver Transaction Receipts)**
```sql
driver_transaction_receipts:
  - receipt_number (PK: DTR-YYYY-NNNNNN)
  - driver_id, lease_id
  - week_start, week_end
  - cc_earnings, total_earnings
  - taxes_total, ezpass_total, lease_total, pvb_total, tlc_total
  - repairs_total, loans_total, misc_total
  - total_deductions, net_earnings, total_due_to_driver
  - payment_type (ACH/CHECK/CASH)
  - payment_status (UNPAID/PAID/PROCESSING)
  - ach_batch_number, check_number
  - pdf_s3_key, email_sent
```

---

# **4. DEVELOPMENT ROADMAP**

## **4.1 Phase Summary**

| Phase | Name | Duration | Dependencies | Priority |
|-------|------|----------|--------------|----------|
| 0 | Requirements Clarification | 1 week | None | CRITICAL |
| 1 | Centralized Ledger | 3 weeks | None | CRITICAL |
| 2A | CURB Import | 2 weeks | Phase 1 | HIGH |
| 2B | EZPass Import | 2 weeks | Phase 1, 2A | HIGH |
| 2C | PVB Import | 2 weeks | Phase 1, 2A | HIGH |
| 2D | TLC Import | 1 week | Phase 1 | MEDIUM |
| 3 | Lease Schedule & Proration | 2 weeks | Phase 1 | HIGH |
| 4 | Driver Loans | 2 weeks | Phase 1 | HIGH |
| 5 | Vehicle Repairs | 2 weeks | Phase 1 | HIGH |
| 5B | Miscellaneous Charges | 1 week | Phase 1 | MEDIUM |
| 6 | Security Deposits | 2 weeks | Phase 1 | MEDIUM |
| 7 | Interim Payments | 1 week | Phase 1-6 | HIGH |
| 8 | DTR Generation | 3 weeks | Phase 1-7 | CRITICAL |
| 9 | Real-Time Balances | 1 week | Phase 1-8 | MEDIUM |
| 10 | ACH & Payment Export | 2 weeks | Phase 8 | HIGH |

**Total Timeline: 24 weeks (6 months)**

## **4.2 Phase Dependencies**

```
Phase 0 (Requirements)
  ↓
Phase 1 (Ledger) ← FOUNDATION - Everything depends on this
  ↓
  ├─→ Phase 2A (CURB) ← Required for EZPass/PVB mapping
  │     ↓
  │     ├─→ Phase 2B (EZPass)
  │     └─→ Phase 2C (PVB)
  │
  ├─→ Phase 2D (TLC) [Can run parallel]
  ├─→ Phase 3 (Lease Schedule)
  ├─→ Phase 4 (Loans)
  ├─→ Phase 5 (Repairs) + 5B (Misc)
  └─→ Phase 6 (Deposits)
       ↓
Phase 7 (Interim Payments) ← Needs all obligation types
  ↓
Phase 8 (DTR) ← CRITICAL - Consolidates everything
  ↓
  ├─→ Phase 9 (Balances) [Can run parallel]
  └─→ Phase 10 (ACH Export)
```

---

# **5. PHASE SPECIFICATIONS**

## **PHASE 0: Requirements Clarification (Week 0)**

### **Critical Questions to Resolve**

```yaml
QUESTION_1: Additional Driver Financial Model
  Decision Needed: Does driver manager pay for all additional driver charges?
  Recommended: YES - driver manager fully responsible
  Impact: Ledger attribution, DTR generation

QUESTION_2: Co-Leasing Data Model
  Decision Needed: How to split shared charges?
  Recommended: 
    - Individual charges → 100% to that driver
    - Shared charges → Split by share_percentage
  Impact: Lease model, ledger posting, DTR generation

QUESTION_3: Cash Fare Tracking
  Decision Needed: How to track cash collected by drivers?
  Recommended: CURB shows cash trips, create expectation obligation
  Impact: CURB import, ledger posting, DTR

QUESTION_4: Time-Window Matching Parameters
  Decision Needed: Tolerance and thresholds
  Recommended: ±30 min, 0.90 auto-accept, 0.50 manual review
  Impact: EZPass/PVB matching algorithm

QUESTION_5: TLC Import Method
  Decision Needed: CSV or manual entry primary?
  Recommended: Manual entry primary, CSV optional
  Impact: Phase 2D scope
```

### **Deliverables**
- ✅ Requirements clarification document
- ✅ Updated data models
- ✅ Business rules document
- ✅ Stakeholder sign-off

---

## **PHASE 1: Centralized Ledger (Week 1-3)**

### **Purpose**
Build single source of truth for all financial transactions

### **Components**

```yaml
DATABASE:
  - ledger_postings table
  - ledger_balances table
  - Indexes optimized for queries

SERVICE_LAYER:
  File: app/ledger/services.py
  Class: LedgerService
  Methods:
    - create_posting() - Create DEBIT/CREDIT posting
    - create_obligation() - Create obligation + balance
    - apply_payment() - Apply payment to balance
    - apply_payment_hierarchy() - Apply with hierarchy rules
    - get_driver_balance() - Real-time balance query
    - void_posting() - Reverse an entry

API_ENDPOINTS:
  File: app/ledger/router.py
  Endpoints:
    - POST /ledger/postings
    - POST /ledger/obligations
    - POST /ledger/payments/apply
    - POST /ledger/payments/apply-hierarchy
    - GET /ledger/balances/driver/{driver_id}
    - GET /ledger/postings (list with filters)
    - GET /ledger/balances (list with filters)

VALIDATION:
  - Payment period must be Sunday-Saturday
  - Amount must be positive
  - Category must be valid enum
  - Balance equations must reconcile
```

### **Key Features**
✅ Immutable postings (never delete)  
✅ Double-entry accounting  
✅ Payment hierarchy enforcement  
✅ FIFO within categories  
✅ Multi-entity linkage (driver/lease/vehicle/medallion)  
✅ Real-time balance calculations  

### **Success Criteria**
- ✅ Can create postings (DEBIT/CREDIT)
- ✅ Balances calculate correctly
- ✅ Payment hierarchy works exactly as specified
- ✅ 90%+ test coverage
- ✅ API response times <200ms
- ✅ Finance team can understand ledger entries

---

## **PHASE 2A: CURB Data Import (Week 4-5)**

### **Purpose**
Import trip data from CURB API, foundational for driver attribution

### **Components**

```yaml
DATABASE:
  - curb_trips table
  - curb_import_history table

CURB_CLIENT:
  File: app/curb/curb_client.py
  Methods:
    - get_trips(start_date, end_date) - Fetch from API
    - fetch_all_trips() - Handle pagination

IMPORT_SERVICE:
  File: app/curb/services.py
  Class: CurbImportService
  Methods:
    - import_trips() - Main import orchestration
    - _process_trip() - Process single trip
    - _map_trip_to_entities() - Map to driver/medallion/lease
    - _post_trip_to_ledger() - Post earnings/taxes

SCHEDULED_JOBS:
  File: app/curb/tasks.py
  Tasks:
    - import_daily_trips_task() - Runs daily at 1:00 AM
    - import_date_range_task() - Manual trigger

API_ENDPOINTS:
  - POST /curb/import (manual trigger)
  - GET /curb/import/history
  - GET /curb/trips (list with filters)
  - POST /curb/trips/{trip_id}/remap
```

### **Mapping Logic**
```yaml
DRIVER_MAPPING:
  Input: hack_license_number (from CURB)
  Lookup: tlc_license.tlc_license_number
  Confidence: 100%

MEDALLION_MAPPING:
  Input: cab_number (from CURB)
  Lookup: medallion.medallion_number
  Confidence: 100%

LEASE_MAPPING:
  Inputs: driver_id + medallion_id + trip_date
  Lookup: Find active lease for driver+medallion at trip time
  Validation: Check lease dates
```

### **Ledger Posting**
```yaml
FOR_CC_EARNINGS:
  Type: CREDIT
  Category: EARNINGS
  Amount: trip.total_amount (if payment_type = CREDIT_CARD)

FOR_TAXES:
  Type: DEBIT (5 separate postings)
  Category: TAXES
  Sub-categories:
    - MTA_SURCHARGE
    - TIF
    - CONGESTION
    - CBDT
    - AIRPORT
```

### **Success Criteria**
- ✅ CURB API integration working
- ✅ Daily scheduled import running
- ✅ 100% mapping accuracy for direct matches
- ✅ Earnings and taxes posted to ledger
- ✅ Import history tracking complete

---

## **PHASE 2B: EZPass Import (Week 6-7)**

### **Purpose**
Import toll transactions, match to drivers via CURB trip correlation

### **Components**

```yaml
DATABASE:
  - ezpass_transactions table
  - ezpass_import_history table

IMPORT_SERVICE:
  File: app/ezpass/services.py
  Class: EZPassImportService
  Methods:
    - import_csv_file() - Parse and import CSV
    - _process_ezpass_record() - Process single toll
    - _match_to_curb_trip() - Time-window matching
    - _calculate_match_confidence() - Scoring algorithm
    - _post_to_ledger() - Create obligation
    - manually_assign_driver() - Manual override

MATCHING_SERVICE:
  File: app/ezpass/matching.py
  Algorithm: Time-window matching (see Business Rules)
  Parameters: ±30 min, confidence scoring

API_ENDPOINTS:
  - POST /ezpass/upload (CSV file upload)
  - GET /ezpass/import/history
  - GET /ezpass/transactions/unmapped
  - POST /ezpass/transactions/{id}/assign
```

### **CSV Format**
```csv
Transaction Date,Time,Plate,Agency,Entry,Exit,Toll,Ticket Number
10/20/2025,14:35:00,YV0234C,MTABT,M18BAT,M18BAT,$8.11,TKT-123456789
```

### **Matching Algorithm**
```yaml
STEP_1: Find Vehicle
  Input: plate_number
  Lookup: vehicles.plate_number

STEP_2: Find Potential CURB Trips
  Filter: vehicle_id + time window (±30 min)
  
STEP_3: Score Each Match
  Factors: Time proximity + Location + Driver consistency
  Total: 0.0 to 1.0

STEP_4: Select Best Match
  If confidence >= 0.90: Auto-accept
  If confidence >= 0.50: Suggest for review
  If confidence < 0.50: Requires manual assignment

STEP_5: Post to Ledger
  If mapped: Create obligation immediately
  If unmapped: Wait for manual assignment
```

### **Success Criteria**
- ✅ CSV upload working
- ✅ 80%+ automatic matching rate
- ✅ Unmapped tolls flagged for review
- ✅ Manual assignment interface functional
- ✅ Tolls posted to ledger

---

## **PHASE 2C: PVB Import (Week 8-9)**

### **Implementation**
Nearly identical to Phase 2B (EZPass)

### **Differences**
```yaml
CSV_FORMAT: Different columns
  - Summons Number, Ticket Number, Plate, Violation Date/Time
  - Fine Amount, Penalty, Interest, Total

IMPORT_SOURCES:
  - DOF CSV (weekly automated)
  - Manual entry (mail/email violations)

LEDGER_CATEGORY: PVB (instead of EZPASS)

AMOUNTS:
  - Track fine, penalty, interest separately
  - Total posted to ledger
```

### **Reuse from EZPass**
✅ Time-window matching algorithm  
✅ Confidence scoring  
✅ Manual assignment workflow  
✅ Ledger posting pattern  

---

## **PHASE 2D: TLC Tickets Import (Week 9)**

### **Purpose**
Import TLC regulatory violations and fees

### **Components**

```yaml
DATABASE:
  - tlc_tickets table
  - tlc_import_history table

SERVICE:
  File: app/tlc/services.py
  Primary: Manual entry
  Secondary: CSV import (if available)

TICKET_TYPES:
  - Driver license violations
  - Vehicle inspection failures
  - Regulatory fines
  - Administrative penalties
```

### **Attribution**
```yaml
SIMPLER_THAN_EZPASS:
  - Tickets directly assigned to driver OR medallion
  - No complex time-window matching needed
  - Manual entry captures assignment immediately
```

---

## **PHASE 3: Lease Schedule & Proration (Week 10-11)**

### **Purpose**
Generate weekly lease fee schedule with proration

### **Components**

```yaml
DATABASE:
  - lease_schedules table

SERVICE:
  File: app/leases/lease_schedule_service.py
  Class: LeaseScheduleService
  Methods:
    - generate_lease_schedule() - Create full schedule
    - _calculate_first_week_proration()
    - _calculate_last_week_proration()
    - post_weekly_lease_fees() - Post to ledger

SCHEDULED_JOB:
  File: app/leases/tasks.py
  Task: post_weekly_lease_fees_task()
  Schedule: Sunday 05:00 AM
```

### **Proration Logic**
```yaml
FIRST_WEEK:
  Formula: (Weekly Fee / 7) × Days Remaining
  Example: $500/week, starts Wednesday
    Daily: $500 / 7 = $71.43
    Days: 4 (Wed, Thu, Fri, Sat)
    Prorated: $71.43 × 4 = $285.72

LAST_WEEK:
  Formula: (Weekly Fee / 7) × Days in Final Week
  Example: $500/week, ends Tuesday
    Days: 3 (Sun, Mon, Tue)
    Prorated: $71.43 × 3 = $214.29

FULL_WEEKS:
  Amount: Full weekly fee (no proration)
```

### **Posting to Ledger**
```yaml
WHEN: Every Sunday 05:00 AM
WHAT: All scheduled lease fees for upcoming week
POSTING:
  Type: DEBIT
  Category: LEASE
  Amount: From lease_schedules.amount_due
  Due Date: Saturday of that week
```

---

## **PHASE 4: Driver Loans (Week 12-13)**

### **Purpose**
Manage driver loans with interest and installments

### **Components**

```yaml
DATABASE:
  - driver_loans table
  - loan_schedules table

SERVICE:
  File: app/loans/services.py
  Class: DriverLoanService
  Methods:
    - create_loan() - Create loan + generate schedule
    - _generate_installment_schedule()
    - _get_weekly_principal() - Apply repayment matrix
    - _calculate_interest() - Simple daily interest
    - post_weekly_installments() - Post to ledger

API_ENDPOINTS:
  - POST /loans/create
  - GET /loans (list)
  - GET /loans/{loan_id}
  - PUT /loans/{loan_id}/status
```

### **Interest Calculation**
```yaml
FORMULA: Interest = Principal × (Rate/100) × (Days/365)

EXAMPLE:
  Loan: $1,200
  Rate: 10% annual
  Days: 7 (weekly)
  Interest = 1200 × 0.10 × (7/365) = $2.30
  
INSTALLMENT:
  Principal: $200 (from matrix)
  Interest: $2.30
  Total Due: $202.30
```

### **Repayment Matrix**
See Business Rules section

---

## **PHASE 5: Vehicle Repairs (Week 14-15)**

### **Purpose**
Manage repair invoices with installment payments

### **Components**

```yaml
DATABASE:
  - vehicle_repairs table
  - repair_schedules table

SERVICE:
  File: app/repairs/services.py
  Similar to loans but:
    - NO interest
    - Only for DoV leases (driver liable)
    - Workshop type tracking

DRIVER_LIABILITY:
  IF lease_type = 'DOV': Driver pays
  ELSE: BAT pays (no driver obligation)
```

---

## **PHASE 5B: Miscellaneous Charges (Week 15)**

### **Purpose**
One-off charges (car wash, chargebacks, admin fees)

### **Components**

```yaml
DATABASE:
  - miscellaneous_charges table

SERVICE:
  Simple CRUD operations
  Post directly to ledger (no installments)

CHARGE_TYPES:
  - CAR_WASH
  - CHARGEBACK
  - ADMIN_FEE
  - OTHER
```

---

## **PHASE 6: Security Deposits (Week 16-17)**

### **Purpose**
Track deposit collection, hold, application, refund

### **Components**

```yaml
DATABASE:
  - security_deposits table

SERVICE:
  File: app/deposits/services.py
  Methods:
    - create_deposit() - At lease creation
    - collect_installment() - Track payments
    - apply_on_termination() - After 30-day hold
    - process_refund() - Remaining balance

LIFECYCLE:
  1. COLLECTING: Installments being collected
  2. HELD: Lease terminated, 30-day hold active
  3. APPLIED: Applied to outstanding obligations
  4. REFUNDED: Remaining balance returned
```

### **Application Logic**
```yaml
TRIGGER: 30 days after lease termination

PROCESS:
  1. Get all outstanding obligations dated before termination
  2. Apply payment hierarchy to obligations
  3. Reduce deposit amount
  4. If balance remains: Refund to driver

REFUND_METHOD:
  - ACH (preferred)
  - Check
```

---

## **PHASE 7: Interim Payments (Week 18)**

### **Purpose**
Ad-hoc payments made by drivers at cashier desk

### **Components**

```yaml
DATABASE:
  - interim_payments table

SERVICE:
  File: app/interim_payments/services.py
  Methods:
    - record_payment() - Capture payment
    - apply_to_obligation() - Direct application
    - handle_excess() - Auto-apply to lease
    - generate_receipt() - Immediate receipt

UI_WORKFLOW:
  1. Cashier enters driver TLC license
  2. System shows all driver's leases
  3. Staff selects lease
  4. System shows open obligations
  5. Staff selects obligation to pay
  6. Enter payment amount + method
  7. System applies immediately to ledger
  8. Generate receipt

PAYMENT_METHODS:
  - Cash
  - Check (capture check number)
  - ACH
  - Credit Card
```

### **Bypass Hierarchy**
```yaml
RULE: Interim payments go directly to selected obligation
REASON: Driver chooses what to pay
EXCEPTION: Only case where hierarchy bypassed
```

---

## **PHASE 8: DTR Generation (Week 19-21)** ⭐ **CRITICAL**

### **Purpose**
Generate weekly Driver Transaction Receipts

### **Components**

```yaml
DATABASE:
  - driver_transaction_receipts table

SERVICE:
  File: app/dtr/services.py
  Class: DTRService
  Methods:
    - generate_weekly_dtrs() - Batch generation
    - generate_single_dtr() - Manual generation
    - _calculate_earnings() - From CURB data
    - _apply_earnings_to_obligations() - Payment hierarchy
    - _generate_pdf() - Create PDF document
    - _send_email() - Email distribution

SCHEDULED_JOB:
  Task: generate_weekly_dtrs_task()
  Schedule: Sunday 05:00 AM
  Process: Generate DTRs for all active leases

PDF_TEMPLATE:
  File: app/templates/dtr_template.html
  Sections:
    1. Identification Block
    2. Gross Earnings Snapshot
    3. Account Balance for Payment Period
    4. EZPass Tolls Details
    5. PVB Tickets Details
    6. TLC Tickets Details
    7. Repairs Details
    8. Driver Loans Details
    9. Miscellaneous Details
    10. Trip Log (CC trips only)
```

### **DTR Generation Process**

```yaml
STEP_1: Determine Period
  - Week Start: Last Sunday 00:00:00
  - Week End: Last Saturday 23:59:59

STEP_2: For Each Active Lease
  - Get driver manager (is_driver_manager = TRUE)
  - If co-lease: Generate separate DTR per co-leasee

STEP_3: Calculate Earnings
  - Query curb_trips for period
  - Sum CC earnings
  - Sum cash earnings (if tracked)

STEP_4: Apply Payment Hierarchy
  - Use LedgerService.apply_payment_hierarchy()
  - Allocate CC earnings to obligations
  - Track allocations

STEP_5: Pull Balance Snapshot
  - Query ledger_balances for all OPEN obligations
  - Group by category
  - Calculate totals

STEP_6: Calculate Net
  - Gross Earnings - Total Deductions = Net Earnings
  - Net Earnings + Prior Balance = Total Due to Driver

STEP_7: Generate PDF
  - Populate template with data
  - Save to S3
  - Store reference in DTR record

STEP_8: Distribute
  - If auto_email: Send via AWS SES
  - Mark as sent

STEP_9: Update Status
  - Set payment_status = UNPAID
  - Ready for ACH processing
```

### **Success Criteria**
- ✅ All active leases get DTRs
- ✅ Co-leasees get separate DTRs
- ✅ Earnings applied correctly via hierarchy
- ✅ All sections populated accurately
- ✅ PDF generated and stored
- ✅ Emails sent successfully
- ✅ 100% reconciliation with ledger

---

## **PHASE 9: Real-Time Balance Dashboard (Week 22)**

### **Purpose**
View driver balances at multiple levels

### **Components**

```yaml
SERVICE:
  File: app/balances/services.py
  Methods:
    - get_individual_driver_balance()
    - get_all_drivers_balances()
    - get_drivers_by_filter()
    - export_balances_report()

API_ENDPOINTS:
  - GET /balances/driver/{driver_id}
  - GET /balances/lease/{lease_id}
  - GET /balances/medallion/{medallion_id}
  - GET /balances/all-drivers
  - GET /balances/export

VIEWS:
  - Individual driver (one lease or all leases)
  - All drivers aggregated
  - By medallion
  - By vehicle
  - Filtered sets (by status, date range, category)
```

### **Query Optimization**
```yaml
INDEXES_REQUIRED:
  - ledger_balances (driver_id, status, category)
  - ledger_balances (lease_id, status)
  - ledger_balances (due_date, status)

CACHING:
  - Cache aggregated balances (5 min TTL)
  - Invalidate on ledger posting
```

---

## **PHASE 10: ACH & Payment Export (Week 23-24)**

### **Purpose**
Generate ACH batches and NACHA files for bank processing

### **Components**

```yaml
DATABASE:
  - ach_batches table

SERVICE:
  File: app/ach/services.py
  Class: ACHBatchService
  Methods:
    - create_batch() - Select unpaid DTRs
    - generate_nacha_file() - Create bank file
    - reverse_batch() - Error correction
    - process_bank_returns() - Handle rejections

NACHA_GENERATION:
  Library: Use 'ach' Python library
  Format: NACHA fixed-width format
  Validation: Routing number checksum

API_ENDPOINTS:
  - POST /ach/batches/create
  - GET /ach/batches (list)
  - GET /ach/batches/{batch_id}
  - POST /ach/batches/{batch_id}/generate-file
  - POST /ach/batches/{batch_id}/reverse
  - GET /ach/batches/{batch_id}/download
```

### **Batch Creation Process**

```yaml
STEP_1: Filter DTRs
  - Status: UNPAID
  - Payment Type: ACH
  - Valid bank info (routing + account number)

STEP_2: Create Batch
  - Generate batch_number (YYMM-NNN format)
  - Set effective_date (next business day)
  - Store batch record

STEP_3: Link DTRs
  - Update DTRs with ach_batch_number
  - Set payment_status = PROCESSING

STEP_4: Generate NACHA File
  - File Header Record
  - Batch Header Record
  - Entry Detail Records (one per driver)
  - Batch Control Record
  - File Control Record

STEP_5: Save File
  - Save to S3
  - Store reference in batch record

STEP_6: Download & Submit
  - Staff downloads file
  - Uploads to bank portal
```

### **NACHA File Format**
```yaml
RECORD_TYPES:
  1. File Header (Type 1)
  2. Batch Header (Type 5)
  3. Entry Detail (Type 6) - One per payment
  4. Batch Control (Type 8)
  5. File Control (Type 9)

TRANSACTION_CODE: 22 (Checking Credit/Deposit)

VALIDATION:
  - Routing number: 9 digits + checksum
  - Account number: Up to 17 digits
  - Amounts in cents (no decimals)
```

### **Batch Reversal**
```yaml
USE_CASE: Errors found before bank processing

PROCESS:
  1. Confirm reversal
  2. Set batch status = REVERSED
  3. Update all DTRs: ach_batch_number = NULL
  4. Set DTRs payment_status = UNPAID
  5. DTRs now available for new batch

NOTE: Bank-level reversals (after processing) require separate bank return workflow
```

---

# **6. INTEGRATION GUIDELINES**

## **6.1 Integration Points**

```yaml
EXISTING_SYSTEMS:
  - drivers/ (Driver management)
  - vehicles/ (Vehicle management)
  - medallions/ (Medallion management)
  - leases/ (Lease management)
  - bpm/ (Business process management)

FOREIGN_KEY_RELATIONSHIPS:
  ledger_postings:
    - driver_id → drivers.id
    - lease_id → leases.id
    - vehicle_id → vehicles.id
    - medallion_id → medallions.id
  
  curb_trips:
    - driver_id → drivers.id
    - medallion_id → medallions.id
    - lease_id → leases.id
  
  driver_loans:
    - driver_id → drivers.id
    - lease_id → leases.id

NO_MODIFICATIONS_TO_EXISTING_TABLES:
  - Do not alter existing schemas
  - All new data in payment engine tables
  - Reference existing records via foreign keys
```

## **6.2 Service Layer Pattern**

```yaml
STRUCTURE:
  app/
    ledger/
      models.py          # SQLAlchemy models
      services.py        # Business logic
      router.py          # API endpoints
      schemas.py         # Pydantic schemas
      validators.py      # Validation rules
      tests/             # Unit tests
    
    curb/
      [same structure]
    
    ezpass/
      [same structure]

DEPENDENCY_INJECTION:
  - Use FastAPI Depends()
  - Database session via get_db()
  - Current user via get_current_user()
  - Audit tracking automatic

EXAMPLE:
  @router.post("/obligations")
  def create_obligation(
      request: CreateObligationRequest,
      db: Session = Depends(get_db),
      current_user: User = Depends(get_current_user)
  ):
      service = LedgerService()
      balance = service.create_obligation(
          db=db,
          created_by=current_user.id,
          **request.dict()
      )
      return balance
```

## **6.3 Error Handling**

```yaml
EXCEPTION_TYPES:
  - ValidationError: Business rule violations
  - DatabaseError: DB operation failures
  - IntegrationError: External API failures
  - ReconciliationError: Balance mismatches

RESPONSE_FORMAT:
  {
    "error": "ERROR_CODE",
    "message": "Human-readable message",
    "details": { ... },
    "timestamp": "ISO-8601"
  }

HTTP_STATUS_CODES:
  - 400: Validation errors
  - 404: Resource not found
  - 409: Conflict (e.g., duplicate)
  - 500: Server error
  - 503: External service unavailable
```

---

# **7. TESTING REQUIREMENTS**

## **7.1 Testing Strategy**

```yaml
UNIT_TESTS:
  Coverage: 90%+ required
  Focus:
    - Business logic in services
    - Calculation accuracy
    - Validation rules
  Tools: pytest, pytest-cov

INTEGRATION_TESTS:
  Focus:
    - API endpoints
    - Database operations
    - Service interactions
  Tools: pytest, TestClient

END_TO_END_TESTS:
  Focus:
    - Complete workflows (CURB import → Ledger posting → DTR generation)
    - Payment hierarchy allocation
    - Multi-step processes
  Tools: pytest, database fixtures

PERFORMANCE_TESTS:
  Focus:
    - Query performance (<200ms)
    - Batch operations (1000+ records)
    - Concurrent access
  Tools: locust, pytest-benchmark
```

## **7.2 Test Cases by Phase**

```yaml
PHASE_1_LEDGER:
  - Create posting (DEBIT/CREDIT)
  - Create obligation with balance
  - Apply payment to balance
  - Payment hierarchy order correct
  - FIFO within category
  - Balance calculations accurate
  - Void posting creates reversal
  - Concurrent postings handled safely

PHASE_2A_CURB:
  - API client fetches trips
  - Driver mapping 100% accurate
  - Medallion mapping 100% accurate
  - Lease mapping correct
  - Earnings posted to ledger
  - Taxes posted separately
  - Import history tracked

PHASE_2B_EZPASS:
  - CSV parsing correct
  - Plate to vehicle mapping
  - Time-window matching works
  - Confidence scoring accurate
  - Manual assignment works
  - Tolls posted to ledger

PHASE_8_DTR:
  - DTR generated for all active leases
  - Co-leasees get separate DTRs
  - Earnings calculated correctly
  - Payment hierarchy applied
  - All sections populated
  - PDF generated
  - Net amount correct
  - Reconciles with ledger 100%
```

## **7.3 Test Data**

```yaml
FIXTURES:
  - Sample drivers with TLC licenses
  - Sample vehicles with plates
  - Sample medallions
  - Sample active leases
  - Sample CURB trips
  - Sample EZPass tolls
  - Sample PVB violations

DATABASE_SETUP:
  - Use pytest fixtures
  - Fresh database per test class
  - Rollback after each test
  - Seed with reference data
```

---

# **8. GLOSSARY**

```yaml
ACH: Automated Clearing House - Electronic bank transfer system
BAT: Big Apple Taxi - The company
CAB_NUMBER: Medallion number (from CURB API)
CBDT: Central Business District Toll
CC_EARNINGS: Credit Card earnings (deposited to BAT)
CO_LEASE: Lease shared by 2+ driver managers
CURB: Third-party trip management system
DEBIT: Ledger posting that increases obligation
CREDIT: Ledger posting that reduces obligation
DOF: Department of Finance (NYC)
DOV: Driver-Owned Vehicle lease type
DTR: Driver Transaction Receipt - Weekly payment statement
EZPASS: Electronic toll collection system
FIFO: First In First Out - Oldest obligations paid first
HACK_LICENSE: TLC Hack License number (driver identifier)
LEDGER: Central financial transaction record system
MTA: Metropolitan Transportation Authority
NACHA: National Automated Clearing House Association
PAYMENT_HIERARCHY: Order in which earnings allocated to obligations
PAYMENT_PERIOD: Weekly period (Sunday 00:00 - Saturday 23:59)
PRORATION: Partial fee for incomplete week
PVB: Parking Violations Bureau
SLA: Service Level Agreement
TIF: Taxi Improvement Fund
TLC: Taxi & Limousine Commission (NYC)
TLC_LICENSE: Taxi license number (same as Hack License)
```

---

# **9. CRITICAL REMINDERS FOR FUTURE DEVELOPMENT**

```yaml
REMEMBER:
  1. LEDGER_FIRST: Everything posts to ledger before appearing in DTR
  
  2. LEASE_CENTRIC: Every transaction tied to specific lease
  
  3. IMMUTABILITY: Never delete postings, only void with reversal
  
  4. HIERARCHY_STRICT: Payment order is non-negotiable (except interim payments)
  
  5. CURB_FOUNDATION: EZPass/PVB matching depends on CURB data being imported first
  
  6. TIME_WINDOW: ±30 minutes for toll/violation matching
  
  7. CONFIDENCE_THRESHOLD: 0.90 auto-accept, 0.50 manual review
  
  8. DOUBLE_ENTRY: Every DEBIT needs offsetting CREDIT eventually
  
  9. SUNDAY_PROCESSING: All weekly batches run Sunday 05:00 AM
  
  10. AUDIT_TRAIL: Every posting tracks created_by, posted_by, timestamps

QUALITY_GATES:
  ✅ All database migrations successful
  ✅ Unit tests passing (90%+ coverage)
  ✅ Integration tests passing
  ✅ Manual QA completed
  ✅ Code review approved
  ✅ Documentation updated
  ✅ Stakeholder sign-off

NEVER:
  ❌ Skip Phase 0 (Requirements Clarification)
  ❌ Start coding before Phase 1 (Ledger) is complete
  ❌ Bypass payment hierarchy (except interim payments)
  ❌ Delete ledger postings (void instead)
  ❌ Modify existing system tables
  ❌ Hardcode business rules (use configuration)
```

---

# **DOCUMENT VERSION CONTROL**

```yaml
Version: 1.0
Date: October 2025
Status: APPROVED FOR DEVELOPMENT
Last Updated: 2025-10-26
Next Review: After Phase 0 completion

Changes from v0.9:
  - Added Phase 0 requirements clarification
  - Clarified co-leasing support
  - Added time-window matching algorithm details
  - Expanded testing requirements
  - Added integration guidelines
```

---

**END OF DOCUMENT**

This documentation should now be saved to your project knowledge. In future conversations, simply reference "Payment Engine Master Implementation Guide" and I (or any AI assistant) will have complete context to help with any phase of development.