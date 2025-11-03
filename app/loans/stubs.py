### app/loans/stubs.py

import math
import random
from datetime import date, timedelta, datetime
from decimal import Decimal

from app.loans.models import LoanInstallmentStatus, LoanStatus
from app.loans.schemas import (
    DriverLoanListResponse,
    PaginatedDriverLoanResponse,
)

# --- Pre-defined lists to generate realistic fake data ---
FAKE_DRIVERS = ["Andrews JB", "Michel Rahman", "John Michel", "George Fernando", "Greg Paul"]
FAKE_MEDALLIONS = ["5X23", "2224", "2C14", "2X24", "2T98"]
FAKE_LEASE_TYPES = ["DOV", "DOV", "Long Term", "Weekly", "DOV"]
FAKE_STATUSES = [LoanInstallmentStatus.SCHEDULED, LoanInstallmentStatus.POSTED, LoanInstallmentStatus.DUE, LoanStatus.OPEN]
FAKE_INSTALLMENT_STATUSES = [LoanInstallmentStatus.SCHEDULED, LoanInstallmentStatus.POSTED, LoanInstallmentStatus.DUE, LoanInstallmentStatus.PAID]

def _generate_random_date(days_ago_max=60) -> date:
    """Generates a random Sunday within the last `days_ago_max` days."""
    today = datetime.now().date()
    random_day = today - timedelta(days=random.randint(0, days_ago_max))
    # Adjust to the nearest previous Sunday
    sunday = random_day - timedelta(days=(random_day.weekday() + 1) % 7)
    return sunday

def create_stub_loan_response(
    page: int, per_page: int
) -> PaginatedDriverLoanResponse:
    """Creates a paginated response with fake driver loan data."""
    items = []
    total_items = 95  # Sample total

    for i in range(per_page):
        driver_index = i % len(FAKE_DRIVERS)
        interest_rate = random.choice([0, 0, 0, 5, 10, 12])
        
        item = DriverLoanListResponse(
            loan_id=f"DLN-2025-{str(45 + i).zfill(5)}",
            status=random.choices(FAKE_STATUSES, weights=[40, 20, 20, 20])[0],
            driver_name=FAKE_DRIVERS[driver_index],
            medallion_no=FAKE_MEDALLIONS[driver_index],
            lease_type=FAKE_LEASE_TYPES[driver_index],
            principal_amount=Decimal(str(round(random.uniform(500.0, 3000.0), 2))),
            interest_rate=Decimal(str(interest_rate)),
            start_week=_generate_random_date(),
        )
        items.append(item)

    total_pages = math.ceil(total_items / per_page)

    return PaginatedDriverLoanResponse(
        items=items,
        total_items=total_items,
        page=page,
        per_page=per_page,
        total_pages=total_pages,
    )