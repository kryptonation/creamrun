"""
app/dtr/__init__.py

DTR (Driver Transaction Report) Module

This module handles the generation, storage, and management of weekly 
Driver Transaction Reports (DTRs).
"""

from app.dtr.models import DTR, DTRStatus, DTRPaymentType, DTRGenerationHistory
from app.dtr.router import router as dtr_router

__all__ = [
    'DTR',
    'DTRStatus',
    'DTRPaymentType',
    'DTRGenerationHistory',
    'dtr_router'
]