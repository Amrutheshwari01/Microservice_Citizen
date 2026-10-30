import React, { useState } from 'react';
import { 
  Layers, 
  CheckCircle2, 
  Clock, 
  PlusCircle, 
  ArrowRight, 
  ShieldCheck, 
  Truck, 
  Building, 
  Wheat, 
  ShoppingBag,
  AlertCircle,
  X
} from 'lucide-react';

export default function PersonaManagementView({
  citizen,
  onSwitchPersona,
  onSubmitPersonaApplication
}) {
  const [applyModalPersona, setApplyModalPersona] = useState(null);
  const [fpoName, setFpoName] = useState('');
  const [licenseRef, setLicenseRef] = useState('');
  const [notes, setNotes] = useState('');
  const [submittedMessage, setSubmittedMessage] = useState(null);

  const availableRoles = [
    {
      id: "FARMER",
      name: "Farmer Producer",
      icon: "🚜",
      restricted: false,
      tierRequired: "T0",
      description: "Produce cultivation, seed inputs, crop sales, APMC auction bids, direct wallet credits."
    },
    {
      id: "BUYER",
      name: "Mandi Trader / Buyer",
      icon: "💼",
      restricted: false,
      tierRequired: "T1",
      description: "Commercial mandi procurement, lot bidding, bulk escrow deposit, cold storage haulage booking."
    },
    {
      id: "AGGREGATOR",
      name: "FPO Aggregator",
      icon: "🏢",
      restricted: true,
      tierRequired: "T2",
      description: "Pooling produce from hundreds of village farmers, bulk logistics contracts, multi-account split settlement."
    },
    {
      id: "DELIVERY_PERSON",
      name: "Rural Freight Transporter",
      icon: "🚚",
      restricted: true,
      tierRequired: "T2",
      description: "RTO-linked vehicle transit, temperature-controlled cold cargo transit, automated freight escrow payouts."
    }
  ];

  const handleApplySubmit = (e) => {
    e.preventDefault();
    onSubmitPersonaApplication({
      persona: applyModalPersona,
      fpo_name: fpoName || 'Rural Transporter Fleet',
      license_ref: licenseRef || 'MH-REG-2026-9921',
      notes: notes || 'Verified with relevant district transport / agricultural authority.'
    });
    setSubmittedMessage(`Application for ${applyModalPersona} submitted successfully to Administrator Approval Queue (CID-FR-08)!`);
    setApplyModalPersona(null);
    setFpoName('');
    setLicenseRef('');
    setNotes('');
    setTimeout(() => setSubmittedMessage(null), 6000);
  };

  return (
    <div className="persona-management-view">
      <div className="view-header-row" style={{ marginBottom: '24px' }}>
        <div>
          <h2>Citizen Personas & Dynamic Authorization</h2>
          <p className="text-muted">
            CID-FR-08 & CID-FR-09 · Multi-Role Identity Claims, Restricted Persona Approvals & Instant Token Switching
          </p>
        </div>
      </div>

      {submittedMessage && (
        <div className="alert-callout success" style={{ marginBottom: '20px' }}>
          <CheckCircle2 size={20} />
          <span>{submittedMessage}</span>
        </div>
      )}

      {/* Active Persona Banner (CID-FR-09) */}
      <div className="card" style={{ marginBottom: '24px', background: 'linear-gradient(135deg, #064e3b, #047857)', color: 'white', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span className="badge badge-green" style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none' }}>
                CID-FR-09 Active in JWT Token
              </span>
              <span className="badge badge-purple" style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none' }}>
                Next Token Carries Claim
              </span>
            </div>
            <h2 style={{ fontSize: '1.6rem', color: 'white', margin: '4px 0' }}>
              Current Active Persona: {citizen.active_persona}
            </h2>
            <p style={{ opacity: 0.9, fontSize: '0.9rem', maxWidth: '580px', margin: 0 }}>
              Every API call and authorization decision across AgriLink, RTO Logistics, and APMC Mandi is evaluated against this active persona claim.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            {citizen.personas.map(persona => (
              <button
                key={persona}
                className={`btn ${citizen.active_persona === persona ? 'btn-gold' : 'btn-secondary'}`}
                style={{ borderRadius: '999px', padding: '8px 18px' }}
                onClick={() => onSwitchPersona(persona)}
              >
                <span>{persona === 'FARMER' ? '🚜' : '💼'} Switch to {persona}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Personas Grid */}
      <h3 style={{ fontSize: '1.15rem', marginBottom: '16px' }}>All Citizen Personas & Eligibility</h3>
      <div className="grid-2" style={{ gap: '20px', marginBottom: '28px' }}>
        {availableRoles.map(role => {
          const isAssigned = citizen.personas.includes(role.id);
          const isActive = citizen.active_persona === role.id;
          const pendingApp = citizen.pending_persona_applications?.find(a => a.persona === role.id && a.status === 'PENDING_APPROVAL');

          return (
            <div key={role.id} className="card" style={{ padding: '20px', position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ fontSize: '2rem' }}>{role.icon}</div>
                  <div>
                    <h4 style={{ fontSize: '1.1rem', margin: 0 }}>{role.name}</h4>
                    <span className="font-mono text-muted" style={{ fontSize: '0.75rem' }}>{role.id}</span>
                  </div>
                </div>

                <div>
                  {isActive && <span className="badge badge-green">ACTIVE NOW</span>}
                  {isAssigned && !isActive && <span className="badge badge-blue">ASSIGNED</span>}
                  {pendingApp && <span className="badge badge-amber">IN ADMIN REVIEW</span>}
                  {!isAssigned && !pendingApp && role.restricted && <span className="badge badge-purple">RESTRICTED</span>}
                </div>
              </div>

              <p style={{ fontSize: '0.85rem', color: 'var(--slate-600)', marginBottom: '14px', minHeight: '40px' }}>
                {role.description}
              </p>

              <div style={{ background: 'var(--slate-50)', padding: '10px 14px', borderRadius: '8px', fontSize: '0.78rem', marginBottom: '14px', display: 'flex', justifyContent: 'space-between' }}>
                <span>Minimum Tier Required: <strong>{role.tierRequired}</strong></span>
                <span>Approval: {role.restricted ? 'Admin Sign-off Required' : 'Instant Self-Assign'}</span>
              </div>

              <div>
                {isActive ? (
                  <button className="btn btn-secondary btn-block" disabled>
                    <CheckCircle2 size={16} className="text-success" />
                    <span>Currently Active Persona</span>
                  </button>
                ) : isAssigned ? (
                  <button className="btn btn-primary btn-block" onClick={() => onSwitchPersona(role.id)}>
                    <Layers size={16} />
                    <span>Switch to this Persona (CID-FR-09)</span>
                  </button>
                ) : pendingApp ? (
                  <button className="btn btn-secondary btn-block" disabled>
                    <Clock size={16} className="text-warning" />
                    <span>Application Pending Admin Approval</span>
                  </button>
                ) : (
                  <button 
                    className="btn btn-gold btn-block"
                    onClick={() => setApplyModalPersona(role.id)}
                  >
                    <PlusCircle size={16} />
                    <span>Apply for {role.name}</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Application Modal (CID-FR-08) */}
      {applyModalPersona && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Building size={18} className="text-primary" />
                <div>
                  <h3 style={{ fontSize: '1rem', margin: 0 }}>Apply for Restricted Persona: {applyModalPersona}</h3>
                  <small className="text-muted">CID-FR-08 · Requires Compliance Desk Approval</small>
                </div>
              </div>
              <button className="btn-close" onClick={() => setApplyModalPersona(null)}><X size={18} /></button>
            </div>

            <form onSubmit={handleApplySubmit}>
              <div className="modal-body">
                <div className="alert-callout info" style={{ marginBottom: '16px' }}>
                  <ShieldCheck size={16} />
                  <span>
                    Applications are routed to the Administrator Approval Queue. KYC Tier 2 verification status is checked before granting the claim.
                  </span>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    {applyModalPersona === 'AGGREGATOR' ? 'FPO / Cooperative Society Name' : 'Transport Fleet / Business Name'}
                  </label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. Sinnar Farmers Collective Ltd"
                    value={fpoName}
                    onChange={(e) => setFpoName(e.target.value)}
                    required 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    {applyModalPersona === 'AGGREGATOR' ? 'FPO Registration / Trade License Ref' : 'Commercial Driving License / Fleet Permit Ref'}
                  </label>
                  <input 
                    type="text" 
                    className="form-input font-mono" 
                    placeholder="e.g. MH-AGR-2026-9912"
                    value={licenseRef}
                    onChange={(e) => setLicenseRef(e.target.value)}
                    required 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Application Purpose & Notes</label>
                  <textarea 
                    className="form-textarea" 
                    rows={3}
                    placeholder="Describe your operational scope, village jurisdiction, or fleet capacity..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setApplyModalPersona(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Submit to Admin Queue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
