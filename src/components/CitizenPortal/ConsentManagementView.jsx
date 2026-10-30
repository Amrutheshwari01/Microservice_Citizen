import React from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  ExternalLink, 
  Clock, 
  Lock, 
  Eye, 
  Info 
} from 'lucide-react';

export default function ConsentManagementView({
  consents,
  citizen,
  onToggleConsent
}) {
  return (
    <div className="consent-management-view">
      <div className="view-header-row" style={{ marginBottom: '24px' }}>
        <div>
          <h2>Cross-Service Consent Management Matrix</h2>
          <p className="text-muted">
            CID-FR-12 · Granular Data Governance: Grant and Withdraw Data Sharing Across AgriLink, RTO Logistics, and APMC State Mandi
          </p>
        </div>
      </div>

      <div className="alert-callout info" style={{ marginBottom: '24px' }}>
        <Lock size={18} />
        <div>
          <strong>Privacy by Design (CIS-N04):</strong>
          <p style={{ margin: '2px 0 0', fontSize: '0.85rem' }}>
            No personal identity, KYC documents, or transaction ledger data is disclosed to calling microservices without an explicit, cryptographically timestamped consent record in the <code>consent</code> database table.
          </p>
        </div>
      </div>

      <div className="consents-list" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {consents.map((consent) => (
          <div 
            key={consent.id} 
            className="card consent-card"
            style={{
              padding: '24px',
              borderLeft: consent.granted ? '6px solid var(--primary-600)' : '6px solid var(--slate-300)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span className={`badge ${consent.granted ? 'badge-green' : 'badge-gray'}`}>
                    {consent.granted ? 'ACCESS GRANTED' : 'CONSENT WITHDRAWN'}
                  </span>
                  <span className="font-mono text-bold" style={{ fontSize: '0.85rem' }}>{consent.service_id}</span>
                </div>
                <h3 style={{ fontSize: '1.2rem', margin: '4px 0' }}>{consent.service_name}</h3>
                <p style={{ fontSize: '0.88rem', color: 'var(--slate-600)', margin: '4px 0 0', maxWidth: '640px' }}>
                  {consent.description}
                </p>
              </div>

              <div>
                {consent.granted ? (
                  <button 
                    className="btn btn-outline-danger"
                    onClick={() => onToggleConsent(consent.id, false)}
                  >
                    <XCircle size={16} />
                    <span>Withdraw Consent</span>
                  </button>
                ) : (
                  <button 
                    className="btn btn-primary"
                    onClick={() => onToggleConsent(consent.id, true)}
                  >
                    <CheckCircle2 size={16} />
                    <span>Grant Access</span>
                  </button>
                )}
              </div>
            </div>

            {/* Data Points Covered */}
            <div style={{ background: 'var(--slate-50)', padding: '14px 18px', borderRadius: '10px', border: '1px solid var(--slate-200)', marginBottom: '14px' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--slate-700)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Eye size={14} />
                <span>Permitted Data Attributes Disclosed under this Grant:</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {consent.data_points.map((dp, i) => (
                  <span 
                    key={i} 
                    className="badge"
                    style={{ 
                      background: consent.granted ? 'white' : 'var(--slate-200)',
                      border: '1px solid var(--slate-300)',
                      color: consent.granted ? 'var(--slate-800)' : 'var(--slate-500)',
                      textTransform: 'none',
                      fontSize: '0.78rem'
                    }}
                  >
                    ✓ {dp}
                  </span>
                ))}
              </div>
            </div>

            {/* Audit Timestamps */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--slate-500)' }}>
              <span>
                {consent.granted && consent.granted_at && (
                  <>Granted At: <strong className="font-mono">{new Date(consent.granted_at).toLocaleString()}</strong></>
                )}
                {!consent.granted && consent.withdrawn_at && (
                  <>Withdrawn At: <strong className="font-mono">{new Date(consent.withdrawn_at).toLocaleString()}</strong></>
                )}
              </span>
              <span className="font-mono">Enforced at API Gateway by Token Scopes</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
