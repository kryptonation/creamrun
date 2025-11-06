# app/dtr/exceptions.py

class DTRException(Exception):
    """Base exception for DTR module"""
    pass


class DTRGenerationError(DTRException):
    """Raised when DTR generation fails"""
    pass


class DTRNotFoundError(DTRException):
    """Raised when DTR is not found"""
    pass


class DTRValidationError(DTRException):
    """Raised when DTR validation fails"""
    pass


class DTRAlreadyExistsError(DTRException):
    """Raised when attempting to create duplicate DTR"""
    pass


class DTRPeriodError(DTRException):
    """Raised when payment period is invalid"""
    pass


class DTRPaymentError(DTRException):
    """Raised when payment processing fails"""
    pass


class DTRVoidError(DTRException):
    """Raised when voiding DTR fails"""
    pass


class DTRExportError(DTRException):
    """Raised when DTR export fails"""
    pass


class DTRCalculationError(DTRException):
    """Raised when DTR calculation fails"""
    pass


class InsufficientDataError(DTRException):
    """Raised when required data is missing for DTR generation"""
    pass