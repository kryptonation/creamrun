# ### app/bpm_flows/newtlc/flows.py

# from datetime import datetime
# from decimal import Decimal

# from sqlalchemy.orm import Session

# from app.audit_trail.schemas import AuditTrailType
# from app.audit_trail.services import audit_trail_service
# from app.bpm.services import bpm_service
# from app.bpm.step_info import step
# from app.leases.services import lease_service
# from app.tlc.services import TLCService
# from app.uploads.services import upload_service
# from app.utils.logger import get_logger

# logger = get_logger(__name__)

# ENTITY_MAPPER = {
#     "TLC": "tlc_violation",
#     "TLC_IDENTIFIER": "id",
# }

# @step(step_id="TLC_CHOOSE_DRIVER", name="Fetch - Choose Driver", operation="fetch")
# def choose_driver_fetch(db: Session, case_no: str, case_params: dict = None):
#     """
#     Fetches driver and associated active lease information for the TLC violation workflow.
#     """
#     try:
#         medallion_no = case_params.get("medallion_no")
#         tlc_license_no = case_params.get("tlc_license_no")
#         vehicle_plate_no = case_params.get("vehicle_plate_no")

#         if not any([medallion_no, tlc_license_no, vehicle_plate_no]):
#             return {"search_results": []}

#         leases, _ = lease_service.get_lease(
#             db,
#             medallion_number=medallion_no,
#             tlc_number=tlc_license_no,
#             plate_number=vehicle_plate_no,
#             status="Active",
#             multiple=True,
#             page=1,
#             per_page=25
#         )

#         results = []
#         for lease in leases:
#             driver_info = lease.lease_driver[0].driver if lease.lease_driver else None
#             if driver_info:
#                 results.append({
#                     "medallion_no": lease.medallion.medallion_number,
#                     "medallion_owner": lease.medallion.owner.individual.full_name if lease.medallion.owner and lease.medallion.owner.individual else (lease.medallion.owner.corporation.name if lease.medallion.owner and lease.medallion.owner.corporation else "N/A"),
#                     "driver_id": driver_info.driver_id,
#                     "driver_name": driver_info.full_name,
#                     "tlc_license_no": driver_info.tlc_license.tlc_license_number if driver_info.tlc_license else "N/A",
#                     "vehicle_plate_no": lease.vehicle.registrations[0].plate_number if lease.vehicle and lease.vehicle.registrations else "N/A",
#                     "lease_id": lease.id,
#                     "vehicle_id": lease.vehicle_id,
#                     "driver_pk_id": driver_info.id,
#                     "medallion_id": lease.medallion_id,
#                 })
#         return {"search_results": results}
#     except Exception as e:
#         logger.error("Error in TLC choose_driver_fetch: %s", e, exc_info=True)
#         raise

# @step(step_id="TLC_CHOOSE_DRIVER", name="Process - Choose Driver", operation="process")
# def choose_driver_process(db: Session, case_no: str, step_data: dict):
#     """
#     Creates a temporary, empty TLCViolation record to link the selected entities to the case.
#     """
#     try:
#         # This step only creates the association, no real violation data yet.
#         # A temporary record is created to hold the FKs.
#         temp_summons = f"TEMP-{case_no}"
        
#         # Check if an entity for this case already exists to prevent duplicates
#         case_entity = bpm_service.get_case_entity(db, case_no=case_no, entity_name=ENTITY_MAPPER["TLC"])
#         if case_entity:
#             logger.warning(f"Case entity for {case_no} already exists. Re-associating with new selection.")
#             # Here you might want to delete the old temp violation or update it.
#             # For simplicity, we'll assume a new selection replaces the old context.
            
#         initial_data = {
#             "driver_id": step_data["driver_pk_id"],
#             "vehicle_id": step_data["vehicle_id"],
#             "medallion_id": step_data["medallion_id"],
#             "lease_id": step_data["lease_id"],
#             "summons_no": temp_summons,
#             "plate": step_data["vehicle_plate_no"],
#             # Dummy values for required fields to be filled in the next step
#             "state": "NY", "type": "FN", "issue_date": datetime.utcnow().date(),
#             "amount": Decimal("0.0"), "total_payable": Decimal("0.0"),
#             "attachment_document_id": 1, # Placeholder, will be updated
#         }
        
#         # The service will create a draft violation
#         tlc_service = TLCService(db)
#         # Note: The service will not post to ledger yet as amount is 0 and status is not final
#         violation = tlc_service.create_manual_violation(case_no, initial_data, 1)

#         if not case_entity:
#              bpm_service.create_case_entity(
#                 db, case_no, ENTITY_MAPPER["TLC"], ENTITY_MAPPER["TLC_IDENTIFIER"], str(violation.id)
#             )
        
#         return {"message": "Driver and lease associated with TLC violation successfully."}
#     except Exception as e:
#         logger.error("Error in TLC choose_driver_process: %s", e, exc_info=True)
#         raise

# @step(step_id="TLC_ENTER_DETAILS", name="Fetch - Enter TLC Details", operation="fetch")
# def enter_details_fetch(db: Session, case_no: str, case_params: dict = None):
#     """
#     Fetches the existing (partially filled) TLC violation details for the form.
#     """
#     try:
#         case_entity = bpm_service.get_case_entity(db, case_no=case_no, entity_name=ENTITY_MAPPER["TLC"])
#         if not case_entity:
#             raise ValueError("No TLC violation record found for this case. Please complete the previous step.")
        
#         tlc_service = TLCService(db)
#         violation = tlc_service.repo.get_violation_by_id(int(case_entity.identifier_value))
#         if not violation:
#             raise ValueError(f"Violation with ID {case_entity.identifier_value} not found.")

#         return violation.to_dict()
#     except Exception as e:
#         logger.error("Error in TLC enter_details_fetch: %s", e, exc_info=True)
#         raise

# @step(step_id="TLC_ENTER_DETAILS", name="Process - Save TLC Details", operation="process")
# def enter_details_process(db: Session, case_no: str, step_data: dict):
#     """
#     Updates the TLC violation record with the detailed ticket information.
#     """
#     try:
#         case_entity = bpm_service.get_case_entity(db, case_no=case_no, entity_name=ENTITY_MAPPER["TLC"])
#         if not case_entity:
#             raise ValueError("No TLC violation record found for this case.")

#         tlc_service = TLCService(db)
        
#         # Check for summons uniqueness again with the real number
#         summons = step_data.get("summons")
#         existing_violation = tlc_service.repo.get_violation_by_summons(summons)
#         if existing_violation and existing_violation.id != int(case_entity.identifier_value):
#             raise ValueError(f"A violation with summons number '{summons}' already exists.")

#         total_payable = Decimal(step_data.get("amount", 0)) + Decimal(step_data.get("service_fee", 0))

#         update_data = {
#             "summons_no": summons,
#             "issue_date": step_data["issue_date"],
#             "issue_time": step_data.get("issue_time"),
#             "violation_type": step_data["type"],
#             "description": step_data.get("description"),
#             "amount": Decimal(step_data["amount"]),
#             "service_fee": Decimal(step_data.get("service_fee", 0)),
#             "total_payable": total_payable,
#             "disposition": step_data.get("disposition", "Paid"),
#         }
        
#         tlc_service.repo.update_violation(int(case_entity.identifier_value), update_data)
        
#         return {"message": "TLC violation details updated successfully."}
#     except Exception as e:
#         logger.error("Error in TLC enter_details_process: %s", e, exc_info=True)
#         raise

# @step(step_id="TLC_ATTACH_PROOF", name="Fetch - Attach Proof", operation="fetch")
# def attach_proof_fetch(db: Session, case_no: str, case_params: dict = None):
#     """
#     Fetches any existing proof documents for the TLC violation.
#     """
#     try:
#         case_entity = bpm_service.get_case_entity(db, case_no=case_no, entity_name=ENTITY_MAPPER["TLC"])
#         if not case_entity:
#             return {"documents": []}
            
#         documents = upload_service.get_documents(
#             db,
#             object_type="tlc_violation",
#             object_id=case_entity.identifier_value,
#             multiple=True,
#         )
#         return {"documents": documents or []}
#     except Exception as e:
#         logger.error("Error in TLC attach_proof_fetch: %s", e, exc_info=True)
#         raise

# @step(step_id="TLC_ATTACH_PROOF", name="Process - Finalize and Post", operation="process")
# def attach_proof_process(db: Session, case_no: str, step_data: dict):
#     """
#     Finalizes the manual TLC violation entry by associating the proof and posting to ledger.
#     """
#     try:
#         tlc_service = TLCService(db)
#         case_entity = bpm_service.get_case_entity(db, case_no=case_no, entity_name=ENTITY_MAPPER["TLC"])
#         if not case_entity:
#             raise ValueError("No TLC violation record found for this case.")
        
#         violation_id = int(case_entity.identifier_value)
#         document_id = step_data.get("document_id")

#         if not document_id:
#             raise TLCValidationError("A proof document is mandatory to finalize the violation.")

#         # Link the uploaded document to the violation record
#         upload_service.upsert_document(db, {
#             "id": document_id,
#             "object_type": "tlc_violation",
#             "object_lookup_id": str(violation_id)
#         })

#         # Update the violation record with the document ID and finalize status
#         tlc_service.repo.update_violation(violation_id, {"attachment_document_id": document_id})

#         violation = tlc_service.repo.get_violation_by_id(violation_id)
        
#         # Post to ledger (service handles commit internally)
#         tlc_service.post_to_ledger(violation)

#         case = bpm_service.get_case_obj(db, case_no=case_no)
#         audit_trail_service.create_audit_trail(
#             db=db,
#             description=f"Manual TLC Violation created and posted to ledger: Summons {violation.summons_no}",
#             case=case,
#             meta_data={"tlc_violation_id": violation.id, "lease_id": violation.lease_id, "driver_id": violation.driver_id},
#             audit_type=AuditTrailType.AUTOMATED,
#         )

#         return {"message": "TLC violation created and posted to ledger successfully."}

#     except Exception as e:
#         logger.error("Error in TLC attach_proof_process: %s", e, exc_info=True)
#         raise