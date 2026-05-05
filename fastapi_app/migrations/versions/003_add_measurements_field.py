"""Add measurements field to Product table

Revision ID: 003_add_measurements_field
Revises: 002_update_embedding_dimension
Create Date: 2024-01-03 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = '003_add_measurements_field'
down_revision = '002_update_embedding_dimension'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('Product', sa.Column('measurements', sa.JSON(), nullable=True))
    op.execute("COMMENT ON COLUMN \"Product\".\"measurements\" IS 'Product measurements data (size chart, dimensions, etc.)'")


def downgrade() -> None:
    op.drop_column('Product', 'measurements')
