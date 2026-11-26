import React, { useEffect, useState } from 'react';
import { 
  User, 
  ShieldCheck, 
  History, 
  CheckCircle2, 
  AlertCircle, 
  Edit3, 
  Camera
} from 'lucide-react';
import { KYC_TIERS_INFO } from '../../data/mockData';
import { INDIAN_PATTERNS } from '../../utils/validators';
import { kycService } from '../../services/kycService';

const readPlanPreference = (citizenId) => {
  try {
    const savedPlan = window.localStorage.getItem(`agrilink_plan_preference:${citizenId}`);
    return {
      preferredPlan: savedPlan && Object.prototype.hasOwnProperty.call(KYC_TIERS_INFO, savedPlan)
        ? savedPlan
        : null,
      error: null
    };
  } catch {
    return {
      preferredPlan: null,
      error: 'Could not load your plan preference from this browser.'
    };
  }
};

export default function ProfileKycView({
  citizen,
  profileHistory,
  onUpdateProfile
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSaveError, setProfileSaveError] = useState(null);
  const [formData, setFormData] = useState({
    full_name: citizen.full_name,
    email: citizen.email,
    mobile: citizen.mobile,
    nationality: citizen.nationality || 'Indian',
    language: citizen.language || 'en',
    date_of_birth: citizen.date_of_birth || '',
    gender: citizen.gender || ''
  });

  // KYC Submission state
  const [kycDocType, setKycDocType] = useState('PAN');
  const [isVerifying, setIsVerifying] = useState(false);
  const [kycSuccessMsg, setKycSuccessMsg] = useState(null);
  const [kycErrorMsg, setKycErrorMsg] = useState(null);
  const [kycStatus, setKycStatus] = useState(null);
  const [isLoadingKyc, setIsLoadingKyc] = useState(true);

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

  const [voterForm, setVoterForm] = useState({
    epic_number: '',
    name_on_voter_id: citizen.full_name || '',
    state: 'Karnataka',
    assembly_constituency: ''
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

  const currentKycTier = kycStatus?.kyc_tier || citizen.kyc_tier || 'T0';
  const tierInfo = KYC_TIERS_INFO[currentKycTier] || KYC_TIERS_INFO.T0;
  const planPreferenceKey = `agrilink_plan_preference:${citizen.citizen_id}`;
  const [planPreference, setPlanPreference] = useState(() => readPlanPreference(citizen.citizen_id));
  const preferredPlan = planPreference.preferredPlan || currentKycTier;
  const planPreferenceError = planPreference.error;

  useEffect(() => {
    let isCurrent = true;
    kycService.getKycStatus()
      .then((response) => {
        if (isCurrent) setKycStatus(response?.data || null);
      })
      .catch((error) => {
        if (isCurrent) {
          setKycErrorMsg(`Could not load KYC status: ${error.message}`);
        }
      })
      .finally(() => {
        if (isCurrent) setIsLoadingKyc(false);
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  const handlePlanSelection = (tierKey) => {
    try {
      window.localStorage.setItem(planPreferenceKey, tierKey);
      setPlanPreference({ preferredPlan: tierKey, error: null });
    } catch {
      setPlanPreference((previousPreference) => ({
        ...previousPreference,
        error: 'Could not save your plan preference in this browser.'
      }));
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setProfileSaveError(null);
    try {
      await onUpdateProfile(formData);
      setIsEditing(false);
    } catch (error) {
      setProfileSaveError(error.message || 'Could not save your profile.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleKycSubmit = async (e) => {
    e.preventDefault();
    setKycErrorMsg(null);
    setKycSuccessMsg(null);

    let documentNumber;
    let details = {};

    if (kycDocType === 'PAN') {
      const panClean = panForm.pan_number.trim().toUpperCase();
      if (!INDIAN_PATTERNS.PAN.test(panClean)) {
        setKycErrorMsg('Invalid Indian PAN format. Must be 10 characters: 5 letters, 4 numbers, 1 letter (e.g. ABCDE1234F).');
        return;
      }
      documentNumber = panClean;
      details = { name_on_pan: panForm.name_on_pan.trim() };
    } else if (kycDocType === 'AADHAAR') {
      const aadhClean = aadhaarForm.aadhaar_last4.trim();
      if (!INDIAN_PATTERNS.AADHAAR_LAST4.test(aadhClean)) {
        setKycErrorMsg('Invalid Aadhaar digits. Enter the last 4 digits of your Aadhaar card.');
        return;
      }
      if (!aadhaarForm.consent_granted) {
        setKycErrorMsg('UIDAI Consent required: You must consent to Aadhaar-based KYC verification.');
        return;
      }
      documentNumber = aadhClean;
      details = {
        name_on_aadhaar: aadhaarForm.name_on_aadhaar.trim(),
        consent_granted: aadhaarForm.consent_granted
      };
    } else if (kycDocType === 'VOTER_ID') {
      const epicClean = voterForm.epic_number.trim().toUpperCase();
      if (!INDIAN_PATTERNS.VOTER_ID.test(epicClean)) {
        setKycErrorMsg('Invalid Voter ID (EPIC) format. Must be 3 letters followed by 7 digits (e.g. KLR1234567).');
        return;
      }
      documentNumber = epicClean;
      details = {
        name_on_voter_id: voterForm.name_on_voter_id.trim(),
        state: voterForm.state.trim(),
        assembly_constituency: voterForm.assembly_constituency.trim()
      };
    } else if (kycDocType === 'PASSPORT') {
      const passClean = passportForm.passport_number.trim().toUpperCase();
      if (!INDIAN_PATTERNS.PASSPORT.test(passClean)) {
        setKycErrorMsg('Invalid Indian Passport format. Must start with 1 letter followed by 7 digits (e.g. A1234567).');
        return;
      }
      documentNumber = passClean;
      details = {
        given_names: passportForm.given_names.trim(),
        expiry_date: passportForm.expiry_date
      };
    } else if (kycDocType === 'DRIVING_LICENCE') {
      const dlClean = dlForm.licence_number.trim().toUpperCase().replace(/[-\s]/g, '');
      if (dlClean.length < 15) {
        setKycErrorMsg('Invalid Driving Licence format. Expected State code, RTO code, year and registration digits (e.g. KA0120200012345).');
        return;
      }
      documentNumber = dlClean;
      details = {
        issuing_state_code: dlForm.issuing_state_code.trim(),
        vehicle_classes: dlForm.vehicle_classes.trim()
      };
    } else if (kycDocType === 'GST_CERTIFICATE') {
      const gstClean = gstForm.gstin.trim().toUpperCase();
      if (!INDIAN_PATTERNS.GSTIN.test(gstClean)) {
        setKycErrorMsg('Invalid GSTIN format. Expected 15 characters: 2 state digits, 10 PAN chars, 1 entity, Z, 1 checksum (e.g. 29ABCDE1234F1Z5).');
        return;
      }
      documentNumber = gstClean;
      details = { legal_business_name: gstForm.legal_business_name.trim() };
    } else if (kycDocType === 'FARMER_REGISTRATION') {
      if (!farmerForm.survey_number.trim()) {
        setKycErrorMsg('Please enter the agricultural Land Survey or Farmer ID number.');
        return;
      }
      documentNumber = farmerForm.survey_number.trim();
      details = {
        certificate_type: farmerForm.certificate_type,
        land_area_acres: farmerForm.land_area_acres,
        district: farmerForm.district.trim()
      };
    }

    setIsVerifying(true);
    try {
      const uploadResponse = await kycService.submitDocument(
        kycDocType,
        documentNumber,
        details
      );
      setKycSuccessMsg(uploadResponse?.message || 'Document submitted for review.');
      try {
        const statusResponse = await kycService.getKycStatus();
        setKycStatus(statusResponse?.data || null);
      } catch (error) {
        setKycErrorMsg(`Document submitted, but status could not be refreshed: ${error.message}`);
      }
    } catch (error) {
      setKycErrorMsg(error.message || 'Document submission failed. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="profile-kyc-view">
      <div className="view-header-row" style={{ marginBottom: '24px' }}>
        <div>
          <h2>Citizen Identity, Profile & KYC Verification</h2>
          <p className="text-muted">
            Profile details, submitted documents, and KYC review status
          </p>
        </div>
      </div>

      {kycSuccessMsg && (
        <div className="alert-callout success" style={{ marginBottom: '20px' }}>
          <CheckCircle2 size={20} />
          <span>{kycSuccessMsg}</span>
        </div>
      )}
      {kycErrorMsg && (
        <div className="alert-callout danger" style={{ marginBottom: '20px' }}>
          <AlertCircle size={20} />
          <span>{kycErrorMsg}</span>
        </div>
      )}

      {/* KYC Tier Overview & Entitlements Banner */}
      <div className="card" style={{ marginBottom: '24px', borderLeft: `6px solid ${tierInfo.color}`, padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span className="badge" style={{ backgroundColor: tierInfo.color, color: 'white' }}>
                Active KYC Tier: {currentKycTier}
              </span>
              <span className="badge badge-gray">{kycStatus?.status || 'Not Submitted'}</span>
            </div>
            <h3 style={{ fontSize: '1.3rem', margin: '4px 0' }}>{tierInfo.name}</h3>
            <p className="text-muted" style={{ fontSize: '0.85rem' }}>{tierInfo.description}</p>
          </div>

          <div style={{ textAlign: 'right' }}>
            <span className="text-muted" style={{ fontSize: '0.8rem' }}>Citizen Identifier</span>
            <div className="font-mono text-bold" style={{ fontSize: '1.1rem' }}>
              {citizen.public_citizen_id || citizen.citizen_id}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--slate-500)' }}>
              {kycStatus?.submitted_at
                ? `Submitted: ${new Date(kycStatus.submitted_at).toLocaleDateString()}`
                : 'No KYC submission yet'}
            </div>
          </div>
        </div>

        {/* Comparison Grid */}
        <div style={{ marginBottom: '12px' }}>
          <h4 style={{ margin: '0 0 6px' }}>Choose your preferred plan</h4>
          <p className="text-muted" style={{ fontSize: '0.85rem', margin: 0 }}>
            You can change this preference anytime. It does not change your KYC status, wallet limits, or available personas.
          </p>
          {planPreferenceError && (
            <p role="alert" style={{ color: 'var(--danger-600, #b91c1c)', fontSize: '0.85rem', margin: '8px 0 0' }}>
              {planPreferenceError}
            </p>
          )}
        </div>
        <div className="grid-3" style={{ background: 'var(--slate-50)', padding: '16px', borderRadius: '12px' }}>
          {Object.entries(KYC_TIERS_INFO).map(([tierKey, info]) => {
            const isCurrent = currentKycTier === tierKey;
            const isPreferred = preferredPlan === tierKey;
            return (
              <button
                type="button"
                key={tierKey}
                aria-pressed={isPreferred}
                aria-label={`Choose ${info.name} as your preferred plan`}
                onClick={() => handlePlanSelection(tierKey)}
                style={{
                  background: 'white',
                  borderRadius: '10px',
                  padding: '14px',
                  border: isPreferred ? `2px solid ${info.color}` : '1px solid var(--slate-200)',
                  width: '100%',
                  color: 'inherit',
                  font: 'inherit',
                  textAlign: 'left',
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                  {isCurrent && (
                    <span className="badge badge-gray">ACTIVE KYC</span>
                  )}
                  {isPreferred && (
                    <span className="badge" style={{ backgroundColor: info.color, color: 'white' }}>
                      PREFERRED PLAN
                    </span>
                  )}
                </div>
                <h4 style={{ fontSize: '0.95rem', color: info.color, margin: '0 0 6px' }}>{info.name}</h4>
                <div style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div><strong>Max Balance:</strong> ₹{info.max_balance.toLocaleString('en-IN')}</div>
                  <div><strong>Single Tx:</strong> ₹{info.per_tx_limit.toLocaleString('en-IN')}</div>
                  <div><strong>Monthly Limit:</strong> ₹{info.monthly_limit.toLocaleString('en-IN')}</div>
                  <div style={{ marginTop: '4px', color: 'var(--slate-600)' }}>
                    <strong>Personas:</strong> {info.unlocked_personas.join(', ')}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        <p className="text-muted" style={{ fontSize: '0.78rem', margin: '10px 0 0' }}>
          Your active KYC tier remains <strong>{currentKycTier}</strong>; verification-based limits and eligibility do not change with this preference.
        </p>
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
                {profileSaveError && (
                  <div className="alert-callout danger" role="alert">
                    <AlertCircle size={16} />
                    <span>{profileSaveError}</span>
                  </div>
                )}
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
                      <option value="">Select gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                      <option value="Prefer not to say">Prefer not to say</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                  <button type="button" className="secondary-btn" onClick={() => setIsEditing(false)}>Cancel</button>
                  <button type="submit" className="primary-btn" disabled={isSavingProfile}>
                    {isSavingProfile ? 'Saving…' : 'Save Changes'}
                  </button>
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

                <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '2px dashed var(--slate-200)' }}>
                  <h4 style={{ fontSize: '0.82rem', textTransform: 'uppercase', color: 'var(--slate-500)', letterSpacing: '0.5px', marginBottom: '10px' }}>
                    Saved Document Details
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
                    {isLoadingKyc ? (
                      <span className="text-muted">Loading saved documents...</span>
                    ) : kycStatus?.documents?.length ? (
                      kycStatus.documents.map((doc) => (
                        <div key={doc.document_id} style={{ padding: '10px 0', borderBottom: '1px solid var(--slate-100)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <strong>{doc.document_type.replaceAll('_', ' ')}</strong>
                            <span className="badge badge-gray">{doc.verification_status}</span>
                          </div>
                          {doc.document_number_masked && (
                            <small className="text-muted">
                              Number: <span className="font-mono">{doc.document_number_masked}</span>
                            </small>
                          )}
                          {Object.entries(doc.details || {}).map(([field, value]) => (
                            <small key={field} className="text-muted" style={{ display: 'block' }}>
                              {field.replaceAll('_', ' ')}: {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : value}
                            </small>
                          ))}
                        </div>
                      ))
                    ) : (
                      <span className="text-muted">No documents submitted yet.</span>
                    )}
                  </div>
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
                    <option value="VOTER_ID">Voter ID Card (Election Commission of India - EPIC)</option>
                    <option value="PASSPORT">Passport (International Identity)</option>
                    <option value="DRIVING_LICENCE">Driving Licence (Transport Authority)</option>
                    <option value="GST_CERTIFICATE">GST Registration Certificate (Business / FPO)</option>
                    <option value="FARMER_REGISTRATION">Farmer Registration / Land Records (RTC / Patta)</option>
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

                {/* 2b. Voter ID (EPIC) Form */}
                {kycDocType === 'VOTER_ID' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', background: 'var(--slate-50)', padding: '16px', borderRadius: '8px' }}>
                    <div>
                      <label className="form-label">Voter ID / EPIC Number (10 alphanumeric characters) *</label>
                      <input 
                        type="text" 
                        maxLength={10}
                        className="form-input font-mono" 
                        placeholder="e.g. KLR1234567 (3 letters + 7 digits)"
                        style={{ textTransform: 'uppercase' }}
                        required
                        value={voterForm.epic_number}
                        onChange={(e) => setVoterForm({ ...voterForm, epic_number: e.target.value.toUpperCase() })}
                      />
                      <small className="text-muted" style={{ display: 'block', marginTop: '4px' }}>
                        Standard 10-character Election Photo Identity Card (EPIC) identifier issued by ECI.
                      </small>
                    </div>
                    <div>
                      <label className="form-label">Full Name as on Voter ID Card *</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        required
                        value={voterForm.name_on_voter_id}
                        onChange={(e) => setVoterForm({ ...voterForm, name_on_voter_id: e.target.value })}
                      />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <label className="form-label">Issuing State *</label>
                        <input 
                          type="text" 
                          className="form-input" 
                          placeholder="e.g. Karnataka"
                          required
                          value={voterForm.state}
                          onChange={(e) => setVoterForm({ ...voterForm, state: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="form-label">Assembly Constituency</label>
                        <input 
                          type="text" 
                          className="form-input" 
                          placeholder="e.g. Nelamangala (128)"
                          value={voterForm.assembly_constituency}
                          onChange={(e) => setVoterForm({ ...voterForm, assembly_constituency: e.target.value })}
                        />
                      </div>
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
                {kycDocType === 'FARMER_REGISTRATION' && (
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

                <div className="alert-callout info">
                  <span>No photo or PDF is needed. Only the details entered above are saved. Document numbers are stored as secure tokens and shown masked.</span>
                </div>

                <button 
                  type="submit" 
                  className="btn btn-primary btn-block"
                  disabled={isVerifying}
                  style={{ marginTop: '8px' }}
                >
                  {isVerifying ? 'Saving...' : 'Save & Submit Details'}
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
