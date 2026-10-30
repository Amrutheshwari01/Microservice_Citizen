import React, { useState } from 'react';
import { ShieldAlert, X, Smartphone, CheckCircle2, Lock } from 'lucide-react';

export default function MfaModal({
  isOpen,
  onClose,
  onVerified,
  actionTitle = "Sensitive Action",
  thresholdNote = "Step-up authentication required by policy (CIS-N03 / WAL-FR-11)"
}) {
  const [otp, setOtp] = useState('');
  const [method, setMethod] = useState('SMS_OTP'); // 'SMS_OTP', 'AUTHENTICATOR'
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleVerify = (e) => {
    e.preventDefault();
    if (!otp || otp.length < 4) {
      setError('Please enter the 4-digit MFA verification code.');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onVerified();
      onClose();
    }, 450);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '440px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ background: '#fef3c7', padding: '6px', borderRadius: '50%', color: '#b45309' }}>
              <ShieldAlert size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', margin: 0 }}>Step-Up MFA Challenge</h3>
              <small className="text-muted">CIS-M1 · Step-Up Verification</small>
            </div>
          </div>
          <button className="btn-close" onClick={onClose}><X size={18} /></button>
        </div>

        <form onSubmit={handleVerify}>
          <div className="modal-body">
            <div className="alert-callout warning" style={{ marginBottom: '16px' }}>
              <Lock size={16} />
              <div>
                <strong>{actionTitle}</strong>
                <p style={{ margin: '2px 0 0', fontSize: '0.8rem' }}>{thresholdNote}</p>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Authentication Method</label>
              <div className="radio-group">
                <label className="radio-label">
                  <input 
                    type="radio" 
                    name="mfa-type" 
                    checked={method === 'SMS_OTP'} 
                    onChange={() => setMethod('SMS_OTP')} 
                  />
                  <span>SMS to +91 ••••••3210</span>
                </label>
                <label className="radio-label">
                  <input 
                    type="radio" 
                    name="mfa-type" 
                    checked={method === 'AUTHENTICATOR'} 
                    onChange={() => setMethod('AUTHENTICATOR')} 
                  />
                  <span>Authenticator App (TOTP)</span>
                </label>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Enter Security Code (Demo: 9942)</label>
              <input 
                type="text" 
                className="form-input font-mono" 
                style={{ fontSize: '1.2rem', letterSpacing: '0.2em', textAlign: 'center' }}
                placeholder="• • • •" 
                maxLength={6}
                value={otp}
                onChange={(e) => {
                  setOtp(e.target.value);
                  setError('');
                }}
                autoFocus
              />
              {error && <p className="form-error" style={{ color: 'var(--danger-500)', fontSize: '0.8rem', marginTop: '4px' }}>{error}</p>}
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Verifying MFA...' : 'Authorize Action'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
