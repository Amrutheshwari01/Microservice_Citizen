# AgriLink CIS — Implementation checklist

Legend: `[ ]` pending · `[x]` done · `[~]` blocked on approval

## Phase 1 — Inspection
- [x] Inspect backend
- [x] Inspect frontend
- [x] Inspect live Supabase schema
- [x] Write field mapping and gaps
- [ ] Create GitHub branch `backend/cis-identity-wallet` (no frontend edits)
- [ ] Push branch (needs write access to `Amrutheshwari01/Microservice_Citizen`)

## Phase 2 — Backend foundation
- [ ] Modular folder structure
- [ ] `requirements.txt` + `.env.example`
- [ ] Settings from environment
- [ ] SQLAlchemy 2.x session + FastAPI dependency
- [ ] Exception handlers + correlation ID
- [ ] CORS for `http://localhost:5173`
- [ ] Structured logging
- [ ] Reflect/map existing models (no CREATE TABLE)
- [ ] Health check still works

## Phase 3 — Authentication
- [ ] Register (OTP + citizen + wallet row)
- [ ] Password hashing (Argon2)
- [ ] Login identifier: email / mobile / UUID
- [ ] JWT access + refresh
- [ ] Logout / revocation
- [ ] OTP request/verify
- [ ] Recover password
- [ ] Lockout via `credentials.failed_login_count` / `locked_until`

## Phase 4 — Profile and address
- [ ] GET/PATCH `/citizens/me`
- [ ] Profile history
- [ ] Address mapping (profile lines vs `customer_addresses`)
- [ ] Contact verify

## Phase 5 — Personas
- [ ] List / apply / activate
- [ ] Admin approve/reject
- [ ] DB values FARMER/CUSTOMER/AGGREGATOR/DELIVERY_PARTNER

## Phase 6 — KYC and documents
- [ ] Document metadata per type
- [ ] Supabase Storage private upload
- [ ] Signed URLs
- [ ] Tokenized document numbers

## Phase 7 — Bank details
- [~] Blocked until `bank_accounts.user_id` vs `citizens.id` is decided

## Phase 8 — Wallet
- [ ] Get wallet (available + computed held)
- [ ] Double-entry ledger
- [ ] Transfer / topup / cashout
- [ ] Hold / release / refund
- [ ] Idempotency
- [ ] Row locks
- [ ] Limits from `wallet_limits`

## Phase 9 — Frontend integration
- [ ] Do **not** rewrite React in this backend workstream
- [ ] Publish OpenAPI so Amrutheshwari can replace mock handlers
- [ ] CORS + response envelope matching UI fields

## Phase 10 — Inter-service APIs
- [ ] Internal citizen status/personas/eligibility
- [ ] Internal wallet hold/release/credit/debit
- [ ] Service credentials
- [ ] AgriLink + RTO clients with timeouts

## Phase 11 — Events
- [ ] Design only until REST flows work
- [ ] Outbox later if AgriLink/RTO need async

## Phase 12 — Tests
- [ ] pytest + TestClient
- [ ] Auth, persona, KYC, wallet concurrency
- [ ] No tests against production data

## Phase 13 — Docker / CI
- [ ] Dockerfile, compose
- [ ] GitHub Actions lint/test

## Phase 14 — Docs / deploy
- [ ] README, internal API doc, wallet accounting doc
