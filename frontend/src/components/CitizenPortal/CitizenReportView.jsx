import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  CreditCard,
  FileText,
  IdCard,
  Printer,
  ShieldCheck
} from 'lucide-react';
import { KYC_TIERS_INFO } from '../../data/mockData';
import { kycService } from '../../services/kycService';
import './CitizenReportView.css';

const formatDate = (value) => {
  if (!value) return 'Not available';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not available' : date.toLocaleDateString();
};

export default function CitizenReportView({ citizen, bankAccounts = [] }) {
  const [kycStatus, setKycStatus] = useState(null);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(true);
  const [documentError, setDocumentError] = useState(null);
  const [isReportGenerated, setIsReportGenerated] = useState(false);
  const [isCardGenerated, setIsCardGenerated] = useState(false);
  const [reportGeneratedAt, setReportGeneratedAt] = useState(null);
  const [cardGeneratedAt, setCardGeneratedAt] = useState(null);
  const [printMode, setPrintMode] = useState(null);

  useEffect(() => {
    let isCurrent = true;
    kycService.getKycStatus()
      .then((response) => {
        if (isCurrent) setKycStatus(response?.data || null);
      })
      .catch((error) => {
        if (isCurrent) setDocumentError(`Could not load submitted documents: ${error.message}`);
      })
      .finally(() => {
        if (isCurrent) setIsLoadingDocuments(false);
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  useEffect(() => {
    if (!printMode) return undefined;

    const handleAfterPrint = () => setPrintMode(null);
    const timeoutId = window.setTimeout(() => window.print(), 0);
    window.addEventListener('afterprint', handleAfterPrint);

    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, [printMode]);

  const tierInfo = KYC_TIERS_INFO[kycStatus?.kyc_tier || citizen.kyc_tier] || KYC_TIERS_INFO.T0;
  const documents = kycStatus?.documents || [];
  const generateReport = () => {
    setReportGeneratedAt(new Date().toISOString());
    setIsReportGenerated(true);
  };
  const generateCard = () => {
    setCardGeneratedAt(new Date().toISOString());
    setIsCardGenerated(true);
  };

  return (
    <div className="citizen-report-page" data-print-mode={printMode || ''}>
      <div className="report-page-heading">
        <div>
          <span className="report-eyebrow">YOUR ACCOUNT DOCUMENTS</span>
          <h2>Citizen report &amp; profile card</h2>
          <p>Review your saved profile, verified bank accounts, and submitted KYC documents.</p>
        </div>
        <div className="report-actions">
          {isReportGenerated && (
            <>
              <button className="btn btn-primary" onClick={generateReport}>
                <FileText size={17} />
                Refresh report
              </button>
              <button className="btn btn-secondary" onClick={() => setPrintMode('report')}>
                <Printer size={16} />
                Print / Save report
              </button>
            </>
          )}
        </div>
      </div>

      <div className="alert-callout info report-privacy-note">
        <ShieldCheck size={18} />
        <span>
          Your report only shows masked bank and document numbers. The profile card is for AgriLink
          use only; it is not a government-issued identity document or proof of citizenship.
        </span>
      </div>

      {!isReportGenerated ? (
        <div className="report-start-card">
          <div className="report-start-icon"><FileText size={24} /></div>
          <div>
            <h3>Create your account report</h3>
            <p>Generate a printable summary of your citizen profile, linked bank accounts, and KYC documents.</p>
          </div>
          <button className="btn btn-primary" onClick={generateReport}>
            Generate report
          </button>
        </div>
      ) : (
        <div className="report-document">
          <div className="report-document-heading">
            <div className="report-brand-mark">A</div>
            <div>
              <span className="report-eyebrow">AGRILINK CITIZEN PORTAL</span>
              <h3>Citizen account report</h3>
            </div>
            <span className="report-generated-date">Generated {formatDate(reportGeneratedAt)}</span>
          </div>

          <section className="report-section">
            <div className="report-section-title">
              <IdCard size={18} />
              <h4>Citizen profile</h4>
            </div>
            <div className="report-details-grid">
              <ReportDetail label="Full name" value={citizen.full_name} />
              <ReportDetail label="Citizen ID" value={citizen.citizen_id} mono />
              <ReportDetail label="Nationality" value={citizen.nationality || 'Not provided'} />
              <ReportDetail label="Date of birth" value={formatDate(citizen.date_of_birth)} />
              <ReportDetail label="Mobile" value={citizen.mobile || 'Not provided'} />
              <ReportDetail label="Email" value={citizen.email || 'Not provided'} />
              <ReportDetail label="KYC status" value={kycStatus?.status || citizen.kyc_status || 'Not submitted'} />
              <ReportDetail label="Verification tier" value={tierInfo.badge} />
              <ReportDetail label="Active persona" value={citizen.active_persona || 'Not set'} />
              <ReportDetail label="Address" value={citizen.address || 'Not provided'} wide />
            </div>
          </section>

          <section className="report-section">
            <div className="report-section-title">
              <Building2 size={18} />
              <h4>Linked bank accounts</h4>
              <span className="report-section-count">{bankAccounts.length}</span>
            </div>
            {bankAccounts.length ? (
              <div className="report-record-list">
                {bankAccounts.map((account) => (
                  <article className="report-record" key={account.id}>
                    <div className="report-record-icon"><CreditCard size={18} /></div>
                    <div className="report-record-main">
                      <strong>{account.bank_name}</strong>
                      <span>{account.account_type || 'Bank'} account · {account.account_number_masked || 'Number unavailable'}</span>
                    </div>
                    <div className="report-record-meta">
                      <span>{account.ifsc_code || 'IFSC unavailable'}</span>
                      <span className={account.is_primary ? 'report-primary-label' : ''}>
                        {account.is_primary ? 'Default' : (account.verification_status || 'Linked')}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="report-empty-state">No bank accounts are linked to this profile.</p>
            )}
          </section>

          <section className="report-section">
            <div className="report-section-title">
              <FileText size={18} />
              <h4>Submitted KYC documents</h4>
              <span className="report-section-count">{documents.length}</span>
            </div>
            {isLoadingDocuments ? (
              <p className="report-empty-state">Loading submitted documents…</p>
            ) : documentError ? (
              <div className="alert-callout danger report-document-error" role="alert">
                <AlertCircle size={17} />
                <span>{documentError}</span>
              </div>
            ) : documents.length ? (
              <div className="report-record-list">
                {documents.map((document) => (
                  <article className="report-record" key={document.document_id}>
                    <div className="report-record-icon"><FileText size={18} /></div>
                    <div className="report-record-main">
                      <strong>{(document.document_type || 'Document').replaceAll('_', ' ')}</strong>
                      <span>{document.document_number_masked ? `Number: ${document.document_number_masked}` : 'Number hidden'}</span>
                    </div>
                    <div className="report-record-meta">
                      <span>{document.status || 'Submitted'}</span>
                      <span>{formatDate(document.submitted_at || document.created_at)}</span>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="report-empty-state">No KYC documents have been submitted yet.</p>
            )}
          </section>

          <p className="report-disclaimer">
            This report is an account summary generated by AgriLink. It is not a bank statement,
            government certificate, or proof of identity.
          </p>
        </div>
      )}

      <section className="citizen-card-section">
        <div className="citizen-card-intro">
          <div>
            <span className="report-eyebrow">OPTIONAL</span>
            <h3>AgriLink citizen profile card</h3>
            <p>Generate a compact, printable profile card using the details in your account.</p>
          </div>
          <button className="btn btn-secondary" onClick={generateCard}>
            <IdCard size={17} />
            {isCardGenerated ? 'Refresh card' : 'Generate citizen card'}
          </button>
        </div>

        {isCardGenerated && (
          <div className="citizen-card-output">
            <article className="citizen-profile-card">
              <div className="citizen-card-topline">
                <div className="citizen-card-brand">
                  <span className="citizen-card-brand-icon">A</span>
                  <span>AGRILINK <small>CITIZEN PROFILE</small></span>
                </div>
                <span className="citizen-card-chip"><CheckCircle2 size={14} /> {citizen.kyc_status || 'PROFILE'}</span>
              </div>
              <div className="citizen-card-content">
                <div className="citizen-card-avatar" aria-hidden="true">
                  {citizen.full_name?.trim().charAt(0)?.toUpperCase() || 'C'}
                </div>
                <div className="citizen-card-info">
                  <span className="citizen-card-label">CARDHOLDER</span>
                  <h4>{citizen.full_name || 'Citizen'}</h4>
                  <span className="citizen-card-id">{citizen.citizen_id}</span>
                  <div className="citizen-card-fields">
                    <span><small>NATIONALITY</small>{citizen.nationality || 'Not provided'}</span>
                    <span><small>PROFILE TIER</small>{tierInfo.badge}</span>
                    <span><small>PERSONA</small>{citizen.active_persona || 'Not set'}</span>
                  </div>
                </div>
              </div>
              <div className="citizen-card-footer">
                <span>Issued {formatDate(cardGeneratedAt)}</span>
                <span>AgriLink account card · Not government-issued</span>
              </div>
            </article>
            <button className="btn btn-secondary citizen-card-print" onClick={() => setPrintMode('card')}>
              <Printer size={16} />
              Print / Save card
            </button>
            <p className="citizen-card-disclaimer">
              This card identifies an AgriLink account only. It is not a government ID and cannot
              be used as official proof of identity or citizenship.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

function ReportDetail({ label, value, mono = false, wide = false }) {
  return (
    <div className={`report-detail ${wide ? 'wide' : ''}`}>
      <span>{label}</span>
      <strong className={mono ? 'font-mono' : ''}>{value || 'Not provided'}</strong>
    </div>
  );
}
