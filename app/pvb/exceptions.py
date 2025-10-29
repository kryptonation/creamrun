"""
app/pvb/exceptions.py

Custom exceptions for PVB module
"""


class PVBException(Exception):
    """Base exception for PVB module"""
    pass


class PVBImportError(PVBException):
    """Raised when PVB import fails"""
    pass


class PVBMappingError(PVBException):
    """Raised when mapping violation to driver fails"""
    pass


class PVBPostingError(PVBException):
    """Raised when posting to ledger fails"""
    pass


class PVBViolationNotFoundException(PVBException):
    """Raised when violation not found"""
    def __init__(self, violation_id: int):
        super().__init__(f"PVB violation not found: {violation_id}")


class PVBImportHistoryNotFoundException(PVBException):
    """Raised when import history not found"""
    def __init__(self, batch_id: str):
        super().__init__(f"PVB import history not found: {batch_id}")