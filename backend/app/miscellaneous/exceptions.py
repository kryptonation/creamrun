"""
app/miscellaneous/exceptions.py

Custom exceptions for Miscellaneous Charges module
Provides specific error types for different business scenarios
"""


class MiscChargeException(Exception):
    """Base exception for Miscellaneous Charges module"""
    pass


class MiscChargeNotFoundException(MiscChargeException):
    """Raised when miscellaneous charge not found"""
    def __init__(self, expense_id: str):
        super().__init__(f"Miscellaneous charge not found: {expense_id}")
        self.expense_id = expense_id


class MiscChargeValidationException(MiscChargeException):
    """Raised when charge data validation fails"""
    pass


class MiscChargeAmountException(MiscChargeException):
    """Raised when charge amount is invalid"""
    def __init__(self, amount, reason: str = "Amount cannot be zero"):
        super().__init__(f"Invalid charge amount {amount}: {reason}")


class DuplicateChargeException(MiscChargeException):
    """Raised when duplicate charge detected"""
    def __init__(self, reference_number: str, driver_id: int):
        super().__init__(
            f"Duplicate charge: reference {reference_number} already exists for driver {driver_id}"
        )


class InvalidStatusTransitionException(MiscChargeException):
    """Raised when status transition is not allowed"""
    def __init__(self, current_status: str, new_status: str, reason: str):
        super().__init__(
            f"Cannot transition from {current_status} to {new_status}: {reason}"
        )


class MiscChargeAlreadyPostedException(MiscChargeException):
    """Raised when trying to modify a posted charge"""
    def __init__(self, expense_id: str):
        super().__init__(
            f"Miscellaneous charge {expense_id} is already posted and cannot be modified"
        )


class MiscChargeAlreadyVoidedException(MiscChargeException):
    """Raised when trying to operate on a voided charge"""
    def __init__(self, expense_id: str):
        super().__init__(
            f"Miscellaneous charge {expense_id} is already voided"
        )


class MiscChargeNotReadyException(MiscChargeException):
    """Raised when charge is not ready to be posted"""
    def __init__(self, expense_id: str, reason: str):
        super().__init__(
            f"Miscellaneous charge {expense_id} is not ready for posting: {reason}"
        )


class MiscChargePostingException(MiscChargeException):
    """Raised when posting to ledger fails"""
    def __init__(self, expense_id: str, reason: str):
        super().__init__(f"Failed to post charge {expense_id} to ledger: {reason}")


class EntityNotFoundException(MiscChargeException):
    """Raised when driver, lease, or vehicle not found"""
    def __init__(self, entity_type: str, entity_id: int):
        super().__init__(f"{entity_type} not found: {entity_id}")
        self.entity_type = entity_type
        self.entity_id = entity_id


class LeaseNotActiveException(MiscChargeException):
    """Raised when trying to create charge for inactive lease"""
    def __init__(self, lease_id: int):
        super().__init__(f"Lease {lease_id} is not active. Cannot create miscellaneous charge.")
        self.lease_id = lease_id


class InvalidPaymentPeriodException(MiscChargeException):
    """Raised when payment period dates are invalid"""
    def __init__(self, reason: str):
        super().__init__(f"Invalid payment period: {reason}")


class BulkOperationException(MiscChargeException):
    """Raised when bulk operation encounters errors"""
    def __init__(self, operation: str, success_count: int, failure_count: int, failures: list):
        super().__init__(
            f"{operation} completed with {success_count} successes and {failure_count} failures"
        )
        self.success_count = success_count
        self.failure_count = failure_count
        self.failures = failures


class ChargeIncludedInDTRException(MiscChargeException):
    """Raised when trying to modify charge already included in DTR"""
    def __init__(self, expense_id: str, dtr_id: str):
        super().__init__(
            f"Miscellaneous charge {expense_id} has been included in DTR {dtr_id} and cannot be modified"
        )
        self.expense_id = expense_id
        self.dtr_id = dtr_id


class InsufficientPermissionsException(MiscChargeException):
    """Raised when user lacks required permissions"""
    def __init__(self, action: str):
        super().__init__(f"Insufficient permissions to perform: {action}")
        self.action = action