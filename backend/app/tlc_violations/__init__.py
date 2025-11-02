"""
app/tlc_violations/__init__.py

TLC Violations Module
Handles TLC regulatory violations and summons tracking
"""

from app.tlc_violations.models import (
    TLCViolation,
    TLCViolationDocument,
    ViolationType,
    ViolationStatus,
    HearingLocation,
    Disposition,
    Borough,
    PostingStatus
)

from app.tlc_violations.service import TLCViolationService
from app.tlc_violations.repository import (
    TLCViolationRepository,
    TLCViolationDocumentRepository
)

__all__ = [
    # Models
    "TLCViolation",
    "TLCViolationDocument",
    # Enums
    "ViolationType",
    "ViolationStatus",
    "HearingLocation",
    "Disposition",
    "Borough",
    "PostingStatus",
    # Services & Repositories
    "TLCViolationService",
    "TLCViolationRepository",
    "TLCViolationDocumentRepository",
]