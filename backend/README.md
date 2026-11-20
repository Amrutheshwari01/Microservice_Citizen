# AgriLink — Citizen Identity & Wallet Microservice (CIS)

**Python 3.11 · FastAPI · SQLAlchemy 2.x · Supabase PostgreSQL**

---

## Quick Start (Local Development)

```powershell
# 1. Clone repository
git clone <your-repo-url> citizen-backend
cd citizen-backend

# 2. Create & activate virtual environment
python -m venv .venv311
.\.venv311\Scripts\Activate.ps1

# 3. Install dependencies
pip install -r requirements.txt
pip install email-validator

# 4. Configure environment
Copy-Item .env.example .env
# Edit .env and fill in DATABASE_URL, JWT_SECRET_KEY, INTERNAL_SERVICE_SECRET

# 5. Run development server (with hot-reload)
.\.venv311\Scripts\uvicorn.exe app.main:app --reload --port 8000

# 6. Open API docs
# http://localhost:8000/docs
```

### Docker Development Database

The PostgreSQL 16 development database is isolated from the application container
and persists data in the `cis_dev_data` named volume:

```powershell
cd backend
docker compose --profile dev up -d cis-dev-db
docker compose exec cis-dev-db pg_isready -U cis_dev -d cis_dev

# Run migrations from the host
.\.venv311\Scripts\python.exe -m alembic upgrade head
.\.venv311\Scripts\python.exe -m alembic current

# Restart without losing records
docker compose restart cis-dev-db
```

The database is published only on `127.0.0.1:5433`. Configure
`CIS_DEV_DB_PASSWORD` and the host `DATABASE_URL` in `backend/.env`; never use
production RDS credentials for this database. The dev database is opt-in and
does not replace the production `DATABASE_URL`. To run the API container against
this database locally, add `-f docker-compose.dev.yml` and `--profile dev` to
the Docker Compose commands. Never use that development override on EC2.

---

## Project Structure

```
citizen-backend/
├── app/
│   ├── main.py                  # FastAPI app, middleware, exception handlers
│   ├── core/
│   │   ├── config.py            # Pydantic Settings from .env
│   │   ├── security.py          # JWT, password hash, OTP utilities
│   │   ├── exceptions.py        # Typed HTTP exceptions
│   │   └── logging_config.py    # Structured logging
│   ├── db/
│   │   ├── base.py              # SQLAlchemy DeclarativeBase
│   │   ├── database.py          # Engine, session factory, get_db_session
│   │   └── dependencies.py      # FastAPI get_db dependency
│   ├── models/                  # ORM models mapped to existing Supabase tables
│   │   ├── citizen.py           # Citizen, CitizenProfile, Credential, OTP, Session...
│   │   ├── persona.py           # Persona, PersonaApproval
│   │   ├── kyc.py               # KycRecord, KycDocument
│   │   └── wallet.py            # Wallet, WalletTransaction, LedgerEntry, Hold...
│   ├── schemas/                 # Pydantic request/response schemas
│   │   ├── auth.py
│   │   ├── citizen.py
│   │   ├── persona.py
│   │   ├── kyc.py
│   │   └── wallet.py
│   ├── repositories/            # DB query layer (no business logic)
│   │   ├── citizen_repo.py
│   │   ├── profile_repo.py
│   │   ├── persona_repo.py
│   │   ├── kyc_repo.py
│   │   └── wallet_repo.py       # Double-entry ledger, row-lock transfers
│   ├── services/                # Business logic
│   │   ├── auth_service.py      # Register, login, OTP, JWT, logout
│   │   └── citizen_service.py   # Profile, personas, KYC, wallet ops
│   └── api/v1/                  # HTTP route handlers
│       ├── auth.py
│       ├── citizens.py
│       ├── personas.py
│       ├── kyc.py
│       ├── wallets.py
│       └── internal.py          # Service-to-service APIs (X-Service-Key)
├── tests/
│   ├── test_health.py
│   ├── test_auth.py
│   └── test_phase2_to_8.py
├── .env.example
├── .gitignore
├── Dockerfile
├── docker-compose.yml
├── requirements.txt
└── README.md
```

---

## API Reference

Base URL: `http://localhost:8000/api/v1`

Interactive docs: `http://localhost:8000/docs`

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register new citizen (creates wallet + persona) |
| POST | `/auth/otp/request` | Send OTP to mobile or email |
| POST | `/auth/otp/verify` | Verify OTP code |
| POST | `/auth/login` | Login with identifier + password → JWT tokens |
| POST | `/auth/refresh` | Refresh access token |
| POST | `/auth/logout` | Revoke token & session |
| POST | `/auth/password/reset` | OTP-verified password reset |

### Citizen Profile
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/citizens/me` | Full profile with KYC tier, personas, wallet |
| PATCH | `/citizens/me` | Update name, address, language |
| GET | `/citizens/me/history` | Profile change audit log |

### Personas
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/personas` | List all citizen personas |
| POST | `/personas` | Apply for CUSTOMER/FARMER/AGGREGATOR/DELIVERY_PARTNER |
| POST | `/personas/{id}/activate` | Set persona as default |

### KYC & Documents
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/kyc/me` | Current KYC tier & status |
| POST | `/kyc/documents` | Upload AADHAAR/PAN/PASSPORT/etc (multipart) |
| GET | `/kyc/documents/{id}/signed-url` | Time-limited private doc URL |

### Wallet
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/wallets/me` | Balance, holds, spend summary |
| GET | `/wallets/me/transactions` | Paginated transaction history |
| POST | `/wallets/topup` | Credit wallet (UPI/NETBANKING) |
| POST | `/wallets/transfer` | Peer-to-peer atomic transfer |
| POST | `/wallets/cashout` | Initiate bank payout |
| GET | `/wallets/holds` | List escrow holds |
| POST | `/wallets/holds/{id}/release` | Release hold back to wallet |

### Internal (Microservice APIs — X-Service-Key required)
| Method | Endpoint | Caller |
|--------|----------|--------|
| GET | `/internal/citizens/{id}/status` | AgriLink, RTO |
| GET | `/internal/citizens/{id}/personas` | AgriLink, RTO |
| GET | `/internal/citizens/{id}/eligibility?persona=` | AgriLink, RTO |
| POST | `/internal/wallets/{id}/hold` | AgriLink (order escrow) |
| POST | `/internal/wallets/{id}/release?hold_id=` | AgriLink, RTO |
| POST | `/internal/wallets/{id}/credit` | AgriLink (settlement) |
| POST | `/internal/wallets/{id}/debit` | AgriLink (fees) |
| POST | `/internal/tokens/introspect` | All microservices |

---

## Running Tests

```powershell
# Run all tests (requires live Supabase DB)
.\.venv311\Scripts\python.exe -m pytest -v tests/

# Run a specific test file
.\.venv311\Scripts\python.exe -m pytest -v tests/test_auth.py

# Run with short tracebacks
.\.venv311\Scripts\python.exe -m pytest -v tests/ --tb=short
```

---

## Docker

```powershell
# Build & run
docker compose up --build

# Run in background
docker compose up -d

# View logs
docker compose logs -f cis-api

# Stop
docker compose down
```

## Database Migrations

The database schema is managed with Alembic. `create_all()` is only retained by
the initial migration to establish an existing database baseline; application
and CI startup must use migrations.

```powershell
# Preview SQL
python -m alembic upgrade head --sql

# Apply pending migrations
python -m alembic upgrade head

# Create a migration after changing an ORM model
python -m alembic revision --autogenerate -m "describe the change"
```

## Backup and Recovery

The production PostgreSQL database remains separate from the application
container. EC2 deployment requires `pg_dump` and `pg_restore` to be installed
on the EC2 host. Supabase or AWS RDS snapshots should also be enabled according
to the retention and compliance policy.

```bash
# Create an encrypted, permission-restricted PostgreSQL custom-format backup
sh ./scripts/db_backup.sh

# Restore only during an approved recovery event
sh ./scripts/db_restore.sh ./backups/cis-<timestamp>.dump
```

Deployment executes `db_backup.sh`, builds an immutable image tagged with the
Git SHA, applies migrations, and starts that image. If the application health
check fails, the deploy script attempts to start the previous Git SHA image.
Database migrations are not automatically downgraded; restore the database
backup and application image together when a migration is not reversible.

---

## Security Notes

- Passwords hashed with **Argon2** (bcrypt fallback).
- JWTs signed with `HS256`. Secret minimum 32 chars.
- OTPs are **SHA-256 hashed** before storage. Never logged or returned in production.
- Aadhaar / PAN numbers are **tokenized** (HMAC-SHA256). Plaintext never persisted.
- Customer-entered KYC details are stored in PostgreSQL; document numbers are shown only in masked form.
- KYC submissions do not accept or store document images or PDFs.
- Supabase Storage is used for profile avatars and legacy file-backed KYC records.
- All financial arithmetic uses Python `Decimal` / PostgreSQL `NUMERIC(19,4)`.
- Double-entry ledger with row-level locking (`SELECT ... FOR UPDATE`).
- Idempotency keys prevent duplicate wallet operations.
- Internal microservice endpoints require `X-Service-Key` header.

---

## Environment Variables

See `.env.example` for the full list. Key variables:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Supabase PostgreSQL connection string |
| `JWT_SECRET_KEY` | JWT signing secret (min 32 chars) |
| `INTERNAL_SERVICE_SECRET` | Pre-shared key for microservice-to-microservice auth |
| `SUPABASE_URL` / `SUPABASE_KEY` | For profile avatar and legacy KYC file storage |
| `CORS_ORIGINS` | JSON array of allowed frontend origins |

---

## Frontend Integration

The React frontend ([Amrutheshwari01/Microservice_Citizen](https://github.com/Amrutheshwari01/Microservice_Citizen)) currently uses mock data.

To integrate with this backend:
1. Add `axios` or use `fetch` in the React app.
2. Point base URL to `http://localhost:8000/api/v1`.
3. Set `vite.config.js` proxy: `proxy: { '/api': 'http://localhost:8000' }`.
4. Read `access_token` from login response and attach as `Authorization: Bearer <token>`.

Persona alias mapping (frontend → backend):
- `BUYER` → `CUSTOMER`
- `DELIVERY_PERSON` → `DELIVERY_PARTNER`
