"""
app/ledger/exceptions.py

Custom exceptions for Ledger domain
Provides specific error types for different business rule violations
"""

from fastapi import HTTPException, status

# === BASE EXCEPTION ===


class LedgerException(HTTPException):
    """Base exception for all ledger-related errors"""
    
    def __init__(
        self,
        detail: str,
        status_code: int = status.HTTP_400_BAD_REQUEST,
        error_code: str = "LEDGER_ERROR"
    ):
        self.error_code = error_code
        super().__init__(status_code=status_code, detail=detail)


# === POSTING EXCEPTIONS ===


class PostingNotFoundException(LedgerException):
    """Raised when a posting record is not found"""
    
    def __init__(self, posting_id: str):
        super().__init__(
            detail=f"Posting not found: {posting_id}",
            status_code=status.HTTP_404_NOT_FOUND,
            error_code="POSTING_NOT_FOUND"
        )


class PostingAlreadyVoidedException(LedgerException):
    """Raised when attempting to void an already voided posting"""
    
    def __init__(self, posting_id: str):
        super().__init__(
            detail=f"Posting already voided: {posting_id}",
            status_code=status.HTTP_409_CONFLICT,
            error_code="POSTING_ALREADY_VOIDED"
        )


class PostingImmutableException(LedgerException):
    """Raised when attempting to modify an immutable posting"""
    
    def __init__(self, posting_id: str):
        super().__init__(
            detail=f"Posting is immutable and cannot be modified: {posting_id}. Use void and repost instead.",
            status_code=status.HTTP_403_FORBIDDEN,
            error_code="POSTING_IMMUTABLE"
        )


class InvalidPostingAmountException(LedgerException):
    """Raised when posting amount is invalid"""
    
    def __init__(self, amount: float, reason: str = "Amount must be positive"):
        super().__init__(
            detail=f"Invalid posting amount: {amount}. {reason}",
            status_code=status.HTTP_400_BAD_REQUEST,
            error_code="INVALID_POSTING_AMOUNT"
        )


class InvalidPostingPeriodException(LedgerException):
    """Raised when payment period is invalid"""
    
    def __init__(self, reason: str):
        super().__init__(
            detail=f"Invalid payment period: {reason}",
            status_code=status.HTTP_400_BAD_REQUEST,
            error_code="INVALID_PAYMENT_PERIOD"
        )


# === BALANCE EXCEPTIONS ===


class BalanceNotFoundException(LedgerException):
    """Raised when a balance record is not found"""
    
    def __init__(self, balance_id: str):
        super().__init__(
            detail=f"Balance not found: {balance_id}",
            status_code=status.HTTP_404_NOT_FOUND,
            error_code="BALANCE_NOT_FOUND"
        )


class InsufficientBalanceException(LedgerException):
    """Raised when payment amount exceeds outstanding balance"""
    
    def __init__(self, balance_id: str, outstanding: float, payment: float):
        super().__init__(
            detail=f"Insufficient balance: Balance {balance_id} has ${outstanding:.2f} outstanding, cannot apply ${payment:.2f}",
            status_code=status.HTTP_400_BAD_REQUEST,
            error_code="INSUFFICIENT_BALANCE"
        )


class BalanceAlreadyClosedException(LedgerException):
    """Raised when attempting to modify a closed balance"""
    
    def __init__(self, balance_id: str):
        super().__init__(
            detail=f"Balance is closed and cannot be modified: {balance_id}",
            status_code=status.HTTP_409_CONFLICT,
            error_code="BALANCE_ALREADY_CLOSED"
        )


class NegativeBalanceException(LedgerException):
    """Raised when a balance calculation results in negative value"""
    
    def __init__(self, balance_id: str, calculated_balance: float):
        super().__init__(
            detail=f"Balance calculation error: Balance {balance_id} resulted in negative value: ${calculated_balance:.2f}",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            error_code="NEGATIVE_BALANCE"
        )


# === PAYMENT ALLOCATION EXCEPTIONS ===


class AllocationNotFoundException(LedgerException):
    """Raised when an allocation record is not found"""
    
    def __init__(self, allocation_id: str):
        super().__init__(
            detail=f"Allocation not found: {allocation_id}",
            status_code=status.HTTP_404_NOT_FOUND,
            error_code="ALLOCATION_NOT_FOUND"
        )


class InvalidAllocationException(LedgerException):
    """Raised when payment allocation is invalid"""
    
    def __init__(self, reason: str):
        super().__init__(
            detail=f"Invalid payment allocation: {reason}",
            status_code=status.HTTP_400_BAD_REQUEST,
            error_code="INVALID_ALLOCATION"
        )


# === ENTITY REFERENCE EXCEPTIONS ===


class DriverNotFoundException(LedgerException):
    """Raised when referenced driver doesn't exist"""
    
    def __init__(self, driver_id: int):
        super().__init__(
            detail=f"Driver not found: {driver_id}",
            status_code=status.HTTP_404_NOT_FOUND,
            error_code="DRIVER_NOT_FOUND"
        )


class LeaseNotFoundException(LedgerException):
    """Raised when referenced lease doesn't exist"""
    
    def __init__(self, lease_id: int):
        super().__init__(
            detail=f"Lease not found: {lease_id}",
            status_code=status.HTTP_404_NOT_FOUND,
            error_code="LEASE_NOT_FOUND"
        )


class LeaseNotActiveException(LedgerException):
    """Raised when attempting to post to inactive lease"""
    
    def __init__(self, lease_id: int):
        super().__init__(
            detail=f"Lease is not active: {lease_id}. Cannot post transactions to inactive lease.",
            status_code=status.HTTP_400_BAD_REQUEST,
            error_code="LEASE_NOT_ACTIVE"
        )


# === BUSINESS RULE VIOLATIONS ===


class PaymentHierarchyViolationException(LedgerException):
    """Raised when payment hierarchy is violated"""
    
    def __init__(self, reason: str):
        super().__init__(
            detail=f"Payment hierarchy violation: {reason}",
            status_code=status.HTTP_400_BAD_REQUEST,
            error_code="PAYMENT_HIERARCHY_VIOLATION"
        )


class DuplicatePostingException(LedgerException):
    """Raised when attempting to create duplicate posting"""
    
    def __init__(self, source_type: str, source_id: str):
        super().__init__(
            detail=f"Duplicate posting: {source_type}:{source_id} already exists in ledger",
            status_code=status.HTTP_409_CONFLICT,
            error_code="DUPLICATE_POSTING"
        )


class ReconciliationException(LedgerException):
    """Raised when balance reconciliation fails"""
    
    def __init__(self, reason: str):
        super().__init__(
            detail=f"Balance reconciliation failed: {reason}",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            error_code="RECONCILIATION_FAILED"
        )


# === VALIDATION EXCEPTIONS ===


class InvalidCategoryException(LedgerException):
    """Raised when posting category is invalid"""
    
    def __init__(self, category: str):
        super().__init__(
            detail=f"Invalid posting category: {category}",
            status_code=status.HTTP_400_BAD_REQUEST,
            error_code="INVALID_CATEGORY"
        )


class InvalidPostingTypeException(LedgerException):
    """Raised when posting type is invalid"""
    
    def __init__(self, posting_type: str):
        super().__init__(
            detail=f"Invalid posting type: {posting_type}. Must be DEBIT or CREDIT",
            status_code=status.HTTP_400_BAD_REQUEST,
            error_code="INVALID_POSTING_TYPE"
        )


class MissingRequiredFieldException(LedgerException):
    """Raised when required field is missing"""
    
    def __init__(self, field_name: str):
        super().__init__(
            detail=f"Missing required field: {field_name}",
            status_code=status.HTTP_400_BAD_REQUEST,
            error_code="MISSING_REQUIRED_FIELD"
        )