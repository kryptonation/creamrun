"""
app/tlc_violations/exceptions.py

Custom exceptions for TLC Violations module
"""


class TLCViolationError(Exception):
    """Base exception for TLC violations module"""
    pass


class TLCViolationNotFoundError(TLCViolationError):
    """Raised when violation is not found"""
    pass


class TLCViolationAlreadyExistsError(TLCViolationError):
    """Raised when duplicate summons number detected"""
    pass


class TLCViolationAlreadyPostedError(TLCViolationError):
    """Raised when attempting to modify posted violation"""
    pass


class TLCViolationAlreadyVoidedError(TLCViolationError):
    """Raised when attempting to modify voided violation"""
    pass


class TLCViolationPostingError(TLCViolationError):
    """Raised when ledger posting fails"""
    pass


class TLCViolationVoidError(TLCViolationError):
    """Raised when voiding operation fails"""
    pass


class TLCViolationUpdateError(TLCViolationError):
    """Raised when update operation fails"""
    pass


class TLCViolationRemapError(TLCViolationError):
    """Raised when remapping operation fails"""
    pass


class TLCViolationDispositionError(TLCViolationError):
    """Raised when disposition update fails"""
    pass


class TLCViolationDocumentError(TLCViolationError):
    """Raised when document operation fails"""
    pass


class TLCViolationDocumentNotFoundError(TLCViolationDocumentError):
    """Raised when document is not found"""
    pass


class TLCViolationDocumentUploadError(TLCViolationDocumentError):
    """Raised when document upload fails"""
    pass


class TLCViolationDocumentSizeError(TLCViolationDocumentError):
    """Raised when document exceeds size limit"""
    pass


class TLCViolationDocumentTypeError(TLCViolationDocumentError):
    """Raised when document type is invalid"""
    pass


class TLCViolationValidationError(TLCViolationError):
    """Raised when validation fails"""
    pass


class TLCViolationDriverNotFoundError(TLCViolationError):
    """Raised when driver is not found"""
    pass


class TLCViolationVehicleNotFoundError(TLCViolationError):
    """Raised when vehicle is not found"""
    pass


class TLCViolationMedallionNotFoundError(TLCViolationError):
    """Raised when medallion is not found"""
    pass


class TLCViolationLeaseNotFoundError(TLCViolationError):
    """Raised when lease is not found"""
    pass


class TLCViolationCURBMatchError(TLCViolationError):
    """Raised when CURB trip matching fails"""
    pass


class TLCViolationBatchPostingError(TLCViolationError):
    """Raised when batch posting encounters errors"""
    pass