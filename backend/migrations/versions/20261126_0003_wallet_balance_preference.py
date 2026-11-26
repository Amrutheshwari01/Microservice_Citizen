"""Persist a citizen's configurable wallet balance cap."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20261126_0003"
down_revision: Union[str, None] = "20261120_0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    columns = {
        column["name"]
        for column in sa.inspect(op.get_bind()).get_columns("citizen_profiles")
    }
    new_columns = (
        ("wallet_max_balance", sa.Numeric(19, 4), None),
        ("gender", sa.String(length=30), None),
        (
            "addresses",
            postgresql.JSONB(astext_type=sa.Text()),
            sa.text("'[]'::jsonb"),
        ),
        (
            "bank_accounts",
            postgresql.JSONB(astext_type=sa.Text()),
            sa.text("'[]'::jsonb"),
        ),
    )
    for column_name, column_type, server_default in new_columns:
        if column_name not in columns:
            op.add_column(
                "citizen_profiles",
                sa.Column(
                    column_name,
                    column_type,
                    nullable=column_name in {"wallet_max_balance", "gender"},
                    server_default=server_default,
                ),
            )


def downgrade() -> None:
    columns = {
        column["name"]
        for column in sa.inspect(op.get_bind()).get_columns("citizen_profiles")
    }
    for column_name in ("bank_accounts", "addresses", "gender", "wallet_max_balance"):
        if column_name in columns:
            op.drop_column("citizen_profiles", column_name)
