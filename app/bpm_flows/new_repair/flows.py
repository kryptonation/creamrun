# ### app/bpm_flows/newrepair/flows.py

# from datetime import date, datetime

# from sqlalchemy.orm import Session

# from app.audit_trail.schemas import AuditTrailType
# from app.audit_trail.services import audit_trail_service
# from app.bpm.services import bpm_service
# from app.bpm.step_info import step
# from app.leases.services import lease_service
# from app.repairs.services import RepairService
# from app.utils.logger import get_logger

# logger = get_logger(__name__)

# @step(step_id="REPAIR_ENTER_DETAILS", name="Fetch - Search Driver & Enter Invoice Details", operation="fetch")
# def enter_repair_details_fetch(db: Session, case_no: str, case_params: dict = None):
#     """
#     Fetches driver and associated active lease information based on a TLC License search.
#     """
#     try:
#         tlc_license_no = case_params.get("tlc_license_no")
#         if not tlc_license_no:
#             return {"search_results": []}

#         leases, _ = lease_service.get_lease(
#             db,
#             tlc_number=tlc_license_no,
#             status="Active",
#             multiple=True,
#             page=1,
#             per_page=10
#         )

#         results = []
#         if leases:
#             for lease in leases:
#                 driver_info = lease.lease_driver[0].driver if lease.lease_driver else None
#                 if driver_info:
#                     results.append({
#                         "driver_name": driver_info.full_name,
#                         "driver_status": driver_info.driver_status,
#                         "tlc_license_no": driver_info.tlc_license.tlc_license_number if driver_info.tlc_license else "N/A",
#                         "phone": driver_info.phone_number_1,
#                         "email": driver_info.email_address,
#                         "associated_leases": [{
#                             "medallion_no": lease.medallion.medallion_number,
#                             "vin": lease.vehicle.vin,
#                             "plate_no": lease.vehicle.registrations[0].plate_number if lease.vehicle.registrations else "N/A",
#                             "lease_id": lease.id,
#                             "lease_type": lease.lease_type,
#                             "weekly_lease": lease.lease_configuration[0].lease_limit if lease.lease_configuration else "0.00",
#                             "vehicle_id": lease.vehicle_id,
#                             "driver_pk_id": driver_info.id,
#                             "medallion_id": lease.medallion_id,
#                         }]
#                     })
#         return {"search_results": results}

#     except Exception as e:
#         logger.error("Error in enter_repair_details_fetch: %s", e, exc_info=True)
#         raise

# @step(step_id="REPAIR_ENTER_DETAILS", name="Process - Create Repair Invoice", operation="process")
# def enter_repair_details_process(db: Session, case_no: str, step_data: dict):
#     """
#     Processes the submitted form data to create a new Repair Invoice and its
#     associated payment schedule.
#     """
#     try:
#         repair_service = RepairService(db)

#         # Assuming user ID is retrieved from a logged-in session context
#         # For now, using a placeholder. In production, this would come from the request context.
#         logged_in_user_id = 1 

#         # The service handles creating the invoice, schedule, and linking to the case
#         invoice = repair_service.create_repair_invoice(case_no, step_data, logged_in_user_id)
        
#         # Create an audit trail for the invoice creation
#         case = bpm_service.get_case_obj(db, case_no=case_no)
#         audit_trail_service.create_audit_trail(
#             db=db,
#             description=f"Vehicle Repair Invoice created: {invoice.repair_id} for Amount ${invoice.total_amount}",
#             case=case,
#             user=getattr(case, 'creator', None), # Assuming creator is on the case object
#             meta_data={
#                 "repair_id": invoice.id,
#                 "lease_id": invoice.lease_id,
#                 "driver_id": invoice.driver_id,
#                 "vehicle_id": invoice.vehicle_id,
#                 "medallion_id": invoice.medallion_id,
#             },
#             audit_type=AuditTrailType.AUTOMATED,
#         )
        
#         return {"message": "Repair invoice created successfully.", "repair_id": invoice.repair_id}
#     except Exception as e:
#         logger.error("Error in enter_repair_details_process: %s", e, exc_info=True)
#         raise