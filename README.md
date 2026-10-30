<<<<<<< HEAD
# AgriLink — Citizen Identity & Wallet Service (CIS-M1 to M6)

> **Microservice 2 of the AgriLink Ecosystem**  
> Layered Requirements Implementation · SRS, ATAM and ADR Report Compliance

---

## 🌾 Overview

The **Citizen Identity & Wallet Service** provisions every citizen in the AgriLink agricultural ecosystem with **one unified identity** and **one double-entry INR wallet**:
- **Identity & Access Management (CIS-M1 to M5)**: Registration & login, profile & KYC, dynamic persona claims, token-based SSO, cross-service consent governance, and tamper-evident audit trails.
- **Citizen Wallet & Double-Entry Ledger (CIS-M6)**: Atomic wallet-to-wallet transfers, payment gateway top-ups, escrow holds with milestone releases and auto-expiry refunds, split settlement routing, dispute freeze to suspense accounts, and daily bank reconciliation.

---

## 🖥️ Surfaces & Functional Scope

The frontend implements **both surfaces** defined in Section 5.1 of the SRS specification:

### 1. Citizen Portal Surface
- **Citizen Hub & Wallet (CIS-M6)**:
  - Real-time balances: **Available INR Balance** vs **In Active Escrow Holds**.
  - **Dynamic Tier Velocity Meters**: Daily & monthly spending limits tracked against KYC tier caps.
  - **Direct Wallet-to-Wallet Transfer (WAL-FR-04)**: Atomic transfer with purpose codes, business reference, and idempotency key (CIS-N07).
  - **Payment Gateway Top-Up (WAL-FR-02)**: Multi-channel selection (UPI, Netbanking) with signed webhook verification.
  - **Bank Cash-Out / Payout (WAL-FR-07)**: Verified bank destination, fee calculation, cooling period validation, and 4-digit PIN authentication.
  - **Wallet Security PIN (WAL-FR-09)**: Interactive keypad, failure counter, and lockout safeguards.
- **Filterable Account Statements (WAL-FR-03)**:
  - Search by reference, counterparty, or category.
  - One-click **CSV Statement Export**.
  - **Double-Entry Ledger Voucher Viewer** verifying debit = credit invariant.
- **Active Escrow & Split Settlements (WAL-FR-05 & WAL-FR-06)**:
  - Multi-party escrow holds (AgriLink harvest advances, RTO cold transit freight, APMC mandi trading).
  - Atomic split routing breakdown (`Σ Splits = Released Amount`).
  - Milestone release, auto-expiry simulation, and citizen dispute filing.
- **Citizen Identity, Profile & KYC (CID-FR-05, 06, 07)**:
  - Profile edit with **timestamped change history audit log** (CID-FR-05).
  - Government KYC verification adapter (Aadhaar tokenization with masking `XXXX-XXXX-8921`, PAN card, Passport).
  - **T0, T1, T2 Tier Entitlements Comparison** with live promotional upgrade.
- **Personas Hub (CID-FR-08 & 09)**:
  - View assigned personas (`FARMER`, `BUYER`).
  - Apply for restricted personas (`AGGREGATOR`, `DELIVERY_PERSON`) routed to Admin Queue.
  - Instant persona switcher updating active token scope.
- **Consent Matrix (CID-FR-12)**:
  - Granular data sharing matrix across partner services: **AgriLink Core (AGL-M7)**, **RTO Logistics (RTO-M4)**, and **APMC Mandi (APMC-M3)**.
  - Cryptographically timestamped Grant / Withdraw controls.
- **Security & Device Management (CID-FR-03, 04 & CIS-N03)**:
  - Active session device inventory with immediate revocation and token deny-list insertion.
  - MFA step-up threshold configuration.
- **Visitor Authentication (CID-FR-01, 02, 04)**:
  - Single Citizen ID registration with OTP verification.
  - Password + Argon2id hash, Mobile OTP, or Federated SSO (DigiLocker, AgriStack, Google).
  - Rate-limited account recovery with temporary lockout.

### 2. Administrator, Finance Operations & Compliance Console
- **Ops Overview Control Tower**: Circulating ledger INR, active escrow value, SLA performance indicators.
- **Restricted Persona Approvals Queue (CID-FR-08)**: Admin sign-off for FPO Aggregators and Freight Transporters.
- **Dispute Freeze & Resolution (WAL-FR-10)**: Freeze contested funds to `Dispute Suspense (ACC-SYS-SUSPENSE-01)` and resolve with mandatory reason codes.
- **Tamper-Evident Hash-Chained Audit Trail (CID-FR-14 & CIS-N13)**: Append-only cryptographic block verification tool.
- **Limits & Velocity Policy Engine (WAL-FR-08)**: Versioned rules for per-transaction, daily, and monthly limits per KYC tier and persona.
- **Fee Schedules & Revenue Postings (WAL-FR-13)**: Commission calculations and Platform Revenue account postings.
- **Daily Reconciliation & Exception Desk (WAL-FR-12 & CIS-N09)**: 3-way automated matching between Gateway, Bank, and Internal Ledger.
- **Role-Based Access Control (RBAC) (CID-FR-13)**: Capability matrix and machine-to-machine service policies.
- **API & JWKS Explorer (Section 5.2)**: Interactive runner for all REST endpoints and public RSA signing keys.

---

## 🌐 System-Wide Features

- **S07 Multilingual UI**: Full localization across **English (`en`)**, **Hindi (`hi` - हिन्दी)**, and **Kannada (`kn` - ಕನ್ನಡ)**.
- **S07 Voice Search Assistant**: Microphone input with audio waveform visualizer and natural language intent parsing (e.g., *"Check my wallet balance"*, *"Top-up wallet"*).
- **WAL-FR-14 Outbox Events Relay**: Live event drawer relaying microservice events (`WalletCredited`, `FundsHeld`, `FundsReleased`, `FundsRefunded`, `KYCTierChanged`).

---

## 🚀 Getting Started

### Prerequisites
- Node.js `v18+` or `v22+`
- npm `v9+` or `v10+`

### Installation
```bash
# Clone the repository
git clone <your-repo-url>
cd Microservice_Citizen

# Install dependencies
npm install
```

### Run Locally (Dev Server)
```bash
npm run dev
```
The application will be running locally at `http://localhost:5173/`.

### Production Build
```bash
npm run build
```
Generates optimized, minified production assets into the `dist/` folder.

---

## 📐 Technology Stack
- **Framework**: React 19 + Vite 8
- **Styling**: Modern Vanilla CSS Design System with curated AgriLink emerald palette (`#05472a`, `#059669`, `#f59e0b`, `#0f172a`)
- **Typography**: Google Fonts (*Outfit*, *Plus Jakarta Sans*, *JetBrains Mono*)
- **Icons**: Lucide Icons
- **Effects**: Canvas Confetti for verification celebration
=======
# Microservice_Citizen
>>>>>>> 13383c289f82cea495c0944363d557d2af896898
