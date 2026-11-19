"""Create the initial CIS database schema.

Revision ID: 20261119_0001
Revises:
Create Date: 2026-11-19
"""

from typing import Sequence, Union

from alembic import op

from app.models import Base

revision: str = "20261119_0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    Base.metadata.create_all(bind=op.get_bind())


def downgrade() -> None:
    Base.metadata.drop_all(bind=op.get_bind())
