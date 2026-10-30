import React, { useState } from 'react';
import { 
  X, 
  Building2, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Lock 
} from 'lucide-react';

export default function WalletCashoutModal({
  isOpen,
  onClose,
  wallet,
  citizen,
  tierLimits,
  onRequirePinForCashout
}) {
  const [selectedBankId, setSelectedBankId] = useState(citizen.verified_bank_accounts[0]?.id || '');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [payoutFee, setPayoutFee] = useState(5.00); // WAL-FR-13: ₹5 flat payout fee

  if (!isOpen) return null;

  const selectedBank = citizen.verified_bank_accounts.find(b => b.id === selectedBankId) || citizen.verified_bank_accounts[0];

  const handleSubmit = (e) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);

    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid cash-out withdrawal amount.');
      return;
    }

    const totalDebit = numAmount + payoutFee;
    if (totalDebit > wallet.available_balance) {
      setError(`Insufficient available balance! Required: ₹${totalDebit.toLocaleString('en-IN')} (incl. ₹5 IMPS payout fee). Available: ₹${wallet.available_balance.toLocaleString('en-IN')}`);
      return;
    }

    if (numAmount > tierLimits.per_tx_limit) {
      setError(`Amount exceeds your ${citizen.kyc_tier} cash-out limit of ₹${tierLimits.per_tx_limit.toLocaleString('en-IN')}.`);
      return;
    }

    // Trigger PIN prompt for WAL-FR-09 & WAL-FR-07
    onRequirePinForCashout({
      amount: numAmount,
      fee: payoutFee,
      bank: selectedBank,
      business_ref: `CASHOUT-${Date.now().toString().slice(-6)}`
    });
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '480px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ background: '#ecfdf5', padding: '6px', borderRadius: '50%', color: 'var(--primary-600)' }}>
              <Building2 size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', margin: 0 }}>Cash-Out to Verified Bank Account</h3>
              <small className="text-muted">WAL-FR-07 · Direct Payout via Nodal Rail</small>
            </div>
          </div>
          <button className="btn-close" onClick={onClose}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div className="alert-callout danger" style={{ marginBottom: '14px' }}>
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Select Verified Destination Bank Account</label>
              <div className="bank-selection-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {citizen.verified_bank_accounts.map(bank => (
                  <label 
                    key={bank.id} 
                    className="bank-card-option"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 14px',
                      borderRadius: '10px',
                      border: selectedBankId === bank.id ? '2px solid var(--primary-600)' : '1px solid var(--slate-200)',
                      background: selectedBankId === bank.id ? 'var(--primary-50)' : 'white',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <input 
                        type="radio" 
                        name="bank-select" 
                        checked={selectedBankId === bank.id} 
                        onChange={() => setSelectedBankId(bank.id)}
                      />
                      <div>
                        <strong>{bank.bank_name}</strong>
                        <div className="font-mono text-muted" style={{ fontSize: '0.8rem' }}>
                          A/C {bank.account_number} · IFSC: {bank.ifsc}
                        </div>
                      </div>
                    </div>
                    {bank.is_primary && <span className="badge badge-green">Primary</span>}
                  </label>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Cash-Out Amount (INR ₹)</label>
              <input 
                type="number" 
                step="0.01" 
                className="form-input" 
                placeholder="Enter amount to withdraw"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setError('');
                }}
                required 
              />
              <div className="form-help">Available: ₹{wallet.available_balance.toLocaleString('en-IN')}</div>
            </div>

            <div className="fee-summary-box" style={{ background: 'var(--slate-100)', padding: '12px 14px', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span>Withdrawal Principal:</span>
                <strong>₹{amount ? Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', color: 'var(--slate-600)' }}>
                <span>Banking Gateway Fee (WAL-FR-13):</span>
                <span>₹{payoutFee.toFixed(2)}</span>
              </div>
              <div style={{ borderTop: '1px solid var(--slate-300)', paddingTop: '6px', marginTop: '6px', display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                <span>Total Wallet Debit:</span>
                <span style={{ color: 'var(--primary-800)' }}>
                  ₹{(amount ? Number(amount) + payoutFee : 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="alert-callout info">
              <Clock size={16} />
              <span>
                <strong>Cooling Period Compliance:</strong> Risk screening checks cooling period & daily velocity before posting <code>PAYOUT_PENDING</code>.
              </span>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              <Lock size={14} />
              <span>Authenticate with Wallet PIN</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
