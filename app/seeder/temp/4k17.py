import uuid
from datetime import date, datetime
from decimal import Decimal
from sqlalchemy.orm import Session

# --- CORE IMPORTS ---
from app.core.db import SessionLocal

# --- CRITICAL DEPENDENCY IMPORTS ---
# These are required because 'User' links to them. 
# Without them, querying Lease/Driver triggers a "Mapper Initialization" error.
from app.audit_trail.models import AuditTrail      # <--- This fixes the current error
from app.bpm.models import SLA, Case, CaseStepConfig, CaseReassignment # <--- These fix potential future errors

# --- DOMAIN IMPORTS ---
from app.drivers.models import Driver
from app.leases.models import Lease
from app.medallions.models import Medallion
from app.vehicles.models import Vehicle
from app.entities.models import Address, BankAccount
from app.dtr.models import DTR, DTRStatus
from app.pvb.models import PVBViolation, PVBViolationStatus, PVBSource
from app.repairs.models import RepairInvoice, RepairInvoiceStatus, WorkshopType, RepairInstallment, RepairInstallmentStatus
from app.loans.models import DriverLoan, LoanStatus, LoanInstallment, LoanInstallmentStatus
from app.ledger.models import LedgerPosting, PostingCategory, EntryType, PostingStatus

def seed_missing_dtr_data(db: Session):
    print("--- Starting Seeding Process for Medallion 4K17 ---")

    # 1. FETCH CONTEXT (Driver & Lease)
    # =====================================================
    # Assuming the lease ID from Doc 2: DM-LT-4K17-0825-1
    lease = db.query(Lease).filter(Lease.lease_id == "DM-LT-4K17-0825-1").first()
    
    if not lease:
        print(f"Error: Lease 'DM-LT-4K17-0825-1' not found.")
        return

    driver = lease.lease_driver
    for d in driver:
        if not d.is_additional_driver:
            driver = d.driver
            break
    if not driver:
         # Fallback if relationship is not loaded, though it should be
         # You might need to query Driver manually if back_populates isn't set up perfectly
         print("Warning: Lease found but Driver relationship is None. Attempting fetch.")
         from app.drivers.models import Driver
         # Using the lease_driver table logic or direct relationship depending on your DB state
         # This assumes specific knowledge of your data, relying on lease.driver for now.
         return

    medallion_id = lease.medallion_id
    vehicle_id = lease.vehicle_id
    
    # The DTR Period end date (Deductions usually post on the last day of period)
    posting_date = date(2025, 9, 27) 

    # 2. SEED THE MISSING PVB TICKET ($51.25)
    # =====================================================
    print(f"Seeding PVB Ticket #4047832170...")

    # Check if already exists to prevent duplicates
    existing_pvb = db.query(PVBViolation).filter(PVBViolation.summons == "4047832170").first()
    
    if not existing_pvb:
        pvb_ticket = PVBViolation(
            source=PVBSource.MANUAL_ENTRY,
            case_no="MIGRATION-001",
            plate="T606791C", 
            state="NY",
            type="BUS LANE VIOLATION",
            summons="4047832170",
            issue_date=date(2025, 9, 4),
            issue_time=datetime.strptime("10:24", "%H:%M").time(),
            fine=Decimal("50.00"),
            penalty=Decimal("1.25"), 
            interest=Decimal("0.00"),
            reduction=Decimal("0.00"),
            amount_due=Decimal("51.25"),
            status=PVBViolationStatus.POSTED_TO_LEDGER,
            posting_date=datetime.now(),
            driver_id=driver.id,
            vehicle_id=vehicle_id,
            medallion_id=medallion_id,
            lease_id=lease.id
        )
        db.add(pvb_ticket)
        db.flush() 

        # Create Ledger Posting
        pvb_ledger = LedgerPosting(
            id=str(uuid.uuid4()),
            category=PostingCategory.PVB,
            amount=Decimal("51.25"), 
            entry_type=EntryType.DEBIT,
            status=PostingStatus.POSTED,
            reference_id=f"PVB-{pvb_ticket.summons}",
            driver_id=driver.id,
            lease_id=lease.id,
            created_on=datetime.combine(posting_date, datetime.min.time())
        )
        db.add(pvb_ledger)
        print(" > PVB Ticket Created.")
    else:
        print(" > PVB Ticket already exists. Skipping.")

    # 3. SEED THE SECURITY DEPOSIT ($100.00)
    # =====================================================
    print(f"Seeding Security Deposit Deduction...")
    
    # Check for existing deposit on this date to prevent duplicates
    existing_dep = db.query(LedgerPosting).filter(
        LedgerPosting.reference_id == f"SEC-DEP-{lease.id}-WK-SEP27"
    ).first()

    if not existing_dep:
        sec_dep_ledger = LedgerPosting(
            id=str(uuid.uuid4()),
            category=PostingCategory.DEPOSIT,
            amount=Decimal("100.00"), 
            entry_type=EntryType.DEBIT,
            status=PostingStatus.POSTED,
            reference_id=f"SEC-DEP-{lease.id}-WK-SEP27",
            driver_id=driver.id,
            lease_id=lease.id,
            created_on=datetime.combine(posting_date, datetime.min.time())
        )
        db.add(sec_dep_ledger)
        print(" > Security Deposit Created.")
    else:
        print(" > Security Deposit already exists. Skipping.")

    # 4. SEED REPAIRS (Historical Balance)
    # =====================================================
    print(f"Seeding Repair Invoice #2457...")
    
    existing_repair = db.query(RepairInvoice).filter(RepairInvoice.invoice_number == "2457").first()

    if not existing_repair:
        repair = RepairInvoice(
            repair_id="RPR-2025-42177",
            invoice_number="2457",
            invoice_date=date(2025, 2, 10),
            driver_id=driver.id,
            lease_id=lease.id,
            vehicle_id=vehicle_id,
            medallion_id=medallion_id,
            workshop_type=WorkshopType.EXTERNAL,
            description="Imported Balance",
            total_amount=Decimal("900.00"),
            status=RepairInvoiceStatus.OPEN,
            start_week=date(2025, 2, 10)
        )
        db.add(repair)
        db.flush()

        repair_inst = RepairInstallment(
            invoice_id=repair.id,
            installment_id=f"RPR-INST-{repair.id}-01",
            week_start_date=date(2025, 10, 28),
            week_end_date=date(2025, 11, 3),
            principal_amount=Decimal("150.00"),
            status=RepairInstallmentStatus.SCHEDULED
        )
        db.add(repair_inst)
        print(" > Repair Invoice Created.")
    else:
        print(" > Repair Invoice already exists. Skipping.")

    # 5. SEED LOANS (Historical Balance)
    # =====================================================
    print(f"Seeding Driver Loan LN42177...")
    
    existing_loan = db.query(DriverLoan).filter(DriverLoan.loan_id == "LN42177").first()

    if not existing_loan:
        loan = DriverLoan(
            loan_id="LN42177",
            driver_id=driver.id,
            lease_id=lease.id,
            medallion_id=medallion_id,
            principal_amount=Decimal("600.00"),
            interest_rate=Decimal("10.00"),
            notes="Imported Balance",
            status=LoanStatus.OPEN,
            start_week=date(2025, 10, 28), 
            loan_date=date(2025, 10, 28)
        )
        db.add(loan)
        db.flush()

        loan_inst = LoanInstallment(
            loan_id=loan.id,
            installment_id=f"LN-INST-{loan.id}-FINAL",
            week_start_date=date(2025, 10, 28),
            week_end_date=date(2025, 11, 3),
            principal_amount=Decimal("107.00"), 
            interest_amount=Decimal("0.00"),
            total_due=Decimal("107.00"),
            status=LoanInstallmentStatus.SCHEDULED
        )
        db.add(loan_inst)
        print(" > Loan Created.")
    else:
        print(" > Loan already exists. Skipping.")

    # Commit all changes
    db.commit()
    print("--- Seeding Completed Successfully ---")

if __name__ == "__main__":
    db = SessionLocal()
    try:
        seed_missing_dtr_data(db)
    finally:
        db.close()