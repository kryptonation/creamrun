"""
app/interim_payments/exceptions.py

Custom exceptions for Interim Payments module
Provides specific error types for different business scenarios
"""


class InterimPaymentException(Exception):
    """Base exception for Interim Payments module"""
    pass


class PaymentNotFoundException(InterimPaymentException):
    """Raised when interim payment is not found"""
    def __init__(self, payment_id):
        super().__init__(f"Interim payment not found: {payment_id}")
        self.payment_id = payment_id


class AllocationNotFoundException(InterimPaymentException):
    """Raised when payment allocation is not found"""
    def __init__(self, allocation_id):
        super().__init__(f"Payment allocation not found: {allocation_id}")
        self.allocation_id = allocation_id


class PaymentValidationException(InterimPaymentException):
    """Raised when payment data validation fails"""
    pass


class InvalidPaymentAmountException(InterimPaymentException):
    """Raised when payment amount is invalid"""
    def __init__(self, amount, reason="Amount must be greater than 0"):
        super().__init__(f"Invalid payment amount {amount}: {reason}")
        self.amount = amount


class AllocationExceedsPaymentException(InterimPaymentException):
    """Raised when total allocations exceed payment amount"""
    def __init__(self, total_allocated, payment_amount):
        super().__init__(
            f"Total allocated amount ({total_allocated}) exceeds payment amount ({payment_amount})"
        )
        self.total_allocated = total_allocated
        self.payment_amount = payment_amount


class InvalidAllocationCategoryException(InterimPaymentException):
    """Raised when allocation category is invalid or restricted"""
    def __init__(self, category, reason="Category cannot receive interim payments"):
        super().__init__(f"Invalid allocation category {category}: {reason}")
        self.category = category


class PaymentAlreadyPostedException(InterimPaymentException):
    """Raised when trying to modify a payment that has been posted"""
    def __init__(self, payment_id):
        super().__init__(
            f"Payment {payment_id} has been posted to ledger and cannot be modified. "
            "Create a void and repost instead."
        )
        self.payment_id = payment_id


class PaymentAlreadyVoidedException(InterimPaymentException):
    """Raised when trying to post or modify a voided payment"""
    def __init__(self, payment_id):
        super().__init__(f"Payment {payment_id} has been voided and cannot be modified")
        self.payment_id = payment_id


class LedgerBalanceNotFoundException(InterimPaymentException):
    """Raised when ledger balance does not exist"""
    def __init__(self, balance_id):
        super().__init__(f"Ledger balance not found: {balance_id}")
        self.balance_id = balance_id


class LedgerBalanceClosedException(InterimPaymentException):
    """Raised when trying to pay a closed ledger balance"""
    def __init__(self, balance_id):
        super().__init__(f"Ledger balance {balance_id} is already closed (fully paid)")
        self.balance_id = balance_id


class InsufficientBalanceException(InterimPaymentException):
    """Raised when allocation amount exceeds balance outstanding"""
    def __init__(self, balance_id, allocated, outstanding):
        super().__init__(
            f"Allocation amount ({allocated}) exceeds outstanding balance ({outstanding}) "
            f"for ledger balance {balance_id}"
        )
        self.balance_id = balance_id
        self.allocated = allocated
        self.outstanding = outstanding


class PaymentPostingException(InterimPaymentException):
    """Raised when posting to ledger fails"""
    def __init__(self, payment_id, reason):
        super().__init__(f"Failed to post payment {payment_id} to ledger: {reason}")
        self.payment_id = payment_id
        self.reason = reason


class DuplicateAllocationException(InterimPaymentException):
    """Raised when trying to allocate to same balance multiple times in one payment"""
    def __init__(self, balance_id):
        super().__init__(
            f"Duplicate allocation detected: Balance {balance_id} is already "
            "allocated in this payment"
        )
        self.balance_id = balance_id


class InvalidStatusTransitionException(InterimPaymentException):
    """Raised when status transition is not allowed"""
    def __init__(self, current_status, new_status, reason):
        super().__init__(
            f"Cannot transition from {current_status} to {new_status}: {reason}"
        )
        self.current_status = current_status
        self.new_status = new_status


class DriverNotFoundException(InterimPaymentException):
    """Raised when driver does not exist"""
    def __init__(self, driver_id):
        super().__init__(f"Driver not found: {driver_id}")
        self.driver_id = driver_id


class LeaseNotFoundException(InterimPaymentException):
    """Raised when lease does not exist"""
    def __init__(self, lease_id):
        super().__init__(f"Lease not found: {lease_id}")
        self.lease_id = lease_id


class LeaseNotActiveException(InterimPaymentException):
    """Raised when lease is not active"""
    def __init__(self, lease_id):
        super().__init__(
            f"Lease {lease_id} is not active. Cannot process interim payment."
        )
        self.lease_id = lease_id


class ExcessAllocationException(InterimPaymentException):
    """Raised when unallocated funds remain after allocation"""
    def __init__(self, unallocated_amount):
        super().__init__(
            f"Unallocated amount remains: ${unallocated_amount}. "
            "System will auto-apply to LEASE."
        )
        self.unallocated_amount = unallocated_amount


class ReceiptGenerationException(InterimPaymentException):
    """Raised when receipt generation fails"""
    def __init__(self, payment_id, reason):
        super().__init__(f"Failed to generate receipt for payment {payment_id}: {reason}")
        self.payment_id = payment_id
        self.reason = reason


class InvalidVoidReasonException(InterimPaymentException):
    """Raised when void reason is insufficient"""
    def __init__(self, reason="Void reason must be at least 10 characters"):
        super().__init__(reason)