"""Make SKU field optional in ProductVariant table

Revision ID: 004_make_sku_optional
Revises: 003_add_measurements_field
Create Date: 2024-01-04 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = '004_make_sku_optional'
down_revision = '003_add_measurements_field'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column('ProductVariant', 'sku', nullable=True)
    op.execute("COMMENT ON COLUMN \"ProductVariant\".\"sku\" IS 'Stock Keeping Unit - optional identifier for variant'")


def downgrade() -> None:
    op.alter_column('ProductVariant', 'sku', nullable=False)
