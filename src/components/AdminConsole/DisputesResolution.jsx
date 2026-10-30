import React, { useState } from 'react';
import { 
  AlertTriangle, 
  RotateCcw, 
  CheckCircle2, 
  Lock, 
  DollarSign, 
  FileText, 
  ShieldAlert,
  ArrowRight
} from 'lucide-react';

export default function DisputesResolution({
  disputes,
  onResolveDispute,
  onFreezeAdditional
}) {
  const [selectedDispute, setSelectedDispute] = useState(null);
  const [actionType, setActionType] = useState('REFUND'); // 'REFUND' or 'RELEASE'
  const [reasonCode, setReasonCode] = useState('CONTRACT_QUALITY_DEFECT');
  const [adminNotes, setAdminNotes] = useState('');
  const [showResolveModal, setShowResolveModal] = useState(false);

  const handleOpenResolve = (dispute, type) => {
    setSelectedDispute(dispute);
    setActionType(type);
    setShowResolveModal(true);
  };

  const handleResolveSubmit = (e) => {
    e.preventDefault();
    if (selectedDispute) {
      onResolveDispute({
        dispute_id: selectedDispute.id,
        action: actionType, // 'REFUND' to buyer or 'RELEASE' to seller/carrier
        reason_code: reasonCode,
        admin_notes: adminNotes || `Resolution executed by Finance Operations via ${reasonCode}`
      });
      setShowResolveModal(false);
      setSelectedDispute(null);
    }
  };

  return (
    <div className="disputes-resolution-view">
      <div className="view-header-row" style={{ marginBottom: '20px' }}>
        <div>
          <h2>Dispute Freeze & Resolution Center</h2>
          <p className="text-muted">
            WAL-FR-10 · Partial Hold Freezing, Dispute Suspense Accounting, and Reason-Coded Multi-Actor Resolution
          </p>
        </div>
      </div>

      <div className="alert-callout warning" style={{ marginBottom: '20px' }}>
        <ShieldAlert size={18} />
        <div>
          <strong>Dispute Suspense Account Safeguard (CIS-M6):</strong>
          <p style={{ margin: '2px 0 0', fontSize: '0.85rem' }}>
            When a trade or transport milestone is contested, disputed funds are debited from the active escrow hold and credited to the <code>Dispute Suspense (ACC-SYS-SUSPENSE-01)</code> ledger account, freezing them from release until formal adjudication.
          </p>
        </div>
      </div>

      <div className="card">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Dispute ID & Ref</th>
                <th>Complainant vs Respondent</th>
                <th>Disputed / Frozen</th>
                <th>Contested Reason</th>
                <th>Filed Date</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {disputes.map((disp) => (
                <tr key={disp.id}>
                  <td>
                    <div className="font-mono text-bold" style={{ fontSize: '0.9rem' }}>{disp.id}</div>
                    <div className="font-mono text-muted" style={{ fontSize: '0.75rem' }}>Hold: {disp.hold_id}</div>
                    <div className="badge badge-gray" style={{ fontSize: '0.65rem' }}>{disp.business_ref}</div>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.85rem' }}><strong>By:</strong> {disp.complainant}</div>
                    <div className="text-muted" style={{ fontSize: '0.8rem' }}><strong>Against:</strong> {disp.respondent}</div>
                  </td>
                  <td>
                    <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--danger-600)' }}>
                      ₹{disp.disputed_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--slate-500)' }}>
                      In Suspense: ₹{disp.frozen_in_suspense.toLocaleString('en-IN')}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.85rem' }}>{disp.reason}</div>
                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>Evidence: {disp.evidence}</div>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.82rem' }}>{new Date(disp.created_at).toLocaleDateString()}</div>
                  </td>
                  <td>
                    <span className={`badge ${disp.status.startsWith('RESOLVED') ? 'badge-green' : disp.status === 'FROZEN' ? 'badge-red' : 'badge-amber'}`}>
                      {disp.status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {!disp.status.startsWith('RESOLVED') ? (
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                        <button 
                          className="btn btn-outline-danger btn-sm"
                          onClick={() => handleOpenResolve(disp, 'REFUND')}
                          title="Refund disputed amount to complainant"
                        >
                          <RotateCcw size={13} />
                          <span>Refund Payer</span>
                        </button>
                        <button 
                          className="btn btn-primary btn-sm"
                          onClick={() => handleOpenResolve(disp, 'RELEASE')}
                          title="Release disputed amount to respondent"
                        >
                          <CheckCircle2 size={13} />
                          <span>Release Payee</span>
                        </button>
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)' }}>
                        Resolved: <strong>{disp.resolution_code}</strong>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Resolve Modal */}
      {showResolveModal && selectedDispute && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={18} className="text-primary" />
                <div>
                  <h3 style={{ fontSize: '1rem', margin: 0 }}>
                    {actionType === 'REFUND' ? 'Execute Dispute Refund to Payer' : 'Authorize Release to Payee'}
                  </h3>
                  <small className="font-mono text-muted">{selectedDispute.id}</small>
                </div>
              </div>
              <button className="btn-close" onClick={() => setShowResolveModal(false)}>✕</button>
            </div>

            <form onSubmit={handleResolveSubmit}>
              <div className="modal-body">
                <div className="amount-display-tag" style={{ textAlign: 'center', marginBottom: '16px' }}>
                  <span className="text-muted" style={{ fontSize: '0.8rem' }}>Suspense Ledger Movement Amount:</span>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--slate-900)' }}>
                    ₹{selectedDispute.disputed_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Mandatory Reason Code (WAL-FR-10)</label>
                  <select 
                    className="form-select"
                    value={reasonCode}
                    onChange={(e) => setReasonCode(e.target.value)}
                  >
                    <option value="CONTRACT_QUALITY_DEFECT">CONTRACT_QUALITY_DEFECT (Moisture/sample defect)</option>
                    <option value="GOODS_TRANSIT_DAMAGE">GOODS_TRANSIT_DAMAGE (Haulage spoilage verified)</option>
                    <option value="MUTUAL_MEDIATED_SETTLEMENT">MUTUAL_MEDIATED_SETTLEMENT (AgriLink mediation agreed)</option>
                    <option value="SERVICE_SATISFIED_RELEASE">SERVICE_SATISFIED_RELEASE (Carrier fulfilled delivery proof)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Compliance Officer Adjudication Notes</label>
                  <textarea 
                    className="form-textarea"
                    rows={3}
                    placeholder="Reference quality lab certificate, mandi gate pass, or signed dispute minutes..."
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    required 
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowResolveModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Post Double-Entry Resolution
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
