### app/repairs/stubs.py

import math
import random
from datetime import date, timedelta
from decimal import Decimal

from app.repairs.models import RepairInvoiceStatus, WorkshopType
from app.repairs.schemas import (
    PaginatedRepairInvoiceResponse,
    RepairInvoiceListResponse,
)

# --- Pre-defined lists to generate realistic fake data ---
FAKE_DRIVERS = ["Andrews JB", "Michel Rahman", "John Michel", "George Fernando", "Greg Paul"]
FAKE_MEDALLIONS = ["5X23", "2224", "2C14", "2X24", "2T98"]
FAKE_LEASE_TYPES = ["DOV", "DOV", "Long Term", "Weekly", "DOV"]
FAKE_STATUSES = [RepairInvoiceStatus.OPEN, RepairInvoiceStatus.CLOSED, RepairInvoiceStatus.HOLD]

def _generate_random_date(days_ago_max=90) -> date:
    """Generates a random date within the last `days_ago_max` days."""
    return (datetime.now() - timedelta(days=random.randint(0, days_ago_max))).date()

def create_stub_repair_invoice_response(
    page: int, per_page: int
) -> PaginatedRepairInvoiceResponse:
    """Creates a paginated response with fake vehicle repair invoice data."""
    items = []
    total_items = 95  # Sample total to simulate pagination

    for i in range(per_page):
        driver_index = i % len(FAKE_DRIVERS)
        item = RepairInvoiceListResponse(
            repair_id=f"RPR-2025-{str(12 + i).zfill(5)}",
            invoice_number=f"EXT-45{random.randint(80, 99)}",
            invoice_date=_generate_random_date(),
            status=random.choices(FAKE_STATUSES, weights=[70, 25, 5])[0],
            driver_name=FAKE_DRIVERS[driver_index],
            medallion_no=FAKE_MEDALLIONS[driver_index],
            lease_type=FAKE_LEASE_TYPES[driver_index],
            workshop_type=random.choice([WorkshopType.EXTERNAL, WorkshopType.BIG_APPLE]),
            total_amount=Decimal(str(round(random.uniform(500.0, 2500.0), 2))),
        )
        items.append(item)

    total_pages = math.ceil(total_items / per_page)

    return PaginatedRepairInvoiceResponse(
        items=items,
        total_items=total_items,
        page=page,
        per_page=per_page,
        total_pages=total_pages,
    )