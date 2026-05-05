"""Setup pgvector extension and recommendation tables

Revision ID: 001_setup_pgvector
Revises: 
Create Date: 2024-01-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from pgvector.sqlalchemy import Vector

revision = '001_setup_pgvector'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Enable pgvector extension
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    
    # Create user_events table
    op.create_table(
        'user_events',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('user_id', sa.String(), nullable=False),
        sa.Column('product_id', sa.String(), nullable=False),
        sa.Column('action', sa.String(), nullable=False),
        sa.Column('timestamp', sa.TIMESTAMP(), nullable=False, server_default=sa.text('NOW()')),
        sa.ForeignKeyConstraint(['product_id'], ['"Product".id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes
    op.create_index('idx_user_events_user_id', 'user_events', ['user_id'])
    op.create_index('idx_user_events_product_id', 'user_events', ['product_id'])
    op.create_index('idx_user_events_timestamp', 'user_events', ['timestamp'])
    op.create_index('idx_user_events_user_product', 'user_events', ['user_id', 'product_id'])
    op.create_index('idx_user_events_user_action_time', 'user_events', ['user_id', 'action', 'timestamp'])
    
    # Create user_profiles table
    op.create_table(
        'user_profiles',
        sa.Column('user_id', sa.String(), nullable=False),
        sa.Column('embedding', Vector(384), nullable=False),
        sa.Column('total_interactions', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('last_updated', sa.TIMESTAMP(), nullable=False, server_default=sa.text('NOW()')),
        sa.PrimaryKeyConstraint('user_id')
    )
    
    # Create product_embeddings table
    op.create_table(
        'product_embeddings',
        sa.Column('product_id', sa.String(), nullable=False),
        sa.Column('embedding', Vector(384), nullable=False),
        sa.Column('text_content', sa.Text()),
        sa.Column('last_updated', sa.TIMESTAMP(), nullable=False, server_default=sa.text('NOW()')),
        sa.ForeignKeyConstraint(['product_id'], ['"Product".id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('product_id')
    )


def downgrade() -> None:
    op.drop_table('product_embeddings')
    op.drop_table('user_profiles')
    op.drop_table('user_events')
    op.execute("DROP EXTENSION IF EXISTS vector")
