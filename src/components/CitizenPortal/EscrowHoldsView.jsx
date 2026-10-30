import React, { useState } from 'react';
import { 
  Clock, 
  ShieldCheck, 
  CheckCircle2, 
  RotateCcw, 
  AlertTriangle, 
  Layers, 
  ArrowRight,
  ExternalLink,
  ChevronDown,
  Info
} from 'lucide-react';

export default function EscrowHoldsView({
  holds,
  citizen,
  onReleaseHold,
  onRefundHold,
  onRaiseDispute
}) {
  const [selectedHold, setSelectedHold] = useState(null);
  const [disputeModalHold, setDisputeModalHold] = useState(null);
  const [disputeReason, setDisputeReason] = useState('Late delivery with partial damage');
  const [disputeAmount, setDisputeAmount] = useState('5000');

  const handleDisputeSubmit = (e) => {
    e.preventDefault();
    if (disputeModalHold) {
      onRaiseDispute({
        hold_id: disputeModalHold.id,
        business_ref: disputeModalHold.business_ref,
        reason: disputeReason,
        disputed_amount: parseFloat(disputeAmount) || disputeModalHold.held_amount
      });
      setDisputeModalHold(null);
    }
  };

  return (
    <div className="escrow-holds-view">
      <div className="view-header-row" style={{ marginBottom: '20px' }}>
        <div>
          <h2>Active Escrow Holds & Split Settlements</h2>
          <p className="text-muted">
            WAL-FR-05 & WAL-FR-06 · Atomic Multi-Actor Escrow Holds with Auto-Expiry & Split Routing
          </p>
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: '24px' }}>
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: '#fef3c7', padding: '10px', borderRadius: '12px', color: '#b45309' }}>
              <Clock size={24} />
            </div>
            <div>
              <span className="text-muted" style={{ fontSize: '0.85rem' }}>Total Active Escrow Amount</span>
              <h2 style={{ fontSize: '1.6rem', color: '#b45309', margin: '2px 0 0' }}>
                ₹{holds.filter(h => h.status === 'HELD').reduce((acc, h) => acc + h.held_amount, 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </h2>
            </div>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--slate-500)', marginTop: '12px' }}>
            Funds are securely held in an isolated escrow ledger account per business reference until milestone release or expiry refund.
          </p>
        </div>

        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: '#dbeafe', padding: '10px', borderRadius: '12px', color: '#1d4ed8' }}>
              <Layers size={24} />
            </div>
            <div>
              <span className="text-muted" style={{ fontSize: '0.85rem' }}>Atomic Split Settlement Engine</span>
              <h4 style={{ margin: '2px 0 0', color: 'var(--slate-800)' }}>Sum of Splits = Released Amount</h4>
            </div>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--slate-500)', marginTop: '12px' }}>
            Automates multi-party payments upon release: farmer proceeds, transporter freight, insurance reserve, and platform cess (WAL-FR-06).
          </p>
        </div>
      </div>

      {/* Holds List */}
      <div className="holds-list" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {holds.map((hold) => (
          <div key={hold.id} className="card hold-card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span className={`badge ${hold.status === 'HELD' ? 'badge-amber' : hold.status === 'RELEASED' ? 'badge-green' : 'badge-blue'}`}>
                    {hold.status}
                  </span>
                  <span className="font-mono text-bold" style={{ fontSize: '0.95rem' }}>{hold.id}</span>
                  <span className="badge badge-gray">{hold.module}</span>
                </div>
                <h3 style={{ fontSize: '1.1rem', margin: '4px 0' }}>{hold.purpose}</h3>
                <div className="font-mono text-muted" style={{ fontSize: '0.8rem' }}>
                  Business Reference: <strong>{hold.business_ref}</strong>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span className="text-muted" style={{ fontSize: '0.8rem' }}>Escrow Held Amount</span>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: hold.status === 'HELD' ? 'var(--accent-gold)' : 'var(--slate-800)' }}>
                  ₹{hold.held_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)' }}>
                  Expires on: {new Date(hold.expires_at).toLocaleDateString()}
                </div>
              </div>
            </div>

            {/* Split Settlement Breakdown */}
            <div style={{ background: 'var(--slate-50)', padding: '14px', borderRadius: '10px', border: '1px solid var(--slate-200)', marginBottom: '16px' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--slate-700)', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                <span>WAL-FR-06 Atomic Split Routing Table:</span>
                <span>Invariant: Σ Splits = 100% (₹{hold.held_amount.toFixed(2)})</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {hold.splits.map((split, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem', padding: '4px 0', borderBottom: i < hold.splits.length - 1 ? '1px dashed var(--slate-200)' : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <ArrowRight size={12} className="text-muted" />
                      <strong>{split.recipient}</strong>
                      <span className="badge badge-gray" style={{ fontSize: '0.65rem' }}>{split.role}</span>
                    </div>
                    <span className="font-mono text-bold">₹{split.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Bar */}
            {hold.status === 'HELD' && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button 
                  className="btn btn-outline-danger btn-sm"
                  onClick={() => setDisputeModalHold(hold)}
                >
                  <AlertTriangle size={14} />
                  <span>Raise Dispute / Freeze (WAL-FR-10)</span>
                </button>
                <button 
                  className="btn btn-secondary btn-sm"
                  onClick={() => onRefundHold(hold.id)}
                >
                  <RotateCcw size={14} />
                  <span>Simulate Expired Refund</span>
                </button>
                <button 
                  className="btn btn-primary btn-sm"
                  onClick={() => onReleaseHold(hold.id)}
                >
                  <CheckCircle2 size={14} />
                  <span>Authorize Milestone Release</span>
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Dispute Modal (WAL-FR-10) */}
      {disputeModalHold && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={18} className="text-warning" />
                <div>
                  <h3 style={{ fontSize: '1rem', margin: 0 }}>Raise Escrow Hold Dispute</h3>
                  <small className="text-muted">WAL-FR-10 Dispute Freeze</small>
                </div>
              </div>
              <button className="btn-close" onClick={() => setDisputeModalHold(null)}>✕</button>
            </div>

            <form onSubmit={handleDisputeSubmit}>
              <div className="modal-body">
                <div className="alert-callout warning" style={{ marginBottom: '14px' }}>
                  <Info size={16} />
                  <span>
                    Freezes specified amount into Dispute Suspense Account until administrator or AgriLink mediator resolution.
                  </span>
                </div>

                <div className="form-group">
                  <label className="form-label">Disputed Business Reference</label>
                  <input type="text" className="form-input font-mono" value={disputeModalHold.business_ref} readOnly />
                </div>

                <div className="form-group">
                  <label className="form-label">Amount to Freeze in Suspense (INR ₹)</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    value={disputeAmount} 
                    onChange={(e) => setDisputeAmount(e.target.value)}
                    max={disputeModalHold.held_amount}
                    required 
                  />
                  <div className="form-help">Max hold amount: ₹{disputeModalHold.held_amount.toLocaleString('en-IN')}</div>
                </div>

                <div className="form-group">
                  <label className="form-label">Dispute Reason & Claim Code</label>
                  <select 
                    className="form-select"
                    value={disputeReason}
                    onChange={(e) => setDisputeReason(e.target.value)}
                  >
                    <option value="GOODS_DAMAGED">Goods Damaged in Transit (Perishables spoiled)</option>
                    <option value="SHORT_DELIVERY">Short Delivery (Weight mismatch at mandi)</option>
                    <option value="QUALITY_BELOW_SPEC">Quality Grade Below Mandi Sample Spec</option>
                    <option value="CONTRACT_BREACH">Breach of Agreed Dispatch Timeline</option>
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setDisputeModalHold(null)}>Cancel</button>
                <button type="submit" className="btn btn-danger">Freeze to Suspense Account</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
