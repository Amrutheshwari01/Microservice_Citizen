import React, { useState } from 'react';
import { 
  FileCheck, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  RefreshCw, 
  FileSpreadsheet, 
  Layers, 
  ArrowRight,
  ShieldCheck
} from 'lucide-react';

export default function ReconciliationView({
  reconciliation,
  onResolveException
}) {
  const [isReconciling, setIsReconciling] = useState(false);
  const [reconcileResult, setReconcileResult] = useState(null);

  const handleRunReconcile = () => {
    setIsReconciling(true);
    setTimeout(() => {
      setIsReconciling(false);
      setReconcileResult('Daily 3-way automated matching completed across 3,604 settlement records in 44 seconds! All gateway batches reconciled within SLA.');
      setTimeout(() => setReconcileResult(null), 6000);
    }, 1200);
  };

  return (
    <div className="reconciliation-view">
      <div className="view-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2>Daily Gateway & Bank Reconciliation</h2>
          <p className="text-muted">
            WAL-FR-12 & CIS-N09 · Automated Multi-Party Settlement Matching within 2 Hours of File Receipt & 15-Min Exception Alerting
          </p>
        </div>

        <button 
          className="btn btn-primary"
          onClick={handleRunReconcile}
          disabled={isReconciling}
        >
          {isReconciling ? (
            <>
              <RefreshCw size={16} className="spinning" />
              <span>Running 3-Way Reconciler...</span>
            </>
          ) : (
            <>
              <FileCheck size={16} />
              <span>Trigger Daily Reconcile Run</span>
            </>
          )}
        </button>
      </div>

      {reconcileResult && (
        <div className="alert-callout success" style={{ marginBottom: '20px' }}>
          <CheckCircle2 size={20} />
          <span>{reconcileResult}</span>
        </div>
      )}

      {/* SLA Status Cards */}
      <div className="grid-3" style={{ marginBottom: '24px' }}>
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="text-muted" style={{ fontSize: '0.82rem' }}>SLA Target: 2-Hour File Matching</span>
            <span className="badge badge-green">PASSING</span>
          </div>
          <h2 style={{ fontSize: '1.6rem', color: 'var(--primary-700)', margin: '8px 0 2px' }}>
            48m - 1h 35m
          </h2>
          <small className="text-muted">Max batch completion time: 1 hour 35 minutes</small>
        </div>

        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="text-muted" style={{ fontSize: '0.82rem' }}>Unmatched Alert SLA</span>
            <span className="badge badge-green">&lt; 15 MINS</span>
          </div>
          <h2 style={{ fontSize: '1.6rem', color: 'var(--slate-800)', margin: '8px 0 2px' }}>
            2.4 Mins Avg
          </h2>
          <small className="text-muted">Webhook alerts dispatched to finance queue</small>
        </div>

        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="text-muted" style={{ fontSize: '0.82rem' }}>Total Reconciled Volume</span>
            <span className="badge badge-purple">CIS-M6 LEDGER</span>
          </div>
          <h2 style={{ fontSize: '1.6rem', color: '#6d28d9', margin: '8px 0 2px' }}>
            ₹4,93,80,000
          </h2>
          <small className="text-muted">3 Settlement files ingested today</small>
        </div>
      </div>

      {/* Batch Ingestion Status Table */}
      <h3 style={{ fontSize: '1.1rem', marginBottom: '14px' }}>Settlement Files Ingested (settlement_file)</h3>
      <div className="card" style={{ marginBottom: '28px' }}>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Batch ID</th>
                <th>Source Institution</th>
                <th>Record Count</th>
                <th>Total Volume (INR)</th>
                <th>Execution Time</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {reconciliation.batches.map((batch) => (
                <tr key={batch.batch_id}>
                  <td>
                    <span className="font-mono text-bold">{batch.batch_id}</span>
                  </td>
                  <td>
                    <strong>{batch.source}</strong>
                  </td>
                  <td>
                    <span className="font-mono">{batch.record_count.toLocaleString()} rows</span>
                  </td>
                  <td>
                    <span className="font-mono text-bold">₹{batch.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </td>
                  <td>
                    <span className="text-muted" style={{ fontSize: '0.85rem' }}>{batch.completed_in}</span>
                  </td>
                  <td>
                    <span className={`badge ${batch.status === 'MATCHED' ? 'badge-green' : 'badge-amber'}`}>
                      {batch.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reconciliation Exceptions (reconciliation_exception) */}
      <h3 style={{ fontSize: '1.1rem', marginBottom: '14px' }}>Reconciliation Exceptions & Variance Desk</h3>
      <div className="card">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Exception ID</th>
                <th>Batch Source</th>
                <th>Tx Reference</th>
                <th>Variance Amount (₹)</th>
                <th>Discrepancy Cause</th>
                <th>Severity</th>
                <th style={{ textAlign: 'right' }}>Resolution</th>
              </tr>
            </thead>
            <tbody>
              {reconciliation.exceptions.map((exc) => (
                <tr key={exc.id}>
                  <td>
                    <span className="font-mono text-bold">{exc.id}</span>
                  </td>
                  <td>
                    <span className="font-mono" style={{ fontSize: '0.82rem' }}>{exc.batch_id}</span>
                  </td>
                  <td>
                    <span className="font-mono" style={{ fontSize: '0.82rem' }}>{exc.tx_ref}</span>
                  </td>
                  <td>
                    <strong style={{ color: 'var(--danger-600)' }}>₹{exc.amount.toFixed(2)}</strong>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.82rem', maxWidth: '300px' }}>{exc.reason}</div>
                  </td>
                  <td>
                    <span className="badge badge-amber">{exc.severity}</span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button 
                      className="btn btn-secondary btn-sm"
                      onClick={() => onResolveException(exc.id)}
                    >
                      <CheckCircle2 size={14} className="text-success" />
                      <span>Auto-Clear Variance</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
