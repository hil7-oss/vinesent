-- Add measurements field to Product table
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "measurements" JSONB;

-- Add comment
COMMENT ON COLUMN "Product"."measurements" IS 'Product measurements data (size chart, dimensions, etc.)';
