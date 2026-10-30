import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Key, 
  Lock, 
  Users, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  Layers,
  ArrowRight
} from 'lucide-react';
import { INITIAL_RBAC_ROLES } from '../../data/mockData';

export default function RbacManagement() {
  const [roles, setRoles] = useState(INITIAL_RBAC_ROLES);
  const [selectedRole, setSelectedRole] = useState(roles[0]);

  // Service-to-service policy decisions (AgriLink, RTO, APMC)
  const servicePolicies = [
    {
      service: "AgriLink Core (AGL-M7, M8)",
      policy: "ALLOW_HOLD_AND_RELEASE",
      scopes: ["holds:create", "holds:release", "tokens:verify"],
      condition: "Must possess valid mTLS cert + signed JWT with active_persona claim"
    },
    {
      service: "RTO Logistics (RTO-M4)",
      policy: "ALLOW_FREIGHT_ESCROW",
      scopes: ["holds:create", "holds:refund", "events:subscribe"],
      condition: "Limited to freight escrow and delivery geo-confirmation"
    },
    {
      service: "APMC State Mandi (APMC-M3)",
      policy: "ALLOW_TRADE_SETTLEMENT",
      scopes: ["holds:create", "split_settlement:post", "cess:levy"],
      condition: "Enforced rate limit: 500 TPS peak"
    }
  ];

  return (
    <div className="rbac-management-view">
      <div className="view-header-row" style={{ marginBottom: '20px' }}>
        <div>
          <h2>Role-Based Access Control (RBAC) & Service Policies</h2>
          <p className="text-muted">
            CID-FR-13 · Administrator Role Definitions, Granular Capability Permissions & Machine-to-Machine Service Policies
          </p>
        </div>
      </div>

      <div className="grid-2" style={{ gap: '24px', alignItems: 'flex-start' }}>
        {/* Administrator Roles Matrix */}
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={18} className="text-primary" />
              <h3>Administrator Roles (CID-FR-13)</h3>
            </div>
          </div>
          <div className="card-body" style={{ padding: '0 20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {roles.map((r, i) => (
                <div 
                  key={r.role_id}
                  style={{
                    padding: '16px 0',
                    borderBottom: i < roles.length - 1 ? '1px solid var(--slate-100)' : 'none',
                    cursor: 'pointer'
                  }}
                  onClick={() => setSelectedRole(r)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <strong style={{ fontSize: '0.95rem' }}>{r.name}</strong>
                      {selectedRole.role_id === r.role_id && <span className="badge badge-green">SELECTED</span>}
                    </div>
                    <span className="font-mono text-muted" style={{ fontSize: '0.75rem' }}>{r.role_id}</span>
                  </div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--slate-600)', margin: '4px 0 10px' }}>
                    {r.description}
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {r.permissions.map((perm) => (
                      <span key={perm} className="badge badge-blue font-mono" style={{ fontSize: '0.68rem', textTransform: 'none' }}>
                        {perm}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Service-to-Service Authorization Policies */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="card">
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Lock size={18} className="text-primary" />
                <h3>Machine-to-Machine Service Policies</h3>
              </div>
              <span className="badge badge-purple">mTLS + JWT</span>
            </div>
            <div className="card-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {servicePolicies.map((sp, idx) => (
                  <div key={idx} style={{ background: 'var(--slate-50)', padding: '14px', borderRadius: '10px', border: '1px solid var(--slate-200)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <strong>{sp.service}</strong>
                      <span className="badge badge-green font-mono">{sp.policy}</span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--slate-600)', marginBottom: '8px' }}>
                      Condition: {sp.condition}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {sp.scopes.map(sc => (
                        <span key={sc} className="badge badge-gray font-mono" style={{ fontSize: '0.68rem' }}>
                          scope: {sc}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
