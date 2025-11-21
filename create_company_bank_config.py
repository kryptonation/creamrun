#!/usr/bin/env python3
"""
Script to create a test company bank configuration for ACH processing.
Run this from the backend directory with: python -m create_company_bank_config
"""

import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

from sqlalchemy import text
from app.core.db import engine
from datetime import datetime


def create_test_config():
    """Create a test company bank configuration using raw SQL"""
    
    try:
        with engine.connect() as conn:
            # Check if config already exists
            result = conn.execute(text("SELECT COUNT(*) FROM company_bank_configuration"))
            count = result.scalar()
            
            if count > 0:
                print("✓ Company bank configuration already exists")
                result = conn.execute(text("SELECT company_name, bank_name FROM company_bank_configuration LIMIT 1"))
                row = result.fetchone()
                print(f"  Company: {row[0]}")
                print(f"  Bank: {row[1]}")
                return
            
            # Insert test configuration
            conn.execute(text("""
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
                    :company_name,
                    :company_tax_id,
                    :bank_name,
                    :bank_routing_number,
                    :bank_account_number,
                    :immediate_origin,
                    :immediate_destination,
                    :company_entry_description,
                    :is_active,
                    :created_on,
                    :updated_on
                )
            """), {
                "company_name": "Big Apple Taxi Management",
                "company_tax_id": "1234567890",
                "bank_name": "Test Bank",
                "bank_routing_number": "021000021",
                "bank_account_number": "1234567890",
                "immediate_origin": "1234567890",
                "immediate_destination": "0210000210",
                "company_entry_description": "DRVPAY",
                "is_active": True,
                "created_on": datetime.now(),
                "updated_on": datetime.now()
            })
            
            conn.commit()
            
            print("✓ Successfully created company bank configuration")
            print("  Company: Big Apple Taxi Management")
            print("  Bank: Test Bank")
            print("  Routing: 021000021")
            print("\n⚠️  IMPORTANT: Update these test values with real banking information!")
        
    except Exception as e:
        print(f"✗ Error creating configuration: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    create_test_config()
