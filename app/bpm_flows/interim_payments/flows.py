# ### app/bpm_flows/interim_payment/flows.py

# from sqlalchemy.orm import Session
# from fastapi import HTTPException

# from app.bpm.services import bpm_service
# from app.bpm.step_info import step
# from app.drivers.services import driver_service
# from app.interim_payments.schemas import InterimPaymentCreate
# from app.interim_payments.services import InterimPaymentService
# from app.leases.services import lease_service
# from app.ledger.services import LedgerService
# from app.utils.logger import get_logger

# logger = get_logger(__name__)


# @step(step_id="INTPAY-001", name="Fetch - Search Driver & Enter Payment Details", operation="fetch")
# def fetch_driver_and_lease_details(db: Session, case_no: str, case_params=None):
#     """
#     Fetches driver and associated active lease information to initiate an interim payment.
#     """
#     try:
#         tlc_license_no = case_params.get("tlc_license_no")
#         if not tlc_license_no:
#             return {"drivers": [], "leases": []}

#         driver = driver_service.get_drivers(db, tlc_license_number=tlc_license_no)
#         if not driver:
#             raise HTTPException(status_code=404, detail=f"Driver with TLC License '{tlc_license_no}' not found.")

#         # Fetch active leases for the driver
#         leases = lease_service.get_lease(db, driver_id=driver.driver_id, status="Active", multiple=True)
#         if not leases or not leases[0]: # get_lease returns a tuple
#             raise HTTPException(status_code=404, detail="No active lease found for this driver.")

#         formatted_leases = []
#         for lease in leases[0]:
#              formatted_leases.append({
#                 "lease_id_pk": lease.id,
#                 "lease_id": lease.lease_id,
#                 "medallion_no": lease.medallion.medallion_number if lease.medallion else "N/A",
#                 "plate_no": lease.vehicle.registrations[0].plate_number if lease.vehicle and lease.vehicle.registrations else "N/A",
#                 "vin": lease.vehicle.vin if lease.vehicle else "N/A",
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
#         logger.error("Error in fetch_driver_and_lease_details for interim payment: %s", e, exc_info=True)
#         raise HTTPException(status_code=500, detail=str(e)) from e


# @step(step_id="INTPAY-002", name="Fetch - Allocate Payments", operation="fetch")
# def fetch_outstanding_balances(db: Session, case_no: str, case_params=None):
#     """
#     Fetches all open ledger balances for a selected driver and lease to allow for allocation.
#     """
#     try:
#         driver_id = int(case_params.get("driver_id"))
#         if not driver_id:
#             raise HTTPException(status_code=400, detail="Driver ID must be provided.")
        
#         ledger_service = LedgerService(db)
#         open_balances = ledger_service.repo.get_open_balances_for_driver(driver_id)

#         formatted_balances = [
#             {
#                 "category": balance.category.value,
#                 "reference_id": balance.reference_id,
#                 "description": f"{balance.category.value} obligation from {balance.created_on.strftime('%Y-%m-%d')}",
#                 "outstanding": float(balance.balance),
#                 "due_date": balance.created_on.date(), # Simplified for UI, could be more specific
#             }
#             for balance in open_balances
#         ]
        
#         total_outstanding = sum(b['outstanding'] for b in formatted_balances)

#         return {
#             "total_outstanding": total_outstanding,
#             "obligations": formatted_balances
#         }

#     except Exception as e:
#         logger.error("Error in fetch_outstanding_balances for interim payment: %s", e, exc_info=True)
#         raise HTTPException(status_code=500, detail=str(e)) from e


# @step(step_id="INTPAY-002", name="Process - Allocate Payments", operation="process")
# async def process_payment_allocation(db: Session, case_no: str, step_data: dict):
#     """
#     Processes the final submission of the interim payment, creating the master record
#     and applying the allocations to the ledger.
#     """
#     try:
#         # Pydantic will validate the structure of the incoming step_data
#         payment_create_data = InterimPaymentCreate(**step_data)

#         # Get the currently logged-in user from the DB session info
#         current_user_id = db.info.get("current_user_id")
#         if not current_user_id:
#             raise HTTPException(status_code=403, detail="User context not found for audit trail.")

#         interim_payment_service = InterimPaymentService(db)
#         await interim_payment_service.create_interim_payment(
#             case_no=case_no,
#             payment_data=payment_create_data,
#             user_id=current_user_id
#         )

#         # Mark the BPM case as closed
#         bpm_service.mark_case_as_closed(db, case_no)

#         return {"message": "Interim payment successfully created and allocated."}
#     except Exception as e:
#         logger.error("Error processing payment allocation: %s", e, exc_info=True)
#         # The service layer handles rollback, so we just raise the exception
#         raise HTTPException(status_code=500, detail=f"Failed to process payment: {str(e)}") from e