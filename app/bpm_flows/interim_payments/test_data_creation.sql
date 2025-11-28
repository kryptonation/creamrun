USE apple;
-- ============================================================================
-- TEST DATA CREATION - LEDGER BALANCES FOR INTERIM PAYMENTS
-- ============================================================================
-- Purpose: Create test ledger balances for testing interim payment workflow
-- Prerequisites: 
--   1. Driver with TLC license "00504124" exists (driver_id = "DRV-101")
--   2. Active lease exists (lease_id = "LS-2054")
--   3. Medallion "1P43" exists and linked to lease
-- ============================================================================

-- ============================================================================
-- STEP 1: VERIFY PREREQUISITES
-- ============================================================================

-- Check if driver exists
SELECT 
    d.id,
    d.driver_id,
    CONCAT(d.first_name, ' ', d.last_name) as full_name,
    tl.tlc_license_number
FROM drivers d
INNER JOIN driver_tlc_license tl ON d.tlc_license_number_id = tl.id
WHERE tl.tlc_license_number = '00504124';

-- Expected: John Doe, DRV-101

-- Check if lease exists
SELECT 
    l.id,
    l.lease_id,
    l.lease_status,
    m.medallion_number
FROM leases l
INNER JOIN medallions m ON l.medallion_id = m.id
WHERE l.lease_id = 'LS-2054'
  AND l.lease_status = 'Active';

-- Expected: LS-2054, Active, 1P43

-- ============================================================================
-- STEP 2: CREATE LEDGER POSTINGS (DEBIT = OBLIGATIONS)
-- ============================================================================

-- Clear existing test data (if any)
DELETE FROM ledger_balances 
WHERE driver_id = 'DRV-101' 
  AND lease_id = 'LS-2054'
  AND reference_id LIKE 'TEST-%';

DELETE FROM ledger_postings 
WHERE driver_id = 'DRV-101' 
  AND lease_id = 'LS-2054'
  AND source_type = 'TEST_DATA';

-- Insert DEBIT postings (creates obligations)

-- 1. LEASE obligation ($265.00)
INSERT INTO ledger_postings (
    driver_id,
    lease_id,
    posting_type,
    category,
    reference_id,
    amount,
    description,
    source_type,
    source_id,
    posted_on,
    posted_by,
    status
) VALUES (
    'DRV-101',
    'LS-2054',
    'DEBIT',
    'LEASE',
    'MED-102-LS-08',
    265.00,
    'Weekly lease payment - Week 43',
    'TEST_DATA',
    'TEST-LEASE-001',
    NOW(),
    1,
    'POSTED'
);

-- 2. REPAIRS obligation ($450.00)
INSERT INTO ledger_postings (
    driver_id,
    lease_id,
    posting_type,
    category,
    reference_id,
    amount,
    description,
    source_type,
    source_id,
    posted_on,
    posted_by,
    status
) VALUES (
    'DRV-101',
    'LS-2054',
    'DEBIT',
    'REPAIRS',
    'INV-2457',
    450.00,
    'Brake pad replacement and oil change',
    'TEST_DATA',
    'TEST-REPAIR-001',
    NOW(),
    1,
    'POSTED'
);

-- 3. LOANS obligation ($92.50)
INSERT INTO ledger_postings (
    driver_id,
    lease_id,
    posting_type,
    category,
    reference_id,
    amount,
    description,
    source_type,
    source_id,
    posted_on,
    posted_by,
    status
) VALUES (
    'DRV-101',
    'LS-2054',
    'DEBIT',
    'LOANS',
    'LN-3001',
    92.50,
    'Loan installment - Week 1 of 10',
    'TEST_DATA',
    'TEST-LOAN-001',
    NOW(),
    1,
    'POSTED'
);

-- 4. EZPASS obligation ($450.00)
INSERT INTO ledger_postings (
    driver_id,
    lease_id,
    posting_type,
    category,
    reference_id,
    amount,
    description,
    source_type,
    source_id,
    posted_on,
    posted_by,
    status
) VALUES (
    'DRV-101',
    'LS-2054',
    'DEBIT',
    'EZPASS',
    'EZ-6789',
    450.00,
    'EZPass toll charges - October 2024',
    'TEST_DATA',
    'TEST-EZPASS-001',
    NOW(),
    1,
    'POSTED'
);

-- 5. PVB obligation ($92.50)
INSERT INTO ledger_postings (
    driver_id,
    lease_id,
    posting_type,
    category,
    reference_id,
    amount,
    description,
    source_type,
    source_id,
    posted_on,
    posted_by,
    status
) VALUES (
    'DRV-101',
    'LS-2054',
    'DEBIT',
    'PVB',
    'PVB-12345',
    92.50,
    'Parking violation - 5th Ave & 42nd St',
    'TEST_DATA',
    'TEST-PVB-001',
    NOW(),
    1,
    'POSTED'
);

-- 6. MISC obligation ($92.50)
INSERT INTO ledger_postings (
    driver_id,
    lease_id,
    posting_type,
    category,
    reference_id,
    amount,
    description,
    source_type,
    source_id,
    posted_on,
    posted_by,
    status
) VALUES (
    'DRV-101',
    'LS-2054',
    'DEBIT',
    'MISC',
    'MIS-125890',
    92.50,
    'Vehicle registration fee',
    'TEST_DATA',
    'TEST-MISC-001',
    NOW(),
    1,
    'POSTED'
);

-- 7. TLC obligation ($100.00)
INSERT INTO ledger_postings (
    driver_id,
    lease_id,
    posting_type,
    category,
    reference_id,
    amount,
    description,
    source_type,
    source_id,
    posted_on,
    posted_by,
    status
) VALUES (
    'DRV-101',
    'LS-2054',
    'DEBIT',
    'TLC',
    'TLC-8901',
    100.00,
    'TLC license renewal fee',
    'TEST_DATA',
    'TEST-TLC-001',
    NOW(),
    1,
    'POSTED'
);

-- 8. TAXES obligation ($75.00)
INSERT INTO ledger_postings (
    driver_id,
    lease_id,
    posting_type,
    category,
    reference_id,
    amount,
    description,
    source_type,
    source_id,
    posted_on,
    posted_by,
    status
) VALUES (
    'DRV-101',
    'LS-2054',
    'DEBIT',
    'TAXES',
    'TAX-2024-Q4',
    75.00,
    'Q4 2024 tax obligation',
    'TEST_DATA',
    'TEST-TAX-001',
    NOW(),
    1,
    'POSTED'
);

-- ============================================================================
-- STEP 3: CREATE LEDGER BALANCES
-- ============================================================================

-- 1. LEASE balance
INSERT INTO ledger_balances (
    driver_id,
    lease_id,
    category,
    reference_id,
    original_amount,
    balance,
    is_closed,
    created_on,
    updated_on
) VALUES (
    'DRV-101',
    'LS-2054',
    'LEASE',
    'MED-102-LS-08',
    265.00,
    265.00,
    0,
    NOW(),
    NOW()
);

-- 2. REPAIRS balance
INSERT INTO ledger_balances (
    driver_id,
    lease_id,
    category,
    reference_id,
    original_amount,
    balance,
    is_closed,
    created_on,
    updated_on
) VALUES (
    'DRV-101',
    'LS-2054',
    'REPAIRS',
    'INV-2457',
    450.00,
    450.00,
    0,
    NOW(),
    NOW()
);

-- 3. LOANS balance
INSERT INTO ledger_balances (
    driver_id,
    lease_id,
    category,
    reference_id,
    original_amount,
    balance,
    is_closed,
    created_on,
    updated_on
) VALUES (
    'DRV-101',
    'LS-2054',
    'LOANS',
    'LN-3001',
    92.50,
    92.50,
    0,
    NOW(),
    NOW()
);

-- 4. EZPASS balance
INSERT INTO ledger_balances (
    driver_id,
    lease_id,
    category,
    reference_id,
    original_amount,
    balance,
    is_closed,
    created_on,
    updated_on
) VALUES (
    'DRV-101',
    'LS-2054',
    'EZPASS',
    'EZ-6789',
    450.00,
    450.00,
    0,
    NOW(),
    NOW()
);

-- 5. PVB balance
INSERT INTO ledger_balances (
    driver_id,
    lease_id,
    category,
    reference_id,
    original_amount,
    balance,
    is_closed,
    created_on,
    updated_on
) VALUES (
    'DRV-101',
    'LS-2054',
    'PVB',
    'PVB-12345',
    92.50,
    92.50,
    0,
    NOW(),
    NOW()
);

-- 6. MISC balance
INSERT INTO ledger_balances (
    driver_id,
    lease_id,
    category,
    reference_id,
    original_amount,
    balance,
    is_closed,
    created_on,
    updated_on
) VALUES (
    'DRV-101',
    'LS-2054',
    'MISC',
    'MIS-125890',
    92.50,
    92.50,
    0,
    NOW(),
    NOW()
);

-- 7. TLC balance
INSERT INTO ledger_balances (
    driver_id,
    lease_id,
    category,
    reference_id,
    original_amount,
    balance,
    is_closed,
    created_on,
    updated_on
) VALUES (
    'DRV-101',
    'LS-2054',
    'TLC',
    'TLC-8901',
    100.00,
    100.00,
    0,
    NOW(),
    NOW()
);

-- 8. TAXES balance
INSERT INTO ledger_balances (
    driver_id,
    lease_id,
    category,
    reference_id,
    original_amount,
    balance,
    is_closed,
    created_on,
    updated_on
) VALUES (
    'DRV-101',
    'LS-2054',
    'TAXES',
    'TAX-2024-Q4',
    75.00,
    75.00,
    0,
    NOW(),
    NOW()
);

-- ============================================================================
-- STEP 4: VERIFY TEST DATA CREATED
-- ============================================================================

-- Check postings created
SELECT 
    id,
    category,
    reference_id,
    amount,
    description,
    posted_on
FROM ledger_postings
WHERE driver_id = 'DRV-101'
  AND lease_id = 'LS-2054'
  AND source_type = 'TEST_DATA'
ORDER BY category;

-- Expected: 8 rows

-- Check balances created
SELECT 
    id,
    category,
    reference_id,
    original_amount,
    balance,
    is_closed
FROM ledger_balances
WHERE driver_id = 'DRV-101'
  AND lease_id = 'LS-2054'
  AND is_closed = 0
ORDER BY category;

-- Expected: 8 rows with total balance = $1,617.50

-- Calculate total outstanding
SELECT 
    COUNT(*) as balance_count,
    SUM(balance) as total_outstanding
FROM ledger_balances
WHERE driver_id = 'DRV-101'
  AND lease_id = 'LS-2054'
  AND is_closed = 0;

-- Expected: 8 balances, $1,617.50 total

-- ============================================================================
-- ALTERNATIVE SCENARIOS
-- ============================================================================

-- ============================================================================
-- SCENARIO 2: SINGLE CATEGORY (Only LEASE obligations)
-- ============================================================================

-- Clear existing test data
DELETE FROM ledger_balances 
WHERE driver_id = 'DRV-101' 
  AND lease_id = 'LS-2054';

DELETE FROM ledger_postings 
WHERE driver_id = 'DRV-101' 
  AND lease_id = 'LS-2054';

-- Create 3 LEASE obligations
INSERT INTO ledger_postings (driver_id, lease_id, posting_type, category, reference_id, amount, description, source_type, source_id, posted_on, posted_by, status)
VALUES 
    ('DRV-101', 'LS-2054', 'DEBIT', 'LEASE', 'MED-102-LS-08', 265.00, 'Weekly lease - Week 43', 'TEST_DATA', 'TEST-LEASE-001', NOW(), 1, 'POSTED'),
    ('DRV-101', 'LS-2054', 'DEBIT', 'LEASE', 'MED-102-LS-09', 265.00, 'Weekly lease - Week 44', 'TEST_DATA', 'TEST-LEASE-002', NOW(), 1, 'POSTED'),
    ('DRV-101', 'LS-2054', 'DEBIT', 'LEASE', 'MED-102-LS-10', 265.00, 'Weekly lease - Week 45', 'TEST_DATA', 'TEST-LEASE-003', NOW(), 1, 'POSTED');

INSERT INTO ledger_balances (driver_id, lease_id, category, reference_id, original_amount, balance, is_closed, created_on, updated_on)
VALUES 
    ('DRV-101', 'LS-2054', 'LEASE', 'MED-102-LS-08', 265.00, 265.00, 0, NOW(), NOW()),
    ('DRV-101', 'LS-2054', 'LEASE', 'MED-102-LS-09', 265.00, 265.00, 0, NOW(), NOW()),
    ('DRV-101', 'LS-2054', 'LEASE', 'MED-102-LS-10', 265.00, 265.00, 0, NOW(), NOW());

-- Total outstanding: $795.00

-- ============================================================================
-- SCENARIO 3: PARTIAL PAYMENT TEST (Small exact amounts)
-- ============================================================================

-- Clear existing test data
DELETE FROM ledger_balances 
WHERE driver_id = 'DRV-101' 
  AND lease_id = 'LS-2054';

DELETE FROM ledger_postings 
WHERE driver_id = 'DRV-101' 
  AND lease_id = 'LS-2054';

-- Create 2 obligations totaling $600.00
INSERT INTO ledger_postings (driver_id, lease_id, posting_type, category, reference_id, amount, description, source_type, source_id, posted_on, posted_by, status)
VALUES 
    ('DRV-101', 'LS-2054', 'DEBIT', 'LEASE', 'MED-102-LS-20', 300.00, 'Weekly lease - exact payment test', 'TEST_DATA', 'TEST-LEASE-100', NOW(), 1, 'POSTED'),
    ('DRV-101', 'LS-2054', 'DEBIT', 'REPAIRS', 'INV-5001', 300.00, 'Oil change - exact payment test', 'TEST_DATA', 'TEST-REPAIR-100', NOW(), 1, 'POSTED');

INSERT INTO ledger_balances (driver_id, lease_id, category, reference_id, original_amount, balance, is_closed, created_on, updated_on)
VALUES 
    ('DRV-101', 'LS-2054', 'LEASE', 'MED-102-LS-20', 300.00, 300.00, 0, NOW(), NOW()),
    ('DRV-101', 'LS-2054', 'REPAIRS', 'INV-5001', 300.00, 300.00, 0, NOW(), NOW());

-- Total outstanding: $600.00
-- Perfect for testing exact payment allocation

-- ============================================================================
-- CLEANUP SCRIPT
-- ============================================================================

-- Use this to clean up all test data when done testing

DELETE FROM ledger_balances 
WHERE driver_id = 'DRV-101' 
  AND lease_id = 'LS-2054'
  AND is_closed = 0;

DELETE FROM ledger_postings 
WHERE driver_id = 'DRV-101' 
  AND lease_id = 'LS-2054'
  AND source_type = 'TEST_DATA';

-- Verify cleanup
SELECT COUNT(*) FROM ledger_balances WHERE driver_id = 'DRV-101' AND lease_id = 'LS-2054';
-- Expected: 0

SELECT COUNT(*) FROM ledger_postings WHERE driver_id = 'DRV-101' AND lease_id = 'LS-2054' AND source_type = 'TEST_DATA';
-- Expected: 0