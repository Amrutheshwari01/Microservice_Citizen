# Phase 1 — Existing System Inspection

Status: **complete**. No tables were created, dropped, renamed, or altered.

Workspaces inspected:

- Backend: `D:\citizen-backend`
- Frontend clone: `D:\Microservice_Citizen` (GitHub `Amrutheshwari01/Microservice_Citizen`, branch `main`)
- Database: hosted Supabase PostgreSQL via `DATABASE_URL` in `.env` (credentials not recorded here)

---

## 1. Existing backend architecture

The backend is a **minimal FastAPI starter**, not a modular CIS service yet.

```
D:\citizen-backend\
  app\
    __init__.py          empty
    main.py              FastAPI app + GET /health
    db\
      database.py        SQLAlchemy engine from DATABASE_URL, SELECT 1 helper
  test_connection.py     prints connection success/failure
  .env                   DATABASE_URL only (gitignored)
  .gitignore             .venv, __pycache__, .env, .pytest_cache
  .venv311\              Python 3.11 virtualenv
```

Missing relative to the target architecture: `core`, `models`, `schemas`, `repositories`, `services`, `api/v1`, `integrations`, `utils`, `tests`, `alembic`, `requirements.txt`, Docker, CI, CORS, JWT, routers.

### Database connection (credentials removed)

`app/db/database.py` currently:

1. Loads `.env` with `python-dotenv`.
2. Reads `DATABASE_URL`.
3. Creates a SQLAlchemy engine with `pool_pre_ping=True`.
4. Exposes `test_connection()` running `SELECT 1`.

Verified live: `SELECT 1` succeeds.

Gaps to fix in Phase 2 (without changing the working connection string):

- No session factory / FastAPI `Depends` session.
- No pool size, timeout, or recycle settings.
- No rollback-on-error session lifecycle.
- No structured exception mapping.
- Engine URL is a Supabase **pooler** URL (`postgresql+psycopg://...@...pooler.supabase.com:5432/postgres`).

---

## 2. Frontend architecture

The React app is a **single-page prototype**. It does **not** call any backend.

Evidence:

- `package.json` has only `react`, `react-dom`, `lucide-react`, `canvas-confetti`. No `axios`, `fetch` wrapper, or API SDK.
- `vite.config.js` has no proxy to `localhost:8000`.
- All screens read/write React state seeded from `src/data/mockData.js`.
- `src/components/AdminConsole/ApiExplorer.jsx` **simulates** REST responses with `setTimeout`; it never performs HTTP.

There is no React Router. Navigation is tab state in `src/App.jsx`:

| Surface | Tabs |
|---|---|
| Citizen | dashboard, statements, holds, profile, personas, consent, security |
| Admin | admin-overview, admin-approvals, admin-disputes, admin-audit, admin-limits, admin-fees, admin-reconciliation, admin-rbac, admin-api |

Default: user is already logged in (`isLoggedIn` starts as `true`).

Persona names used by the UI:

- `FARMER`, `BUYER`, `AGGREGATOR`, `DELIVERY_PERSON`

Database persona names (do not invent aliases in SQL):

- `FARMER`, `CUSTOMER`, `AGGREGATOR`, `DELIVERY_PARTNER`

API layer must map `BUYER` ↔ `CUSTOMER` and `DELIVERY_PERSON` ↔ `DELIVERY_PARTNER`.

---

## 3. Frontend form inventory

### Auth (`AuthModal.jsx`) — CIS-M1

**Login (password):** identifier (Citizen ID / mobile / email), password, remember-device checkbox.

**Login (OTP):** mobile, 6-digit OTP.

**Login (federated):** DigiLocker, AgriStack, Google — UI only, no OAuth client.

**Register:** full legal name, 10-digit mobile, email (optional), nationality (`Indian` / `OCI`), preferred language (`en` / `hi` / `kn`), 4-digit mobile OTP.

Register does **not** collect: password, confirm password, date of birth, gender, profile photo, T&C checkbox, first/middle/last name.

**Recovery:** channel (`MOBILE` / `EMAIL`), target, OTP, new password. Client lockout after 3 failed OTPs.

### Profile & KYC (`ProfileKycView.jsx`)

**Edit profile:** `full_name`, `mobile`, `email`, `address` (single textarea), `nationality`, `language`.

**KYC upgrade:** document type (`AADHAAR` / `PAN` / `PASSPORT`), document number, optional file (click sets a fake filename; no real `input type=file`).

### Personas (`PersonaManagementView.jsx`)

Apply: `persona`, `fpo_name`, `license_ref`, `notes`. Instant self-assign in UI even for restricted roles except when marked pending.

### Wallet

**Transfer:** recipient citizen ID/mobile, amount, purpose_code, business_ref, idempotency_key, description.

**Top-up:** amount, channel (`UPI` / `NETBANKING`), UPI VPA.

**Cash-out:** verified bank account, amount, then 4-digit wallet PIN.

**PIN:** set/change 4-digit PIN; lock after 3 failures.

**MFA:** SMS OTP or authenticator for transfers ≥ `mfa_threshold_amount` (default 10000).

**Holds:** release, refund, dispute (`hold_id`, `business_ref`, disputed amount, reason).

### Consent

Toggle grant/withdraw per partner service (`AGL-M7`, `RTO-M4`, `APMC-M3`).

### Security

Revoke session, revoke all other devices, MFA method, MFA threshold.

### Admin

Persona approve/reject, dispute resolve, limit rule edit, fee rule create, reconciliation exception clear, RBAC display, API explorer simulation.

---

## 4. Database inventory (`public` schema)

Himanshu’s schema is already substantial. **CIS must map to these tables. Do not create duplicates.**

Two parallel identity models exist in the same database:

### A. Citizen Identity & Wallet (use these for CIS APIs)

| Table | Role |
|---|---|
| `citizens` | Core identity. PK `id` UUID. Unique `email_normalized`, unique `mobile_e164`. Status: PENDING, ACTIVE, LOCKED, SUSPENDED, CLOSED |
| `citizen_profiles` | 1:1 profile. DOB, nationality_code CHAR(2), address lines, city, state_region, postal_code, country_code, preferred_language, profile_photo_ref |
| `credentials` | 1:1 password_hash, failed_login_count, locked_until |
| `otp_challenges` | Hashed OTP. Purpose: REGISTER, LOGIN, RECOVERY, CONTACT_VERIFY |
| `contact_verifications` | EMAIL / SMS destination_hash |
| `citizen_sessions` | refresh_token_hash, device, IP, expiry, revoked_at |
| `token_revocations` | token_jti deny-list |
| `personas` | Unique (citizen_id, persona_type). Types: FARMER, AGGREGATOR, CUSTOMER, DELIVERY_PARTNER. Status: PENDING, ACTIVE, SUSPENDED, REJECTED |
| `persona_approvals` | PENDING / APPROVED / REJECTED |
| `kyc_records` | T0/T1/T2, status PENDING/IN_REVIEW/VERIFIED/REJECTED/EXPIRED |
| `kyc_documents` | document_type, document_number_token, storage_object_key, verification_status |
| `consents` | consent_type, purpose, policy_version, granted, withdrawn_at |
| `profile_change_history` | changed_fields JSONB |
| `audit_logs` | actor_type CITIZEN/ADMIN/SYSTEM/SERVICE |
| `notifications` | **FK is `user_id` → `users.user_id`**, not citizens |
| `wallets` | Unique (citizen_id, currency_code). NUMERIC(19,4) `available_balance` only. Status ACTIVE/FROZEN/CLOSED |
| `wallet_transactions` | TOPUP, TRANSFER, PURCHASE, REFUND, CASHOUT, HOLD, RELEASE, ADJUSTMENT |
| `ledger_entries` | DEBIT / CREDIT, amount NUMERIC(19,4), balance_after |
| `wallet_holds` | ACTIVE, RELEASED, CAPTURED, EXPIRED, CANCELLED |
| `wallet_limits` | per KYC tier + optional persona_type |
| `idempotency_records` | per citizen_id + idempotency_key |
| `topup_requests` | PENDING/CONFIRMED/FAILED/EXPIRED/REVERSED |
| `cashout_requests` | PENDING/PROCESSING/PAID/FAILED/CANCELLED |
| `risk_reviews` | CLEAR/REVIEW/BLOCKED |
| `reconciliation_runs` / `reconciliation_items` | ops reconciliation |

### B. Marketplace / party model (do not treat as CIS source of truth)

| Table | Notes |
|---|---|
| `users` | Separate user_id, phone, password_hash, role_id |
| `roles` | Role catalog |
| `parties` | CUSTOMER/FARMER/AGGREGATOR/DELIVERY_PARTNER/ADMIN linked to `users` |
| `customers` / `customer_addresses` / `locations` | Address book for customers |
| `farmers` / `farms` | Farmer-specific |
| `aggregators` / `warehouses` | Aggregator-specific |
| `delivery_partners` / `vehicles` | Vehicle rows live here today |
| `bank_accounts` | **FK `user_id` → `users.user_id`**, not `citizens.id` |

CIS APIs will use group A. Group B must not be written by CIS unless Himanshu confirms a join strategy. Vehicles should remain owned by RTO conceptually; CIS will not add more vehicle columns.

No public PostgreSQL enums. Status values are VARCHAR + CHECK constraints.

Timestamps are `TIMESTAMP` (not `timestamptz`). Financial columns are `NUMERIC(19,4)`.

---

## 5. Frontend field ↔ database mapping

| Frontend field | DB location | Notes |
|---|---|---|
| `citizen_id` e.g. `CIT-8829-4102` | `citizens.id` UUID | **No display-code column exists.** Need a mapping strategy |
| `full_name` | `citizens.full_name` | Direct |
| `email` | `citizens.email_normalized` | Store lowercase/trimmed |
| `mobile` `+91 98765 43210` | `citizens.mobile_e164` | Store E.164, e.g. `+919876543210` |
| `nationality` `Indian`/`OCI` | `citizen_profiles.nationality_code` CHAR(2) | Map Indian→IN, OCI→? Confirm |
| `language` en/hi/kn | `citizen_profiles.preferred_language` | Direct |
| `address` single string | `citizen_profiles.address_line1` (+ city/state/postal) | UI is unstructured; DB is structured |
| `kyc_tier` T0/T1/T2 | `kyc_records.kyc_tier` | Latest verified record |
| `kyc_status` | `kyc_records.status` | |
| `personas[]` | `personas.persona_type` where status=ACTIVE | Map BUYER/CUSTOMER |
| `active_persona` | `personas.is_default` | Closest existing flag |
| `verified_bank_accounts` | `bank_accounts` | Linked to `users`, not `citizens` — **schema gap** |
| `wallet_pin` | **no column** | Must not store plaintext. Needs hashed PIN table or column approval |
| `mfa_enabled` / `mfa_method` / `mfa_threshold_amount` | **no columns** | Can live in profile JSON later; ask before ALTER |
| `wallet.available_balance` | `wallets.available_balance` | NUMERIC |
| `wallet.held_balance` | SUM of `wallet_holds.amount` where status=ACTIVE | Computed, not stored |
| `wallet.today_spent` / `month_spent` | derived from `wallet_transactions` | Not stored |
| transfer purpose_code | `wallet_transactions.description` or reference_type | No purpose_code column |
| `idempotency_key` | `idempotency_records.idempotency_key` | |
| `business_ref` | `wallet_transactions.reference_type` + external string | `reference_id` is UUID only — business_ref string may need description or new column |
| sessions | `citizen_sessions` | |
| consents | `consents` | UI `service_id` vs DB `consent_type` |
| audit hash chain | `audit_logs.details` JSONB | No prev_hash/current_hash columns |
| fee schedules | **no table** | Admin UI only unless added |
| disputes | **no table** | Closest: hold + risk_reviews. Needs approval to add `disputes` |

---

## 6. Proposed API inventory (not implemented yet)

Base: `http://localhost:8000/api/v1`

Public/citizen (JWT):

| Method | Path | Frontend trigger |
|---|---|---|
| POST | `/auth/register` | AuthModal register |
| POST | `/auth/otp/request` | Send OTP (register/login/recovery) |
| POST | `/auth/otp/verify` | Verify OTP |
| POST | `/auth/login` | Password login |
| POST | `/auth/login/otp` | OTP login |
| POST | `/auth/refresh` | Silent token refresh |
| POST | `/auth/logout` | Header logout |
| POST | `/auth/password/recover` | Recovery |
| POST | `/auth/password/reset` | Recovery confirm |
| GET | `/citizens/me` | Profile + dashboard identity |
| PATCH | `/citizens/me` | Profile save |
| GET | `/citizens/me/history` | Profile change history |
| GET | `/personas` | Persona hub |
| POST | `/personas` | Apply / self-assign |
| POST | `/personas/{id}/activate` | Switch active persona |
| GET | `/kyc/me` | Tier banner |
| POST | `/kyc/documents` | KYC submit (multipart) |
| GET | `/consents` | Consent matrix |
| PATCH | `/consents/{id}` | Grant/withdraw |
| GET | `/sessions` | Device list |
| DELETE | `/sessions/{id}` | Revoke |
| POST | `/sessions/revoke-others` | Revoke others |
| GET | `/wallets/me` | Dashboard balances |
| GET | `/wallets/me/transactions` | Statements |
| POST | `/transfers` | Wallet transfer |
| POST | `/topups` | Top-up intent |
| POST | `/cashouts` | Cash-out |
| POST | `/wallets/pin` | Set/verify PIN |
| GET | `/holds` | Escrow list |
| POST | `/holds/{id}/release` | Release |
| POST | `/holds/{id}/refund` | Refund |

Admin (admin JWT / RBAC):

| Method | Path |
|---|---|
| GET/POST | `/admin/persona-applications` approve/reject |
| GET/POST | `/admin/disputes` (only if table approved) |
| GET | `/admin/audit` |
| GET/PATCH | `/admin/limits` |
| GET | `/admin/reconciliation` |

Internal (service credentials, not browser):

| Method | Path | Caller |
|---|---|---|
| GET | `/internal/citizens/{id}/status` | AgriLink, RTO |
| GET | `/internal/citizens/{id}/personas` | AgriLink, RTO |
| GET | `/internal/citizens/{id}/eligibility` | AgriLink, RTO |
| POST | `/internal/wallets/{id}/hold` | AgriLink, RTO |
| POST | `/internal/wallets/{id}/release` | AgriLink |
| POST | `/internal/wallets/{id}/credit` | AgriLink settlement |
| POST | `/internal/tokens/introspect` | All services |
| GET | `/.well-known/jwks.json` | All services |

These paths align with `ApiExplorer.jsx` (`/v1/wallets/{id}/balance`, `/v1/transfers`, `/v1/holds`, introspect, JWKS) but will be prefixed `/api/v1` unless we add compatibility aliases.

---

## 7. Inter-microservice matrix

| Entity | Owner | AgriLink may | RTO may | Browser may |
|---|---|---|---|---|
| Citizen identity | CIS | Read status/persona/KYC tier if consent granted | Read status + delivery-partner eligibility | Own profile |
| Personas | CIS | Verify FARMER/CUSTOMER/AGGREGATOR | Verify DELIVERY_PARTNER | Manage own |
| Wallet ledger | CIS | Authorized hold/release/credit via internal API | Authorized freight hold/refund | Own wallet ops |
| KYC documents | CIS | Never raw files | Never raw files | Own uploads |
| Bank accounts | CIS (after FK clarified) | No | No | Own masked accounts |
| Vehicles | RTO (even if `public.vehicles` exists here) | No | Own | No via CIS |
| Produce/orders | AgriLink | Own | No | No via CIS |

Service auth: dedicated service credentials + scoped JWT. Do not trust “it came from another microservice” without credentials.

REST is preferred for request/response identity checks. Async events (outbox) later for `citizen.registered`, `persona.approved`, `wallet.*`. RabbitMQ is **not** required for Phase 2–8.

---

## 8. Gap analysis (need your / Himanshu’s approval before ALTER)

Must decide, **do not ALTER yet**:

1. **Display citizen ID.** Frontend uses `CIT-8829-4102`. DB has UUID only. Options: (a) add `citizens.public_code VARCHAR UNIQUE`, (b) accept UUID in API and ask frontend later to display it.
2. **Register has no password**, but `credentials.password_hash` is NOT NULL. Options: (a) add password fields to register API now and ask frontend later, (b) OTP-only accounts with a random unusable hash until recovery sets password.
3. **Bank accounts FK to `users`**, not `citizens`. CIS cannot attach payout accounts to a citizen without a mapping table or FK change.
4. **Wallet PIN, MFA settings** have no tables/columns.
5. **`wallets` has no `held_balance`.** Derive from `wallet_holds` (preferred) rather than adding a column.
6. **`business_ref` / `purpose_code` / split beneficiaries** are not first-class columns. Holds have `reason_code` VARCHAR(60) only; no splits table.
7. **Disputes and fee schedules** are frontend-only.
8. **Timestamps are TIMESTAMP without time zone.** Prefer treating them as UTC in application code rather than altering types.
9. **Notifications FK to `users`.** Citizen notifications may need a different table or FK.
10. **Do not store plaintext Aadhaar/PAN.** Use `document_number_token` + masked values in API responses only.

Frontend integration (Phase 9) is a **separate change** in the React repo. This phase will not edit JSX.

---

## 9. Architectural decisions for upcoming phases

- SQLAlchemy models will be **mapped to existing table names and columns** (`__tablename__ = "citizens"`, etc.).
- CIS identity is `citizens.id`, not `users.user_id`.
- Wallet money uses `Decimal` / NUMERIC only.
- Held funds = sum of ACTIVE `wallet_holds`.
- Persona enum in API responses can include UI aliases; persistence uses DB check values only.
- Internal wallet operations require idempotency keys.
- Files go to Supabase Storage; PostgreSQL stores `storage_object_key` only.

---

## 10. Phase 1 completion criteria

- [x] Backend folder inspected
- [x] Frontend repo cloned/inspected (`D:\Microservice_Citizen`)
- [x] Forms and mock operations inventoried
- [x] Live Supabase `public` schema inventoried
- [x] Field mapping written
- [x] API inventory drafted
- [x] Inter-service matrix drafted
- [x] Gaps listed for approval
- [ ] GitHub backend branch created and pushed (next action)
- [ ] Your approval on schema gaps before any migration
