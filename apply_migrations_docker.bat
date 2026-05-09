@echo off
REM Apply database migrations through Docker (Windows)

echo ==================================================
echo Applying database migrations
echo ==================================================

REM Check if Docker is running
docker ps >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker is not running. Please start Docker first.
    exit /b 1
)

REM Find backend container
for /f "tokens=*" %%i in ('docker-compose ps -q backend 2^>nul') do set BACKEND_CONTAINER=%%i
if "%BACKEND_CONTAINER%"=="" (
    echo ❌ Backend container not found. Please start services first:
    echo    docker-compose up -d
    exit /b 1
)

echo.
echo → Applying migration: 003_add_measurements_field.sql
docker-compose exec -T backend psql %DATABASE_URL% < fastapi_app\migrations\003_add_measurements_field.sql
if %errorlevel% equ 0 (
    echo ✓ Migration 003 applied successfully
) else (
    echo ⚠ Migration 003 may have already been applied or failed
)

echo.
echo → Applying migration: 004_make_sku_optional.sql
docker-compose exec -T backend psql %DATABASE_URL% < fastapi_app\migrations\004_make_sku_optional.sql
if %errorlevel% equ 0 (
    echo ✓ Migration 004 applied successfully
) else (
    echo ⚠ Migration 004 may have already been applied or failed
)

echo.
echo ==================================================
echo ✓ Migrations completed!
echo ==================================================
echo.
echo Next steps:
echo 1. Restart backend: docker-compose restart backend
echo 2. Test in admin panel: http://localhost:3000/admin/products

pause
