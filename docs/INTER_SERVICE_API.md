# AgriLink CIS — Inter-Service API Specification

**Service Name**: Citizen Identity & Wallet Microservice (CIS)  
**Base URL**: `http://<cis-host>:8000/api/v1/internal`  
**Authentication**: Preshared Service Key Header: `X-Service-Key: <INTERNAL_SERVICE_SECRET>`

This document details the REST endpoints exposed by CIS for direct consumption by:
1. **AgriLink Agricultural Marketplace Microservice**
2. **RTO / Vehicle Registry & Rental Microservice**

Neither service may query the CIS database directly. All identity and wallet operations must flow through these audited endpoints.

---

## 1. Authentication & Security

All internal requests must include the header:
```http
X-Service-Key: <configured_internal_secret>
```
If missing or invalid, the API returns:
```json
{
  "success": false,
  "code": "FORBIDDEN",
  "message": "Invalid internal service credentials"
}
```

---

## 2. Token Introspection

Verify whether a JWT access token submitted by a user to AgriLink or RTO is valid, not revoked, and belongs to an active citizen.

- **Method**: `POST`
- **Path**: `/api/v1/internal/tokens/introspect`
- **Request Body**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```
- **Response** (`200 OK`):
```json
{
  "active": true,
  "citizen_id": "99244c77-4bb9-4d2c-80fd-1669868e82a8",
  "full_name": "Ramesh Kumar",
  "email": "ramesh@agrilink.in",
  "mobile": "+919876543210",
  "account_status": "ACTIVE",
  "personas": ["CUSTOMER", "FARMER"],
  "active_persona": "FARMER",
  "kyc_tier": "T1",
  "scopes": ["citizen:read", "citizen:write", "wallet:transfer"]
}
```

---

## 3. Citizen Status & Personas

### 3.1 Get Citizen Status Summary
- **Method**: `GET`
- **Path**: `/api/v1/internal/citizens/{citizen_id}/status`
- **Response** (`200 OK`):
```json
{
  "citizen_id": "99244c77-4bb9-4d2c-80fd-1669868e82a8",
  "status": "ACTIVE",
  "kyc_tier": "T1",
  "kyc_status": "VERIFIED",
  "has_wallet": true,
  "wallet_status": "ACTIVE",
  "active_persona": "FARMER",
  "personas": ["CUSTOMER", "FARMER"],
  "created_at": "2026-11-02T10:00:00"
}
```

### 3.2 List Citizen Personas
- **Method**: `GET`
- **Path**: `/api/v1/internal/citizens/{citizen_id}/personas`
- **Response** (`200 OK`):
```json
{
  "citizen_id": "99244c77-4bb9-4d2c-80fd-1669868e82a8",
  "personas": [
    {
      "persona_type": "CUSTOMER",
      "status": "ACTIVE",
      "is_default": false
    },
    {
      "persona_type": "FARMER",
      "status": "ACTIVE",
      "is_default": true
    }
  ]
}
```

### 3.3 Persona Eligibility Check
Quick pre-flight check before permitting marketplace actions (e.g. creating farm listings, accepting deliveries).
- **Method**: `GET`
- **Path**: `/api/v1/internal/citizens/{citizen_id}/eligible/{persona_type}`
- **Parameters**: `persona_type` ∈ `{"CUSTOMER", "FARMER", "AGGREGATOR", "DELIVERY_PARTNER"}`
- **Response** (`200 OK`):
```json
{
  "citizen_id": "99244c77-4bb9-4d2c-80fd-1669868e82a8",
  "persona_type": "FARMER",
  "eligible": true,
  "reason": null
}
```

---

## 4. Wallet Operations (Escrow & Settlement)

### 4.1 Place Escrow Hold
Temporarily hold funds in a buyer's wallet when placing a produce order or renting a vehicle.
- **Method**: `POST`
- **Path**: `/api/v1/internal/wallets/{wallet_id}/hold`
- **Request Body**:
```json
{
  "amount": "2500.00",
  "hold_reason": "ORDER_ESCROW",
  "reference_id": "ORD-2026-99120",
  "expires_in_hours": 72,
  "idempotency_key": "escrow-ORD-2026-99120"
}
```
- **Response** (`201 Created`):
```json
{
  "success": true,
  "hold_id": "48bfefac-9706-4444-8cb3-3efba2279234",
  "wallet_id": "31fe10cb-305f-4a0b-8d75-d85be4a44b1c",
  "amount": "2500.0000",
  "status": "ACTIVE",
  "reference_id": "ORD-2026-99120",
  "expires_at": "2026-11-05T10:00:00"
}
```

### 4.2 Release Escrow Hold (Order Cancelled)
Releases held funds back to buyer's available balance if order is cancelled.
- **Method**: `POST`
- **Path**: `/api/v1/internal/wallets/{wallet_id}/release`
- **Query Parameter**: `hold_id=<uuid>`
- **Response** (`200 OK`):
```json
{
  "success": true,
  "message": "Hold released successfully.",
  "hold_id": "48bfefac-9706-4444-8cb3-3efba2279234",
  "wallet_id": "31fe10cb-305f-4a0b-8d75-d85be4a44b1c"
}
```

### 4.3 Credit Wallet (Settlement / Payout)
Credits a farmer, transporter, or aggregator upon delivery confirmation.
- **Method**: `POST`
- **Path**: `/api/v1/internal/wallets/{wallet_id}/credit`
- **Request Body**:
```json
{
  "amount": "2400.00",
  "description": "Settlement for produce delivery ORD-2026-99120",
  "source_service": "AGRILINK_MARKETPLACE",
  "reference_id": "ORD-2026-99120",
  "idempotency_key": "settle-ORD-2026-99120"
}
```
- **Response** (`200 OK`):
```json
{
  "success": true,
  "wallet_id": "31fe10cb-305f-4a0b-8d75-d85be4a44b1c",
  "transaction_id": "76629ec2-c848-4e14-99a3-5ba2b1e4c34a",
  "amount": "2400.0000",
  "new_balance": "5400.0000"
}
```

### 4.4 Debit Wallet (Direct Fee / Deduction)
Debits a wallet for platform commission, penalty, or rental deposit.
- **Method**: `POST`
- **Path**: `/api/v1/internal/wallets/{wallet_id}/debit`
- **Request Body**:
```json
{
  "amount": "100.00",
  "description": "Platform fee for order ORD-2026-99120",
  "destination_service": "AGRILINK_MARKETPLACE",
  "reference_id": "FEE-ORD-2026-99120",
  "idempotency_key": "fee-ORD-2026-99120"
}
```
- **Response** (`200 OK`):
```json
{
  "success": true,
  "wallet_id": "31fe10cb-305f-4a0b-8d75-d85be4a44b1c",
  "transaction_id": "8bb12ea1-3444-42b7-a36c-9226cfd4a001",
  "amount": "100.0000",
  "new_balance": "5300.0000"
}
```

---

## 5. Idempotency Standard

All state-mutating requests (`hold`, `credit`, `debit`) require an `idempotency_key` (UUID v4 or deterministic string prefix like `settle-ORD-123`).

- Repeating a request with the **same** idempotency key returns the original cached response with HTTP 200 without double-crediting or double-holding.
- Resubmitting with the same key but different body parameters raises `409 Conflict (IDEMPOTENCY_KEY_REUSED)`.
