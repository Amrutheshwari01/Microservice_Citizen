import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Smartphone, 
  Laptop, 
  Tablet, 
  Trash2, 
  LogOut, 
  KeyRound, 
  Lock, 
  CheckCircle2, 
  AlertTriangle,
  RefreshCw,
  Sliders
} from 'lucide-react';

export default function SecuritySessionsView({
  sessions,
  citizen,
  onRevokeSession,
  onRevokeAllOtherSessions,
  onOpenPinManage,
  onUpdateSecuritySettings
}) {
  const [mfaThreshold, setMfaThreshold] = useState(citizen.mfa_threshold_amount || 10000);
  const [mfaMethod, setMfaMethod] = useState(citizen.mfa_method || 'SMS_OTP');
  const [successMsg, setSuccessMsg] = useState(null);

  const handleSaveThreshold = (e) => {
    e.preventDefault();
    onUpdateSecuritySettings({
      mfa_threshold_amount: parseFloat(mfaThreshold),
      mfa_method: mfaMethod
    });
    setSuccessMsg('Security step-up threshold updated successfully! (CIS-N03)');
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const getDeviceIcon = (type) => {
    switch (type) {
      case 'MOBILE': return <Smartphone size={20} className="text-primary" />;
      case 'TABLET': return <Tablet size={20} className="text-primary" />;
      default: return <Laptop size={20} className="text-primary" />;
    }
  };

  return (
    <div className="security-sessions-view">
      <div className="view-header-row" style={{ marginBottom: '24px' }}>
        <div>
          <h2>Security, Active Sessions & Token Deny-List</h2>
          <p className="text-muted">
            CID-FR-03, CID-FR-04 & WAL-FR-09 · Active Device Management, Immediate Token Revocation, and Step-Up Policy Control
          </p>
        </div>
      </div>

      {successMsg && (
        <div className="alert-callout success" style={{ marginBottom: '20px' }}>
          <CheckCircle2 size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="grid-2" style={{ gap: '24px', alignItems: 'flex-start' }}>
        {/* Left Column: Active Sessions & Devices (CID-FR-03) */}
        <div className="card">
          <div className="card-header">
            <div>
              <h3>Active Devices & Sessions</h3>
              <small className="text-muted">CID-FR-03 · Immediate Deny-List Addition</small>
            </div>
            {sessions.filter(s => !s.current).length > 0 && (
              <button 
                className="btn btn-outline-danger btn-sm"
                onClick={onRevokeAllOtherSessions}
              >
                <LogOut size={14} />
                <span>Revoke All Other Devices</span>
              </button>
            )}
          </div>

          <div className="card-body" style={{ padding: '0 20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {sessions.map((ses, idx) => (
                <div 
                  key={ses.id}
                  style={{
                    padding: '16px 0',
                    borderBottom: idx < sessions.length - 1 ? '1px solid var(--slate-100)' : 'none',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '12px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ background: 'var(--slate-100)', padding: '10px', borderRadius: '10px' }}>
                      {getDeviceIcon(ses.device_type)}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <strong style={{ fontSize: '0.92rem' }}>{ses.device_name}</strong>
                        {ses.current && <span className="badge badge-green">THIS DEVICE</span>}
                      </div>
                      <div className="text-muted font-mono" style={{ fontSize: '0.75rem' }}>
                        IP: {ses.ip_address} · {ses.location}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--slate-500)', marginTop: '2px' }}>
                        Last Active: {ses.last_active} · Issued: {new Date(ses.issued_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  {!ses.current ? (
                    <button 
                      className="btn btn-outline-danger btn-sm"
                      onClick={() => onRevokeSession(ses.id)}
                      title="Revoke session and push to deny-list"
                    >
                      <Trash2 size={14} />
                      <span>Revoke</span>
                    </button>
                  ) : (
                    <span className="font-mono text-muted" style={{ fontSize: '0.75rem' }}>
                      Refresh Token Rotated
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Wallet PIN & Step-Up MFA Thresholds */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* PIN Management (WAL-FR-09) */}
          <div className="card">
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Lock size={18} className="text-primary" />
                <h3>Wallet 4-Digit Security PIN (WAL-FR-09)</h3>
              </div>
              <span className={`badge ${citizen.wallet_locked ? 'badge-red' : 'badge-green'}`}>
                {citizen.wallet_locked ? 'LOCKED OUT' : 'PIN ACTIVE'}
              </span>
            </div>

            <div className="card-body">
              <p style={{ fontSize: '0.85rem', color: 'var(--slate-600)', marginBottom: '16px' }}>
                Protects bank withdrawals and high-value wallet debits. Repeated incorrect entries trigger temporary lock to prevent brute-forcing.
              </p>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--slate-50)', padding: '12px 16px', borderRadius: '10px', marginBottom: '16px' }}>
                <div>
                  <span className="text-muted" style={{ fontSize: '0.75rem' }}>Current PIN Status:</span>
                  <div style={{ fontWeight: 600 }}>•••• (Configured)</div>
                  <small className="text-muted">Failed Attempts: {citizen.pin_failed_attempts} / 3</small>
                </div>

                <button className="btn btn-secondary btn-sm" onClick={onOpenPinManage}>
                  Change PIN
                </button>
              </div>

              {citizen.wallet_locked && (
                <div className="alert-callout danger">
                  <AlertTriangle size={16} />
                  <span>Wallet is currently locked out due to failed attempts. Contact admin desk to unlock.</span>
                </div>
              )}
            </div>
          </div>

          {/* Step-Up Authentication Thresholds (CIS-N03 & WAL-FR-11) */}
          <div className="card">
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={18} className="text-primary" />
                <h3>MFA Step-Up Policy Settings</h3>
              </div>
              <span className="badge badge-purple">CIS-N03 Security</span>
            </div>

            <div className="card-body">
              <form onSubmit={handleSaveThreshold}>
                <div className="form-group">
                  <label className="form-label">Step-Up MFA Debit Threshold (INR ₹)</label>
                  <input 
                    type="number" 
                    step="500" 
                    className="form-input" 
                    value={mfaThreshold}
                    onChange={(e) => setMfaThreshold(e.target.value)}
                    required 
                  />
                  <div className="form-help">
                    Transfers exceeding this amount automatically demand step-up MFA challenge.
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Preferred Step-Up Challenge Method</label>
                  <select 
                    className="form-select"
                    value={mfaMethod}
                    onChange={(e) => setMfaMethod(e.target.value)}
                  >
                    <option value="SMS_OTP">SMS OTP to verified mobile number (+91 98765 43210)</option>
                    <option value="AUTHENTICATOR">Time-based TOTP Authenticator (Google / Microsoft Auth)</option>
                    <option value="BIOMETRIC">DigiLocker / Biometric Liveness Challenge</option>
                  </select>
                </div>

                <button type="submit" className="btn btn-secondary btn-block">
                  Update Step-Up Policy Rules
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
