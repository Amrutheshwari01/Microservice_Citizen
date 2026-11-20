#!/usr/bin/env sh
set -eu

if [ -z "${DATABASE_URL:-}" ] && [ -f .env ]; then
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

CA_CERT=""
case "$PG_DATABASE_URL" in
    *sslrootcert=/app/global-bundle.pem*)
        if [ -f /app/global-bundle.pem ]; then
            CA_CERT="/app/global-bundle.pem"
        else
            CA_DIR="$(mktemp -d "${TMPDIR:-/tmp}/cis-rds-ca.XXXXXX")"
            CA_CERT="$CA_DIR/global-bundle.pem"
            trap 'rm -f "$CA_CERT"; rmdir "$CA_DIR"' 0
            docker cp agrilink-cis-api:/app/global-bundle.pem "$CA_CERT"
            chmod 600 "$CA_CERT"
        fi
        PG_DATABASE_URL=$(printf '%s' "$PG_DATABASE_URL" | sed 's|sslrootcert=/app/global-bundle.pem|sslrootcert=/rds/global-bundle.pem|g')
        ;;
esac

if [ -n "$CA_CERT" ]; then
    docker run --rm --network host \
        --env "PG_DATABASE_URL=$PG_DATABASE_URL" \
        --volume "$CA_CERT:/rds/global-bundle.pem:ro" \
        postgres:18-alpine \
        sh -c 'pg_dump --format=custom --no-owner --no-acl "$PG_DATABASE_URL"' > "$BACKUP_FILE"
else
    docker run --rm --network host \
        --env "PG_DATABASE_URL=$PG_DATABASE_URL" \
        postgres:18-alpine \
        pg_dump --format=custom --no-owner --no-acl "$PG_DATABASE_URL" > "$BACKUP_FILE"
fi
chmod 600 "$BACKUP_FILE"

printf '%s\n' "$BACKUP_FILE"
