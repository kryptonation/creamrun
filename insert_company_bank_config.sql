-- SQL script to insert test company bank configuration
-- Run this with: psql -d your_database_name -f insert_company_bank_config.sql

INSERT INTO company_bank_configuration (
    company_name,
    company_tax_id,
    bank_name,
    bank_routing_number,
    bank_account_number,
    immediate_origin,
    immediate_destination,
    company_entry_description,
    is_active,
    created_on,
    updated_on
) VALUES (
    'Big Apple Taxi Management',
    '1234567890',           -- 10-digit EIN (REPLACE WITH REAL)
    'Test Bank',
    '021000021',            -- 9-digit routing number (REPLACE WITH REAL)
    '1234567890',           -- Account number (REPLACE WITH REAL)
    '1234567890',           -- 10-digit originator ID
    '0210000210',           -- 10-digit destination routing
    'DRVPAY',
    true,
    NOW(),
    NOW()
)
ON CONFLICT DO NOTHING;

-- Verify the insert
SELECT id, company_name, bank_name, bank_routing_number 
FROM company_bank_configuration;
