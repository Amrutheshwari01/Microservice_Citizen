#!/usr/bin/env sh
set -eu

cd "$(dirname "$0")/.."

SHA="${1:-$(git -C .. rev-parse HEAD)}"
IMAGE="agrilink-cis:${SHA}"

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
        docker compose ps cis-api
        echo "DEPLOYMENT SUCCESSFUL"
        exit 0
    fi
    i=$((i + 1))
    sleep 2
done

echo "Deployment health check failed; rolling back application container." >&2
CIS_IMAGE="${ROLLBACK_IMAGE:-agrilink-cis:previous}" docker compose up -d --no-build cis-api
exit 1
