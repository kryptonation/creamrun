# BIG APPLE TAXI FLEET MANAGEMENT SYSTEM
## Comprehensive Module Documentation

---

## TABLE OF CONTENTS

1. [CURB Module](#1-curb-module)
2. [EZPass Module](#2-ezpass-module)
3. [PVB Module](#3-pvb-module)
4. [Driver Loan Module](#4-driver-loan-module)
5. [Interim Payments Module](#5-interim-payments-module)
6. [Miscellaneous Charges Module](#6-miscellaneous-charges-module)
7. [Vehicle Repairs Module](#7-vehicle-repairs-module)
8. [TLC Violations Module](#8-tlc-violations-module)
9. [Centralized Ledger System](#9-centralized-ledger-system)
10. [DTR Generation Module](#10-dtr-generation-module)
11. [Current Balances Module](#11-current-balances-module)
12. [Driver Payments Module](#12-driver-payments-module)

---

## 1. CURB MODULE

### Overview
The CURB module serves as the primary integration point for fetching, processing, and reconciling driver earnings from CURB Mobility Taxi Fleet Web Services. It acts as the "Earnings" source for the Centralized Ledger System.

### Purpose
Automate the complete lifecycle of credit card trip earnings data from CURB's SOAP API into BAT Connect's financial system.

### Key Components

#### Data Model
**CurbTrip Table**
- `curb_trip_id`: Unique identifier from CURB system
- `status`: UNRECONCILED, RECONCILED, POSTED_TO_LEDGER
- `driver_id`, `lease_id`, `vehicle_id`, `medallion_id`: Foreign keys linking to BAT entities
- Financial fields: fare, tips, tolls, taxes (stored as Decimal for accuracy)
- `payment_type`: Cash, Credit Card, etc.

### Workflow

#### 1. Data Ingestion
- Periodically fetches trip and transaction data from CURB's SOAP API
- API endpoint: Taxi Fleet Web Services Version 6.3

#### 2. Normalization & Mapping
- Parses raw XML data from CURB
- Normalizes data into standard format
- Links to corresponding Driver, Medallion, Vehicle, and Lease records

#### 3. Storage
- Persists enriched data into `curb_trips` table
- Maintains data integrity with status tracking

#### 4. Reconciliation
- Communicates back to CURB to mark records as "reconciled"
- Prevents duplicate processing

#### 5. Ledger Posting
- Weekly schedule posts net credit card earnings
- Creates CREDIT entries in Centralized Ledger
- Automatically applied against outstanding obligations

### API Endpoints
```
POST /curb/fetch-trips
GET /curb/trips
GET /curb/trips/{trip_id}
POST /curb/reconcile
```

### Integration Flow
```
CURB SOAP API 
    ↓
Data Fetch (Async Task)
    ↓
XML Parsing & Normalization
    ↓
Database Storage (curb_trips)
    ↓
Driver/Vehicle/Lease Mapping
    ↓
Status: UNRECONCILED → RECONCILED
    ↓
Weekly Batch: POSTED_TO_LEDGER
    ↓
Centralized Ledger (CREDIT Entry)
```

### Error Handling
Custom exceptions:
- `CurbApiError`: API communication failures
- `ReconciliationError`: Reconciliation process failures
- `DataMappingError`: Entity linking failures
- `TripProcessingError`: Ledger posting errors

### Business Rules
1. Only credit card transactions generate ledger credits
2. Cash transactions tracked separately
3. Weekly posting occurs Sunday 5:00 AM
4. Duplicate prevention via `curb_trip_id`
5. All financial amounts use Decimal type for precision

---

## 2. EZPASS MODULE

### Overview
The EZPass module automates the complete lifecycle of processing EZPass toll violations from CSV files, serving as a critical source of financial obligations fed into the Centralized Ledger.

### Purpose
Process toll transactions, associate them with drivers via vehicle/trip matching, and post obligations to the ledger.

### Data Model

#### EZPassImport Table
- Tracks batch CSV file uploads
- Import status and metadata
- Validation results

#### EZPassTransaction Table
- `transaction_id`: Unique toll transaction identifier
- `status`: IMPORTED, ASSOCIATED, ASSOCIATION_FAILED, POSTED_TO_LEDGER
- `plate_number`: Vehicle plate for matching
- `transaction_datetime`: Toll occurrence timestamp
- `amount`: Toll charge (Decimal)
- `vehicle_id`, `driver_id`, `lease_id`, `medallion_id`: Associated entities

### Workflow

#### 1. File Upload
- User uploads daily EZPass CSV via `/trips/ezpass/upload-csv`
- CSV format validated immediately

#### 2. Initial Ingestion
- Creates parent record in `ezpass_imports` table
- Parses each CSV row
- Creates `ezpass_transactions` with status IMPORTED
- Validates data types (dates, amounts)
- API returns quickly after saving raw data

#### 3. Asynchronous Association (Celery Task)
Background worker (`associate_ezpass_transactions_task`):
- Queries all IMPORTED transactions
- For each transaction:
  - Identifies Vehicle by `plate_number`
  - Searches `curb_trips` table for matching trip
  - Time window: ±30 minutes of toll timestamp
  - Links to `driver_id`, `lease_id`, `medallion_id`
  - Updates status to ASSOCIATED or ASSOCIATION_FAILED

#### 4. Ledger Posting
- Posted as DEBIT obligations
- Category: EZPASS
- Links to driver's outstanding balances

### Association Logic
```
EZPass Transaction (Plate, DateTime)
    ↓
Find Vehicle by Plate
    ↓
Query curb_trips WHERE:
  - vehicle_id = Vehicle.id
  - trip_time within ±30min of toll_time
    ↓
Extract Driver, Lease, Medallion from Trip
    ↓
Status = ASSOCIATED
```

### API Endpoints
```
POST /trips/ezpass/upload-csv
GET /trips/ezpass/transactions
GET /trips/ezpass/transactions/{id}
POST /trips/ezpass/retry-association
```

### Business Rules
1. All outstanding tolls appear in DTR, not just current week
2. Duplicate elimination by transaction ID
3. Late postings from EZPass still captured
4. Prior balance carries forward
5. Driver allocation via CURB trip matching

### Error Handling
- Association failures logged with reason
- Failed transactions flagged for manual review
- Retry mechanism available

---

## 3. PVB MODULE

### Overview
The Parking Violations Bureau (PVB) module manages parking and traffic violations from the Department of Finance (DOF), supporting both automated CSV imports and manual BPM-driven entry workflows.

### Purpose
Capture, process, and post parking violations as financial obligations in the Centralized Ledger.

### Data Model

#### PVBImport Table
- Batch file tracking
- Import statistics
- Validation results

#### PVBViolation Table
- `summons`: Unique violation identifier
- `status`: IMPORTED, ASSOCIATED, POSTED_TO_LEDGER, ASSOCIATION_FAILED
- `plate`, `state`: Vehicle identification
- `issue_date`, `issue_time`: Violation occurrence
- `fine`, `penalty`, `interest`, `reduction`: Financial components
- `amount_due`: Total payable (Decimal)
- Entity links: driver_id, lease_id, vehicle_id, medallion_id

### Dual Workflow Support

#### A. CSV Import Lifecycle
1. **File Upload**: POST `/trips/pvb/upload-csv`
2. **Ingestion**: Parse CSV, create PVBImport and PVBViolation records
3. **Async Association** (Celery):
   - Find Vehicle by plate number
   - Search curb_trips around violation datetime (±2 hour window)
   - Link driver, lease, medallion
   - Status → ASSOCIATED
4. **Ledger Posting** (Celery):
   - Create DEBIT obligation
   - Category: PVB
   - Status → POSTED_TO_LEDGER

#### B. Manual Entry (BPM) Lifecycle
1. **Case Creation**: POST `/trips/pvb/create-case` (prefix: CRPVB)
2. **Search Vehicle**: User enters plate, system finds vehicle
3. **Enter Details**: Complete violation form with validation
4. **Attach Proof**: Upload supporting documentation
5. **Confirm**: Review and submit
6. **Auto-post**: Immediately associates and posts to ledger

### Association Logic
```
PVB Violation (Plate, Issue DateTime)
    ↓
Find Vehicle by Plate via VehicleRegistration
    ↓
Query curb_trips WHERE:
  - vehicle_id matches
  - trip occurred within ±2 hours
    ↓
Extract Driver, Lease, Medallion
    ↓
Status = ASSOCIATED → Post to Ledger
```

### API Endpoints
```
POST /trips/pvb/upload-csv
POST /trips/pvb/create-case
GET /trips/pvb/violations
GET /trips/pvb/violations/{id}
PUT /trips/pvb/violations/{id}
```

### BPM Flow Steps
1. **Step 301**: Search Vehicle (fetch)
2. **Step 302**: Search Vehicle (process)
3. **Step 304**: Enter Details (fetch)
4. **Step 305**: Enter Details (process)
5. **Step 306**: Attach Proof (process)
6. **Step 307**: Confirm (fetch)

### Business Rules
1. All outstanding violations in DTR regardless of issue week
2. 2.5% processing fee applied to base fine
3. Duplicate prevention by summons number
4. TLC license attribution for driver responsibility
5. Consolidated view in DTR (single/multiple drivers)

### Data Fields
- **Plate**: License plate (required)
- **State**: Two-letter state code (required)
- **Type**: Violation type code (required)
- **Summons**: Unique ticket number (required)
- **Issue Date**: Violation date (required, ISO format)
- **Issue Time**: Optional, HHMM format with A/P indicator
- **Fine**: Base penalty amount (required, > 0)
- **Penalty**: Additional penalty (optional, default 0)
- **Interest**: Accrued interest (optional, default 0)
- **Reduction**: Applied reduction (optional, default 0)

---

## 4. DRIVER LOAN MODULE

### Overview
The Driver Loans module manages the full lifecycle of personal loans extended to drivers, including structured repayment schedules, interest calculations, and systematic reconciliation through weekly DTRs.

### Purpose
Provide financial support to drivers while ensuring structured, transparent loan recovery through weekly installments integrated with the Centralized Ledger.

### Data Model

#### DriverLoan Table (Master Record)
- `loan_id`: Format DLNYYYY-### (system-generated)
- `principal_amount`: Original loan amount (Decimal)
- `annual_interest_rate`: Percentage (Decimal, default 0%)
- `loan_date`: Disbursement date
- `start_week`: First repayment week (must be Sunday)
- `status`: DRAFT, OPEN, CLOSED, HOLD, CANCELLED
- Entity links: driver_id, lease_id, medallion_id, vehicle_id

#### LoanInstallment Table (Schedule Rows)
- `installment_id`: Unique identifier per weekly payment
- `week_start_date`, `week_end_date`: Payment period (Sunday-Saturday)
- `principal_amount`: Weekly principal from repayment matrix
- `interest_amount`: Calculated daily accrual interest
- `total_due`: Principal + Interest
- `status`: SCHEDULED, DUE, POSTED, PAID

### Loan Repayment Matrix (Principal Only)

| Loan Amount | Weekly Principal Installment |
|-------------|------------------------------|
| $0 - $200 | Paid in full (single installment) |
| $201 - $500 | $100 per week |
| $501 - $1,000 | $200 per week |
| $1,001 - $3,000 | $250 per week |
| > $3,000 | $300 per week |

### Interest Calculation

```
Interest = Outstanding Principal × (Annual Interest Rate % / 100) × (Accrual Days / 365)
Total Due = Principal Amount + Interest
```

Where:
- **Outstanding Principal**: Loan balance before installment
- **Annual Interest Rate**: Entered as percentage (e.g., 10 = 10%)
- **Accrual Days**: Days between loan date (or last installment) and due date
- **Principal Amount**: From Loan Repayment Matrix

### UI Workflow

#### Step 1: Identify Driver & Lease
- Enter TLC License Number
- System retrieves driver profile and associated medallions/leases
- Select relevant Medallion/Lease ID

#### Step 2: Enter Loan Details
- Loan Amount (Principal): ≥ $1
- Annual Interest Rate (%): Default 0% for trusted drivers
- Purpose/Notes: Optional description
- Start Week: Calendar dropdown (Sundays only)

#### Step 3: Generate & Confirm Payment Schedule
- System applies Loan Repayment Matrix
- Calculates interest per installment
- Displays schedule with:
  - Installment ID
  - Week Start/End dates
  - Principal Amount
  - Interest Amount
  - Total Due
  - Remaining Balance
- Staff reviews and confirms

#### Step 4: Schedule Storage
- Loan Master record created
- Loan Schedule rows generated
- Installments initially in SCHEDULED state

#### Step 5: Ledger Posting
Every Sunday 5:00 AM:
- Installments with started Payment Period marked POSTED
- Ledger Posting Reference created
- Ledger_Balances updated

#### Step 6: DTR Representation
DTR shows:
- This Week's Deduction (Total Due posted)
- Prior Balance (unpaid from earlier weeks)
- Remaining Balance (principal outstanding)
- Optional: Original Loan Amount, Interest Rate, Total Paid Till Date

### Lifecycle States

**Loan Master**:
```
DRAFT → OPEN → (HOLD) → CLOSED
   ↘ CANCELLED (if voided before postings)
```

**Loan Installments**:
```
SCHEDULED → DUE → POSTED → PAID
```

### API Endpoints
```
POST /payments/driver-loans/create-case
POST /payments/driver-loans
GET /payments/driver-loans
GET /payments/driver-loans/{loan_id}
GET /payments/driver-loans/export
```

### Validation Rules
1. Mandatory fields: Loan Amount, Interest Rate, Start Week
2. Driver & Lease linkage required
3. Unique Loan ID per loan
4. Loan Amount ≥ $1
5. Interest Rate as percentage (system divides by 100)
6. Start Week must align to Sunday Payment Period
7. Loan Amount equals total Principal across installments
8. Posted installments immutable (adjustments via credits/reversals)

### Examples

**Example 1: 0% Interest Loan**
- Loan Amount: $1,200
- Interest Rate: 0%
- Loan Date: Oct 1 (Wednesday)
- First Due: Oct 5 (Sunday) → 4 accrual days
- Weekly Principal: $250
- Installment: Principal $250, Interest $0, Total $250

**Example 2: 10% Interest, Mid-week Loan**
- Loan Amount: $1,200
- Interest Rate: 10%
- Loan Date: Oct 1 (Wednesday)
- First Due: Oct 5 (Sunday) → 4 days
- Weekly Principal: $250
- Interest: 1200 × (10/100) × (4/365) ≈ $1.32
- Installment: Principal $250, Interest $1.32, Total $251.32

**Example 3: Larger Loan, Full Week**
- Loan Amount: $3,000
- Interest Rate: 12%
- Loan Date: Oct 5 (Sunday)
- First Due: Oct 12 (Sunday) → 7 days
- Weekly Principal: $300
- Interest: 3000 × (12/100) × (7/365) ≈ $6.90
- Installment: Principal $300, Interest $6.90, Total $306.90

---

## 5. INTERIM PAYMENTS MODULE

### Overview
The Interim Payments module provides a dedicated workflow for processing ad-hoc payments made by drivers outside the regular weekly DTR cycle, allowing immediate reduction of outstanding balances.

### Purpose
Enable drivers to make direct payments (cash, check, ACH) at the BAT front desk, with manual allocation to specific obligations and real-time ledger updates.

### Key Principles
1. **BPM-Driven Workflow**: Every interim payment tracked via BPM case (prefix: INTPAY)
2. **Ledger as Source of Truth**: All interactions through LedgerService, creating CREDIT postings
3. **Manual Allocation**: Cashier can allocate to specific obligations
4. **Smart Default**: Excess automatically applied to Lease balance
5. **Real-Time Updates**: Ledger_Balances updated immediately
6. **Full Auditability**: Creates InterimPayment, LedgerPosting, and AuditTrail records

### Workflow

#### Step 1: Capture Payment at Front Desk
- Payment captured against Driver (TLC License)
- System retrieves all associated medallions/leases
- Cashier selects relevant medallion
- System displays open obligations from Ledger_Balances

#### Step 2: Payment Allocation
Cashier chooses:
- **Category**: Lease, Repair, Loan, EZPass, PVB, Misc
- **Specific Line Item**: From open Ledger_Balances
- **Payment Amount**: Actual payment received
- **Payment Method**: Cash, Check, ACH

#### Step 3: Storage
- Raw payment recorded in `interim_payments` table
- Allocation posted to `ledger_postings` (CREDIT)
- Reduces chosen `ledger_balances` entry

### Data Model

#### InterimPayment Table
- `payment_id`: Unique identifier
- `case_no`: BPM case reference (INTPAY prefix)
- `driver_id`, `lease_id`: Entity links
- `payment_amount`: Total payment (Decimal)
- `payment_method`: CASH, CHECK, ACH
- `payment_date`: Transaction timestamp
- `allocation_category`: LEASE, REPAIR, LOAN, EZPASS, PVB, MISC
- `allocated_amount`: Amount applied to specific obligation
- `excess_amount`: Unallocated amount (auto-applied to Lease)

### Payment Hierarchy (Bypassed)
Unlike weekly earnings application, interim payments allow targeted allocation:
- User can choose specific obligation
- Excess automatically applied to Lease
- Partial payments allowed
- Obligation remains open until fully cleared

### Ledger Integration

```
Interim Payment Received
    ↓
Create InterimPayment Record
    ↓
Create CREDIT LedgerPosting
    ↓
Update Ledger_Balances (reduce balance)
    ↓
If excess exists → Apply to Lease
    ↓
Generate Receipt (not in DTR)
```

### API Endpoints
```
POST /payments/interim-payments/create-case
POST /payments/interim-payments
GET /payments/interim-payments
GET /payments/interim-payments/{id}
POST /payments/interim-payments/allocate
```

### Business Rules
1. Payments captured against driver with active lease
2. System retrieves all medallions/leases for selection
3. Cashier allocates to specific obligation category
4. Partial payments allowed; obligation stays open
5. Excess payments automatically applied to Lease
6. Interim payments do NOT appear in DTR
7. Immediately reduce Ledger_Balances
8. Standalone receipt issued at payment time
9. No impact on weekly earnings application hierarchy

### Receipt Generation
Upon payment confirmation:
- Receipt ID generated
- Driver name, TLC License
- Payment amount, method, date
- Allocation details (category, specific obligation)
- Updated balance
- Front-desk staff signature

### Reconciliation
At DTR generation:
- System pulls from Ledger_Balances
- Prior interim payments already reflected as reduced balances
- DTR shows net outstanding amounts
- Full audit trail via ledger postings

---

## 6. MISCELLANEOUS CHARGES MODULE

### Overview
The Miscellaneous Charges module manages additional one-time operational or penalty-related charges not covered by dedicated modules (EZPass, PVB, TLC, Repairs, Loans).

### Purpose
Ensure accurate recording and recovery of ad-hoc operational expenses, maintaining financial transparency through integration with the Centralized Ledger.

### Scope
Miscellaneous charges are distinct from:
- EZPass tolls
- PVB/Parking violations
- TLC regulatory fines
- Vehicle repairs
- Driver loans

### Data Model

#### MiscellaneousCharge Table
- `charge_id`: Unique identifier
- `driver_id`, `lease_id`, `vehicle_id`: Entity links (auto-derived)
- `category`: Dropdown selection
- `description`: Charge details (max 500 chars)
- `amount`: Charge amount (Decimal, required > 0)
- `charge_date`: Date of occurrence
- `due_date`: When charge is due (defaults to next DTR)
- `status`: PENDING, POSTED, PAID
- `posting_reference`: Link to ledger posting

### Charge Categories
Common categories include:
- Lost Key Fee
- Cleaning Fee
- Late Return Fee
- Administrative Fee
- Chargeback
- Car Wash
- Miscellaneous Charge
- Other (specify in description)

### UI Fields & Rules

| Field | Required | Description/Rules |
|-------|----------|-------------------|
| Driver (TLC License) | Yes | Select driver; must have active lease |
| Lease ID | Auto | Derived from driver's current active lease |
| Vehicle | Auto | Derived from Lease → Vehicle assignment |
| Category | Yes | Dropdown selection |
| Description | No | Free text, max 500 characters |
| Amount | Yes | Must be ≥ $1.00 |
| Charge Date | Yes | Date charge incurred |
| Due Date | Auto | Defaults to next DTR period |

### Workflow

#### Step 1: Create Charge
- User selects driver via TLC License
- System auto-populates Lease ID and Vehicle
- User enters category, description, amount
- System validates amount > 0
- Charge Date entered
- Due Date auto-set or manually adjusted

#### Step 2: Posting to Ledger
- Charge saved with status PENDING
- Automatic or manual trigger posts to ledger
- Creates DEBIT obligation in Centralized Ledger
- Category: MISC
- Status → POSTED

#### Step 3: DTR Recovery
- Posted charges appear in next DTR
- Listed under "Miscellaneous Charges"
- Full amount recovered in single DTR cycle
- No installment splitting

#### Step 4: Payment Application
- Weekly earnings applied per hierarchy
- MISC is lowest priority (after all other obligations)
- Once paid, status → PAID
- Ledger balance cleared

### Payment Hierarchy Position
```
1. TAXES (Highest Priority)
2. EZPASS
3. LEASE
4. PVB
5. TLC
6. REPAIRS
7. LOANS
8. MISC (Lowest Priority)
```

### API Endpoints
```
POST /payments/misc-expenses
GET /payments/misc-expenses
GET /payments/misc-expenses/{id}
PUT /payments/misc-expenses/{id}
DELETE /payments/misc-expenses/{id} (only if PENDING)
POST /payments/misc-expenses/{id}/post-to-ledger
```

### Validation Rules
1. Driver must have an active lease
2. Amount must be > $0
3. Charge Date cannot be in the future
4. Category must be from predefined list
5. Description recommended but not mandatory
6. Once posted to ledger, cannot be deleted (only voided/reversed)
7. Full amount recovered in single DTR cycle

### Business Rules
1. One-time charges, not recurring
2. Applied to driver's active lease account
3. Recovered in full during next DTR
4. Lowest priority in payment hierarchy
5. No installment plans (unlike Repairs/Loans)
6. Immediate ledger posting upon creation
7. Visible in DTR under "Misc Charges" line item

### Example Scenarios

**Scenario 1: Lost Key Fee**
- Driver loses vehicle key
- Front desk creates charge:
  - Category: Lost Key Fee
  - Amount: $75.00
  - Description: "Replacement key cost"
- Charge posted to ledger immediately
- Appears in next DTR, recovered from earnings

**Scenario 2: Late Return Fee**
- Vehicle returned 2 hours late
- Charge created:
  - Category: Late Return Fee
  - Amount: $50.00
  - Description: "2 hours late return penalty"
- Posted to ledger
- Deducted in next DTR

**Scenario 3: Car Wash**
- Monthly car wash service
- Charge created:
  - Category: Car Wash
  - Amount: $25.00
  - Description: "Monthly vehicle cleaning"
- Posted to ledger
- Recovered in next DTR

---

## 7. VEHICLE REPAIRS MODULE

### Overview
The Vehicle Repairs module manages the complete lifecycle of vehicle repair expenses charged to drivers, from invoice capture to structured weekly repayment and ledger reconciliation.

### Purpose
Prevent large repair costs from overwhelming driver weekly earnings while ensuring BAT recovers expenses reliably through structured installment plans.

### Data Model

#### RepairInvoice Table (Master Record)
- `repair_id`: Format RPR-YYYY-##### (system-generated)
- `invoice_number`: Vendor invoice identifier
- `invoice_date`: Date invoice issued
- `workshop_type`: BIG_APPLE or EXTERNAL
- `total_amount`: Total repair cost (Decimal)
- `repair_description`: Work performed (max 500 chars)
- `status`: DRAFT, OPEN, CLOSED, IN_DISPUTE
- Entity links: driver_id, lease_id, vehicle_id, medallion_id

#### RepairInstallment Table (Schedule Rows)
- `installment_id`: Format {RepairID}-{Seq}
- `week_start_date`, `week_end_date`: Payment period (Sunday-Saturday)
- `principal_amount`: Weekly installment from payment matrix
- `prior_balance`: Carried forward unpaid amount
- `balance`: Remaining after current installment
- `ledger_posting_ref`: Link to ledger posting
- `status`: SCHEDULED, DUE, POSTED, PAID

### Repair Payment Matrix

| Invoice Amount | Weekly Installment |
|----------------|-------------------|
| $0 - $200 | Paid in full (single installment) |
| $201 - $500 | $100 per week |
| $501 - $1,000 | $200 per week |
| $1,001 - $3,000 | $250 per week |
| > $3,000 | $300 per week |

### UI Workflow

#### Step 1: Identify Driver & Lease
- Enter TLC License Number
- System retrieves driver profile and medallion/lease accounts
- Select relevant Medallion/Lease ID

#### Step 2: Upload & Enter Repair Invoice
- Upload invoice (PDF/image)
- OCR captures key details:
  - Invoice Number
  - Invoice Date
  - Repair Amount
- Staff reviews/edits OCR results
- Complete remaining fields:
  - Workshop Type (Big Apple/External)
  - Repair Description/Notes
- VIN, Plate, Medallion, Hack License auto-linked from Step 1

#### Step 3: Generate & Confirm Payment Schedule
- System applies Repair Payment Matrix
- Staff selects Start Week:
  - **Current Payment Period**: First installment in upcoming Sunday DTR
  - **Next Payment Period**: First installment in following Sunday DTR
- System generates schedule showing:
  - Installment IDs
  - Week Start/End dates
  - Installment Amounts
  - Running balance
- Staff reviews and confirms

#### Step 4: Schedule Storage
- Invoice Master created
- Repair Payment Schedule rows generated
- Installments initially in SCHEDULED state

#### Step 5: Ledger Posting
Every Sunday 5:00 AM:
- Installments with started Payment Period marked POSTED
- Written to Ledger_Postings (DEBIT)
- Ledger Posting Reference created
- Ledger_Balances updated
- Balance reduced accordingly each week

#### Step 6: DTR Representation
DTR pulls from Ledger_Balances (not directly from schedule):
- This Week's Deduction (Installment Posted)
- Prior Balance (unpaid installments from earlier weeks)
- Remaining Balance
- Optional: Original Invoice Amount, Total Paid Till Date

### Lifecycle States

**RepairInvoice**:
```
DRAFT → OPEN → CLOSED
   ↓
IN_DISPUTE (blocks further postings)
```

**RepairInstallment**:
```
SCHEDULED → DUE → POSTED → PAID
```

### API Endpoints
```
POST /payments/repairs/create-case
POST /payments/repairs
GET /payments/repairs
GET /payments/repairs/{repair_id}
GET /payments/repairs/export
PUT /payments/repairs/{repair_id}/status
```

### Validation Rules

**Invoice-Level**:
1. Mandatory: Invoice Number, Invoice Date, Workshop Type, Repair Amount
2. VIN, Plate, Medallion, Hack License auto-linked
3. Unique Invoice Number per vehicle/date
4. Total Amount = Sum of all installments
5. Start Week aligns to valid Payment Period

**Payment Schedule**:
1. Installments follow matrix rules except final (adjusted)
2. Unique Installment ID linked to parent Repair ID
3. Period Alignment: Week Start = Sunday 00:00, End = Saturday 23:59
4. No gaps/overlaps in installment periods
5. Balance accuracy: Balance = Amount - Sum(Payments Till Date)

**Ledger Posting**:
1. Posted only when Payment Period arrived (Sunday 5:00 AM)
2. 1:1 mapping between Installment ID and Ledger Posting ID
3. Total Repairs postings must match DTR Repairs deductions
4. Once posted, immutable (adjustments via credit/reversal)

### Example

**Repair Invoice**: $1,200 (External Workshop), logged Wednesday Oct 1
**Payment Matrix**: $250/week (since $1,001-$3,000)
**Start Week**: Current Week

**Generated Payment Schedule** (Repair ID: RPR-2025-012):

| Installment ID | Week Start | Week End | Amount | Status |
|---------------|-----------|----------|---------|---------|
| RPR-2025-012-01 | Sep 28 | Oct 4 | $250 | Posted (Oct 5) |
| RPR-2025-012-02 | Oct 5 | Oct 11 | $250 | Scheduled |
| RPR-2025-012-03 | Oct 12 | Oct 18 | $250 | Scheduled |
| RPR-2025-012-04 | Oct 19 | Oct 25 | $250 | Scheduled |
| RPR-2025-012-05 | Oct 26 | Nov 1 | $200 | Scheduled (final adjusted) |

**Posting**: First installment $250 posts to ledger Sunday Oct 5, 5:00 AM

### Business Rules
1. Repairs broken into weekly installments per matrix
2. Each installment = standalone payable in ledger
3. Only due installments (Due Date ≤ Payment Period) in DTR
4. Payment amount = installment due for week
5. Remaining balances roll forward automatically
6. Installments flow to Ledger when Payment Period arrives
7. DTR pulls from Ledger, not schedule directly
8. Drivers see weekly deduction; BAT tracks full details

---

## 8. TLC VIOLATIONS MODULE

### Overview
The TLC Violations module manages tickets and fines issued by the Taxi & Limousine Commission (TLC), including upload, data entry, disposition tracking, and automatic ledger posting.

### Purpose
Allow users to record TLC violations, track their dispositions, and automatically post charges to the driver's ledger for recovery through DTRs.

### Location
Navigation: Payments → TLC Tickets

### Data Model

#### TLCViolation Table
- `violation_id`: Unique identifier
- `case_no`: BPM case reference (if manual entry)
- `summons_no`: Unique ticket number
- `plate`, `state`: Vehicle identification
- `violation_type`: FI, FN, RF (see Ticket Types below)
- `description`: Violation details (required for FN type)
- `issue_date`, `issue_time`: When violation occurred
- `amount`: Base fine (Decimal)
- `service_fee`: Processing fee (Decimal)
- `total_payable`: Amount + Service Fee
- `disposition`: PAID, REDUCED, DISMISSED
- `status`: PENDING, POSTED, PAID
- Entity links: driver_id, lease_id, medallion_id, attachment_document_id

### Ticket Types & Descriptions

| Type Code | Type Name | Description Required? | Notes |
|-----------|-----------|----------------------|-------|
| FI | Failure to Inspect Vehicle | No | Single classification |
| FN | Failure to Comply with Notice | Yes | Requires selecting description from list |
| RF | Reinspection Fee | No | Fee after failed TLC inspection |

### FN Violation Descriptions
When Type = FN, select from:
- Meter Mile Run
- Defective Light
- Dirty Cab
- Other (specify)

### Workflow

#### Two-Step Process

**Step 1: Upload Ticket Scan**
- Drag & drop or browse to upload scan
- System runs OCR and pre-fills fields when possible
- User selects "Next" to proceed

**Step 2: Enter/Confirm Ticket Details**
- Review OCR results
- Complete/correct fields:
  - Summons No.
  - Medallion No.
  - Driver Name
  - Type (FI/FN/RF)
  - Description (if FN)
  - Date & Time of Occurrence
  - Total Payable
  - Disposition (Paid/Reduced/Dismissed)
- Save and submit

### UI Fields & Rules

| Field | Required | Description/Rules |
|-------|----------|-------------------|
| Summons No. | Yes | Unique ticket number; must be unique |
| Plate | Yes | Vehicle license plate |
| State | Yes | Two-letter state code |
| Type | Yes | Dropdown: FI, FN, RF |
| Description | Conditional | Required only if Type = FN |
| Issue Date | Yes | Date violation occurred |
| Issue Time | No | Time violation occurred (HHMM format) |
| Amount | Yes | Base fine amount (> 0) |
| Service Fee | No | Additional processing fee (default 0) |
| Total Payable | Auto | Amount + Service Fee |
| Disposition | Yes | Dropdown: Paid, Reduced, Dismissed |
| Attachment | Yes | Ticket scan upload mandatory |

### Ledger Posting Logic
- Violations posted immediately upon creation if disposition = PAID or REDUCED
- Creates DEBIT obligation in Centralized Ledger
- Category: TLC
- Amount: total_payable
- Links to driver, lease, medallion

### Disposition Handling
- **PAID**: Full amount posted to ledger
- **REDUCED**: Reduced amount posted to ledger
- **DISMISSED**: No ledger posting

### API Endpoints
```
POST /payments/tlc-tickets/upload
POST /payments/tlc-tickets
GET /payments/tlc-tickets
GET /payments/tlc-tickets/{id}
PUT /payments/tlc-tickets/{id}/disposition
```

### List Screen Columns
- Summons No.
- Medallion No.
- Driver Name
- Type (FI/FN/RF)
- Description (if FN)
- Date & Time of Occurrence
- Total Payable
- Disposition (Paid/Reduced/Dismissed)
- Actions (View/Edit)

### DTR Integration
**TLC Tickets Section** in DTR shows:

| Field | Source | Description |
|-------|--------|-------------|
| Date & Time | TLC violation record | When violation issued |
| Ticket Number | TLC violation record | Unique identifier |
| TLC License | TLC record | Driver responsible (if applicable) |
| Medallion | TLC violation record | Medallion number |
| Note | TLC violation record | Brief description |
| Fine | TLC violation record | Base penalty amount |
| Prior Balance | Roll-up from previous DTRs | Unpaid amounts carried forward |
| Payment | DTR calculation engine | Amount settled current period |
| Balance | DTR calculation engine | Remaining unpaid amount |

### Business Rules
1. TLC tickets are regulatory fines tied to medallion/operation
2. Shown only in main DTR (lease level)
3. NOT broken down in Additional Driver DTRs
4. All outstanding violations appear regardless of issue week
5. Duplicate prevention by ticket number
6. Late postings still captured until settled
7. TLC tickets kept separate from PVB violations
8. If tied to driver → TLC license displayed
9. If tied only to medallion → medallion shown, license may be blank

### Validation Rules
1. Summons number must be unique
2. Total Payable = Amount + Service Fee
3. Driver Auto-Link must succeed; else manual selection
4. Attachment upload mandatory during creation
5. Disposition required at creation
6. Once posted, cannot be deleted (only voided)

### Example Scenarios

**Scenario 1: Missed Inspection**
- Type: FI (Failure to Inspect Vehicle)
- Amount: $100
- Disposition: Paid
- Posted to ledger immediately
- Appears in next DTR

**Scenario 2: Meter Mile Run**
- Type: FN (Failure to Comply with Notice)
- Description: Meter Mile Run
- Amount: $150
- Service Fee: $10
- Total: $160
- Disposition: Paid
- Posted to ledger; recovered in DTR

**Scenario 3: Dismissed Violation**
- Type: FI
- Amount: $100
- Disposition: Dismissed
- NOT posted to ledger
- No DTR impact

---

## 9. CENTRALIZED LEDGER SYSTEM

### Overview
The Centralized Ledger is the authoritative financial engine providing a single source of truth for all transactions related to drivers, vehicles, and medallions in the BAT Connect system.

### Purpose
Serve as the immutable, event-based financial backbone that tracks all obligations and payments with real-time balances, full traceability, and extensible architecture.

### Core Principles
1. **Immutability**: All entries permanent; corrections via auditable reversals
2. **Event-Based Architecture**: Every business event generates distinct posting
3. **Real-Time Balances**: Instantaneous, accurate view of obligations
4. **Traceability**: Every posting/balance linked to source entity/transaction
5. **Extensibility**: Modular design for new obligation types

### Architectural Design

**Pattern**: Model → Repository → Service → Router
**Concurrency**: Fully asynchronous (async/await)
**Dependency Injection**: FastAPI's Depends() throughout

### Core Components

#### 1. LedgerPosting Table (Immutable Log)
The permanent, append-only log of every financial transaction.

**Key Fields**:
- `id`: UUID serving as unique Posting_ID
- `category`: Enum (LEASE, REPAIR, LOAN, EZPASS, PVB, TLC, TAXES, MISC)
- `amount`: Decimal (positive for DEBIT, negative for CREDIT)
- `entry_type`: Enum (DEBIT, CREDIT)
- `transaction_date`: When obligation incurred/payment made
- `posting_date`: When posted to ledger
- `period_start`, `period_end`: Weekly payment period (Sunday-Saturday)
- `description`: Human-readable explanation
- `source_type`: Origin module (curb, ezpass, pvb, etc.)
- `source_id`: FK to source record
- Entity links: driver_id, lease_id, vehicle_id, medallion_id
- `created_by`: User who created posting (audit)

**Status**: Always POSTED (immutable)

#### 2. LedgerBalance Table (Real-Time Snapshot)
Current outstanding balance per obligation.

**Key Fields**:
- `id`: Primary key
- `posting_id`: FK to originating LedgerPosting
- `category`: Same enum as LedgerPosting
- `original_amount`: Initial obligation amount
- `outstanding_balance`: Current amount owed
- `due_date`: When payment due
- `status`: OPEN, PARTIALLY_PAID, PAID, VOIDED
- Entity links: driver_id, lease_id, vehicle_id, medallion_id
- `last_payment_date`: Most recent payment timestamp
- `source_type`, `source_id`: Link back to origin

### Double-Entry Accounting

Every transaction creates offsetting entries:

```
Driver owes $100 for lease:
  DEBIT:  +$100  (Obligation)  → Balance increases

Driver earns $100 from trips:
  CREDIT: -$100  (Payment)     → Balance decreases

Net Effect: $0 balance
```

**Benefits**:
- Built-in validation (debits = credits eventually)
- Easy reconciliation
- Financial integrity guaranteed
- Industry-standard practice

### Payment Hierarchy (CRITICAL)

Payments applied in strict order:

```
1. TAXES        (Highest Priority - legally required)
2. EZPASS       (Toll obligations)
3. LEASE        (Core business revenue)
4. PVB          (Parking violations)
5. TLC          (TLC tickets)
6. REPAIRS      (Vehicle maintenance)
7. LOANS        (Driver loans)
8. MISC         (Lowest Priority)
```

**Within each category**: FIFO by due date

**Exception**: Interim payments bypass hierarchy (targeted payment)

### Business Rules

#### 1. Payment Period Validation
**Rule**: All transactions in Sunday-Saturday periods

```python
def validate_payment_period(start, end):
    # Must start on Sunday (weekday = 6)
    if start.weekday() != 6:
        raise InvalidPostingPeriodException()
    
    # Must end on Saturday (weekday = 5)
    if end.weekday() != 5:
        raise InvalidPostingPeriodException()
    
    # Must be exactly 7 days
    if (end - start).days != 6:
        raise InvalidPostingPeriodException()
```

#### 2. Immutability Rule
**Rule**: Once posted, entries CANNOT be modified/deleted

**Enforcement**:
- No UPDATE or DELETE operations
- Corrections via void + repost
- Database constraints prevent modification

**Benefits**:
- Complete audit trail
- Regulatory compliance
- Data integrity guaranteed
- Fraud prevention

#### 3. Multi-Entity Linkage
**Rule**: Every posting must link to Driver + Lease (minimum)

**Optional**: Vehicle, Medallion

**Rationale**:
- Driver: Who owes/is paid
- Lease: Financial context
- Vehicle: What vehicle incurred charge
- Medallion: Associated medallion

### Data Flow

#### Obligation Creation Flow
```
External System (EZPass, Lease, etc.)
    ↓
Import Process
    ↓
Service.create_obligation()
    ↓
1. Validate
2. Create DEBIT Posting
3. Create Balance Record
4. Commit
    ↓
Database (Immutable)
```

#### Payment Application Flow
```
CURB Earnings / Manual Payment
    ↓
Service.apply_payment_with_hierarchy()
    ↓
1. Get open balances (by hierarchy)
2. Apply payment to each (FIFO)
3. Create CREDIT postings
4. Update balances
5. If balance = 0 → status = PAID
6. Return summary
    ↓
Updated Balances + Payment Record
```

### API Endpoints

```
# Obligations
POST /ledger/obligations
GET /ledger/obligations
GET /ledger/obligations/{posting_id}

# Payments
POST /ledger/payments
GET /ledger/payments
POST /ledger/payments/apply-hierarchy

# Balances
GET /ledger/balances
GET /ledger/balances/driver/{driver_id}
GET /ledger/balances/lease/{lease_id}

# Reconciliation
GET /ledger/reconciliation
GET /ledger/reconciliation/period
```

### Service Layer Methods

**LedgerService**:
- `create_obligation()`: Create DEBIT posting + balance
- `apply_payment()`: Apply CREDIT to specific balance
- `apply_payment_with_hierarchy()`: Apply using payment priority
- `get_open_balances()`: Query outstanding obligations
- `void_posting()`: Reverse a posting (creates offsetting entry)
- `reconcile_period()`: Verify period totals match sources

### Repository Layer

**LedgerPostingRepository**:
- `create()`
- `get_by_id()`
- `get_by_driver()`
- `get_by_period()`

**LedgerBalanceRepository**:
- `create()`
- `get_open_balances()`
- `update_balance()`
- `close_balance()`

### Integration Points

**Inbound** (Create Obligations):
- CURB earnings (CREDIT)
- Lease fees (DEBIT)
- EZPass tolls (DEBIT)
- PVB violations (DEBIT)
- TLC tickets (DEBIT)
- Repairs (DEBIT, installments)
- Loans (DEBIT, installments)
- Misc charges (DEBIT)
- Interim payments (CREDIT)

**Outbound** (Provide Data):
- DTR generation (weekly balances)
- Driver payments (amounts due)
- Current balances view (real-time)
- Reconciliation reports

### Example Usage

**Create Lease Obligation**:
```python
ledger_service.create_obligation(
    category=PostingCategory.LEASE,
    amount=Decimal("500.00"),
    driver_id=123,
    lease_id=456,
    period_start=date(2025, 1, 5),  # Sunday
    period_end=date(2025, 1, 11),    # Saturday
    description="Weekly lease fee",
    source_type="lease",
    source_id="LEASE-2025-001"
)
```

**Apply Weekly Earnings**:
```python
ledger_service.apply_payment_with_hierarchy(
    driver_id=123,
    lease_id=456,
    payment_amount=Decimal("1200.00"),
    payment_date=datetime.now(),
    period_start=date(2025, 1, 5),
    period_end=date(2025, 1, 11),
    source_type="curb",
    description="Weekly CC earnings"
)
```

### Reconciliation Process

**Weekly Reconciliation** (every Sunday):
1. Sum all DEBIT postings by category
2. Sum all CREDIT postings by category
3. Verify against source systems:
   - CURB earnings totals
   - EZPass CSV totals
   - PVB CSV totals
   - etc.
4. Compare LedgerBalance.outstanding_balance with source balances
5. Generate reconciliation report
6. Flag discrepancies for review

### Error Handling

Custom exceptions:
- `InvalidPostingPeriodException`
- `InsufficientBalanceException`
- `DuplicatePostingException`
- `InvalidCategoryException`
- `PostingNotFoundException`

### Performance Considerations
- Indexes on driver_id, lease_id, period dates
- Partition large tables by month/year
- Cache frequently accessed balances
- Async batch processing for large operations
- Read replicas for reporting queries

---

## 10. DTR GENERATION MODULE

### Overview
The Driver Transaction Report (DTR) Generation module creates weekly financial reports for drivers, consolidating all earnings and deductions from the Centralized Ledger into a comprehensive payment receipt.

### Purpose
Automate weekly DTR generation, pulling real-time data from the ledger to create accurate, auditable payment reports for all active driver-lease combinations.

### Payment Period
**Fixed Weekly Cycle**: Sunday 00:00 AM to Saturday 11:59:59 PM

**Generation Time**: Every Sunday 5:00 AM (automated batch process)

### Data Model

#### DTR Table
- `dtr_number`: Unique identifier (system-generated)
- `receipt_number`: Payment receipt number
- `period_start_date`, `period_end_date`: Sunday-Saturday
- `generation_date`: When DTR created
- Entity links: driver_id, lease_id, vehicle_id, medallion_id
- **Earnings**:
  - `credit_card_earnings`: From CURB
  - `gross_cash_earnings`: Cash trips (if tracked)
  - `total_gross_earnings`: CC + Cash
- **Deductions**:
  - `lease_amount`: Weekly lease fee
  - `mta_fees_total`: MTA, TIF, Congestion, CBDT, Airport fees
  - `ezpass_tolls`: All outstanding tolls
  - `pvb_violations`: PVB tickets
  - `tlc_tickets`: TLC fines
  - `repairs`: Weekly repair installments
  - `driver_loans`: Weekly loan installments
  - `misc_charges`: Miscellaneous charges
  - `subtotal_deductions`: Sum of all deductions
- **Calculations**:
  - `prior_balance`: Carried forward from previous periods
  - `net_earnings`: Gross - Subtotal - Prior Balance
  - `total_due_to_driver`: Final payable amount (max 0 if negative)
- **Payment**:
  - `payment_method`: ACH, CHECK, CASH, DIRECT_DEPOSIT
  - `payment_date`: When processed
  - `ach_batch_number`: Batch ID if ACH
  - `check_number`: Check # if check payment
  - `account_number_masked`: Last 4 digits (security)
- **Metadata**:
  - `status`: DRAFT, GENERATED, PAID, VOIDED
  - `is_additional_driver_dtr`: For additional drivers (not primary lessee)
  - `parent_dtr_id`: Reference if additional driver DTR
- **Details** (JSON):
  - `tax_breakdown`: Detailed MTA/TIF/etc.
  - `ezpass_detail`: Individual toll records
  - `pvb_detail`: Individual violations
  - `tlc_detail`: Individual tickets
  - `repair_detail`: Repair invoices & installments
  - `loan_detail`: Loan installments
  - `trip_log`: Credit card trip list from CURB
  - `alerts`: Vehicle/driver alerts (expiry dates, etc.)

### DTR Generation Workflow

#### Automated Weekly Process (Sunday 5:00 AM)

**Step 1: Query Active Leases**
- Get all leases active during period (start ≤ period_end, end ≥ period_start or null)

**Step 2: Generate DTR per Lease**
For each active lease:
1. Check if DTR already exists (prevent duplicates)
2. Generate DTR and receipt numbers
3. Collect earnings from CURB
4. Query Centralized Ledger for all deductions by category
5. Calculate subtotals and net earnings
6. Populate detailed breakdowns (JSON)
7. Get driver payment preferences
8. Create DTR record with status GENERATED

**Step 3: Commit & Log**
- Commit all DTRs to database
- Log generation summary (count, errors)
- Trigger notifications if configured

### DTR Structure

#### Identification Block
- Medallion number
- Driver/Leaseholder name
- TLC License (if driver)
- Receipt Number
- Receipt Date
- Receipt Period (from - to dates)

#### Gross Earnings Snapshot
- Credit Card Earnings (from CURB)
- Cash Earnings (if applicable)
- Total Gross Earnings

#### Account Balance for Payment Period
Summary line items:
- CC Earnings
- Lease Amount
- MTA, TIF, Congestion, CBDT, Airport Fees (Taxes)
- EZ-Pass Tolls
- Violation Tickets (PVB)
- TLC Tickets
- Repairs
- Driver Loans
- Miscellaneous Charges/Adjustments
- **Subtotal** (sum of deductions)
- Prior Balance
- **Net Earnings** (Gross - Subtotal - Prior)
- **Total Due to Driver** (final amount)

#### Detailed Sections

**1. EZ-Pass Tolls Detail**
Table showing each toll:
- Date & Time
- Ticket Number
- TLC License (driver responsible)
- Toll Amount
- Prior Balance
- Payment
- Balance

**2. PVB Tickets Detail**
Table showing each violation:
- Date & Time
- Ticket Number
- TLC License
- Note (violation description)
- Fine
- Charge (2.5% fee)
- Total
- Prior Balance
- Payment
- Balance

**3. TLC Tickets Detail**
Table showing each TLC fine:
- Date & Time
- Ticket Number
- TLC License
- Medallion
- Note
- Fine
- Prior Balance
- Payment
- Balance

**4. Repairs Detail**
Two tables:

**Invoice-Level** (informational):
- Repair ID
- Invoice No.
- Invoice Date
- Workshop
- Invoice Amount
- Amount Paid Till Date
- Outstanding Balance

**Installment-Level** (computation):
- Installment ID
- Due Date
- Amount Due
- Amount Payable
- Payment
- Balance

**5. Driver Loans Detail**
Similar structure to Repairs:

**Loan-Level** (informational):
- Loan ID
- Loan Date
- Principal Amount
- Annual Interest Rate (%)
- Total Due

**Installment-Level** (computation):
- Installment ID
- Due Date
- Principal Amount
- Interest Amount
- Total Due
- Payment
- Balance

**6. Trip Log (Credit Card Trips Only)**
Table showing all CC trips:
- Trip Date
- TLC License
- Medallion
- Amount
- MTA Fee
- Airport Fee
- Other fees

### Validation Rules
1. All subtotals must reconcile:
   - Trip earnings match CURB totals
   - EZPass & PVB totals include ALL outstanding as of period
   - Net Earnings = Gross - All Deductions
2. Receipts must be reproducible (no hidden adjustments)
3. One DTR per lease per period
4. Period must be Sunday-Saturday
5. Cannot generate DTR for periods with existing DTR

### Payment Hierarchy Application

DTR deductions applied in order:
```
1. Taxes (MTA, TIF, Congestion, CBDT, Airport)
2. EZPass (all outstanding)
3. Lease Charges
4. Violations (PVB)
5. TLC Tickets
6. Repairs (installments)
7. Driver Loans (installments)
8. Miscellaneous
```

Within each category: oldest first (FIFO by due date)

### API Endpoints

```
# Generation
POST /dtr/generate
POST /dtr/batch-generate

# Retrieval
GET /dtr
GET /dtr/{dtr_id}
GET /dtr/driver/{driver_id}
GET /dtr/lease/{lease_id}
GET /dtr/period/{start_date}/{end_date}

# Status Management
PUT /dtr/{dtr_id}/finalize
PUT /dtr/{dtr_id}/mark-as-paid
PUT /dtr/{dtr_id}/void

# Export
GET /dtr/{dtr_id}/pdf
GET /dtr/export/csv
GET /dtr/export/excel
```

### DTR Service Methods

**DTRService**:
- `generate_dtr()`: Create single DTR
- `batch_generate_dtrs()`: Generate for all active leases
- `finalize_dtr()`: Move from DRAFT to GENERATED
- `mark_as_paid()`: Update payment details
- `void_dtr()`: Cancel DTR (corrections)
- `get_curb_earnings()`: Query CURB data
- `get_deductions_from_ledger()`: Query ledger by category
- `calculate_totals()`: Sum earnings/deductions
- `populate_details()`: Build JSON detail sections

### Outstanding Balances Rule

**CRITICAL**: DTR includes ALL outstanding amounts as of Payment Period, not just current week:

**EZPass**: All unpaid tolls (including late postings)
**PVB**: All unpaid violations (including late DOF updates)
**TLC**: All unpaid fines (including delayed postings)
**Repairs**: Installments due up to period
**Loans**: Installments due up to period

**Duplicate Elimination**: Ticket/transaction numbers ensure no item appears more than once across DTRs.

### Consolidation Rules

**Single Driver Lease**:
- DTR shows only that driver's data
- TLC license on all transactions

**Multiple Driver Lease**:
- Consolidated list of all transactions
- Each row carries responsible driver's TLC license
- Single unified view (no separate sub-tables)

**Additional Drivers**:
- Do NOT receive separate DTRs
- Earnings/settlements managed by Primary Driver

**Co-Leasing Drivers**:
- Each receives own DTR (both are lessees)

### Example DTR Generation Call

```python
dtr_service = DTRService(db)

dtr = dtr_service.generate_dtr(
    lease_id=456,
    driver_id=123,
    period_start=date(2025, 1, 5),   # Sunday
    period_end=date(2025, 1, 11),     # Saturday
    auto_finalize=True
)

# Returns DTR object with:
# - dtr_number: "DTR-2025-00123"
# - receipt_number: "RCPT-2025-01-00456"
# - All earnings/deductions populated
# - status: GENERATED
# - Ready for payment processing
```

---

## 11. CURRENT BALANCES MODULE

### Overview
The Current Balances module provides a real-time, consolidated view of weekly financial positions for all active leases, displaying earnings, charges, and net balances in a filterable, sortable data grid.

### Purpose
Give BAT staff immediate visibility into the current week's financial status for all drivers without waiting for Sunday DTR generation, enabling proactive management and driver inquiries.

### Scope
- **Current Week View**: Live data for ongoing payment period (Sunday-Saturday)
- **Real-Time Updates**: Reflects charges as they are entered/posted
- **Comprehensive**: All earning and deduction categories in single view
- **No Historical Data**: Focus on current/upcoming week only

### Data Sources

The module aggregates data from multiple sources:

| Source | Data Provided |
|--------|---------------|
| Lease Module | Lease ID, Status, Payment Type, Weekly Lease Fee, Deposit |
| Driver Module | Driver Name, Hack License, Status |
| Vehicle & Medallion | Vehicle Plate, VIN, Medallion Number |
| CURB API | Current week CC earnings (primary source) |
| EZPass, PVB, TLC Imports | Current week charges (based on system entry date) |
| Loan & Repair Modules | WTD loan installments and repair charges |
| DTR Generation | Finalized past week values and DTR Status |
| Ledger | Previous weeks' financial data (post-DTR only) |

### UI Components

#### Main View: Current Balances Table

**Top-Level Row per Lease** showing:

| Column | Description | Source |
|--------|-------------|--------|
| Week Period | Sunday MM/DD - Saturday MM/DD | System calculated |
| Medallion | 4-digit medallion number | Medallion table |
| TLC License | Driver's hack license | Driver table |
| Driver Name | Full name | Driver table |
| Plate | Vehicle license plate | Vehicle table |
| CC Earnings | Credit card earnings WTD | CURB API |
| Lease Fee | Weekly lease amount | Lease configuration |
| MTA / TIF | Taxes WTD | CURB trip data |
| EZ-Pass | Tolls WTD | EZPass imports |
| Violations | PVB tickets WTD | PVB imports |
| TLC Tickets | TLC fines WTD | TLC imports |
| Repairs (WTD Due) | Repair charges due this week | Repair ledger |
| Loans (WTD Due) | Loan installment due this week | Loan ledger |
| Misc | Miscellaneous charges WTD | Manual entries |
| Prior Balance | Carry forward from previous DTR | Previous DTR closing |
| Net Earnings | CC - (Lease + Charges + Prior) | Calculated |
| Deposit Amount | Deposit collected at lease start | Lease agreement |
| Payment Type | Cash or ACH | Lease setup |
| DTR Status | Generated / Not Generated | DTR table |

**Expandable Daily Breakdown**:
Click row to expand, showing:
- Date-by-date breakdown (Sunday through Saturday)
- Daily CC Earnings
- Daily MTA/TIF
- Daily EZ-Pass
- Daily Violations
- Daily TLC Tickets
- Net Daily Earnings
- Final row: Delayed Charges (late postings from previous weeks)

**Click Daily Amount for Details**:
Opens modal showing DTR-format detail:
- Charge Type
- Amount
- Date & Time
- Reference ID / Transaction ID
- Source (API import, manual entry, system-posted)

### Filtering & Sorting

**Filter Options**:
- Week Period (date range picker)
- Medallion (multi-select)
- TLC License (search/select)
- Driver Name (text search)
- Payment Type (ACH/Cash)
- DTR Status (Generated/Not Generated)
- Net Earnings (range: min-max)

**Sort Options**:
All columns sortable ascending/descending

**Bulk Actions**:
- Export to Excel
- Export to CSV
- Print View
- Generate DTRs (batch)

### Calculation Logic

#### Net Earnings Formula
```
Net Earnings = CC Earnings - (Lease Fee + MTA/TIF + EZ-Pass + 
              Violations + TLC Tickets + Repairs + Loans + Misc + Prior Balance)
```

#### Notes on Calculations
1. Weekly Lease Fee not daily; applies weekly only
2. Repairs & Loans show only WTD due amounts (not total outstanding)
3. Late (Delayed) Charges appear in Delayed Charges row in expanded view, still added into weekly total
4. All values reflect system entry date, not original occurrence date

### Business Rules

#### Week Definition
- Each week strictly Sunday 12:00:00 AM to Saturday 11:59:59 PM
- Current Week View: Data is live (up to system entry date/time)
- Past Week View: Data locked once DTR generated

#### Delayed Charges Handling
- Charges may be entered after their occurrence week
- System entry date determines which week they appear
- Flagged as "Delayed" if entered after original week
- Still included in weekly totals for accuracy

#### Prior Balance Rules
- Sourced from previous DTR's closing balance
- Immutable once set
- Rolls forward until cleared
- Not affected by interim payments (those reduce ledger directly)

#### What's NOT Shown Daily
These remain weekly-level only:
- Weekly Lease Fee
- Repairs (WTD Due)
- Loans (WTD Due)
- Prior Balance
- Deposit Amount
- Payment Type
- DTR Status

### API Endpoints

```
# Retrieve Current Balances
GET /current-balances
GET /current-balances/week/{start_date}
GET /current-balances/lease/{lease_id}
GET /current-balances/driver/{driver_id}

# Daily Breakdown
GET /current-balances/{lease_id}/daily-breakdown
GET /current-balances/{lease_id}/day/{date}/details

# Export
GET /current-balances/export/excel
GET /current-balances/export/csv
GET /current-balances/export/pdf

# Filters
POST /current-balances/filter
```

### Service Methods

**CurrentBalancesService**:
- `get_current_week_balances()`: Main query for all leases
- `get_lease_balance()`: Single lease details
- `get_daily_breakdown()`: Expand to daily view
- `get_day_details()`: Drill into specific day/charge
- `calculate_net_earnings()`: Apply formula
- `check_delayed_charges()`: Identify late postings
- `export_to_excel()`: Generate Excel export
- `export_to_csv()`: Generate CSV export

### Integration with DTR

**Pre-DTR Generation**:
- Current Balances shows live, updating data
- Staff can see projections before Sunday generation
- Enables proactive issue resolution

**Post-DTR Generation**:
- DTR Status changes to "Generated"
- Balances locked for that week
- Prior Balance updated for next week
- Current Balances shifts to new week

### Use Cases

**1. Driver Inquiry**
- Driver calls asking about current balance
- Staff filters by TLC License
- Instantly shows current week position
- Can drill into specific charges
- Provides accurate, real-time answer

**2. Proactive Issue Detection**
- Staff reviews Current Balances daily
- Identifies drivers with negative net earnings
- Contacts driver before DTR generation
- Resolves disputes/errors early

**3. Weekly Planning**
- Finance reviews projected payments
- Estimates ACH batch totals
- Plans cash flow accordingly
- Identifies potential payment issues

**4. Audit & Reconciliation**
- Compare Current Balances to source systems
- Verify all charges properly imported
- Ensure calculation accuracy
- Catch data entry errors

### Responsive Design

**Desktop View**: Full table with all columns
**Tablet View**: Hide less critical columns (Deposit, Payment Type)
**Mobile View**: Card-based layout, tap to expand details

### Performance Optimization

1. **Caching**: Cache current week data (refresh every 15 min)
2. **Pagination**: Default 50 rows per page
3. **Lazy Loading**: Load daily breakdowns on demand
4. **Indexed Queries**: Optimize by lease_id, driver_id, period dates
5. **Async Updates**: Background refresh for large datasets

---

## 12. DRIVER PAYMENTS MODULE

### Overview
The Driver Payments module manages weekly Driver Trip Reports (DTRs) and payment processing for taxi fleet drivers, supporting both ACH batch processing and individual check payments.

### Purpose
Provide comprehensive management of weekly driver payments, including batch ACH processing with NACHA file generation, check payment tracking, and complete payment lifecycle management with reversal capabilities.

### Payment Methods

**ACH (Automated Clearing House)**:
- Electronic bank transfers processed in batches
- Batch format: YYMM-XXX (e.g., 2501-001)
- NACHA file generation for bank upload
- Batch reversal capability

**Check**:
- Traditional paper checks issued individually
- Manual check number entry
- Individual payment tracking

### Data Model

#### DriverTransactionReceipt (DTR)
Already covered in DTR Generation module, with additional payment fields:
- `payment_method`: ACH or CHECK
- `payment_date`: When payment processed
- `ach_batch_number`: Batch ID if ACH (format YYMM-XXX)
- `check_number`: Check number if check payment
- `account_number_masked`: Last 4 digits of bank account
- `status`: DRAFT, GENERATED, PAID, VOIDED

### Driver Payments Table

#### Column Structure

| Column | Description | Format |
|--------|-------------|---------|
| Receipt # | Unique receipt number | RCPT-XXXXX |
| Medallion | Taxi medallion number | 4-digit |
| TLC License | Driver's TLC license | 7-digit |
| Driver Name | Full name of driver | Text |
| Plate | Vehicle license plate | NY state format |
| Date From | Week start (Sunday AM) | MM/DD/YYYY |
| Date To | Week end (Saturday 11:59:59 PM) | MM/DD/YYYY |
| Gross Earnings | Total credit card earnings | USD |
| Lease | Weekly lease amount | USD |
| MTA Total | Total MTA fees | USD (expandable tooltip) |
| EZ-Pass | Electronic toll charges | USD |
| Violations | Traffic violation fines | USD |
| TLC Tickets | TLC regulatory fines | USD |
| Repairs | Vehicle repair costs | USD |
| Driver Loans | Loan repayments | USD |
| Misc | Miscellaneous charges | USD |
| Subtotal | Sum of all deductions | USD |
| Net Earnings | Gross - Subtotal | USD |
| **Total Due** | **Final amount to driver** | **USD, bold, primary color** |
| Payment Type | Payment preference | ACH or Check |
| Batch/Check No | Payment identifier | YYMM-XXX or check # |

#### Visual Design
- Fixed header row with column titles
- Alternating row colors for readability
- Right-aligned currency columns
- Monospace font for batch/check numbers
- Hover state on rows

**Special Formatting**:
- Total Due: Bold, primary accent color (emphasis)
- Batch/Check No: ACH batches = clickable links, Check = plain text, Unpaid = "-"
- MTA Total: Expandable tooltip showing breakdown (MTA Tax, TIF, Congestion, CBDT, Airport)

#### Row Actions
Each row has Actions column:
- **View Details** button: Opens detailed DTR view

### Column Filters

Dedicated filter row below headers:

**Filter Inputs**:
- Receipt #: Text input, partial match
- Medallion: Dropdown, multi-select
- TLC License: Text input
- Driver Name: Text input, partial match
- Date From/To: Date range picker
- Payment Type: Dropdown (ACH/Check/All)
- Batch/Check No: Text input
- Status: Dropdown (Unpaid/Paid/All)

**Filter Behavior**:
- Real-time filtering as user types
- Combined filters (AND logic)
- Clear all filters button
- Save filter presets

### View Toggle

**Unpaid View** (default):
- Shows only DTRs with status ≠ PAID
- Total Due > 0
- Awaiting payment processing

**All View**:
- Shows all DTRs regardless of status
- Historical and current payments
- Full payment history

### ACH Batch Mode

#### Creating ACH Batch

**Step 1: Select ACH DTRs**
- Filter table: Payment Type = ACH
- Select individual DTRs via checkboxes
- Or "Select All ACH" button
- Displays total count and amount

**Step 2: Create Batch**
- Click "Create ACH Batch" button
- System generates batch number (YYMM-XXX format)
- Batch creation confirmation modal:
  - Batch Number
  - Total DTRs
  - Total Amount
  - Date
  - Selected DTRs list
- Confirm and Create Batch

**Step 3: Batch Created**
- Status modal: "Payment File Created Successfully"
- Batch number displayed
- Two actions:
  - **Download NACHA File**: Export for bank upload
  - **Print Batch Summary**: Batch report PDF

**Post-Creation**:
- Selected DTRs marked with batch number
- Status updated to PAID
- Payment date recorded
- Batch becomes clickable link in table

### NACHA File Generation

#### File Format Specification

**File Structure**:
1. File Header Record (Type 1)
2. Batch Header Record (Type 5)
3. Entry Detail Records (Type 6) - one per DTR
4. Batch Control Record (Type 8)
5. File Control Record (Type 9)

**Key Components**:

**File Header**:
- Record Type Code: 1
- Priority Code: 01
- Immediate Destination: Bank routing #
- Immediate Origin: Company ID
- File Creation Date/Time
- File ID Modifier

**Batch Header**:
- Record Type Code: 5
- Service Class Code: 200 (mixed debits/credits) or 220 (credits only)
- Company Name: BIG APPLE TAXI MANAGEMENT LLC
- Company Identification: Tax ID
- Standard Entry Class Code: PPD (Prearranged Payment/Deposit)
- Company Entry Description: "PAYROLL" or "DRIVER PAY"
- Company Descriptive Date: Payment date
- Effective Entry Date: When funds available
- Originating DFI Identification: Bank routing

**Entry Detail**:
- Record Type Code: 6
- Transaction Code: 22 (checking credit) or 32 (savings credit)
- Receiving DFI Identification: Driver's bank routing
- Check Digit: Routing check digit
- DFI Account Number: Driver's account number
- Amount: Payment amount (in cents, no decimal)
- Individual Identification Number: Driver TLC License
- Individual Name: Driver name (22 chars)
- Discretionary Data: Receipt number
- Addenda Record Indicator: 0 (no addenda)

**Batch Control**:
- Record Type Code: 8
- Service Class Code: Matches batch header
- Entry/Addenda Count: Number of entry records
- Entry Hash: Sum of routing numbers
- Total Debit/Credit Entry Dollar Amount
- Company Identification
- Originating DFI Identification

**File Control**:
- Record Type Code: 9
- Batch Count: Number of batch records
- Block Count: Number of physical blocks
- Entry/Addenda Count: Total entries in file
- Entry Hash: Total hash
- Total Debit/Credit Dollar Amount

**Transaction Codes** (Appendix A):
- 22: Automated deposit (checking credit)
- 32: Automated deposit (savings credit)
- 27: Automated payment (checking debit)
- 37: Automated payment (savings debit)

**Standard Entry Class Codes** (Appendix B):
- **PPD**: Prearranged Payment and Deposit (payroll, vendor payments)
- CCD: Corporate Credit or Debit
- WEB: Internet-initiated entries

### Batch Management

#### Viewing Batch Details
Click batch number in table:
- Opens batch detail modal
- Lists all DTRs in batch
- Shows batch summary (count, total)
- Individual DTR details (Receipt #, Driver, Amount)
- Batch creation date/time
- User who created batch

#### Batch Reversal

**Use Case**: Error correction, wrong batch, duplicate processing

**Process**:
1. Navigate to batch detail view
2. Click "Reverse Batch" button
3. Confirmation modal:
   - Batch number
   - Total amount to be reversed
   - Impact description
   - Reason for reversal (required text input)
4. Confirm Reversal

**Effect**:
- All DTRs in batch status → UNPAID
- Batch number cleared from DTRs
- Payment date cleared
- Reversal logged in audit trail
- DTRs become available for new batch
- Original NACHA file marked as voided

**Important**: Reversal in system only; bank upload must be prevented/reversed separately

### Check Payment Processing

#### Pay By Check Workflow

**Step 1: Select Check DTR**
- Filter: Payment Type = Check
- Select single DTR
- Click "Pay By Check" button

**Step 2: Enter Check Details**
- Check number (required, manual entry)
- Payment date (defaults to today)
- Optional notes
- Confirm

**Step 3: Payment Recorded**
- DTR status → PAID
- Check number recorded
- Payment date saved
- Check number displays in table

**Validation**:
- Check number must be unique
- Check number format: alphanumeric, no special chars
- Cannot pay already-paid DTR

### Export and Print

#### Export CSV
- Exports current filtered view
- All columns included
- UTF-8 encoding
- Headers in first row
- File name: `driver_payments_YYYYMMDD.csv`

#### Export Excel
- Formatted Excel workbook
- Multiple sheets possible:
  - Summary
  - Detailed Transactions
  - Batch Summary
- Column formatting preserved
- File name: `driver_payments_YYYYMMDD.xlsx`

#### Print View
- Printer-friendly format
- Removes filters/buttons
- Page breaks at logical points
- Header/footer with date, page numbers
- Print or save as PDF

### API Endpoints

```
# DTR Management
GET /driver-payments
GET /driver-payments/{receipt_number}
PUT /driver-payments/{receipt_number}/status

# ACH Batch Processing
POST /driver-payments/ach-batch/create
GET /driver-payments/ach-batch/{batch_number}
POST /driver-payments/ach-batch/{batch_number}/generate-nacha
POST /driver-payments/ach-batch/{batch_number}/reverse

# Check Payment
POST /driver-payments/check-payment
PUT /driver-payments/{receipt_number}/check-number

# Export
GET /driver-payments/export/csv
GET /driver-payments/export/excel
GET /driver-payments/export/pdf
```

### Business Rules

1. Weekly DTR entry with detailed earnings/deductions
2. Flexible payment type assignment per driver (ACH or Check)
3. Batch ACH processing with YYMM-XXX format batch numbers
4. Check payment tracking with manual check number entry
5. Batch reversal capability for error correction
6. One DTR per driver per week per lease
7. DTR must be GENERATED status before payment
8. Cannot pay DTR with Total Due ≤ 0
9. Batch must have at least 1 DTR
10. Check number must be unique across all checks
11. Cannot reverse batch after bank processing
12. All monetary amounts use Decimal precision

### Validation Rules

1. Receipt number uniqueness across system
2. Payment date cannot be in future
3. ACH: Valid bank routing and account numbers
4. Check: Alphanumeric check number only
5. Batch must include only unpaid DTRs
6. Cannot modify paid DTR
7. Reversal requires reason (min 10 chars)

### Example Workflows

**Workflow 1: Process ACH Batch**
1. Sunday: DTRs auto-generated (status: GENERATED)
2. Monday: Finance reviews Driver Payments table
3. Filter: Payment Type = ACH, Status = Unpaid
4. Select all ACH DTRs (e.g., 50 drivers)
5. Click "Create ACH Batch"
6. Confirm batch (2501-001, 50 DTRs, $42,500.00)
7. Download NACHA file
8. Upload to ConnectOne Bank portal
9. Print batch summary for records
10. DTRs marked PAID with batch 2501-001

**Workflow 2: Pay Individual Check**
1. DTR generated for driver preferring check
2. Finance prepares physical check #1234
3. Navigate to Driver Payments
4. Filter: Payment Type = Check, Driver = John Smith
5. Click "Pay By Check" on John's DTR
6. Enter check number: 1234
7. Confirm payment
8. Check issued to John
9. DTR marked PAID with check #1234

**Workflow 3: Reverse Batch (Error Correction)**
1. Batch 2501-002 created with 25 DTRs
2. Error discovered: wrong payment date
3. Bank upload NOT yet done
4. Navigate to batch 2501-002 details
5. Click "Reverse Batch"
6. Enter reason: "Incorrect payment date - correcting"
7. Confirm reversal
8. All 25 DTRs status → UNPAID
9. Batch number cleared
10. Create new batch with correct date

---

## SYSTEM INTEGRATION OVERVIEW

### Data Flow Summary

```
CURB API → Earnings
    ↓
CSV Imports → EZPass, PVB Violations
    ↓
Manual Entry → TLC Tickets, Misc Charges, Interim Payments
    ↓
Automated Systems → Repairs, Loans (Installment Generation)
    ↓
CENTRALIZED LEDGER
    ↓
Weekly DTR Generation (Sunday 5:00 AM)
    ↓
Driver Payments Module
    ↓
ACH Batch (NACHA File) or Check Payment
    ↓
Bank Processing / Physical Check
```

### Module Dependencies

**Centralized Ledger** depends on:
- CURB (earnings source)
- EZPass (toll obligations)
- PVB (violation obligations)
- TLC (ticket obligations)
- Repairs (repair obligations)
- Loans (loan obligations)
- Misc (miscellaneous obligations)
- Interim Payments (targeted credits)

**DTR Generation** depends on:
- Centralized Ledger (single source of truth)
- Driver, Lease, Vehicle, Medallion entities
- Payment preferences

**Driver Payments** depends on:
- DTR Generation (creates payment records)
- Bank account information
- Payment method preferences

**Current Balances** depends on:
- Real-time data from all source modules
- DTR for prior balance
- Active lease information

### Key Technologies

**Backend**:
- FastAPI (Python async web framework)
- SQLAlchemy 2.x (ORM with Mapped types)
- Alembic (database migrations)
- Celery (async background tasks)
- Pydantic (data validation)

**Database**:
- PostgreSQL (primary data store)
- Indexes on frequently queried fields
- Foreign key constraints
- JSON columns for flexible data

**External Integrations**:
- CURB Mobility SOAP API (Version 6.3)
- CSV imports (EZPass, PVB, TLC)
- NACHA file generation (ACH payments)
- OCR services (document processing)

**Architecture Patterns**:
- Repository Pattern (data access layer)
- Service Layer Pattern (business logic)
- Dependency Injection (FastAPI Depends)
- Event-Driven Architecture (BPM workflows)
- Immutable Ledger (append-only postings)

---

## CONCLUSION

This comprehensive documentation covers all 12 core modules of the Big Apple Taxi Fleet Management System. Each module is designed with production-grade standards, including:

- Complete data models with field specifications
- Detailed workflows and business logic
- API endpoint definitions
- Validation rules and error handling
- Integration points with other modules
- Real-world examples and use cases

The system is built on a solid foundation of the Centralized Ledger, ensuring all financial transactions are traceable, auditable, and immutable. The modular architecture allows for extensibility while maintaining data integrity across the entire platform.

For implementation details, refer to the codebase in the respective module directories (`app/curb/`, `app/ezpass/`, etc.) and integration documentation in `app/docs/`.
