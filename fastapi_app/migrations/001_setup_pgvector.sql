-- Setup pgvector extension and recommendation tables
-- Run this migration on PostgreSQL database

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create user_events table
CREATE TABLE IF NOT EXISTS user_events (
    id VARCHAR PRIMARY KEY,
    user_id VARCHAR NOT NULL,
    product_id VARCHAR NOT NULL,
    action VARCHAR NOT NULL,
    timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
    FOREIGN KEY (product_id) REFERENCES "Product"(id) ON DELETE CASCADE
);

-- Create indexes for user_events
CREATE INDEX IF NOT EXISTS idx_user_events_user_id ON user_events(user_id);
CREATE INDEX IF NOT EXISTS idx_user_events_product_id ON user_events(product_id);
CREATE INDEX IF NOT EXISTS idx_user_events_timestamp ON user_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_user_events_user_product ON user_events(user_id, product_id);
CREATE INDEX IF NOT EXISTS idx_user_events_user_action_time ON user_events(user_id, action, timestamp);

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
    user_id VARCHAR PRIMARY KEY,
    embedding vector(384) NOT NULL,
    total_interactions INTEGER DEFAULT 0,
    last_updated TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create vector index for user_profiles (IVFFlat for fast approximate search)
CREATE INDEX IF NOT EXISTS idx_user_profile_embedding 
ON user_profiles USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Create product_embeddings table
CREATE TABLE IF NOT EXISTS product_embeddings (
    product_id VARCHAR PRIMARY KEY,
    embedding vector(384) NOT NULL,
    text_content TEXT,
    last_updated TIMESTAMP NOT NULL DEFAULT NOW(),
    FOREIGN KEY (product_id) REFERENCES "Product"(id) ON DELETE CASCADE
);

-- Create vector index for product_embeddings (IVFFlat for fast approximate search)
CREATE INDEX IF NOT EXISTS idx_product_embedding 
ON product_embeddings USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Create index on last_updated for cache invalidation
CREATE INDEX IF NOT EXISTS idx_product_embeddings_updated ON product_embeddings(last_updated);

-- Grant permissions (adjust as needed)
-- GRANT ALL ON user_events TO your_app_user;
-- GRANT ALL ON user_profiles TO your_app_user;
-- GRANT ALL ON product_embeddings TO your_app_user;

-- Analyze tables for query optimization
ANALYZE user_events;
ANALYZE user_profiles;
ANALYZE product_embeddings;
