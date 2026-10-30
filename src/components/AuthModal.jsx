import React, { useState } from 'react';
import { 
  X, 
  ShieldCheck, 
  Smartphone, 
  KeyRound, 
  ArrowRight, 
  CheckCircle, 
  AlertCircle, 
  Lock, 
  RefreshCw,
  Sparkles
} from 'lucide-react';

export default function AuthModal({
  isOpen,
  onClose,
  onLoginSuccess,
  onRegisterSuccess
}) {
  const [mode, setMode] = useState('LOGIN'); // 'LOGIN', 'REGISTER', 'RECOVER', 'OTP_STEPUP'
  
  // Login form state
  const [loginMethod, setLoginMethod] = useState('PASSWORD'); // 'PASSWORD', 'OTP', 'FEDERATED'
  const [identifier, setIdentifier] = useState('9876543210');
  const [password, setPassword] = useState('••••••••');
  const [loginOtp, setLoginOtp] = useState('');
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isLockedOut, setIsLockedOut] = useState(false);
  const [lockoutTime, setLockoutTime] = useState(0);

  // Register form state (CID-FR-01)
  const [regMobile, setRegMobile] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regName, setRegName] = useState('');
  const [regNationality, setRegNationality] = useState('Indian');
  const [regLanguage, setRegLanguage] = useState('en');
  const [regOtp, setRegOtp] = useState('');
  const [regOtpSent, setRegOtpSent] = useState(false);

  // Recovery form state (CID-FR-04)
  const [recoverChannel, setRecoverChannel] = useState('MOBILE');
  const [recoverTarget, setRecoverTarget] = useState('');
  const [recoverOtpSent, setRecoverOtpSent] = useState(false);
  const [recoverOtp, setRecoverOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [recoveryAttempts, setRecoveryAttempts] = useState(0);
  const [recoveryLocked, setRecoveryLocked] = useState(false);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  if (!isOpen) return null;

  // Handle Login submission (CID-FR-02)
  const handleLogin = (e) => {
    e.preventDefault();
    if (isLockedOut) {
      setMessage({ type: 'error', text: 'Account temporarily locked out due to multiple failed attempts. Please use account recovery or wait.' });
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      // Simulate login
      onLoginSuccess({
        identifier,
        method: loginMethod
      });
      setMessage({ type: 'success', text: 'Authenticated successfully in 420ms (Target: <1.5s, 95th percentile)!' });
      setTimeout(onClose, 800);
    }, 500);
  };

  // Handle Send Register OTP (CID-FR-01)
  const handleSendRegOtp = () => {
    if (!regMobile || regMobile.length < 10) {
      setMessage({ type: 'error', text: 'Please enter a valid 10-digit mobile number.' });
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setRegOtpSent(true);
      setMessage({ type: 'info', text: 'OTP sent to +91 ' + regMobile + '. Use demo code: 7721' });
    }, 400);
  };

  // Handle Register submission (CID-FR-01)
  const handleRegister = (e) => {
    e.preventDefault();
    if (!regOtp) {
      setMessage({ type: 'error', text: 'Please enter the 4-digit OTP sent to your phone.' });
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      const generatedCitizenId = `CIT-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`;
      onRegisterSuccess({
        citizen_id: generatedCitizenId,
        full_name: regName || 'New Citizen Farmer',
        mobile: `+91 ${regMobile}`,
        email: regEmail || `${regMobile}@agrilink.in`,
        nationality: regNationality,
        language: regLanguage
      });
      setMessage({ 
        type: 'success', 
        text: `Account created! Allocated Single Citizen ID: ${generatedCitizenId}. 1 INR Wallet provisioned.` 
      });
      setTimeout(onClose, 1200);
    }, 600);
  };

  // Handle Recovery Submit (CID-FR-04)
  const handleRecover = (e) => {
    e.preventDefault();
    if (recoveryLocked) {
      setMessage({ type: 'error', text: 'Recovery attempts exceeded. Channel locked for 15 minutes.' });
      return;
    }

    if (!recoverOtpSent) {
      setLoading(true);
      setTimeout(() => {
        setLoading(false);
        setRecoverOtpSent(true);
        setMessage({ type: 'info', text: `OTP sent to verified channel ${recoverTarget}. Demo code: 8942` });
      }, 400);
    } else {
      if (recoverOtp !== '8942') {
        const nextAttempts = recoveryAttempts + 1;
        setRecoveryAttempts(nextAttempts);
        if (nextAttempts >= 3) {
          setRecoveryLocked(true);
          setMessage({ type: 'error', text: 'Rate limit exceeded: 3 failed attempts. Account recovery locked for 15 minutes (CID-FR-04).' });
        } else {
          setMessage({ type: 'error', text: `Invalid OTP. Attempt ${nextAttempts} of 3.` });
        }
        return;
      }

      setLoading(true);
      setTimeout(() => {
        setLoading(false);
        setMessage({ type: 'success', text: 'Credentials reset successfully! You can now log in.' });
        setMode('LOGIN');
      }, 500);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content auth-modal">
        <div className="modal-header">
          <div className="auth-header-title">
            <span className="badge badge-green">Visitor Authentication · CIS-M1</span>
            <h3>
              {mode === 'LOGIN' && 'Sign In to Citizen Identity & Wallet'}
              {mode === 'REGISTER' && 'Register Once · Single Citizen ID'}
              {mode === 'RECOVER' && 'Account Recovery & Credential Unlock'}
            </h3>
          </div>
          <button className="btn-close" onClick={onClose}><X size={18} /></button>
        </div>

        {message && (
          <div className={`auth-alert alert-${message.type}`}>
            {message.type === 'error' && <AlertCircle size={16} />}
            {message.type === 'success' && <CheckCircle size={16} />}
            {message.type === 'info' && <Sparkles size={16} />}
            <span>{message.text}</span>
          </div>
        )}

        <div className="modal-body">
          {/* LOGIN MODE (CID-FR-02) */}
          {mode === 'LOGIN' && (
            <div className="auth-login-view">
              {/* Method Tabs: Password, OTP, Federated */}
              <div className="auth-subtabs">
                <button 
                  className={`auth-subtab ${loginMethod === 'PASSWORD' ? 'active' : ''}`}
                  onClick={() => setLoginMethod('PASSWORD')}
                >
                  <KeyRound size={14} />
                  <span>Password + MFA</span>
                </button>
                <button 
                  className={`auth-subtab ${loginMethod === 'OTP' ? 'active' : ''}`}
                  onClick={() => setLoginMethod('OTP')}
                >
                  <Smartphone size={14} />
                  <span>Mobile OTP</span>
                </button>
                <button 
                  className={`auth-subtab ${loginMethod === 'FEDERATED' ? 'active' : ''}`}
                  onClick={() => setLoginMethod('FEDERATED')}
                >
                  <ShieldCheck size={14} />
                  <span>OAuth / DigiLocker</span>
                </button>
              </div>

              {loginMethod === 'PASSWORD' && (
                <form onSubmit={handleLogin}>
                  <div className="form-group">
                    <label className="form-label">Citizen ID, Mobile or Email</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={identifier} 
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="e.g. CIT-8829-4102 or 9876543210" 
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Password (Argon2id Hash Protected)</label>
                    <input 
                      type="password" 
                      className="form-input" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required 
                    />
                    <div className="form-help">Passwords never logged in plaintext (CIS-N01).</div>
                  </div>

                  <div className="form-row-space">
                    <label className="checkbox-label">
                      <input type="checkbox" defaultChecked /> Remember this device (rotates refresh token)
                    </label>
                    <button 
                      type="button" 
                      className="link-btn" 
                      onClick={() => setMode('RECOVER')}
                    >
                      Forgot access?
                    </button>
                  </div>

                  <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                    {loading ? 'Authenticating (<1.5s)...' : 'Sign In with Password'}
                  </button>
                </form>
              )}

              {loginMethod === 'OTP' && (
                <form onSubmit={handleLogin}>
                  <div className="form-group">
                    <label className="form-label">Registered Mobile Number</label>
                    <div className="input-with-button">
                      <input 
                        type="tel" 
                        className="form-input" 
                        value={identifier} 
                        onChange={(e) => setIdentifier(e.target.value)}
                        placeholder="10-digit mobile" 
                        required 
                      />
                      <button 
                        type="button" 
                        className="btn btn-secondary btn-sm"
                        onClick={() => setMessage({ type: 'info', text: 'OTP sent! Use demo code: 5541' })}
                      >
                        Send OTP
                      </button>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Enter 6-digit OTP</label>
                    <input 
                      type="text" 
                      className="form-input font-mono" 
                      placeholder="e.g. 5541" 
                      value={loginOtp}
                      onChange={(e) => setLoginOtp(e.target.value)}
                    />
                  </div>
                  <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                    {loading ? 'Verifying OTP...' : 'Verify OTP & Authenticate'}
                  </button>
                </form>
              )}

              {loginMethod === 'FEDERATED' && (
                <div className="federated-options">
                  <p className="federated-title">Select Federated Identity Provider (OAuth 2.0 / OIDC):</p>
                  <div className="federated-buttons">
                    <button 
                      type="button" 
                      className="federated-btn digilocker-btn"
                      onClick={() => {
                        setMessage({ type: 'info', text: 'Redirecting to DigiLocker OAuth2 Gateway...' });
                        setTimeout(() => handleLogin({ preventDefault: () => {} }), 800);
                      }}
                    >
                      <span className="fed-icon">🇮🇳</span>
                      <div className="fed-text">
                        <strong>DigiLocker Identity</strong>
                        <small>Aadhaar verified SSO</small>
                      </div>
                    </button>

                    <button 
                      type="button" 
                      className="federated-btn agristack-btn"
                      onClick={() => {
                        setMessage({ type: 'info', text: 'Connecting to AgriStack Farmer Registry...' });
                        setTimeout(() => handleLogin({ preventDefault: () => {} }), 800);
                      }}
                    >
                      <span className="fed-icon">🌾</span>
                      <div className="fed-text">
                        <strong>AgriStack India</strong>
                        <small>Ministry of Agriculture Federation</small>
                      </div>
                    </button>

                    <button 
                      type="button" 
                      className="federated-btn google-btn"
                      onClick={() => {
                        setMessage({ type: 'info', text: 'Signing in via Google OAuth 2.0...' });
                        setTimeout(() => handleLogin({ preventDefault: () => {} }), 800);
                      }}
                    >
                      <span className="fed-icon">🌐</span>
                      <div className="fed-text">
                        <strong>Google Account</strong>
                        <small>OAuth 2.0 PKCE with JWKS</small>
                      </div>
                    </button>
                  </div>
                </div>
              )}

              <div className="auth-footer-prompt">
                <span>Not registered on AgriLink yet?</span>
                <button 
                  type="button" 
                  className="link-btn-bold"
                  onClick={() => setMode('REGISTER')}
                >
                  Create Account (CID-FR-01)
                </button>
              </div>
            </div>
          )}

          {/* REGISTER MODE (CID-FR-01) */}
          {mode === 'REGISTER' && (
            <form onSubmit={handleRegister} className="auth-register-view">
              <div className="alert-callout info">
                <Sparkles size={16} />
                <span>
                  <strong>Single Citizen ID Principle:</strong> Every citizen receives exactly one permanent <code>citizen_id</code> and one INR ledger wallet.
                </span>
              </div>

              <div className="form-group">
                <label className="form-label">Full Legal Name</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. Rameshwar Patel"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  required 
                />
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Mobile Number</label>
                  <div className="input-with-button">
                    <input 
                      type="tel" 
                      className="form-input" 
                      placeholder="10-digit mobile"
                      value={regMobile}
                      onChange={(e) => setRegMobile(e.target.value)}
                      required 
                    />
                    <button 
                      type="button" 
                      className="btn btn-secondary btn-sm"
                      onClick={handleSendRegOtp}
                      disabled={regOtpSent}
                    >
                      {regOtpSent ? 'OTP Sent' : 'Send OTP'}
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Email Address (Optional)</label>
                  <input 
                    type="email" 
                    className="form-input" 
                    placeholder="email@example.com"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Nationality</label>
                  <select 
                    className="form-select"
                    value={regNationality}
                    onChange={(e) => setRegNationality(e.target.value)}
                  >
                    <option value="Indian">Indian (Resident)</option>
                    <option value="OCI">OCI / NRI</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Preferred Language (S07)</label>
                  <select 
                    className="form-select"
                    value={regLanguage}
                    onChange={(e) => setRegLanguage(e.target.value)}
                  >
                    <option value="en">English</option>
                    <option value="hi">हिन्दी (Hindi)</option>
                    <option value="kn">ಕನ್ನಡ (Kannada)</option>
                  </select>
                </div>
              </div>

              {regOtpSent && (
                <div className="form-group highlighted-field">
                  <label className="form-label">Enter Mobile OTP</label>
                  <input 
                    type="text" 
                    className="form-input font-mono" 
                    placeholder="Enter 4-digit code (Use: 7721)"
                    value={regOtp}
                    onChange={(e) => setRegOtp(e.target.value)}
                    required 
                  />
                  <div className="form-help">Rate-limited via Notification Adapter (CID-FR-01)</div>
                </div>
              )}

              <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                {loading ? 'Creating Citizen Identity & Wallet...' : 'Verify OTP & Complete Registration'}
              </button>

              <div className="auth-footer-prompt">
                <span>Already have a Citizen ID?</span>
                <button 
                  type="button" 
                  className="link-btn-bold"
                  onClick={() => setMode('LOGIN')}
                >
                  Sign In
                </button>
              </div>
            </form>
          )}

          {/* RECOVER ACCESS MODE (CID-FR-04) */}
          {mode === 'RECOVER' && (
            <form onSubmit={handleRecover} className="auth-recover-view">
              <div className="alert-callout warning">
                <Lock size={16} />
                <span>
                  <strong>CID-FR-04 Recovery & Lock-Out:</strong> Forgot-access flow through a verified channel. Exceeding 3 failed attempts triggers temporary lockout to prevent credential stuffing.
                </span>
              </div>

              <div className="form-group">
                <label className="form-label">Recovery Channel</label>
                <div className="radio-group">
                  <label className="radio-label">
                    <input 
                      type="radio" 
                      name="channel" 
                      checked={recoverChannel === 'MOBILE'}
                      onChange={() => setRecoverChannel('MOBILE')} 
                    />
                    <span>Verified Mobile SMS</span>
                  </label>
                  <label className="radio-label">
                    <input 
                      type="radio" 
                      name="channel" 
                      checked={recoverChannel === 'EMAIL'}
                      onChange={() => setRecoverChannel('EMAIL')} 
                    />
                    <span>Verified Email Address</span>
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Enter your registered {recoverChannel === 'MOBILE' ? 'Mobile Number' : 'Email Address'}
                </label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder={recoverChannel === 'MOBILE' ? '9876543210' : 'farmer@agrilink.in'}
                  value={recoverTarget}
                  onChange={(e) => setRecoverTarget(e.target.value)}
                  required 
                />
              </div>

              {recoverOtpSent && (
                <>
                  <div className="form-group">
                    <label className="form-label">Recovery Code (Demo: 8942)</label>
                    <input 
                      type="text" 
                      className="form-input font-mono" 
                      placeholder="Enter OTP"
                      value={recoverOtp}
                      onChange={(e) => setRecoverOtp(e.target.value)}
                      required 
                    />
                    <div className="form-help">
                      Attempt {recoveryAttempts} / 3. Lock-out triggered after 3 failures.
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">New Password</label>
                    <input 
                      type="password" 
                      className="form-input" 
                      placeholder="Enter new strong password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required 
                    />
                  </div>
                </>
              )}

              <button 
                type="submit" 
                className="btn btn-primary btn-block" 
                disabled={loading || recoveryLocked}
              >
                {loading ? 'Processing...' : recoverOtpSent ? 'Reset Password & Unlock' : 'Send Recovery Code'}
              </button>

              <div className="auth-footer-prompt">
                <button 
                  type="button" 
                  className="link-btn"
                  onClick={() => setMode('LOGIN')}
                >
                  Return to Sign In
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
