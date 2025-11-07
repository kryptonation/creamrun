#!/usr/bin/env python3
"""
Test script to verify CURB import functionality with Celery worker.
This script directly tests the Celery task without going through the API.
"""

import sys
import os
from datetime import datetime

# Add the project root to Python path
sys.path.insert(0, os.path.abspath('.'))

# Configure environment
os.environ.setdefault('DATABASE_URL', 'mysql+asyncmy://root:admin@localhost:3306/batm?charset=utf8mb4')
os.environ.setdefault('REDIS_URL', 'redis://localhost:6379/0')

from app.curb.services import import_driver_data_task

def test_curb_import():
    """Test the CURB import task directly."""
    print("Testing CURB driver import task...")
    
    try:
        # Call the Celery task - this will execute asynchronously
        task = import_driver_data_task.delay(
            driver_id=None,
            tlc_license_no="378546", 
            start_date_str="2025-11-01",
            end_date_str="2025-11-02"
        )
        
        print(f"Task submitted successfully! Task ID: {task.id}")
        print(f"Task state: {task.state}")
        
        # Wait for result (with timeout)
        try:
            result = task.get(timeout=30)
            print("Task completed successfully!")
            print(f"Result: {result}")
        except Exception as e:
            print(f"Task failed or timed out: {e}")
            print(f"Task state: {task.state}")
            
    except Exception as e:
        print(f"Failed to submit task: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_curb_import()