"""
app/repairs/exceptions.py

Custom exceptions for Vehicle Repairs module
Provides specific error types for different business scenarios
"""


class RepairsException(Exception):
    """Base exception for Repairs module"""
    pass


class RepairNotFoundException(RepairsException):
    """Raised when repair invoice not found"""
    def __init__(self, repair_id: str):
        super().__init__(f"Repair not found: {repair_id}")
        self.repair_id = repair_id


class InstallmentNotFoundException(RepairsException):
    """Raised when repair installment not found"""
    def __init__(self, installment_id: str):
        super().__init__(f"Repair installment not found: {installment_id}")
        self.installment_id = installment_id


class RepairValidationException(RepairsException):
    """Raised when repair data validation fails"""
    pass


class RepairAmountException(RepairsException):
    """Raised when repair amount is invalid"""
    def __init__(self, amount, reason: str = "Amount must be greater than 0"):
        super().__init__(f"Invalid repair amount {amount}: {reason}")


class DuplicateInvoiceException(RepairsException):
    """Raised when duplicate invoice number detected"""
    def __init__(self, invoice_number: str, vehicle_id: int, invoice_date):
        super().__init__(
            f"Duplicate invoice: {invoice_number} already exists for vehicle {vehicle_id} on {invoice_date}"
        )


class InvalidStatusTransitionException(RepairsException):
    """Raised when status transition is not allowed"""
    def __init__(self, current_status: str, new_status: str, reason: str):
        super().__init__(
            f"Cannot transition from {current_status} to {new_status}: {reason}"
        )


class RepairAlreadyPostedException(RepairsException):
    """Raised when trying to modify a repair with posted installments"""
    def __init__(self, repair_id: str):
        super().__init__(
            f"Repair {repair_id} has posted installments and cannot be modified. Create adjustment instead."
        )


class InstallmentAlreadyPostedException(RepairsException):
    """Raised when trying to modify a posted installment"""
    def __init__(self, installment_id: str):
        super().__init__(
            f"Installment {installment_id} is already posted to ledger and cannot be modified"
        )


class InstallmentNotReadyException(RepairsException):
    """Raised when installment is not ready to be posted"""
    def __init__(self, installment_id: str, reason: str):
        super().__init__(
            f"Installment {installment_id} is not ready for posting: {reason}"
        )


class RepairPostingException(RepairsException):
    """Raised when posting to ledger fails"""
    def __init__(self, repair_id: str, reason: str):
        super().__init__(f"Failed to post repair {repair_id} to ledger: {reason}")


class RepairScheduleException(RepairsException):
    """Raised when payment schedule generation fails"""
    def __init__(self, repair_id: str, reason: str):
        super().__init__(f"Failed to generate schedule for repair {repair_id}: {reason}")


class EntityNotFoundException(RepairsException):
    """Raised when driver, lease, or vehicle not found"""
    def __init__(self, entity_type: str, entity_id: int):
        super().__init__(f"{entity_type} not found: {entity_id}")
        self.entity_type = entity_type
        self.entity_id = entity_id


class LeaseNotActiveException(RepairsException):
    """Raised when trying to create repair for inactive lease"""
    def __init__(self, lease_id: int):
        super().__init__(f"Lease {lease_id} is not active. Cannot create repair obligation.")
        self.lease_id = lease_id


class InvalidPaymentPeriodException(RepairsException):
    """Raised when payment period dates are invalid"""
    def __init__(self, reason: str):
        super().__init__(f"Invalid payment period: {reason}")


class BulkOperationException(RepairsException):
    """Raised when bulk operation encounters errors"""
    def __init__(self, operation: str, success_count: int, failure_count: int, failures: list):
        super().__init__(
            f"{operation} completed with {success_count} successes and {failure_count} failures"
        )
        self.success_count = success_count
        self.failure_count = failure_count
        self.failures = failures