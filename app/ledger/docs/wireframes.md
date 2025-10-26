# 🎨 Ledger System - UI Wireframes & Specifications

## Table of Contents
1. [Create Manual Ledger Entry](#1-create-manual-ledger-entry)
2. [View/Search Ledger Postings](#2-viewsearch-ledger-postings)
3. [View Driver Balance Summary](#3-view-driver-balance-summary)
4. [Apply Payment - Hierarchy Mode](#4-apply-payment---hierarchy-mode)
5. [Apply Payment - Targeted Mode](#5-apply-payment---targeted-mode)
6. [Void Posting](#6-void-posting)
7. [View Balance Details](#7-view-balance-details)
8. [View Posting Details](#8-view-posting-details)

---

## 1. Create Manual Ledger Entry

### Purpose
Allow staff to manually create ledger postings for one-off transactions, corrections, or manual adjustments.

### Wireframe

```
┌─────────────────────────────────────────────────────────────────────┐
│ BAT Connect - Ledger                                    [User: Admin]│
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  📝 Create Manual Ledger Entry                                       │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ Entry Type                                                    │  │
│  │ ┌──────────────┐ ┌──────────────┐                           │  │
│  │ │● Obligation  │ │○ Payment     │                           │  │
│  │ │  (DEBIT)     │ │  (CREDIT)    │                           │  │
│  │ └──────────────┘ └──────────────┘                           │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  Entity Information                                                   │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │ * Driver                                                       │  │
│  │   [Search Driver by Name/ID...            ▼]  [🔍 Advanced]  │  │
│  │   Selected: John Smith (#D-12345)                             │  │
│  │                                                                │  │
│  │ * Lease                                                        │  │
│  │   [Select Lease...                        ▼]                  │  │
│  │   Available Leases: Lease #L-456 (Active)                     │  │
│  │                     Lease #L-789 (Active)                     │  │
│  │                                                                │  │
│  │   Vehicle (Optional)                                           │  │
│  │   [Select Vehicle...                      ▼]                  │  │
│  │                                                                │  │
│  │   Medallion (Optional)                                         │  │
│  │   [Select Medallion...                    ▼]                  │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  Transaction Details                                                  │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │ * Category                                                     │  │
│  │   [Select Category...                     ▼]                  │  │
│  │   Options:                                                     │  │
│  │   • TAXES - Tax obligations                                    │  │
│  │   • EZPASS - Toll charges                                      │  │
│  │   • LEASE - Lease payments                                     │  │
│  │   • PVB - Parking violations                                   │  │
│  │   • TLC - TLC tickets                                          │  │
│  │   • REPAIRS - Vehicle repairs                                  │  │
│  │   • LOANS - Driver loans                                       │  │
│  │   • MISC - Miscellaneous                                       │  │
│  │                                                                │  │
│  │ * Amount                                                       │  │
│  │   $ [__________.00]                                           │  │
│  │     Must be positive (> 0)                                     │  │
│  │                                                                │  │
│  │ * Source Type                                                  │  │
│  │   [MANUAL_ENTRY                           ▼]                  │  │
│  │   Examples: MANUAL_ENTRY, EZPASS_TRANSACTION, LEASE_SCHEDULE  │  │
│  │                                                                │  │
│  │ * Source ID                                                    │  │
│  │   [________________________]                                  │  │
│  │   Auto-generated: MANUAL-2025-XXXXX                           │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  Payment Period (must be Sunday to Saturday)                          │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │ * Week Start (Sunday)     * Week End (Saturday)               │  │
│  │   [📅 10/26/2025]             [📅 11/01/2025]                 │  │
│  │                                                                │  │
│  │   [Use Current Week] [Use Next Week]                          │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  Due Date (for obligations only)                                      │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │   [📅 11/01/2025]                                             │  │
│  │   ☑ Same as week end                                          │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  Additional Information                                               │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │ Description                                                    │  │
│  │ [_____________________________________________________________]│  │
│  │ [_____________________________________________________________]│  │
│  │                                                                │  │
│  │ Notes (internal)                                               │  │
│  │ [_____________________________________________________________]│  │
│  │ [_____________________________________________________________]│  │
│  │ [_____________________________________________________________]│  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │ ⚠️  WARNING: Ledger entries are immutable once created.       │  │
│  │    Use the "Void" function to correct mistakes.               │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  [Cancel]                                    [Preview] [💾 Create]  │
│                                                                       │
└───────────────────────────────────────────────────────────────────────┘
```

### Field Specifications

| Field | Type | Required | Validation | Default |
|-------|------|----------|------------|---------|
| Entry Type | Radio | Yes | DEBIT or CREDIT | DEBIT (Obligation) |
| Driver | Autocomplete | Yes | Must exist in system | - |
| Lease | Dropdown | Yes | Must be active, belong to driver | - |
| Vehicle | Dropdown | No | Must exist if selected | - |
| Medallion | Dropdown | No | Must exist if selected | - |
| Category | Dropdown | Yes | Valid PostingCategory enum | - |
| Amount | Currency | Yes | > 0, max 2 decimals | - |
| Source Type | Text | Yes | Max 100 chars | "MANUAL_ENTRY" |
| Source ID | Text | Yes | Max 100 chars, unique | Auto-generated |
| Week Start | Date | Yes | Must be Sunday | Current/Next Sunday |
| Week End | Date | Yes | Must be Saturday, 6 days after start | Calculated |
| Due Date | Date | No | Only for DEBIT entries | Same as week end |
| Description | Textarea | No | Max 500 chars | - |
| Notes | Textarea | No | Max 1000 chars | - |

### User Flow

```
1. User clicks "Create Manual Entry" button
   ↓
2. Form loads with DEBIT selected by default
   ↓
3. User searches/selects Driver
   ↓
4. System loads active leases for that driver
   ↓
5. User selects Lease (vehicles/medallions populate)
   ↓
6. User selects Category and enters Amount
   ↓
7. System auto-generates Source ID
   ↓
8. User confirms payment period (or uses current week)
   ↓
9. User adds description/notes
   ↓
10. User clicks "Preview" to review
   ↓
11. Confirmation dialog shows summary
   ↓
12. User clicks "Create"
   ↓
13. System validates and creates posting
   ↓
14. Success message with Posting ID shown
   ↓
15. Option to create balance (if obligation) or allocate (if payment)
```

### Validation Rules

**Real-time Validation:**
- ✓ Amount must be positive
- ✓ Week start must be Sunday
- ✓ Week end must be Saturday, 6 days after start
- ✓ Source ID must be unique
- ✓ Driver must have at least one active lease

**On Submit:**
- Verify driver exists
- Verify lease exists and is active
- Check for duplicate source_type + source_id
- Validate payment period is valid week

### Success State

```
┌─────────────────────────────────────────────────────────┐
│ ✅ Ledger Entry Created Successfully                    │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Posting ID: LP-2025-000123                             │
│  Type: DEBIT (Obligation)                               │
│  Driver: John Smith (#D-12345)                          │
│  Amount: $125.50                                        │
│  Category: EZPASS                                       │
│  Status: POSTED                                         │
│                                                          │
│  Created by: Admin User                                 │
│  Created at: 2025-10-26 14:35:22                       │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │ An obligation balance has been automatically       │ │
│  │ created: LB-2025-000456                            │ │
│  │                                                     │ │
│  │ [View Balance Details]                             │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  [Create Another]  [View All Postings]  [Close]        │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Error States

**Validation Error:**
```
┌─────────────────────────────────────────────────────────┐
│ ⚠️  Validation Error                                    │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Please correct the following errors:                   │
│                                                          │
│  • Amount must be greater than 0                        │
│  • Payment period start must be a Sunday               │
│  • Driver must be selected                              │
│                                                          │
│  [OK]                                                   │
└─────────────────────────────────────────────────────────┘
```

**Duplicate Entry:**
```
┌─────────────────────────────────────────────────────────┐
│ ⚠️  Duplicate Entry Detected                            │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  A posting already exists with this source:             │
│                                                          │
│  Source Type: MANUAL_ENTRY                              │
│  Source ID: MANUAL-2025-00123                           │
│                                                          │
│  Existing Posting: LP-2025-000120                       │
│  Created: 2025-10-26 10:15:33                          │
│  Amount: $125.50                                        │
│                                                          │
│  [View Existing Posting]  [Change Source ID]  [Cancel] │
└─────────────────────────────────────────────────────────┘
```

---

## 2. View/Search Ledger Postings

### Purpose
Search and view all ledger postings with advanced filtering.

### Wireframe

```
┌─────────────────────────────────────────────────────────────────────┐
│ BAT Connect - Ledger Postings                           [User: Admin]│
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  📊 Ledger Postings                                                  │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ 🔍 Search & Filter                                           │   │
│  │                                                               │   │
│  │ Quick Search                                                  │   │
│  │ [Search by Posting ID, Driver, Amount...        ] [🔍 Search]│   │
│  │                                                               │   │
│  │ ▼ Advanced Filters                                           │   │
│  │ ┌────────────────────┬────────────────────┬─────────────────┐│   │
│  │ │ Driver             │ Lease              │ Category        ││   │
│  │ │ [Select...      ▼] │ [Select...      ▼] │ [Select...   ▼]││   │
│  │ └────────────────────┴────────────────────┴─────────────────┘│   │
│  │ ┌────────────────────┬────────────────────┬─────────────────┐│   │
│  │ │ Posting Type       │ Status             │ Category        ││   │
│  │ │ [All Types      ▼] │ [All Status     ▼] │ [All         ▼]││   │
│  │ │ • All Types        │ • All Status       │ • All           ││   │
│  │ │ • DEBIT            │ • POSTED           │ • TAXES         ││   │
│  │ │ • CREDIT           │ • PENDING          │ • EZPASS        ││   │
│  │ │                    │ • VOIDED           │ • LEASE         ││   │
│  │ └────────────────────┴────────────────────┴─────────────────┘│   │
│  │ ┌────────────────────────────────────────────────────────────┐│   │
│  │ │ Payment Period                                             ││   │
│  │ │ From: [📅 10/01/2025]  To: [📅 10/31/2025]               ││   │
│  │ └────────────────────────────────────────────────────────────┘│   │
│  │                                                               │   │
│  │ [Clear Filters]  [Apply Filters]                  [Export ▼]│   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                       │
│  Results: 234 postings found                                          │
│  [Show: 50 ▼] per page                    Page 1 of 5  [< 1 2 3 4 5 >]│
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ Posting ID  │Driver│Lease│Type │Category│Amount  │Date     │⚙️ │ │
│  ├────────────────────────────────────────────────────────────────┤ │
│  │ LP-2025-001│Smith │L-456│DEBIT│EZPASS │ $45.00│10/26/25│[••]│ │
│  │ LP-2025-002│Jones │L-789│DEBIT│LEASE  │$400.00│10/26/25│[••]│ │
│  │ LP-2025-003│Smith │L-456│CREDIT│EARNING│$500.00│10/26/25│[••]│ │
│  │ LP-2025-004│Brown │L-234│DEBIT│PVB    │$115.00│10/25/25│[••]│ │
│  │ LP-2025-005│Davis │L-567│DEBIT│REPAIRS│$250.00│10/25/25│[••]│ │
│  │ 🚫 LP-2025-006│Smith│L-456│DEBIT│EZPASS │ $25.00│10/24/25│[••]│ │
│  │    ↪ VOIDED - Incorrect amount                                │ │
│  │ LP-2025-007│Smith │L-456│CREDIT│VOID   │ $25.00│10/24/25│[••]│ │
│  │    ↪ Reversal of LP-2025-006                                  │ │
│  │ LP-2025-008│Smith │L-456│DEBIT│EZPASS │ $35.00│10/24/25│[••]│ │
│  │    ↪ Corrected entry                                          │ │
│  │ ... (more rows)                                                │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  [🆕 Create Manual Entry]                                            │
│                                                                       │
└───────────────────────────────────────────────────────────────────────┘
```

### Action Menu ([••])

```
┌─────────────────────────┐
│ Actions                 │
├─────────────────────────┤
│ 👁️  View Details        │
│ 📄 View Related Balance │
│ 🚫 Void Posting         │
│ 📋 Copy Posting ID      │
│ 📊 View Audit Trail     │
└─────────────────────────┘
```

### Export Options

```
┌─────────────────────────┐
│ Export As               │
├─────────────────────────┤
│ 📑 Excel (.xlsx)        │
│ 📄 CSV                  │
│ 📊 PDF Report           │
│ 📧 Email Report         │
└─────────────────────────┘
```

### Features

**Visual Indicators:**
- 🚫 Red row with strikethrough = VOIDED posting
- ↪ Indented row = Related posting (reversal/correction)
- 💚 Green badge = POSTED
- 🟡 Yellow badge = PENDING
- 🔴 Red badge = VOIDED

**Sorting:**
- Click column header to sort
- Default: Most recent first
- Multi-column sort supported

**Bulk Actions:**
- ☑ Select multiple postings
- Export selected
- View summary of selected

---

## 3. View Driver Balance Summary

### Purpose
View real-time balance for a specific driver/lease combination.

### Wireframe

```
┌─────────────────────────────────────────────────────────────────────┐
│ BAT Connect - Driver Balance                            [User: Admin]│
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  💰 Driver Balance Summary                                           │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ Select Driver & Lease                                         │   │
│  │ Driver: [John Smith (#D-12345)              ▼] [🔍 Search]   │   │
│  │ Lease:  [Lease #L-456 (Active)              ▼]               │   │
│  │                                                               │   │
│  │ [Load Balance]                                                │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                       │
│  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓   │
│  ┃ Driver: John Smith (#D-12345)                                 ┃   │
│  ┃ Lease: #L-456 - Medallion 1Y23 - Vehicle Y234                ┃   │
│  ┃ Status: Active                                                ┃   │
│  ┃ Last Updated: 2025-10-26 14:35:22                            ┃   │
│  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛   │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                    TOTAL OUTSTANDING                            │ │
│  │                      $1,245.50                                  │ │
│  │                                                                  │ │
│  │               ┌─────────────────────────┐                       │ │
│  │               │ [Pay All] [Pay Amount]  │                       │ │
│  │               └─────────────────────────┘                       │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  Breakdown by Category (Payment Priority Order)                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ Category    │ Total Due │ Paid    │ Outstanding │ Open Items │ │ │
│  ├────────────────────────────────────────────────────────────────┤ │
│  │ 1️⃣ TAXES    │  $150.00 │  $50.00 │    $100.00  │     2      │🔍│ │
│  │ 2️⃣ EZPASS   │  $245.00 │ $200.00 │     $45.00  │     3      │🔍│ │
│  │ 3️⃣ LEASE    │  $800.00 │ $400.00 │    $400.00  │     1      │🔍│ │
│  │ 4️⃣ PVB      │  $230.00 │ $115.00 │    $115.00  │     2      │🔍│ │
│  │ 5️⃣ TLC      │  $0.00   │  $0.00  │      $0.00  │     0      │🔍│ │
│  │ 6️⃣ REPAIRS  │  $750.00 │ $250.00 │    $500.00  │     3      │🔍│ │
│  │ 7️⃣ LOANS    │  $200.00 │ $115.00 │     $85.00  │     1      │🔍│ │
│  │ 8️⃣ MISC     │  $0.00   │  $0.00  │      $0.00  │     0      │🔍│ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  Recent Activity (Last 7 Days)                                        │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ Date      │ Type         │ Category │ Amount    │ Balance     │ │
│  ├────────────────────────────────────────────────────────────────┤ │
│  │ 10/26/25  │ DEBIT        │ EZPASS   │ +$45.00   │ $1,245.50  │ │
│  │ 10/25/25  │ CREDIT (DTR) │ EARNINGS │ -$500.00  │ $1,200.50  │ │
│  │ 10/24/25  │ DEBIT        │ REPAIRS  │ +$250.00  │ $1,700.50  │ │
│  │ 10/23/25  │ DEBIT        │ PVB      │ +$115.00  │ $1,450.50  │ │
│  │ 10/22/25  │ DEBIT        │ TAXES    │ +$50.00   │ $1,335.50  │ │
│  │ ... (more rows)                                                 │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  [View All Postings] [View All Balances] [Export Report] [📧 Email]│
│                                                                       │
└───────────────────────────────────────────────────────────────────────┘
```

### Click on 🔍 for Category Details

```
┌─────────────────────────────────────────────────────────┐
│ EZPASS - Detailed Breakdown                             │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ Total Outstanding: $45.00                               │
│ Open Balances: 3                                        │
│                                                          │
│ ┌──────────────────────────────────────────────────────┐│
│ │ Balance ID  │Reference    │Due Date │Amount│Status ││││
│ ├──────────────────────────────────────────────────────┤│
│ │ LB-2025-100│EZP-10/20/25 │10/27/25│$15.00│OPEN   ││││
│ │ LB-2025-101│EZP-10/22/25 │10/29/25│$12.00│OPEN   ││││
│ │ LB-2025-102│EZP-10/26/25 │11/01/25│$18.00│OPEN   ││││
│ └──────────────────────────────────────────────────────┘│
│                                                          │
│ [Pay This Category] [View All EZPass Transactions]     │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Features

**Visual Indicators:**
- ⚠️ Red text = Overdue balance
- 🟢 Green text = No balance
- 🟡 Yellow highlight = Due within 3 days
- Priority numbers (1️⃣-8️⃣) = Payment hierarchy

**Quick Actions:**
- **Pay All**: Apply payment to all outstanding (hierarchy)
- **Pay Amount**: Apply specific amount (hierarchy)
- **Pay This Category**: Target specific category only
- **Export Report**: Generate PDF/Excel summary
- **📧 Email**: Send balance summary to driver

---

## 4. Apply Payment - Hierarchy Mode

### Purpose
Apply payment following strict payment hierarchy (weekly DTR allocation).

### Wireframe

```
┌─────────────────────────────────────────────────────────────────────┐
│ BAT Connect - Apply Payment (Hierarchy Mode)           [User: Admin]│
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  💵 Apply Payment - Hierarchy Mode                                   │
│                                                                       │
│  ℹ️  This mode applies payment following strict payment hierarchy.   │
│     Use for weekly DTR allocations and CURB earnings.                │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ Driver & Lease Selection                                      │   │
│  │                                                               │   │
│  │ * Driver: [John Smith (#D-12345)              ▼]             │   │
│  │ * Lease:  [Lease #L-456 (Active)              ▼]             │   │
│  │                                                               │   │
│  │ Current Outstanding Balance: $1,245.50                       │   │
│  │ [View Balance Details →]                                     │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ Payment Information                                           │   │
│  │                                                               │   │
│  │ * Payment Amount                                              │   │
│  │   $ [500.00_____]                                            │   │
│  │                                                               │   │
│  │ * Payment Period                                              │   │
│  │   From: [📅 10/26/2025] To: [📅 11/01/2025]                 │   │
│  │   [Use Current Week]                                          │   │
│  │                                                               │   │
│  │ * Source Type                                                 │   │
│  │   [DTR_WEEKLY_ALLOCATION                      ▼]             │   │
│  │   Options:                                                    │   │
│  │   • DTR_WEEKLY_ALLOCATION (Weekly earnings)                  │   │
│  │   • CURB_EARNINGS (Direct from CURB)                         │   │
│  │   • MANUAL_PAYMENT (Staff entry)                             │   │
│  │                                                               │   │
│  │ * Source ID                                                   │   │
│  │   [DTR-2025-WEEK43________]                                  │   │
│  │   Auto-suggested based on source type                         │   │
│  │                                                               │   │
│  │   Notes                                                       │   │
│  │   [_________________________________________________________] │   │
│  │   [_________________________________________________________] │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                       │
│  [Calculate Allocation Preview]                                      │
│                                                                       │
└───────────────────────────────────────────────────────────────────────┘
```

### After Clicking "Calculate Allocation Preview"

```
┌─────────────────────────────────────────────────────────────────────┐
│  Payment Allocation Preview                                          │
│                                                                       │
│  Payment Amount: $500.00                                             │
│  Total Outstanding: $1,245.50                                        │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ Allocation by Category (Payment Hierarchy)                      │ │
│  ├────────────────────────────────────────────────────────────────┤ │
│  │ Priority│Category│Outstanding│Will Be Paid│Remaining After    ││ │
│  ├────────────────────────────────────────────────────────────────┤ │
│  │   1️⃣   │TAXES   │  $100.00  │  $100.00 ✓ │    $0.00          ││ │
│  │   2️⃣   │EZPASS  │   $45.00  │   $45.00 ✓ │    $0.00          ││ │
│  │   3️⃣   │LEASE   │  $400.00  │  $355.00 ⚠️ │   $45.00          ││ │
│  │   4️⃣   │PVB     │  $115.00  │    $0.00 ⊗ │  $115.00          ││ │
│  │   5️⃣   │TLC     │    $0.00  │    $0.00 - │    $0.00          ││ │
│  │   6️⃣   │REPAIRS │  $500.00  │    $0.00 ⊗ │  $500.00          ││ │
│  │   7️⃣   │LOANS   │   $85.00  │    $0.00 ⊗ │   $85.00          ││ │
│  │   8️⃣   │MISC    │    $0.00  │    $0.00 - │    $0.00          ││ │
│  │         │        │           │            │                   ││ │
│  │ TOTAL:  │        │ $1,245.50 │  $500.00   │  $745.50          ││ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  Legend: ✓ Fully paid | ⚠️ Partially paid | ⊗ Not paid | - No balance│
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ Detailed Allocation by Balance (FIFO within category)          │ │
│  ├────────────────────────────────────────────────────────────────┤ │
│  │ Balance ID  │Category│Due Date │Amount│Paying│Remaining       ││ │
│  ├────────────────────────────────────────────────────────────────┤ │
│  │ LB-2025-090│TAXES   │10/27/25 │$50.00│$50.00│  $0.00 ✓       ││ │
│  │ LB-2025-091│TAXES   │10/29/25 │$50.00│$50.00│  $0.00 ✓       ││ │
│  │ LB-2025-100│EZPASS  │10/27/25 │$15.00│$15.00│  $0.00 ✓       ││ │
│  │ LB-2025-101│EZPASS  │10/29/25 │$12.00│$12.00│  $0.00 ✓       ││ │
│  │ LB-2025-102│EZPASS  │11/01/25 │$18.00│$18.00│  $0.00 ✓       ││ │
│  │ LB-2025-095│LEASE   │11/01/25 │$400.00│$355.00│ $45.00 ⚠️     ││ │
│  │ ...other balances not paid...                                  │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  Summary:                                                             │
│  • 6 balances will be affected                                       │
│  • 5 balances will be fully closed                                   │
│  • 1 balance will be partially paid                                  │
│  • Remaining unallocated: $0.00                                      │
│  • Net to driver after obligations: $0.00                            │
│                                                                       │
│  ⚠️  Note: This allocation cannot be undone once applied.            │
│                                                                       │
│  [< Back to Edit]                         [Cancel] [✓ Apply Payment]│
│                                                                       │
└───────────────────────────────────────────────────────────────────────┘
```

### Success State

```
┌─────────────────────────────────────────────────────────┐
│ ✅ Payment Applied Successfully                         │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Payment Posting Created: LP-2025-000456                │
│  Amount: $500.00                                        │
│                                                          │
│  Allocations Created: 6                                 │
│  Balances Updated: 6                                    │
│  Balances Closed: 5                                     │
│                                                          │
│  Updated Balance Summary:                               │
│  • Previous Outstanding: $1,245.50                      │
│  • Payment Applied: $500.00                             │
│  • Current Outstanding: $745.50                         │
│                                                          │
│  [View Payment Details] [View Updated Balance] [Close] │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 5. Apply Payment - Targeted Mode

### Purpose
Apply payment to specific balance (interim payment, bypasses hierarchy).

### Wireframe

```
┌─────────────────────────────────────────────────────────────────────┐
│ BAT Connect - Apply Payment (Targeted Mode)            [User: Admin]│
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  💵 Apply Payment - Targeted Mode (Interim Payment)                 │
│                                                                       │
│  ℹ️  This mode applies payment to a SPECIFIC balance, bypassing      │
│     payment hierarchy. Use for driver ad-hoc payments.               │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ Step 1: Find the Balance to Pay                               │   │
│  │                                                               │   │
│  │ Search by:                                                    │   │
│  │ ○ Balance ID   ○ Driver + Category   ● Reference ID         │   │
│  │                                                               │   │
│  │ Balance ID or Reference ID                                    │   │
│  │ [LB-2025-000123_________________] [🔍 Search]                │   │
│  │                                                               │   │
│  │ - OR -                                                        │   │
│  │                                                               │   │
│  │ Driver: [John Smith (#D-12345)              ▼]               │   │
│  │ Category: [PVB - Parking Violations         ▼]               │   │
│  │ [Search Open Balances]                                        │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                       │
└───────────────────────────────────────────────────────────────────────┘
```

### After Finding Balance

```
┌─────────────────────────────────────────────────────────────────────┐
│  Selected Balance Details                                            │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ Balance ID: LB-2025-000123                                     │ │
│  │ Driver: John Smith (#D-12345)                                  │ │
│  │ Lease: #L-456                                                  │ │
│  │ Category: PVB (Parking Violation)                              │ │
│  │ Reference: PVB-SUMMONS-789456                                  │ │
│  │                                                                │ │
│  │ Original Amount: $115.00                                       │ │
│  │ Previously Paid: $0.00                                         │ │
│  │ Outstanding Balance: $115.00                                   │ │
│  │                                                                │ │
│  │ Due Date: 10/27/2025 ⚠️ OVERDUE                               │ │
│  │ Status: OPEN                                                   │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ Step 2: Payment Information                                   │   │
│  │                                                               │   │
│  │ * Payment Amount                                              │   │
│  │   $ [115.00_____]                                            │   │
│  │   Maximum: $115.00 (outstanding balance)                      │   │
│  │   [Pay Full Amount]                                           │   │
│  │                                                               │   │
│  │ * Payment Method                                              │   │
│  │   ○ Cash   ○ Check   ○ ACH   ○ Card                         │   │
│  │                                                               │   │
│  │   Check Number (if applicable)                                │   │
│  │   [_____________]                                            │   │
│  │                                                               │   │
│  │ * Payment Period                                              │   │
│  │   From: [📅 10/26/2025] To: [📅 11/01/2025]                 │   │
│  │                                                               │   │
│  │   Notes                                                       │   │
│  │   [Driver brought cash to office to pay PVB violation        ] │   │
│  │   [Receipt #RCPT-12345 issued                                ] │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ ⚠️  IMPORTANT: Targeted Payment Notice                         │ │
│  │                                                                 │ │
│  │ This payment will be applied DIRECTLY to the selected balance, │ │
│  │ BYPASSING the normal payment hierarchy.                        │ │
│  │                                                                 │ │
│  │ Higher priority obligations will NOT be paid with this payment.│ │
│  │                                                                 │ │
│  │ ☑ I understand and confirm this is an interim payment         │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  [Cancel]                              [Preview] [💰 Apply Payment]  │
│                                                                       │
└───────────────────────────────────────────────────────────────────────┘
```

### Preview Screen

```
┌─────────────────────────────────────────────────────────┐
│ Payment Preview                                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Payment Type: INTERIM PAYMENT (Targeted)               │
│                                                          │
│  Balance Being Paid:                                    │
│  • Balance ID: LB-2025-000123                           │
│  • Category: PVB                                        │
│  • Reference: PVB-SUMMONS-789456                        │
│  • Current Outstanding: $115.00                         │
│                                                          │
│  Payment Amount: $115.00                                │
│  Payment Method: Cash                                   │
│                                                          │
│  After Payment:                                         │
│  • New Outstanding: $0.00                               │
│  • Status: CLOSED ✓                                     │
│                                                          │
│  This transaction will create:                          │
│  • 1 CREDIT posting (payment)                           │
│  • 1 payment allocation record                          │
│  • Balance will be closed                               │
│                                                          │
│  ⚠️  Higher priority obligations will NOT be paid:      │
│  • TAXES: $100.00 outstanding                           │
│  • EZPASS: $45.00 outstanding                           │
│                                                          │
│  [< Back] [Cancel]            [✓ Confirm & Apply]      │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 6. Void Posting

### Purpose
Void an incorrect posting by creating a reversal entry.

### Wireframe

```
┌─────────────────────────────────────────────────────────────────────┐
│ BAT Connect - Void Posting                              [User: Admin]│
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  🚫 Void Ledger Posting                                              │
│                                                                       │
│  ⚠️  WARNING: Voiding creates a permanent reversal entry.            │
│     The original posting will be marked VOIDED but remains visible.  │
│     Use this for corrections, not deletions.                         │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ Find Posting to Void                                          │   │
│  │                                                               │   │
│  │ Posting ID                                                    │   │
│  │ [LP-2025-000456____________] [🔍 Search]                     │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                       │
└───────────────────────────────────────────────────────────────────────┘
```

### After Finding Posting

```
┌─────────────────────────────────────────────────────────────────────┐
│  Posting Details                                                     │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ ⚠️  You are about to VOID this posting:                        │ │
│  │                                                                 │ │
│  │ Posting ID: LP-2025-000456                                     │ │
│  │ Type: DEBIT (Obligation)                                       │ │
│  │ Category: EZPASS                                               │ │
│  │ Amount: $25.00                                                 │ │
│  │                                                                 │ │
│  │ Driver: John Smith (#D-12345)                                  │ │
│  │ Lease: #L-456                                                  │ │
│  │ Source: EZPASS_TRANSACTION / EZP-20251024-001                 │ │
│  │                                                                 │ │
│  │ Created: 2025-10-24 10:15:33                                   │ │
│  │ Created By: Jane Admin                                         │ │
│  │ Status: POSTED                                                 │ │
│  │                                                                 │ │
│  │ Related Balance: LB-2025-000789 (OPEN, $25.00 outstanding)    │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  ⚠️  This posting can be voided because:                             │
│  ✓ Status is POSTED (not already voided)                            │
│  ✓ No payments have been applied to related balance yet             │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ Void Information                                              │   │
│  │                                                               │   │
│  │ * Reason for Voiding (Required)                               │   │
│  │   [Incorrect amount - should be $35.00 not $25.00           ] │   │
│  │   [Staff entered wrong toll charge from EZPass CSV           ] │   │
│  │   [                                                          ] │   │
│  │   Minimum 10 characters required                              │   │
│  │                                                               │   │
│  │ What will happen:                                             │   │
│  │ 1. Original posting marked as VOIDED                          │   │
│  │ 2. Reversal posting created (CREDIT $25.00)                  │   │
│  │ 3. Related balance adjusted (if applicable)                   │   │
│  │ 4. Both postings remain in system (audit trail)              │   │
│  │ 5. You can then create corrected posting                      │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ ⚠️  Final Confirmation                                          │ │
│  │                                                                 │ │
│  │ ☑ I confirm this posting should be voided                      │ │
│  │ ☑ I have documented the correct value for reposting           │ │
│  │ ☑ I understand this creates a permanent reversal entry        │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  [Cancel]                                               [🚫 VOID]    │
│                                                                       │
└───────────────────────────────────────────────────────────────────────┘
```

### Cannot Void - Error State

```
┌─────────────────────────────────────────────────────────┐
│ ⛔ Cannot Void Posting                                  │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Posting ID: LP-2025-000456                             │
│  Status: VOIDED                                         │
│                                                          │
│  This posting cannot be voided because:                 │
│                                                          │
│  ❌ Posting is already voided                           │
│     Voided on: 2025-10-24 14:22:10                     │
│     Voided by: Jane Admin                               │
│     Reason: Incorrect amount                            │
│     Reversal: LP-2025-000457                           │
│                                                          │
│  [View Reversal Posting]  [Close]                      │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Success State

```
┌─────────────────────────────────────────────────────────┐
│ ✅ Posting Voided Successfully                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Original Posting: LP-2025-000456                       │
│  Status Changed: POSTED → VOIDED                        │
│                                                          │
│  Reversal Posting Created: LP-2025-000999               │
│  Type: CREDIT (reversal)                                │
│  Amount: $25.00                                         │
│                                                          │
│  Related Balance: LB-2025-000789                        │
│  Updated Outstanding: $0.00 (balanced out)              │
│                                                          │
│  Next Steps:                                            │
│  📝 Create corrected posting with accurate amount       │
│  📧 Notify driver of correction (if needed)             │
│                                                          │
│  [Create Corrected Entry] [View Audit Trail] [Close]   │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 7. View Balance Details

### Purpose
View detailed information about a specific balance with payment history.

### Wireframe

```
┌─────────────────────────────────────────────────────────────────────┐
│ BAT Connect - Balance Details                          [User: Admin]│
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  📊 Balance Details                                                  │
│                                                                       │
│  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓   │
│  ┃ Balance ID: LB-2025-000123                                    ┃   │
│  ┃ Status: OPEN 🟢                                               ┃   │
│  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛   │
│                                                                       │
│  Entity Information                                                   │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ Driver: John Smith (#D-12345)        [View Driver Profile →]  │ │
│  │ Lease: #L-456 (Active)               [View Lease Details →]   │ │
│  │ Vehicle: Y234 - 2023 Toyota Camry                              │ │
│  │ Medallion: 1Y23                                                │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  Obligation Details                                                   │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ Category: PVB - Parking Violation 🅿️                          │ │
│  │ Priority in Hierarchy: #4 of 8                                 │ │
│  │                                                                 │ │
│  │ Reference Type: PVB_VIOLATION                                  │ │
│  │ Reference ID: PVB-SUMMONS-789456                               │ │
│  │ [View Source Document →]                                       │ │
│  │                                                                 │ │
│  │ Payment Period: 10/26/2025 - 11/01/2025 (Week 43)            │ │
│  │ Due Date: 10/27/2025 ⚠️ OVERDUE (2 days)                     │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  Financial Summary                                                    │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ Original Amount:        $115.00                                │ │
│  │ Prior Balance:            $0.00                                │ │
│  │ Current Charges:        $115.00                                │ │
│  │ ─────────────────────────────────                              │ │
│  │ Subtotal:               $115.00                                │ │
│  │                                                                 │ │
│  │ Payments Applied:         $0.00                                │ │
│  │ ─────────────────────────────────                              │ │
│  │ Outstanding Balance:    $115.00  ⚠️                           │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  Payment History                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ No payments applied yet.                                        │ │
│  │                                                                 │ │
│  │ [Apply Payment to This Balance]                                │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  Related Postings                                                     │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ Posting ID     │ Type  │ Amount   │ Date       │ Status        │ │
│  ├────────────────────────────────────────────────────────────────┤ │
│  │ LP-2025-000456│ DEBIT │ $115.00  │ 10/25/2025 │ POSTED ✓     │ │
│  │   Description: PVB violation - No standing zone                │ │
│  │   [View Posting Details]                                        │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  Audit Trail                                                          │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ Created: 2025-10-25 09:15:22 by System (PVB Import)           │ │
│  │ Modified: 2025-10-25 09:15:22 by System                        │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  Actions                                                              │
│  [Apply Payment] [View Driver Balance] [Export PDF] [📧 Email]      │
│                                                                       │
└───────────────────────────────────────────────────────────────────────┘
```

### With Payment History

```
│  Payment History                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ Allocation ID │Date      │Amount  │Type         │Balance After ││ │
│  ├────────────────────────────────────────────────────────────────┤ │
│  │ PA-2025-001   │10/28/2025│ $50.00 │DTR_ALLOCATION│  $65.00     ││ │
│  │   Payment: LP-2025-000789                                       │ │
│  │   Notes: Weekly DTR allocation                                  │ │
│  │   [View Payment Details]                                        │ │
│  │                                                                  │ │
│  │ PA-2025-002   │10/29/2025│ $65.00 │INTERIM_PAYMENT│ $0.00 ✓   ││ │
│  │   Payment: LP-2025-000890                                       │ │
│  │   Notes: Driver cash payment                                    │ │
│  │   [View Payment Details]                                        │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  Balance closed on 10/29/2025                                        │
```

---

## 8. View Posting Details

### Purpose
View complete details of a single posting including relationships.

### Wireframe

```
┌─────────────────────────────────────────────────────────────────────┐
│ BAT Connect - Posting Details                          [User: Admin]│
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  📄 Posting Details                                                  │
│                                                                       │
│  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓   │
│  ┃ Posting ID: LP-2025-000456                                    ┃   │
│  ┃ Status: POSTED ✓                                              ┃   │
│  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛   │
│                                                                       │
│  Transaction Details                                                  │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ Type: DEBIT (Obligation)                                       │ │
│  │ Category: EZPASS - Toll Charges 🚗                            │ │
│  │ Amount: $25.00                                                 │ │
│  │                                                                 │ │
│  │ Description:                                                    │ │
│  │ George Washington Bridge toll - Upper level                    │ │
│  │                                                                 │ │
│  │ Notes:                                                          │ │
│  │ Imported from EZPass CSV - October batch                       │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  Entity Information                                                   │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ Driver: John Smith (#D-12345)        [View Profile →]         │ │
│  │ Lease: #L-456 (Active)               [View Lease →]           │ │
│  │ Vehicle: Y234 - 2023 Toyota Camry    [View Vehicle →]         │ │
│  │ Medallion: 1Y23                      [View Medallion →]        │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  Source Information                                                   │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ Source Type: EZPASS_TRANSACTION                                │ │
│  │ Source ID: EZP-20251024-001                                    │ │
│  │                                                                 │ │
│  │ [View Source Record →]                                         │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  Payment Period                                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ Week Start: Sunday, October 26, 2025                           │ │
│  │ Week End: Saturday, November 01, 2025                          │ │
│  │ Week Number: Week 43 of 2025                                   │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  Posting Lifecycle                                                    │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ Created: 2025-10-24 10:15:33                                   │ │
│  │ Created By: System (EZPass Import)                             │ │
│  │                                                                 │ │
│  │ Posted: 2025-10-24 10:15:33                                    │ │
│  │ Posted By: System                                              │ │
│  │                                                                 │ │
│  │ Modified: 2025-10-24 10:15:33                                  │ │
│  │ Modified By: -                                                  │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  Related Records                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ Related Balance: LB-2025-000789                                │ │
│  │   Status: OPEN                                                  │ │
│  │   Outstanding: $25.00                                           │ │
│  │   [View Balance Details →]                                     │ │
│  │                                                                 │ │
│  │ Payment Allocations: None                                       │ │
│  │   This obligation has not been paid yet                         │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  Void/Reversal Status                                                 │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ ✓ This posting has NOT been voided                             │ │
│  │ ✓ This is NOT a reversal posting                               │ │
│  │                                                                 │ │
│  │ [Void This Posting]                                            │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  Actions                                                              │
│  [Apply Payment] [Void Posting] [Export PDF] [Copy Posting ID]      │
│                                                                       │
└───────────────────────────────────────────────────────────────────────┘
```

### Voided Posting View

```
│  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓   │
│  ┃ Posting ID: LP-2025-000456                                    ┃   │
│  ┃ Status: VOIDED ⛔                                             ┃   │
│  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛   │
│                                                                       │
│  ⚠️  This posting has been voided and is no longer active.          │
│                                                                       │
│  Void Information                                                     │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ Voided: 2025-10-24 14:22:10                                    │ │
│  │ Voided By: Jane Admin (#U-789)                                 │ │
│  │                                                                 │ │
│  │ Void Reason:                                                    │ │
│  │ Incorrect amount - should be $35.00 not $25.00                 │ │
│  │ Staff entered wrong toll charge from EZPass CSV                │ │
│  │                                                                 │ │
│  │ Reversal Posting: LP-2025-000457 (CREDIT $25.00)              │ │
│  │ [View Reversal Posting →]                                     │ │
│  │                                                                 │ │
│  │ Corrected Posting: LP-2025-000458 (DEBIT $35.00)              │ │
│  │ [View Corrected Posting →]                                    │ │
│  └────────────────────────────────────────────────────────────────┘ │
```

---

## General UI Guidelines

### Color Scheme
- **Green (#10B981)**: Success, POSTED, CLOSED, positive actions
- **Yellow (#F59E0B)**: Warning, PENDING, approaching due date
- **Red (#EF4444)**: Error, VOIDED, OVERDUE, critical items
- **Blue (#3B82F6)**: Information, links, primary actions
- **Gray (#6B7280)**: Inactive, disabled, secondary text

### Typography
- **Headers**: Bold, 18-24px
- **Body Text**: Regular, 14-16px
- **Small Text**: 12-13px (dates, IDs, secondary info)
- **Monospace**: Posting IDs, Balance IDs (for easy copying)

### Interactive Elements
- **Primary Buttons**: Blue background, white text
- **Danger Buttons**: Red background, white text
- **Secondary Buttons**: Gray border, black text
- **Links**: Blue underline on hover

### Responsive Design
- Tablet: Stack forms vertically, reduce table columns
- Mobile: Single column layout, collapsible sections
- Use modals for complex operations on mobile

### Accessibility
- ARIA labels on all interactive elements
- Keyboard navigation support (Tab, Enter, Esc)
- Screen reader friendly
- High contrast mode support
- Focus indicators visible

### Loading States
```
┌─────────────────────────────────┐
│  ⏳ Loading...                  │
│                                  │
│  Fetching driver balance...     │
│                                  │
│  [Animated spinner]             │
└─────────────────────────────────┘
```

### Empty States
```
┌─────────────────────────────────┐
│  📭 No Results Found            │
│                                  │
│  Try adjusting your filters     │
│  or search criteria.            │
│                                  │
│  [Clear Filters]                │
└─────────────────────────────────┘
```

---

This completes the comprehensive UI wireframe documentation for the Ledger System!