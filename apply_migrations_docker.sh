#!/bin/bash
# Apply database migrations through Docker

echo "=================================================="
echo "Applying database migrations..."
echo "=================================================="

# Check if Docker is running
if ! docker ps > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Get the backend container name
BACKEND_CONTAINER=$(docker-compose ps -q backend 2>/dev/null || docker-compose ps -q fastapi 2>/dev/null)

if [ -z "$BACKEND_CONTAINER" ]; then
    echo "❌ Backend container not found. Please start services first:"
    echo "   docker-compose up -d"
    exit 1
fi

echo ""
echo "→ Applying migration: 003_add_measurements_field.sql"
docker-compose exec -T backend psql $DATABASE_URL < fastapi_app/migrations/003_add_measurements_field.sql 2>&1 | grep -v "^$"

if [ $? -eq 0 ]; then
    echo "✓ Migration 003 applied successfully"
else
    echo "⚠ Migration 003 may have already been applied or failed"
fi

echo ""
echo "→ Applying migration: 004_make_sku_optional.sql"
docker-compose exec -T backend psql $DATABASE_URL < fastapi_app/migrations/004_make_sku_optional.sql 2>&1 | grep -v "^$"

if [ $? -eq 0 ]; then
    echo "✓ Migration 004 applied successfully"
else
    echo "⚠ Migration 004 may have already been applied or failed"
fi

echo ""
echo "=================================================="
echo "✓ Migrations completed!"
echo "=================================================="
echo ""
echo "Next steps:"
echo "1. Restart backend: docker-compose restart backend"
echo "2. Test in admin panel: http://localhost:3000/admin/products"
