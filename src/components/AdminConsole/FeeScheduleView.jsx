import React, { useState } from 'react';
import { 
  DollarSign, 
  Percent, 
  Layers, 
  Calendar, 
  CheckCircle2, 
  Building, 
  Plus, 
  Sparkles 
} from 'lucide-react';

export default function FeeScheduleView({
  feeSchedules,
  onAddFeeRule
}) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [service, setService] = useState('APMC Electronic Auction Cess');
  const [type, setType] = useState('PERCENTAGE');
  const [rate, setRate] = useState('0.5');
  const [minFee, setMinFee] = useState('5');
  const [maxFee, setMaxFee] = useState('250');
  const [leviedOn, setLeviedOn] = useState('Trade Settlement Release');

  const handleCreate = (e) => {
    e.preventDefault();
    onAddFeeRule({
      id: `FEE-0${feeSchedules.length + 1}`,
      service,
      type,
      rate: parseFloat(rate),
      min_fee: parseFloat(minFee),
      max_fee: parseFloat(maxFee),
      levied_on: leviedOn,
      effective_since: new Date().toISOString().slice(0, 10),
      target_account: "Platform Revenue (ACC-SYS-REV-01)"
    });
    setShowAddModal(false);
  };

  return (
    <div className="fee-schedule-view">
      <div className="view-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2>Fee Schedules & Platform Revenue Accounting</h2>
          <p className="text-muted">
            WAL-FR-13 · Automated Commission Calculations, Levies, and Real-Time Postings to Platform Revenue Ledger
          </p>
        </div>

        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          <Plus size={16} />
          <span>Add Fee Schedule Rule</span>
        </button>
      </div>

      <div className="grid-3" style={{ marginBottom: '24px' }}>
        <div className="card" style={{ padding: '20px' }}>
          <span className="text-muted" style={{ fontSize: '0.82rem' }}>Platform Revenue Ledger Account</span>
          <h2 style={{ fontSize: '1.6rem', color: 'var(--primary-700)', margin: '6px 0 2px' }}>
            ₹4,18,920.00
          </h2>
          <small className="text-muted font-mono">ACC-SYS-REV-01 (Double-Entry Credited)</small>
        </div>

        <div className="card" style={{ padding: '20px' }}>
          <span className="text-muted" style={{ fontSize: '0.82rem' }}>Bank Nodal Recovery Account</span>
          <h2 style={{ fontSize: '1.6rem', color: '#1d4ed8', margin: '6px 0 2px' }}>
            ₹94,510.00
          </h2>
          <small className="text-muted font-mono">ACC-SYS-GATEWAY-02 (IMPS Nodal Cleared)</small>
        </div>

        <div className="card" style={{ padding: '20px' }}>
          <span className="text-muted" style={{ fontSize: '0.82rem' }}>Mandi Cess Transit Pool</span>
          <h2 style={{ fontSize: '1.6rem', color: '#b45309', margin: '6px 0 2px' }}>
            ₹1,82,400.00
          </h2>
          <small className="text-muted font-mono">ACC-SYS-APMC-CESS (State Pool)</small>
        </div>
      </div>

      <div className="card">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Rule ID & Service</th>
                <th>Fee Structure</th>
                <th>Rate / Value</th>
                <th>Min - Max Cap</th>
                <th>Levied On Event</th>
                <th>Target Ledger Account</th>
                <th>Effective Date</th>
              </tr>
            </thead>
            <tbody>
              {feeSchedules.map((fee) => (
                <tr key={fee.id}>
                  <td>
                    <div className="font-mono text-bold">{fee.id}</div>
                    <strong>{fee.service}</strong>
                  </td>
                  <td>
                    <span className={`badge ${fee.type === 'PERCENTAGE' ? 'badge-blue' : 'badge-purple'}`}>
                      {fee.type}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--slate-900)' }}>
                      {fee.type === 'PERCENTAGE' ? `${fee.rate}%` : `₹${fee.rate.toFixed(2)}`}
                    </div>
                  </td>
                  <td>
                    <span className="font-mono" style={{ fontSize: '0.85rem' }}>
                      ₹{fee.min_fee.toFixed(2)} - ₹{fee.max_fee.toFixed(2)}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.85rem' }}>{fee.levied_on}</div>
                  </td>
                  <td>
                    <span className="badge badge-green font-mono" style={{ fontSize: '0.72rem' }}>
                      {fee.target_account}
                    </span>
                  </td>
                  <td>
                    <span className="font-mono text-muted" style={{ fontSize: '0.8rem' }}>
                      {fee.effective_since}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1rem', margin: 0 }}>Create Platform Fee Schedule</h3>
              <button className="btn-close" onClick={() => setShowAddModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Service Name</label>
                  <input type="text" className="form-input" value={service} onChange={(e) => setService(e.target.value)} required />
                </div>
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Fee Type</label>
                    <select className="form-select" value={type} onChange={(e) => setType(e.target.value)}>
                      <option value="PERCENTAGE">Percentage (%)</option>
                      <option value="FLAT">Flat Fee (₹)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">{type === 'PERCENTAGE' ? 'Rate (%)' : 'Amount (₹)'}</label>
                    <input type="number" step="0.01" className="form-input" value={rate} onChange={(e) => setRate(e.target.value)} required />
                  </div>
                </div>
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Min Fee (₹)</label>
                    <input type="number" className="form-input" value={minFee} onChange={(e) => setMinFee(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Max Fee Cap (₹)</label>
                    <input type="number" className="form-input" value={maxFee} onChange={(e) => setMaxFee(e.target.value)} required />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Levied Trigger Event</label>
                  <input type="text" className="form-input" value={leviedOn} onChange={(e) => setLeviedOn(e.target.value)} required />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Fee Rule</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
