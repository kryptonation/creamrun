### app/ezpass/tasks.py

"""
Celery Task Definitions for the EZPass Module.

This file ensures that tasks defined within the ezpass module are discoverable
by the Celery worker. By importing them here, we provide a single entry point
for Celery's autodiscovery mechanism.
"""

from app.ezpass.services import (
    associate_ezpass_transactions_task,
    post_ezpass_tolls_to_ledger_task,
)

# The tasks are defined in the services module using the @shared_task decorator.
# We import them here to make them available to Celery's auto-discovery process.
# This keeps the task logic co-located with the service that performs the work.

__all__ = [
    "associate_ezpass_transactions_task",
    "post_ezpass_tolls_to_ledger_task",
]