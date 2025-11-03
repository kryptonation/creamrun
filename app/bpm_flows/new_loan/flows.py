# ### app/bpm_flows/newloan/flows.py

# from datetime import date
# from decimal import Decimal

# from sqlalchemy.orm import Session

# from app.audit_trail.schemas import AuditTrailType
# from app.audit_trail.services import audit_trail_service
# from app.bpm.services import bpm_service
# from app.bpm.step_info import step
# from app.leases.services import lease_service
# from app.loans.services import LoanService
# from app.utils.logger import get_logger

# logger = get_logger(__name__)

# @step(step_id="LOAN_ENTER_DETAILS", name="Fetch - Search Driver & Enter Loan Details", operation="fetch")
# def enter_loan_details_fetch(db: Session, case_no: str, case_params: dict = None):
#     """
#     Fetches driver and associated active lease information based on a TLC License search
#     for the manual driver loan creation workflow.
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
#             # Consolidate leases under a single driver
#             driver_map = {}
#             for lease in leases:
#                 driver_info = lease.lease_driver[0].driver if lease.lease_driver else None
#                 if driver_info:
#                     if driver_info.driver_id not in driver_map:
#                         driver_map[driver_info.driver_id] = {
#                             "driver_name": driver_info.full_name,
#                             "driver_status": driver_info.driver_status,
#                             "tlc_license_no": driver_info.tlc_license.tlc_license_number if driver_info.tlc_license else "N/A",
#                             "phone": driver_info.phone_number_1,
#                             "email": driver_info.email_address,
#                             "associated_leases": []
#                         }
                    
#                     driver_map[driver_info.driver_id]["associated_leases"].append({
#                         "medallion_no": lease.medallion.medallion_number,
#                         "vin": lease.vehicle.vin,
#                         "plate_no": lease.vehicle.registrations[0].plate_number if lease.vehicle.registrations else "N/A",
#                         "lease_id": lease.id,
#                         "lease_type": lease.lease_type,
#                         "weekly_lease": lease.lease_configuration[0].lease_limit if lease.lease_configuration else "0.00",
#                         "vehicle_id": lease.vehicle_id,
#                         "driver_pk_id": driver_info.id,
#                         "medallion_id": lease.medallion_id,
#                     })
#             results = list(driver_map.values())

#         return {"search_results": results}
#     except Exception as e:
#         logger.error("Error in enter_loan_details_fetch: %s", e, exc_info=True)
#         raise

# @step(step_id="LOAN_ENTER_DETAILS", name="Process - Create Driver Loan", operation="process")
# def enter_loan_details_process(db: Session, case_no: str, step_data: dict):
#     """
#     Processes the submitted form data to create a new Driver Loan and its
#     associated repayment schedule.
#     """
#     try:
#         loan_service = LoanService(db)
        
#         # In a real app, user_id would be extracted from the authenticated session
#         logged_in_user_id = 1 

#         loan_data = {
#             "driver_id": step_data["driver_id"],
#             "lease_id": step_data["lease_id"],
#             "vehicle_id": step_data["vehicle_id"],
#             "medallion_id": step_data["medallion_id"],
#             "loan_amount": step_data["loan_amount"],
#             "interest_rate": step_data.get("interest_rate", 0),
#             "start_week": step_data["start_week"],
#             "notes": step_data.get("notes"),
#             "invoice_number": "N/A", # Not applicable for loans
#             "invoice_date": date.today(), # Use today as the effective date
#         }

#         loan = loan_service.create_loan_and_schedule(case_no, loan_data, logged_in_user_id)
        
#         case = bpm_service.get_case_obj(db, case_no=case_no)
#         audit_trail_service.create_audit_trail(
#             db=db,
#             description=f"Driver Loan created: {loan.loan_id} for Principal Amount ${loan.principal_amount}",
#             case=case,
#             user=getattr(case, 'creator', None),
#             meta_data={
#                 "loan_id": loan.id,
#                 "lease_id": loan.lease_id,
#                 "driver_id": loan.driver_id,
#                 "vehicle_id": loan.vehicle_id,
#                 "medallion_id": loan.medallion_id,
#             },
#             audit_type=AuditTrailType.AUTOMATED,
#         )
        
#         return {"message": "Driver loan created successfully.", "loan_id": loan.loan_id}
#     except Exception as e:
#         logger.error("Error in enter_loan_details_process: %s", e, exc_info=True)
#         raise