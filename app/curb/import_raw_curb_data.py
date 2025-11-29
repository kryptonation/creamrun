"""
Import Raw CURB Data to S3

This module contains functions to fetch raw CURB data and upload to S3.
Each function handles a specific CURB service endpoint.
"""

import json
import time
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from io import BytesIO
from typing import Any, Dict, List, Optional, Tuple

from app.core.celery_app import app
from app.core.config import settings
from app.curb.services import CurbApiService
from app.utils.logger import get_logger
from app.utils.s3_utils import s3_utils

logger = get_logger(__name__)


def upload_metadata_to_s3(metadata: Dict[str, Any], file_path: str) -> Optional[str]:
    """
    Upload metadata JSON to S3.

    Args:
        metadata: Dictionary containing metadata to upload
        file_path: S3 key path for the JSON file

    Returns:
        S3 path if successful, None otherwise
    """
    try:
        json_content = json.dumps(metadata, indent=2, default=str)
        json_bytes = BytesIO(json_content.encode("utf-8"))

        success = s3_utils.upload_file(
            file_obj=json_bytes, key=file_path, content_type="application/json"
        )

        if success:
            s3_path = f"s3://{s3_utils.bucket_name}/{file_path}"
            logger.info(f"✓ Uploaded metadata to {s3_path}")
            return s3_path
        else:
            logger.error(f"Failed to upload metadata to {file_path}")
            return None

    except Exception as e:
        logger.error(f"Error uploading metadata: {str(e)}", exc_info=True)
        return None


def count_records_in_xml(xml_content: str, tag_name: str = "trip") -> int:
    """
    Count the number of records in XML content.

    Args:
        xml_content: XML string to parse
        tag_name: Tag name to count (default: 'trip', can also be 'tran')

    Returns:
        Number of records found
    """
    if not xml_content:
        return 0

    try:
        root = ET.fromstring(xml_content)
        nodes = root.findall(f".//{tag_name}")
        return len(nodes)
    except ET.ParseError as e:
        logger.error(f"Failed to parse XML for counting: {e}")
        return 0


def fetch_and_upload_transactions(
    start_datetime: str, end_datetime: str, job_id: str, folder_path: str
) -> Tuple[Dict[str, Any], Optional[str]]:
    """
    Fetch transaction data from get_trans_by_date_cab12 and upload to S3.

    Args:
        start_datetime: Start datetime in format "common_date_format common_time_format"
        end_datetime: End datetime in format "common_date_format common_time_format"
        job_id: Unique job identifier
        folder_path: S3 folder path (e.g., "curb-data/01-15-2025/14-30")

    Returns:
        Tuple of (metadata dict, s3_path or None)
    """
    logger.info(
        f"Fetching transactions from get_trans_by_date_cab12 ({start_datetime} to {end_datetime})"
    )
    trans_start_time = time.time()

    try:
        curb_api = CurbApiService()

        # Fetch data from CURB API
        trans_xml = curb_api.get_trans_by_date_cab12(
            from_date=start_datetime,
            to_date=end_datetime,
        )

        trans_duration = time.time() - trans_start_time

        # Count records
        trans_count = count_records_in_xml(trans_xml, "tran")

        # Upload to S3
        trans_filename = f"{folder_path}transactions_{job_id}.xml"
        xml_bytes = BytesIO(trans_xml.encode("utf-8"))

        success = s3_utils.upload_file(
            file_obj=xml_bytes, key=trans_filename, content_type="application/xml"
        )

        if not success:
            raise Exception("Failed to upload transactions XML to S3")

        trans_s3_path = f"s3://{s3_utils.bucket_name}{trans_filename}"
        logger.info(f"✓ Uploaded {trans_count} transactions to {trans_s3_path}")

        # Prepare and upload metadata
        trans_metadata = {
            "type": "transactions",
            "job_id": job_id,
            "start_datetime": start_datetime,
            "end_datetime": end_datetime,
            "record_count": trans_count,
            "duration_seconds": round(trans_duration, 2),
            "xml_s3_path": trans_s3_path,
            "api_endpoint": "get_trans_by_date_cab12",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "status": "success",
        }

        # Upload metadata JSON to metadata subfolder
        metadata_filename = (
            f"{folder_path}metadata/transactions_{job_id}_metadata.json"
        )
        metadata_s3_path = upload_metadata_to_s3(trans_metadata, metadata_filename)

        return {
            "record_count": trans_count,
            "duration_seconds": round(trans_duration, 2),
            "s3_path": trans_s3_path,
            "metadata_s3_path": metadata_s3_path,
            "status": "success",
        }, trans_s3_path

    except Exception as e:
        logger.error(f"Failed to fetch/upload transactions: {str(e)}", exc_info=True)
        return {
            "status": "failed",
            "error": str(e),
            "error_type": type(e).__name__,
        }, None


def fetch_and_upload_trips(
    start_datetime: str, end_datetime: str, job_id: str, folder_path: str
) -> Tuple[Dict[str, Any], Optional[str]]:
    """
    Fetch trip data from get_trips_log10 and upload to S3.

    Args:
        start_datetime: Start datetime in format "common_date_format common_time_format"
        end_datetime: End datetime in format "common_date_format common_time_format"
        job_id: Unique job identifier
        folder_path: S3 folder path (e.g., "curb-data/01-15-2025/14-30")

    Returns:
        Tuple of (metadata dict, s3_path or None)
    """
    logger.info(
        f"Fetching trips from get_trips_log10 ({start_datetime} to {end_datetime})"
    )
    trips_start_time = time.time()

    try:
        curb_api = CurbApiService()

        # Fetch data from CURB API
        trips_xml = curb_api.get_trips_log10(
            from_date=start_datetime,
            to_date=end_datetime,
        )

        trips_duration = time.time() - trips_start_time

        # Count records
        trips_count = count_records_in_xml(trips_xml, "trip")

        # Upload to S3
        trips_filename = f"{folder_path}trips_{job_id}.xml"
        xml_bytes = BytesIO(trips_xml.encode("utf-8"))

        success = s3_utils.upload_file(
            file_obj=xml_bytes, key=trips_filename, content_type="application/xml"
        )

        if not success:
            raise Exception("Failed to upload trips XML to S3")

        trips_s3_path = f"s3://{s3_utils.bucket_name}{trips_filename}"
        logger.info(f"✓ Uploaded {trips_count} trips to {trips_s3_path}")

        # Prepare and upload metadata
        trips_metadata = {
            "type": "trips",
            "job_id": job_id,
            "start_datetime": start_datetime,
            "end_datetime": end_datetime,
            "record_count": trips_count,
            "duration_seconds": round(trips_duration, 2),
            "xml_s3_path": trips_s3_path,
            "api_endpoint": "get_trips_log10",
            "timestamp": datetime.utcnow().isoformat(),
            "status": "success",
        }

        # Upload metadata JSON to metadata subfolder
        metadata_filename = f"{folder_path}metadata/trips_{job_id}_metadata.json"
        metadata_s3_path = upload_metadata_to_s3(trips_metadata, metadata_filename)

        return {
            "record_count": trips_count,
            "duration_seconds": round(trips_duration, 2),
            "s3_path": trips_s3_path,
            "metadata_s3_path": metadata_s3_path,
            "status": "success",
        }, trips_s3_path

    except Exception as e:
        logger.error(f"Failed to fetch/upload trips: {str(e)}", exc_info=True)
        return {
            "status": "failed",
            "error": str(e),
            "error_type": type(e).__name__,
        }, None


@app.task(
    bind=True,
    name="curb.import_and_process_from_s3",
    max_retries=3,
    default_retry_delay=60,
)
def import_and_process_from_s3_task(
    self,
    start_datetime: str,
    end_datetime: str,
) -> Dict[str, Any]:
    """
    Celery task to import and process CURB data from S3.

    This task:
    1. Lists XML files in S3 for the datetime range
    2. Downloads and parses XML files
    3. Normalizes and stores trip data in database
    4. Reconciles trips with CURB API (production) or locally (non-production)

    Args:
        start_datetime: Start datetime in "common_date_format common_time_format"
        end_datetime: End datetime in "common_date_format common_time_format"

    Returns:
        Dictionary with import summary including:
        - source: "s3"
        - datetime_range: Start and end datetime
        - files_processed: Count of transaction and trip files
        - records_fetched: Total unique records
        - newly_inserted: New records inserted
        - records_updated: Existing records updated
        - records_reconciled: Records reconciled
        - reconciliation_id: Reconciliation batch ID
        - parse_errors: List of parsing errors

    Example:
        {
            "source": "s3",
            "datetime_range": {
                "from": "09/21/2025 12:00:00",
                "to": "09/21/2025 15:00:00"
            },
            "files_processed": {
                "transactions": 3,
                "trips": 3
            },
            "records_fetched": 1245,
            "newly_inserted": 1100,
            "records_updated": 145,
            "records_reconciled": 1245,
            "reconciliation_id": "BAT-S3-RECO-20250921150000",
            "parse_errors": []
        }
    """
    from app.core.db import SessionLocal
    from app.curb.services import CurbService

    logger.info("*" * 80)
    logger.info(
        f"Starting S3 import and process task: {start_datetime} to {end_datetime}"
    )

    db = None
    try:
        # Parse datetime strings
        datetime_format = f"{settings.common_date_format} {settings.common_time_format}"
        start_dt = datetime.strptime(start_datetime, datetime_format)
        end_dt = datetime.strptime(end_datetime, datetime_format)

        # Initialize database session and service
        db = SessionLocal()
        curb_service = CurbService(db)

        # Import and process from S3
        result = curb_service.import_and_reconcile_from_s3(
            start_datetime=start_dt, end_datetime=end_dt
        )

        logger.info(
            f"S3 import completed: {result.get('records_fetched', 0)} records fetched, "
            f"{result.get('newly_inserted', 0)} inserted, "
            f"{result.get('records_updated', 0)} updated, "
            f"{result.get('records_reconciled', 0)} reconciled"
        )

        # Save task result to S3 results folder
        if settings.curb_results_s3_folder:
            # Create folder path using the end datetime
            folder_date = end_dt.strftime(settings.common_date_format).replace("/", "-")
            folder_time = end_dt.strftime(settings.common_time_format).replace(":", "-")

            task_id = f"s3_process_{end_dt.strftime('%Y%m%d_%H%M%S')}"
            result_filename = f"{settings.curb_results_s3_folder}/{folder_date}/{folder_time}{task_id}_process_result.json"

            upload_metadata_to_s3(result, result_filename)
            logger.info(f"Saved process result to {result_filename}")
        logger.info("*" * 80)
        return result

    except Exception as e:
        logger.error(f"S3 import and process task failed: {str(e)}", exc_info=True)
        if db:
            db.rollback()
        raise self.retry(exc=e, countdown=60)

    finally:
        if db:
            db.close()


@app.task(name="curb.fetch_and_process_chained")
def fetch_and_process_chained(
    start_datetime: Optional[str] = None, end_datetime: Optional[str] = None
):
    """
    Chains the fetch/upload and process tasks using Celery chain.

    This task is called from Celery Beat and will:
    1. Fetch from CURB API and upload to S3
    2. Then import from S3 and process into database

    The chain ensures step 2 only runs after step 1 completes successfully.
    The start_datetime and end_datetime from step 1 are passed to step 2.

    Args:
        start_datetime: Start datetime in "common_date_format common_time_format"
                       (defaults to settings.curb_import_window_minutes ago)
        end_datetime: End datetime in "common_date_format common_time_format" (defaults to now)
    """
    from celery import chain

    logger.info("Starting fetch_and_process_chained task")

    # Calculate datetime if not provided
    if not end_datetime or not start_datetime:
        datetime_format = f"{settings.common_date_format} {settings.common_time_format}"
        now = datetime.now()

        if not end_datetime:
            end_datetime = now.strftime(datetime_format)

        if not start_datetime:
            if settings.curb_import_window_minutes is None:
                raise ValueError(
                    "curb_import_window_minutes must be configured in settings"
                )
            start_datetime_obj = now - timedelta(
                minutes=settings.curb_import_window_minutes
            )
            start_datetime = start_datetime_obj.strftime(datetime_format)

    logger.info(
        f"Starting chained fetch and process pipeline: {start_datetime} to {end_datetime}"
    )

    # Create chain: upload to S3, then process from S3
    # .si() creates a signature immutable - it ignores the previous task's result
    # Both tasks receive the same start_datetime and end_datetime explicitly
    workflow = chain(
        import_raw_curb_data_task.si(
            start_datetime=start_datetime, end_datetime=end_datetime
        ),
        import_and_process_from_s3_task.si(
            start_datetime=start_datetime, end_datetime=end_datetime
        ),
    )

    return workflow.apply_async()


@app.task(bind=True, name="curb.test_job")
def test_import(self):
    logger.info("Ping job !!")


@app.task(
    bind=True, name="curb.import_raw_data_to_s3", max_retries=3, default_retry_delay=60
)
def import_raw_curb_data_task(
    self,
    start_datetime: Optional[str] = None,
    end_datetime: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Celery task to import raw CURB data to S3.

    This task runs periodically based on settings.curb_import_window_minutes and:
    1. Fetches transaction data from get_trans_by_date_cab12
    2. Fetches trip data from get_trips_log10
    3. Uploads raw XML files to S3 in datetime-organized folders
    4. Returns metadata (execution time, record counts, timestamps)

    Args:
        start_datetime: Start datetime in "common_date_format common_time_format"
                       (defaults to settings.curb_import_window_minutes ago)
        end_datetime: End datetime in "common_date_format common_time_format" (defaults to now)

    Returns:
        Dictionary with execution metadata including:
        - job_id: Unique job identifier
        - start_time: Job start timestamp
        - end_time: Job completion timestamp
        - duration_seconds: Total execution time
        - transactions: Transaction fetch/upload metadata
        - trips: Trip fetch/upload metadata
        - uploaded_files: List of uploaded S3 paths
        - status: Success/failure status

    Settings Required (from settings.py):
        aws_access_key_id: AWS access key
        aws_secret_access_key: AWS secret key
        s3_bucket_name: S3 bucket name for uploads
        aws_region: AWS region
        common_date_format: Standard date format (e.g., "%m/%d/%Y")
        common_time_format: Standard time format (e.g., "%H:%M:%S")
        curb_s3_folder: S3 folder for CURB data (default: "curb-data")
        curb_import_window_minutes: Time window in minutes for data import (required)

    Example S3 structure (if common_date_format is "%m/%d/%Y" and common_time_format is "%H:%M:%S"):
        curb-data/
        └── 01-15-2025/
            └── 14-30-22/
                ├── transactions_curb_import_20250115_143022_abc12345.xml
                └── trips_curb_import_20250115_143022_abc12345.xml

    Example return value:
        {
            "job_id": "curb_import_20250115_143022_abc12345",
            "task_id": "abc12345-def6-7890-ghij-klmnopqrstuv",
            "start_time": "2025-01-15T14:30:22.123456Z",
            "end_time": "2025-01-15T14:35:45.789012Z",
            "duration_seconds": 323.67,
            "start_date": "01/15/2025",
            "end_date": "01/15/2025",
            "transactions": {
                "record_count": 1245,
                "duration_seconds": 45.23,
                "s3_path": "s3://bucket/curb-data/2025/01/15/transactions_...xml",
                "status": "success"
            },
            "trips": {
                "record_count": 892,
                "duration_seconds": 38.12,
                "s3_path": "s3://bucket/curb-data/2025/01/15/trips_...xml",
                "status": "success"
            },
            "uploaded_files": [
                "s3://bucket/curb-data/2025/01/15/transactions_...xml",
                "s3://bucket/curb-data/2025/01/15/trips_...xml"
            ],
            "status": "completed"
        }
    """
    job_start_time = time.time()
    job_id = f"curb_import_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}_{self.request.id[:8]}"

    logger.info("*" * 80)
    logger.info(f"Starting CURB raw data import job: {job_id}")

    # Parse datetime strings (both are now required)
    datetime_format = f"{settings.common_date_format} {settings.common_time_format}"

    if not start_datetime or not end_datetime:
        raise ValueError("start_datetime and end_datetime are required")

    start_datetime_obj = datetime.strptime(start_datetime, datetime_format)
    end_datetime_obj = datetime.strptime(end_datetime, datetime_format)

    # Create folder path using standard datetime format
    folder_date = end_datetime_obj.strftime(settings.common_date_format).replace(
        "/", "-"
    )
    folder_time = end_datetime_obj.strftime(settings.common_time_format).replace(
        ":", "-"
    )
    folder_path = f"{settings.curb_s3_folder}/{folder_date}/{folder_time}"

    # Initialize metadata
    metadata = {
        "job_id": job_id,
        "task_id": self.request.id,
        "start_time": datetime.now(timezone.utc).isoformat(),
        "start_datetime": start_datetime,
        "end_datetime": end_datetime,
        "status": "running",
    }

    uploaded_files = []

    try:
        # Fetch and upload transactions
        trans_metadata, trans_s3_path = fetch_and_upload_transactions(
            start_datetime, end_datetime, job_id, folder_path
        )
        metadata["transactions"] = trans_metadata
        if trans_s3_path:
            uploaded_files.append(trans_s3_path)

        # Fetch and upload trips
        trips_metadata, trips_s3_path = fetch_and_upload_trips(
            start_datetime, end_datetime, job_id, folder_path
        )
        metadata["trips"] = trips_metadata
        if trips_s3_path:
            uploaded_files.append(trips_s3_path)

        # Finalize metadata
        job_end_time = time.time()
        total_duration = job_end_time - job_start_time

        metadata.update(
            {
                "end_time": datetime.now(timezone.utc).isoformat(),
                "duration_seconds": round(total_duration, 2),
                "uploaded_files": uploaded_files,
                "status": "completed",
            }
        )

        logger.info(
            f"Job {job_id} completed in {total_duration:.2f}s - "
            f"Transactions: {metadata['transactions'].get('record_count', 0)}, "
            f"Trips: {metadata['trips'].get('record_count', 0)}"
        )

        # Upload job summary metadata to S3 metadata subfolder
        job_metadata_filename = f"{folder_path}metadata/{job_id}_summary.json"
        job_metadata_s3_path = upload_metadata_to_s3(metadata, job_metadata_filename)

        if job_metadata_s3_path:
            metadata["job_metadata_s3_path"] = job_metadata_s3_path

        # Save task result to S3 results folder
        if settings.curb_results_s3_folder:
            result_filename = f"{settings.curb_results_s3_folder}/{folder_date}/{folder_time}{job_id}_upload_result.json"
            upload_metadata_to_s3(metadata, result_filename)
            logger.info(f"Saved upload result to {result_filename}")

        logger.info("*" * 80)
        return metadata

    except Exception as e:
        logger.error(f"CURB import job {job_id} failed: {str(e)}", exc_info=True)

        # Update metadata with failure info
        metadata.update(
            {
                "end_time": datetime.utcnow().isoformat(),
                "duration_seconds": round(time.time() - job_start_time, 2),
                "status": "failed",
                "error": str(e),
                "error_type": type(e).__name__,
            }
        )

        # Retry the task
        raise self.retry(exc=e, countdown=60)


@app.task(name="task_one")
def task_one():
    logger.warning("🔥 TASK ONE EXECUTED")
    return "done-one"


@app.task(name="task_two")
def task_two(prev):
    logger.warning(f"🔥 TASK TWO EXECUTED, got: {prev}")
    return "done-two"


@app.task(name="run_chain")
def run_chain():
    from celery import chain

    logger.warning("🔥 CHAIN WRAPPER CALLED")

    wf = chain(
        task_one.s(),
        task_two.s(),
    )

    result = wf.apply_async()
    logger.warning(f"🔥 CHAIN DISPATCHED, root id={result.id}")
    return result.id
