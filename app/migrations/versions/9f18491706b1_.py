"""empty message

Revision ID: 9f18491706b1
Revises: 674416c16ccb, beb96b491fd1
Create Date: 2025-11-07 12:13:22.323499

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9f18491706b1'
down_revision: Union[str, Sequence[str], None] = ('674416c16ccb', 'beb96b491fd1')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
