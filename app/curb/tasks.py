### app/curb/tasks.py

"""
Celery Task Definitions for the CURB Module.

This file ensures that tasks defined in other parts of the curb module,
such as services, are discoverable by the Celery worker.

By importing them here, we provide a single, clear entry point for Celery's
autodiscovery mechanism as configured in `app/core/celery_app.py`.
"""

from app.curb.import_raw_curb_data import (
    import_raw_curb_data_task,
    import_and_process_from_s3_task,
    fetch_and_process_chained,
    test_import,
)

# The tasks are defined in the services module using the @app.task decorator.
# We simply import them here to make them available to Celery.
# This keeps the task logic co-located with the service that performs the work.

__all__ = [
    "import_raw_curb_data_task",
    "import_and_process_from_s3_task",
    "fetch_and_process_chained",
    "test_import",
]
