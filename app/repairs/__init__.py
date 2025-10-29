"""
app/repairs/__init__.py

Vehicle Repairs module initialization
"""

from app.repairs.router import router as repairs_router

__all__ = ["repairs_router"]