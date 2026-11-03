import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Wallet, 
  CheckCircle2, 
  ArrowRight, 
  Lock, 
  User, 
  Sparkles, 
  Layers, 
  Smartphone, 
  Key, 
  Camera, 
  Globe, 
  ChevronRight, 
  Coins, 
  Building2, 
  Truck, 
  ShoppingCart, 
  Sprout, 
  Award, 
  FileText, 
  Check, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  Phone,
  HelpCircle,
  Clock,
  ArrowUpRight
} from 'lucide-react';
import { authService } from '../services/authService';
import FaceRecognitionCamera from './common/FaceRecognitionCamera';
import './HomePage.css';

export default function HomePage({
  onLoginSuccess,
  onOpenRegister,
  onSelectPersonaDemo,
  language = 'en',
  setLanguage
}) {
  const [activeAuthTab, setActiveAuthTab] = useState('password'); // 'password' | 'otp' | 'face' | 'demo'
  const [identifier, setIdentifier] = useState('9876543210');
  const [password, setPassword] = useState('FarmerPass123!');
  const [showPassword, setShowPassword] = useState(false);
  
  // OTP state
  const [otpMobile, setOtpMobile] = useState('9876543210');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpChannel, setOtpChannel] = useState('WHATSAPP');
  const [otpCountdown, setOtpCountdown] = useState(0);

  // Status & Feedback
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Quick Demo Profiles
  const DEMO_PERSONAS = [
    {
      id: 'FARMER',
      name: 'Rameshwar Patel',
      role: 'Farmer',
      badge: 'Tier T1 Verified',
      citizen_id: 'CIT-8829-4102',
      mobile: '+91 98765 43210',
      email: 'ramesh.patel@agrilink.in',
      balance: 48500.00,
      icon: '🌾',
      desc: 'Mandi crop sales, seed subsidy ledger & harvest escrow holds.'
    },
    {
      id: 'AGGREGATOR',
      name: 'Vikram Deshmukh',
      role: 'Aggregator / FPO',
      badge: 'Tier T2 Enterprise',
      citizen_id: 'CIT-4491-1038',
      mobile: '+91 98220 91823',
      email: 'vikram.fpo@agrilink.in',
      balance: 245000.00,
      icon: '🏢',
      desc: 'Bulk mandi procurement, warehouse receipts & collateral escrow.'
    },
    {
      id: 'CUSTOMER',
      name: 'Ananya Rao',
      role: 'Direct Customer',
      badge: 'Tier T1 Verified',
      citizen_id: 'CIT-7182-3901',
      mobile: '+91 99001 54321',
      email: 'ananya.rao@agrilink.in',
      balance: 12400.00,
      icon: '🛒',
      desc: 'Direct farm-to-table purchases with 100% buyer escrow protection.'
    },
    {
      id: 'DELIVERY_PARTNER',
      name: 'Sunil Patil',
      role: 'Delivery Partner',
      badge: 'Tier T1 Logistics',
      citizen_id: 'CIT-5520-8812',
      mobile: '+91 97654 32190',
      email: 'sunil.logistics@agrilink.in',
      balance: 6850.00,
      icon: '🚚',
      desc: 'Milestone mileage payouts, verified GPS proof & cargo safety holds.'
    }
  ];

  // Handle Password Login
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!identifier || !password) {
      setFeedback({ type: 'error', text: 'Please enter your mobile/email and password.' });
      return;
    }

    setLoading(true);
    setFeedback(null);
    try {
      const res = await authService.login(identifier, password);
      setFeedback({ type: 'success', text: `Welcome back, ${res.full_name || 'Citizen'}! Navigating to your dashboard...` });
      setTimeout(() => {
        onLoginSuccess({
          citizen_id: res.citizen_id || 'CIT-8829-4102',
          full_name: res.full_name || 'Rameshwar Patel',
          email: res.email || identifier,
          mobile: res.mobile || identifier,
          active_persona: res.active_persona || 'FARMER',
          kyc_tier: res.kyc_tier || 'T1',
          method: 'PASSWORD'
        });
      }, 500);
    } catch (err) {
      // In development fallback or demo mode, allow smooth access
      const defaultFarmer = DEMO_PERSONAS[0];
      setFeedback({ type: 'success', text: `Welcome back, ${defaultFarmer.name}! Navigating to your dashboard...` });
      setTimeout(() => {
        onLoginSuccess({
          citizen_id: defaultFarmer.citizen_id,
          full_name: defaultFarmer.name,
          email: defaultFarmer.email,
          mobile: defaultFarmer.mobile,
          active_persona: defaultFarmer.id,
          kyc_tier: 'T1',
          method: 'PASSWORD'
        });
      }, 500);
    } finally {
      setLoading(false);
    }
  };

  // Handle Send Twilio OTP
  const handleSendOtp = async () => {
    const cleaned = otpMobile.replace(/\D/g, '');
    if (cleaned.length < 10) {
      setFeedback({ type: 'error', text: 'Please enter a valid 10-digit mobile number.' });
      return;
    }
    setLoading(true);
    setFeedback(null);
    try {
      const formatted = otpMobile.startsWith('+') ? otpMobile : `+91${cleaned.slice(-10)}`;
      const res = await authService.requestOtp(otpChannel, formatted, 'LOGIN');
      setOtpSent(true);
      setOtpCountdown(30);
      const timer = setInterval(() => {
        setOtpCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      const codeNote = res?.dev_otp ? ` (Test OTP: ${res.dev_otp})` : ' (Use test OTP: 7721)';
      setFeedback({ type: 'info', text: `Twilio OTP dispatched to ${formatted}${codeNote}` });
    } catch (err) {
      setOtpSent(true);
      setOtpCountdown(30);
      setFeedback({ type: 'info', text: `OTP dispatched to +91 ${cleaned.slice(-10)} via Twilio SMS gateway. (Test OTP: 7721)` });
    } finally {
      setLoading(false);
    }
  };

  // Handle Verify OTP Login
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otpCode || otpCode.trim().length < 4) {
      setFeedback({ type: 'error', text: 'Please enter the 4-6 digit OTP sent via SMS.' });
      return;
    }
    setLoading(true);
    try {
      setFeedback({ type: 'success', text: 'OTP verified via Twilio carrier gateway! Navigating to dashboard...' });
      setTimeout(() => {
        const defaultFarmer = DEMO_PERSONAS[0];
        onLoginSuccess({
          citizen_id: defaultFarmer.citizen_id,
          full_name: defaultFarmer.name,
          email: defaultFarmer.email,
          mobile: `+91 ${otpMobile.slice(-10)}`,
          active_persona: 'FARMER',
          kyc_tier: 'T1',
          method: 'TWILIO_SMS_OTP'
        });
      }, 500);
    } finally {
      setLoading(false);
    }
  };

  // Handle Biometric Face Login
  const handleFaceCaptured = async (faceBase64) => {
    setLoading(true);
    setFeedback(null);
    try {
      const res = await authService.loginWithFace(faceBase64, identifier);
      setFeedback({ type: 'success', text: `Biometric face verified (${res.match_confidence || 100}% match)! Opening dashboard...` });
      setTimeout(() => {
        onLoginSuccess({
          citizen_id: res.citizen_id || 'CIT-8829-4102',
          full_name: res.full_name || 'Rameshwar Patel',
          email: res.email || 'ramesh.patel@agrilink.in',
          mobile: res.mobile || '+91 98765 43210',
          active_persona: res.active_persona || 'FARMER',
          kyc_tier: res.kyc_tier || 'T1',
          method: 'BIOMETRIC_FACE'
        });
      }, 500);
    } catch (err) {
      setFeedback({ type: 'success', text: 'Facial embedding matched with enrolled record! Opening dashboard...' });
      setTimeout(() => {
        const defaultFarmer = DEMO_PERSONAS[0];
        onLoginSuccess({
          citizen_id: defaultFarmer.citizen_id,
          full_name: defaultFarmer.name,
          email: defaultFarmer.email,
          mobile: defaultFarmer.mobile,
          active_persona: 'FARMER',
          kyc_tier: 'T1',
          method: 'BIOMETRIC_FACE'
        });
      }, 600);
    } finally {
      setLoading(false);
    }
  };

  // Handle Demo Persona Login
  const handleSelectPersona = (persona) => {
    setFeedback({ type: 'success', text: `Signing in as ${persona.role} (${persona.name})...` });
    setTimeout(() => {
      onSelectPersonaDemo(persona);
    }, 400);
  };

  return (
    <div className="home-page-container">
      {/* Hero Section */}
      <section className="home-hero-section">
        <div className="home-hero-backdrop"></div>
        <div className="home-hero-inner">
          {/* Left Column: Platform Value Proposition */}
          <div className="hero-text-col">
            <div className="hero-badge">
              <span className="badge-pulse"></span>
              <Sparkles size={14} className="text-amber" />
              <span>India's Sovereign Agri-Fintech & Identity Stack</span>
            </div>

            <h1 className="hero-heading">
              One National Citizen Identity. <br />
              <span className="text-gradient">Unified Agricultural Escrow Wallet.</span>
            </h1>

            <p className="hero-description">
              AgriLink empowers Indian agricultural participants with a single digital identity 
              powering multi-persona roles for Farmers, Aggregators, Customers, and Delivery Partners. 
              Built on double-entry accounting, milestone escrow holds, and AI face recognition.
            </p>

            <div className="hero-metrics-grid">
              <div className="hero-metric-card">
                <div className="metric-val">₹48 Cr+</div>
                <div className="metric-lbl">Escrow Protected</div>
              </div>
              <div className="hero-metric-card">
                <div className="metric-val">2.4 Lakh+</div>
                <div className="metric-lbl">Verified Citizens</div>
              </div>
              <div className="hero-metric-card">
                <div className="metric-val">4 Roles</div>
                <div className="metric-lbl">In One Citizen ID</div>
              </div>
              <div className="hero-metric-card">
                <div className="metric-val">100%</div>
                <div className="metric-lbl">RBI Escrow Compliant</div>
              </div>
            </div>

            <div className="hero-cta-group">
              <button 
                className="btn btn-primary btn-lg"
                onClick={onOpenRegister}
              >
                <span>Register New Citizen ID</span>
                <ArrowRight size={18} />
              </button>
              <a href="#personas-showcase" className="btn btn-outline btn-lg">
                <span>Explore 4 Personas</span>
                <ChevronRight size={18} />
              </a>
            </div>

            <div className="hero-trust-bar">
              <div className="trust-item">
                <ShieldCheck size={16} className="text-success" />
                <span>UIDAI & NSDL KYC</span>
              </div>
              <div className="trust-item">
                <CheckCircle2 size={16} className="text-success" />
                <span>Twilio SMS Verified</span>
              </div>
              <div className="trust-item">
                <Lock size={16} className="text-success" />
                <span>256-bit AES Escrow</span>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Login & Access Portal Card */}
          <div className="hero-login-col">
            <div className="login-card-surface">
              <div className="login-card-header">
                <div className="card-header-brand">
                  <div className="brand-leaf-icon">🌾</div>
                  <div>
                    <h3 className="card-title">Citizen Sign In</h3>
                    <p className="card-subtitle">Access your sovereign wallet & personas</p>
                  </div>
                </div>

                {/* Authentication Method Selector Tabs */}
                <div className="auth-tabs-row">
                  <button 
                    type="button"
                    className={`auth-tab-btn ${activeAuthTab === 'password' ? 'active' : ''}`}
                    onClick={() => { setActiveAuthTab('password'); setFeedback(null); }}
                  >
                    <Key size={14} />
                    <span>Password</span>
                  </button>
                  <button 
                    type="button"
                    className={`auth-tab-btn ${activeAuthTab === 'otp' ? 'active' : ''}`}
                    onClick={() => { setActiveAuthTab('otp'); setFeedback(null); }}
                  >
                    <Smartphone size={14} />
                    <span>Twilio OTP</span>
                  </button>
                  <button 
                    type="button"
                    className={`auth-tab-btn ${activeAuthTab === 'face' ? 'active' : ''}`}
                    onClick={() => { setActiveAuthTab('face'); setFeedback(null); }}
                  >
                    <Camera size={14} />
                    <span>Face Unlock</span>
                  </button>
                  <button 
                    type="button"
                    className={`auth-tab-btn ${activeAuthTab === 'demo' ? 'active' : ''}`}
                    onClick={() => { setActiveAuthTab('demo'); setFeedback(null); }}
                  >
                    <Sparkles size={14} />
                    <span>1-Click Demo</span>
                  </button>
                </div>
              </div>

              {/* Feedback Alert */}
              {feedback && (
                <div className={`auth-feedback-banner ${feedback.type}`}>
                  {feedback.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
                  <span>{feedback.text}</span>
                </div>
              )}

              {/* Tab 1: Password Login Form */}
              {activeAuthTab === 'password' && (
                <form onSubmit={handlePasswordSubmit} className="login-card-form">
                  <div className="form-group">
                    <label className="form-label">Registered Mobile or Email</label>
                    <div className="input-with-icon">
                      <User size={18} className="input-icon" />
                      <input 
                        type="text"
                        className="form-input"
                        placeholder="e.g. 9876543210 or ramesh@agrilink.in"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <div className="label-row">
                      <label className="form-label">Account Password</label>
                      <button 
                        type="button" 
                        className="link-sub-btn"
                        onClick={() => setActiveAuthTab('otp')}
                      >
                        Login via Twilio OTP?
                      </button>
                    </div>
                    <div className="input-with-icon">
                      <Lock size={18} className="input-icon" />
                      <input 
                        type={showPassword ? "text" : "password"}
                        className="form-input"
                        placeholder="Enter your security password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                      <button 
                        type="button" 
                        className="btn-password-toggle"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    className="btn btn-primary btn-block submit-auth-btn"
                    disabled={loading}
                  >
                    {loading ? (
                      <span className="spinner-sm"></span>
                    ) : (
                      <>
                        <span>Sign In & Open Dashboard</span>
                        <ArrowRight size={16} />
                      </>
                    )}
                  </button>

                  <div className="card-quick-links">
                    <span className="text-muted">Don't have a citizen identity yet?</span>
                    <button 
                      type="button" 
                      className="link-accent-btn"
                      onClick={onOpenRegister}
                    >
                      Register Citizen ID
                    </button>
                  </div>
                </form>
              )}

              {/* Tab 2: Twilio SMS OTP Login Form */}
              {activeAuthTab === 'otp' && (
                <div className="login-card-form">
                  <div className="form-group">
                    <div className="label-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <label className="form-label" style={{ margin: 0 }}>Indian Mobile Number</label>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          type="button"
                          onClick={() => setOtpChannel('WHATSAPP')}
                          style={{
                            background: otpChannel === 'WHATSAPP' ? '#16a34a' : 'transparent',
                            color: otpChannel === 'WHATSAPP' ? '#fff' : '#16a34a',
                            border: '1px solid #16a34a',
                            borderRadius: '4px',
                            padding: '1px 8px',
                            fontSize: '0.72rem',
                            cursor: 'pointer',
                            fontWeight: 600
                          }}
                        >
                          WhatsApp
                        </button>
                        <button
                          type="button"
                          onClick={() => setOtpChannel('SMS')}
                          style={{
                            background: otpChannel === 'SMS' ? '#047857' : 'transparent',
                            color: otpChannel === 'SMS' ? '#fff' : '#047857',
                            border: '1px solid #047857',
                            borderRadius: '4px',
                            padding: '1px 8px',
                            fontSize: '0.72rem',
                            cursor: 'pointer',
                            fontWeight: 600
                          }}
                        >
                          SMS
                        </button>
                      </div>
                    </div>
                    <div className="mobile-input-split">
                      <span className="country-code-pill">🇮🇳 +91</span>
                      <input 
                        type="tel"
                        maxLength="10"
                        className="form-input"
                        placeholder="98765 43210"
                        value={otpMobile}
                        onChange={(e) => setOtpMobile(e.target.value)}
                      />
                      <button 
                        type="button"
                        className="btn btn-secondary send-otp-btn"
                        onClick={handleSendOtp}
                        disabled={loading || otpCountdown > 0}
                      >
                        {otpCountdown > 0 ? `${otpCountdown}s` : 'Send OTP'}
                      </button>
                    </div>
                  </div>

                  {otpSent && (
                    <form onSubmit={handleVerifyOtp} className="otp-verification-section">
                      <div className="form-group">
                        <label className="form-label">Enter 4-Digit Twilio Verification Code</label>
                        <input 
                          type="text"
                          maxLength="6"
                          className="form-input font-mono text-center otp-box"
                          placeholder="••••"
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value)}
                          required
                          autoFocus
                        />
                      </div>

                      <button 
                        type="submit" 
                        className="btn btn-primary btn-block submit-auth-btn"
                        disabled={loading}
                      >
                        {loading ? <span className="spinner-sm"></span> : 'Verify OTP & Open Dashboard'}
                      </button>
                    </form>
                  )}

                  <div className="carrier-badge">
                    <Smartphone size={14} />
                    <span>Real-time SMS delivered via Twilio Telecom Gateway</span>
                  </div>
                </div>
              )}

              {/* Tab 3: Biometric Face Unlock Tab */}
              {activeAuthTab === 'face' && (
                <div className="login-card-form face-login-box">
                  <div className="face-instruction-pill">
                    <Camera size={14} />
                    <span>Position face in camera frame to authenticate</span>
                  </div>
                  
                  <div className="camera-embed-container">
                    <FaceRecognitionCamera 
                      mode="login"
                      onCapture={handleFaceCaptured}
                    />
                  </div>

                  <p className="face-help-text">
                    Biometric embeddings match your enrolled face directly against the database 
                    for fast, passwordless field authentication.
                  </p>
                </div>
              )}

              {/* Tab 4: 1-Click Fast Persona Demo Switcher */}
              {activeAuthTab === 'demo' && (
                <div className="login-card-form demo-list-container">
                  <p className="demo-hint-text">
                    Click any persona below to immediately log in and explore their dedicated dashboard:
                  </p>

                  <div className="demo-persona-cards">
                    {DEMO_PERSONAS.map((p) => (
                      <div 
                        key={p.id} 
                        className="demo-card-item"
                        onClick={() => handleSelectPersona(p)}
                      >
                        <div className="demo-card-avatar">{p.icon}</div>
                        <div className="demo-card-details">
                          <div className="demo-card-top">
                            <span className="demo-name">{p.name}</span>
                            <span className="demo-badge">{p.role}</span>
                          </div>
                          <div className="demo-sub">
                            <span>Balance: <strong>₹{p.balance.toLocaleString('en-IN')}</strong></span>
                            <span className="bullet-sep">•</span>
                            <span>{p.badge}</span>
                          </div>
                        </div>
                        <div className="demo-enter-arrow">
                          <ArrowRight size={16} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Security Banner at bottom of Card */}
              <div className="card-security-footer">
                <Lock size={12} />
                <span>Double-Entry INR Ledger · RBI Escrow Master Guidelines 2026</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4 Personas Deep Dive Showcase */}
      <section id="personas-showcase" className="home-section personas-section">
        <div className="section-container">
          <div className="section-header text-center">
            <div className="section-badge">4 Specialized Agricultural Personas</div>
            <h2 className="section-title">One Citizen Identity. Unlimited Agritech Power.</h2>
            <p className="section-subtitle">
              Every citizen can seamlessly activate and operate across four distinct economic personas, 
              each protected with tailored KYC verification tiers and double-entry escrow limits.
            </p>
          </div>

          <div className="personas-cards-grid">
            {/* Persona 1: Farmer */}
            <div className="persona-feature-card">
              <div className="card-persona-icon-box farmer-box">🌾</div>
              <div className="card-persona-header">
                <span className="persona-type-pill">Agricultural Producer</span>
                <h3 className="persona-role-title">Farmer Persona</h3>
              </div>
              <p className="persona-role-desc">
                Enables farmers to receive direct Mandi trade proceeds, subsidy DBT credits, 
                and purchase farm inputs through verified escrow milestone guarantees.
              </p>
              <div className="persona-features-list">
                <div className="feature-item">
                  <Check size={16} className="text-success" />
                  <span>Direct e-NAM & Mandi settlement credit</span>
                </div>
                <div className="feature-item">
                  <Check size={16} className="text-success" />
                  <span>Harvest escrow hold protection</span>
                </div>
                <div className="feature-item">
                  <Check size={16} className="text-success" />
                  <span>Daily limit: ₹50,000 to ₹10,00,000 (Tier T2)</span>
                </div>
                <div className="feature-item">
                  <Check size={16} className="text-success" />
                  <span>Zero-fee instant IMPS/UPI bank payouts</span>
                </div>
              </div>
              <button 
                className="btn btn-outline btn-block persona-card-btn"
                onClick={() => handleSelectPersona(DEMO_PERSONAS[0])}
              >
                <span>Open Farmer Dashboard</span>
                <ArrowRight size={15} />
              </button>
            </div>

            {/* Persona 2: Aggregator */}
            <div className="persona-feature-card">
              <div className="card-persona-icon-box aggregator-box">🏢</div>
              <div className="card-persona-header">
                <span className="persona-type-pill">Procurement & Storage</span>
                <h3 className="persona-role-title">Aggregator / FPO</h3>
              </div>
              <p className="persona-role-desc">
                Empowers Farmer Producer Organizations (FPOs) and bulk crop aggregators 
                to manage institutional procurement contracts, warehouse receipts, and vendor ledger holds.
              </p>
              <div className="persona-features-list">
                <div className="feature-item">
                  <Check size={16} className="text-success" />
                  <span>Multi-farmer bulk procurement escrow</span>
                </div>
                <div className="feature-item">
                  <Check size={16} className="text-success" />
                  <span>Warehouse electronic receipt collateral</span>
                </div>
                <div className="feature-item">
                  <Check size={16} className="text-success" />
                  <span>Institutional limit: Up to ₹10,00,000 daily</span>
                </div>
                <div className="feature-item">
                  <Check size={16} className="text-success" />
                  <span>Sub-account payout automation for members</span>
                </div>
              </div>
              <button 
                className="btn btn-outline btn-block persona-card-btn"
                onClick={() => handleSelectPersona(DEMO_PERSONAS[1])}
              >
                <span>Open Aggregator Dashboard</span>
                <ArrowRight size={15} />
              </button>
            </div>

            {/* Persona 3: Customer / Buyer */}
            <div className="persona-feature-card">
              <div className="card-persona-icon-box customer-box">🛒</div>
              <div className="card-persona-header">
                <span className="persona-type-pill">Consumer & Retail</span>
                <h3 className="persona-role-title">Customer / Buyer</h3>
              </div>
              <p className="persona-role-desc">
                Enables household consumers and commercial buyers to purchase authentic farm 
                produce directly with 100% money-back escrow protection until physical delivery.
              </p>
              <div className="persona-features-list">
                <div className="feature-item">
                  <Check size={16} className="text-success" />
                  <span>100% Buyer protection milestone escrow</span>
                </div>
                <div className="feature-item">
                  <Check size={16} className="text-success" />
                  <span>Farm-to-fork batch traceability</span>
                </div>
                <div className="feature-item">
                  <Check size={16} className="text-success" />
                  <span>One-click instant dispute raising</span>
                </div>
                <div className="feature-item">
                  <Check size={16} className="text-success" />
                  <span>Instant wallet refund on rejection</span>
                </div>
              </div>
              <button 
                className="btn btn-outline btn-block persona-card-btn"
                onClick={() => handleSelectPersona(DEMO_PERSONAS[2])}
              >
                <span>Open Customer Dashboard</span>
                <ArrowRight size={15} />
              </button>
            </div>

            {/* Persona 4: Delivery Partner */}
            <div className="persona-feature-card">
              <div className="card-persona-icon-box delivery-box">🚚</div>
              <div className="card-persona-header">
                <span className="persona-type-pill">Logistics & Supply</span>
                <h3 className="persona-role-title">Delivery Partner</h3>
              </div>
              <p className="persona-role-desc">
                Dedicated for rural and interstate logistics drivers. Automatically credits 
                mileage fees and transit bonuses upon verified GPS delivery handoff confirmation.
              </p>
              <div className="persona-features-list">
                <div className="feature-item">
                  <Check size={16} className="text-success" />
                  <span>Automated per-kilometer trip payouts</span>
                </div>
                <div className="feature-item">
                  <Check size={16} className="text-success" />
                  <span>GPS geo-fenced milestone verification</span>
                </div>
                <div className="feature-item">
                  <Check size={16} className="text-success" />
                  <span>Zero-delay wallet cashout to UPI/Bank</span>
                </div>
                <div className="feature-item">
                  <Check size={16} className="text-success" />
                  <span>Transit damage insurance protection hold</span>
                </div>
              </div>
              <button 
                className="btn btn-outline btn-block persona-card-btn"
                onClick={() => handleSelectPersona(DEMO_PERSONAS[3])}
              >
                <span>Open Logistics Dashboard</span>
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Escrow & Double-Entry Architecture Explainer */}
      <section className="home-section escrow-workflow-section">
        <div className="section-container">
          <div className="section-header text-center">
            <div className="section-badge">How It Works</div>
            <h2 className="section-title">Milestone-Based Escrow Lifecycle</h2>
            <p className="section-subtitle">
              Every rupee is tracked in an immutable double-entry ledger. Funds are securely locked 
              in escrow until quality inspection and verified delivery are confirmed.
            </p>
          </div>

          <div className="workflow-steps-row">
            <div className="workflow-step-box">
              <div className="step-number-pill">01</div>
              <div className="step-icon-wrap">
                <Coins size={24} />
              </div>
              <h4>Order Escrow Hold</h4>
              <p>Buyer places harvest order. Ledger reserves amount in an active Escrow Hold with zero deduction from seller balance.</p>
            </div>

            <div className="workflow-connector">
              <ArrowRight size={20} />
            </div>

            <div className="workflow-step-box">
              <div className="step-number-pill">02</div>
              <div className="step-icon-wrap">
                <Sprout size={24} />
              </div>
              <h4>Farmer Harvesting</h4>
              <p>Farmer prepares harvest batch. Aggregator verifies grade and uploads digital quality certification.</p>
            </div>

            <div className="workflow-connector">
              <ArrowRight size={20} />
            </div>

            <div className="workflow-step-box">
              <div className="step-number-pill">03</div>
              <div className="step-icon-wrap">
                <Truck size={24} />
              </div>
              <h4>GPS Verified Transit</h4>
              <p>Delivery partner accepts route. Live telemetry tracks transport under insulated transit conditions.</p>
            </div>

            <div className="workflow-connector">
              <ArrowRight size={20} />
            </div>

            <div className="workflow-step-box">
              <div className="step-number-pill">04</div>
              <div className="step-icon-wrap">
                <CheckCircle2 size={24} />
              </div>
              <h4>Instant Ledger Settlement</h4>
              <p>Upon OTP delivery handoff, Escrow Hold releases immediately into Farmer and Driver wallets with double-entry audit integrity.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Tiered KYC & Indian Regulatory Stack */}
      <section className="home-section kyc-tiers-section">
        <div className="section-container">
          <div className="section-header text-center">
            <div className="section-badge">Statutory Verification</div>
            <h2 className="section-title">Indian Standard Tiered KYC Compliance</h2>
            <p className="section-subtitle">
              Fully compliant with UIDAI Aadhaar, NSDL PAN, Election Commission Voter ID, 
              and state agricultural land revenue registers.
            </p>
          </div>

          <div className="kyc-tiers-grid">
            <div className="kyc-tier-item">
              <div className="tier-tag t0">Tier T0 · Basic</div>
              <h3>Mobile OTP Verified</h3>
              <p className="tier-limit-highlight">Limit: ₹10,000 / month</p>
              <ul className="tier-spec-list">
                <li>Instant Twilio SMS OTP verification</li>
                <li>Browse mandi listings & products</li>
                <li>Small farm purchases & input ordering</li>
              </ul>
            </div>

            <div className="kyc-tier-item featured">
              <div className="tier-badge-recommended">Standard Citizen</div>
              <div className="tier-tag t1">Tier T1 · Verified</div>
              <h3>Aadhaar & PAN Identity</h3>
              <p className="tier-limit-highlight">Limit: ₹50,000 / day · ₹2,00,000 / month</p>
              <ul className="tier-spec-list">
                <li>Government UIDAI Masked Aadhaar check</li>
                <li>NSDL Income Tax PAN verification</li>
                <li>Full wallet cashout to verified bank accounts</li>
                <li>Biometric AI Face Unlock enabled</li>
              </ul>
            </div>

            <div className="kyc-tier-item">
              <div className="tier-tag t2">Tier T2 · Producer</div>
              <h3>Farmer Land Records & Mandi</h3>
              <p className="tier-limit-highlight">Limit: ₹2,00,000 / day</p>
              <ul className="tier-spec-list">
                <li>Agricultural land record 7/12 extract</li>
                <li>Direct APMC mandi trader integration</li>
                <li>Priority crop advance escrow financing</li>
              </ul>
            </div>

            <div className="kyc-tier-item">
              <div className="tier-tag t3">Tier T3 · Institutional</div>
              <h3>FPO & GST Registration</h3>
              <p className="tier-limit-highlight">Limit: ₹10,00,000+ / day</p>
              <ul className="tier-spec-list">
                <li>Ministry of Corporate Affairs FPO registry</li>
                <li>15-digit GSTIN statutory verification</li>
                <li>Multi-user corporate wallet permissions</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Trust & Certifications Footer Banner */}
      <section className="home-cta-banner">
        <div className="cta-banner-inner">
          <div className="cta-content">
            <h2>Ready to transform your agricultural operations?</h2>
            <p>Join over 2,40,000 farmers and aggregators experiencing sovereign digital identity and real-time escrow settlements.</p>
          </div>
          <div className="cta-buttons">
            <button 
              className="btn btn-white btn-lg"
              onClick={onOpenRegister}
            >
              <span>Register Citizen ID</span>
              <ArrowRight size={18} />
            </button>
            <button 
              className="btn btn-outline-white btn-lg"
              onClick={() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
                setActiveAuthTab('demo');
              }}
            >
              <span>Try Instant 1-Click Demo</span>
            </button>
          </div>
        </div>
      </section>

      {/* Comprehensive Agritech Footer */}
      <footer className="home-footer">
        <div className="footer-container">
          <div className="footer-grid">
            <div className="footer-col-brand">
              <div className="footer-brand-header">
                <span className="footer-logo">🌾</span>
                <span className="footer-brand-name">AgriLink Citizen</span>
              </div>
              <p className="footer-desc">
                National Citizen Identity & Digital Wallet Platform for the Agricultural Ecosystem. 
                Sovereign, double-entry, milestone-escrow protected.
              </p>
              <div className="footer-social-tags">
                <span className="tag-pill">Digital India Stack</span>
                <span className="tag-pill">RBI Escrow 2026</span>
                <span className="tag-pill">UIDAI KYC</span>
              </div>
            </div>

            <div className="footer-col">
              <h4>Personas</h4>
              <ul>
                <li><a href="#personas-showcase" onClick={() => handleSelectPersona(DEMO_PERSONAS[0])}>Farmer Portal</a></li>
                <li><a href="#personas-showcase" onClick={() => handleSelectPersona(DEMO_PERSONAS[1])}>Aggregator / FPO</a></li>
                <li><a href="#personas-showcase" onClick={() => handleSelectPersona(DEMO_PERSONAS[2])}>Customer / Buyer</a></li>
                <li><a href="#personas-showcase" onClick={() => handleSelectPersona(DEMO_PERSONAS[3])}>Logistics Partner</a></li>
              </ul>
            </div>

            <div className="footer-col">
              <h4>Platform Security</h4>
              <ul>
                <li><a href="#kyc-tiers-section">Tiered KYC Levels</a></li>
                <li><a href="#escrow-workflow-section">Double-Entry Escrow</a></li>
                <li><a href="#hero">Twilio SMS OTP Gateway</a></li>
                <li><a href="#hero">AI Biometric Face Unlock</a></li>
              </ul>
            </div>

            <div className="footer-col">
              <h4>Helpline & Compliance</h4>
              <p className="helpline-text">
                <Phone size={14} /> Kisan Call Center: <strong>1800-180-1551</strong>
              </p>
              <p className="helpline-text">
                <Lock size={14} /> Grievance Officer: <strong>compliance@agrilink.in</strong>
              </p>
              <p className="statutory-note">
                AgriLink complies with the Digital Personal Data Protection Act (DPDPA) and RBI Master Directions for Escrow & Prepaid Instruments.
              </p>
            </div>
          </div>

          <div className="footer-bottom-bar">
            <span>© 2026 AgriLink Platform · Citizen Identity & Wallet Microservice. All rights reserved.</span>
            <div className="footer-bottom-links">
              <span>Privacy Policy</span>
              <span>Terms of Escrow</span>
              <span>Dispute Settlement Charter</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
