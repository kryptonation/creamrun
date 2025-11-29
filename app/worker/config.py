### app/worker/config.py

"""
Celery configuration settings

This file contains all the Celery configurations including:
- Broker and result backend settings
- Task serialization settings
- Timezone configuration
- Beat schedule for periodic tasks
"""

# Third party imports
from celery.schedules import crontab

# Local imports
from app.core.config import settings

# Broker and result backend configurations
broker_url = settings.celery_broker
result_backend = settings.celery_backend

# Task serialization
task_serializer = "json"
accept_content = ["json"]
result_serializer = "json"
timezone = "UTC"
enable_utc = True

# Task settings
task_track_started = True
task_time_limit = 30 * 60  # 30 minutes
task_soft_time_limit = 25 * 60  # 25 minutes
worker_prefetch_multiplier = 1
task_acks_late = True
worker_disable_rate_limits = False

# Redis connection pool settings to prevent connection exhaustion
broker_connection_retry_on_startup = True
broker_connection_retry = True
broker_connection_max_retries = 10

# Redis connection pool configuration
redis_max_connections = 50
redis_socket_timeout = 10
redis_socket_connect_timeout = 10
redis_retry_on_timeout = True
redis_health_check_interval = 30

# Connection pool settings for both broker and backend
broker_transport_options = {
    "master_name": "localhost",
    "max_connections": 20,
    "socket_timeout": 10,
    "socket_connect_timeout": 10,
    "socket_keepalive": True,
    "socket_keepalive_options": {},
    "retry_on_timeout": True,
    "health_check_interval": 30,
}

result_backend_transport_options = {
    "master_name": "localhost",
    "max_connections": 20,
    "socket_timeout": 10,
    "socket_connect_timeout": 10,
    "socket_keepalive": True,
    "socket_keepalive_options": {},
    "retry_on_timeout": True,
    "health_check_interval": 30,
}


# Beat schedule configuration
# This defines when periodic tasks should run
beat_schedule = {
    # --- CURB Fetch, Upload to S3, and Process Pipeline (Every 2 Minutes) ---
    "curb-fetch-upload-and-process": {
        "task": "curb.fetch_and_process_chained",
        "schedule": 9.0,  # Runs every 2 minutes (120 seconds)
        "options": {"timezone": "America/New_York"},
    },
    # "curb-test-job": {
    #     "task": "curb.test_job",
    #     "schedule": crontab(minute="*"),  # runs every minute
    #     "options": {"timezone": "America/New_York"},
    # },
    # # --- CURB Data Import Task (Daily) ---
    # "curb-fetch-and-import": {
    #     "task": "curb.fetch_and_import_curb_trips_task",
    #     "schedule": crontab(hour=2, minute=0),  # Runs daily at 2:00 AM
    #     "options": {"timezone": "America/New_York"},
    # },
    # # --- CURB Earnings Posting Task (Weekly) ---
    # # IMPORTANT: This must run BEFORE the DTR generation task.
    # "curb-post-earnings-to-ledger": {
    #     "task": "curb.post_earnings_to_ledger_task",
    #     "schedule": crontab(
    #         hour=4, minute=0, day_of_week="sun"
    #     ),  # Runs every Sunday at 4:00 AM
    #     "options": {"timezone": "America/New_York"},
    # },
    # # --- Lease Fees Posting Task (Weekly) ---
    # "post-weekly-lease-fees": {
    #     "task": "leases.post_weekly_lease_fees",
    #     "schedule": crontab(
    #         hour=5, minute=0, day_of_week="sun"
    #     ),  # Runs every Sunday at 5:00 AM
    #     "options": {"timezone": "America/New_York"},
    # },
    # # --- Loan Installments Task (Weekly) ---
    # "post-due-loan-installments": {
    #     "task": "loans.post_due_installments",
    #     "schedule": crontab(
    #         hour=5, minute=15, day_of_week="sun"
    #     ),  # Runs every Sunday at 5:15 AM
    #     "options": {"timezone": "America/New_York"},
    # },
    # # --- Repair Installments Task (Weekly) ---
    # "post-due-repair-installments": {
    #     "task": "repairs.post_due_installments",
    #     "schedule": crontab(
    #         hour=5, minute=30, day_of_week="sun"
    #     ),  # Runs every Sunday at 5:30 AM
    #     "options": {"timezone": "America/New_York"},
    # },
    # # --- DTR Generation Task (Weekly) ---
    # # IMPORTANT: This must run AFTER all other financial tasks.
    # "generate-weekly-dtrs": {
    #     "task": "driver_payments.generate_weekly_dtrs",
    #     "schedule": crontab(
    #         hour=6, minute=0, day_of_week="sun"
    #     ),  # Runs every Sunday at 6:00 AM
    #     "options": {"timezone": "America/New_York"},
    # },
    # # --- BPM SLA Processing Task (Daily) ---
    # "process-case-sla": {
    #     "task": "bpm.sla.process_case_sla",
    #     "schedule": crontab(hour=1, minute=0),  # Runs daily at 1:00 AM
    #     "options": {"timezone": "America/New_York"},
    # },
    # # --- PVB Association Task (Daily) ---
    # "associate-pvb-violations": {
    #     "task": "pvb.associate_violations",
    #     "schedule": crontab(hour=3, minute=0),  # Runs daily at 3:00 AM
    #     "options": {"timezone": "America/New_York"},
    # },
    # # --- EZPass Association Task (Daily) ---
    # "associate-ezpass-transactions": {
    #     "task": "ezpass.associate_transactions",
    #     "schedule": crontab(hour=3, minute=30),  # Runs daily at 3:30 AM
    #     "options": {"timezone": "America/New_York"},
    # },
}

# Worker configuration
worker_hijack_root_logger = False
worker_log_color = False
