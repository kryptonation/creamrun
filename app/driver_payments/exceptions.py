### app/driver_payments/exceptions.py

"""
Custom exceptions for the Driver Payments module.
Provides clear, specific error handling for payment processing operations.
"""


class DriverPaymentError(Exception):
    """Base exception for all driver payment-related errors."""
    pass


class DTRGenerationError(DriverPaymentError):
    """Raised when DTR generation fails."""
    pass


class DTRNotFoundError(DriverPaymentError):
    """Raised when a requested DTR does not exist."""
    pass


class InvalidPaymentPeriodError(DriverPaymentError):
    """Raised when payment period is invalid (must be Sunday-Saturday)."""
    pass


class ACHBatchError(DriverPaymentError):
    """Base exception for ACH batch-related errors."""
    pass


class ACHBatchNotFoundError(ACHBatchError):
    """Raised when a requested ACH batch does not exist."""
    pass


class ACHBatchAlreadyProcessedError(ACHBatchError):
    """Raised when attempting to modify a batch that's already been processed."""
    pass


class ACHBatchReversalError(ACHBatchError):
    """Raised when batch reversal fails."""
    pass


class InvalidBatchNumberError(ACHBatchError):
    """Raised when batch number format is invalid."""
    pass


class NACHAGenerationError(ACHBatchError):
    """Raised when NACHA file generation fails."""
    pass


class MissingBankInformationError(NACHAGenerationError):
    """Raised when driver's bank information is incomplete for ACH payment."""
    pass


class InvalidRoutingNumberError(NACHAGenerationError):
    """Raised when routing number fails validation."""
    pass


class InvalidAccountNumberError(NACHAGenerationError):
    """Raised when account number is invalid."""
    pass


class CheckPaymentError(DriverPaymentError):
    """Raised when check payment processing fails."""
    pass


class InvalidCheckNumberError(CheckPaymentError):
    """Raised when check number format is invalid."""
    pass


class DuplicatePaymentError(DriverPaymentError):
    """Raised when attempting to pay a DTR that's already been paid."""
    pass


class PaymentTypeInvalidError(DriverPaymentError):
    """Raised when driver's payment type doesn't match the payment method."""
    pass


class CompanyBankConfigError(DriverPaymentError):
    """Raised when company bank configuration is missing or invalid."""
    pass


class DTRAlreadyGeneratedError(DriverPaymentError):
    """Raised when attempting to generate a DTR that already exists."""
    pass