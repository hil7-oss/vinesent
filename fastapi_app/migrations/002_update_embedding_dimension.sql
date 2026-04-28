-- Update embedding dimension from 384 to 768 (Gemini text-embedding-004)
-- This migration updates vector dimensions for Gemini API embeddings

-- Drop old indexes (they depend on the vector column)
DROP INDEX IF EXISTS idx_user_profile_embedding;
DROP INDEX IF EXISTS idx_product_embedding;

-- Update user_profiles embedding dimension
ALTER TABLE user_profiles 
ALTER COLUMN embedding TYPE vector(768);

-- Update product_embeddings embedding dimension
ALTER TABLE product_embeddings 
ALTER COLUMN embedding TYPE vector(768);

-- Recreate vector indexes with new dimension
CREATE INDEX idx_user_profile_embedding 
ON user_profiles USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

CREATE INDEX idx_product_embedding 
ON product_embeddings USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Clear existing embeddings (they need to be regenerated with new model)
TRUNCATE TABLE user_profiles;
TRUNCATE TABLE product_embeddings;

-- Analyze tables
ANALYZE user_profiles;
ANALYZE product_embeddings;
