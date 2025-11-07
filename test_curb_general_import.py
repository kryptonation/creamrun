#!/usr/bin/env python3
"""
Test script to verify the fixed CURB import functionality.
This tests the general import task that was failing.
"""

import sys
import os
from datetime import datetime

# Add the project root to Python path
sys.path.insert(0, os.path.abspath('.'))

# Configure environment
os.environ.setdefault('DATABASE_URL', 'mysql+asyncmy://root:admin@localhost:3306/batm?charset=utf8mb4')
os.environ.setdefault('REDIS_URL', 'redis://localhost:6379/0')

from app.curb.services import fetch_and_import_curb_trips_task

def test_curb_general_import():
    """Test the general CURB import task that was failing with null curb_cab_number."""
    print("Testing CURB general import task (fetch_and_import_curb_trips)...")
    
    try:
        # Call the Celery task - this will execute asynchronously
        task = fetch_and_import_curb_trips_task.delay()
        
        print(f"Task submitted successfully! Task ID: {task.id}")
        print(f"Task state: {task.state}")
        
        # Wait for result (with timeout)
        try:
            result = task.get(timeout=60)  # Longer timeout for general import
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
    test_curb_general_import()