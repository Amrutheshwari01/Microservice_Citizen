#!/usr/bin/env sh
set -eu

if [ -z "${1:-}" ]; then
    echo "Usage: db_restore.sh <backup.dump>" >&2
    exit 2
fi

if [ -f .env ]; then
    set -a
    . ./.env
    set +a
fi

: "${DATABASE_URL:?DATABASE_URL must be set}"
BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "Backup file not found: $BACKUP_FILE" >&2
    exit 2
fi

echo "This replaces database objects available in $BACKUP_FILE." >&2
echo "A database administrator must run this explicitly; it is not invoked during deployment." >&2
PG_DATABASE_URL=$(printf '%s' "$DATABASE_URL" | sed 's#^postgresql+psycopg://#postgresql://#')
pg_restore --clean --if-exists --no-owner --no-acl --dbname="$PG_DATABASE_URL" "$BACKUP_FILE"
