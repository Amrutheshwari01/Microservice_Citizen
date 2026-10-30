import React, { useState } from 'react';
import { 
  X, 
  ArrowDownLeft, 
  CreditCard, 
  Smartphone, 
  CheckCircle2, 
  ExternalLink,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';

export default function WalletTopupModal({
  isOpen,
  onClose,
  wallet,
  citizen,
  tierLimits,
  onTopupSuccess
}) {
  const [amount, setAmount] = useState('2000');
  const [gatewayMethod, setGatewayMethod] = useState('UPI'); // 'UPI', 'CARD', 'NETBANKING'
  const [upiId, setUpiId] = useState('ramesh@okhdfcbank');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('FORM'); // 'FORM', 'GATEWAY_SIMULATION', 'SUCCESS'
  const [txDetails, setTxDetails] = useState(null);

  if (!isOpen) return null;

  const quickAmounts = ['500', '1000', '2000', '5000', '10000'];

  const handleStartTopup = (e) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 10) {
      alert('Minimum top-up amount is ₹10.');
      return;
    }

    if (wallet.total_balance + numAmount > tierLimits.max_balance) {
      alert(`Top-up would exceed your max balance limit of ₹${tierLimits.max_balance.toLocaleString('en-IN')}. Upgrade KYC tier.`);
      return;
    }

    setStep('GATEWAY_SIMULATION');
    setLoading(true);

    // Simulate Payment Gateway Intent + Signed Webhook confirmation (WAL-FR-02)
    setTimeout(() => {
      setLoading(false);
      const generatedTx = {
        topup_id: `TOPUP-${Date.now().toString().slice(-6)}`,
        business_ref: `PG-WEBHOOK-${Math.floor(100000 + Math.random() * 900000)}`,
        amount: numAmount,
        method: gatewayMethod,
        channel: gatewayMethod === 'UPI' ? upiId : 'HDFC Netbanking',
        idempotency_key: `idem-pg-topup-${Math.random().toString(36).substring(2, 9)}`,
        timestamp: new Date().toISOString()
      };
      setTxDetails(generatedTx);
      setStep('SUCCESS');
      onTopupSuccess(generatedTx);
    }, 1500);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '480px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ background: '#ecfdf5', padding: '6px', borderRadius: '50%', color: 'var(--primary-600)' }}>
              <ArrowDownLeft size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', margin: 0 }}>Top-Up Citizen INR Wallet</h3>
              <small className="text-muted">WAL-FR-02 · Payment Gateway Adapter</small>
            </div>
          </div>
          <button className="btn-close" onClick={onClose}><X size={18} /></button>
        </div>

        {step === 'FORM' && (
          <form onSubmit={handleStartTopup}>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Top-Up Amount (INR ₹)</label>
                <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
                  {quickAmounts.map(val => (
                    <button
                      key={val}
                      type="button"
                      className={`btn btn-sm ${amount === val ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setAmount(val)}
                    >
                      +₹{val}
                    </button>
                  ))}
                </div>
                <input 
                  type="number" 
                  step="1"
                  className="form-input" 
                  placeholder="Enter custom amount" 
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required 
                />
                <div className="form-help">Max wallet headroom: ₹{(tierLimits.max_balance - wallet.total_balance).toLocaleString('en-IN')}</div>
              </div>

              <div className="form-group">
                <label className="form-label">Select Payment Channel</label>
                <div className="radio-group">
                  <label className="radio-label">
                    <input 
                      type="radio" 
                      name="pg-method" 
                      checked={gatewayMethod === 'UPI'} 
                      onChange={() => setGatewayMethod('UPI')} 
                    />
                    <Smartphone size={16} />
                    <span>UPI (GPay / PhonePe / BHIM)</span>
                  </label>
                  <label className="radio-label">
                    <input 
                      type="radio" 
                      name="pg-method" 
                      checked={gatewayMethod === 'NETBANKING'} 
                      onChange={() => setGatewayMethod('NETBANKING')} 
                    />
                    <CreditCard size={16} />
                    <span>Net Banking (SBI / HDFC / ICICI)</span>
                  </label>
                </div>
              </div>

              {gatewayMethod === 'UPI' && (
                <div className="form-group">
                  <label className="form-label">Virtual Payment Address (VPA)</label>
                  <input 
                    type="text" 
                    className="form-input font-mono" 
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="mobile@upi" 
                    required 
                  />
                </div>
              )}

              <div className="alert-callout info">
                <ShieldCheck size={16} />
                <span>Zero convenience fee. Funds credited instantly upon gateway webhook verification.</span>
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Proceed to Gateway (₹{amount})
              </button>
            </div>
          </form>
        )}

        {step === 'GATEWAY_SIMULATION' && (
          <div className="modal-body" style={{ textAlign: 'center', padding: '36px 20px' }}>
            <div className="spinner-orbit" style={{ margin: '0 auto 20px' }}>
              <RefreshCw size={40} className="spinning text-primary" />
            </div>
            <h4>Connecting to Payment Gateway...</h4>
            <p className="text-muted" style={{ fontSize: '0.85rem', maxWidth: '320px', margin: '8px auto 0' }}>
              Processing signed token intent for <strong>₹{amount}</strong>. Waiting for webhook callback confirmation...
            </p>
          </div>
        )}

        {step === 'SUCCESS' && txDetails && (
          <div className="modal-body" style={{ textAlign: 'center', padding: '24px 20px' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#ecfdf5', color: 'var(--primary-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <CheckCircle2 size={32} />
            </div>
            <h3 style={{ color: 'var(--primary-800)' }}>Top-Up Successful!</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--slate-600)' }}>
              INR <strong>₹{txDetails.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong> has been credited to your Citizen Wallet.
            </p>

            <div className="font-mono" style={{ background: 'var(--slate-100)', padding: '12px', borderRadius: '8px', fontSize: '0.78rem', textAlign: 'left', margin: '16px 0' }}>
              <div><strong>Gateway Ref:</strong> {txDetails.business_ref}</div>
              <div><strong>Idempotency Key:</strong> {txDetails.idempotency_key}</div>
              <div><strong>Event Published:</strong> <span className="badge badge-green">WalletCredited (WAL-FR-14)</span></div>
            </div>

            <button className="btn btn-primary btn-block" onClick={onClose}>
              Done & Return to Wallet
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
