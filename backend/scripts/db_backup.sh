#!/usr/bin/env sh
set -eu

if [ -f .env ]; then
    set -a
    . ./.env
    set +a
fi

: "${DATABASE_URL:?DATABASE_URL must be set}"

BACKUP_DIR="${BACKUP_DIR:-./backups}"
mkdir -p "$BACKUP_DIR"
BACKUP_FILE="$BACKUP_DIR/cis-$(date -u +%Y%m%dT%H%M%SZ).dump"

# SQLAlchemy URLs use postgresql+psycopg; libpq clients use postgresql.
PG_DATABASE_URL=$(printf '%s' "$DATABASE_URL" | sed 's#^postgresql+psycopg://#postgresql://#')

pg_dump --format=custom --no-owner --no-acl "$PG_DATABASE_URL" > "$BACKUP_FILE"
chmod 600 "$BACKUP_FILE"

printf '%s\n' "$BACKUP_FILE"
