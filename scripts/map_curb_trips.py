#!/usr/bin/env python3
"""
Script to map reconciled CURB trips using `CurbService.map_reconciled_trips()`.

Usage (from repository root):
  python backend/scripts/map_curb_trips.py

The script ensures the `backend/` package directory is on `sys.path` so
`import app` works when run from the project root.
"""
from pathlib import Path
import sys
import json

# Ensure the `backend/` directory is on sys.path so `import app` resolves.
BASE_DIR = Path(__file__).resolve().parents[1]
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from app.core.db import SessionLocal
from app.curb.services import CurbService
from app.utils.logger import get_logger
# Ensure related model mappers are registered before opening a session.
# Some relationships reference the 'DTR' class by name; importing the module
# that defines that class ensures SQLAlchemy can resolve the relationship.
import app.dtr.models  # noqa: F401


def main() -> int:
    logger = get_logger(__name__)

    # Create a synchronous DB session
    db = SessionLocal()
    try:
        service = CurbService(db=db)

        # Cab numbers to map
        cab_numbers = ["4K17", "1P19", "9V76"]
        combined_results = {}

        for cab in cab_numbers:
            logger.info(f"Mapping reconciled trips for cab: {cab}")
            try:
                res = service.map_reconciled_trips_for_cab(cab)
                combined_results[cab] = res
            except Exception as e:
                logger.exception("Error mapping cab %s: %s", cab, e)
                combined_results[cab] = {"error": str(e)}

        # Print combined results as JSON for easy consumption
        print(json.dumps(combined_results, default=str, indent=2))
        return 0

    except Exception as e:
        logger.exception("map_curb_trips script failed: %s", e)
        print({"error": str(e)})
        return 2

    finally:
        try:
            db.close()
        except Exception:
            pass


if __name__ == "__main__":
    raise SystemExit(main())
