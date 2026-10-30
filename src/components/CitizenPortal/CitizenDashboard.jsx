import React from 'react';
import { 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Building2, 
  Lock, 
  TrendingUp, 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  ChevronRight,
  Sparkles,
  Info
} from 'lucide-react';
import { TRANSLATIONS } from '../../data/i18n';
import { KYC_TIERS_INFO } from '../../data/mockData';

export default function CitizenDashboard({
  citizen,
  wallet,
  transactions,
  holds,
  language,
  onOpenTransfer,
  onOpenTopup,
  onOpenCashout,
  onOpenPinManage,
  onViewStatements,
  onViewHolds,
  onViewTierDetails
}) {
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;
  const tierInfo = KYC_TIERS_INFO[citizen.kyc_tier] || KYC_TIERS_INFO.T0;

  // Calculate percentages for limits
  const dailyPercent = Math.min(100, Math.round((wallet.today_spent / tierInfo.daily_limit) * 100));
  const monthlyPercent = Math.min(100, Math.round((wallet.month_spent / tierInfo.monthly_limit) * 100));
  const balancePercent = Math.min(100, Math.round((wallet.total_balance / tierInfo.max_balance) * 100));

  return (
    <div className="citizen-dashboard">
      {/* Welcome & KYC Tier Banner */}
      <div className="dashboard-welcome-banner">
        <div className="welcome-text">
          <div className="citizen-badge-row">
            <span className="badge badge-green">CIS-M1 Verified Citizen</span>
            <span className="badge badge-blue">Single ID: {citizen.citizen_id}</span>
            <span className="badge badge-purple">Active Persona: {citizen.active_persona}</span>
          </div>
          <h2>Welcome back, {citizen.full_name}</h2>
          <p className="welcome-location">{citizen.address}</p>
        </div>

        <div className="tier-card-cta" onClick={onViewTierDetails}>
          <div className="tier-header">
            <span className="tier-label">KYC Status (CIS-M2)</span>
            <span className="tier-pill" style={{ backgroundColor: tierInfo.color }}>
              {tierInfo.badge}
            </span>
          </div>
          <div className="tier-body">
            <strong>Max Balance: ₹{tierInfo.max_balance.toLocaleString('en-IN')}</strong>
            <p>Single Tx Limit: ₹{tierInfo.per_tx_limit.toLocaleString('en-IN')}</p>
          </div>
          <div className="tier-footer">
            <span>{t.tiers.viewBenefits}</span>
            <ChevronRight size={14} />
          </div>
        </div>
      </div>

      {/* Main Wallet Balances (CIS-M6) */}
      <div className="wallet-hero-grid">
        {/* Available Balance Card */}
        <div className="wallet-balance-card available-card">
          <div className="card-top">
            <div className="icon-wrap available-icon">
              <Wallet size={24} />
            </div>
            <div className="currency-badge">INR (₹) · CIS-M6</div>
          </div>
          <div className="card-middle">
            <span className="balance-label">{t.wallet.balanceAvailable}</span>
            <h1 className="balance-amount">
              ₹{wallet.available_balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </h1>
            <p className="balance-subtext">Unencumbered funds ready for immediate transfer or bank cash-out.</p>
          </div>
          <div className="card-actions">
            <button className="btn btn-primary" onClick={onOpenTransfer}>
              <ArrowUpRight size={16} />
              <span>{t.wallet.transfer}</span>
            </button>
            <button className="btn btn-secondary" onClick={onOpenTopup}>
              <ArrowDownLeft size={16} />
              <span>{t.wallet.topUp}</span>
            </button>
            <button className="btn btn-secondary" onClick={onOpenCashout}>
              <Building2 size={16} />
              <span>{t.wallet.cashOut}</span>
            </button>
            <button className="btn btn-ghost" onClick={onOpenPinManage} title="Manage 4-Digit Wallet Security PIN">
              <Lock size={16} />
              <span>PIN</span>
            </button>
          </div>
        </div>

        {/* Held in Escrow Card */}
        <div className="wallet-balance-card held-card">
          <div className="card-top">
            <div className="icon-wrap held-icon">
              <Clock size={24} />
            </div>
            <span className="badge badge-amber">Active Escrows (WAL-FR-05)</span>
          </div>
          <div className="card-middle">
            <span className="balance-label">{t.wallet.balanceHeld}</span>
            <h2 className="balance-amount held-amount">
              ₹{wallet.held_balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </h2>
            <p className="balance-subtext">
              Locked in multi-actor business holds (e.g. RTO freight transit, AgriLink harvest escrow).
            </p>
          </div>
          <div className="card-footer-action">
            <button className="btn btn-secondary btn-block" onClick={onViewHolds}>
              <span>Inspect {holds.filter(h => h.status === 'HELD').length} Active Holds</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Limits & Velocity Meters (WAL-FR-08) */}
      <div className="card velocity-card">
        <div className="card-header">
          <div>
            <h3>{t.wallet.velocityTitle}</h3>
            <small className="text-muted">Enforced dynamically per KYC Tier ({citizen.kyc_tier}) and Persona ({citizen.active_persona})</small>
          </div>
          <span className="badge badge-green">Within Safe Limits</span>
        </div>
        <div className="card-body">
          <div className="velocity-grid">
            {/* Daily Velocity */}
            <div className="velocity-item">
              <div className="velocity-label-row">
                <span>{t.wallet.dailyLimit} Spent</span>
                <strong>₹{wallet.today_spent.toLocaleString('en-IN')} / ₹{tierInfo.daily_limit.toLocaleString('en-IN')}</strong>
              </div>
              <div className="progress-bar-bg">
                <div 
                  className="progress-bar-fill" 
                  style={{ width: `${dailyPercent}%`, backgroundColor: dailyPercent > 80 ? 'var(--warning-500)' : 'var(--primary-600)' }}
                />
              </div>
              <div className="velocity-foot">
                <span>{dailyPercent}% consumed</span>
                <span>₹{(tierInfo.daily_limit - wallet.today_spent).toLocaleString('en-IN')} remaining today</span>
              </div>
            </div>

            {/* Monthly Velocity */}
            <div className="velocity-item">
              <div className="velocity-label-row">
                <span>{t.wallet.monthlyLimit} Spent</span>
                <strong>₹{wallet.month_spent.toLocaleString('en-IN')} / ₹{tierInfo.monthly_limit.toLocaleString('en-IN')}</strong>
              </div>
              <div className="progress-bar-bg">
                <div 
                  className="progress-bar-fill" 
                  style={{ width: `${monthlyPercent}%`, backgroundColor: monthlyPercent > 80 ? 'var(--warning-500)' : 'var(--primary-600)' }}
                />
              </div>
              <div className="velocity-foot">
                <span>{monthlyPercent}% consumed</span>
                <span>₹{(tierInfo.monthly_limit - wallet.month_spent).toLocaleString('en-IN')} remaining this month</span>
              </div>
            </div>

            {/* Max Wallet Balance Cap */}
            <div className="velocity-item">
              <div className="velocity-label-row">
                <span>Wallet Balance Ceiling</span>
                <strong>₹{wallet.total_balance.toLocaleString('en-IN')} / ₹{tierInfo.max_balance.toLocaleString('en-IN')}</strong>
              </div>
              <div className="progress-bar-bg">
                <div 
                  className="progress-bar-fill" 
                  style={{ width: `${balancePercent}%`, backgroundColor: 'var(--accent-gold)' }}
                />
              </div>
              <div className="velocity-foot">
                <span>{balancePercent}% capacity</span>
                <span>Upgrade to T2 for ₹10,00,000 cap</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Ledger Statements (WAL-FR-03) */}
      <div className="card recent-tx-card">
        <div className="card-header">
          <div>
            <h3>{t.wallet.recentTransactions}</h3>
            <small className="text-muted">Double-entry ledger records with business references and audit trail</small>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={onViewStatements}>
            {t.wallet.viewAllStatements}
            <ChevronRight size={14} />
          </button>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Type & Purpose</th>
                  <th>Business Ref</th>
                  <th>Counterparty</th>
                  <th>Timestamp</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Amount (INR)</th>
                </tr>
              </thead>
              <tbody>
                {transactions.slice(0, 4).map((tx) => (
                  <tr key={tx.id}>
                    <td>
                      <div className="tx-cell-type">
                        <span className={`tx-type-pill ${tx.type.toLowerCase()}`}>
                          {tx.type}
                        </span>
                        <div>
                          <strong>{t.wallet.purposeCodes[tx.purpose_code] || tx.purpose_code}</strong>
                          <small className="text-muted">{tx.category}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="font-mono text-bold">{tx.business_ref}</span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.85rem' }}>{tx.counterparty}</span>
                    </td>
                    <td>
                      <span className="text-muted" style={{ fontSize: '0.82rem' }}>
                        {new Date(tx.timestamp).toLocaleDateString()} {new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${tx.status === 'COMPLETED' ? 'badge-green' : 'badge-amber'}`}>
                        {tx.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span className={`tx-amount ${tx.type === 'CREDIT' || tx.type === 'TOPUP' ? 'credit' : 'debit'}`}>
                        {tx.type === 'CREDIT' || tx.type === 'TOPUP' ? '+' : '-'} ₹{tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
