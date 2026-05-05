"""Update embedding dimension from 384 to 768 (Gemini text-embedding-004)

Revision ID: 002_update_embedding_dimension
Revises: 001_setup_pgvector
Create Date: 2024-01-02 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from pgvector.sqlalchemy import Vector

revision = '002_update_embedding_dimension'
down_revision = '001_setup_pgvector'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Drop old indexes
    op.execute("DROP INDEX IF EXISTS idx_user_profile_embedding")
    op.execute("DROP INDEX IF EXISTS idx_product_embedding")
    
    # Update user_profiles embedding dimension
    op.execute("ALTER TABLE user_profiles ALTER COLUMN embedding TYPE vector(768)")
    
    # Update product_embeddings embedding dimension
    op.execute("ALTER TABLE product_embeddings ALTER COLUMN embedding TYPE vector(768)")
    
    # Recreate vector indexes
    op.execute("CREATE INDEX idx_user_profile_embedding ON user_profiles USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)")
    op.execute("CREATE INDEX idx_product_embedding ON product_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)")
    
    # Clear existing embeddings
    op.execute("TRUNCATE TABLE user_profiles")
    op.execute("TRUNCATE TABLE product_embeddings")


def downgrade() -> None:
    # Drop new indexes
    op.execute("DROP INDEX IF EXISTS idx_user_profile_embedding")
    op.execute("DROP INDEX IF EXISTS idx_product_embedding")
    
    # Revert to 384 dimensions
    op.execute("ALTER TABLE user_profiles ALTER COLUMN embedding TYPE vector(384)")
    op.execute("ALTER TABLE product_embeddings ALTER COLUMN embedding TYPE vector(384)")
    
    # Recreate old indexes
    op.execute("CREATE INDEX idx_user_profile_embedding ON user_profiles USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)")
    op.execute("CREATE INDEX idx_product_embedding ON product_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)")
