"""empty message

Revision ID: 567c7608b22a
Revises: 15f06c5b3718, be613086a6a7
Create Date: 2025-11-28 08:53:58.877555

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '567c7608b22a'
down_revision: Union[str, Sequence[str], None] = ('15f06c5b3718', 'be613086a6a7')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
