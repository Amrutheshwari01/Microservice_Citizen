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
  Lock,
  Camera,
  FileText
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
    nationality: citizen.nationality || 'Indian',
    language: citizen.language || 'en',
    date_of_birth: citizen.date_of_birth || '1992-05-14',
    gender: citizen.gender || 'Male'
  });

  // KYC Submission state
  const [kycDocType, setKycDocType] = useState('PAN'); // PAN, AADHAAR, PASSPORT, DRIVING_LICENCE, GST_CERTIFICATE, FARMER_CERTIFICATE
  const [isVerifying, setIsVerifying] = useState(false);
  const [kycSuccessMsg, setKycSuccessMsg] = useState(null);
  const [kycErrorMsg, setKycErrorMsg] = useState(null);

  // Document-specific typed form states
  const [panForm, setPanForm] = useState({
    pan_number: '',
    name_on_pan: citizen.full_name || '',
    date_of_birth: '1992-05-14'
  });

  const [aadhaarForm, setAadhaarForm] = useState({
    aadhaar_last4: '',
    name_on_aadhaar: citizen.full_name || '',
    consent_granted: true
  });

  const [passportForm, setPassportForm] = useState({
    passport_number: '',
    surname: '',
    given_names: citizen.full_name || '',
    nationality_code: 'IN',
    expiry_date: ''
  });

  const [dlForm, setDlForm] = useState({
    licence_number: '',
    name_on_licence: citizen.full_name || '',
    issuing_state_code: 'KA',
    expiry_date: '',
    vehicle_classes: 'LMV, MCWG'
  });

  const [gstForm, setGstForm] = useState({
    gstin: '',
    legal_business_name: '',
    trade_name: '',
    registration_date: ''
  });

  const [farmerForm, setFarmerForm] = useState({
    certificate_type: 'FARMER_ID',
    survey_number: '',
    land_area_acres: '4.5',
    district: 'Bengaluru Rural'
  });

  const [uploadedFiles, setUploadedFiles] = useState({});

  const tierInfo = KYC_TIERS_INFO[citizen.kyc_tier] || KYC_TIERS_INFO.T0;

  const handleProfileSubmit = (e) => {
    e.preventDefault();
    onUpdateProfile(formData);
    setIsEditing(false);
  };

  const handleFileSelect = (slot, file) => {
    setUploadedFiles(prev => ({
      ...prev,
      [slot]: file
    }));
  };

  const handleKycSubmit = (e) => {
    e.preventDefault();
    setKycErrorMsg(null);

    let docNumberMasked = 'XXXX-9912';

    if (kycDocType === 'PAN') {
      if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(panForm.pan_number.trim().toUpperCase())) {
        setKycErrorMsg('Invalid PAN format (Expected format: ABCDE1234F).');
        return;
      }
      docNumberMasked = `${panForm.pan_number.slice(0, 2)}•••••${panForm.pan_number.slice(-2)}`.toUpperCase();
    } else if (kycDocType === 'AADHAAR') {
      if (!/^\d{4}$/.test(aadhaarForm.aadhaar_last4.trim())) {
        setKycErrorMsg('Please enter the last 4 digits of your Aadhaar card.');
        return;
      }
      if (!aadhaarForm.consent_granted) {
        setKycErrorMsg('You must provide consent for Aadhaar-based KYC verification.');
        return;
      }
      docNumberMasked = `•••• •••• ${aadhaarForm.aadhaar_last4}`;
    } else if (kycDocType === 'PASSPORT') {
      if (!passportForm.passport_number.trim()) {
        setKycErrorMsg('Please enter your Passport number.');
        return;
      }
      docNumberMasked = `${passportForm.passport_number.slice(0, 1)}••••••${passportForm.passport_number.slice(-1)}`.toUpperCase();
    } else if (kycDocType === 'DRIVING_LICENCE') {
      if (!dlForm.licence_number.trim()) {
        setKycErrorMsg('Please enter your Driving Licence number.');
        return;
      }
      docNumberMasked = `DL-••••-${dlForm.licence_number.slice(-4)}`.toUpperCase();
    } else if (kycDocType === 'GST_CERTIFICATE') {
      if (!gstForm.gstin.trim() || gstForm.gstin.length < 15) {
        setKycErrorMsg('Please enter a valid 15-character GSTIN.');
        return;
      }
      docNumberMasked = `${gstForm.gstin.slice(0, 2)}•••••••••${gstForm.gstin.slice(-3)}`.toUpperCase();
    } else if (kycDocType === 'FARMER_CERTIFICATE') {
      if (!farmerForm.survey_number.trim()) {
        setKycErrorMsg('Please enter the agricultural Land Survey or Farmer ID number.');
        return;
      }
      docNumberMasked = `FRM-SURV-${farmerForm.survey_number}`;
    }

    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      const nextTier = citizen.kyc_tier === 'T0' ? 'T1' : 'T2';
      onUpgradeKycTier(nextTier, docNumberMasked, kycDocType);

      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch (err) {}

      setKycSuccessMsg(`Document (${kycDocType.replace('_', ' ')}) submitted and verified successfully! Account upgraded to ${nextTier} Tier with elevated limits.`);
      setTimeout(() => setKycSuccessMsg(null), 6000);
    }, 1200);
  };

  return (
    <div className="profile-kyc-view">
      <div className="view-header-row" style={{ marginBottom: '24px' }}>
        <div>
          <h2>Citizen Identity, Profile & KYC Verification</h2>
          <p className="text-muted">
            Verified Personal Identity, Audit History & Tier Entitlements
          </p>
        </div>
      </div>

      {kycSuccessMsg && (
        <div className="alert-callout success" style={{ marginBottom: '20px' }}>
          <CheckCircle2 size={20} />
          <span>{kycSuccessMsg}</span>
        </div>
      )}

      {/* KYC Tier Overview & Entitlements Banner */}
      <div className="card" style={{ marginBottom: '24px', borderLeft: `6px solid ${tierInfo.color}`, padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span className="badge" style={{ backgroundColor: tierInfo.color, color: 'white' }}>
                Active KYC Tier: {citizen.kyc_tier}
              </span>
              <span className="badge badge-green">Verified Claim in Token</span>
            </div>
            <h3 style={{ fontSize: '1.3rem', margin: '4px 0' }}>{tierInfo.name}</h3>
            <p className="text-muted" style={{ fontSize: '0.85rem' }}>{tierInfo.description}</p>
          </div>

          <div style={{ textAlign: 'right' }}>
            <span className="text-muted" style={{ fontSize: '0.8rem' }}>Citizen Identifier</span>
            <div className="font-mono text-bold" style={{ fontSize: '1.1rem' }}>{citizen.citizen_id}</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--slate-500)' }}>
              Verified via: {citizen.kyc_details?.provider || 'Platform Verification Rail'}
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
        {/* Left Column: Profile View & Edit */}
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <User size={18} className="text-primary" />
              <h3>Citizen Profile Details</h3>
            </div>
            {!isEditing && (
              <button 
                className="secondary-btn" 
                onClick={() => setIsEditing(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', padding: '6px 12px' }}
              >
                <Edit3 size={14} />
                <span>Edit Profile</span>
              </button>
            )}
          </div>

          <div className="card-body">
            {/* Avatar Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid var(--slate-100)' }}>
              <div style={{ position: 'relative' }}>
                <div className="avatar-circle" style={{ width: '64px', height: '64px', fontSize: '1.5rem', background: 'var(--primary-700)', color: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {citizen.full_name?.charAt(0) || 'C'}
                </div>
                <label style={{ position: 'absolute', bottom: 0, right: 0, background: '#fff', border: '1px solid var(--slate-300)', borderRadius: '50%', padding: '4px', cursor: 'pointer', boxShadow: 'var(--shadow-sm)' }}>
                  <Camera size={14} className="text-primary" />
                  <input type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={(e) => {
                    if (e.target.files[0]) {
                      alert('Profile photo selected: ' + e.target.files[0].name);
                    }
                  }} />
                </label>
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '1.1rem' }}>{citizen.full_name}</h4>
                <div style={{ fontSize: '0.82rem', color: 'var(--slate-500)', marginTop: '2px' }}>
                  Member since {citizen.created_at ? new Date(citizen.created_at).toLocaleDateString() : '2026'}
                </div>
              </div>
            </div>

            {isEditing ? (
              <form onSubmit={handleProfileSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label className="form-label">Full Name</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    required
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label className="form-label">Email</label>
                    <input 
                      type="email" 
                      className="form-input" 
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="form-label">Mobile</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={formData.mobile}
                      onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label className="form-label">Date of Birth</label>
                    <input 
                      type="date" 
                      className="form-input" 
                      value={formData.date_of_birth}
                      onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="form-label">Gender</label>
                    <select 
                      className="form-input"
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                      <option value="Prefer not to say">Prefer not to say</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                  <button type="button" className="secondary-btn" onClick={() => setIsEditing(false)}>Cancel</button>
                  <button type="submit" className="primary-btn">Save Changes</button>
                </div>
              </form>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.9rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--slate-100)', paddingBottom: '8px' }}>
                  <span className="text-muted">Legal Name:</span>
                  <strong>{citizen.full_name}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--slate-100)', paddingBottom: '8px' }}>
                  <span className="text-muted">Email:</span>
                  <span>{citizen.email}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--slate-100)', paddingBottom: '8px' }}>
                  <span className="text-muted">Mobile:</span>
                  <span>{citizen.mobile}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--slate-100)', paddingBottom: '8px' }}>
                  <span className="text-muted">Nationality:</span>
                  <span>{citizen.nationality || 'Indian (IN)'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--slate-100)', paddingBottom: '8px' }}>
                  <span className="text-muted">Preferred Language:</span>
                  <span>{citizen.language === 'en' ? 'English' : citizen.language === 'hi' ? 'Hindi' : 'Kannada'}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Typed KYC Submission */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="card">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={18} className="text-primary" />
                <h3>KYC Document Submission</h3>
              </div>
              <span className="badge badge-green">Document-Specific</span>
            </div>

            <div className="card-body">
              {kycErrorMsg && (
                <div className="alert-callout danger" style={{ marginBottom: '16px' }}>
                  <AlertCircle size={16} />
                  <span>{kycErrorMsg}</span>
                </div>
              )}

              <form onSubmit={handleKycSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label className="form-label">Select Document Category *</label>
                  <select 
                    className="form-select"
                    value={kycDocType}
                    onChange={(e) => {
                      setKycDocType(e.target.value);
                      setKycErrorMsg(null);
                    }}
                  >
                    <option value="PAN">PAN Card (Income Tax Verification)</option>
                    <option value="AADHAAR">Aadhaar Card (UIDAI Offline e-KYC with Masking)</option>
                    <option value="PASSPORT">Passport (International Identity)</option>
                    <option value="DRIVING_LICENCE">Driving Licence (Transport Authority)</option>
                    <option value="GST_CERTIFICATE">GST Registration Certificate (Business / FPO)</option>
                    <option value="FARMER_CERTIFICATE">Farmer Registration / Land Records (RTC / Patta)</option>
                  </select>
                </div>

                {/* 1. PAN Form */}
                {kycDocType === 'PAN' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', background: 'var(--slate-50)', padding: '16px', borderRadius: '8px' }}>
                    <div>
                      <label className="form-label">PAN Number (10 alphanumeric characters) *</label>
                      <input 
                        type="text" 
                        maxLength={10}
                        className="form-input font-mono" 
                        placeholder="e.g. ABCDE1234F"
                        style={{ textTransform: 'uppercase' }}
                        required
                        value={panForm.pan_number}
                        onChange={(e) => setPanForm({ ...panForm, pan_number: e.target.value.toUpperCase() })}
                      />
                    </div>
                    <div>
                      <label className="form-label">Name on PAN Card *</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        required
                        value={panForm.name_on_pan}
                        onChange={(e) => setPanForm({ ...panForm, name_on_pan: e.target.value })}
                      />
                    </div>
                  </div>
                )}

                {/* 2. Aadhaar Form */}
                {kycDocType === 'AADHAAR' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', background: 'var(--slate-50)', padding: '16px', borderRadius: '8px' }}>
                    <div>
                      <label className="form-label">Last 4 Digits of Aadhaar *</label>
                      <input 
                        type="text" 
                        maxLength={4}
                        className="form-input font-mono" 
                        placeholder="e.g. 8921"
                        required
                        value={aadhaarForm.aadhaar_last4}
                        onChange={(e) => setAadhaarForm({ ...aadhaarForm, aadhaar_last4: e.target.value.replace(/\D/g, '') })}
                      />
                      <small className="text-muted">Full 12-digit Aadhaar number is never stored in plaintext (Data Privacy policy).</small>
                    </div>
                    <div>
                      <label className="form-label">Name as on Aadhaar Card *</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        required
                        value={aadhaarForm.name_on_aadhaar}
                        onChange={(e) => setAadhaarForm({ ...aadhaarForm, name_on_aadhaar: e.target.value })}
                      />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input 
                        type="checkbox" 
                        id="aadhaar_consent"
                        checked={aadhaarForm.consent_granted}
                        onChange={(e) => setAadhaarForm({ ...aadhaarForm, consent_granted: e.target.checked })}
                      />
                      <label htmlFor="aadhaar_consent" style={{ fontSize: '0.8rem', color: 'var(--slate-700)', cursor: 'pointer' }}>
                        I give consent to verify my identity via approved offline Aadhaar XML verification rail.
                      </label>
                    </div>
                  </div>
                )}

                {/* 3. Passport Form */}
                {kycDocType === 'PASSPORT' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', background: 'var(--slate-50)', padding: '16px', borderRadius: '8px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <label className="form-label">Passport Number *</label>
                        <input 
                          type="text" 
                          className="form-input font-mono" 
                          placeholder="e.g. Z1234567"
                          required
                          value={passportForm.passport_number}
                          onChange={(e) => setPassportForm({ ...passportForm, passport_number: e.target.value.toUpperCase() })}
                        />
                      </div>
                      <div>
                        <label className="form-label">Expiry Date *</label>
                        <input 
                          type="date" 
                          className="form-input" 
                          required
                          value={passportForm.expiry_date}
                          onChange={(e) => setPassportForm({ ...passportForm, expiry_date: e.target.value })}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="form-label">Full Name on Passport *</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        required
                        value={passportForm.given_names}
                        onChange={(e) => setPassportForm({ ...passportForm, given_names: e.target.value })}
                      />
                    </div>
                  </div>
                )}

                {/* 4. Driving Licence Form */}
                {kycDocType === 'DRIVING_LICENCE' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', background: 'var(--slate-50)', padding: '16px', borderRadius: '8px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                      <div>
                        <label className="form-label">Licence Number *</label>
                        <input 
                          type="text" 
                          className="form-input font-mono" 
                          placeholder="e.g. KA04-2018-0012345"
                          required
                          value={dlForm.licence_number}
                          onChange={(e) => setDlForm({ ...dlForm, licence_number: e.target.value.toUpperCase() })}
                        />
                      </div>
                      <div>
                        <label className="form-label">State Code</label>
                        <input 
                          type="text" 
                          maxLength={2}
                          className="form-input font-mono" 
                          value={dlForm.issuing_state_code}
                          onChange={(e) => setDlForm({ ...dlForm, issuing_state_code: e.target.value.toUpperCase() })}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="form-label">Vehicle Classes Permitted</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        placeholder="e.g. LMV, MCWG, HGV (Commercial)"
                        value={dlForm.vehicle_classes}
                        onChange={(e) => setDlForm({ ...dlForm, vehicle_classes: e.target.value })}
                      />
                    </div>
                  </div>
                )}

                {/* 5. GST Registration Form */}
                {kycDocType === 'GST_CERTIFICATE' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', background: 'var(--slate-50)', padding: '16px', borderRadius: '8px' }}>
                    <div>
                      <label className="form-label">GSTIN (15 Digits) *</label>
                      <input 
                        type="text" 
                        maxLength={15}
                        className="form-input font-mono" 
                        placeholder="e.g. 29ABCDE1234F1Z5"
                        required
                        value={gstForm.gstin}
                        onChange={(e) => setGstForm({ ...gstForm, gstin: e.target.value.toUpperCase() })}
                      />
                    </div>
                    <div>
                      <label className="form-label">Legal Business Name *</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        placeholder="e.g. Sri Venkateshwara FPO Cooperative Ltd"
                        required
                        value={gstForm.legal_business_name}
                        onChange={(e) => setGstForm({ ...gstForm, legal_business_name: e.target.value })}
                      />
                    </div>
                  </div>
                )}

                {/* 6. Farmer Certificate Form */}
                {kycDocType === 'FARMER_CERTIFICATE' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', background: 'var(--slate-50)', padding: '16px', borderRadius: '8px' }}>
                    <div>
                      <label className="form-label">Survey No. / Farmer ID (FID) *</label>
                      <input 
                        type="text" 
                        className="form-input font-mono" 
                        placeholder="e.g. Sy No. 124/2 or FID-88319"
                        required
                        value={farmerForm.survey_number}
                        onChange={(e) => setFarmerForm({ ...farmerForm, survey_number: e.target.value })}
                      />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <label className="form-label">Land Area (Acres)</label>
                        <input 
                          type="number" 
                          step="0.1"
                          className="form-input" 
                          value={farmerForm.land_area_acres}
                          onChange={(e) => setFarmerForm({ ...farmerForm, land_area_acres: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="form-label">District</label>
                        <input 
                          type="text" 
                          className="form-input" 
                          value={farmerForm.district}
                          onChange={(e) => setFarmerForm({ ...farmerForm, district: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Document Scan Upload Slot */}
                <div>
                  <label className="form-label">Upload Document Scan / Photo (PDF, JPG, PNG - Max 5MB) *</label>
                  <div 
                    style={{
                      border: '2px dashed var(--slate-300)',
                      borderRadius: '8px',
                      padding: '18px',
                      textAlign: 'center',
                      background: 'var(--slate-50)',
                      cursor: 'pointer'
                    }}
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = '.pdf,.jpg,.jpeg,.png';
                      input.onchange = (e) => {
                        if (e.target.files[0]) {
                          handleFileSelect('doc_file', e.target.files[0]);
                        }
                      };
                      input.click();
                    }}
                  >
                    <Upload size={22} className="text-muted" style={{ margin: '0 auto 6px' }} />
                    <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                      {uploadedFiles['doc_file'] ? uploadedFiles['doc_file'].name : `Click to choose ${kycDocType.replace('_', ' ')} file`}
                    </div>
                    <small className="text-muted">Files stored in encrypted private storage; accessible only via time-limited signed URLs.</small>
                  </div>
                </div>

                <button 
                  type="submit" 
                  className="btn btn-primary btn-block"
                  disabled={isVerifying}
                  style={{ marginTop: '8px' }}
                >
                  {isVerifying ? 'Verifying with Official Verification Rail...' : `Submit Document & Upgrade to ${citizen.kyc_tier === 'T0' ? 'T1' : 'T2'} Tier`}
                </button>
              </form>
            </div>
          </div>

          {/* Change History Audit Log */}
          <div className="card">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <History size={18} />
                <h3>Profile Change History</h3>
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
                      fontSize: '0.85rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                      <strong style={{ color: 'var(--slate-800)' }}>{item.changed_field} Updated</strong>
                      <span className="text-muted" style={{ fontSize: '0.75rem' }}>{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div style={{ color: 'var(--slate-600)', fontSize: '0.8rem' }}>
                      Changed by: <span className="font-mono">{item.changed_by}</span>
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
