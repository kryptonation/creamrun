### app/tlc/stubs.py

import math
import random
from datetime import date, datetime, time, timedelta

from app.tlc.models import TLCDisposition, TLCViolationStatus, TLCViolationType
from app.tlc.schemas import (
    PaginatedTLCViolationResponse,
    TLCViolationListResponse,
)

# --- Pre-defined lists to generate realistic fake data ---
FAKE_DRIVERS = ["117439", "135469", "127454", "134466", "147664"]
FAKE_PLATES = ["Y207163C", "Y208142C", "Y204572C", "Y204139C", "Y203591C"]
FAKE_MEDALLIONS = ["1P43", "1P81", "5X23", "5X43", "2X77"]
FAKE_SUMMONS = ["1492882902", "1495204730", "1495204785", "1498274288", "1499096380"]
FAKE_TYPES = [TLCViolationType.FI, TLCViolationType.FN, TLCViolationType.RF]

def _generate_random_date(days_ago_max=45) -> date:
    """Generates a random date within the last `days_ago_max` days."""
    return (datetime.now() - timedelta(days=random.randint(0, days_ago_max))).date()

def _generate_random_time_str() -> str:
    """Generates a random time string in the HHMM(A/P) format."""
    hour = random.randint(1, 12)
    minute = random.randint(0, 59)
    meridiem = random.choice(['A', 'P'])
    return f"{hour:02d}{minute:02d}{meridiem}"

def create_stub_tlc_response(
    page: int, per_page: int
) -> PaginatedTLCViolationResponse:
    """Creates a paginated response with fake TLC violation data."""
    items = []
    total_items = 95  # Sample total

    for i in range(per_page):
        item = TLCViolationListResponse(
            plate=random.choice(FAKE_PLATES),
            state="NY",
            type=random.choice(FAKE_TYPES),
            summons_no=random.choice(FAKE_SUMMONS),
            issue_date=_generate_random_date(),
            issue_time=datetime.strptime(_generate_random_time_str(), "%I%M%p").time(),
            driver_id=random.choice(FAKE_DRIVERS),
            medallion_no=random.choice(FAKE_MEDALLIONS),
        )
        items.append(item)

    total_pages = math.ceil(total_items / per_page)

    return PaginatedTLCViolationResponse(
        items=items,
        total_items=total_items,
        page=page,
        per_page=per_page,
        total_pages=total_pages,
    )