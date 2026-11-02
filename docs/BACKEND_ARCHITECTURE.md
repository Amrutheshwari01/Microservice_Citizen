# AgriLink CIS — Backend Architecture

**Microservice**: Citizen Identity & Wallet Service (CIS)  
**Framework**: FastAPI (Python 3.11)  
**ORM / Driver**: SQLAlchemy 2.x / Psycopg 3 (native async/sync binary driver)  
**Database**: Supabase PostgreSQL (AWS eu-west-1 pooler on port 5432)  
**Object Storage**: Supabase Storage (`kyc-documents`, `avatars`)  
**Containerization**: Docker multi-stage build & Docker Compose  
**CI/CD**: GitHub Actions

---

## 1. Clean Layered Architecture

```
HTTP Request (Client / Microservice)
       │
       ▼
┌──────────────────────────────────────┐
│            API Router Layer          │  app/api/v1/*.py
│  - Endpoint definitions & HTTP status│
│  - Dependency injection (Auth/DB)    │
└──────────────────┬───────────────────┘
                   │
                   ▼
┌──────────────────────────────────────┐
│             Schema Layer             │  app/schemas/*.py
│  - Pydantic v2 data validation       │
│  - Strict typing, normalization      │
└──────────────────┬───────────────────┘
                   │
                   ▼
┌──────────────────────────────────────┐
│            Service Layer             │  app/services/*.py
│  - Business logic, transactions      │
│  - Lock acquisition, cryptography    │
└──────────────────┬───────────────────┘
                   │
                   ▼
┌──────────────────────────────────────┐
│           Repository Layer           │  app/repositories/*.py
│  - Pure database queries (SQLAlchemy)│
│  - Isolation, SELECT FOR UPDATE      │
└──────────────────┬───────────────────┘
                   │
                   ▼
┌──────────────────────────────────────┐
│           SQLAlchemy Models          │  app/models/*.py
│  - Declarative table mappings        │
└──────────────────┬───────────────────┘
                   │
                   ▼
┌──────────────────────────────────────┐
│         Supabase PostgreSQL          │
└──────────────────────────────────────┘
```

---

## 2. Directory Layout

```
citizen-backend/
├── app/
│   ├── main.py                  # FastAPI application factory, CORS, exception handlers
│   ├── core/
│   │   ├── config.py            # Pydantic Settings (.env management)
│   │   ├── security.py          # Argon2/Bcrypt, JWT, OTP generation & hashing
│   │   ├── exceptions.py        # Domain exception taxonomy (4xx, 5xx)
│   │   └── logging_config.py    # Structured logging
│   ├── db/
│   │   ├── base.py              # SQLAlchemy 2.x DeclarativeBase
│   │   ├── database.py          # Engine with prepare_threshold=None, sessionmaker
│   │   └── dependencies.py      # FastAPI get_db dependency
│   ├── models/
│   │   ├── citizen.py           # Citizen, Profile, Credentials, Sessions, Consents, Audit
│   │   ├── persona.py           # Persona, PersonaApproval
│   │   ├── kyc.py               # KycRecord, KycDocument
│   │   └── wallet.py            # Wallet, Transaction, Ledger, Hold, Limits, Idempotency
│   ├── schemas/
│   │   ├── auth.py              # Register, Login, OTP, Token schemas
│   │   ├── citizen.py           # Profile update, view, history schemas
│   │   ├── persona.py           # Application, approval schemas (alias mapping)
│   │   ├── kyc.py               # Upload, review, status schemas
│   │   ├── wallet.py            # Summary, transfer, topup, hold schemas
│   │   ├── consent.py           # Legal consent schemas
│   │   ├── session.py           # Session management schemas
│   │   └── admin.py             # Admin review, audit, limit schemas
│   ├── repositories/
│   │   ├── citizen_repo.py      # Citizen & session queries
│   │   ├── profile_repo.py      # Profile & history queries
│   │   ├── persona_repo.py      # Persona & approval queries
│   │   ├── kyc_repo.py          # KYC records & documents queries
│   │   ├── wallet_repo.py       # Atomic wallet ledger & idempotency queries
│   │   ├── consent_repo.py      # Consent queries
│   │   ├── session_repo.py      # Session management queries
│   │   └── admin_repo.py        # Admin aggregate queries
│   ├── services/
│   │   ├── auth_service.py      # Registration, OTP, login, lockouts
│   │   └── citizen_service.py   # Profile, Persona, KYC, and Wallet services
│   └── api/
│       └── v1/
│           ├── auth.py          # /api/v1/auth/*
│           ├── citizens.py      # /api/v1/citizens/*
│           ├── personas.py      # /api/v1/personas/*
│           ├── kyc.py           # /api/v1/kyc/*
│           ├── wallets.py       # /api/v1/wallets/*
│           ├── internal.py      # /api/v1/internal/* (Inter-microservice)
│           ├── consents.py      # /api/v1/consents/*
│           ├── sessions.py      # /api/v1/sessions/*
│           ├── admin.py         # /api/v1/admin/*
│           └── dependencies.py  # Auth & security dependencies
├── tests/
│   ├── test_health.py           # Liveness & DB connectivity tests
│   ├── test_auth.py             # Full auth lifecycle (register, login, refresh, logout)
│   ├── test_phase2_to_8.py      # Profile, Personas, Wallet, and Internal API tests
│   └── test_consents_sessions_admin.py # Consents, Sessions, Admin, KYC & Avatar tests
├── docs/                        # Complete technical specifications & guides
├── Dockerfile                   # Multi-stage production container
├── docker-compose.yml           # Local & test runner compose
├── requirements.txt             # Locked Python dependencies
├── .env.example                 # Sanitized configuration template
└── README.md                    # Service setup & running guide
```

---

## 3. Database Connection & Pooling

- **Supabase Pooler Compatibility**: Configured with `connect_args={"prepare_threshold": None}` to ensure full compatibility with transaction/session mode PgBouncer poolers.
- **Connection Pool Tuning**:
  - `DB_POOL_SIZE`: 10
  - `DB_MAX_OVERFLOW`: 20
  - `DB_POOL_TIMEOUT`: 30s
  - `DB_POOL_RECYCLE`: 1800s (avoids stale connections)
- **Automatic Rollback**: Custom FastAPI exception middleware and session context managers ensure every failed request rolls back uncommitted transactions immediately.
