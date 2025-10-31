"""
app/current_balances/exceptions.py

Custom exceptions for Current Balances module
"""

from fastapi import HTTPException, status


class CurrentBalancesException(HTTPException):
    """Base exception for Current Balances module"""
    
    def __init__(
        self,
        detail: str,
        status_code: int = status.HTTP_400_BAD_REQUEST,
        error_code: str = "CURRENT_BALANCES_ERROR"
    ):
        self.error_code = error_code
        super().__init__(status_code=status_code, detail=detail)


class InvalidWeekPeriodException(CurrentBalancesException):
    """Raised when week period is invalid"""
    
    def __init__(self, detail: str = "Invalid week period: must be Sunday to Saturday"):
        super().__init__(
            detail=detail,
            status_code=status.HTTP_400_BAD_REQUEST,
            error_code="INVALID_WEEK_PERIOD"
        )


class LeaseNotFoundException(CurrentBalancesException):
    """Raised when lease is not found"""
    
    def __init__(self, lease_id: int):
        super().__init__(
            detail=f"Lease not found: {lease_id}",
            status_code=status.HTTP_404_NOT_FOUND,
            error_code="LEASE_NOT_FOUND"
        )


class DriverNotFoundException(CurrentBalancesException):
    """Raised when driver is not found"""
    
    def __init__(self, driver_id: int):
        super().__init__(
            detail=f"Driver not found: {driver_id}",
            status_code=status.HTTP_404_NOT_FOUND,
            error_code="DRIVER_NOT_FOUND"
        )


class DataRetrievalException(CurrentBalancesException):
    """Raised when data retrieval fails"""
    
    def __init__(self, detail: str):
        super().__init__(
            detail=f"Failed to retrieve balance data: {detail}",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            error_code="DATA_RETRIEVAL_ERROR"
        )


class InvalidSortFieldException(CurrentBalancesException):
    """Raised when sort field is invalid"""
    
    def __init__(self, field: str):
        super().__init__(
            detail=f"Invalid sort field: {field}",
            status_code=status.HTTP_400_BAD_REQUEST,
            error_code="INVALID_SORT_FIELD"
        )


class InvalidFilterException(CurrentBalancesException):
    """Raised when filter value is invalid"""
    
    def __init__(self, filter_name: str, detail: str):
        super().__init__(
            detail=f"Invalid filter '{filter_name}': {detail}",
            status_code=status.HTTP_400_BAD_REQUEST,
            error_code="INVALID_FILTER"
        )


class ExportException(CurrentBalancesException):
    """Raised when export operation fails"""
    
    def __init__(self, format_type: str, detail: str):
        super().__init__(
            detail=f"Export to {format_type} failed: {detail}",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            error_code="EXPORT_ERROR"
        )


class NoDataFoundException(CurrentBalancesException):
    """Raised when no data found for given criteria"""
    
    def __init__(self, detail: str = "No balance data found for the specified criteria"):
        super().__init__(
            detail=detail,
            status_code=status.HTTP_404_NOT_FOUND,
            error_code="NO_DATA_FOUND"
        )


class DailyBreakdownException(CurrentBalancesException):
    """Raised when daily breakdown generation fails"""
    
    def __init__(self, lease_id: int, detail: str):
        super().__init__(
            detail=f"Failed to generate daily breakdown for lease {lease_id}: {detail}",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            error_code="DAILY_BREAKDOWN_ERROR"
        )


class StatisticsCalculationException(CurrentBalancesException):
    """Raised when statistics calculation fails"""
    
    def __init__(self, detail: str):
        super().__init__(
            detail=f"Failed to calculate statistics: {detail}",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            error_code="STATISTICS_ERROR"
        )


class WeekSelectionException(CurrentBalancesException):
    """Raised when week selection is invalid"""
    
    def __init__(self, detail: str):
        super().__init__(
            detail=f"Invalid week selection: {detail}",
            status_code=status.HTTP_400_BAD_REQUEST,
            error_code="WEEK_SELECTION_ERROR"
        )