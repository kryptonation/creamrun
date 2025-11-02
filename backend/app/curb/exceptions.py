"""
app/curb/exceptions.py

Custom exceptions for CURB import module
"""


class CurbException(Exception):
    """Base exception for CURB module"""
    pass


class CurbAPIException(CurbException):
    """Exception for CURB API errors"""
    pass


class CurbImportException(CurbException):
    """Exception for import process errors"""
    pass


class CurbMappingException(CurbException):
    """Exception for entity mapping errors"""
    pass


class CurbReconciliationException(CurbException):
    """Exception for reconciliation errors"""
    pass


class TripNotFoundException(CurbException):
    """Exception when trip is not found"""
    pass


class TripAlreadyExistsException(CurbException):
    """Exception when trying to import duplicate trip"""
    pass


class InvalidTripDataException(CurbException):
    """Exception for invalid trip data"""
    pass