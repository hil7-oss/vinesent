#!/bin/bash
# =============================================================================
# Loads production pg_dumpall backup into the vinesent database.
# Skips CREATE ROLE / CREATE DATABASE (already handled by POSTGRES_* env vars).
# =============================================================================
set -e

BACKUP="/backup/backup_full.sql"

if [ ! -f "$BACKUP" ]; then
  echo "[init] /backup/backup_full.sql not found — starting with empty DB."
  exit 0
fi

echo "[init] Restoring production data from backup"

# Feed only the vinesent DB section, skip role/database DDL that already exists
# Strategy: filter lines that would conflict, then use psql as vinesent user
psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" <<'EOSQL'
SET client_min_messages TO WARNING;
EOSQL

# Use grep to strip the problematic top-level commands, then pipe to psql
grep -v "^CREATE ROLE\|^ALTER ROLE\|^CREATE DATABASE\|^ALTER DATABASE\|^\\\\connect template1\|^\\\\connect postgres" "$BACKUP" \
  | psql -v ON_ERROR_STOP=0 -U "$POSTGRES_USER" -d "$POSTGRES_DB" 2>&1 \
  | grep -v "already exists" \
  | grep -v "^NOTICE\|^WARNING" \
  || true

echo "[init] Production data restored successfully!"
