import React from 'react';
import { 
  Building2, 
  Wallet, 
  ShieldCheck, 
  AlertTriangle, 
  Scale, 
  Activity, 
  FileCheck, 
  ArrowUpRight, 
  Users, 
  Clock,
  Sparkles
} from 'lucide-react';

export default function AdminOverview({
  wallet,
  holds,
  disputes,
  personaApplications,
  reconciliation,
  onNavigateTab
}) {
  const pendingApprovalsCount = personaApplications.filter(a => a.status === 'PENDING_APPROVAL').length;
  const openDisputesCount = disputes.filter(d => d.status === 'OPEN_REVIEW' || d.status === 'FROZEN').length;
  const totalHeldInEscrow = holds.filter(h => h.status === 'HELD').reduce((acc, h) => acc + h.held_amount, 0);

  return (
    <div className="admin-overview">
      <div className="view-header-row" style={{ marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span className="badge badge-purple">Admin Surface</span>
            <span className="badge badge-green">Bulkhead Active</span>
          </div>
          <h2>Microservice 2 Operations & Finance Control Tower</h2>
          <p className="text-muted">
            Executive oversight of Citizen Identity (CIS-M1 to M5) and Wallet Double-Entry Ledger (CIS-M6)
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid-4" style={{ marginBottom: '24px' }}>
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="text-muted" style={{ fontSize: '0.82rem' }}>Total Ledger Circulating</span>
            <div style={{ background: '#ecfdf5', padding: '6px', borderRadius: '8px', color: 'var(--primary-600)' }}>
              <Wallet size={18} />
            </div>
          </div>
          <h2 style={{ fontSize: '1.6rem', color: 'var(--slate-900)', margin: '8px 0 4px' }}>
            ₹2,46,90,000
          </h2>
          <div style={{ fontSize: '0.75rem', color: 'var(--primary-700)', fontWeight: 600 }}>
            ↑ 8.4% vs last settlement
          </div>
        </div>

        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="text-muted" style={{ fontSize: '0.82rem' }}>Active Escrow Holds</span>
            <div style={{ background: '#fef3c7', padding: '6px', borderRadius: '8px', color: '#b45309' }}>
              <Clock size={18} />
            </div>
          </div>
          <h2 style={{ fontSize: '1.6rem', color: '#b45309', margin: '8px 0 4px' }}>
            ₹{totalHeldInEscrow.toLocaleString('en-IN')}
          </h2>
          <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)' }}>
            Across {holds.filter(h => h.status === 'HELD').length} active logistics & harvest contracts
          </div>
        </div>

        <div 
          className="card" 
          style={{ padding: '20px', cursor: 'pointer', border: pendingApprovalsCount > 0 ? '1px solid var(--warning-500)' : '1px solid var(--slate-200)' }}
          onClick={() => onNavigateTab('admin-approvals')}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="text-muted" style={{ fontSize: '0.82rem' }}>Pending Persona Approvals</span>
            <div style={{ background: '#ede9fe', padding: '6px', borderRadius: '8px', color: '#6d28d9' }}>
              <Users size={18} />
            </div>
          </div>
          <h2 style={{ fontSize: '1.6rem', color: '#6d28d9', margin: '8px 0 4px' }}>
            {pendingApprovalsCount}
          </h2>
          <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)' }}>
            Aggregators & Delivery applicants awaiting sign-off
          </div>
        </div>

        <div 
          className="card" 
          style={{ padding: '20px', cursor: 'pointer', border: openDisputesCount > 0 ? '1px solid var(--danger-500)' : '1px solid var(--slate-200)' }}
          onClick={() => onNavigateTab('admin-disputes')}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="text-muted" style={{ fontSize: '0.82rem' }}>Active Disputes & Freezes</span>
            <div style={{ background: '#fee2e2', padding: '6px', borderRadius: '8px', color: 'var(--danger-600)' }}>
              <AlertTriangle size={18} />
            </div>
          </div>
          <h2 style={{ fontSize: '1.6rem', color: 'var(--danger-600)', margin: '8px 0 4px' }}>
            {openDisputesCount}
          </h2>
          <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)' }}>
            Funds frozen in Dispute Suspense account
          </div>
        </div>
      </div>

      {/* SLA & Non-Functional Compliance Status (Section 6.3) */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-header">
          <div>
            <h3>Non-Functional Architecture Compliance (Section 6.3)</h3>
            <small className="text-muted">ATAM & ADR SLA verification indicators</small>
          </div>
          <span className="badge badge-green">100% HEALTHY</span>
        </div>
        <div className="card-body">
          <div className="grid-3">
            <div style={{ background: 'var(--slate-50)', padding: '14px', borderRadius: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
                <span>CIS-N10 Auth Login Latency</span>
                <span className="text-success font-mono">420 ms (Target: &lt;1.5s)</span>
              </div>
              <div className="progress-bar-bg" style={{ height: '6px' }}>
                <div className="progress-bar-fill" style={{ width: '28%', background: 'var(--primary-600)' }} />
              </div>
              <small className="text-muted" style={{ fontSize: '0.72rem', marginTop: '4px', display: 'block' }}>
                Argon2id hashing & token issuance within 95th percentile
              </small>
            </div>

            <div style={{ background: 'var(--slate-50)', padding: '14px', borderRadius: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
                <span>CIS-N11 Ledger Execution</span>
                <span className="text-success font-mono">180 ms (Target: &lt;800ms)</span>
              </div>
              <div className="progress-bar-bg" style={{ height: '6px' }}>
                <div className="progress-bar-fill" style={{ width: '22%', background: 'var(--primary-600)' }} />
              </div>
              <small className="text-muted" style={{ fontSize: '0.72rem', marginTop: '4px', display: 'block' }}>
                Atomic transfers, holds and releases verified
              </small>
            </div>

            <div style={{ background: 'var(--slate-50)', padding: '14px', borderRadius: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
                <span>CIS-N09 Daily Reconciliation</span>
                <span className="text-success font-mono">1 hr 12 min (SLA: &lt;2 hrs)</span>
              </div>
              <div className="progress-bar-bg" style={{ height: '6px' }}>
                <div className="progress-bar-fill" style={{ width: '60%', background: 'var(--primary-600)' }} />
              </div>
              <small className="text-muted" style={{ fontSize: '0.72rem', marginTop: '4px', display: 'block' }}>
                Gateway and bank clearing matching automated
              </small>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Launchpad to Admin Submodules */}
      <h3 style={{ fontSize: '1.15rem', marginBottom: '16px' }}>Microservice 2 Administrative Modules</h3>
      <div className="grid-3" style={{ gap: '16px' }}>
        <div className="card" style={{ padding: '18px', cursor: 'pointer' }} onClick={() => onNavigateTab('admin-approvals')}>
          <h4 style={{ fontSize: '1rem', color: 'var(--primary-700)', marginBottom: '4px' }}>CID-FR-08 Persona Approvals</h4>
          <p style={{ fontSize: '0.82rem', color: 'var(--slate-600)', margin: 0 }}>Review high-trust Aggregator and Delivery Person applications.</p>
        </div>

        <div className="card" style={{ padding: '18px', cursor: 'pointer' }} onClick={() => onNavigateTab('admin-disputes')}>
          <h4 style={{ fontSize: '1rem', color: '#b45309', marginBottom: '4px' }}>WAL-FR-10 Dispute Freeze & Resolution</h4>
          <p style={{ fontSize: '0.82rem', color: 'var(--slate-600)', margin: 0 }}>Freeze partial holds to Suspense account; release or refund with reason codes.</p>
        </div>

        <div className="card" style={{ padding: '18px', cursor: 'pointer' }} onClick={() => onNavigateTab('admin-audit')}>
          <h4 style={{ fontSize: '1rem', color: '#1d4ed8', marginBottom: '4px' }}>CID-FR-14 Hash-Chained Audit Trail</h4>
          <p style={{ fontSize: '0.82rem', color: 'var(--slate-600)', margin: 0 }}>Tamper-evident append-only ledger and authentication events.</p>
        </div>

        <div className="card" style={{ padding: '18px', cursor: 'pointer' }} onClick={() => onNavigateTab('admin-limits')}>
          <h4 style={{ fontSize: '1rem', color: 'var(--slate-800)', marginBottom: '4px' }}>WAL-FR-08 Limits & Velocity Rules</h4>
          <p style={{ fontSize: '0.82rem', color: 'var(--slate-600)', margin: 0 }}>Configure per-transaction, daily, and monthly limits per KYC tier.</p>
        </div>

        <div className="card" style={{ padding: '18px', cursor: 'pointer' }} onClick={() => onNavigateTab('admin-reconciliation')}>
          <h4 style={{ fontSize: '1rem', color: 'var(--slate-800)', marginBottom: '4px' }}>WAL-FR-12 Daily Reconciliation</h4>
          <p style={{ fontSize: '0.82rem', color: 'var(--slate-600)', margin: 0 }}>SLA tracking and unmatched item exception handling.</p>
        </div>

        <div className="card" style={{ padding: '18px', cursor: 'pointer' }} onClick={() => onNavigateTab('admin-api')}>
          <h4 style={{ fontSize: '1rem', color: '#6d28d9', marginBottom: '4px' }}>Section 5.2 API & JWKS Inspector</h4>
          <p style={{ fontSize: '0.82rem', color: 'var(--slate-600)', margin: 0 }}>Live test all Wallet & Identity REST endpoints and public keys.</p>
        </div>
      </div>
    </div>
  );
}
