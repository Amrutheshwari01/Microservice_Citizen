import React, { useState } from 'react';
import { 
  X, 
  ArrowUpRight, 
  Send, 
  AlertCircle, 
  ShieldCheck, 
  Info, 
  Hash, 
  CheckCircle2,
  RefreshCw
} from 'lucide-react';

export default function WalletTransferModal({
  isOpen,
  onClose,
  wallet,
  citizen,
  tierLimits,
  onPerformTransfer
}) {
  const [recipientId, setRecipientId] = useState('CIT-4419-0021');
  const [recipientName, setRecipientName] = useState('Nashik APMC Mandi Trader');
  const [amount, setAmount] = useState('');
  const [purposeCode, setPurposeCode] = useState('AGRI_PRODUCE_PAYMENT');
  const [businessRef, setBusinessRef] = useState(`AGL-TXN-${Date.now().toString().slice(-6)}`);
  const [idempotencyKey, setIdempotencyKey] = useState(`idem-${Math.random().toString(36).substring(2, 10)}`);
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleGenerateIdempotency = () => {
    setIdempotencyKey(`idem-${Math.random().toString(36).substring(2, 10)}`);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);

    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please specify a valid transfer amount greater than 0.');
      return;
    }

    if (numAmount > wallet.available_balance) {
      setError(`Insufficient available balance! Available: ₹${wallet.available_balance.toLocaleString('en-IN')}`);
      return;
    }

    if (numAmount > tierLimits.per_tx_limit) {
      setError(`Amount exceeds your ${citizen.kyc_tier} single transaction limit of ₹${tierLimits.per_tx_limit.toLocaleString('en-IN')}. Please upgrade KYC.`);
      return;
    }

    if (wallet.today_spent + numAmount > tierLimits.daily_limit) {
      setError(`This transfer will breach your daily spending velocity limit of ₹${tierLimits.daily_limit.toLocaleString('en-IN')}.`);
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onPerformTransfer({
        recipientId,
        recipientName,
        amount: numAmount,
        purposeCode,
        businessRef,
        idempotencyKey,
        description: description || `Transfer for ${purposeCode}`
      });
      onClose();
    }, 600);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '520px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ background: '#ecfdf5', padding: '6px', borderRadius: '50%', color: 'var(--primary-600)' }}>
              <ArrowUpRight size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', margin: 0 }}>Direct Wallet-to-Wallet Transfer</h3>
              <small className="text-muted">WAL-FR-04 · Atomic & Idempotent Transfer</small>
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
              <label className="form-label">Recipient Citizen ID or Mobile</label>
              <input 
                type="text" 
                className="form-input font-mono" 
                placeholder="e.g. CIT-4419-0021" 
                value={recipientId} 
                onChange={(e) => {
                  setRecipientId(e.target.value);
                  setError('');
                }}
                required 
              />
              <div className="form-help">Counterparty: <strong>{recipientName}</strong> (Verified Citizen)</div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Amount (INR ₹)</label>
                <input 
                  type="number" 
                  step="0.01"
                  className="form-input" 
                  placeholder="0.00" 
                  value={amount} 
                  onChange={(e) => {
                    setAmount(e.target.value);
                    setError('');
                  }}
                  required 
                />
                <div className="form-help">Avail: ₹{wallet.available_balance.toLocaleString('en-IN')}</div>
              </div>

              <div className="form-group">
                <label className="form-label">Purpose Code (CIS-M6)</label>
                <select 
                  className="form-select"
                  value={purposeCode}
                  onChange={(e) => setPurposeCode(e.target.value)}
                >
                  <option value="AGRI_PRODUCE_PAYMENT">Agri Produce Payment</option>
                  <option value="SEED_FERTILIZER_PURCHASE">Seed / Fertilizer Input</option>
                  <option value="LOGISTICS_FREIGHT_HOLD">Logistics Freight Payout</option>
                  <option value="EQUIPMENT_RENTAL">Tractor / Harvester Rental</option>
                  <option value="MANDI_TRADE_SETTLEMENT">APMC Mandi Settlement</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <label className="form-label" style={{ margin: 0 }}>Business Reference Code</label>
                <span className="badge badge-gray font-mono" style={{ fontSize: '0.7rem' }}>S04 Correlation</span>
              </div>
              <input 
                type="text" 
                className="form-input font-mono" 
                value={businessRef}
                onChange={(e) => setBusinessRef(e.target.value)}
                required 
              />
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <label className="form-label" style={{ margin: 0 }}>Idempotency Key (CIS-N07 Invariant)</label>
                <button 
                  type="button" 
                  className="link-btn" 
                  style={{ fontSize: '0.75rem' }}
                  onClick={handleGenerateIdempotency}
                >
                  <RefreshCw size={12} /> Regenerate
                </button>
              </div>
              <input 
                type="text" 
                className="form-input font-mono" 
                value={idempotencyKey}
                readOnly
                style={{ background: 'var(--slate-50)' }}
              />
              <div className="form-help">Guarantees exactly-once ledger execution without duplicate debit.</div>
            </div>

            <div className="form-group">
              <label className="form-label">Transaction Note (Optional)</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="e.g. Payment for 10 bags organic urea" 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Executing Atomic Ledger Debit...' : 'Send Transfer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
