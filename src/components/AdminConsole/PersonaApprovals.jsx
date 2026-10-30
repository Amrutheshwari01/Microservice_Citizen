import React, { useState } from 'react';
import { 
  Users, 
  CheckCircle2, 
  XCircle, 
  FileText, 
  ShieldCheck, 
  Clock, 
  Building, 
  Truck,
  MessageSquare,
  AlertCircle
} from 'lucide-react';

export default function PersonaApprovals({
  applications,
  onApproveApplication,
  onRejectApplication
}) {
  const [filter, setFilter] = useState('ALL'); // 'ALL', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED'
  const [selectedApp, setSelectedApp] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);

  const filteredApps = applications.filter(a => filter === 'ALL' || a.status === filter);

  const handleApprove = (appId) => {
    onApproveApplication(appId, "Approved by Compliance Desk after checking FPO / driving permit registry.");
  };

  const handleRejectSubmit = (e) => {
    e.preventDefault();
    if (selectedApp) {
      onRejectApplication(selectedApp.id, rejectReason || "Documents insufficient to verify restricted persona.");
      setShowRejectModal(false);
      setSelectedApp(null);
      setRejectReason('');
    }
  };

  return (
    <div className="persona-approvals-view">
      <div className="view-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2>Restricted Persona Approval Queue</h2>
          <p className="text-muted">
            CID-FR-08 · Administrator Governance for High-Trust Personas: Aggregator (FPO) & Delivery Person (Freight Logistics)
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {['ALL', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED'].map(st => (
            <button
              key={st}
              className={`btn btn-sm ${filter === st ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFilter(st)}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Applicant</th>
                <th>Requested Persona</th>
                <th>KYC Tier</th>
                <th>Organization / License Ref</th>
                <th>Applied Timestamp</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredApps.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: 'var(--slate-500)' }}>
                    No persona applications found in this status.
                  </td>
                </tr>
              ) : (
                filteredApps.map((app) => (
                  <tr key={app.id}>
                    <td>
                      <div>
                        <strong>{app.applicant_name}</strong>
                        <div className="font-mono text-muted" style={{ fontSize: '0.75rem' }}>{app.applicant_id}</div>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '1.2rem' }}>
                          {app.persona === 'AGGREGATOR' ? '🏢' : '🚚'}
                        </span>
                        <div>
                          <strong>{app.persona}</strong>
                          <div style={{ fontSize: '0.72rem', color: 'var(--slate-500)' }}>CIS-M3 Claim</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${app.kyc_tier === 'T2' ? 'badge-purple' : 'badge-green'}`}>
                        {app.kyc_tier}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.85rem' }}>{app.fpo_name}</div>
                      <div className="font-mono text-muted" style={{ fontSize: '0.75rem' }}>Ref: {app.license_ref}</div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.82rem' }}>{new Date(app.applied_at).toLocaleDateString()}</div>
                      <div className="text-muted" style={{ fontSize: '0.72rem' }}>{new Date(app.applied_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </td>
                    <td>
                      <span className={`badge ${app.status === 'APPROVED' ? 'badge-green' : app.status === 'PENDING_APPROVAL' ? 'badge-amber' : 'badge-red'}`}>
                        {app.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {app.status === 'PENDING_APPROVAL' ? (
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                          <button 
                            className="btn btn-primary btn-sm"
                            onClick={() => handleApprove(app.id)}
                            title="Approve and grant persona claim"
                          >
                            <CheckCircle2 size={14} />
                            <span>Approve</span>
                          </button>
                          <button 
                            className="btn btn-outline-danger btn-sm"
                            onClick={() => {
                              setSelectedApp(app);
                              setShowRejectModal(true);
                            }}
                            title="Reject application"
                          >
                            <XCircle size={14} />
                            <span>Reject</span>
                          </button>
                        </div>
                      ) : (
                        <span className="text-muted" style={{ fontSize: '0.8rem' }}>
                          {app.approved_by || 'Processed'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && selectedApp && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <XCircle size={18} className="text-danger" />
                <h3 style={{ fontSize: '1rem', margin: 0 }}>Reject Persona Application</h3>
              </div>
              <button className="btn-close" onClick={() => setShowRejectModal(false)}>✕</button>
            </div>

            <form onSubmit={handleRejectSubmit}>
              <div className="modal-body">
                <p style={{ fontSize: '0.85rem', color: 'var(--slate-600)', marginBottom: '14px' }}>
                  Please provide a reason for rejecting <strong>{selectedApp.applicant_name}</strong> for the <strong>{selectedApp.persona}</strong> persona.
                </p>

                <div className="form-group">
                  <label className="form-label">Rejection Reason Code & Note</label>
                  <textarea 
                    className="form-textarea"
                    rows={3}
                    placeholder="e.g. FPO registration certificate expired or unverifiable."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    required 
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowRejectModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-danger">
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
