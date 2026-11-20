#!/usr/bin/env sh
set -eu

cd "$(dirname "$0")/.."

SHA="${1:-$(git -C .. rev-parse HEAD)}"
IMAGE="agrilink-cis:${SHA}"
FRONTEND_IMAGE="agrilink-cis-frontend:${SHA}"

echo "Backing up database before deployment..."
BACKUP_FILE="$(sh ./scripts/db_backup.sh)"
echo "Backup created: $BACKUP_FILE"

echo "Building application image ${IMAGE}..."
docker build -t "$IMAGE" -t agrilink-cis:latest .

echo "Applying database migrations..."
docker run --rm --env-file .env -v "$(pwd)/backups:/app/backups" "$IMAGE" \
    python -m alembic upgrade head

echo "Starting application..."
CIS_IMAGE="$IMAGE" docker compose up -d --no-build cis-api

echo "Waiting for application health..."
i=0
while [ "$i" -lt 30 ]; do
    if curl --fail --silent --show-error http://localhost:8000/health >/dev/null; then
        break
    fi
    i=$((i + 1))
    sleep 2
done

if [ "$i" -eq 30 ]; then
    echo "API health check failed; rolling back application container." >&2
    CIS_IMAGE="${ROLLBACK_IMAGE:-agrilink-cis:previous}" docker compose up -d --no-build cis-api
    exit 1
fi

echo "Building frontend image ${FRONTEND_IMAGE}..."
CIS_FRONTEND_IMAGE="$FRONTEND_IMAGE" docker compose build cis-frontend

echo "Starting frontend..."
CIS_FRONTEND_IMAGE="$FRONTEND_IMAGE" docker compose up -d --no-build cis-frontend

echo "Waiting for frontend health..."
i=0
while [ "$i" -lt 30 ]; do
    if curl --fail --silent --show-error http://localhost/health >/dev/null; then
        docker compose ps cis-api cis-frontend
        echo "DEPLOYMENT SUCCESSFUL"
        exit 0
    fi
    i=$((i + 1))
    sleep 2
done

echo "Frontend health check failed; rolling back frontend container." >&2
if [ -n "${ROLLBACK_FRONTEND_IMAGE:-}" ] && docker image inspect "$ROLLBACK_FRONTEND_IMAGE" >/dev/null 2>&1; then
    CIS_FRONTEND_IMAGE="$ROLLBACK_FRONTEND_IMAGE" docker compose up -d --no-build cis-frontend
else
    docker compose stop cis-frontend
fi
exit 1
