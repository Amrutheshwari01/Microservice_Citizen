# ── AgriLink CIS – Production Dockerfile ─────────────────────────────────────
# Multi-stage build: lean final image, no dev dependencies or secrets baked in.

# Stage 1 – dependency builder
FROM python:3.11-slim AS builder

WORKDIR /build

# Install build tools needed for psycopg binary wheels
RUN apt-get update && apt-get install -y --no-install-recommends \
        gcc libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --upgrade pip \
 && pip install --prefix=/install --no-cache-dir -r requirements.txt

# Stage 2 – lean runtime image
FROM python:3.11-slim AS runtime

WORKDIR /app

# Runtime system deps only
RUN apt-get update && apt-get install -y --no-install-recommends \
        libpq5 curl \
    && rm -rf /var/lib/apt/lists/*

# Copy installed packages from builder stage
COPY --from=builder /install /usr/local

# Copy application source
COPY app/ ./app/

# Health-check: call the /health endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Expose port
EXPOSE 8000

# Uvicorn – 2 workers suitable for a single vCPU container.
# For multi-core ECS tasks, increase --workers to (2 × vCPUs) + 1.
CMD ["python", "-m", "uvicorn", "app.main:app", \
     "--host", "0.0.0.0", \
     "--port", "8000", \
     "--workers", "2", \
     "--loop", "uvloop", \
     "--access-log"]
