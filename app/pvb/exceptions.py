"""
app/pvb/exceptions.py

Custom exceptions for PVB module
"""


class PVBException(Exception):
    """Base exception for PVB module"""
    pass


class PVBNotFoundException(PVBException):
    """Raised when PVB violation not found"""
    pass


class PVBImportError(PVBException):
    """Raised when import operation fails"""
    pass


class PVBMappingError(PVBException):
    """Raised when mapping operation fails"""
    pass


class PVBPostingError(PVBException):
    """Raised when ledger posting fails"""
    pass


class PVBValidationError(PVBException):
    """Raised when validation fails"""
    pass


class PVBDuplicateError(PVBException):
    """Raised when duplicate summons number detected"""
    pass


class PVBCSVFormatError(PVBImportError):
    """Raised when CSV format is invalid"""
    pass