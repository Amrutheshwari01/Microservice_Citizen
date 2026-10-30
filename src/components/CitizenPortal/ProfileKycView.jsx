import React, { useState } from 'react';
import { 
  User, 
  ShieldCheck, 
  FileCheck, 
  Upload, 
  History, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Edit3, 
  Save, 
  X,
  CreditCard,
  Building,
  Lock
} from 'lucide-react';
import { KYC_TIERS_INFO } from '../../data/mockData';
import confetti from 'canvas-confetti';

export default function ProfileKycView({
  citizen,
  profileHistory,
  onUpdateProfile,
  onUpgradeKycTier
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    full_name: citizen.full_name,
    email: citizen.email,
    mobile: citizen.mobile,
    address: citizen.address,
    nationality: citizen.nationality,
    language: citizen.language
  });

  // KYC submission form state
  const [kycDocType, setKycDocType] = useState('AADHAAR'); // 'AADHAAR', 'PAN', 'PASSPORT'
  const [idNumber, setIdNumber] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [kycSuccessMsg, setKycSuccessMsg] = useState(null);

  const tierInfo = KYC_TIERS_INFO[citizen.kyc_tier] || KYC_TIERS_INFO.T0;

  const handleProfileSubmit = (e) => {
    e.preventDefault();
    onUpdateProfile(formData);
    setIsEditing(false);
  };

  const handleKycSubmit = (e) => {
    e.preventDefault();
    if (!idNumber) {
      alert('Please enter your document identification number.');
      return;
    }

    setIsVerifying(true);
    // Simulate KYC adapter processing (CID-FR-06 & CID-FR-07)
    setTimeout(() => {
      setIsVerifying(false);
      const nextTier = citizen.kyc_tier === 'T0' ? 'T1' : 'T2';
      const maskedRef = idNumber.length > 4 
        ? `${'X'.repeat(idNumber.length - 4)}${idNumber.slice(-4)}`
        : 'XXXX-XXXX-9912';

      onUpgradeKycTier(nextTier, maskedRef, kycDocType);
      
      // Trigger festive celebration confetti
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch (err) {}

      setKycSuccessMsg(`KYC verified successfully by UIDAI / NSDL Adapter! Upgraded to ${nextTier} with increased transaction limits!`);
      setTimeout(() => setKycSuccessMsg(null), 6000);
      setIdNumber('');
    }, 1200);
  };

  return (
    <div className="profile-kyc-view">
      <div className="view-header-row" style={{ marginBottom: '24px' }}>
        <div>
          <h2>Citizen Identity, Profile & KYC Verification</h2>
          <p className="text-muted">
            CID-FR-05, CID-FR-06 & CID-FR-07 · Verified Personal Identity, Audit History & Tier Entitlements
          </p>
        </div>
      </div>

      {kycSuccessMsg && (
        <div className="alert-callout success" style={{ marginBottom: '20px' }}>
          <CheckCircle2 size={20} />
          <span>{kycSuccessMsg}</span>
        </div>
      )}

      {/* KYC Tier Overview & Entitlements Banner (CID-FR-07) */}
      <div className="card" style={{ marginBottom: '24px', borderLeft: `6px solid ${tierInfo.color}`, padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span className="badge" style={{ backgroundColor: tierInfo.color, color: 'white' }}>
                Active KYC Tier: {citizen.kyc_tier}
              </span>
              <span className="badge badge-green">Claim in JWT (CIS-M4)</span>
            </div>
            <h3 style={{ fontSize: '1.3rem', margin: '4px 0' }}>{tierInfo.name}</h3>
            <p className="text-muted" style={{ fontSize: '0.85rem' }}>{tierInfo.description}</p>
          </div>

          <div style={{ textAlign: 'right' }}>
            <span className="text-muted" style={{ fontSize: '0.8rem' }}>Single Citizen ID</span>
            <div className="font-mono text-bold" style={{ fontSize: '1.1rem' }}>{citizen.citizen_id}</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--slate-500)' }}>
              Verified via: {citizen.kyc_details.provider}
            </div>
          </div>
        </div>

        {/* Comparison Grid */}
        <div className="grid-3" style={{ background: 'var(--slate-50)', padding: '16px', borderRadius: '12px' }}>
          {Object.entries(KYC_TIERS_INFO).map(([tierKey, info]) => {
            const isCurrent = citizen.kyc_tier === tierKey;
            return (
              <div 
                key={tierKey} 
                style={{
                  background: 'white',
                  borderRadius: '10px',
                  padding: '14px',
                  border: isCurrent ? `2px solid ${info.color}` : '1px solid var(--slate-200)',
                  position: 'relative'
                }}
              >
                {isCurrent && (
                  <span 
                    style={{
                      position: 'absolute',
                      top: '-10px',
                      right: '12px',
                      background: info.color,
                      color: 'white',
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '999px'
                    }}
                  >
                    CURRENT TIER
                  </span>
                )}
                <h4 style={{ fontSize: '0.95rem', color: info.color, marginBottom: '6px' }}>{info.name}</h4>
                <div style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div><strong>Max Balance:</strong> ₹{info.max_balance.toLocaleString('en-IN')}</div>
                  <div><strong>Single Tx:</strong> ₹{info.per_tx_limit.toLocaleString('en-IN')}</div>
                  <div><strong>Monthly Limit:</strong> ₹{info.monthly_limit.toLocaleString('en-IN')}</div>
                  <div style={{ marginTop: '4px', color: 'var(--slate-600)' }}>
                    <strong>Personas:</strong> {info.unlocked_personas.join(', ')}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid-2" style={{ alignItems: 'flex-start', gap: '24px' }}>
        {/* Left Column: Profile View & Edit (CID-FR-05) */}
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <User size={18} className="text-primary" />
              <h3>Citizen Profile Details</h3>
            </div>
            {!isEditing ? (
              <button className="btn btn-secondary btn-sm" onClick={() => setIsEditing(true)}>
                <Edit3 size={14} />
                <span>Edit Profile</span>
              </button>
            ) : (
              <button className="btn btn-ghost btn-sm" onClick={() => setIsEditing(false)}>
                <X size={14} />
                <span>Cancel</span>
              </button>
            )}
          </div>

          <div className="card-body">
            {!isEditing ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <span className="text-muted" style={{ fontSize: '0.78rem' }}>Full Legal Name</span>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{citizen.full_name}</div>
                </div>
                <div className="grid-2">
                  <div>
                    <span className="text-muted" style={{ fontSize: '0.78rem' }}>Mobile Number</span>
                    <div className="font-mono">{citizen.mobile}</div>
                  </div>
                  <div>
                    <span className="text-muted" style={{ fontSize: '0.78rem' }}>Email Address</span>
                    <div>{citizen.email}</div>
                  </div>
                </div>
                <div>
                  <span className="text-muted" style={{ fontSize: '0.78rem' }}>Residential Address</span>
                  <div>{citizen.address}</div>
                </div>
                <div className="grid-2">
                  <div>
                    <span className="text-muted" style={{ fontSize: '0.78rem' }}>Nationality</span>
                    <div>{citizen.nationality}</div>
                  </div>
                  <div>
                    <span className="text-muted" style={{ fontSize: '0.78rem' }}>Language Preference</span>
                    <div>{citizen.language === 'hi' ? 'Hindi (हिन्दी)' : citizen.language === 'kn' ? 'Kannada (ಕನ್ನಡ)' : 'English (en)'}</div>
                  </div>
                </div>
                <div className="alert-callout info" style={{ marginTop: '10px' }}>
                  <Lock size={15} />
                  <span style={{ fontSize: '0.75rem' }}>
                    Data Minimisation & Masking: Primary IDs stored only as tokenized references (CIS-N04).
                  </span>
                </div>
              </div>
            ) : (
              <form onSubmit={handleProfileSubmit}>
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    required 
                  />
                </div>
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Mobile</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={formData.mobile}
                      onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input 
                      type="email" 
                      className="form-input" 
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Address</label>
                  <textarea 
                    className="form-textarea" 
                    rows={2} 
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    required 
                  />
                </div>
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Nationality</label>
                    <select 
                      className="form-select"
                      value={formData.nationality}
                      onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                    >
                      <option value="Indian">Indian</option>
                      <option value="OCI">OCI</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Language</label>
                    <select 
                      className="form-select"
                      value={formData.language}
                      onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                    >
                      <option value="en">English</option>
                      <option value="hi">Hindi (हिन्दी)</option>
                      <option value="kn">Kannada (ಕನ್ನಡ)</option>
                    </select>
                  </div>
                </div>
                <button type="submit" className="btn btn-primary btn-block">
                  <Save size={16} />
                  <span>Save Changes & Log to History (CID-FR-05)</span>
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Right Column: KYC Submission (CID-FR-06) & Change History */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* KYC Submission Card */}
          <div className="card">
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={18} className="text-primary" />
                <h3>KYC Document Submission & Upgrade</h3>
              </div>
              <span className="badge badge-green">Adapter Ready</span>
            </div>

            <div className="card-body">
              <form onSubmit={handleKycSubmit}>
                <div className="form-group">
                  <label className="form-label">Select Document Type (CID-FR-06)</label>
                  <select 
                    className="form-select"
                    value={kycDocType}
                    onChange={(e) => setKycDocType(e.target.value)}
                  >
                    <option value="AADHAAR">Aadhaar Card (UIDAI Adapter with OTP & Masking)</option>
                    <option value="PAN">PAN Card (NSDL Income Tax Verification)</option>
                    <option value="PASSPORT">Passport / Voter ID (Physical / DigiLocker)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    {kycDocType === 'AADHAAR' ? 'Aadhaar Number (Will be tokenized)' : kycDocType === 'PAN' ? 'PAN Number' : 'Passport Number'}
                  </label>
                  <input 
                    type="text" 
                    className="form-input font-mono" 
                    placeholder={kycDocType === 'AADHAAR' ? '•••• •••• 8921' : 'ABCDE1234F'}
                    value={idNumber}
                    onChange={(e) => setIdNumber(e.target.value)}
                    required 
                  />
                  <div className="form-help">
                    Stored only as masked / tokenized references (CIS-N04 data minimisation).
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Upload Document Scan (Optional OCR Simulation)</label>
                  <div 
                    style={{
                      border: '2px dashed var(--slate-300)',
                      borderRadius: '8px',
                      padding: '16px',
                      textAlign: 'center',
                      background: 'var(--slate-50)',
                      cursor: 'pointer'
                    }}
                    onClick={() => setSelectedFile({ name: `${kycDocType}_Document_Scan.pdf` })}
                  >
                    <Upload size={20} className="text-muted" style={{ margin: '0 auto 6px' }} />
                    <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                      {selectedFile ? selectedFile.name : 'Click to select sample PDF / image'}
                    </div>
                    <small className="text-muted">Aadhaar e-KYC XML, PAN photo, or DigiLocker signed doc</small>
                  </div>
                </div>

                <button 
                  type="submit" 
                  className="btn btn-primary btn-block"
                  disabled={isVerifying}
                >
                  {isVerifying ? 'Verifying with Government Adapter...' : `Submit & Upgrade to ${citizen.kyc_tier === 'T0' ? 'T1' : 'T2'} Tier`}
                </button>
              </form>
            </div>
          </div>

          {/* Change History Audit Log (CID-FR-05) */}
          <div className="card">
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <History size={18} />
                <h3>Profile Change History (CID-FR-05)</h3>
              </div>
              <span className="badge badge-gray">{profileHistory.length} Recorded</span>
            </div>
            <div className="card-body" style={{ padding: '0 20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {profileHistory.map((item, idx) => (
                  <div 
                    key={item.id}
                    style={{
                      padding: '12px 0',
                      borderBottom: idx < profileHistory.length - 1 ? '1px solid var(--slate-100)' : 'none',
                      fontSize: '0.82rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                      <strong>{item.changed_field}</strong>
                      <span className="text-muted font-mono" style={{ fontSize: '0.72rem' }}>
                        {new Date(item.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                    <div style={{ color: 'var(--slate-600)' }}>
                      Changed from <span style={{ textDecoration: 'line-through', color: 'var(--danger-500)' }}>{item.old_value}</span> to <span style={{ color: 'var(--primary-700)', fontWeight: 600 }}>{item.new_value}</span>
                    </div>
                    <div className="text-muted font-mono" style={{ fontSize: '0.7rem', marginTop: '2px' }}>
                      By: {item.changed_by} · IP: {item.ip_address}
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
