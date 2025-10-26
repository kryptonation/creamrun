## app/bpm_flows/additionaldriver/utils.py

from datetime import datetime

from sqlalchemy import and_, exists
from sqlalchemy.orm import Session

from app.drivers.schemas import DriverStatus
from app.drivers.services import driver_service
from app.leases.models import Lease, LeaseDriver, LeaseDriverDocument
from app.leases.services import lease_service
from app.utils.logger import get_logger

logger = get_logger(__name__)


def add_additional_driver(db: Session, lease: Lease, driver_update_info: dict):
    driver_id = driver_update_info.get("driver_id")
    is_day_night_shift = driver_update_info.get("is_day_night_shift")

    valid_driver = driver_service.get_drivers(db=db, driver_id=driver_id)

    if not valid_driver:
        raise ValueError(f"Driver ID {driver_id} passed is invalid")

    if is_day_night_shift is None:
        driver_role = "L"
    elif is_day_night_shift:
        driver_role = "DL"
    else:
        driver_role = "NL"

    # Check if the driver already exists in the LeaseDriver and DriverDocument table
    lease_driver = (
        db.query(LeaseDriver)
        .join(
            LeaseDriverDocument, LeaseDriver.id == LeaseDriverDocument.lease_driver_id
        )
        .filter(LeaseDriver.driver_id == driver_id, LeaseDriver.lease_id == lease.id)
        .first()
    )

    if lease_driver:
        raise ValueError(
            "Driver has already signed a lease, cannot be considered as an additional driver"
        )

    lease_driver = (
        db.query(LeaseDriver)
        .filter(LeaseDriver.driver_id == driver_id, LeaseDriver.lease_id == lease.id)
        .first()
    )

    data = {}

    if lease_driver:
        data = {
            "id": lease_driver.id,
            "is_day_night_shift": is_day_night_shift,
            "is_additional_driver": True,
            "is_active": True,
        }
    else:
        data = {
            "driver_id": driver_id,
            "lease_id": lease.id,
            "driver_role": driver_role,
            "is_day_night_shift": is_day_night_shift,
            "date_added": datetime.utcnow(),
            "is_additional_driver": True,
            "is_active": True,
        }

    driver_service.upsert_driver(
        db=db, driver_data={"id": valid_driver.id, "driver_status": DriverStatus.ACTIVE}
    )
    lease_service.upsert_lease_driver(db=db, lease_driver_data=data)

    return f"Driver {driver_id} added to successfully for lease {lease.lease_id}."


def has_driver_signed_lease(db: Session, lease: Lease, driver):
    """Check if a driver has already signed a lease for the given lease."""
    return db.query(
        exists().where(
            and_(
                LeaseDriver.driver_id == driver.driver_id,
                LeaseDriver.lease_id == lease.id,
                LeaseDriverDocument.lease_driver_id == LeaseDriver.id,
            )
        )
    ).scalar()
