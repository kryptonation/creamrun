"""
app/dtr/exceptions.py

Custom exceptions for DTR module
"""


class DTRException(Exception):
    """Base exception for DTR module"""
    pass


class DTRNotFoundError(DTRException):
    """DTR not found"""
    pass


class DTRAlreadyExistsError(DTRException):
    """DTR already exists for the given period"""
    pass


class DTRInvalidPeriodError(DTRException):
    """Invalid period dates"""
    pass


class DTRGenerationError(DTRException):
    """Error during DTR generation"""
    pass


class DTRPDFGenerationError(DTRException):
    """Error generating DTR PDF"""
    pass


class DTRVoidedError(DTRException):
    """Operation not allowed on voided DTR"""
    pass


class DTRAlreadyGeneratedError(DTRException):
    """DTR already generated"""
    pass


class DTRPaymentUpdateError(DTRException):
    """Error updating payment information"""
    pass