import React, { useState } from 'react';
import { 
  Terminal, 
  Play, 
  Key, 
  CheckCircle2, 
  Copy, 
  Layers, 
  Clock, 
  ShieldCheck, 
  Sparkles 
} from 'lucide-react';
import { INITIAL_JWKS } from '../../data/mockData';

export default function ApiExplorer({
  wallet,
  citizen
}) {
  const [selectedEndpoint, setSelectedEndpoint] = useState('GET /v1/wallets/{id}/balance');
  const [requestPayload, setRequestPayload] = useState('{}');
  const [responseOutput, setResponseOutput] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const endpoints = [
    {
      method: "GET",
      path: `/v1/wallets/${wallet.wallet_id}/balance`,
      name: "GET /v1/wallets/{id}/balance",
      purpose: "Available and held balance (WAL-FR-03, Target: 300ms 95th %ile)",
      defaultPayload: ""
    },
    {
      method: "GET",
      path: `/v1/wallets/${wallet.wallet_id}/transactions?limit=10`,
      name: "GET /v1/wallets/{id}/transactions",
      purpose: "Filterable double-entry statement (WAL-FR-03)",
      defaultPayload: ""
    },
    {
      method: "POST",
      path: "/v1/transfers",
      name: "POST /v1/transfers",
      purpose: "Direct wallet-to-wallet transfer (WAL-FR-04, Target: 800ms)",
      defaultPayload: JSON.stringify({
        idempotency_key: "idem-transfer-live-01",
        from_wallet_id: wallet.wallet_id,
        to_citizen_id: "CIT-4419-0021",
        amount: 2500.00,
        currency: "INR",
        purpose_code: "AGRI_PRODUCE_PAYMENT",
        business_ref: "AGL-HARVEST-LOT-901"
      }, null, 2)
    },
    {
      method: "POST",
      path: "/v1/holds",
      name: "POST /v1/holds",
      purpose: "Place a hold against a business reference (WAL-FR-05)",
      defaultPayload: JSON.stringify({
        idempotency_key: "idem-hold-live-02",
        wallet_id: wallet.wallet_id,
        amount: 15000.00,
        business_ref: "RTO-M4-FREIGHT-9912",
        purpose: "Freight escrow for cold transit",
        expires_at: "2026-11-04T18:00:00Z"
      }, null, 2)
    },
    {
      method: "POST",
      path: "/v1/holds/HOLD-7712/release",
      name: "POST /v1/holds/{id}/release",
      purpose: "Release hold with split list (WAL-FR-06)",
      defaultPayload: JSON.stringify({
        idempotency_key: "idem-release-split-01",
        splits: [
          { recipient: "CIT-9910-1204", role: "Carrier", amount: 13500.00 },
          { recipient: "Platform Revenue", role: "Platform Fee", amount: 150.00 },
          { recipient: "Insurance Pool", role: "Insurance", amount: 1350.00 }
        ]
      }, null, 2)
    },
    {
      method: "GET",
      path: "/v1/.well-known/jwks.json",
      name: "GET /v1/.well-known/jwks.json",
      purpose: "Public signing keys for token verification (CID-FR-10)",
      defaultPayload: ""
    },
    {
      method: "POST",
      path: "/v1/tokens/introspect",
      name: "POST /v1/tokens/introspect",
      purpose: "Token introspection and deny-list check (CID-FR-11)",
      defaultPayload: JSON.stringify({
        token: "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImFncmlsaW5rLWNpcy0yMDI2LWtleS0xIn0..."
      }, null, 2)
    }
  ];

  const handleSelectEndpoint = (ep) => {
    setSelectedEndpoint(ep.name);
    setRequestPayload(ep.defaultPayload);
    setResponseOutput(null);
  };

  const handleRunRequest = () => {
    setLoading(true);
    setResponseOutput(null);

    setTimeout(() => {
      setLoading(false);
      if (selectedEndpoint === 'GET /v1/.well-known/jwks.json') {
        setResponseOutput({
          status: 200,
          latency: "4.2 ms",
          body: INITIAL_JWKS
        });
      } else if (selectedEndpoint.includes('/balance')) {
        setResponseOutput({
          status: 200,
          latency: "18.6 ms",
          body: {
            wallet_id: wallet.wallet_id,
            citizen_id: wallet.citizen_id,
            currency: "INR",
            available_balance: wallet.available_balance,
            held_balance: wallet.held_balance,
            total_balance: wallet.total_balance,
            kyc_tier: citizen.kyc_tier,
            last_reconciled: wallet.last_updated
          }
        });
      } else if (selectedEndpoint.includes('/introspect')) {
        setResponseOutput({
          status: 200,
          latency: "38 ms (Target: <100ms)",
          body: {
            active: true,
            sub: citizen.citizen_id,
            active_persona: citizen.active_persona,
            personas: citizen.personas,
            kyc_tier: citizen.kyc_tier,
            iss: "https://auth.agrilink.internal/v1",
            aud: ["agrilink", "rto", "apmc"],
            exp: Math.floor(Date.now() / 1000) + 900,
            deny_list_status: "NOT_DENIED"
          }
        });
      } else {
        setResponseOutput({
          status: 200,
          latency: "124 ms",
          body: {
            success: true,
            message: "Atomic idempotent ledger operation committed successfully (CIS-N07)",
            executed_at: new Date().toISOString(),
            idempotency_key: "idem-committed-ok"
          }
        });
      }
    }, 400);
  };

  const handleCopyJson = () => {
    if (responseOutput) {
      navigator.clipboard.writeText(JSON.stringify(responseOutput.body, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const currentEp = endpoints.find(e => e.name === selectedEndpoint) || endpoints[0];

  return (
    <div className="api-explorer-view">
      <div className="view-header-row" style={{ marginBottom: '20px' }}>
        <div>
          <h2>Section 5.2 Key APIs & JWKS Explorer</h2>
          <p className="text-muted">
            Interactive Test Console for Citizen Identity (CID-FR-10, 11) and Double-Entry Wallet Endpoints (Section 5.2 & Section 6.5)
          </p>
        </div>
      </div>

      <div className="grid-3" style={{ gridTemplateColumns: '1fr 2fr', gap: '20px', alignItems: 'flex-start' }}>
        {/* Endpoint Selector List */}
        <div className="card">
          <div className="card-header">
            <h4 style={{ fontSize: '0.95rem', margin: 0 }}>API Endpoints (Sec 5.2)</h4>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {endpoints.map((ep) => (
              <button
                key={ep.name}
                className="endpoint-nav-btn"
                onClick={() => handleSelectEndpoint(ep)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 16px',
                  border: 'none',
                  borderBottom: '1px solid var(--slate-100)',
                  background: selectedEndpoint === ep.name ? 'var(--primary-50)' : 'white',
                  borderLeft: selectedEndpoint === ep.name ? '4px solid var(--primary-600)' : '4px solid transparent',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <span className={`badge ${ep.method === 'GET' ? 'badge-blue' : 'badge-green'}`} style={{ fontSize: '0.68rem' }}>
                  {ep.method}
                </span>
                <div style={{ overflow: 'hidden' }}>
                  <div className="font-mono text-bold" style={{ fontSize: '0.8rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                    {ep.path}
                  </div>
                  <div className="text-muted" style={{ fontSize: '0.72rem' }}>{ep.purpose}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Runner Panel */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className={`badge ${currentEp.method === 'GET' ? 'badge-blue' : 'badge-green'}`}>
                {currentEp.method}
              </span>
              <span className="font-mono text-bold" style={{ fontSize: '1rem' }}>{currentEp.path}</span>
            </div>

            <button 
              className="btn btn-primary"
              onClick={handleRunRequest}
              disabled={loading}
            >
              <Play size={14} />
              <span>{loading ? 'Executing...' : 'Send Request'}</span>
            </button>
          </div>

          <div style={{ fontSize: '0.82rem', color: 'var(--slate-600)', marginBottom: '16px' }}>
            Purpose: <strong>{currentEp.purpose}</strong>
          </div>

          {currentEp.method === 'POST' && (
            <div className="form-group">
              <label className="form-label font-mono" style={{ fontSize: '0.78rem' }}>Request Body (JSON Payload):</label>
              <textarea 
                className="form-textarea font-mono"
                rows={7}
                style={{ fontSize: '0.8rem', background: '#0f172a', color: '#10b981', border: '1px solid #1e293b' }}
                value={requestPayload}
                onChange={(e) => setRequestPayload(e.target.value)}
              />
            </div>
          )}

          {/* Response Console */}
          <div style={{ marginTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label className="form-label font-mono" style={{ fontSize: '0.78rem', margin: 0 }}>
                Response Console:
              </label>
              {responseOutput && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="badge badge-green font-mono">STATUS {responseOutput.status} OK</span>
                  <span className="badge badge-gray font-mono">{responseOutput.latency}</span>
                  <button className="btn btn-ghost btn-sm" onClick={handleCopyJson} style={{ padding: '2px 8px' }}>
                    <Copy size={12} />
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              )}
            </div>

            <pre 
              style={{
                background: '#0f172a',
                color: '#f8fafc',
                padding: '16px',
                borderRadius: '8px',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.8rem',
                minHeight: '200px',
                maxHeight: '360px',
                overflowY: 'auto',
                border: '1px solid #1e293b'
              }}
            >
              {responseOutput ? JSON.stringify(responseOutput.body, null, 2) : '// Click "Send Request" to test endpoint...'}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
