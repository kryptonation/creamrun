"""
app/current_balances/models.py

Database models for Current Balances module
Provides view-only weekly financial summaries per lease
"""

from enum import Enum



class DTRStatusEnum(str, Enum):
    """DTR Status for current balances"""
    NOT_GENERATED = "NOT_GENERATED"
    GENERATED = "GENERATED"
    PROCESSING = "PROCESSING"
    FAILED = "FAILED"


class LeaseStatusEnum(str, Enum):
    """Lease status for filtering"""
    ACTIVE = "ACTIVE"
    TERMINATION_REQUESTED = "TERMINATION_REQUESTED"
    TERMINATED = "TERMINATED"
    SUSPENDED = "SUSPENDED"


class DriverStatusEnum(str, Enum):
    """Driver status for filtering"""
    ACTIVE = "ACTIVE"
    SUSPENDED = "SUSPENDED"
    BLACKLISTED = "BLACKLISTED"
    TERMINATED = "TERMINATED"


class PaymentTypeEnum(str, Enum):
    """Payment type"""
    CASH = "CASH"
    ACH = "ACH"


# Note: Current Balances is a READ-ONLY view module
# It does not create its own database tables, but queries existing data from:
# - leases
# - drivers  
# - vehicles
# - medallions
# - ledger_postings
# - ledger_balances
# - dtrs (for historical weeks)
# - curb_trips (for current week earnings)

# The models below are used for type safety and response schemas only
# They represent the aggregated view structure returned to the API