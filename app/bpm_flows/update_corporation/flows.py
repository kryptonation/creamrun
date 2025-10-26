from datetime import datetime
import json
import requests

from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.utils.logger import get_logger
from app.bpm.step_info import step
from app.core.config import settings
from app.bpm.services import bpm_service
from app.audit_trail.services import audit_trail_service
from app.uploads.services import upload_service
from app.entities.services import entity_service
from app.entities.utils import format_corporation_details
from app.medallions.services import medallion_service
from app.medallions.schemas import MedallionOwnerType
from app.utils.general import get_date_from_string , fill_if_missing  , split_name
from app.bpm_flows.create_new_corporation.utils import prepare_rider_payload
from app.utils.s3_utils import s3_utils
from app.utils.lambda_utils import invoke_lambda_function
from app.medallions.utils import format_medallon_owner
from app.bpm_flows.update_medallion_address.utils import prepare_address_update_payload

logger = get_logger(__name__)
entity_mapper = {
    "CORPORATION_OWNER": "update_corporation_owner",
    "OWNER_IDENTIFIER": "id"
}

@step(step_id="187" , name="Fetch - Update Corporation Documents" , operation="fetch")
def fetch_update_corporation_documents(db: Session, case_no, case_params = None):
    """Fetches the Update Corporation Documents"""
    try:
        case_entity = bpm_service.get_case_entity(db=db, case_no=case_no)
        corporation = None

        if case_params and case_params.get("object_name") == "Medallion_Owner":
            owner = medallion_service.get_medallion_owner(db=db , medallion_owner_id=case_params.get("object_lookup"))
            corporation = entity_service.get_corporation(db=db , corporation_id= owner.corporation_id)
        
        if case_entity:
            corporation = entity_service.get_corporation(db=db , corporation_id= case_entity.identifier_value)

        if not corporation:
            return {}

        
        ss4_document = upload_service.get_documents(db=db ,
                                                    object_type="corporation",
                                                    object_id= corporation.id,
                                                    document_type="ss4")

        if not case_entity:
           case_entity = bpm_service.create_case_entity(
               db=db , case_no=case_no,
               entity_name=entity_mapper["CORPORATION_OWNER"],
               identifier= entity_mapper["OWNER_IDENTIFIER"],
               identifier_value= corporation.id       
           )

        corporation_details = format_corporation_details(corporation=corporation)

        return {
            "corporation_details": corporation_details,
            "documents": [ss4_document],
            "document_type": ["ss4"],
            "object_type": "corporation",
            "object_id": corporation.id,
            "required_documents": ["ss4"]
        }
    except Exception as e:
        logger.error("Error fetching Corporation documents: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Internal Server Error") from e
    
@step(step_id="187" , name="Process - Corporation Documents" , operation="process")
def process_corporation_documents(db: Session, case_no, step_data):
    """Processes the Corporation Documents."""
    try:
        case_entity = bpm_service.get_case_entity(db=db, case_no=case_no)

        if not case_entity:
            return {}
        logger.info("Nothing to Do Here")
        
        case = bpm_service.get_cases(db=db , case_no= case_no)
        if case:
            owner = medallion_service.get_medallion_owner(db=db , corporation_id= case_entity.identifier_value)
            if owner:
                audit_trail_service.create_audit_trail(
                    db=db,
                    case=case,
                    description="Processed corporation documents",
                    meta_data={"medallion_owner_id": owner.id}
                )
        return "Ok"
    except Exception as e:
        logger.error("Error processing Corporation documents: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Internal Server Error") from e

@step(step_id="188", name="Fetch - Corporation Owner Details", operation="fetch")
def fetch_corporation_owner_details(db: Session, case_no, case_params = None):
    """
    Fetches the details of the Corporation Owner.
    """
    try:
        case_entity = bpm_service.get_case_entity(db=db, case_no=case_no)
        corporation = None

        if case_entity:
            corporation = entity_service.get_corporation(db=db , corporation_id= case_entity.identifier_value)

        if not corporation:
            return {}
        
        all_docs = upload_service.get_documents(db=db , object_type="corporation" , object_id=corporation.id , multiple=True , sort_order="asc")

        child_corporations = entity_service.get_child_corporations(db=db , parent_corporation_id= corporation.id) if corporation and corporation.is_holding_entity else []
        corporation_details = format_corporation_details(corporation=corporation , child_corporations=child_corporations)

        owner = medallion_service.get_medallion_owner(db=db , corporation_id=corporation.id)
        update_address_from = None
        if owner:
            update_address_from = upload_service.get_documents(db=db , object_id=owner.id , object_type="medallion_owner" , document_type="update_address")

        corporation_details["documents"] = all_docs + ([update_address_from] if update_address_from and update_address_from.get("document_path", None) else [])
        
        return corporation_details
    except Exception as e:
        logger.error("Error fetching Corporation Owner details: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Internal Server Error") from e
    
@step(step_id="188", name="Create - Update Corporation Owner Details", operation="process")
def create_corporation_owner_details(db: Session, case_no, step_data , case_params = None):
    """
    Creates the details of the Corporation Owner.
    """
    try:
        case_entity = bpm_service.get_case_entity(db=db, case_no=case_no)

        if not case_entity:
            return {}

        corporation = entity_service.get_corporation(db=db, corporation_id=case_entity.identifier_value)

        corporation_details = step_data.get("corporation_details")
        primary_addres_data= step_data.get("primary_address" , {})
        secondary_addres_data= step_data.get("secondary_address" , {})
        beneficial_owners = step_data.get("beneficial_owners" , [])
        bank_payee_details = step_data.get("payee_details", [])
        corporation_data = None

        holding_entity_id = corporation_details.get("holding_entity" , None)
        if holding_entity_id:
            is_holding_entity = entity_service.get_corporation(db=db , corporation_id= holding_entity_id , is_holding_entity= True)
            if not is_holding_entity:
                raise ValueError("Holding Entity does not exist")
        
        rider_document = upload_service.get_documents(db=db ,
                                                      object_type="corporation",
                                                      object_id=corporation.id,
                                                      document_type="rider_document")
        

        if corporation_details:
            corporation_data = {
            "id": case_entity.identifier_value if case_entity and case_entity.identifier_value else None,
            "is_llc": corporation_details.get("is_llc"),
            "is_holding_entity" : corporation_details.get("is_holding_entity"),
            "contract_signed_mode": corporation_details.get("contract_signed_mode"),
            "is_mailing_address_same": corporation_details.get("is_mailing_address_same"),
            "linked_pad_owner_id": corporation_details.get("holding_entity" , None)
            }

        owner = medallion_service.get_medallion_owner(db=db , corporation_id=corporation.id)
        medallion_owner_data = format_medallon_owner(owner) if owner else {}

        update_address_from = upload_service.get_documents(db=db , object_id=owner.id , object_type="medallion_owner" , document_type="update_address") if owner else {}

        contact_data = {}
        update_address_data = {}

        contact_persion = [owner for owner in beneficial_owners if owner.get("is_primary_contact") == True]
        if contact_persion:
            contact_data = {
                "email": contact_persion[0].get("email" , None),
                "phone1": contact_persion[0].get("phone" , None)
            }

        if primary_addres_data or secondary_addres_data:
            if step_data.get("is_update_address" , False):
                update_address_data = prepare_address_update_payload(primary_addres_data , secondary_addres_data , medallion_owner_data , contact_data)
        if primary_addres_data:
            primary_address = {
                "id": corporation.primary_address_id or None,
                "address_line_1": primary_addres_data.get("address_line_1" , None),
                "address_line_2": primary_addres_data.get("address_line_2" , None),
                "city": primary_addres_data.get("city" , None),
                "state": primary_addres_data.get("state" , None),
                "zip": primary_addres_data.get("zip" , None),
                "po_box": primary_addres_data.get("po_box" , None)
            }
            address = entity_service.upsert_address(db=db , address_data= primary_address)
            corporation_data["primary_address_id"] = address.id if address else None
            if corporation_details.get("is_mailing_address_same" , False):
                secondary_address = {
                    "id": corporation.secondary_address_id or None,
                    "address_line_1": primary_addres_data.get("address_line_1" , None),
                    "address_line_2": primary_addres_data.get("address_line_2" , None),
                    "city": primary_addres_data.get("city" , None),
                    "state": primary_addres_data.get("state" , None),
                    "zip": primary_addres_data.get("zip" , None),
                    "po_box": primary_addres_data.get("po_box" , None)
                }
                second_address = entity_service.upsert_address(db=db , address_data= secondary_address)
                corporation_data["secondary_address_id"] = second_address.id if second_address else None

        if secondary_addres_data and corporation_details.get("is_mailing_address_same" , False) == False:
            secondary_address = {
                "id": corporation.secondary_address_id or None,
                "address_line_1": secondary_addres_data.get("address_line_1" , None),
                "address_line_2": secondary_addres_data.get("address_line_2" , None),
                "city": secondary_addres_data.get("city" , None),
                "state": secondary_addres_data.get("state" , None),
                "zip": secondary_addres_data.get("zip" , None),
                "po_box": secondary_addres_data.get("po_box" , None)
            }
            seco_address = entity_service.upsert_address(db=db , address_data= secondary_address)
            corporation_data["secondary_address_id"] = seco_address.id if seco_address else None

        if beneficial_owners:
            privious_owners = entity_service.get_corporation_owner(db=db , corporation_id= corporation.id , multiple=True)
            if privious_owners:
                entity_service.delete_corporation_owners(db=db , corporation_id= corporation.id , all=True)
            for i , owners in enumerate(beneficial_owners):
                ind_owner = entity_service.get_individual(db=db , name= owners.get("full_name" , None), ssn= owners.get("ssn_or_itin" , None) )

                primary_address = owners.get("address" , {})
                address = entity_service.upsert_address(
                    db=db , address_data= primary_address
                )
                
                unique_fields = {
                    "ssn": "ssn_or_itin",
                    "primary_email_address": "email",
                    "primary_contact_number": "phone"
                }

                for key, value in unique_fields.items():
                    owner_value = owners.get(value)
                    if owner_value:
                        existing = entity_service.get_individual(db=db , **{key: owner_value})
                        if existing and existing.id != (ind_owner.id if ind_owner else None):
                            raise ValueError(f"An individual with the same {value.replace('_', ' ')} ({owner_value}) already exists in the system.") 

                first_name, middle_name, last_name = split_name(owners.get("full_name" , ""))

                individual_data = {
                    "id": ind_owner.id if ind_owner else None,
                    "full_name": owners.get("full_name" , None),
                    "first_name": first_name,
                    "middle_name": middle_name,
                    "last_name": last_name,
                    "masked_ssn": owners.get("ssn_or_itin" , None),
                    "primary_contact_number": owners.get("phone", None),
                    "primary_email_address": owners.get("email" , None),
                    "primary_address_id" : address.id if address else None
                }
                individual = entity_service.upsert_individual(
                    db=db , individual_data= individual_data
                )

                cor_own = entity_service.get_corporation_owner(db=db , corporation_id= corporation.id , owner_id= individual.id)
                owner_data = {
                    "id": cor_own.id if cor_own else None,
                    "corporation_id": corporation.id,
                    "name": individual.full_name if individual else "",
                    "owner_type": owners.get("role" , None),
                    "owner_id" : individual.id if individual else None,
                    "is_primary_contact": owners.get("is_primary_contact"),
                    "is_authorized_signatory": owners.get("is_authorized_signer"),
                    "is_payee": owners.get("is_payee")
                }
                corp_owner = entity_service.upsert_corporation_owner(db=db , owner_data= owner_data)
                if corp_owner and owners.get("is_primary_contact") == True:
                    corporation_data["primary_contact_number"] = individual.primary_contact_number
                    corporation_data["primary_email_address"] = individual.primary_email_address

        def upsert_corp_payee(db, corp_payee, corporation_id, sequence, payee_type, allocation, pay_to_mode, **kwargs):
            data = {
                "id": corp_payee.id if corp_payee else None,
                "corporation_id": corporation_id,
                "sequence": sequence,
                "payee_type": payee_type,
                "allocation_percentage": allocation,
                "pay_to_mode": pay_to_mode,
                **kwargs,
            }
            entity_service.upsert_corporation_payee(db=db, corporation_payee_data=data)

        if bank_payee_details:
            previous_payees = entity_service.get_corporation_payee(db=db , corporation_id= corporation.id , multiple=True)
            if previous_payees:
                entity_service.delete_corporation_payees(db=db , corporation_id= corporation.id , all=True)
            for i, bank_details in enumerate(bank_payee_details):
                payee_type = bank_details.get("payee_type")
                allocation = bank_details.get("allocation_percentage")
                bank_data = bank_details.get("bank_data")

                corp_payee = entity_service.get_corporation_payee(
                    db, corporation_id=corporation.id, sequence=i, payee_type=payee_type
                )

                if bank_data and bank_data.get("pay_to_mode") == "ACH" or bank_data.get("pay_to_mode") == "Direct To Lender":
                    if bank_data.get("bank_account_number"):
                        existing_payee_bank = entity_service.get_corporation_payee(db=db, bank_account_number=bank_data.get("bank_account_number"))
                        if existing_payee_bank and existing_payee_bank.id != (corp_payee.id if corp_payee else None):
                            raise ValueError(f'Bank Account Number {bank_data.get("bank_account_number")} already linked with another payee')

                if payee_type == "Corporation" and bank_details.get("corporation_name"):
                    corp = entity_service.get_corporation(db=db, name=bank_details["corporation_name"])

                    if bank_data.get("pay_to_mode") == "ACH" or bank_data.get("pay_to_mode") == "Direct To Lender":
                        bank_account = entity_service.upsert_bank_account(db, bank_account_data={
                            "id":corp_payee.bank_account_id if corp_payee else None,
                            "bank_account_status": "Active",
                            **bank_data})
                        upsert_corp_payee(db, corp_payee, corporation.id, i, payee_type, allocation, bank_data.get("pay_to_mode"),
                                        bank_account_id=bank_account.id if bank_account else None,
                                        corporation_owner_id=corp.id if corp else corporation.id)
                    else:
                        upsert_corp_payee(db, corp_payee, corporation.id, i, payee_type, allocation, "Check",
                                        payee=bank_data.get("payee"), corporation_owner_id=corp.id if corp else corporation.id)

                elif payee_type == "Individual" and bank_details.get("individual_name"):
                    individual = entity_service.get_individual(db=db, name=bank_details["individual_name"])
                    if not individual:
                        raise ValueError(f"Individual with name {bank_details['individual_name']} does not exist")

                    if bank_data.get("pay_to_mode") == "ACH" or bank_data.get("pay_to_mode") == "Direct To Lender":
                        bank_account = entity_service.upsert_bank_account(db, bank_account_data={
                            "id":corp_payee.bank_account_id if corp_payee else None,
                            "bank_account_status": "Active",
                            **bank_data})
                        upsert_corp_payee(db, corp_payee, corporation.id, i, payee_type, allocation, bank_data.get("pay_to_mode"),
                                        bank_account_id=bank_account.id if bank_account else None,
                                        individual_id=individual.id)
                        entity_service.upsert_individual(db=db , individual_data={"id": individual.id , "bank_account_id": bank_account.id , "pay_to_mode": "ACH"})
                    else:
                        upsert_corp_payee(db, corp_payee, corporation.id, i, payee_type, allocation, "Check",
                                        payee=bank_data.get("payee"), individual_id=individual.id)
                        entity_service.upsert_individual(db=db , individual_data={"id": individual.id , "pay_to_mode": "Check" , "bank_account_id": None , "payee": bank_data.get("payee")})

                elif payee_type == "Holding Entity" and bank_details.get("holding_entity_name"):
                    holding_entity = entity_service.get_corporation(db=db, name=bank_details["holding_entity_name"])
                    if not holding_entity:
                        raise ValueError(f"Holding Entity with name {bank_details['holding_entity_name']} does not exist")

                    holding_entity_payee = entity_service.get_corporation_payee(db=db, corporation_id=holding_entity.id, sequence=0)
                    if not holding_entity_payee:
                        raise ValueError(f"Payee details for Holding Entity {bank_details['holding_entity_name']} do not exist")

                    if holding_entity_payee.pay_to_mode == "ACH" or holding_entity_payee.pay_to_mode == "Direct To Lender":
                        upsert_corp_payee(db, corp_payee, corporation.id, i, payee_type, allocation, holding_entity_payee.pay_to_mode,
                                        bank_account_id=holding_entity_payee.bank_account_id,
                                        corporation_owner_id=holding_entity.id)
                    else:
                        upsert_corp_payee(db, corp_payee, corporation.id, i, payee_type, allocation, "Check",
                                        payee=holding_entity_payee.payee,
                                        corporation_owner_id=holding_entity.id)
                    


        corporation = entity_service.upsert_corporation(db=db , corporation_data= corporation_data)

        if not corporation:
            raise ValueError("Error creating Corporation")
        
        medallion_owner = {
            "id": owner.id if owner else None,
            "medallion_owner_type": MedallionOwnerType.CORPORATION,
            "primary_phone": corporation_data.get("primary_contact_number"),
            "primary_email_address": corporation_data.get("primary_email_address"),
            "medallion_owner_status":"Y",
            "active_till" : get_date_from_string(datetime.today().date() , "3 months"),
            "corporation_id": corporation.id,
            "primary_address_id": corporation_data.get("primary_address_id")
            }
        
        owner = medallion_service.upsert_medallion_owner(db=db , medallion_owner_data= medallion_owner)

        case = bpm_service.get_cases(db=db , case_no= case_no)
        if case:
            audit_trail_service.create_audit_trail(
                db=db,
                case=case,
                description=f"Created corporation owner details for owner {owner.id}",
                meta_data={"medallion_owner_id": owner.id}
            )

        
        # Generate Address Update Document if address is updated

        if update_address_data  and step_data.get("is_update_address" , False):

            signed_update_address_form = upload_service.get_documents(
                db, object_type="medallion_owner",
                object_id=owner.id,
                document_type="signed_update_address"
            )

            if signed_update_address_form and signed_update_address_form.get("document_id", None):
                upload_service.delete_document(db=db , document_id= signed_update_address_form.get("document_id", None))

            payload = {
                "data": update_address_data,
                "identifier": f"form_{datetime.now().strftime('%Y%m%d%H%M%S')}",
                "template_id": settings.address_update_template_id,
                "bucket": settings.s3_bucket_name
            }

            logger.info("Calling lambda function with payload %s", payload)

            response = invoke_lambda_function(
                function_name="pdf_filler",
                payload=payload
            )

            logger.info("Response from lambda function %s", response)
            response_body = json.loads(response.get("body", None))
            if not response_body:
                raise HTTPException(
                    status_code=400,
                    detail="Failed to fill the form"
                )
            s3_key = response_body.get("s3_key")

            if update_address_from and update_address_from.get("document_path", None):
                update_address_from = upload_service.update_document(
                    db=db , document_dict=update_address_from ,
                    new_filename="Update_Address_Form.pdf",
                    original_extension="PDF", file_size_kb=0,
                    document_path=s3_key, notes="",
                    document_type="update_address", object_type="medallion_owner",
                    object_id=owner.id, document_date=datetime.now().strftime('%Y-%m-%d')   
                )
            else:
                upload_service.create_document(
                    db, new_filename="Update_Address_Form.pdf",
                    original_extension="PDF", file_size_kb=0,
                    document_path=s3_key, notes="",
                    document_type="update_address", object_type="medallion_owner",
                    object_id=owner.id, document_date=datetime.now().strftime('%Y-%m-%d')
                )

        # Generate Rider Document
        
        authorized_signer = entity_service.get_corporation_owner(db=db , corporation_id= corporation.id , is_authorized_signatory= True)
        rider_receipt = prepare_rider_payload(corporation  , authorized_signer)

        payload = {
            "data": rider_receipt,
            "identifier": f"form_{datetime.now().strftime('%Y%m%d%H%M%S')}",
            "template_id": settings.rider_document_template_id,
            "bucket": settings.s3_bucket_name
        }

        logger.info("Calling Lambda function with payload: %s", payload)
        response = invoke_lambda_function(
            function_name="pdf_filler",
            payload=payload
        )
        # Extract s3_key from response
        logger.info("Response from Lambda: %s", response)
        response_body = json.loads(response["body"])
        s3_key = response_body.get("s3_key")  # Use the output key we specified

        if rider_document and rider_document.get("document_path"):
            rider_document = upload_service.update_document(
                db=db , document_dict=rider_document ,
                new_filename="Rider Document.pdf",
                original_extension="PDF", file_size_kb=0,
                document_path=s3_key, notes="",
                document_type="rider_document", object_type="corporation",
                object_id=corporation.id, document_date=datetime.now().strftime('%Y-%m-%d')
            )
        else:
            rider_document = upload_service.create_document(
                db, new_filename="Rider Document.pdf",
                original_extension="PDF", file_size_kb=0,
                document_path=s3_key, notes="",
                document_type="rider_document", object_type="corporation",
                object_id=corporation.id, document_date=datetime.now().strftime('%Y-%m-%d')
            )

        signed_rider_document = upload_service.get_documents(db=db , object_type="corporation",
                                                             object_id=corporation.id,
                                                             document_type="signed_rider_document")
        if signed_rider_document and signed_rider_document.get("document_id", None):
            upload_service.delete_document(db=db , document_id= signed_rider_document.get("document_id", None))
        
        return "Ok"
    except HTTPException as e:        
        raise e    

@step(step_id="194" , name="Verify Corporation Documents", operation="fetch")
def verify_corporation_documents(db: Session, case_no, case_params = None):
    """
    Verifies the documents of the Corporation.
    """
    try:
        case_entity = bpm_service.get_case_entity(db=db, case_no=case_no)
        corporation = None

        if case_entity:
            corporation = entity_service.get_corporation(db=db, corporation_id= case_entity.identifier_value)
        
        if not corporation:
            return {}
        
        
        corporation_documents ={}

        
        ss4_document = upload_service.get_documents(db=db ,
                                                    object_type="corporation",
                                                    object_id=corporation.id,
                                                    document_type="ss4")
        rider_document = upload_service.get_documents(db=db ,
                                                      object_type="corporation",
                                                      object_id=corporation.id,
                                                      document_type="rider_document")
        
        signed_rider_document = upload_service.get_documents(db=db , object_type="corporation",
                                                             object_id=corporation.id,
                                                             document_type="signed_rider_document")
        
        owner = medallion_service.get_medallion_owner(db=db , corporation_id=corporation.id)

        signed_update_address_form = {}
        update_address_from = {}

        if owner :
            signed_update_address_form = upload_service.get_documents(
                db, object_type="medallion_owner",
                object_id=owner.id,
                document_type="signed_update_address"
            )
            update_address_from = upload_service.get_documents(db=db , object_id=owner.id , object_type="medallion_owner" , document_type="update_address")

        corporation_details = format_corporation_details(corporation=corporation)
        corporation_documents = {
            "corporation_details": corporation_details,
            "documents":[rider_document if corporation.contract_signed_mode != "P" else signed_rider_document  , ss4_document] + ([signed_update_address_form] if update_address_from and update_address_from.get("document_path", None) else []),
            "rider_document": rider_document,
            "document_type":[ "rider_document" if corporation.contract_signed_mode != "P" else "signed_rider_document"  , "ss4"] + (["signed_update_address"] if update_address_from and update_address_from.get("document_path", None) else []),
            "object_type":"corporation",
            "object_id":corporation.id,
            "required_documents": ["rider_document"]
        }
        
        return corporation_documents
    except Exception as e:
        logger.error("Error verifying Corporation documents: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Internal Server Error") from e
    
step(step_id="194" , name="Verify Update Corporation Documets", operation="process")
def process_verify_corporation_documents(db: Session, case_no, step_data):
    """
    Process the documents of the Corporation.
    """
    try:
        case_entity = bpm_service.get_case_entity(db=db, case_no=case_no)

        corporation = None

        if case_entity:
            corporation = entity_service.get_corporation(db=db, corporation_id=case_entity.identifier_value)

        if corporation:
            return {}
        
        case = bpm_service.get_cases(db=db , case_no= case_no)
        if case:
            owner = medallion_service.get_medallion_owner(db=db , corporation_id=corporation.id)
            if owner:
                audit_trail_service.create_audit_trail(
                    db=db,
                    case=case,
                    description=f"Verified corporation documents for owner {owner.id}",
                    meta_data={"medallion_owner_id": owner.id}
                )
        
        return "Ok"
    except Exception as e:
        logger.error("Error verifying Corporation documents: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Internal Server Error") from e