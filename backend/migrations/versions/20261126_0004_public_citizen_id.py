"""Add unique public AgriLink citizen identifiers."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20261126_0004"
down_revision: Union[str, None] = "20261126_0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_PUBLIC_ID_DEFAULT = sa.text(
    "'AGL-CIT-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 24))"
)


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    columns = {column["name"]: column for column in inspector.get_columns("citizens")}

    if "public_citizen_id" not in columns:
        op.add_column(
            "citizens",
            sa.Column(
                "public_citizen_id",
                sa.String(length=32),
                nullable=False,
                server_default=_PUBLIC_ID_DEFAULT,
            ),
        )
    elif columns["public_citizen_id"]["nullable"]:
        op.execute(
            sa.text(
                "UPDATE citizens "
                "SET public_citizen_id = "
                "upper('AGL-CIT-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 24)) "
                "WHERE public_citizen_id IS NULL"
            )
        )
        op.alter_column("citizens", "public_citizen_id", nullable=False)

    unique_constraints = {
        constraint["name"]
        for constraint in sa.inspect(op.get_bind()).get_unique_constraints("citizens")
    }
    if "uq_citizens_public_citizen_id" not in unique_constraints:
        op.create_unique_constraint(
            "uq_citizens_public_citizen_id", "citizens", ["public_citizen_id"]
        )


def downgrade() -> None:
    columns = {
        column["name"] for column in sa.inspect(op.get_bind()).get_columns("citizens")
    }
    if "public_citizen_id" not in columns:
        return

    constraints = {
        constraint["name"]
        for constraint in sa.inspect(op.get_bind()).get_unique_constraints("citizens")
    }
    if "uq_citizens_public_citizen_id" in constraints:
        op.drop_constraint("uq_citizens_public_citizen_id", "citizens", type_="unique")
    op.drop_column("citizens", "public_citizen_id")
