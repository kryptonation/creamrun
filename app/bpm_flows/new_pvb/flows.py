# ### app/bpm_flows/newpvb/flows.py

# from datetime import datetime
# from decimal import Decimal

# from sqlalchemy.orm import Session

# from app.audit_trail.schemas import AuditTrailType
# from app.audit_trail.services import audit_trail_service
# from app.bpm.services import bpm_service
# from app.bpm.step_info import step
# from app.drivers.services import driver_service
# from app.leases.services import lease_service
# from app.pvb.models import PVBViolationStatus
# from app.pvb.services import PVBService
# from app.uploads.services import upload_service
# from app.utils.logger import get_logger

# logger = get_logger(__name__)

# ENTITY_MAPPER = {
#     "PVB": "pvb_violation",
#     "PVB_IDENTIFIER": "id",
# }

# @step(step_id="PVB_CHOOSE_DRIVER", name="Fetch - Choose Driver", operation="fetch")
# def choose_driver_fetch(db: Session, case_no: str, case_params: dict = None):
#     """
#     Fetches lease and driver information based on search criteria for the first step
#     of the manual PVB creation workflow.
#     """
#     try:
#         medallion_no = case_params.get("medallion_no")
#         tlc_license_no = case_params.get("tlc_license_no")

#         if not medallion_no and not tlc_license_no:
#             return {"search_results": []}

#         leases, _ = lease_service.get_lease(
#             db,
#             medallion_number=medallion_no,
#             tlc_number=tlc_license_no,
#             status="Active",
#             multiple=True,
#             page=1,
#             per_page=100
#         )

#         results = []
#         for lease in leases:
#             for lease_driver in lease.lease_driver:
#                 if lease_driver.is_active:
#                     driver = lease_driver.driver
#                     results.append({
#                         "medallion_no": lease.medallion.medallion_number if lease.medallion else "N/A",
#                         "medallion_owner": lease.medallion.owner.individual.full_name if lease.medallion and lease.medallion.owner and lease.medallion.owner.individual else (lease.medallion.owner.corporation.name if lease.medallion and lease.medallion.owner and lease.medallion.owner.corporation else "N/A"),
#                         "driver_id": driver.driver_id,
#                         "driver_name": driver.full_name,
#                         "tlc_license_no": driver.tlc_license.tlc_license_number if driver.tlc_license else "N/A",
#                         "vehicle_plate_no": lease.vehicle.registrations[0].plate_number if lease.vehicle and lease.vehicle.registrations else "N/A",
#                         "lease_id": lease.id,
#                         "vehicle_id": lease.vehicle_id,
#                         "driver_pk_id": driver.id,
#                         "medallion_id": lease.medallion_id
#                     })
#         return {"search_results": results}
#     except Exception as e:
#         logger.error("Error in choose_driver_fetch for PVB: %s", e, exc_info=True)
#         raise

# @step(step_id="PVB_CHOOSE_DRIVER", name="Process - Choose Driver", operation="process")
# def choose_driver_process(db: Session, case_no: str, step_data: dict):
#     """
#     Creates an initial, empty PVBViolation record and links it to the selected driver,
#     vehicle, medallion, and lease.
#     """
#     try:
#         pvb_service = PVBService(db)
        
#         # Create an empty violation record to hold the association
#         initial_data = {
#             "driver_id": step_data["driver_pk_id"],
#             "vehicle_id": step_data["vehicle_id"],
#             "medallion_id": step_data["medallion_id"],
#             "lease_id": step_data["lease_id"],
#             "status": PVBViolationStatus.IMPORTED, # Using 'IMPORTED' as the initial state for manual entry
#             "source": "MANUAL_ENTRY",
#             "case_no": case_no,
#             "plate": step_data["vehicle_plate_no"], # Pre-fill plate from search
#             # Dummy values for required fields that will be filled in the next step
#             "state": "NY",
#             "type": "OMT",
#             "summons": f"TEMP-{case_no}", # Temporary unique summons
#             "issue_date": datetime.utcnow().date(),
#             "amount_due": Decimal("0.0"),
#             "fine": Decimal("0.0"),
#         }

#         violation = pvb_service.create_manual_violation(case_no, initial_data, 1) # User ID is placeholder
        
#         bpm_service.create_case_entity(
#             db, case_no, ENTITY_MAPPER["PVB"], ENTITY_MAPPER["PVB_IDENTIFIER"], str(violation.id)
#         )
#         return {"message": "Driver and lease associated with PVB violation successfully."}
#     except Exception as e:
#         logger.error("Error in choose_driver_process for PVB: %s", e, exc_info=True)
#         raise

# @step(step_id="PVB_ENTER_DETAILS", name="Fetch - Enter PVB Details", operation="fetch")
# def enter_details_fetch(db: Session, case_no: str, case_params: dict = None):
#     """
#     Fetches the existing (partially filled) PVB violation details for editing.
#     """
#     try:
#         case_entity = bpm_service.get_case_entity(db, case_no=case_no, entity_name=ENTITY_MAPPER["PVB"])
#         if not case_entity:
#             raise ValueError("No PVB violation record found for this case.")
        
#         violation = db.query(PVBViolation).filter(PVBViolation.id == int(case_entity.identifier_value)).first()
#         if not violation:
#             raise ValueError(f"Violation with ID {case_entity.identifier_value} not found.")

#         return violation.to_dict()
#     except Exception as e:
#         logger.error("Error in enter_details_fetch for PVB: %s", e, exc_info=True)
#         raise

# @step(step_id="PVB_ENTER_DETAILS", name="Process - Enter PVB Details", operation="process")
# def enter_details_process(db: Session, case_no: str, step_data: dict):
#     """
#     Updates the PVB violation record with the detailed ticket information.
#     """
#     try:
#         pvb_service = PVBService(db)
#         case_entity = bpm_service.get_case_entity(db, case_no=case_no, entity_name=ENTITY_MAPPER["PVB"])
#         if not case_entity:
#             raise ValueError("No PVB violation record found for this case.")

#         violation = db.query(PVBViolation).filter(PVBViolation.id == int(case_entity.identifier_value)).first()
#         if not violation:
#             raise ValueError(f"Violation with ID {case_entity.identifier_value} not found.")

#         # Calculate amount due
#         amount_due = (
#             Decimal(step_data.get("fine", 0)) +
#             Decimal(step_data.get("penalty", 0)) +
#             Decimal(step_data.get("interest", 0)) -
#             Decimal(step_data.get("reduction", 0))
#         )

#         update_data = {
#             "plate": step_data["plate"],
#             "state": step_data["state"],
#             "type": step_data["type"],
#             "summons": step_data["summons"],
#             "issue_date": step_data["issue_date"],
#             "issue_time": step_data.get("issue_time"),
#             "fine": step_data["fine"],
#             "penalty": step_data.get("penalty", 0),
#             "interest": step_data.get("interest", 0),
#             "reduction": step_data.get("reduction", 0),
#             "amount_due": amount_due,
#         }
        
#         pvb_service.repo.update_violation(violation.id, update_data)
        
#         return {"message": "PVB violation details updated successfully."}
#     except Exception as e:
#         logger.error("Error in enter_details_process for PVB: %s", e, exc_info=True)
#         raise

# @step(step_id="PVB_ATTACH_PROOF", name="Fetch - Attach Proof", operation="fetch")
# def attach_proof_fetch(db: Session, case_no: str, case_params: dict = None):
#     """
#     Fetches any existing proof documents for the PVB violation.
#     """
#     try:
#         case_entity = bpm_service.get_case_entity(db, case_no=case_no, entity_name=ENTITY_MAPPER["PVB"])
#         if not case_entity:
#             return {"documents": []}
            
#         documents = upload_service.get_documents(
#             db,
#             object_type="pvb_violation",
#             object_id=case_entity.identifier_value,
#             multiple=True,
#         )
#         return {"documents": documents or []}
#     except Exception as e:
#         logger.error("Error in attach_proof_fetch for PVB: %s", e, exc_info=True)
#         raise

# @step(step_id="PVB_ATTACH_PROOF", name="Process - Attach Proof", operation="process")
# def attach_proof_process(db: Session, case_no: str, step_data: dict):
#     """
#     Finalizes the manual PVB violation entry. It associates the uploaded proof,
#     marks the violation as ASSOCIATED, and triggers the ledger posting task.
#     """
#     try:
#         pvb_service = PVBService(db)
#         case_entity = bpm_service.get_case_entity(db, case_no=case_no, entity_name=ENTITY_MAPPER["PVB"])
#         if not case_entity:
#             raise ValueError("No PVB violation record found for this case.")
        
#         document_id = step_data.get("document_id")
#         if not document_id:
#             raise PVBValidationError("Proof document is mandatory.")

#         # Link document to the violation
#         upload_service.upsert_document(db, {
#             "id": document_id,
#             "object_type": "pvb_violation",
#             "object_lookup_id": case_entity.identifier_value
#         })

#         # Finalize the violation status
#         pvb_service.repo.update_violation(
#             int(case_entity.identifier_value),
#             {"status": PVBViolationStatus.ASSOCIATED}
#         )

#         # Trigger ledger posting
#         post_pvb_violations_to_ledger_task.delay()
        
#         # Create final audit trail
#         case = bpm_service.get_case_obj(db, case_no=case_no)
#         violation = db.query(PVBViolation).get(int(case_entity.identifier_value))
#         audit_trail_service.create_audit_trail(
#             db,
#             description=f"Manual PVB violation created: Summons {violation.summons}",
#             case=case,
#             meta_data={
#                 "pvb_id": violation.id,
#                 "driver_id": violation.driver_id,
#                 "lease_id": violation.lease_id,
#             },
#             audit_type=AuditTrailType.AUTOMATED,
#         )

#         return {"message": "PVB violation created and queued for ledger posting."}

#     except Exception as e:
#         logger.error("Error in attach_proof_process for PVB: %s", e, exc_info=True)
#         raise