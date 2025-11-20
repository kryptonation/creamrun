# app/bpm_flows/interim_payments/flows.py

from datetime import datetime
from typing import Dict, Any, Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.audit_trail.services import audit_trail_service
from app.bpm.services import bpm_service
from app.bpm.step_info import step
from app.drivers.services import driver_service
from app.interim_payments.models import InterimPayment, PaymentMethod
from app.interim_payments.schemas import InterimPaymentCreate
from app.interim_payments.services import InterimPaymentService
from app.leases.services import lease_service
from app.ledger.services import LedgerService
from app.utils.logger import get_logger
from app.utils.general import generate_random_string

logger = get_logger(__name__)

# Entity mapper for case entity tracking
entity_mapper = {
    "INTERIM_PAYMENT": "interim_payment",
    "INTERIM_PAYMENT_IDENTIFIER": "id"
}


@step(step_id="210", name="Fetch - Search Driver & Enter Payment Details", operation="fetch")
def fetch_driver_and_lease_details(db: Session, case_no: str, case_params: Optional[Dict] = None) -> Dict[str, Any]:
    """
    Fetches driver details and active leases for the interim payment workflow.
    User searches by TLC License number to find the driver and their associated leases.
    
    Args:
        db: Database session
        case_no: BPM case number
        case_params: Query parameters containing 'tlc_license_no'
    
    Returns:
        Dict containing driver details and list of active leases
    """
    try:
        logger.info("Fetching driver and lease details", case_no=case_no)

        # Check if case entity exists
        case_entity = bpm_service.get_case_entity(db, case_no=case_no)
        selected_interim_payment_id = None
        if case_entity:
            selected_interim_payment_id = str(case_entity.get("identifier_value"))
            logger.info(
                "Found existing case entity",
                case_no=case_no,
                interim_payment_id=selected_interim_payment_id
            )

        # If no case params provided return emtpy response
        if not case_params or 'tlc_license_no' not in case_params:
            return {
                "driver_details": None,
                "active_leases": [],
                "selected_interim_payment_id": selected_interim_payment_id
            }
        
        tlc_license_no = case_params.get("tlc_license_no")
        logger.info("Searching for driver", case_no=case_no, tlc_license_no=tlc_license_no)

        # Search for driver by TLC license number
        driver = driver_service.get_drivers(db, tlc_license_number=tlc_license_no)

        if not driver:
            logger.info("No driver found", case_no=case_no, tlc_license_no=tlc_license_no)
            raise HTTPException(status_code=404, detail="Driver not found")
        
        # Fetch active lease for the driver
        active_leases = lease_service.get_lease(
            db, driver_id=driver.driver_id, status="Active", exclude_additional_drivers=True, multiple=True
        )

        if not active_leases or not active_leases[0]:
            logger.warning("No active leases found for driver", driver_id=driver.id)
            raise HTTPException(status_code=404, detail="No active leases found for driver")
        
        # Format lease data for UI
        formatted_leases = []
        for lease in active_leases[0]:
            formatted_leases.append({
                "id": lease.id,
                "lease_id": lease.lease_id,
                "medallion_number": lease.medallion.medallion_number if lease.medallion else "N/A",
                "plate_no": lease.vehicle.registrations[0].plate_number if lease.vehicle and lease.vehicle.registrations else "N/A",
                "vin": lease.vehicle.vin if lease.vehicle else "N/A"
            })

        driver_data = {
            "id": driver.id,
            "driver_id": driver.driver_id,
            "full_name": driver.full_name,
            "status": driver.driver_status.value if hasattr(driver.driver_status, 'value') else str(driver.driver_status),
            "tlc_license": driver.tlc_license.tlc_license_number if driver.tlc_license else "N/A",
            "phone": driver.phone_number_1 or "N/A",
            "email": driver.email_address or "N/A",
        }

        logger.info("Successfully fetched driver and lease details", case_no=case_no, driver_id=driver.id)

        return {
            "driver": driver_data,
            "leases": formatted_leases,
            "selected_interim_payment_id": selected_interim_payment_id
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error fetching driver and lease details", case_no=case_no, error=str(e))
        raise HTTPException(status_code=500, detail="An error occured while fetching driver details") from e
    
@step(step_id="210", name="Process - Create Interim Payment Record", operation="process")
def create_interim_payment_record(db: Session, case_no: str, step_data: Dict[str, Any]) -> Dict[str, str]:
    """
    Creates an interim payment entry record with the selected driver and lease.
    This record will be used in Step 302 for allocation.
    
    Args:
        db: Database session
        case_no: BPM case number
        step_data: Dictionary containing 'driver_id' and 'lease_id'
    
    Returns:
        Dict with success message and interim_payment_id
    """
    try:
        logger.info("Creating interim payment entry for case", case_no=case_no)
        case_entity = bpm_service.get_case_entity(db, case_no=case_no)

        # Validate required fields
        driver_id = step_data.get("driver_id")
        lease_id = step_data.get("lease_id")

        if not driver_id or not lease_id:
            raise HTTPException(status_code=400, detail="Driver ID and Lease ID are required")
        
        # Validate driver existence
        driver = driver_service.get_drivers(db, driver_id=driver_id)
        if not driver:
            raise HTTPException(status_code=404, detail="Driver not found")
        
        # Validate lease existence
        lease = lease_service.get_lease(db, lease_id=lease_id, status="Active")
        if not lease:
            raise HTTPException(status_code=404, detail="Lease not found")
        
        lease_driver_exists = False
        for lease_driver in lease.lease_driver:
            if lease_driver.driver_id == driver.driver_id and not lease_driver.is_additional_driver:
                lease_driver_exists = True
                break

        if not lease_driver_exists:
            raise HTTPException(status_code=400, detail="Driver is not the primary driver on the selected lease")
        
        if case_entity:
            # Entry already exists, update it
            interim_payment_service = InterimPaymentService(db)
            existing_payment = interim_payment_service.repo.get_payment_by_id(
                int(case_entity.identifier_value)
            )
            
            if existing_payment:
                # Update the existing record
                existing_payment.driver_id = driver.id
                existing_payment.lease_id = lease.id
                db.commit()
                db.refresh(existing_payment)
                
                logger.info(f"Updated existing interim payment entry {existing_payment.id} for case {case_no}")
                
                # Create audit trail
                case = bpm_service.get_cases(db=db, case_no=case_no)
                if case:
                    audit_trail_service.create_audit_trail(
                        db=db,
                        case=case,
                        description=f"Updated interim payment entry for driver {driver.driver_id} and lease {lease.lease_id}",
                        meta_data={
                            "interim_payment_id": existing_payment.id,
                            "driver_id": driver.id,
                            "lease_id": lease.id
                        }
                    )
                
                return "Ok"
            
        # Create new interim payment entry (draft state)
        new_interim_payment = InterimPayment(
            payment_id= generate_random_string(),  # Will be generated later in step 302
            case_no=case_no,
            driver_id=driver.id,
            lease_id=lease.id,
            payment_date=datetime.utcnow(),  # Placeholder, will be updated in step 302
            total_amount=0.0,  # Placeholder, will be updated in step 302
            payment_method=PaymentMethod.CASH,  # Placeholder, will be updated in step 302
            notes=None,
            allocations=[],  # Will be populated in step 302
            created_by=db.info.get("current_user_id", 1),  # Get from session context
        )
        
        db.add(new_interim_payment)
        db.flush()
        db.refresh(new_interim_payment)
        
        # Create case entity linking to this interim payment
        bpm_service.create_case_entity(
            db=db,
            case_no=case_no,
            entity_name=entity_mapper["INTERIM_PAYMENT"],
            identifier=entity_mapper["INTERIM_PAYMENT_IDENTIFIER"],
            identifier_value=str(new_interim_payment.id)
        )
        
        db.commit()
        
        logger.info(f"Created interim payment entry {new_interim_payment.id} for driver {driver.driver_id} and lease {lease.lease_id}")
        
        # Create audit trail
        case = bpm_service.get_cases(db=db, case_no=case_no)
        if case:
            audit_trail_service.create_audit_trail(
                db=db,
                case=case,
                description=f"Created interim payment entry for driver {driver.driver_id} and lease {lease.lease_id}",
                meta_data={
                    "interim_payment_id": new_interim_payment.id,
                    "driver_id": driver.id,
                    "lease_id": lease.id
                }
            )
        
        return {
            "message": "Interim payment entry created successfully.",
            "interim_payment_id": str(new_interim_payment.id),
        }
        
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating interim payment entry for case {case_no}: {e}", exc_info=True)
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to create interim payment entry: {str(e)}"
        ) from e
    
@step(step_id="211", name="Fetch - Allocate Payments", operation="fetch")
def fetch_outstanding_balances(db: Session, case_no: str, case_params: Optional[Dict] = None) -> Dict[str, Any]:
    """
    Fetches outstanding ledger balances for the SPECIFIC lease selected in Step 301.
    CRITICAL: Balances are filtered by BOTH driver_id AND lease_id to ensure
    we only show obligations for the selected lease, not all of the driver's leases.
    
    Args:
        db: Database session
        case_no: BPM case number
        case_params: Optional query parameters
    
    Returns:
        Dict containing driver details, lease details, and ledger balances for THAT LEASE ONLY
    """
    try:
        logger.info(f"Fetching outstanding balances for case {case_no}")
        
        # Get the interim payment entry from case entity
        case_entity = bpm_service.get_case_entity(db, case_no=case_no)
        
        if not case_entity:
            logger.error(f"No case entity found for case {case_no}")
            return {}
        
        # Retrieve the interim payment record
        interim_payment_service = InterimPaymentService(db)
        interim_payment = interim_payment_service.repo.get_payment_by_id(
            int(case_entity.identifier_value)
        )
        
        if not interim_payment:
            logger.error(f"No interim payment record found with ID {case_entity.identifier_value}")
            return {}
        
        driver_id = interim_payment.driver_id
        lease_id = interim_payment.lease_id
        
        logger.info(f"Fetching balances for driver ID {driver_id} and SPECIFIC lease ID {lease_id}")
        
        # Get driver details
        driver = driver_service.get_drivers(db, id=driver_id)
        if not driver:
            raise HTTPException(status_code=404, detail=f"Driver with ID {driver_id} not found.")
        
        # Get lease details
        lease = lease_service.get_lease(db, lookup_id=lease_id)
        if not lease:
            raise HTTPException(status_code=404, detail=f"Lease with ID {lease_id} not found.")
        
        # CRITICAL: Get open ledger balances filtered by BOTH driver_id AND lease_id
        # This ensures we only get obligations for THIS specific lease
        ledger_service = LedgerService(db)
        
        # Use the repository method that filters by both driver and lease
        from app.ledger.models import LedgerBalance, BalanceStatus
        
        open_balances = (
            db.query(LedgerBalance)
            .filter(
                LedgerBalance.driver_id == driver_id,
                LedgerBalance.lease_id == lease_id,  # CRITICAL: Filter by specific lease
                LedgerBalance.status == BalanceStatus.OPEN,
                LedgerBalance.balance > 0  # Only show balances with outstanding amounts
            )
            .order_by(LedgerBalance.category, LedgerBalance.created_on)
            .all()
        )
        
        logger.info(f"Found {len(open_balances)} open balances for lease {lease.lease_id}")
        
        # Format balances for UI with comprehensive details
        formatted_balances = []
        for balance in open_balances:
            formatted_balances.append({
                "balance_id": balance.id,  # Unique ledger balance ID
                "category": balance.category.value,
                "reference_id": balance.reference_id,
                "description": f"{balance.category.value} - {balance.reference_id}",
                "outstanding": float(balance.balance),
                "due_date": balance.created_on.date().isoformat() if balance.created_on else None,
            })
        
        # Calculate total outstanding for THIS LEASE ONLY
        total_outstanding = sum(b['outstanding'] for b in formatted_balances)
        
        # Format driver details for UI
        driver_details = {
            "driver_id": driver.driver_id,
            "driver_name": driver.full_name,
            "tlc_license": driver.tlc_license.tlc_license_number if driver.tlc_license else "N/A",
        }
        
        # Format lease details for UI
        lease_details = {
            "lease_id": lease.lease_id,
            "medallion_no": lease.medallion.medallion_number if lease.medallion else "N/A",
        }
        
        logger.info(
            f"Returning {len(formatted_balances)} balances totaling ${total_outstanding:.2f} "
            f"for lease {lease.lease_id} (driver {driver.driver_id})"
        )

        
        
        return {
            "driver": driver_details,
            "lease": lease_details,
            "total_outstanding": round(total_outstanding, 2),
            "obligations": formatted_balances,
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching outstanding balances for case {case_no}: {e}", exc_info=True)
        raise HTTPException(
            status_code=500, 
            detail=f"An error occurred while fetching outstanding balances: {str(e)}"
        ) from e

@step(step_id="211", name="Process - Allocate Payments", operation="process")
async def process_payment_allocation(db: Session, case_no: str, step_data: Dict[str, Any]) -> Dict[str, str]:
    """
    Processes the final submission of the interim payment with allocations.
    Creates ledger postings and updates balances FOR THE SPECIFIC LEASE ONLY.
    
    CRITICAL: All allocations are verified to belong to the lease_id selected in Step 301.
    
    Args:
        db: Database session
        case_no: BPM case number
        step_data: Dictionary containing payment details and allocations
                  Must conform to allocate_payments.json schema
    
    Returns:
        Dict with success message
    """
    try:
        logger.info(f"Processing payment allocation for case {case_no}")
        
        # Get the interim payment entry from case entity
        case_entity = bpm_service.get_case_entity(db, case_no=case_no)
        
        if not case_entity:
            raise HTTPException(
                status_code=404, 
                detail="No interim payment entry found for this case. Please complete Step 1 first."
            )
        
        # Retrieve the interim payment record
        interim_payment_service = InterimPaymentService(db)
        interim_payment = interim_payment_service.repo.get_payment_by_id(
            int(case_entity.identifier_value)
        )
        
        if not interim_payment:
            raise HTTPException(
                status_code=404, 
                detail=f"Interim payment record not found with ID {case_entity.identifier_value}"
            )
        
        # CRITICAL: Get the lease_id that was selected in Step 301
        selected_lease_id = interim_payment.lease_id
        selected_driver_id = interim_payment.driver_id
        
        logger.info(
            f"Processing allocation for driver {selected_driver_id} and lease {selected_lease_id}"
        )
        
        # Extract and validate data from step_data
        payment_amount = step_data.get("payment_amount")
        payment_method = step_data.get("payment_method")
        payment_date_str = step_data.get("payment_date")
        notes = step_data.get("notes")
        allocations = step_data.get("allocations", [])
        
        if not payment_amount or payment_amount <= 0:
            raise HTTPException(status_code=400, detail="Payment amount must be greater than zero.")
        
        if not payment_method:
            raise HTTPException(status_code=400, detail="Payment method is required.")
        
        if not payment_date_str:
            raise HTTPException(status_code=400, detail="Payment date is required.")
        
        if not allocations or len(allocations) == 0:
            raise HTTPException(status_code=400, detail="At least one allocation is required.")
        
        # Parse payment date
        try:
            payment_date = datetime.fromisoformat(payment_date_str.replace('Z', '+00:00'))
        except (ValueError, AttributeError) as e:
            raise HTTPException(
                status_code=400, detail="Invalid payment date format. Use ISO 8601 format."
            ) from e
        
        # Validate payment method enum
        try:
            payment_method_enum = PaymentMethod(payment_method)
        except ValueError as e:
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid payment method: {payment_method}. Must be one of: Cash, Check, ACH"
            ) from e
        
        # CRITICAL VALIDATION: Verify all allocations belong to the selected lease
        from app.ledger.models import LedgerBalance
        
        for alloc in allocations:
            balance_id = alloc.get("balance_id")
            if not balance_id:
                raise HTTPException(
                    status_code=400,
                    detail="Each allocation must include a balance_id."
                )
            
            # Verify this balance belongs to the selected lease
            balance = db.query(LedgerBalance).filter(LedgerBalance.id == balance_id).first()
            
            if not balance:
                raise HTTPException(
                    status_code=404,
                    detail=f"Ledger balance {balance_id} not found."
                )
            
            # CRITICAL CHECK: Ensure balance belongs to the selected lease
            if balance.lease_id != selected_lease_id:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"Allocation error: Balance {balance_id} (category: {balance.category.value}, "
                        f"reference: {balance.reference_id}) belongs to a different lease "
                        f"(lease_id: {balance.lease_id}). Cannot allocate payment from lease "
                        f"{selected_lease_id} to obligations of another lease."
                    )
                )
            
            # Also verify driver_id matches
            if balance.driver_id != selected_driver_id:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"Allocation error: Balance {balance_id} belongs to a different driver. "
                        f"Cannot allocate payment."
                    )
                )
        
        # Validate total allocated amount
        total_allocated = sum(float(alloc.get("amount", 0)) for alloc in allocations)
        
        if total_allocated > payment_amount:
            raise HTTPException(
                status_code=400, 
                detail=f"Total allocated amount (${total_allocated:.2f}) cannot exceed payment amount (${payment_amount:.2f})."
            )
        
        # Format allocations for the service layer
        formatted_allocations = []
        for alloc in allocations:
            formatted_allocations.append({
                "category": alloc.get("category"),
                "reference_id": alloc.get("reference_id"),
                "amount": float(alloc.get("amount")),
            })
        
        # Update the interim payment record with final details
        interim_payment.payment_date = payment_date
        interim_payment.total_amount = payment_amount
        interim_payment.payment_method = payment_method_enum
        interim_payment.notes = notes
        interim_payment.allocations = formatted_allocations
        
        # Generate payment ID if not already set
        if not interim_payment.payment_id:
            interim_payment.payment_id = interim_payment_service._generate_next_payment_id()
        
        db.commit()
        db.refresh(interim_payment)
        
        logger.info(f"Updated interim payment {interim_payment.payment_id} with allocation details")
        
        # Apply allocations to ledger
        # CRITICAL: Pass the specific lease_id to ensure allocations are scoped correctly
        allocation_dict = {alloc["reference_id"]: alloc["amount"] for alloc in formatted_allocations}
        
        ledger_service = LedgerService(db)
        ledger_service.apply_interim_payment(
            payment_amount=payment_amount,
            allocations=allocation_dict,
            driver_id=selected_driver_id,
            lease_id=selected_lease_id,  # CRITICAL: Use the specific lease_id
            payment_method=payment_method,
        )
        
        logger.info(
            f"Successfully applied interim payment {interim_payment.payment_id} to ledger "
            f"for lease {selected_lease_id}"
        )
        
        # Mark BPM case as closed
        bpm_service.mark_case_as_closed(db, case_no)
        
        # Create audit trail
        case = bpm_service.get_cases(db=db, case_no=case_no)
        if case:
            audit_trail_service.create_audit_trail(
                db=db,
                case=case,
                description=f"Completed interim payment {interim_payment.payment_id} for ${payment_amount:.2f} on lease {selected_lease_id}",
                meta_data={
                    "interim_payment_id": interim_payment.id,
                    "payment_id": interim_payment.payment_id,
                    "payment_amount": float(payment_amount),
                    "total_allocated": total_allocated,
                    "allocations_count": len(allocations),
                    "lease_id": selected_lease_id,
                    "driver_id": selected_driver_id
                }
            )
        
        db.commit()
        
        logger.info(f"Successfully processed interim payment allocation for case {case_no}")
        
        return "Ok"
        
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error processing payment allocation for case {case_no}: {e}", exc_info=True)
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to process payment allocation: {str(e)}"
        ) from e