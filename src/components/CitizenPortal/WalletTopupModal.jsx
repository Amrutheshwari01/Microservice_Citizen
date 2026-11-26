import React, { useState } from 'react';
import { 
  X, 
  ArrowDownLeft, 
  CreditCard, 
  Smartphone, 
  CheckCircle2, 
  ShieldCheck,
  RefreshCw
} from 'lucide-react';

export default function WalletTopupModal({
  isOpen,
  onClose,
  wallet,
  tierLimits,
  onTopupSuccess,
  onUpdateWalletLimit
}) {
  const [amount, setAmount] = useState('2000');
  const [gatewayMethod, setGatewayMethod] = useState('UPI'); // 'UPI', 'CARD', 'NETBANKING'
  const [upiId, setUpiId] = useState('ramesh@okhdfcbank');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('FORM'); // 'FORM', 'GATEWAY_SIMULATION', 'SUCCESS'
  const [txDetails, setTxDetails] = useState(null);
  const [maxBalanceInput, setMaxBalanceInput] = useState(null);
  const [savingLimit, setSavingLimit] = useState(false);
  const [feedback, setFeedback] = useState(null);

  if (!isOpen) return null;

  const quickAmounts = ['500', '1000', '2000', '5000', '10000'];

  const configuredMaxBalance = Number(wallet.max_balance ?? tierLimits.max_balance);

  const handleClose = () => {
    if (loading) return;
    setStep('FORM');
    setTxDetails(null);
    setFeedback(null);
    onClose();
  };

  const handleSaveWalletLimit = async () => {
    const newLimit = Number(maxBalanceInput ?? wallet.max_balance ?? tierLimits.max_balance);
    if (!Number.isFinite(newLimit) || newLimit < wallet.total_balance) {
      setFeedback({
        type: 'error',
        text: 'Your wallet limit cannot be lower than your current total balance.'
      });
      return;
    }
    if (newLimit > tierLimits.max_balance) {
      setFeedback({
        type: 'error',
        text: `Your current KYC tier allows a maximum wallet balance of ₹${tierLimits.max_balance.toLocaleString('en-IN')}.`
      });
      return;
    }

    setSavingLimit(true);
    setFeedback(null);
    try {
      await onUpdateWalletLimit(newLimit);
      setFeedback({ type: 'success', text: 'Your wallet limit was saved.' });
    } catch (error) {
      setFeedback({ type: 'error', text: error.message || 'Could not save your wallet limit.' });
    } finally {
      setSavingLimit(false);
    }
  };

  const handleStartTopup = async (e) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 10) {
      setFeedback({ type: 'error', text: 'Minimum top-up amount is ₹10.' });
      return;
    }

    if (wallet.total_balance + numAmount > configuredMaxBalance) {
      setFeedback({
        type: 'error',
        text: `This top-up would exceed your configured wallet limit of ₹${configuredMaxBalance.toLocaleString('en-IN')}. Adjust your limit or upgrade KYC.`
      });
      return;
    }

    setFeedback(null);
    setStep('GATEWAY_SIMULATION');
    setLoading(true);

    setTimeout(() => {
      const topupData = {
        business_ref: `PG-WEBHOOK-${Math.floor(100000 + Math.random() * 900000)}`,
        amount: numAmount,
        method: gatewayMethod,
        channel: gatewayMethod === 'UPI' ? upiId : 'HDFC Netbanking',
        provider_reference: `PG-${Date.now()}`,
        timestamp: new Date().toISOString()
      };
      Promise.resolve(onTopupSuccess(topupData))
        .then((response) => {
          setTxDetails({
            ...topupData,
            topup_id: response?.transaction_id || topupData.business_ref,
            idempotency_key: response?.idempotency_key || 'Processed by wallet service'
          });
          setStep('SUCCESS');
        })
        .catch((error) => {
          setStep('FORM');
          setFeedback({ type: 'error', text: error.message || 'Top-up failed. Please try again.' });
        })
        .finally(() => setLoading(false));
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
              <small className="text-muted">Secure Payment Gateway</small>
            </div>
          </div>
          <button className="btn-close" onClick={handleClose} disabled={loading}><X size={18} /></button>
        </div>

        {step === 'FORM' && (
          <form onSubmit={handleStartTopup}>
            <div className="modal-body">
              {feedback && (
                <div className={`alert-callout ${feedback.type}`} role="status">
                  <span>{feedback.text}</span>
                </div>
              )}
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
                <div className="form-help">Available headroom: ₹{Math.max(0, configuredMaxBalance - wallet.total_balance).toLocaleString('en-IN')}</div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="wallet-max-balance">Personal wallet balance limit (₹)</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    id="wallet-max-balance"
                    type="number"
                    min={wallet.total_balance}
                    max={tierLimits.max_balance}
                    step="1"
                    className="form-input"
                    value={maxBalanceInput ?? wallet.max_balance ?? tierLimits.max_balance}
                    onChange={(e) => setMaxBalanceInput(e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleSaveWalletLimit}
                    disabled={savingLimit}
                  >
                    {savingLimit ? 'Saving…' : 'Save limit'}
                  </button>
                </div>
                <div className="form-help">You can set a lower personal cap up to your KYC tier maximum of ₹{tierLimits.max_balance.toLocaleString('en-IN')}.</div>
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
              <button type="button" className="btn btn-secondary" onClick={handleClose} disabled={loading}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
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
              <div><strong>Event Published:</strong> <span className="badge badge-green">Wallet Credited</span></div>
            </div>

            <button className="btn btn-primary btn-block" onClick={handleClose}>
              Done & Return to Wallet
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
