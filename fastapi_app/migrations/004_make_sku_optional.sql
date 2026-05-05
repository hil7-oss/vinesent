-- Make SKU field optional in ProductVariant table
ALTER TABLE "ProductVariant" ALTER COLUMN "sku" DROP NOT NULL;

-- Add comment
COMMENT ON COLUMN "ProductVariant"."sku" IS 'Stock Keeping Unit - optional identifier for variant';
