"""Persist submitted KYC details without requiring document files."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20261120_0002"
down_revision: Union[str, None] = "20261119_0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    columns = {
        column["name"]: column
        for column in sa.inspect(bind).get_columns("kyc_documents")
    }

    if "document_number_masked" not in columns:
        op.add_column(
            "kyc_documents",
            sa.Column("document_number_masked", sa.String(length=100), nullable=True),
        )
    if "details" not in columns:
        op.add_column(
            "kyc_documents",
            sa.Column(
                "details",
                postgresql.JSONB(astext_type=sa.Text()),
                server_default=sa.text("'{}'::jsonb"),
                nullable=False,
            ),
        )

    nullable_file_columns = (
        ("storage_object_key", sa.Text()),
        ("content_type", sa.String(length=100)),
        ("file_size_bytes", sa.BigInteger()),
    )
    for column_name, column_type in nullable_file_columns:
        if column_name in columns and not columns[column_name]["nullable"]:
            op.alter_column(
                "kyc_documents",
                column_name,
                existing_type=column_type,
                nullable=True,
            )


def downgrade() -> None:
    bind = op.get_bind()
    columns = {
        column["name"]: column
        for column in sa.inspect(bind).get_columns("kyc_documents")
    }

    op.execute(
        "UPDATE kyc_documents "
        "SET storage_object_key = '', content_type = 'application/json', "
        "file_size_bytes = 0 "
        "WHERE storage_object_key IS NULL OR content_type IS NULL "
        "OR file_size_bytes IS NULL"
    )
    for column_name, column_type in (
        ("storage_object_key", sa.Text()),
        ("content_type", sa.String(length=100)),
        ("file_size_bytes", sa.BigInteger()),
    ):
        if column_name in columns and columns[column_name]["nullable"]:
            op.alter_column(
                "kyc_documents",
                column_name,
                existing_type=column_type,
                nullable=False,
            )

    if "details" in columns:
        op.drop_column("kyc_documents", "details")
    if "document_number_masked" in columns:
        op.drop_column("kyc_documents", "document_number_masked")
