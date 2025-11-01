# app/nach_batches/exceptions.py
"""
NACH Batch Custom Exceptions

Domain-specific exceptions for ACH batch operations.
"""


class NACHBatchException(Exception):
    """Base exception for NACH batch operations"""
    pass


class BatchNotFoundException(NACHBatchException):
    """Raised when batch is not found"""
    pass


class BatchAlreadyExistsException(NACHBatchException):
    """Raised when attempting to create duplicate batch"""
    pass


class InvalidBatchStateException(NACHBatchException):
    """Raised when operation is invalid for current batch state"""
    pass


class NACHAFileGenerationException(NACHBatchException):
    """Raised when NACHA file generation fails"""
    pass


class InvalidDTRException(NACHBatchException):
    """Raised when DTR is invalid for batch processing"""
    pass


class MissingBankInfoException(NACHBatchException):
    """Raised when driver bank information is missing or invalid"""
    pass


class BatchReversalException(NACHBatchException):
    """Raised when batch reversal fails"""
    pass


class CompanyConfigurationException(NACHBatchException):
    """Raised when company configuration is missing"""
    pass


class InvalidRoutingNumberException(NACHBatchException):
    """Raised when routing number validation fails"""
    pass


class DuplicatePaymentException(NACHBatchException):
    """Raised when attempting to add duplicate payment to batch"""
    pass


class EmptyBatchException(NACHBatchException):
    """Raised when attempting to process empty batch"""
    pass