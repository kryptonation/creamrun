### app/worker/start_worker.py

"""
Celery worker startup script

This script starts the celery worker with appropriate configuration.
Worker processes tasks from the queues.
"""

# Standard library imports
import sys

# Local imports
from app.core.config import settings
from app.utils.logger import get_logger
from app.worker.app import app

logger = get_logger(__name__)


def start_worker():
    """Start the celery worker."""

    # Worker configuration
    argv = [
        "worker",
        "--loglevel=info",  # Loglevel (debug, info, warning, error, critical)
        "--concurrency=1",  # Number of concurrent workers
        "--max-tasks-per-child=100",  # Number of tasks a worker can process before restarting
        "--time-limit=1800",  # Time limit for a task in seconds (30 minutes)
        "--soft-time-limit=1500",  # Soft time limit for a task in seconds (25 minutes)
        "--prefetch-multiplier=1",  # Prefetch multiplier for the worker
    ]

    logger.info("Starting Celery worker ...")
    logger.info(f"Redis URL: redis://{settings.redis_host}:{settings.redis_port}/0")
    logger.info("Available task modules:")
    for module in ["app.curb"]:
        logger.info(f"- {module}.tasks")

    # Start the worker
    app.worker_main(argv)


if __name__ == "__main__":
    start_worker()
