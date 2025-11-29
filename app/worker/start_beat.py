### app/worker/start_beat.py

"""
Celery Beat Startup Script

This script starts celery beat scheduler which triggers periodic tasks
according to the schedule defined in config.py
"""

# Local imports
from app.core.config import settings
from app.utils.logger import get_logger
from app.worker.app import app

logger = get_logger(__name__)


def start_beat():
    """Start the celery beat scheduler."""

    # Beat configuration
    argv = [
        "beat",
        "--loglevel=info",
        "--scheduler=celery.beat:PersistentScheduler",  # Use persistent scheduler for scheduled tasks
        "--schedule=/tmp/celerybeat-schedule",  # Schedule file location
        "--pidfile=/tmp/celerybeat.pid",  # PID file location
    ]

    logger.info("Starting Celery Beat Scheduler ...")
    logger.info(f"Redis URL: redis://{settings.redis_host}:{settings.redis_port}/0")
    logger.info("Scheduled tasks:")

    # Display the configured schedules
    for task_name, task_config in app.conf.beat_schedule.items():
        schedule = task_config["schedule"]
        task = task_config["task"]
        logger.info(f"- {task_name}: {task} -> {schedule}")

    # Start the beat scheduler
    app.start(argv)


if __name__ == "__main__":
    start_beat()
