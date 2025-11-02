### app/vehicles/search_service.py

# Standard library imports
from datetime import date

# Third party imports
from sqlalchemy.orm import Session, aliased, joinedload
from sqlalchemy.sql import and_, exists, or_, desc, asc, func , case

from app.audit_trail.models import AuditTrail
from app.bpm.services import bpm_service

# Local imports
from app.utils.logger import get_logger
from app.drivers.schemas import DriverStatus
from app.entities.models import Entity
from app.leases.models import Lease
from app.medallions.models import Medallion , MedallionOwner
from app.entities.models import Individual , Corporation
from app.uploads.models import Document
from app.vehicles.models import (
    Vehicle,
    VehicleEntity,
    VehicleHackUp,
    VehicleInspection,
    VehicleRegistration,
)
from app.vehicles.schemas import VehicleStatus

logger = get_logger(__name__)


def get_vehicle_deprecation(db: Session, filters, sort_by: str, sort_order: str):
    """Build a query to search for vehicles"""

    query = db.query(Vehicle).options(
        joinedload(Vehicle.vehicle_entity),
        joinedload(Vehicle.registrations),
    )
    if v := filters.get("vin"):
        vin_list = [i.strip() for i in v.split(",")]
        query = query.filter(or_(*[Vehicle.vin.ilike(f"%{i}%") for i in vin_list]))

    if m := filters.get("make"):
        query = query.filter(Vehicle.make.ilike(f"%{m}%"))

    if model := filters.get("model"):
        query = query.filter(Vehicle.model.ilike(f"%{model}%"))

    if y := filters.get("from_make_year"):
        query = query.filter(Vehicle.year >= y)

    if y := filters.get("to_make_year"):
        query = query.filter(Vehicle.year <= y)

    if vt := filters.get("vehicle_type"):
        query = query.filter(Vehicle.vehicle_type.ilike(f"%{vt}%"))

    if e := filters.get("entity_name"):
        query = query.join(VehicleEntity).filter(
            or_(
                *[
                    VehicleEntity.entity_name.ilike(f"%{i.strip()}%")
                    for i in e.split(",")
                ]
            )
        )

    sort_mapping = {
        "vin": Vehicle.vin,
        "make": Vehicle.make,
        "model": Vehicle.model,
        "year": Vehicle.year,
        "vehicle_type": Vehicle.vehicle_type,
        "entity_name": VehicleEntity.entity_name,
        "created_on": Vehicle.created_on,
    }

    sort_col = sort_mapping.get(sort_by, Vehicle.created_on)
    query = query.order_by(
        sort_col.desc() if sort_order.lower() == "desc" else sort_col.asc()
    )

    return query


def get_total_items(db: Session, query):
    """Get the total number of items in the query"""
    return db.query(func.count()).select_from(query.subquery()).scalar()


def get_paginated_results(query, page: int, per_page: int):
    """Get paginated results from the query"""
    return query.offset((page - 1) * per_page).limit(per_page).all()


def get_filtered_values(db: Session):
    """Get the filtered values for the query"""
    status = [key.value for key in VehicleStatus]
    makes = [v.make for v in db.query(Vehicle.make).distinct().all() if v.make]
    models = [v.model for v in db.query(Vehicle.model).distinct().all() if v.model]
    types = ["Regular", "Wav"]
    return status, makes, models, types


def build_inspection_query(db: Session, filters: dict, sort_by: str, sort_order: str):
    """Build a query to search for vehicle inspections"""
    query = db.query(VehicleInspection).join(
        Vehicle, VehicleInspection.vehicle, isouter=True
    )

    if val := filters.get("inspection_id"):
        query = query.filter(VehicleInspection.id == val)

    if vins := filters.get("vin_numbers"):
        vin_list = [v.strip() for v in vins.split(",") if v.strip()]
        query = query.filter(Vehicle.vin.in_(vin_list))

    if itypes := filters.get("inspection_type"):
        itype_list = [i.strip() for i in itypes.split(",") if i.strip()]
        query = query.filter(Vehicle.vehicle_type.in_(itype_list))  # Confirm semantics

    if val := filters.get("mile_run"):
        query = query.filter(VehicleInspection.mile_run == val)

    if val := filters.get("odometer_reading"):
        query = query.filter(VehicleInspection.odometer_reading == val)

    if val := filters.get("result"):
        query = query.filter(VehicleInspection.result == val)

    if d := filters.get("next_inspection_due_from"):
        query = query.filter(VehicleInspection.next_inspection_due_date >= d)

    if d := filters.get("next_inspection_due_to"):
        query = query.filter(VehicleInspection.next_inspection_due_date <= d)

    sort_mapping = {
        "vin": Vehicle.vin,
        "inspection_type": Vehicle.vehicle_type,
        "mile_run": VehicleInspection.mile_run,
        "odometer_reading": VehicleInspection.odometer_reading,
        "result": VehicleInspection.result,
        "next_inspection_due_date": VehicleInspection.next_inspection_due_date,
    }

    sort_col = sort_mapping.get(sort_by, VehicleInspection.inspection_date)
    query = query.order_by(
        sort_col.desc() if sort_order.lower() == "desc" else sort_col.asc()
    )

    return query


def get_inspection_total_items(db: Session, query):
    """Get the total number of items in the query"""
    return db.query(func.count()).select_from(query.subquery()).scalar()


def get_inspection_paginated_results(query, page: int, per_page: int):
    """Get paginated results from the query"""
    return query.offset((page - 1) * per_page).limit(per_page).all()


def build_plate_number_query(db: Session, filters: dict, sort_by: str, sort_order: str):
    """Build a query to search for vehicle registrations"""
    Registration = aliased(VehicleRegistration)

    query = (
        db.query(Registration)
        .join(Vehicle, Vehicle.id == Registration.vehicle_id)
        .options(joinedload(Registration.vehicle))
        .filter(
            Vehicle.vehicle_status.notin_(
                [VehicleStatus.IN_PROGRESS, VehicleStatus.ARCHIVED]
            )
        )
    )

    if plate := filters.get("plate_number"):
        values = [p.strip() for p in plate.split(",")]
        query = query.filter(
            or_(*[Registration.plate_number.ilike(f"%{p}%") for p in values])
        )

    if vin := filters.get("vin"):
        vins = [v.strip() for v in vin.split(",")]
        query = query.filter(or_(*[Vehicle.vin.ilike(f"%{v}%") for v in vins]))

    for field, value in [
        (Vehicle.make, filters.get("make")),
        (Vehicle.model, filters.get("model")),
        (Vehicle.vehicle_type, filters.get("vehicle_type")),
    ]:
        if value:
            query = query.filter(field.ilike(f"%{value}%"))

    if y := filters.get("from_make_year"):
        query = query.filter(Vehicle.year >= y)

    if y := filters.get("to_make_year"):
        query = query.filter(Vehicle.year <= y)

    sort_mapping = {
        "plate_number": Registration.plate_number,
        "vehicle_type": Vehicle.vehicle_type,
        "make": Vehicle.make,
        "model": Vehicle.model,
        "vin": Vehicle.vin,
    }

    sort_col = sort_mapping.get(sort_by, Registration.created_on)
    query = query.order_by(
        sort_col.desc() if sort_order.lower() == "desc" else sort_col.asc()
    )

    return query


def get_plate_total_items(db: Session, query):
    """Get the total number of items in the query"""
    return db.query(func.count()).select_from(query.subquery()).scalar()


def get_plate_paginated_results(query, page: int, per_page: int):
    """Get paginated results from the query"""
    return query.offset((page - 1) * per_page).limit(per_page).all()


from datetime import date


def total_depreciation_till_now(schedule):
    today = date.today().year
    return round(
        sum(item["depreciation"] for item in schedule if item["year"] <= today), 2
    )


MACRS_3_YEAR_HALF_YEAR = [
    (1, 0.3333),
    (2, 0.4445),
    (3, 0.1481),
    (4, 0.0741),
]


def calculate_macrs_schedule(cost: float, purchase_date: date, class_years: int = 3):
    schedule = []
    year = purchase_date.year
    macrs_table = (
        MACRS_3_YEAR_HALF_YEAR if class_years == 3 else []
    )  # Add 5-year if needed

    try:
        cost = float(cost)
    except (TypeError, ValueError):
        raise ValueError("Cost must be a number convertible to float")

    for idx, rate in macrs_table:
        depreciation = round(cost * rate, 2)
        schedule.append(
            {
                "year": year + idx - 1,
                "date": f"{year + idx - 1}-01-01",
                "rate": f"{round(rate * 100, 2)}%",
                "depreciation": depreciation,
            }
        )

    return schedule


def format_plate_result(reg):
    """Format the results for the plate number query"""
    return {
        "plate_number": reg.plate_number,
        "vehicle_type": reg.vehicle.vehicle_type if reg.vehicle else None,
        "make": reg.vehicle.make if reg.vehicle else None,
        "model": reg.vehicle.model if reg.vehicle else None,
        "vin": reg.vehicle.vin if reg.vehicle else None,
        "registration_expiry_date": reg.registration_expiry_date,
    }


def get_vehicles_list(
    db: Session,
    page: int,
    per_page: int,
    sort_by: str,
    sort_order: str,
    vin: str,
    make: str,
    model: str,
    medallion_number: str,
    plate_number: str,
    vehicle_type: str,
    entity_name: str,
    medallion_owner : str,
    from_make_year: int,
    to_make_year: int,
    vehicle_status: str,
    color: str,
    registration_expiry_from: date,
    registration_expiry_to: date,
    has_documents: bool,
    has_medallion: bool,
    has_driver: bool,
):
    """Get the vehicles list"""
    try:
        query = (
            db.query(Vehicle)
            .join(Medallion, Vehicle.medallion_id == Medallion.id, isouter=True)
            .join(VehicleRegistration, Vehicle.id == VehicleRegistration.vehicle_id, isouter=True)
            .join(VehicleEntity, Vehicle.entity_id == VehicleEntity.id, isouter=True)
            .options(
                joinedload(Vehicle.vehicle_entity),
                joinedload(Vehicle.registrations),
                joinedload(Vehicle.medallions),
                joinedload(Vehicle.hackups),
            )
            .filter(Vehicle.vehicle_status.notin_([VehicleStatus.IN_PROGRESS]))
        )

        is_medallion_owner_join = False
        is_corporation_join = False
        is_individual_join = False

        # Vin filters
        if vin:
            vin_numbers = [v.strip() for v in vin.split(",")]
            query = query.filter(
                or_(*[Vehicle.vin.ilike(f"%{v}%") for v in vin_numbers])
            )

        if medallion_number:
            medallions = [m.strip() for m in medallion_number.split(",")]
            query = query.filter(
                or_(*[Medallion.medallion_number.ilike(f"%{m}%") for m in medallions])
            )

        if plate_number:
            plate_numbers = [p.strip() for p in plate_number.split(",")]
            query = query.filter(
                or_(*[VehicleRegistration.plate_number.ilike(f"%{p}%") for p in plate_numbers])
            )

        # Apply filters
        if make:
            query = query.filter(Vehicle.make.ilike(f"%{make}%"))
        if model:
            query = query.filter(Vehicle.model.ilike(f"%{model}%"))
        if from_make_year:
            query = query.filter(Vehicle.year >= from_make_year)
        if to_make_year:
            query = query.filter(Vehicle.year <= to_make_year)
        if vehicle_type:
            types = [vt.strip() for vt in vehicle_type.split(",")]
            query = query.filter(Vehicle.vehicle_type.in_(types))
        if color:
            query = query.filter(Vehicle.color.ilike(f"%{color}%"))
        if entity_name:
            entity_names = [name.strip() for name in entity_name.split(",")]
            query = query.filter(
                or_(
                    *[
                        VehicleEntity.entity_name.ilike(f"%{name}%")
                        for name in entity_names
                    ]
                )
            )

        if medallion_owner:
            medallion_owners = [name.strip() for name in medallion_owner.split(",")]
            if not is_medallion_owner_join:
                query = query.outerjoin(MedallionOwner , Medallion.owner_id == MedallionOwner.id)
                is_medallion_owner_join = True
            if not is_corporation_join:
                query = query.outerjoin(Corporation , MedallionOwner.corporation_id == Corporation.id)
                is_corporation_join = True
            if not is_individual_join:
                query = query.outerjoin(Individual , MedallionOwner.individual_id == Individual.id)
                is_individual_join = True
            
            query = query.filter(or_(
                    *[Individual.full_name.ilike(f"%{name}%") for name in medallion_owners],
                    *[Corporation.name.ilike(f"%{name}%") for name in medallion_owners]
                ))


        if vehicle_status:
            query = query.filter(Vehicle.vehicle_status == vehicle_status)
        if registration_expiry_from:
            query = query.filter(
                VehicleRegistration.registration_expiry_date >= registration_expiry_from
            )
        if registration_expiry_to:
            query = query.filter(
                VehicleRegistration.registration_expiry_date <= registration_expiry_to
            )

        # Exists Check Optimizations
        if has_documents is not None:
            doc_exists = exists().where(
                and_(
                    Document.object_lookup_id == Vehicle.id,
                    Document.object_type == "vehicle",
                )
            ).select_from(Document)

            query = query.filter(doc_exists if has_documents else ~doc_exists)

        if has_medallion is not None:
            if has_medallion:
                # Filter for vehicles that HAVE a medallion
                query = query.filter(Vehicle.medallion_id != None)
            else:
                # Filter for vehicles that DO NOT have a medallion
                query = query.filter(Vehicle.medallion_id == None)

        if has_driver is not None:
            driver_exists = exists().where(Lease.vehicle_id == Vehicle.id).select_from(Lease)
            query = query.filter(driver_exists if has_driver else ~driver_exists)

        # Sorting
        sort_mapping = {
            "vin": Vehicle.vin,
            "make": Vehicle.make,
            "model": Vehicle.model,
            "year": Vehicle.year,
            "medallion_number": Medallion.medallion_number,
            "plate_number": VehicleRegistration.plate_number,
            "vehicle_type": Vehicle.vehicle_type,
            "color": Vehicle.color,
            "entity_name": VehicleEntity.entity_name,
            "vehicle_status": Vehicle.vehicle_status,
            "registration_expiry": VehicleRegistration.registration_expiry_date,
            "created_on": Vehicle.created_on,
        }

        vehicle_status_list = [status.value for status in VehicleStatus]
        vehicle_make_list = [
            vehicle.make
            for vehicle in db.query(Vehicle.make).distinct().all()
            if vehicle.make is not None and vehicle.make != ""
        ]
        vehicle_model_list = [
            vehicle.model
            for vehicle in db.query(Vehicle.model).distinct().all()
            if vehicle.model is not None and vehicle.model != ""
        ]

        vehicle_type_list = [vt[0] for vt in db.query(Vehicle.vehicle_type).distinct().all() if vt[0] is not None]

        sort_column = sort_mapping.get(sort_by, Vehicle.created_on)
        if sort_by and sort_order:
            if sort_by == "medallion_owner":
                if not is_medallion_owner_join:
                    query = query.outerjoin(MedallionOwner , Medallion.owner_id == MedallionOwner.id)
                    is_medallion_owner_join = True
                if not is_corporation_join:
                    query = query.outerjoin(Corporation , MedallionOwner.corporation_id == Corporation.id)
                    is_corporation_join = True
                if not is_individual_join:
                    query = query.outerjoin(Individual , MedallionOwner.individual_id == Individual.id)
                    is_individual_join = True

                owner_name = case(
                        (Corporation.name != None, Corporation.name),
                        else_=Individual.full_name
                    )

                query = query.order_by(
                    asc(owner_name) if sort_order == "asc" else desc(owner_name)
                )

            else:   
                query = query.order_by(
                    sort_column.desc() if sort_order.lower() == "desc" else sort_column.asc()
                )
        else:
            query = query.order_by(Vehicle.updated_on.desc() , Vehicle.created_on.desc())


        # Pagination & Total Count
        subquery = query.subquery()
        total_items = db.query(func.count()).select_from(subquery).scalar()
        vehicles = query.offset((page - 1) * per_page).limit(per_page).all()

        vehicles_list = vehicles if vehicles else []

        items = [format_vehicle_response(item, db) for item in vehicles_list]

        return {
            "page": page,
            "per_page": per_page,
            "total_items": total_items,
            "filtered_status": vehicle_status_list,
            "filtered_make": vehicle_make_list,
            "filtered_model": vehicle_model_list,
            "filtered_vehicle_type": vehicle_type_list,
            "items": items,
        }

    except Exception as e:
        raise e


def format_vehicle_response(vehicle: Vehicle, db: Session):
    """Format the vehicle response"""
    has_documents = (
        db.query(Document)
        .filter(
            Document.object_lookup_id == vehicle.id, Document.object_type == "vehicle"
        )
        .count()
    )
    driver_exists = (
        db.query(Lease)
        .filter(
            Lease.vehicle_id == vehicle.id, Lease.lease_status == DriverStatus.ACTIVE
        )
        .count()
    )
    registration = (
        db.query(VehicleRegistration)
        .filter(
            VehicleRegistration.vehicle_id == vehicle.id,
            VehicleRegistration.is_active == True,
        )
        .order_by(VehicleRegistration.created_on.desc())
        .first()
    )

    hackup = (
        db.query(VehicleHackUp)
        .join(
            Vehicle,
            and_(
                Vehicle.id == VehicleHackUp.vehicle_id,
                Vehicle.vehicle_status.in_(
                    [VehicleStatus.HACKED_UP, VehicleStatus.ACTIVE]
                ),
            ),
        )
        .filter(
            VehicleHackUp.vehicle_id == vehicle.id,
            VehicleHackUp.status == VehicleStatus.ACTIVE,
        )
        .order_by(VehicleHackUp.created_on.desc())
        .first()
    )

    status = "0 of 6"
    if hackup:
        hackup_status = [
           True if hackup.paint_task and hackup.paint_task.is_task_done else False,
           True if hackup.camera_task and hackup.camera_task.is_task_done else False,
           True if hackup.meter_task and hackup.meter_task.is_task_done else False,
           True if hackup.rooftop_task and hackup.rooftop_task.is_task_done else False,
           True if hackup.dmv_registration_task and hackup.dmv_registration_task.is_task_done else False,
           True if hackup.tlc_inspection_task and hackup.tlc_inspection_task.is_task_done else False
        ]
        completed = sum(1 for task_id in hackup_status if task_id == True)
        total = len(hackup_status)
        status = f"{completed} of {total}"

    has_trail = (
        db.query(AuditTrail)
        .filter(AuditTrail.meta_data.contains({"vehicle_id": vehicle.id}))
        .count()
    )

    vehicle_hackup = (
        db.query(VehicleHackUp)
        .filter(VehicleHackUp.vehicle_id == vehicle.id)
        .order_by(VehicleHackUp.created_on.desc())
        .first()
    )

    vehicle_can_rehack = (
        vehicle.vehicle_status == VehicleStatus.AVAILABLE
        and not vehicle.medallion_id
        and vehicle_hackup is not None
        and vehicle_hackup.status == DriverStatus.INACTIVE
    )

    medallion = vehicle.medallions if vehicle.medallions else None
    medallion_owner = medallion.owner if medallion else None
    owner_name = "N/A"
    if medallion_owner:
        owner_type = getattr(medallion_owner, "medallion_owner_type", None)

        if owner_type == "C" and getattr(medallion_owner, "corporation", None):
            owner_name = medallion_owner.corporation.name
        elif owner_type == "I" and getattr(medallion_owner, "individual", None):
            owner_name = medallion_owner.individual.full_name
    # Fetch the latest case for hackup
    latest_hackup_case = bpm_service.fetch_latest_case_based_on_case_type(
        db, "vehicles", vehicle.id, "SENDHACKUP"
    )
    # Added additional fields 
    return {
        "vehicle_id": vehicle.id,
        "vin": vehicle.vin,
        "make": vehicle.make,
        "model": vehicle.model,
        "year": vehicle.year,
        "base_price": vehicle.base_price,
        "sales_tax": vehicle.sales_tax,
        "vehicle_hack_up_cost": vehicle.vehicle_hack_up_cost,
        "vehicle_true_cost": vehicle.vehicle_true_cost,
        "vehicle_lifetime_cap": vehicle.vehicle_lifetime_cap,
        "recoverable_base": min(
            vehicle.vehicle_true_cost or 0,
            vehicle.vehicle_lifetime_cap or 0,
        ),
        "vehicle_type": vehicle.vehicle_type,
        "color": vehicle.color,
        "cylinders": vehicle.cylinders,
        "vehicle_owner": vehicle.vehicle_entity.entity_name if vehicle.vehicle_entity else "",
        "plate_number": registration.plate_number if registration and registration.plate_number else "N/A",
        "medallion_number": medallion.medallion_number if medallion else "",
        "medallion_owner" : owner_name if owner_name else "",
        "odometer": 0,
        "vehicle_revenue": {
            "dov":0,
            "non-dov":0
        },
        "hackup_status": status,
        "has_documents": bool(has_documents),
        "has_medallion": bool(vehicle.medallions),
        "is_driver_associated": bool(driver_exists),
        "vehicle_status": vehicle.vehicle_status,
        "expected_delivery_date": vehicle.expected_delivery_date,
        "delivery_note": vehicle.delivery_note,
        "is_delivered": vehicle.is_delivered,
        "delivery_location": vehicle.delivery_location,
        "vehicle_hackups": bool(hackup),
        "latest_hackup_case": latest_hackup_case.case_no if latest_hackup_case else "",
        "can_vehicle_rehack": vehicle_can_rehack,
        "audit_trail": bool(has_trail),
        "registration_expiry_date": registration.registration_expiry_date if registration and registration.registration_expiry_date else "N/A",
        "fuel": None
    }
