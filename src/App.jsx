import React, { useState } from 'react';
import Header from './components/Header';
import AuthModal from './components/AuthModal';
import MfaModal from './components/MfaModal';
import PinModal from './components/PinModal';
import NotificationDrawer from './components/NotificationDrawer';
import VoiceSearchModal from './components/VoiceSearchModal';

// Citizen Portal components
import CitizenDashboard from './components/CitizenPortal/CitizenDashboard';
import WalletTransferModal from './components/CitizenPortal/WalletTransferModal';
import WalletTopupModal from './components/CitizenPortal/WalletTopupModal';
import WalletCashoutModal from './components/CitizenPortal/WalletCashoutModal';
import StatementsView from './components/CitizenPortal/StatementsView';
import EscrowHoldsView from './components/CitizenPortal/EscrowHoldsView';
import ProfileKycView from './components/CitizenPortal/ProfileKycView';
import PersonaManagementView from './components/CitizenPortal/PersonaManagementView';
import ConsentManagementView from './components/CitizenPortal/ConsentManagementView';
import SecuritySessionsView from './components/CitizenPortal/SecuritySessionsView';

// Admin Console components
import AdminOverview from './components/AdminConsole/AdminOverview';
import PersonaApprovals from './components/AdminConsole/PersonaApprovals';
import DisputesResolution from './components/AdminConsole/DisputesResolution';
import AuditTrail from './components/AdminConsole/AuditTrail';
import LimitsVelocity from './components/AdminConsole/LimitsVelocity';
import FeeScheduleView from './components/AdminConsole/FeeScheduleView';
import ReconciliationView from './components/AdminConsole/ReconciliationView';
import RbacManagement from './components/AdminConsole/RbacManagement';
import ApiExplorer from './components/AdminConsole/ApiExplorer';

// Initial Mock Data
import { 
  INITIAL_CITIZEN, 
  INITIAL_WALLET, 
  INITIAL_TRANSACTIONS, 
  INITIAL_HOLDS, 
  INITIAL_SESSIONS, 
  INITIAL_PROFILE_HISTORY, 
  INITIAL_CONSENTS, 
  INITIAL_OUTBOX_EVENTS, 
  INITIAL_PERSONA_APPLICATIONS, 
  INITIAL_AUDIT_LOGS, 
  INITIAL_DISPUTES, 
  INITIAL_LIMIT_RULES, 
  INITIAL_FEE_SCHEDULE, 
  INITIAL_RECONCILIATION, 
  KYC_TIERS_INFO 
} from './data/mockData';

import './App.css';

export default function App() {
  // Surface & Navigation state
  const [activeSurface, setActiveSurface] = useState('CITIZEN'); // 'CITIZEN' | 'ADMIN'
  const [activeTab, setActiveTab] = useState('dashboard');
  const [language, setLanguage] = useState('en'); // 'en', 'hi', 'kn'
  const [isLoggedIn, setIsLoggedIn] = useState(true);

  // Core Data State
  const [citizen, setCitizen] = useState(INITIAL_CITIZEN);
  const [wallet, setWallet] = useState(INITIAL_WALLET);
  const [transactions, setTransactions] = useState(INITIAL_TRANSACTIONS);
  const [holds, setHolds] = useState(INITIAL_HOLDS);
  const [sessions, setSessions] = useState(INITIAL_SESSIONS);
  const [profileHistory, setProfileHistory] = useState(INITIAL_PROFILE_HISTORY);
  const [consents, setConsents] = useState(INITIAL_CONSENTS);
  const [outboxEvents, setOutboxEvents] = useState(INITIAL_OUTBOX_EVENTS);
  const [unreadNotifs, setUnreadNotifs] = useState(3);

  // Admin Data State
  const [personaApplications, setPersonaApplications] = useState(INITIAL_PERSONA_APPLICATIONS);
  const [auditLogs, setAuditLogs] = useState(INITIAL_AUDIT_LOGS);
  const [disputes, setDisputes] = useState(INITIAL_DISPUTES);
  const [limitRules, setLimitRules] = useState(INITIAL_LIMIT_RULES);
  const [feeSchedules, setFeeSchedules] = useState(INITIAL_FEE_SCHEDULE);
  const [reconciliation, setReconciliation] = useState(INITIAL_RECONCILIATION);

  // Modal States
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isTopupModalOpen, setIsTopupModalOpen] = useState(false);
  const [isCashoutModalOpen, setIsCashoutModalOpen] = useState(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [isPinSettingMode, setIsPinSettingMode] = useState(false);
  const [isMfaModalOpen, setIsMfaModalOpen] = useState(false);
  const [pendingMfaAction, setPendingMfaAction] = useState(null);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isNotifDrawerOpen, setIsNotifDrawerOpen] = useState(false);

  // Cashout in-flight state
  const [pendingCashoutData, setPendingCashoutData] = useState(null);

  const tierLimits = KYC_TIERS_INFO[citizen.kyc_tier] || KYC_TIERS_INFO.T0;

  // Add event helper (WAL-FR-14 & CID-FR-14)
  const recordEvent = (eventType, businessRef, payload, auditDetails, module = "CIS-M6 (Citizen Wallet)") => {
    // 1. Add outbox event
    const newOutbox = {
      id: `EVT-${Math.floor(1000 + Math.random() * 9000)}`,
      event_type: eventType,
      business_ref: businessRef,
      payload,
      timestamp: new Date().toISOString(),
      delivered_to: ["CitizenApp", "NotificationAdapter", "AgriLink-Audit"]
    };
    setOutboxEvents(prev => [newOutbox, ...prev]);
    setUnreadNotifs(prev => prev + 1);

    // 2. Add hash-chained audit record (CID-FR-14)
    setAuditLogs(prev => {
      const lastBlock = prev[0] || { block_index: 1000, current_hash: "0000000000000000" };
      const newBlock = {
        block_index: lastBlock.block_index + 1,
        prev_hash: lastBlock.current_hash,
        current_hash: `0000${Math.random().toString(16).substring(2, 10)}${Math.random().toString(16).substring(2, 10)}...`,
        module,
        event_type: eventType,
        actor: citizen.citizen_id,
        target_id: wallet.wallet_id,
        details: auditDetails,
        timestamp: new Date().toISOString()
      };
      return [newBlock, ...prev];
    });
  };

  // Auth Handlers
  const handleLoginSuccess = (loginData) => {
    setIsLoggedIn(true);
    recordEvent(
      "UserAuthenticated",
      "AUTH-LOGIN",
      { citizen_id: citizen.citizen_id, method: loginData.method },
      `Citizen authenticated successfully via ${loginData.method} in 420ms`,
      "CIS-M1 (Registration & Login)"
    );
  };

  const handleRegisterSuccess = (newCitizenData) => {
    setCitizen(prev => ({
      ...prev,
      ...newCitizenData,
      kyc_tier: 'T0',
      kyc_status: 'UNVERIFIED',
      personas: ['FARMER'],
      active_persona: 'FARMER'
    }));

    const newWallet = {
      wallet_id: `WAL-IN-${newCitizenData.citizen_id.slice(-4)}-01`,
      currency: "INR",
      citizen_id: newCitizenData.citizen_id,
      available_balance: 0.00,
      held_balance: 0.00,
      total_balance: 0.00,
      today_spent: 0.00,
      month_spent: 0.00,
      last_updated: new Date().toISOString()
    };
    setWallet(newWallet);
    setIsLoggedIn(true);

    recordEvent(
      "CitizenRegistered",
      "REG-ONCE",
      { citizen_id: newCitizenData.citizen_id, wallet_id: newWallet.wallet_id },
      `Allocated single permanent citizen_id ${newCitizenData.citizen_id} and initialized INR Ledger Wallet`,
      "CIS-M1 (Registration & Login)"
    );
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    recordEvent(
      "UserLoggedOut",
      "AUTH-LOGOUT",
      { citizen_id: citizen.citizen_id },
      `Citizen logged out. Access token added to deny-list (CID-FR-11).`,
      "CIS-M4 (Identity & Token API)"
    );
    setIsAuthModalOpen(true);
  };

  // Citizen Transfer Handler (WAL-FR-04)
  const handlePerformTransfer = (transferData) => {
    // Check if amount exceeds MFA step-up threshold
    if (transferData.amount >= (citizen.mfa_threshold_amount || 10000)) {
      setPendingMfaAction({
        type: 'TRANSFER',
        data: transferData
      });
      setIsMfaModalOpen(true);
      return;
    }

    executeTransferCommit(transferData);
  };

  const executeTransferCommit = (transferData) => {
    setWallet(prev => ({
      ...prev,
      available_balance: prev.available_balance - transferData.amount,
      total_balance: prev.total_balance - transferData.amount,
      today_spent: prev.today_spent + transferData.amount,
      month_spent: prev.month_spent + transferData.amount,
      last_updated: new Date().toISOString()
    }));

    const newTx = {
      id: `TXN-${Math.floor(10000 + Math.random() * 90000)}`,
      business_ref: transferData.businessRef,
      type: "DEBIT",
      category: "Direct Transfer",
      purpose_code: transferData.purposeCode,
      amount: transferData.amount,
      fee: 0.00,
      net_amount: transferData.amount,
      counterparty: transferData.recipientName,
      timestamp: new Date().toISOString(),
      status: "COMPLETED",
      description: transferData.description,
      idempotency_key: transferData.idempotencyKey
    };
    setTransactions(prev => [newTx, ...prev]);

    recordEvent(
      "WalletDebited",
      transferData.businessRef,
      { amount: transferData.amount, recipient: transferData.recipientId, purpose: transferData.purposeCode },
      `Atomic transfer of INR ${transferData.amount} to ${transferData.recipientName} (${transferData.purposeCode})`
    );
  };

  // Top-Up Handler (WAL-FR-02)
  const handleTopupSuccess = (topupData) => {
    setWallet(prev => ({
      ...prev,
      available_balance: prev.available_balance + topupData.amount,
      total_balance: prev.total_balance + topupData.amount,
      last_updated: new Date().toISOString()
    }));

    const newTx = {
      id: `TXN-${Math.floor(10000 + Math.random() * 90000)}`,
      business_ref: topupData.business_ref,
      type: "TOPUP",
      category: "Wallet Top-up",
      purpose_code: "CITIZEN_TOPUP_UPI",
      amount: topupData.amount,
      fee: 0.00,
      net_amount: topupData.amount,
      counterparty: `Payment Gateway (${topupData.method})`,
      timestamp: new Date().toISOString(),
      status: "COMPLETED",
      description: `Instant INR top-up via ${topupData.channel}`,
      idempotency_key: topupData.idempotency_key
    };
    setTransactions(prev => [newTx, ...prev]);

    recordEvent(
      "WalletCredited",
      topupData.business_ref,
      { amount: topupData.amount, channel: topupData.channel },
      `Wallet credited with INR ${topupData.amount} following signed webhook confirmation`
    );
  };

  // Cash-Out Handlers (WAL-FR-07)
  const handleRequirePinForCashout = (cashoutData) => {
    setPendingCashoutData(cashoutData);
    setIsPinSettingMode(false);
    setIsPinModalOpen(true);
  };

  const handlePinSuccessForCashout = () => {
    if (!pendingCashoutData) return;
    const { amount, fee, bank, business_ref } = pendingCashoutData;
    const totalDebit = amount + fee;

    setWallet(prev => ({
      ...prev,
      available_balance: prev.available_balance - totalDebit,
      total_balance: prev.total_balance - totalDebit,
      today_spent: prev.today_spent + amount,
      month_spent: prev.month_spent + amount,
      last_updated: new Date().toISOString()
    }));

    const newTx = {
      id: `TXN-${Math.floor(10000 + Math.random() * 90000)}`,
      business_ref,
      type: "PAYOUT",
      category: "Bank Cash-out",
      purpose_code: "WALLET_CASHOUT_BANK",
      amount,
      fee,
      net_amount: amount - fee,
      counterparty: `${bank.bank_name} (${bank.account_number})`,
      timestamp: new Date().toISOString(),
      status: "COMPLETED",
      description: `IMPS withdrawal to verified bank account`,
      idempotency_key: `idem-cashout-${Date.now()}`
    };
    setTransactions(prev => [newTx, ...prev]);

    recordEvent(
      "PayoutCompleted",
      business_ref,
      { amount, fee, bank: bank.bank_name, account: bank.account_number },
      `Cash-out payout of INR ${amount} executed to verified bank account ${bank.account_number}`
    );

    setPendingCashoutData(null);
  };

  // Hold Release & Refund Handlers (WAL-FR-05 & 06)
  const handleReleaseHold = (holdId) => {
    const hold = holds.find(h => h.id === holdId);
    if (!hold) return;

    setHolds(prev => prev.map(h => h.id === holdId ? { ...h, status: 'RELEASED' } : h));
    setWallet(prev => ({
      ...prev,
      held_balance: Math.max(0, prev.held_balance - hold.held_amount),
      last_updated: new Date().toISOString()
    }));

    const newTx = {
      id: `TXN-${Math.floor(10000 + Math.random() * 90000)}`,
      business_ref: hold.business_ref,
      type: "RELEASE",
      category: "Escrow Split Release",
      purpose_code: "ESCROW_SPLIT_SETTLEMENT",
      amount: hold.held_amount,
      fee: 0.00,
      net_amount: hold.held_amount,
      counterparty: "Split Beneficiaries",
      timestamp: new Date().toISOString(),
      status: "COMPLETED",
      description: `Atomic release to ${hold.splits.length} split recipients (WAL-FR-06)`,
      idempotency_key: `idem-release-${holdId}`
    };
    setTransactions(prev => [newTx, ...prev]);

    recordEvent(
      "FundsReleased",
      hold.business_ref,
      { hold_id: holdId, released_amount: hold.held_amount, splits_count: hold.splits.length },
      `Released hold ${holdId} for ${hold.business_ref} with atomic split settlement (WAL-FR-06)`
    );
  };

  const handleRefundHold = (holdId) => {
    const hold = holds.find(h => h.id === holdId);
    if (!hold) return;

    setHolds(prev => prev.map(h => h.id === holdId ? { ...h, status: 'REFUNDED' } : h));
    setWallet(prev => ({
      ...prev,
      available_balance: prev.available_balance + hold.held_amount,
      held_balance: Math.max(0, prev.held_balance - hold.held_amount),
      last_updated: new Date().toISOString()
    }));

    const newTx = {
      id: `TXN-${Math.floor(10000 + Math.random() * 90000)}`,
      business_ref: hold.business_ref,
      type: "CREDIT",
      category: "Escrow Refund",
      purpose_code: "ESCROW_EXPIRED_REFUND",
      amount: hold.held_amount,
      fee: 0.00,
      net_amount: hold.held_amount,
      counterparty: "Escrow Ledger Account",
      timestamp: new Date().toISOString(),
      status: "COMPLETED",
      description: `Full refund of expired escrow hold`,
      idempotency_key: `idem-refund-${holdId}`
    };
    setTransactions(prev => [newTx, ...prev]);

    recordEvent(
      "FundsRefunded",
      hold.business_ref,
      { hold_id: holdId, refunded_amount: hold.held_amount },
      `Expired hold ${holdId} refunded in full back to citizen available balance`
    );
  };

  // Raise Dispute (WAL-FR-10)
  const handleRaiseDispute = (disputeData) => {
    const newDispute = {
      id: `DISP-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      hold_id: disputeData.hold_id,
      business_ref: disputeData.business_ref,
      complainant: `${citizen.citizen_id} (${citizen.full_name})`,
      respondent: "Counterparty Carrier/Trader",
      total_amount: disputeData.disputed_amount,
      disputed_amount: disputeData.disputed_amount,
      frozen_in_suspense: disputeData.disputed_amount,
      reason: disputeData.reason,
      status: "FROZEN",
      created_at: new Date().toISOString(),
      evidence: "Filed by citizen via dispute resolution portal."
    };
    setDisputes(prev => [newDispute, ...prev]);

    recordEvent(
      "DisputeFrozen",
      disputeData.business_ref,
      { dispute_id: newDispute.id, frozen_amount: disputeData.disputed_amount },
      `Frozen INR ${disputeData.disputed_amount} to Dispute Suspense (WAL-FR-10)`
    );
  };

  // Profile Update (CID-FR-05)
  const handleUpdateProfile = (updatedProfile) => {
    // Determine changed field for history
    const changedField = updatedProfile.address !== citizen.address ? "Address" 
      : updatedProfile.mobile !== citizen.mobile ? "Mobile" 
      : "Profile Info";
    
    const newHistory = {
      id: `HIST-${Date.now().toString().slice(-4)}`,
      changed_field: changedField,
      old_value: citizen.address,
      new_value: updatedProfile.address,
      changed_by: citizen.citizen_id,
      timestamp: new Date().toISOString(),
      ip_address: "49.36.128.44"
    };

    setCitizen(prev => ({ ...prev, ...updatedProfile }));
    setProfileHistory(prev => [newHistory, ...prev]);

    recordEvent(
      "ProfileUpdated",
      "CID-PROFILE-UPDATE",
      { citizen_id: citizen.citizen_id, field: changedField },
      `Citizen updated profile field: ${changedField}`,
      "CIS-M2 (Profile & KYC)"
    );
  };

  // KYC Tier Upgrade (CID-FR-06 & CID-FR-07)
  const handleUpgradeKycTier = (newTier, maskedRef, docType) => {
    setCitizen(prev => ({
      ...prev,
      kyc_tier: newTier,
      kyc_status: 'VERIFIED',
      kyc_details: {
        ...prev.kyc_details,
        verified_at: new Date().toISOString(),
        provider: `${docType} Government Adapter (UIDAI/NSDL)`
      }
    }));

    const newHistory = {
      id: `HIST-${Date.now().toString().slice(-4)}`,
      changed_field: "KYC Tier Level",
      old_value: citizen.kyc_tier,
      new_value: newTier,
      changed_by: "KYC_PROVIDER_ADAPTER",
      timestamp: new Date().toISOString(),
      ip_address: "INTERNAL_BULKHEAD"
    };
    setProfileHistory(prev => [newHistory, ...prev]);

    recordEvent(
      "KYCTierChanged",
      "KYC-PROV-UPGRADE",
      { citizen_id: citizen.citizen_id, old_tier: citizen.kyc_tier, new_tier: newTier },
      `Promoted citizen to ${newTier} following document tokenization`,
      "CIS-M2 (Profile & KYC)"
    );
  };

  // Switch Persona (CID-FR-09)
  const handleSwitchPersona = (newPersona) => {
    setCitizen(prev => ({ ...prev, active_persona: newPersona }));
    recordEvent(
      "PersonaSwitched",
      "CID-PERSONA-SWITCH",
      { citizen_id: citizen.citizen_id, active_persona: newPersona },
      `Citizen switched active persona to ${newPersona}. Next JWT carries updated claim.`,
      "CIS-M3 (Role / Persona Management)"
    );
  };

  // Submit Persona Application (CID-FR-08)
  const handleSubmitPersonaApplication = (appData) => {
    const newApp = {
      id: `APP-PER-${Math.floor(900 + Math.random() * 99)}`,
      applicant_id: citizen.citizen_id,
      applicant_name: citizen.full_name,
      persona: appData.persona,
      kyc_tier: citizen.kyc_tier,
      applied_at: new Date().toISOString(),
      fpo_name: appData.fpo_name,
      license_ref: appData.license_ref,
      status: "PENDING_APPROVAL",
      supporting_doc: "Govt_Certified_FPO_Permit.pdf",
      comments: appData.notes
    };
    setPersonaApplications(prev => [newApp, ...prev]);

    recordEvent(
      "PersonaApplicationSubmitted",
      newApp.id,
      { applicant_id: citizen.citizen_id, persona: appData.persona },
      `Application submitted for restricted persona ${appData.persona}`,
      "CIS-M3 (Role / Persona Management)"
    );
  };

  // Consent Toggle (CID-FR-12)
  const handleToggleConsent = (consentId, granted) => {
    setConsents(prev => prev.map(c => {
      if (c.id === consentId) {
        return {
          ...c,
          granted,
          granted_at: granted ? new Date().toISOString() : c.granted_at,
          withdrawn_at: !granted ? new Date().toISOString() : null
        };
      }
      return c;
    }));

    recordEvent(
      granted ? "ConsentGranted" : "ConsentWithdrawn",
      consentId,
      { consent_id: consentId, granted },
      `Citizen ${granted ? 'granted' : 'withdrew'} data access for service`,
      "CIS-M5 (Access, Consent & Audit)"
    );
  };

  // Revoke Session (CID-FR-03)
  const handleRevokeSession = (sessionId) => {
    setSessions(prev => prev.filter(s => s.id !== sessionId));
    recordEvent(
      "SessionRevoked",
      sessionId,
      { session_id: sessionId },
      `Session revoked. Refresh token rotated & placed in deny-list (CID-FR-11)`,
      "CIS-M1 (Registration & Login)"
    );
  };

  const handleRevokeAllOtherSessions = () => {
    setSessions(prev => prev.filter(s => s.current));
    recordEvent(
      "AllOtherSessionsRevoked",
      "BULK-REVOKE",
      { citizen_id: citizen.citizen_id },
      `Revoked all other devices. Tokens pushed to deny-list (CID-FR-11)`,
      "CIS-M1 (Registration & Login)"
    );
  };

  // Voice Assistant Execution (S07)
  const handleVoiceCommand = (intentAction) => {
    switch (intentAction) {
      case 'NAV_DASHBOARD':
        setActiveSurface('CITIZEN');
        setActiveTab('dashboard');
        break;
      case 'OPEN_TOPUP':
        setActiveSurface('CITIZEN');
        setIsTopupModalOpen(true);
        break;
      case 'OPEN_TRANSFER':
        setActiveSurface('CITIZEN');
        setIsTransferModalOpen(true);
        break;
      case 'NAV_HOLDS':
        setActiveSurface('CITIZEN');
        setActiveTab('holds');
        break;
      case 'NAV_PROFILE':
        setActiveSurface('CITIZEN');
        setActiveTab('profile');
        break;
      default:
        break;
    }
  };

  // Admin Actions
  const handleApprovePersona = (appId, notes) => {
    setPersonaApplications(prev => prev.map(a => {
      if (a.id === appId) {
        // If this is current citizen, grant persona
        if (a.applicant_id === citizen.citizen_id) {
          setCitizen(c => ({
            ...c,
            personas: Array.from(new Set([...c.personas, a.persona]))
          }));
        }
        return {
          ...a,
          status: 'APPROVED',
          approved_by: 'ADMIN_COMPLIANCE_DESK',
          approved_at: new Date().toISOString()
        };
      }
      return a;
    }));

    recordEvent(
      "PersonaApproved",
      appId,
      { application_id: appId, notes },
      `Compliance desk approved restricted persona application`,
      "CIS-M3 (Role / Persona Management)"
    );
  };

  const handleRejectPersona = (appId, reason) => {
    setPersonaApplications(prev => prev.map(a => a.id === appId ? { ...a, status: 'REJECTED', comments: reason } : a));
    recordEvent(
      "PersonaRejected",
      appId,
      { application_id: appId, reason },
      `Compliance desk rejected persona application: ${reason}`,
      "CIS-M3 (Role / Persona Management)"
    );
  };

  const handleResolveDispute = ({ dispute_id, action, reason_code, admin_notes }) => {
    setDisputes(prev => prev.map(d => {
      if (d.id === dispute_id) {
        return {
          ...d,
          status: action === 'REFUND' ? 'RESOLVED_REFUND' : 'RESOLVED_RELEASE',
          resolution_code: reason_code,
          resolved_at: new Date().toISOString(),
          resolved_by: 'ADMIN_FINANCE_OPS',
          frozen_in_suspense: 0.00
        };
      }
      return d;
    }));

    recordEvent(
      action === 'REFUND' ? "DisputeRefunded" : "DisputeReleased",
      dispute_id,
      { dispute_id, action, reason_code },
      `Dispute resolved via ${reason_code}: ${admin_notes}`,
      "CIS-M6 (Citizen Wallet)"
    );
  };

  const handleUpdateLimitRule = (updatedRule) => {
    setLimitRules(prev => prev.map(r => r.id === updatedRule.id ? updatedRule : r));
    recordEvent(
      "LimitRuleUpdated",
      updatedRule.id,
      updatedRule,
      `Limit rule ${updatedRule.id} updated by Finance Operations`,
      "CIS-M6 (Citizen Wallet)"
    );
  };

  const handleAddFeeRule = (newRule) => {
    setFeeSchedules(prev => [newRule, ...prev]);
    recordEvent(
      "FeeRuleCreated",
      newRule.id,
      newRule,
      `New fee schedule created for ${newRule.service}`,
      "CIS-M6 (Citizen Wallet)"
    );
  };

  const handleResolveException = (excId) => {
    setReconciliation(prev => ({
      ...prev,
      exceptions: prev.exceptions.filter(e => e.id !== excId)
    }));
    recordEvent(
      "ReconciliationExceptionCleared",
      excId,
      { exception_id: excId },
      `Exception ${excId} resolved via midnight time-boundary auto-adjustment`,
      "CIS-M6 (Citizen Wallet)"
    );
  };

  return (
    <div className="app-root">
      {/* Global Header */}
      <Header
        citizen={citizen}
        activeSurface={activeSurface}
        setActiveSurface={(surf) => {
          setActiveSurface(surf);
          setActiveTab(surf === 'CITIZEN' ? 'dashboard' : 'admin-overview');
        }}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        language={language}
        setLanguage={setLanguage}
        onOpenVoiceSearch={() => setIsVoiceModalOpen(true)}
        onOpenNotifications={() => {
          setIsNotifDrawerOpen(true);
          setUnreadNotifs(0);
        }}
        unreadCount={unreadNotifs}
        onSwitchPersona={handleSwitchPersona}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
        isLoggedIn={isLoggedIn}
      />

      {/* Main Body Surface */}
      <main className="app-content">
        {activeSurface === 'CITIZEN' ? (
          <>
            {activeTab === 'dashboard' && (
              <CitizenDashboard
                citizen={citizen}
                wallet={wallet}
                transactions={transactions}
                holds={holds}
                language={language}
                onOpenTransfer={() => setIsTransferModalOpen(true)}
                onOpenTopup={() => setIsTopupModalOpen(true)}
                onOpenCashout={() => setIsCashoutModalOpen(true)}
                onOpenPinManage={() => {
                  setIsPinSettingMode(true);
                  setIsPinModalOpen(true);
                }}
                onViewStatements={() => setActiveTab('statements')}
                onViewHolds={() => setActiveTab('holds')}
                onViewTierDetails={() => setActiveTab('profile')}
              />
            )}

            {activeTab === 'statements' && (
              <StatementsView
                transactions={transactions}
                wallet={wallet}
                citizen={citizen}
              />
            )}

            {activeTab === 'holds' && (
              <EscrowHoldsView
                holds={holds}
                citizen={citizen}
                onReleaseHold={handleReleaseHold}
                onRefundHold={handleRefundHold}
                onRaiseDispute={handleRaiseDispute}
              />
            )}

            {activeTab === 'profile' && (
              <ProfileKycView
                citizen={citizen}
                profileHistory={profileHistory}
                onUpdateProfile={handleUpdateProfile}
                onUpgradeKycTier={handleUpgradeKycTier}
              />
            )}

            {activeTab === 'personas' && (
              <PersonaManagementView
                citizen={citizen}
                onSwitchPersona={handleSwitchPersona}
                onSubmitPersonaApplication={handleSubmitPersonaApplication}
              />
            )}

            {activeTab === 'consent' && (
              <ConsentManagementView
                consents={consents}
                citizen={citizen}
                onToggleConsent={handleToggleConsent}
              />
            )}

            {activeTab === 'security' && (
              <SecuritySessionsView
                sessions={sessions}
                citizen={citizen}
                onRevokeSession={handleRevokeSession}
                onRevokeAllOtherSessions={handleRevokeAllOtherSessions}
                onOpenPinManage={() => {
                  setIsPinSettingMode(true);
                  setIsPinModalOpen(true);
                }}
                onUpdateSecuritySettings={(settings) => {
                  setCitizen(prev => ({ ...prev, ...settings }));
                }}
              />
            )}
          </>
        ) : (
          /* ADMIN OPERATIONS SURFACE */
          <>
            {activeTab === 'admin-overview' && (
              <AdminOverview
                wallet={wallet}
                holds={holds}
                disputes={disputes}
                personaApplications={personaApplications}
                reconciliation={reconciliation}
                onNavigateTab={setActiveTab}
              />
            )}

            {activeTab === 'admin-approvals' && (
              <PersonaApprovals
                applications={personaApplications}
                onApproveApplication={handleApprovePersona}
                onRejectApplication={handleRejectPersona}
              />
            )}

            {activeTab === 'admin-disputes' && (
              <DisputesResolution
                disputes={disputes}
                onResolveDispute={handleResolveDispute}
                onFreezeAdditional={handleRaiseDispute}
              />
            )}

            {activeTab === 'admin-audit' && (
              <AuditTrail
                auditLogs={auditLogs}
                onVerifyChain={() => {}}
              />
            )}

            {activeTab === 'admin-limits' && (
              <LimitsVelocity
                limitRules={limitRules}
                onUpdateLimitRule={handleUpdateLimitRule}
              />
            )}

            {activeTab === 'admin-fees' && (
              <FeeScheduleView
                feeSchedules={feeSchedules}
                onAddFeeRule={handleAddFeeRule}
              />
            )}

            {activeTab === 'admin-reconciliation' && (
              <ReconciliationView
                reconciliation={reconciliation}
                onResolveException={handleResolveException}
              />
            )}

            {activeTab === 'admin-rbac' && (
              <RbacManagement />
            )}

            {activeTab === 'admin-api' && (
              <ApiExplorer
                wallet={wallet}
                citizen={citizen}
              />
            )}
          </>
        )}
      </main>

      {/* Global Modals */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        onRegisterSuccess={handleRegisterSuccess}
      />

      <WalletTransferModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        wallet={wallet}
        citizen={citizen}
        tierLimits={tierLimits}
        onPerformTransfer={handlePerformTransfer}
      />

      <WalletTopupModal
        isOpen={isTopupModalOpen}
        onClose={() => setIsTopupModalOpen(false)}
        wallet={wallet}
        citizen={citizen}
        tierLimits={tierLimits}
        onTopupSuccess={handleTopupSuccess}
      />

      <WalletCashoutModal
        isOpen={isCashoutModalOpen}
        onClose={() => setIsCashoutModalOpen(false)}
        wallet={wallet}
        citizen={citizen}
        tierLimits={tierLimits}
        onRequirePinForCashout={handleRequirePinForCashout}
      />

      <PinModal
        isOpen={isPinModalOpen}
        onClose={() => setIsPinModalOpen(false)}
        isSettingPin={isPinSettingMode}
        currentPin={citizen.wallet_pin || "7421"}
        pinFailureCount={citizen.pin_failed_attempts}
        onSuccess={(newPin) => {
          if (isPinSettingMode && newPin) {
            setCitizen(prev => ({ ...prev, wallet_pin: newPin, wallet_pin_set: true }));
            recordEvent("PinChanged", "PIN-SET", {}, "Wallet security PIN updated by citizen (WAL-FR-09)");
          } else {
            handlePinSuccessForCashout();
          }
        }}
        onPinFailed={(count) => {
          setCitizen(prev => ({
            ...prev,
            pin_failed_attempts: count,
            wallet_locked: count >= 3
          }));
        }}
      />

      <MfaModal
        isOpen={isMfaModalOpen}
        onClose={() => setIsMfaModalOpen(false)}
        onVerified={() => {
          if (pendingMfaAction?.type === 'TRANSFER') {
            executeTransferCommit(pendingMfaAction.data);
            setPendingMfaAction(null);
          }
        }}
        actionTitle="High-Value Wallet Transfer"
        thresholdNote={`Amount exceeds ₹${(citizen.mfa_threshold_amount || 10000).toLocaleString('en-IN')} security threshold`}
      />

      <VoiceSearchModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        language={language}
        onExecuteCommand={handleVoiceCommand}
      />

      <NotificationDrawer
        isOpen={isNotifDrawerOpen}
        onClose={() => setIsNotifDrawerOpen(false)}
        events={outboxEvents}
        onSimulateEvent={(type) => {
          recordEvent(
            type,
            `SIM-${Date.now().toString().slice(-4)}`,
            { simulated: true, event_type: type },
            `Simulated microservice inbound event: ${type}`
          );
        }}
      />
    </div>
  );
}
