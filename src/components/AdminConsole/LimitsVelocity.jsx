import React, { useState } from 'react';
import { 
  Sliders, 
  Plus, 
  CheckCircle2, 
  Calendar, 
  ShieldCheck, 
  Layers, 
  Edit2, 
  Save, 
  X 
} from 'lucide-react';

export default function LimitsVelocity({
  limitRules,
  onUpdateLimitRule
}) {
  const [editingRuleId, setEditingRuleId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleStartEdit = (rule) => {
    setEditingRuleId(rule.id);
    setEditForm({ ...rule });
  };

  const handleSaveEdit = (e) => {
    e.preventDefault();
    onUpdateLimitRule(editForm);
    setEditingRuleId(null);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 4000);
  };

  return (
    <div className="limits-velocity-view">
      <div className="view-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2>Limits & Velocity Policy Engine</h2>
          <p className="text-muted">
            WAL-FR-08 · Per-Transaction, Daily, Monthly & Maximum-Balance Ceilings Parameterized by KYC Tier and Persona
          </p>
        </div>
      </div>

      {saveSuccess && (
        <div className="alert-callout success" style={{ marginBottom: '20px' }}>
          <CheckCircle2 size={18} />
          <span>Limit rule updated and versioned with effective date timestamp (WAL-FR-08).</span>
        </div>
      )}

      <div className="card">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Rule ID & Tier</th>
                <th>Target Persona</th>
                <th>Per-Transaction Limit (₹)</th>
                <th>Daily Velocity Limit (₹)</th>
                <th>Monthly Velocity Limit (₹)</th>
                <th>Maximum Wallet Balance (₹)</th>
                <th>Effective Date</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {limitRules.map((rule) => {
                const isEditing = editingRuleId === rule.id;
                return (
                  <tr key={rule.id}>
                    <td>
                      <div className="font-mono text-bold">{rule.id}</div>
                      <span className={`badge ${rule.tier === 'T2' ? 'badge-purple' : rule.tier === 'T1' ? 'badge-green' : 'badge-gray'}`}>
                        Tier {rule.tier}
                      </span>
                    </td>
                    <td>
                      <strong>{rule.persona}</strong>
                    </td>
                    <td>
                      {isEditing ? (
                        <input 
                          type="number" 
                          className="form-input" 
                          style={{ width: '110px' }}
                          value={editForm.per_tx_limit} 
                          onChange={(e) => setEditForm({ ...editForm, per_tx_limit: parseFloat(e.target.value) })}
                        />
                      ) : (
                        <span className="font-mono">₹{rule.per_tx_limit.toLocaleString('en-IN')}</span>
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <input 
                          type="number" 
                          className="form-input" 
                          style={{ width: '120px' }}
                          value={editForm.daily_limit} 
                          onChange={(e) => setEditForm({ ...editForm, daily_limit: parseFloat(e.target.value) })}
                        />
                      ) : (
                        <span className="font-mono">₹{rule.daily_limit.toLocaleString('en-IN')}</span>
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <input 
                          type="number" 
                          className="form-input" 
                          style={{ width: '130px' }}
                          value={editForm.monthly_limit} 
                          onChange={(e) => setEditForm({ ...editForm, monthly_limit: parseFloat(e.target.value) })}
                        />
                      ) : (
                        <span className="font-mono">₹{rule.monthly_limit.toLocaleString('en-IN')}</span>
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <input 
                          type="number" 
                          className="form-input" 
                          style={{ width: '130px' }}
                          value={editForm.max_balance} 
                          onChange={(e) => setEditForm({ ...editForm, max_balance: parseFloat(e.target.value) })}
                        />
                      ) : (
                        <span className="font-mono text-bold" style={{ color: 'var(--primary-800)' }}>
                          ₹{rule.max_balance.toLocaleString('en-IN')}
                        </span>
                      )}
                    </td>
                    <td>
                      <span className="font-mono text-muted" style={{ fontSize: '0.8rem' }}>
                        {rule.effective_date}
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-green">{rule.status}</span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {isEditing ? (
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                          <button className="btn btn-primary btn-sm" onClick={handleSaveEdit}>
                            <Save size={14} />
                            <span>Save</span>
                          </button>
                          <button className="btn btn-secondary btn-sm" onClick={() => setEditingRuleId(null)}>
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <button className="btn btn-secondary btn-sm" onClick={() => handleStartEdit(rule)}>
                          <Edit2 size={13} />
                          <span>Adjust</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
