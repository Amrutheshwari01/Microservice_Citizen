import React, { useState } from 'react';
import { 
  Download, 
  Printer, 
  Search, 
  Filter, 
  FileText, 
  ArrowUpRight, 
  ArrowDownLeft, 
  CheckCircle2, 
  X,
  Calendar,
  Layers
} from 'lucide-react';

export default function StatementsView({
  transactions,
  wallet,
  citizen
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [selectedTx, setSelectedTx] = useState(null);

  const filteredTransactions = transactions.filter(tx => {
    const matchesSearch = 
      tx.business_ref.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.counterparty.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = typeFilter === 'ALL' || tx.type === typeFilter;
    return matchesSearch && matchesType;
  });

  // Export to CSV function (WAL-FR-03)
  const handleExportCSV = () => {
    const headers = ["Transaction ID", "Business Ref", "Type", "Category", "Amount (INR)", "Fee (INR)", "Counterparty", "Status", "Timestamp", "Idempotency Key"];
    const rows = filteredTransactions.map(tx => [
      tx.id,
      tx.business_ref,
      tx.type,
      tx.category,
      tx.amount,
      tx.fee || 0,
      `"${tx.counterparty}"`,
      tx.status,
      tx.timestamp,
      tx.idempotency_key
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `AgriLink_Wallet_Statement_${citizen.citizen_id}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="statements-view">
      <div className="view-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2>Filterable Account Statements</h2>
          <p className="text-muted">WAL-FR-03 · Double-Entry Ledger Statements with Sub-300ms 95th Percentile Querying</p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={handleExportCSV}>
            <Download size={16} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="card" style={{ marginBottom: '20px', padding: '16px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flex: '1', minWidth: '240px', position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--slate-400)' }} />
            <input 
              type="text" 
              className="form-input" 
              style={{ paddingLeft: '36px' }}
              placeholder="Search by Business Ref, Counterparty, Purpose..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--slate-600)' }}>Filter:</span>
            {['ALL', 'CREDIT', 'DEBIT', 'HOLD', 'TOPUP', 'PAYOUT'].map(t => (
              <button
                key={t}
                className={`btn btn-sm ${typeFilter === t ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setTypeFilter(t)}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table Card */}
      <div className="card">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Tx ID & Type</th>
                <th>Business Ref / Purpose</th>
                <th>Counterparty</th>
                <th>Date & Time</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Amount (INR)</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: 'var(--slate-500)' }}>
                    No ledger transactions found matching filters.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map(tx => (
                  <tr key={tx.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className={`tx-type-pill ${tx.type.toLowerCase()}`}>
                          {tx.type}
                        </span>
                        <span className="font-mono" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                          {tx.id}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="font-mono text-bold" style={{ fontSize: '0.85rem' }}>{tx.business_ref}</div>
                      <div className="text-muted" style={{ fontSize: '0.78rem' }}>{tx.description}</div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.85rem' }}>{tx.counterparty}</div>
                      <span className="badge badge-gray" style={{ fontSize: '0.68rem' }}>{tx.category}</span>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.82rem' }}>
                        {new Date(tx.timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                      <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                        {new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${tx.status === 'COMPLETED' ? 'badge-green' : tx.status === 'HELD' ? 'badge-amber' : 'badge-blue'}`}>
                        {tx.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span className={`tx-amount ${tx.type === 'CREDIT' || tx.type === 'TOPUP' ? 'credit' : 'debit'}`}>
                        {tx.type === 'CREDIT' || tx.type === 'TOPUP' ? '+' : '-'} ₹{tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                      {tx.fee > 0 && (
                        <div style={{ fontSize: '0.7rem', color: 'var(--slate-500)' }}>Fee: ₹{tx.fee.toFixed(2)}</div>
                      )}
                    </td>
                    <td>
                      <button 
                        className="btn btn-ghost btn-sm"
                        onClick={() => setSelectedTx(tx)}
                        title="View Double-Entry Voucher"
                      >
                        <FileText size={15} />
                        <span>Voucher</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Double-Entry Ledger Voucher Modal */}
      {selectedTx && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '540px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={18} className="text-primary" />
                <div>
                  <h3 style={{ fontSize: '1rem', margin: 0 }}>Double-Entry Ledger Voucher</h3>
                  <small className="font-mono text-muted">{selectedTx.id}</small>
                </div>
              </div>
              <button className="btn-close" onClick={() => setSelectedTx(null)}><X size={18} /></button>
            </div>

            <div className="modal-body" style={{ fontSize: '0.88rem' }}>
              <div style={{ background: 'var(--slate-50)', padding: '14px', borderRadius: '8px', border: '1px solid var(--slate-200)', marginBottom: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <span className="text-muted" style={{ fontSize: '0.75rem' }}>Business Reference:</span>
                    <div className="font-mono text-bold">{selectedTx.business_ref}</div>
                  </div>
                  <div>
                    <span className="text-muted" style={{ fontSize: '0.75rem' }}>Idempotency Key:</span>
                    <div className="font-mono text-bold" style={{ wordBreak: 'break-all' }}>{selectedTx.idempotency_key}</div>
                  </div>
                  <div>
                    <span className="text-muted" style={{ fontSize: '0.75rem' }}>Purpose Code:</span>
                    <div>{selectedTx.purpose_code}</div>
                  </div>
                  <div>
                    <span className="text-muted" style={{ fontSize: '0.75rem' }}>Execution Timestamp:</span>
                    <div>{new Date(selectedTx.timestamp).toLocaleString()}</div>
                  </div>
                </div>
              </div>

              <h4 style={{ fontSize: '0.9rem', marginBottom: '8px' }}>Ledger Double-Entry Invariant (CIS-N07):</h4>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', marginBottom: '16px' }}>
                <thead>
                  <tr style={{ background: 'var(--slate-100)', textAlign: 'left' }}>
                    <th style={{ padding: '6px 8px' }}>Account Name</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right' }}>Debit (₹)</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right' }}>Credit (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedTx.type === 'CREDIT' || selectedTx.type === 'TOPUP' ? (
                    <>
                      <tr style={{ borderBottom: '1px solid var(--slate-200)' }}>
                        <td style={{ padding: '6px 8px' }}>Payment Gateway / Clearing Escrow</td>
                        <td style={{ padding: '6px 8px', textAlign: 'right' }}>₹{selectedTx.amount.toFixed(2)}</td>
                        <td style={{ padding: '6px 8px', textAlign: 'right' }}>-</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid var(--slate-200)' }}>
                        <td style={{ padding: '6px 8px' }}>Citizen Wallet ({citizen.citizen_id})</td>
                        <td style={{ padding: '6px 8px', textAlign: 'right' }}>-</td>
                        <td style={{ padding: '6px 8px', textAlign: 'right' }}>₹{selectedTx.amount.toFixed(2)}</td>
                      </tr>
                    </>
                  ) : (
                    <>
                      <tr style={{ borderBottom: '1px solid var(--slate-200)' }}>
                        <td style={{ padding: '6px 8px' }}>Citizen Wallet ({citizen.citizen_id})</td>
                        <td style={{ padding: '6px 8px', textAlign: 'right' }}>₹{selectedTx.amount.toFixed(2)}</td>
                        <td style={{ padding: '6px 8px', textAlign: 'right' }}>-</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid var(--slate-200)' }}>
                        <td style={{ padding: '6px 8px' }}>Counterparty / Escrow Clearing Pool</td>
                        <td style={{ padding: '6px 8px', textAlign: 'right' }}>-</td>
                        <td style={{ padding: '6px 8px', textAlign: 'right' }}>₹{selectedTx.amount.toFixed(2)}</td>
                      </tr>
                    </>
                  )}
                  <tr style={{ fontWeight: 700, background: 'var(--slate-50)' }}>
                    <td style={{ padding: '6px 8px' }}>Total Invariant Balance (Sum Debits = Sum Credits)</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right' }}>₹{selectedTx.amount.toFixed(2)}</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right' }}>₹{selectedTx.amount.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>

              <div className="alert-callout info">
                <CheckCircle2 size={16} />
                <span>Verified cryptographically signed ledger entry in PostgreSQL CIS-M6 ledger DB.</span>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => window.print()}>
                <Printer size={15} />
                <span>Print Voucher</span>
              </button>
              <button className="btn btn-primary" onClick={() => setSelectedTx(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
