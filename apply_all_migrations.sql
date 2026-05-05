-- ============================================================
-- Apply all variant-related migrations
-- ============================================================

-- Migration 003: Add measurements field to Product table
-- ============================================================
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Product' AND column_name = 'measurements'
    ) THEN
        ALTER TABLE "Product" ADD COLUMN "measurements" JSONB;
        RAISE NOTICE '✓ Added measurements field to Product table';
    ELSE
        RAISE NOTICE '⚠ measurements field already exists in Product table';
    END IF;
END $$;

COMMENT ON COLUMN "Product"."measurements" IS 'Product measurements data (size chart, dimensions, etc.)';

-- Migration 004: Make SKU field optional in ProductVariant table
-- ============================================================
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ProductVariant' 
        AND column_name = 'sku' 
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE "ProductVariant" ALTER COLUMN "sku" DROP NOT NULL;
        RAISE NOTICE '✓ Made sku field optional in ProductVariant table';
    ELSE
        RAISE NOTICE '⚠ sku field is already optional in ProductVariant table';
    END IF;
END $$;

COMMENT ON COLUMN "ProductVariant"."sku" IS 'Stock Keeping Unit - optional identifier for variant';

-- Verification
-- ============================================================
SELECT 
    '✓ Verification Results:' as status,
    (SELECT data_type FROM information_schema.columns WHERE table_name = 'Product' AND column_name = 'measurements') as measurements_type,
    (SELECT is_nullable FROM information_schema.columns WHERE table_name = 'ProductVariant' AND column_name = 'sku') as sku_nullable;

\echo ''
\echo '=================================================='
\echo '✓ All migrations applied successfully!'
\echo '=================================================='
\echo ''
\echo 'Next steps:'
\echo '1. Restart backend: docker-compose restart backend'
\echo '2. Test in admin panel'
