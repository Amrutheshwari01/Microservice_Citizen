import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Wallet, 
  Globe, 
  Mic, 
  Bell, 
  UserCheck, 
  ChevronDown, 
  SlidersHorizontal, 
  LogOut, 
  User, 
  Sparkles,
  Layers,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { TRANSLATIONS } from '../data/i18n';
import { KYC_TIERS_INFO } from '../data/mockData';

export default function Header({
  citizen,
  activeSurface,
  setActiveSurface,
  activeTab,
  setActiveTab,
  language,
  setLanguage,
  onOpenVoiceSearch,
  onOpenNotifications,
  unreadCount,
  onSwitchPersona,
  onOpenAuthModal,
  onLogout,
  isLoggedIn
}) {
  const [showPersonaMenu, setShowPersonaMenu] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const t = TRANSLATIONS[language] || TRANSLATIONS.en;
  const tierInfo = KYC_TIERS_INFO[citizen.kyc_tier] || KYC_TIERS_INFO.T0;

  const languages = [
    { code: 'en', label: 'English', native: 'English' },
    { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
    { code: 'kn', label: 'Kannada', native: 'ಕನ್ನಡ' }
  ];

  return (
    <header className="header-container">
      {/* Top Bar with Microservice badge & surface switch */}
      <div className="top-banner">
        <div className="top-banner-inner">
          <div className="service-tag">
            <span className="live-indicator"></span>
            <strong>AgriLink Ecosystem · Microservice 2</strong>
            <span className="separator">|</span>
            <span>Citizen Identity & Wallet Service (CIS-M1 to M6)</span>
            <span className="spec-version">ATAM / ADR v1.2</span>
          </div>

          <div className="surface-switcher-container">
            <div className="surface-switch">
              <button
                className={`surface-btn ${activeSurface === 'CITIZEN' ? 'active' : ''}`}
                onClick={() => setActiveSurface('CITIZEN')}
              >
                <User size={14} />
                <span>Citizen Portal</span>
              </button>
              <button
                className={`surface-btn ${activeSurface === 'ADMIN' ? 'active' : ''}`}
                onClick={() => setActiveSurface('ADMIN')}
              >
                <SlidersHorizontal size={14} />
                <span>Admin & Ops Console</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="main-nav">
        <div className="nav-brand">
          <div className="brand-logo">
            <span className="brand-icon">🌾</span>
          </div>
          <div className="brand-text">
            <h1 className="brand-title">AgriLink <span>Citizen</span></h1>
            <p className="brand-sub">One Identity · One Double-Entry INR Wallet</p>
          </div>
        </div>

        {/* Global Action Bar */}
        <div className="nav-actions">
          {/* S07: Voice Search Assistant Button */}
          <button 
            className="action-icon-btn voice-btn" 
            onClick={onOpenVoiceSearch}
            title={t.voice.startVoice}
          >
            <Mic size={17} className="mic-icon pulse" />
            <span className="action-btn-text">Voice Search</span>
          </button>

          {/* S07: Language Selector */}
          <div className="dropdown-wrapper">
            <button 
              className="action-icon-btn lang-btn" 
              onClick={() => setShowLangMenu(!showLangMenu)}
              title="Change Language"
            >
              <Globe size={16} />
              <span className="lang-code">{languages.find(l => l.code === language)?.native || 'EN'}</span>
              <ChevronDown size={14} />
            </button>
            {showLangMenu && (
              <div className="dropdown-menu lang-dropdown">
                {languages.map(lang => (
                  <button
                    key={lang.code}
                    className={`dropdown-item ${language === lang.code ? 'selected' : ''}`}
                    onClick={() => {
                      setLanguage(lang.code);
                      setShowLangMenu(false);
                    }}
                  >
                    <span>{lang.native}</span>
                    <span className="text-muted">({lang.label})</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* CID-FR-09: Persona Switcher (When in Citizen Portal & logged in) */}
          {isLoggedIn && activeSurface === 'CITIZEN' && (
            <div className="dropdown-wrapper">
              <button 
                className="persona-pill" 
                onClick={() => setShowPersonaMenu(!showPersonaMenu)}
                title="Switch Active Persona"
              >
                <Layers size={14} />
                <span className="persona-label">Persona:</span>
                <strong className="persona-name">{citizen.active_persona}</strong>
                <ChevronDown size={14} />
              </button>
              {showPersonaMenu && (
                <div className="dropdown-menu persona-dropdown">
                  <div className="dropdown-header">
                    <span>Available Personas (CID-FR-09)</span>
                  </div>
                  {citizen.personas.map(persona => (
                    <button
                      key={persona}
                      className={`dropdown-item ${citizen.active_persona === persona ? 'selected' : ''}`}
                      onClick={() => {
                        onSwitchPersona(persona);
                        setShowPersonaMenu(false);
                      }}
                    >
                      <span className="persona-icon-badge">
                        {persona === 'FARMER' ? '🚜' : persona === 'BUYER' ? '💼' : persona === 'AGGREGATOR' ? '🏢' : '🚚'}
                      </span>
                      <div className="persona-info">
                        <strong>{persona}</strong>
                        <small>{persona === citizen.active_persona ? 'Active in Token Claim' : 'Click to switch'}</small>
                      </div>
                      {citizen.active_persona === persona && <CheckCircle2 size={16} className="text-success" />}
                    </button>
                  ))}
                  <div className="dropdown-footer">
                    <button 
                      className="link-btn"
                      onClick={() => {
                        setActiveTab('personas');
                        setShowPersonaMenu(false);
                      }}
                    >
                      + Apply for Aggregator / Delivery
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* WAL-FR-14: Outbox Notification Bell */}
          <button 
            className="action-icon-btn notif-btn" 
            onClick={onOpenNotifications}
            title={t.actions.notifications}
          >
            <Bell size={18} />
            {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
          </button>

          {/* User Account / Auth Button */}
          {isLoggedIn ? (
            <div className="dropdown-wrapper">
              <button 
                className="user-profile-btn" 
                onClick={() => setShowUserMenu(!showUserMenu)}
              >
                <div className="avatar-circle">
                  {citizen.full_name.charAt(0)}
                </div>
                <div className="user-details">
                  <span className="user-name">{citizen.full_name}</span>
                  <div className="user-sub">
                    <span className="citizen-id-badge font-mono">{citizen.citizen_id}</span>
                    <span 
                      className="tier-mini-badge" 
                      style={{ backgroundColor: tierInfo.color }}
                    >
                      {citizen.kyc_tier}
                    </span>
                  </div>
                </div>
                <ChevronDown size={14} />
              </button>
              {showUserMenu && (
                <div className="dropdown-menu user-dropdown">
                  <div className="dropdown-header">
                    <strong>{citizen.full_name}</strong>
                    <div className="text-muted font-mono">{citizen.mobile}</div>
                  </div>
                  <button 
                    className="dropdown-item"
                    onClick={() => {
                      setActiveSurface('CITIZEN');
                      setActiveTab('profile');
                      setShowUserMenu(false);
                    }}
                  >
                    <User size={16} />
                    <span>Profile & KYC ({citizen.kyc_tier})</span>
                  </button>
                  <button 
                    className="dropdown-item"
                    onClick={() => {
                      setActiveSurface('CITIZEN');
                      setActiveTab('security');
                      setShowUserMenu(false);
                    }}
                  >
                    <ShieldCheck size={16} />
                    <span>Security & Devices</span>
                  </button>
                  <div className="dropdown-divider"></div>
                  <button 
                    className="dropdown-item text-danger"
                    onClick={() => {
                      onLogout();
                      setShowUserMenu(false);
                    }}
                  >
                    <LogOut size={16} />
                    <span>{t.actions.logout}</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button 
              className="btn btn-primary btn-sm"
              onClick={onOpenAuthModal}
            >
              <UserCheck size={16} />
              <span>{t.actions.login}</span>
            </button>
          )}
        </div>
      </div>

      {/* Surface Navigation Bar */}
      <div className="sub-nav">
        {activeSurface === 'CITIZEN' ? (
          <div className="tab-strip">
            <button 
              className={`nav-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              <Wallet size={16} />
              <span>{t.nav.citizenHub}</span>
            </button>
            <button 
              className={`nav-tab ${activeTab === 'statements' ? 'active' : ''}`}
              onClick={() => setActiveTab('statements')}
            >
              <span>{t.nav.statements}</span>
            </button>
            <button 
              className={`nav-tab ${activeTab === 'holds' ? 'active' : ''}`}
              onClick={() => setActiveTab('holds')}
            >
              <span>{t.nav.holds}</span>
              <span className="count-badge">2</span>
            </button>
            <button 
              className={`nav-tab ${activeTab === 'profile' ? 'active' : ''}`}
              onClick={() => setActiveTab('profile')}
            >
              <span>{t.nav.profileKyc}</span>
              <span className="badge-pill-tier">{citizen.kyc_tier}</span>
            </button>
            <button 
              className={`nav-tab ${activeTab === 'personas' ? 'active' : ''}`}
              onClick={() => setActiveTab('personas')}
            >
              <span>{t.nav.personas}</span>
            </button>
            <button 
              className={`nav-tab ${activeTab === 'consent' ? 'active' : ''}`}
              onClick={() => setActiveTab('consent')}
            >
              <span>{t.nav.consent}</span>
            </button>
            <button 
              className={`nav-tab ${activeTab === 'security' ? 'active' : ''}`}
              onClick={() => setActiveTab('security')}
            >
              <span>{t.nav.security}</span>
            </button>
          </div>
        ) : (
          <div className="tab-strip admin-strip">
            <button 
              className={`nav-tab ${activeTab === 'admin-overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('admin-overview')}
            >
              <span>Ops Overview</span>
            </button>
            <button 
              className={`nav-tab ${activeTab === 'admin-approvals' ? 'active' : ''}`}
              onClick={() => setActiveTab('admin-approvals')}
            >
              <span>Persona Approvals</span>
              <span className="count-badge warning">2</span>
            </button>
            <button 
              className={`nav-tab ${activeTab === 'admin-disputes' ? 'active' : ''}`}
              onClick={() => setActiveTab('admin-disputes')}
            >
              <span>Dispute & Freeze</span>
            </button>
            <button 
              className={`nav-tab ${activeTab === 'admin-audit' ? 'active' : ''}`}
              onClick={() => setActiveTab('admin-audit')}
            >
              <span>Hash Audit Trail</span>
            </button>
            <button 
              className={`nav-tab ${activeTab === 'admin-limits' ? 'active' : ''}`}
              onClick={() => setActiveTab('admin-limits')}
            >
              <span>Limits & Velocity</span>
            </button>
            <button 
              className={`nav-tab ${activeTab === 'admin-fees' ? 'active' : ''}`}
              onClick={() => setActiveTab('admin-fees')}
            >
              <span>Fee Schedules</span>
            </button>
            <button 
              className={`nav-tab ${activeTab === 'admin-reconciliation' ? 'active' : ''}`}
              onClick={() => setActiveTab('admin-reconciliation')}
            >
              <span>Daily Reconciliation</span>
            </button>
            <button 
              className={`nav-tab ${activeTab === 'admin-rbac' ? 'active' : ''}`}
              onClick={() => setActiveTab('admin-rbac')}
            >
              <span>RBAC & Policies</span>
            </button>
            <button 
              className={`nav-tab ${activeTab === 'admin-api' ? 'active' : ''}`}
              onClick={() => setActiveTab('admin-api')}
            >
              <span>APIs & JWKS</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
