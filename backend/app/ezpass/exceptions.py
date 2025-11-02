"""
app/ezpass/exceptions.py

Custom exceptions for EZPass module
"""


class EZPassError(Exception):
    """Base exception for EZPass module"""
    pass


class EZPassImportError(EZPassError):
    """Raised when CSV import fails"""
    pass


class EZPassMappingError(EZPassError):
    """Raised when entity mapping fails"""
    pass


class EZPassPostingError(EZPassError):
    """Raised when ledger posting fails"""
    pass


class EZPassValidationError(EZPassError):
    """Raised when data validation fails"""
    pass