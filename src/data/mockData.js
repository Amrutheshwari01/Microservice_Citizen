// Citizen Identity & Wallet Service (CIS-M1 to M6) Data Store & Initial State

export const INITIAL_CITIZEN = {
  citizen_id: "CIT-8829-4102",
  full_name: "Rameshwar Patel",
  email: "ramesh.patel@agrilink.in",
  mobile: "+91 98765 43210",
  nationality: "Indian",
  language: "en", // 'en', 'hi', 'kn'
  address: "Village Hirapur, Taluka Sinnar, District Nashik, Maharashtra - 422103",
  kyc_tier: "T1", // T0, T1, T2
  kyc_status: "VERIFIED",
  kyc_details: {
    aadhaar_masked: "XXXX-XXXX-8921",
    pan_masked: "ABCDE****F",
    verified_at: "2026-10-15T10:30:00Z",
    provider: "UIDAI / NSDL Adapter"
  },
  active_persona: "FARMER",
  personas: ["FARMER", "BUYER"],
  pending_persona_applications: [
    {
      id: "APP-PER-902",
      persona: "AGGREGATOR",
      applied_at: "2026-10-24T14:20:00Z",
      status: "PENDING_APPROVAL",
      fpo_name: "Sinnar Organic Farmers Producer Co.",
      license_ref: "MH-AGR-2026-8819",
      notes: "Submitted warehouse ownership proof and FPO certificate."
    }
  ],
  verified_bank_accounts: [
    {
      id: "BANK-01",
      bank_name: "State Bank of India",
      account_number: "••••••••4590",
      ifsc: "SBIN0004128",
      account_holder: "Rameshwar Patel",
      is_primary: true,
      verified: true
    },
    {
      id: "BANK-02",
      bank_name: "Bank of Baroda",
      account_number: "••••••••8112",
      ifsc: "BARB0SINNAR",
      account_holder: "Rameshwar Patel",
      is_primary: false,
      verified: true
    }
  ],
  wallet_pin_set: true,
  wallet_pin: "7421",
  pin_failed_attempts: 0,
  wallet_locked: false,
  mfa_enabled: true,
  mfa_method: "SMS_OTP", // 'SMS_OTP', 'AUTHENTICATOR', 'BIOMETRIC'
  mfa_threshold_amount: 10000, // Transfers above ₹10,000 require step-up MFA
  registered_at: "2026-08-10T09:15:00Z"
};

export const INITIAL_WALLET = {
  wallet_id: "WAL-IN-8829-01",
  currency: "INR",
  citizen_id: "CIT-8829-4102",
  available_balance: 48500.00,
  held_balance: 15000.00, // In active escrow holds
  total_balance: 63500.00,
  today_spent: 4200.00,
  month_spent: 38400.00,
  last_updated: "2026-10-30T06:45:00Z"
};

export const KYC_TIERS_INFO = {
  T0: {
    name: "T0 — Unverified Visitor",
    badge: "T0 Basic",
    color: "#6B7280",
    max_balance: 10000,
    per_tx_limit: 2000,
    daily_limit: 5000,
    monthly_limit: 10000,
    unlocked_personas: ["FARMER (Basic)"],
    description: "Instant phone registration with OTP. Suitable for casual marketplace browsing and micro-receipts."
  },
  T1: {
    name: "T1 — Basic Verified Citizen",
    badge: "T1 Verified",
    color: "#059669",
    max_balance: 100000,
    per_tx_limit: 25000,
    daily_limit: 50000,
    monthly_limit: 100000,
    unlocked_personas: ["FARMER", "BUYER"],
    description: "Verified via Aadhaar OTP or PAN. Enables standard trade receipts, bank cash-outs and mandi transactions."
  },
  T2: {
    name: "T2 — Full High-Trust Citizen",
    badge: "T2 Full Trust",
    color: "#7C3AED",
    max_balance: 1000000,
    per_tx_limit: 100000,
    daily_limit: 250000,
    monthly_limit: 1000000,
    unlocked_personas: ["FARMER", "BUYER", "AGGREGATOR", "DELIVERY_PERSON"],
    description: "Physical verification / DigiLocker / Bio-authenticated. Unlocks FPO aggregation, freight logistics, high-volume APMC auctions."
  }
};

export const INITIAL_TRANSACTIONS = [
  {
    id: "TXN-98412",
    business_ref: "AGL-M7-HARVEST-4410",
    type: "CREDIT",
    category: "Produce Sale",
    purpose_code: "AGRI_PRODUCE_PAYMENT",
    amount: 32000.00,
    fee: 0.00,
    net_amount: 32000.00,
    counterparty: "Nashik APMC Mandi Trader (CIT-4419-0021)",
    timestamp: "2026-10-29T15:30:00Z",
    status: "COMPLETED",
    description: "Paddy crop harvest sale (Lot #8841)",
    idempotency_key: "idem-agl-m7-4410-tx-01"
  },
  {
    id: "TXN-98205",
    business_ref: "RTO-M4-FREIGHT-9912",
    type: "HOLD",
    category: "Transport Escrow",
    purpose_code: "LOGISTICS_FREIGHT_HOLD",
    amount: 15000.00,
    fee: 0.00,
    net_amount: 15000.00,
    counterparty: "Kisan Logistics Fleet #MH15-8891",
    timestamp: "2026-10-28T11:15:00Z",
    status: "HELD",
    description: "Escrow hold for Nashik-to-Mumbai cold transit",
    idempotency_key: "idem-rto-m4-9912-hold-01",
    hold_id: "HOLD-7712"
  },
  {
    id: "TXN-97940",
    business_ref: "TOPUP-PG-66291",
    type: "TOPUP",
    category: "Wallet Top-up",
    purpose_code: "CITIZEN_TOPUP_UPI",
    amount: 10000.00,
    fee: 0.00,
    net_amount: 10000.00,
    counterparty: "Payment Gateway / UPI (HDFC Bank)",
    timestamp: "2026-10-26T09:40:00Z",
    status: "COMPLETED",
    description: "Instant UPI Top-up to INR Wallet",
    idempotency_key: "idem-topup-pg-66291"
  },
  {
    id: "TXN-97510",
    business_ref: "TRANSFER-W2W-1192",
    type: "DEBIT",
    category: "Direct Transfer",
    purpose_code: "SEED_FERTILIZER_PURCHASE",
    amount: 4200.00,
    fee: 0.00,
    net_amount: 4200.00,
    counterparty: "MahaAgro Agri-Input Kendra (CIT-1102-9938)",
    timestamp: "2026-10-25T14:10:00Z",
    status: "COMPLETED",
    description: "Fertilizer NPK 50kg bag purchase",
    idempotency_key: "idem-w2w-transfer-1192"
  },
  {
    id: "TXN-96880",
    business_ref: "CASHOUT-NEFT-5512",
    type: "PAYOUT",
    category: "Bank Cash-out",
    purpose_code: "WALLET_CASHOUT_BANK",
    amount: 18000.00,
    fee: 5.00,
    net_amount: 17995.00,
    counterparty: "State Bank of India (••••4590)",
    timestamp: "2026-10-20T17:22:00Z",
    status: "COMPLETED",
    description: "Withdrawal to verified primary bank account",
    idempotency_key: "idem-cashout-neft-5512"
  }
];

export const INITIAL_HOLDS = [
  {
    id: "HOLD-7712",
    business_ref: "RTO-M4-FREIGHT-9912",
    module: "RTO-M4 (Logistics)",
    purpose: "Escrow for Nashik-Mumbai Produce Haulage",
    held_amount: 15000.00,
    currency: "INR",
    status: "HELD", // HELD, RELEASED, REFUNDED, FROZEN
    payer_citizen_id: "CIT-8829-4102",
    expires_at: "2026-11-04T18:00:00Z",
    created_at: "2026-10-28T11:15:00Z",
    splits: [
      { recipient: "Kisan Logistics Driver (CIT-9910-1204)", role: "Freight Carrier", amount: 13500.00 },
      { recipient: "AgriLink Platform Revenue", role: "Platform Service Fee (1%)", amount: 150.00 },
      { recipient: "RTO Transit Insurance Pool", role: "Cargo Insurance", amount: 1350.00 }
    ],
    can_dispute: true
  },
  {
    id: "HOLD-7501",
    business_ref: "AGL-M7-PRODUCE-8831",
    module: "AgriLink (AGL-M7)",
    purpose: "Paddy Pre-Delivery Token Advance",
    held_amount: 8000.00,
    currency: "INR",
    status: "RELEASED",
    payer_citizen_id: "CIT-8829-4102",
    expires_at: "2026-10-22T12:00:00Z",
    created_at: "2026-10-18T09:00:00Z",
    released_at: "2026-10-22T10:15:00Z",
    splits: [
      { recipient: "Rameshwar Patel (CIT-8829-4102)", role: "Farmer Payout", amount: 7960.00 },
      { recipient: "Platform Revenue", role: "Mandi Facilitation (0.5%)", amount: 40.00 }
    ],
    can_dispute: false
  }
];

export const INITIAL_SESSIONS = [
  {
    id: "SES-88291",
    device_name: "Samsung Galaxy M34 (Chrome Mobile)",
    device_type: "MOBILE",
    ip_address: "49.36.128.44",
    location: "Nashik, Maharashtra",
    last_active: "Active Now",
    current: true,
    issued_at: "2026-10-30T06:12:00Z"
  },
  {
    id: "SES-88102",
    device_name: "Desktop Windows 11 (Firefox)",
    device_type: "DESKTOP",
    ip_address: "157.34.89.201",
    location: "Pune, Maharashtra",
    last_active: "2 hours ago",
    current: false,
    issued_at: "2026-10-28T09:44:00Z"
  },
  {
    id: "SES-87994",
    device_name: "Xiaomi Pad 6 (AgriLink App)",
    device_type: "TABLET",
    ip_address: "49.36.140.12",
    location: "Nashik, Maharashtra",
    last_active: "4 days ago",
    current: false,
    issued_at: "2026-10-25T14:02:00Z"
  }
];

export const INITIAL_PROFILE_HISTORY = [
  {
    id: "HIST-01",
    changed_field: "Language Preference",
    old_value: "Hindi (हिन्दी)",
    new_value: "English (en)",
    changed_by: "CIT-8829-4102",
    timestamp: "2026-10-28T16:40:00Z",
    ip_address: "49.36.128.44"
  },
  {
    id: "HIST-02",
    changed_field: "Primary Bank Account",
    old_value: "Bank of Baroda (••••8112)",
    new_value: "State Bank of India (••••4590)",
    changed_by: "CIT-8829-4102",
    timestamp: "2026-10-20T11:12:00Z",
    ip_address: "157.34.89.201"
  },
  {
    id: "HIST-03",
    changed_field: "KYC Tier Status",
    old_value: "T0 (Unverified)",
    new_value: "T1 (Basic Verified)",
    changed_by: "SYSTEM_KYC_ADAPTER",
    timestamp: "2026-10-15T10:30:00Z",
    ip_address: "INTERNAL_BULKHEAD"
  }
];

export const INITIAL_CONSENTS = [
  {
    id: "CON-01",
    service_id: "AGL-M7",
    service_name: "AgriLink Marketplace & Mandi Exchange",
    description: "Required to publish produce lots, receive purchase orders, and accept direct escrow payouts.",
    granted: true,
    data_points: ["Profile (Name, Mobile, District)", "KYC Tier Claim", "Wallet Ledger Access for Trades"],
    granted_at: "2026-08-10T09:16:00Z",
    withdrawn_at: null
  },
  {
    id: "CON-02",
    service_id: "RTO-M4",
    service_name: "RTO Rural Logistics & Cold Transit",
    description: "Permits transit fleet tracking, freight escrow creation, and delivery geo-coordinates sharing.",
    granted: true,
    data_points: ["Warehouse Address", "Contact Number", "Transport Escrow Authorization"],
    granted_at: "2026-09-01T14:30:00Z",
    withdrawn_at: null
  },
  {
    id: "CON-03",
    service_id: "APMC-M3",
    service_name: "APMC State Mandi Electronic Bidding System",
    description: "Allows auto-bidding verification, mandi trade levy debit, and market gate pass token generation.",
    granted: false,
    data_points: ["Farmer Certificate", "Bank Account Details", "Mandi Cess Auto-Debit"],
    granted_at: null,
    withdrawn_at: "2026-10-12T18:00:00Z"
  }
];

export const INITIAL_OUTBOX_EVENTS = [
  {
    id: "EVT-8821",
    event_type: "FundsHeld",
    business_ref: "RTO-M4-FREIGHT-9912",
    payload: { wallet_id: "WAL-IN-8829-01", amount: 15000.00, hold_id: "HOLD-7712" },
    timestamp: "2026-10-28T11:15:00Z",
    delivered_to: ["NotificationProvider", "RTO-M4", "AgriLink-Audit"]
  },
  {
    id: "EVT-8819",
    event_type: "WalletCredited",
    business_ref: "TOPUP-PG-66291",
    payload: { wallet_id: "WAL-IN-8829-01", amount: 10000.00, channel: "UPI" },
    timestamp: "2026-10-26T09:40:00Z",
    delivered_to: ["NotificationProvider", "CitizenApp"]
  },
  {
    id: "EVT-8810",
    event_type: "FundsReleased",
    business_ref: "AGL-M7-PRODUCE-8831",
    payload: { hold_id: "HOLD-7501", amount: 8000.00, payout: 7960.00 },
    timestamp: "2026-10-22T10:15:00Z",
    delivered_to: ["AGL-M7", "LedgerService", "NotificationProvider"]
  },
  {
    id: "EVT-8790",
    event_type: "KYCTierChanged",
    business_ref: "KYC-PROV-9092",
    payload: { citizen_id: "CIT-8829-4102", old_tier: "T0", new_tier: "T1" },
    timestamp: "2026-10-15T10:30:00Z",
    delivered_to: ["WalletService", "CIS-M4-TokenAuthority", "AgriLink"]
  }
];

// Admin Console Initial Data

export const INITIAL_PERSONA_APPLICATIONS = [
  {
    id: "APP-PER-902",
    applicant_id: "CIT-8829-4102",
    applicant_name: "Rameshwar Patel",
    persona: "AGGREGATOR",
    kyc_tier: "T1",
    applied_at: "2026-10-24T14:20:00Z",
    fpo_name: "Sinnar Organic Farmers Producer Co.",
    license_ref: "MH-AGR-2026-8819",
    status: "PENDING_APPROVAL",
    supporting_doc: "FPO_Registration_2026.pdf",
    comments: "Seeking aggregator role to pool pulses from 45 member farmers."
  },
  {
    id: "APP-PER-903",
    applicant_id: "CIT-5510-7741",
    applicant_name: "Suresh Kondke",
    persona: "DELIVERY_PERSON",
    kyc_tier: "T2",
    applied_at: "2026-10-25T11:05:00Z",
    fpo_name: "Independent Rural Transporter",
    license_ref: "MH-15-2023-009182",
    status: "PENDING_APPROVAL",
    supporting_doc: "Commercial_Driving_License_Heavy.pdf",
    comments: "Operating 2 refrigerated tempo vehicles across Sinnar-Nashik route."
  },
  {
    id: "APP-PER-898",
    applicant_id: "CIT-3392-1144",
    applicant_name: "Anita Deshmukh",
    persona: "AGGREGATOR",
    kyc_tier: "T2",
    applied_at: "2026-10-19T08:30:00Z",
    fpo_name: "Godavari Agri Producers Ltd",
    license_ref: "MH-AGR-2025-1029",
    status: "APPROVED",
    approved_by: "ADMIN_COMPLIANCE_01",
    approved_at: "2026-10-20T16:00:00Z",
    supporting_doc: "Godavari_FPO_Audit.pdf",
    comments: "Verified against Ministry of Agriculture portal."
  }
];

export const INITIAL_AUDIT_LOGS = [
  {
    block_index: 1042,
    prev_hash: "0000a941f5e8b21c...",
    current_hash: "000072b89114ad32...",
    module: "CIS-M6 (Citizen Wallet)",
    event_type: "WALLET_HOLD_CREATED",
    actor: "SERVICE:RTO-M4",
    target_id: "WAL-IN-8829-01",
    details: "Escrow hold HOLD-7712 of INR 15,000.00 for logistics reference RTO-M4-FREIGHT-9912",
    timestamp: "2026-10-28T11:15:00Z"
  },
  {
    block_index: 1041,
    prev_hash: "00003b128fa199cd...",
    current_hash: "0000a941f5e8b21c...",
    module: "CIS-M1 (Registration & Login)",
    event_type: "MFA_VERIFICATION_SUCCESS",
    actor: "CIT-8829-4102",
    target_id: "SES-88291",
    details: "MFA step-up verified via SMS OTP for high-value session validation",
    timestamp: "2026-10-28T09:44:00Z"
  },
  {
    block_index: 1040,
    prev_hash: "0000c988e1047120...",
    current_hash: "00003b128fa199cd...",
    module: "CIS-M2 (Profile & KYC)",
    event_type: "KYC_TIER_PROMOTED",
    actor: "KYC_PROVIDER_ADAPTER",
    target_id: "CIT-8829-4102",
    details: "Promoted from T0 to T1 following successful Aadhaar OTP verification",
    timestamp: "2026-10-15T10:30:00Z"
  },
  {
    block_index: 1039,
    prev_hash: "00008819aa43bc09...",
    current_hash: "0000c988e1047120...",
    module: "CIS-M5 (Access & Consent)",
    event_type: "CONSENT_WITHDRAWN",
    actor: "CIT-8829-4102",
    target_id: "APMC-M3",
    details: "Citizen withdrew data sharing consent for electronic bidding auto-debit",
    timestamp: "2026-10-12T18:00:00Z"
  }
];

export const INITIAL_DISPUTES = [
  {
    id: "DISP-2026-004",
    hold_id: "HOLD-7712",
    business_ref: "RTO-M4-FREIGHT-9912",
    complainant: "CIT-8829-4102 (Rameshwar Patel)",
    respondent: "Kisan Logistics Fleet #MH15-8891",
    total_amount: 15000.00,
    disputed_amount: 5000.00,
    frozen_in_suspense: 5000.00,
    reason: "Late delivery resulting in 15% vegetable spoilage",
    status: "OPEN_REVIEW", // OPEN_REVIEW, FROZEN, RESOLVED_REFUND, RESOLVED_RELEASE
    created_at: "2026-10-29T10:00:00Z",
    evidence: "Nashik APMC Quality Report #Q-8812 noting wilted leafy greens."
  },
  {
    id: "DISP-2026-002",
    hold_id: "HOLD-7490",
    business_ref: "AGL-M7-GRAIN-1092",
    complainant: "CIT-7718-2910 (Vidarbha Agro)",
    respondent: "CIT-6621-8819 (Mangesh Shinde)",
    total_amount: 45000.00,
    disputed_amount: 45000.00,
    frozen_in_suspense: 0.00,
    reason: "Soybean moisture content exceeded 14% benchmark",
    status: "RESOLVED_REFUND",
    resolution_code: "CONTRACT_QUALITY_DEFECT",
    resolved_at: "2026-10-21T14:30:00Z",
    resolved_by: "ADMIN_DISPUTE_OPS",
    evidence: "Moisture meter test certificate attached."
  }
];

export const INITIAL_LIMIT_RULES = [
  {
    id: "LIM-T0",
    tier: "T0",
    persona: "ALL",
    per_tx_limit: 2000.00,
    daily_limit: 5000.00,
    monthly_limit: 10000.00,
    max_balance: 10000.00,
    effective_date: "2026-01-01",
    status: "ACTIVE"
  },
  {
    id: "LIM-T1-FARMER",
    tier: "T1",
    persona: "FARMER",
    per_tx_limit: 25000.00,
    daily_limit: 50000.00,
    monthly_limit: 100000.00,
    max_balance: 100000.00,
    effective_date: "2026-01-01",
    status: "ACTIVE"
  },
  {
    id: "LIM-T2-AGGREGATOR",
    tier: "T2",
    persona: "AGGREGATOR",
    per_tx_limit: 100000.00,
    daily_limit: 500000.00,
    monthly_limit: 2500000.00,
    max_balance: 1000000.00,
    effective_date: "2026-06-01",
    status: "ACTIVE"
  },
  {
    id: "LIM-T2-DELIVERY",
    tier: "T2",
    persona: "DELIVERY_PERSON",
    per_tx_limit: 50000.00,
    daily_limit: 150000.00,
    monthly_limit: 500000.00,
    max_balance: 500000.00,
    effective_date: "2026-06-01",
    status: "ACTIVE"
  }
];

export const INITIAL_FEE_SCHEDULE = [
  {
    id: "FEE-01",
    service: "APMC Mandi Auction Trade",
    type: "PERCENTAGE",
    rate: 0.5, // 0.5%
    min_fee: 5.00,
    max_fee: 250.00,
    levied_on: "Buyer Settlement",
    effective_since: "2026-01-01",
    target_account: "Platform Revenue (ACC-SYS-REV-01)"
  },
  {
    id: "FEE-02",
    service: "RTO Logistics Freight Escrow",
    type: "PERCENTAGE",
    rate: 1.0, // 1%
    min_fee: 10.00,
    max_fee: 500.00,
    levied_on: "Release of Freight Hold",
    effective_since: "2026-03-15",
    target_account: "Platform Revenue (ACC-SYS-REV-01)"
  },
  {
    id: "FEE-03",
    service: "Bank Cash-Out (IMPS/NEFT Payout)",
    type: "FLAT",
    rate: 5.00, // ₹5
    min_fee: 5.00,
    max_fee: 5.00,
    levied_on: "Citizen Withdrawal Payout",
    effective_since: "2026-01-01",
    target_account: "Bank Gateway Recovery (ACC-SYS-GATEWAY-02)"
  }
];

export const INITIAL_RECONCILIATION = {
  last_reconciled_date: "2026-10-29",
  sla_target: "2 hours of file receipt",
  unmatched_alert_sla: "15 minutes",
  total_files_received: 4,
  batches: [
    {
      batch_id: "REC-2026-1029-PG",
      source: "Razorpay / UPI Payment Gateway",
      record_count: 1420,
      total_amount: 18450000.00,
      status: "MATCHED",
      unmatched_count: 0,
      completed_in: "48 minutes"
    },
    {
      batch_id: "REC-2026-1029-SBI",
      source: "State Bank of India NEFT/IMPS Nodal File",
      record_count: 382,
      total_amount: 6240000.00,
      status: "MATCHED",
      unmatched_count: 0,
      completed_in: "1 hr 12 min"
    },
    {
      batch_id: "REC-2026-1029-ESCROW",
      source: "AgriLink Internal Double-Entry Ledger (CIS-M6)",
      record_count: 1802,
      total_amount: 24690000.00,
      status: "EXCEPTION_FLAGGED",
      unmatched_count: 1,
      completed_in: "1 hr 35 min"
    }
  ],
  exceptions: [
    {
      id: "EXC-8819",
      batch_id: "REC-2026-1029-ESCROW",
      tx_ref: "TXN-98412-GATEWAY-MISMATCH",
      amount: 1500.00,
      reason: "Gateway reported SUCCESS at 23:59:58; ledger posted after midnight boundary at 00:00:03",
      severity: "LOW",
      auto_resolvable: true
    }
  ]
};

export const INITIAL_RBAC_ROLES = [
  {
    role_id: "ROLE_SUPER_ADMIN",
    name: "Platform Super Administrator",
    description: "Unrestricted access across CIS-M1 to CIS-M6 microservice operations.",
    permissions: ["user.manage", "kyc.override", "persona.approve", "limits.configure", "disputes.resolve", "audit.read", "reconcile.execute"]
  },
  {
    role_id: "ROLE_FINANCE_OPS",
    name: "Finance Operations Specialist",
    description: "Daily reconciliation, fee schedule configuration, payout monitoring.",
    permissions: ["limits.configure", "fees.manage", "reconcile.execute", "audit.read"]
  },
  {
    role_id: "ROLE_COMPLIANCE_AUDITOR",
    name: "Compliance & Dispute Officer",
    description: "KYC tier governance, persona approvals, dispute freeze/refund and hash audit examination.",
    permissions: ["persona.approve", "disputes.freeze", "disputes.resolve", "audit.read", "audit.verify_chain"]
  }
];

export const INITIAL_JWKS = {
  keys: [
    {
      kty: "RSA",
      use: "sig",
      alg: "RS256",
      kid: "agrilink-cis-2026-key-1",
      n: "uHq8G9vZ4kL1mN7xY3aB5c9eF0pQ8rT2vW5yX7zA1bC3dE6fG8hI0jK2lM4nO6pQ...",
      e: "AQAB",
      issued_at: "2026-08-01T00:00:00Z",
      expires_at: "2026-11-01T00:00:00Z",
      rotation_period_days: 90
    }
  ],
  active_token_info: {
    issuer: "https://auth.agrilink.internal/v1",
    max_token_lifetime_minutes: 15,
    signing_algorithm: "RS256 (Asymmetric PKI)",
    active_deny_list_count: 4
  }
};
