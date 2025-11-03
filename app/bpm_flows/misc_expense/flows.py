# ### app/bpm_flows/misc_expense/flows.py

# from sqlalchemy.orm import Session
# from fastapi import HTTPException

# from app.bpm.services import bpm_service
# from app.bpm.step_info import step
# from app.drivers.services import driver_service
# from app.misc_expenses.schemas import MiscellaneousExpenseCreate
# from app.misc_expenses.services import MiscellaneousExpenseService
# from app.leases.services import lease_service
# from app.utils.logger import get_logger

# logger = get_logger(__name__)


# @step(step_id="MISCEXP-001", name="Fetch - Search Driver & Enter Expense Details", operation="fetch")
# def fetch_driver_and_lease_for_expense(db: Session, case_no: str, case_params=None):
#     """
#     Fetches driver and associated active lease information to initiate a miscellaneous expense entry.
#     """
#     try:
#         tlc_license_no = case_params.get("tlc_license_no")
#         medallion_no = case_params.get("medallion_no")
#         vin_or_plate = case_params.get("vin_or_plate")

#         if not any([tlc_license_no, medallion_no, vin_or_plate]):
#             return {"drivers": [], "leases": []}

#         # Find the driver
#         driver = driver_service.get_drivers(
#             db, 
#             tlc_license_number=tlc_license_no,
#             medallion_number=medallion_no,
#             vin=vin_or_plate,
#             plate_number=vin_or_plate,
#         )

#         if not driver:
#             raise HTTPException(status_code=404, detail="No matching active driver found for the provided criteria.")

#         # Fetch active leases for the driver
#         leases_tuple = lease_service.get_lease(db, driver_id=driver.driver_id, status="Active", multiple=True)
#         active_leases = leases_tuple[0] if leases_tuple else []

#         if not active_leases:
#             raise HTTPException(status_code=404, detail="Driver does not have an active lease.")

#         formatted_leases = []
#         for lease in active_leases:
#              formatted_leases.append({
#                 "lease_id_pk": lease.id,
#                 "lease_id": lease.lease_id,
#                 "medallion_no": lease.medallion.medallion_number if lease.medallion else "N/A",
#                 "plate_no": lease.vehicle.registrations[0].plate_number if lease.vehicle and lease.vehicle.registrations else "N/A",
#                 "vin": lease.vehicle.vin if lease.vehicle else "N/A",
#                 "vehicle_name": f"{lease.vehicle.year} {lease.vehicle.make} {lease.vehicle.model}" if lease.vehicle else "N/A",
#                 "lease_type": lease.lease_type,
#                 "lease_status": lease.lease_status,
#                 "weekly_lease": lease_service.get_lease_configurations(db, lease_id=lease.id, lease_breakup_type="lease_amount").lease_limit
#              })

#         return {
#             "driver": {
#                 "id": driver.id,
#                 "driver_id": driver.driver_id,
#                 "full_name": driver.full_name,
#                 "status": driver.driver_status,
#                 "tlc_license": driver.tlc_license.tlc_license_number if driver.tlc_license else "N/A",
#                 "phone": driver.phone_number_1,
#                 "email": driver.email_address,
#             },
#             "leases": formatted_leases,
#         }

#     except Exception as e:
#         logger.error("Error in fetch_driver_and_lease_for_expense: %s", e, exc_info=True)
#         raise HTTPException(status_code=500, detail=str(e)) from e


# @step(step_id="MISCEXP-001", name="Process - Create Miscellaneous Expense", operation="process")
# async def process_misc_expense_creation(db: Session, case_no: str, step_data: dict):
#     """
#     Processes the final submission of the miscellaneous expense, creating the master record
#     and posting the charge immediately to the ledger.
#     """
#     try:
#         # Pydantic will validate the structure of the incoming step_data
#         expense_create_data = MiscellaneousExpenseCreate(**step_data)

#         # Get the currently logged-in user from the DB session info
#         current_user_id = db.info.get("current_user_id")
#         if not current_user_id:
#             raise HTTPException(status_code=403, detail="User context not found for audit trail.")

#         misc_expense_service = MiscellaneousExpenseService(db)
#         await misc_expense_service.create_misc_expense(
#             case_no=case_no,
#             expense_data=expense_create_data,
#             user_id=current_user_id
#         )

#         # Mark the BPM case as closed since this is a single-step process
#         bpm_service.mark_case_as_closed(db, case_no)

#         return {"message": "Miscellaneous expense successfully created and posted to the ledger."}
#     except Exception as e:
#         logger.error("Error processing miscellaneous expense creation: %s", e, exc_info=True)
#         # The service layer handles rollback, so we just re-raise the exception
#         raise HTTPException(status_code=500, detail=f"Failed to create expense: {str(e)}") from e