import React, { useState } from 'react';
import { KeyRound, X, Lock, AlertOctagon, CheckCircle2 } from 'lucide-react';

export default function PinModal({
  isOpen,
  onClose,
  onSuccess,
  actionPurpose = "Authorize Wallet Transaction",
  amount = null,
  isSettingPin = false,
  currentPin = "7421",
  pinFailureCount = 0,
  onPinFailed
}) {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [locked, setLocked] = useState(false);
  const [localFailures, setLocalFailures] = useState(pinFailureCount);

  if (!isOpen) return null;

  const handleDigit = (digit) => {
    if (locked) return;
    if (pin.length < 4) {
      const nextPin = pin + digit;
      setPin(nextPin);
      setError('');

      // Auto submit on 4th digit
      if (nextPin.length === 4 && !isSettingPin) {
        verifyPin(nextPin);
      }
    }
  };

  const handleBackspace = () => {
    if (locked) return;
    setPin(pin.slice(0, -1));
    setError('');
  };

  const verifyPin = (enteredPin) => {
    if (enteredPin === currentPin) {
      onSuccess();
      onClose();
    } else {
      const newFails = localFailures + 1;
      setLocalFailures(newFails);
      if (onPinFailed) onPinFailed(newFails);

      if (newFails >= 3) {
        setLocked(true);
        setError('WAL-FR-09 Security Alert: 3 incorrect PIN attempts. Your wallet has been temporarily locked to prevent unauthorized access.');
      } else {
        setError(`Incorrect Wallet PIN. Attempt ${newFails} of 3 before lockout.`);
        setPin('');
      }
    }
  };

  const handleSaveNewPin = (e) => {
    e.preventDefault();
    if (pin.length !== 4) {
      setError('PIN must be exactly 4 digits.');
      return;
    }
    if (pin !== confirmPin) {
      setError('Confirmation PIN does not match.');
      return;
    }
    onSuccess(pin);
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content pin-modal" style={{ maxWidth: '400px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ background: '#ecfdf5', padding: '6px', borderRadius: '50%', color: 'var(--primary-600)' }}>
              <Lock size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '1rem', margin: 0 }}>
                {isSettingPin ? 'Set Wallet Security PIN' : 'Enter 4-Digit Wallet PIN'}
              </h3>
              <small className="text-muted">WAL-FR-09 · Double-Entry Safeguard</small>
            </div>
          </div>
          <button className="btn-close" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="modal-body" style={{ textAlign: 'center' }}>
          {amount && (
            <div className="amount-display-tag" style={{ marginBottom: '16px' }}>
              <span className="text-muted" style={{ fontSize: '0.8rem' }}>Authorizing Payout:</span>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--slate-900)' }}>
                ₹{Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>
          )}

          {locked ? (
            <div className="alert-callout danger" style={{ textAlign: 'left', margin: '16px 0' }}>
              <AlertOctagon size={24} />
              <div>
                <strong>Wallet Locked Out</strong>
                <p style={{ margin: '4px 0 0', fontSize: '0.8rem' }}>
                  {error}
                </p>
                <div style={{ marginTop: '10px' }}>
                  <button className="btn btn-secondary btn-sm" onClick={onClose}>
                    Contact Compliance Desk
                  </button>
                </div>
              </div>
            </div>
          ) : !isSettingPin ? (
            <>
              <p style={{ fontSize: '0.85rem', color: 'var(--slate-600)', marginBottom: '16px' }}>
                {actionPurpose} (Demo PIN: <strong>{currentPin}</strong>)
              </p>

              {/* PIN Dots */}
              <div className="pin-dots-container" style={{ display: 'flex', justifyContent: 'center', gap: '16px', margin: '20px 0' }}>
                {[0, 1, 2, 3].map((idx) => (
                  <div
                    key={idx}
                    style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      background: pin.length > idx ? 'var(--primary-600)' : 'var(--slate-200)',
                      boxShadow: pin.length > idx ? '0 0 10px rgba(5, 150, 105, 0.4)' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                  />
                ))}
              </div>

              {error && (
                <div style={{ color: 'var(--danger-500)', fontSize: '0.82rem', marginBottom: '12px' }}>
                  {error}
                </div>
              )}

              {/* Interactive Keypad */}
              <div className="keypad-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', maxWidth: '260px', margin: '0 auto' }}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <button
                    key={num}
                    type="button"
                    className="keypad-btn"
                    onClick={() => handleDigit(num.toString())}
                    style={{
                      height: '52px',
                      fontSize: '1.25rem',
                      fontWeight: 600,
                      borderRadius: '12px',
                      border: '1px solid var(--slate-200)',
                      background: 'white',
                      cursor: 'pointer'
                    }}
                  >
                    {num}
                  </button>
                ))}
                <button
                  type="button"
                  className="keypad-btn"
                  onClick={() => setPin('')}
                  style={{
                    height: '52px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    borderRadius: '12px',
                    border: '1px solid var(--slate-200)',
                    background: 'var(--slate-50)',
                    cursor: 'pointer'
                  }}
                >
                  Clear
                </button>
                <button
                  type="button"
                  className="keypad-btn"
                  onClick={() => handleDigit('0')}
                  style={{
                    height: '52px',
                    fontSize: '1.25rem',
                    fontWeight: 600,
                    borderRadius: '12px',
                    border: '1px solid var(--slate-200)',
                    background: 'white',
                    cursor: 'pointer'
                  }}
                >
                  0
                </button>
                <button
                  type="button"
                  className="keypad-btn"
                  onClick={handleBackspace}
                  style={{
                    height: '52px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    borderRadius: '12px',
                    border: '1px solid var(--slate-200)',
                    background: 'var(--slate-50)',
                    cursor: 'pointer'
                  }}
                >
                  ⌫
                </button>
              </div>
            </>
          ) : (
            <form onSubmit={handleSaveNewPin}>
              <div className="form-group">
                <label className="form-label">Create 4-Digit Wallet PIN</label>
                <input
                  type="password"
                  maxLength={4}
                  className="form-input font-mono"
                  style={{ textAlign: 'center', fontSize: '1.25rem', letterSpacing: '0.3em' }}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm 4-Digit PIN</label>
                <input
                  type="password"
                  maxLength={4}
                  className="form-input font-mono"
                  style={{ textAlign: 'center', fontSize: '1.25rem', letterSpacing: '0.3em' }}
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  required
                />
              </div>
              {error && <div style={{ color: 'var(--danger-500)', fontSize: '0.82rem', marginBottom: '12px' }}>{error}</div>}
              <button type="submit" className="btn btn-primary btn-block">
                Save & Activate PIN
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
