# AgriLink CIS — Implementation Checklist

Legend: `[x]` Done & Tested · `[~]` Blocked on DB Schema Decision · `[ ]` Pending

---

## Phase 1 — Inspection
- [x] Inspect backend repository and dependencies
- [x] Inspect frontend React.js repository (`D:\Microservice_Citizen`)
- [x] Inspect live Supabase PostgreSQL schema (`schema_inventory.json`)
- [x] Write field mapping, gaps, and data taxonomy analysis (`PHASE1_INSPECTION.md`)

---

## Phase 2 — Backend Foundation
- [x] Modular FastAPI folder structure (`app/core`, `db`, `models`, `schemas`, `repositories`, `services`, `api`)
- [x] `requirements.txt` + sanitized `.env.example`
- [x] Pydantic Settings configuration (`app/core/config.py`)
- [x] SQLAlchemy 2.x session engine with Supabase Pooler optimization (`prepare_threshold=None`)
- [x] Exception hierarchy with standardized JSON response envelopes & correlation IDs
- [x] CORS middleware for React frontend (`localhost:5173`, `localhost:3000`)
- [x] Structured JSON logging (`app/core/logging_config.py`)
- [x] Declarative SQLAlchemy 2.x models mapped to existing Supabase tables (zero destructive DDL)
- [x] Health check endpoints (`/health` and `/health/db`)

---

## Phase 3 — Authentication & Identity
- [x] Citizen registration (atomic creation of Citizen, Profile, Credentials, Customer Persona, Wallet, T0 KYC, Consents)
- [x] Argon2 / bcrypt password hashing with cryptographic salt
- [x] Multi-identifier login (Email / Mobile / UUID)
- [x] JWT Access Tokens & cryptographically hashed Refresh Tokens
- [x] Logout & token revocation (JTI blacklist in `token_revocations`)
- [x] OTP challenge generation, rate limiting, and SHA-256 verification
- [x] Password reset via OTP verification
- [x] Account lockout enforcement via `credentials.failed_login_count` and `locked_until`
- [x] Active session tracking (`citizen_sessions`) with remote revocation (`/sessions/revoke-others`)

---

## Phase 4 — Profile & Addresses
- [x] GET `/citizens/me` (returns profile, active personas, KYC tier, wallet summary)
- [x] PATCH `/citizens/me` (partial updates)
- [x] Profile change auditing in `profile_change_history`
- [x] Profile photo / avatar upload (`/citizens/me/avatar`) with Supabase Storage integration
- [x] Consent tracking and self-service toggling (`/consents` and `/consents/{id}`)

---

## Phase 5 — Personas & Roles
- [x] List personas (`GET /personas`) with UI alias normalization (`BUYER` ↔ `CUSTOMER`, `DELIVERY_PERSON` ↔ `DELIVERY_PARTNER`)
- [x] Apply for persona (`POST /personas`) with auto-activation for CUSTOMER and PENDING for restricted personas
- [x] Set default persona (`POST /personas/{id}/activate`)
- [x] Admin approval/rejection endpoints (`POST /admin/persona-applications/{id}/decide`)

---

## Phase 6 — KYC & Document Verification
- [x] KYC tier status query (`GET /kyc/me`)
- [x] Secure document upload (`POST /kyc/documents`) with MIME check, file size limit (5MB), and one-way tokenized document numbers
- [x] Supabase Storage private bucket integration (`kyc-documents`)
- [x] Time-limited signed URL generation (`GET /kyc/documents/{id}/signed-url`)
- [x] Admin KYC verification and tier upgrade endpoint (`POST /admin/kyc/{id}/review`)

---

## Phase 7 — Bank Details
- [~] Blocked pending Himanshu's schema decision: `bank_accounts.user_id` points to `users.user_id` instead of `citizens.id`. A migration to add `citizen_id` or a dedicated `citizen_bank_accounts` table is documented.

---

## Phase 8 — Wallet & Double-Entry Ledger
- [x] Wallet summary with dynamic held balance computation (`wallets` available_balance + `wallet_holds` sum)
- [x] Atomic transfers with deadlock prevention (sorted UUID locking) and row-level locks (`SELECT ... FOR UPDATE`)
- [x] Double-entry accounting ledger (`ledger_entries` DEBIT + CREDIT)
- [x] Topup and Cashout endpoints with balance tracking
- [x] Escrow holds and releases (`wallet_holds`)
- [x] Strict idempotency key verification preventing duplicate charges
- [x] Transaction limits enforcement (`wallet_limits`)

---

## Phase 9 — Frontend Integration
- [x] OpenAPI documentation auto-generated at `/docs` and `/redoc`
- [x] Full response envelope compatibility with Amrutheshwari's React UI (`success`, `data`, `message`)
- [x] CORS headers enabled for Vite dev server (`http://localhost:5173`)

---

## Phase 10 — Inter-Service Communication (AgriLink & RTO)
- [x] Shared service authentication via `X-Service-Key` header
- [x] Token introspection (`POST /internal/tokens/introspect`)
- [x] Citizen status & eligibility checks (`GET /internal/citizens/{id}/status`, `/personas`, `/eligible/{persona}`)
- [x] Escrow hold placement & release (`POST /internal/wallets/{id}/hold`, `/release`)
- [x] Settlement credit and platform fee debit (`POST /internal/wallets/{id}/credit`, `/debit`)

---

## Phase 11 — Administrative & Audit APIs
- [x] Pending persona applications queue (`GET /admin/persona-applications`)
- [x] Persona review decision (`POST /admin/persona-applications/{id}/decide`)
- [x] KYC verification & tier assignment (`POST /admin/kyc/{id}/review`)
- [x] Paginated audit trail query (`GET /admin/audit`)
- [x] Wallet limits inspection (`GET /admin/limits`)

---

## Phase 12 — Automated Testing
- [x] Health checks test suite (`tests/test_health.py`)
- [x] Complete auth lifecycle test (`tests/test_auth.py`)
- [x] Profiles, Personas, Wallet concurrency & Internal APIs test suite (`tests/test_phase2_to_8.py`)
- [x] Consents, Sessions, Admin, KYC uploads & Avatar test suite (`tests/test_consents_sessions_admin.py`)
- [x] 100% of tests passing against live Supabase PostgreSQL database

---

## Phase 13 — DevOps & Deployment
- [x] Multi-stage production `Dockerfile`
- [x] `docker-compose.yml` for local execution
- [x] GitHub Actions CI workflow (`.github/workflows/ci.yml`)

---

## Phase 14 — Documentation
- [x] Comprehensive `README.md`
- [x] Architecture design documentation (`docs/BACKEND_ARCHITECTURE.md`)
- [x] Inter-service API specification (`docs/INTER_SERVICE_API.md`)
- [x] Double-entry ledger accounting documentation (`docs/WALLET_LEDGER.md`)
