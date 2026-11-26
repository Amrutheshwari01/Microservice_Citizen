import React, { useEffect, useState } from 'react';
import Header from './components/Header';
import HomePage from './components/HomePage';
import AuthModal from './components/AuthModal';
import MfaModal from './components/MfaModal';
import PinModal from './components/PinModal';
import NotificationDrawer from './components/NotificationDrawer';
import VoiceSearchModal from './components/VoiceSearchModal';
import authService from './services/authService';
import citizenService from './services/citizenService';
import walletService from './services/walletService';
import personaService from './services/personaService';
import adminService from './services/adminService';

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
import AddressManagementView from './components/CitizenPortal/AddressManagementView';
import BankAccountManagementView from './components/CitizenPortal/BankAccountManagementView';
import CitizenReportView from './components/CitizenPortal/CitizenReportView';

// Admin Console components
import AdminLoginView from './components/AdminConsole/AdminLoginView';
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
  KYC_TIERS_INFO,
  INITIAL_ADDRESSES,
  INITIAL_BANK_ACCOUNTS
} from './data/mockData';

import './App.css';

const mapWalletTransaction = (transaction) => {
  const transactionType = transaction.transaction_type || 'ADJUSTMENT';
  const isCredit = transaction.direction === 'CREDIT'
    || ['TOPUP', 'REFUND', 'RELEASE'].includes(transactionType);
  return {
    id: transaction.id,
    business_ref: transaction.reference_type || transaction.id,
    type: isCredit ? 'CREDIT' : transactionType === 'CASHOUT' ? 'PAYOUT' : 'DEBIT',
    category: transactionType.replaceAll('_', ' '),
    amount: Number(transaction.amount),
    fee: 0,
    net_amount: Number(transaction.amount),
    counterparty: transaction.counterparty_wallet_id || 'Wallet',
    timestamp: transaction.created_at,
    status: transaction.status === 'POSTED' ? 'COMPLETED' : transaction.status,
    description: transaction.description || transactionType,
    idempotency_key: ''
  };
};

const getAllWalletTransactions = async () => {
  const allTransactions = [];
  let offset = 0;
  const pageSize = 200;

  while (true) {
    const response = await walletService.getTransactions(pageSize, offset);
    const page = response?.data || [];
    allTransactions.push(...page);
    if (page.length < pageSize) return allTransactions;
    offset += pageSize;
  }
};

export default function App() {
  // Surface & Navigation state
  const [activeSurface, setActiveSurface] = useState('CITIZEN'); // 'CITIZEN' | 'ADMIN'
  const [activeTab, setActiveTab] = useState('dashboard');
  const [language, setLanguage] = useState('en'); // 'en', 'hi', 'kn'
  const [isLoggedIn, setIsLoggedIn] = useState(false); // First show home/login page, then navigate to dashboard
  const [registeredIdentifier, setRegisteredIdentifier] = useState('');
  const [registrationNotice, setRegistrationNotice] = useState('');
  const [operationError, setOperationError] = useState(null);

  // Core Data State
  const [citizen, setCitizen] = useState(INITIAL_CITIZEN);
  const [wallet, setWallet] = useState(INITIAL_WALLET);
  const [transactions, setTransactions] = useState(INITIAL_TRANSACTIONS);
  const [holds, setHolds] = useState(INITIAL_HOLDS);
  const [sessions, setSessions] = useState(INITIAL_SESSIONS);
  const [addresses, setAddresses] = useState(INITIAL_ADDRESSES || []);
  const [bankAccounts, setBankAccounts] = useState(INITIAL_BANK_ACCOUNTS || []);
  const [profileHistory, setProfileHistory] = useState(INITIAL_PROFILE_HISTORY);
  const [consents, setConsents] = useState(INITIAL_CONSENTS);
  const [outboxEvents, setOutboxEvents] = useState(INITIAL_OUTBOX_EVENTS);
  const [unreadNotifs, setUnreadNotifs] = useState(3);

  // Admin Data State
  const [adminSession, setAdminSession] = useState(() => (
    adminService.getAdminToken() ? adminService.getAdminUser() : null
  ));
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
  const recordEvent = (eventType, businessRef, payload, auditDetails, module = "Citizen Wallet") => {
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
  const handleOpenAuthModal = () => {
    setIsAuthModalOpen(true);
  };

  const applyPersonaRecordsToCitizen = (personaRecords, fallbackActive = null) => {
    const records = Array.isArray(personaRecords) ? personaRecords : [];
    const activeRecords = records.filter(p => p.status === 'ACTIVE');
    const activePersonaTypes = activeRecords.map(p => p.persona_type);
    const defaultPersona = activeRecords.find(p => p.is_default)?.persona_type
      || fallbackActive
      || activePersonaTypes[0]
      || 'CUSTOMER';
    const pendingApps = records
      .filter(p => p.status === 'PENDING')
      .map(p => ({
        id: p.id,
        persona: p.persona_type,
        status: 'PENDING_APPROVAL',
        applied_at: p.created_at
      }));

    setCitizen(prev => ({
      ...prev,
      persona_records: records,
      personas: activePersonaTypes.length ? activePersonaTypes : prev.personas,
      active_persona: defaultPersona,
      pending_persona_applications: pendingApps
    }));
  };

  const syncCitizenPersonas = async () => {
    try {
      const response = await personaService.getPersonas();
      if (response?.data) {
        applyPersonaRecordsToCitizen(response.data);
      }
      return response?.data || [];
    } catch {
      return [];
    }
  };

  const loadAdminPersonaApplications = async () => {
    if (!adminService.getAdminToken()) return;
    try {
      const response = await adminService.getPendingPersonaApplications();
      const items = (response?.data || []).map(item => ({
        id: item.persona_id,
        persona_id: item.persona_id,
        approval_id: item.approval_id,
        applicant_id: item.citizen_id,
        applicant_name: item.citizen_name,
        applicant_email: item.citizen_email,
        applicant_mobile: item.citizen_mobile,
        persona: item.persona_type,
        kyc_tier: 'T0',
        fpo_name: item.citizen_email || item.citizen_mobile || 'Registered Citizen',
        license_ref: item.persona_id,
        applied_at: item.applied_at,
        status: item.status === 'PENDING' ? 'PENDING_APPROVAL' : item.status
      }));
      setPersonaApplications(items);
    } catch (err) {
      if (err.status === 401 || err.status === 403) {
        adminService.logout();
        setAdminSession(null);
      } else {
        setOperationError(err.message || 'Could not load pending persona applications.');
      }
    }
  };

  useEffect(() => {
    if (activeSurface === 'ADMIN' && adminSession) {
      loadAdminPersonaApplications();
    }
  }, [activeSurface, adminSession]);

  const handleLoginSuccess = async () => {
    const [profileResult, walletResult] = await Promise.allSettled([
      citizenService.getMyProfile(),
      walletService.getWalletSummary()
    ]);
    if (profileResult.status === 'rejected' || walletResult.status === 'rejected') {
      const failedRequest = profileResult.status === 'rejected'
        ? { name: 'profile', error: profileResult.reason }
        : { name: 'wallet', error: walletResult.reason };
      const error = new Error(`Could not load your ${failedRequest.name}: ${failedRequest.error.message}`);
      error.requestId = failedRequest.error.requestId;
      throw error;
    }

    const profileResponse = profileResult.value;
    const walletResponse = walletResult.value;
    const optionalResults = await Promise.allSettled([
      getAllWalletTransactions().then(data => ({ data })),
      walletService.getHolds().catch(err => (err.status === 404 ? { data: [] } : Promise.reject(err))),
      citizenService.getProfileHistory(),
      citizenService.getConsents(),
      citizenService.getActiveSessions().catch(err => (err.status === 404 ? { data: [] } : Promise.reject(err))),
      personaService.getPersonas().catch(() => ({ data: [] }))
    ]);
    const optionalLabels = ['transaction history', 'escrow holds', 'profile history', 'consents', 'sessions', 'personas'];
    const optionalData = optionalResults.map(result => result.status === 'fulfilled' ? result.value : null);
    const [transactionsResponse, holdsResponse, historyResponse, consentResponse, sessionResponse, personasResponse] = optionalData;
    const failedOptionalRequests = optionalResults
      .map((result, index) => result.status === 'rejected' ? { label: optionalLabels[index], error: result.reason } : null)
      .filter(Boolean);

    const profile = profileResponse?.data;
    const walletData = walletResponse?.data;
    if (!profile || !walletData) {
      throw new Error('Your account data could not be loaded. Please try signing in again.');
    }

    const personaRecords = personasResponse?.data || [];
    const activePersonaRecords = personaRecords.filter(p => p.status === 'ACTIVE');
    const activePersonaTypes = activePersonaRecords.length
      ? activePersonaRecords.map(p => p.persona_type)
      : (profile.active_personas || ['CUSTOMER']);
    const resolvedActivePersona = activePersonaRecords.find(p => p.is_default)?.persona_type
      || profile.active_persona
      || activePersonaTypes[0]
      || 'CUSTOMER';
    const pendingPersonaApps = personaRecords
      .filter(p => p.status === 'PENDING')
      .map(p => ({
        id: p.id,
        persona: p.persona_type,
        status: 'PENDING_APPROVAL',
        applied_at: p.created_at
      }));

    setRegisteredIdentifier('');
    setRegistrationNotice('');
    setCitizen(prev => ({
      ...prev,
      ...profile,
      citizen_id: profile.citizen_id,
      full_name: profile.full_name,
      email: profile.email || '',
      mobile: profile.mobile || '',
      nationality: profile.nationality_code || 'IN',
      language: profile.preferred_language || 'en',
      address: [profile.address_line1, profile.address_line2, profile.city, profile.state_region, profile.postal_code]
        .filter(Boolean)
        .join(', '),
      active_persona: resolvedActivePersona,
      personas: activePersonaTypes,
      persona_records: personaRecords,
      pending_persona_applications: pendingPersonaApps,
      kyc_tier: profile.kyc_tier || 'T0',
      verified_bank_accounts: (profile.bank_accounts || []).map(account => ({
        ...account,
        account_number: account.account_number_masked,
        ifsc: account.ifsc_code
      }))
    }));
    setWallet({
      wallet_id: walletData.wallet_id,
      citizen_id: walletData.citizen_id,
      currency: walletData.currency_code,
      available_balance: Number(walletData.available_balance),
      held_balance: Number(walletData.held_balance),
      total_balance: Number(walletData.total_balance),
      today_spent: Number(walletData.today_spent),
      month_spent: Number(walletData.month_spent),
      max_balance: Number(walletData.max_balance),
      last_updated: walletData.updated_at
    });
    setTransactions((transactionsResponse?.data || []).map(mapWalletTransaction));
    setHolds((holdsResponse?.data || []).map(hold => ({
      ...hold,
      status: hold.status === 'ACTIVE' ? 'HELD' : hold.status,
      held_amount: Number(hold.amount),
      business_ref: hold.reason_code,
      module: 'Escrow',
      purpose: hold.reason_code,
      splits: []
    })));
    setAddresses(profile.addresses || []);
    setBankAccounts(profile.bank_accounts || []);
    setProfileHistory((historyResponse?.data || []).map(entry => ({
      ...entry,
      changed_field: Object.keys(entry.changed_fields || {}).join(', ')
    })));
    setConsents((consentResponse?.data || []).map(consent => ({
      ...consent,
      service_id: consent.consent_type,
      service_name: consent.consent_type,
      description: consent.purpose,
      data_points: [],
      granted_at: consent.captured_at
    })));
    setSessions((sessionResponse?.data || []).map(session => ({
      id: session.id,
      device_name: session.device_label || 'Web browser',
      device_type: 'browser',
      ip_address: session.ip_address || 'Not reported',
      location: 'Unknown location',
      last_active: session.created_at,
      issued_at: session.created_at,
      current: session.is_current
    })));
    setOperationError(failedOptionalRequests.length
      ? `Signed in, but could not load ${failedOptionalRequests.map(({ label }) => label).join(', ')}. Refresh the page to retry.${failedOptionalRequests.some(({ error }) => error.requestId)
        ? ` Support reference(s): ${failedOptionalRequests.map(({ error }) => error.requestId).filter(Boolean).join(', ')}.`
        : ''}`
      : null);
    setLanguage(profile.preferred_language || 'en');
    setActiveSurface('CITIZEN');
    setActiveTab('dashboard');
    setIsAuthModalOpen(false);
    setIsLoggedIn(true);
  };

  const handleRegisterSuccess = (account) => {
    const identifier = account.email || account.mobile || '';
    setRegisteredIdentifier(identifier);
    setRegistrationNotice(
      `Account created. Your AgriLink Citizen ID is ${account.public_citizen_id}. Sign in with your email, mobile number, or Citizen ID and password.`
    );
    setIsLoggedIn(false);
    setActiveSurface('CITIZEN');
    setActiveTab('dashboard');
    setIsAuthModalOpen(false);
    recordEvent(
      'CitizenRegistered',
      'REG-ONCE',
      { citizen_id: account.citizen_id, wallet_id: account.wallet_id },
      'Created a citizen account. Sign in to access the dashboard.',
      'Registration & Login'
    );
  };

  const handleLogout = async () => {
    setIsLoggedIn(false);
    setActiveTab('dashboard');
    try {
      await authService.logout();
    } catch (error) {
      console.warn('Server logout failed; local authentication tokens were cleared.', error);
    }
    recordEvent(
      "UserLoggedOut",
      "AUTH-LOGOUT",
      { citizen_id: citizen.citizen_id },
      `Citizen logged out. Access token added to deny-list. Navigated to Home Page.`,
      "Identity & Token API"
    );
  };

  // Citizen Transfer Handler (WAL-FR-04)
  const handlePerformTransfer = async (transferData) => {
    // Check if amount exceeds MFA step-up threshold
    if (transferData.amount >= (citizen.mfa_threshold_amount || 10000)) {
      setPendingMfaAction({
        type: 'TRANSFER',
        data: transferData
      });
      setIsMfaModalOpen(true);
      return { requiresMfa: true };
    }

    return executeTransferCommit(transferData);
  };

  const executeTransferCommit = async (transferData) => {
    const response = await walletService.transfer(
      transferData.recipientId,
      transferData.amount,
      transferData.description,
      transferData.idempotencyKey
    );
    if (!response?.success) {
      throw new Error(response?.message || 'The wallet did not confirm this transfer.');
    }

    setWallet(prev => ({
      ...prev,
      available_balance: prev.available_balance - transferData.amount,
      total_balance: prev.total_balance - transferData.amount,
      today_spent: prev.today_spent + transferData.amount,
      month_spent: prev.month_spent + transferData.amount,
      last_updated: new Date().toISOString()
    }));

    const newTx = {
      id: response.transaction_id,
      business_ref: transferData.businessRef || response.transaction_id,
      type: "DEBIT",
      category: "Direct Transfer",
      purpose_code: transferData.purposeCode,
      amount: transferData.amount,
      fee: 0.00,
      net_amount: transferData.amount,
      counterparty: response.recipient_name || transferData.recipientName,
      timestamp: response.created_at,
      status: response.status === 'POSTED' ? 'COMPLETED' : response.status,
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
    return response;
  };

  // Top-Up Handler (WAL-FR-02)
  const handleTopupSuccess = async (topupData) => {
    const response = await walletService.topup(
      topupData.amount,
      topupData.method,
      topupData.provider_reference
    );
    if (!response?.success) {
      throw new Error(response?.message || 'The wallet did not confirm this top-up.');
    }

    setWallet(prev => ({
      ...prev,
      available_balance: prev.available_balance + topupData.amount,
      total_balance: prev.total_balance + topupData.amount,
      last_updated: new Date().toISOString()
    }));

    const newTx = {
      id: response.transaction_id,
      business_ref: topupData.provider_reference,
      type: "TOPUP",
      category: "Wallet Top-up",
      purpose_code: "CITIZEN_TOPUP_UPI",
      amount: topupData.amount,
      fee: 0.00,
      net_amount: topupData.amount,
      counterparty: `Payment Gateway (${topupData.method})`,
      timestamp: new Date().toISOString(),
      status: response.status === 'POSTED' ? 'COMPLETED' : response.status,
      description: `Instant INR top-up via ${topupData.channel}`,
      idempotency_key: ''
    };
    setTransactions(prev => [newTx, ...prev]);

    recordEvent(
      "WalletCredited",
      topupData.provider_reference,
      { amount: topupData.amount, channel: topupData.channel },
      `Wallet credited with INR ${topupData.amount} following signed webhook confirmation`
    );
    return response;
  };

  // Cash-Out Handlers (WAL-FR-07)
  const handleRequirePinForCashout = (cashoutData) => {
    setPendingCashoutData(cashoutData);
    setIsPinSettingMode(false);
    setIsPinModalOpen(true);
  };

  const handlePinSuccessForCashout = async () => {
    if (!pendingCashoutData) return;
    const { amount, fee, bank, business_ref } = pendingCashoutData;
    const totalDebit = amount + fee;
    const idempotencyKey = `cashout-${Date.now()}`;
    const response = await walletService.cashout(
      totalDebit,
      `${bank.bank_name} ${bank.account_number || bank.account_number_masked}`,
      idempotencyKey
    );
    if (!response?.success) {
      throw new Error(response?.message || 'The wallet did not confirm this cash-out.');
    }

    setWallet(prev => ({
      ...prev,
      available_balance: prev.available_balance - totalDebit,
      total_balance: prev.total_balance - totalDebit,
      today_spent: prev.today_spent + totalDebit,
      month_spent: prev.month_spent + totalDebit,
      last_updated: new Date().toISOString()
    }));

    const newTx = {
      id: response.transaction_id,
      business_ref: business_ref || response.transaction_id,
      type: "PAYOUT",
      category: "Bank Cash-out",
      purpose_code: "WALLET_CASHOUT_BANK",
      amount: totalDebit,
      fee: 0,
      net_amount: totalDebit,
      counterparty: `${bank.bank_name} (${bank.account_number})`,
      timestamp: response.created_at,
      status: response.status === 'POSTED' ? 'COMPLETED' : response.status,
      description: `IMPS withdrawal to verified bank account`,
      idempotency_key: idempotencyKey
    };
    setTransactions(prev => [newTx, ...prev]);

    recordEvent(
      "PayoutCompleted",
      business_ref,
      { amount, fee, bank: bank.bank_name, account: bank.account_number },
      `Cash-out payout of INR ${amount} executed to verified bank account ${bank.account_number}`
    );

    setPendingCashoutData(null);
    return response;
  };

  // Hold Release & Refund Handlers (WAL-FR-05 & 06)
  const returnHoldFunds = async (holdId, eventType, actionLabel) => {
    const hold = holds.find(h => h.id === holdId);
    if (!hold) return;

    setOperationError(null);
    try {
      const response = await walletService.releaseHold(holdId);
      if (!response?.success) {
        throw new Error(response?.message || `Could not ${actionLabel.toLowerCase()} this hold.`);
      }

      const amount = Number(response.amount);
      setHolds(prev => prev.map(item => (
        item.id === holdId ? { ...item, status: response.status } : item
      )));
      setWallet(prev => ({
        ...prev,
        available_balance: prev.available_balance + amount,
        held_balance: Math.max(0, prev.held_balance - amount),
        last_updated: response.created_at || new Date().toISOString()
      }));
      setTransactions(prev => [{
        id: response.transaction_id,
        business_ref: hold.business_ref,
        transaction_type: 'RELEASE',
        direction: 'CREDIT',
        amount,
        created_at: response.created_at,
        status: 'POSTED',
        description: `${actionLabel}: ${hold.business_ref}`
      }, ...prev]);

      recordEvent(
        eventType,
        hold.business_ref,
        { hold_id: holdId, amount },
        `${actionLabel} for hold ${holdId} (${hold.business_ref})`
      );
    } catch (error) {
      setOperationError(error.message || `Could not ${actionLabel.toLowerCase()} this hold.`);
    }
  };

  const handleReleaseHold = (holdId) => returnHoldFunds(holdId, 'FundsReleased', 'Hold released');
  const handleRefundHold = (holdId) => returnHoldFunds(holdId, 'FundsRefunded', 'Expired hold refunded');

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
      `Frozen INR ${disputeData.disputed_amount} to Dispute Suspense`
    );
  };


  // Address Management Handlers
  const handleAddAddress = async (newAddr) => {
    const created = {
      ...newAddr,
      id: `ADDR-${Date.now().toString().slice(-4)}`
    };
    const nextAddresses = created.is_default
      ? addresses.map(a => ({ ...a, is_default: false })).concat(created)
      : [...addresses, created];
    const response = await citizenService.updateProfile({ addresses: nextAddresses });
    setAddresses(response.data.addresses || []);
    recordEvent("AddressAdded", created.id, created, `Citizen added address: ${created.address_label || created.address_type}`, "Profile & KYC");
  };

  const handleUpdateAddress = async (addrId, updatedData) => {
    const nextAddresses = addresses.map(a => {
      if (a.id === addrId) {
        return { ...a, ...updatedData };
      }
      if (updatedData.is_default) {
        return { ...a, is_default: false };
      }
      return a;
    });
    const response = await citizenService.updateProfile({ addresses: nextAddresses });
    setAddresses(response.data.addresses || []);
    recordEvent("AddressUpdated", addrId, updatedData, `Citizen updated address: ${addrId}`, "Profile & KYC");
  };

  const handleDeleteAddress = async (addrId) => {
    const nextAddresses = addresses.filter(a => a.id !== addrId);
    const response = await citizenService.updateProfile({ addresses: nextAddresses });
    setAddresses(response.data.addresses || []);
    recordEvent("AddressDeleted", addrId, {}, `Citizen removed address: ${addrId}`, "Profile & KYC");
  };

  const handleSetDefaultAddress = async (addrId) => {
    const nextAddresses = addresses.map(a => ({
      ...a,
      is_default: a.id === addrId
    }));
    const response = await citizenService.updateProfile({ addresses: nextAddresses });
    setAddresses(response.data.addresses || []);
  };

  // Bank Account Management Handlers
  const handleAddBankAccount = async (newAccount) => {
    const nextAccounts = newAccount.is_primary
      ? bankAccounts.map(b => ({ ...b, is_primary: false })).concat(newAccount)
      : [...bankAccounts, newAccount];
    const response = await citizenService.updateProfile({ bank_accounts: nextAccounts });
    setBankAccounts(response.data.bank_accounts || []);
    setCitizen(prev => ({
      ...prev,
      verified_bank_accounts: (response.data.bank_accounts || []).map(account => ({
        ...account,
        account_number: account.account_number_masked,
        ifsc: account.ifsc_code
      }))
    }));
    recordEvent("BankAccountLinked", newAccount.id, newAccount, `Citizen linked bank account: ${newAccount.bank_name}`, "Citizen Wallet");
  };

  const handleDeleteBankAccount = async (bankId) => {
    const nextAccounts = bankAccounts.filter(b => b.id !== bankId);
    const response = await citizenService.updateProfile({ bank_accounts: nextAccounts });
    setBankAccounts(response.data.bank_accounts || []);
    setCitizen(prev => ({
      ...prev,
      verified_bank_accounts: (response.data.bank_accounts || []).map(account => ({
        ...account,
        account_number: account.account_number_masked,
        ifsc: account.ifsc_code
      }))
    }));
    recordEvent("BankAccountRemoved", bankId, {}, `Citizen removed bank account: ${bankId}`, "Citizen Wallet");
  };

  const handleSetDefaultBankAccount = async (bankId) => {
    const nextAccounts = bankAccounts.map(b => ({
      ...b,
      is_primary: b.id === bankId
    }));
    const response = await citizenService.updateProfile({ bank_accounts: nextAccounts });
    setBankAccounts(response.data.bank_accounts || []);
    setCitizen(prev => ({
      ...prev,
      verified_bank_accounts: (response.data.bank_accounts || []).map(account => ({
        ...account,
        account_number: account.account_number_masked,
        ifsc: account.ifsc_code
      }))
    }));
  };

  // Profile Update (CID-FR-05)
  const handleUpdateProfile = async (updatedProfile) => {
    const response = await citizenService.updateProfile({
      full_name: updatedProfile.full_name,
      email: updatedProfile.email,
      mobile: updatedProfile.mobile,
      preferred_language: updatedProfile.language,
      date_of_birth: updatedProfile.date_of_birth,
      gender: updatedProfile.gender
    });
    const savedProfile = response.data;
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

    setCitizen(prev => ({
      ...prev,
      ...updatedProfile,
      ...savedProfile,
      email: savedProfile.email,
      mobile: savedProfile.mobile,
      language: savedProfile.preferred_language
    }));
    setProfileHistory(prev => [newHistory, ...prev]);

    recordEvent(
      "ProfileUpdated",
      "CID-PROFILE-UPDATE",
      { citizen_id: citizen.citizen_id, field: changedField },
      `Citizen updated profile field: ${changedField}`,
      "Profile & KYC"
    );
    return savedProfile;
  };

  const handleUpdateWalletLimit = async (maxBalance) => {
    const response = await walletService.updateWalletLimit(maxBalance);
    const updatedLimit = Number(response?.data?.max_balance);
    if (!Number.isFinite(updatedLimit)) {
      throw new Error('The server did not confirm the updated wallet limit.');
    }
    setWallet(prev => ({ ...prev, max_balance: updatedLimit }));
  };

  // Switch Persona (CID-FR-09)
  const handleSwitchPersona = async (newPersona) => {
    const normalized = newPersona === 'BUYER'
      ? 'CUSTOMER'
      : newPersona === 'DELIVERY_PERSON'
        ? 'DELIVERY_PARTNER'
        : newPersona;

    let records = citizen.persona_records || [];
    let targetRecord = records.find(
      p => p.persona_type === normalized && p.status === 'ACTIVE'
    );

    if (!targetRecord && authService.isAuthenticated()) {
      records = await syncCitizenPersonas();
      targetRecord = records.find(
        p => p.persona_type === normalized && p.status === 'ACTIVE'
      );
    }

    if (targetRecord && authService.isAuthenticated()) {
      await personaService.activatePersona(targetRecord.id);
      await syncCitizenPersonas();
    } else {
      setCitizen(prev => ({ ...prev, active_persona: normalized }));
    }

    recordEvent(
      "PersonaSwitched",
      "CID-PERSONA-SWITCH",
      { citizen_id: citizen.citizen_id, active_persona: normalized },
      `Citizen switched active persona to ${normalized}. Next JWT carries updated claim.`,
      "Role & Persona Management"
    );
  };

  // Submit Persona Application (CID-FR-08)
  const handleSubmitPersonaApplication = async (appData) => {
    const response = await personaService.applyPersona(
      appData.persona,
      appData.fpo_name || appData.persona,
      appData.notes,
      {
        fpo_name: appData.fpo_name,
        license_ref: appData.license_ref
      }
    );

    await syncCitizenPersonas();
    if (adminSession) {
      await loadAdminPersonaApplications();
    }

    recordEvent(
      "PersonaApplicationSubmitted",
      response?.persona_id || `APP-PER-${Date.now()}`,
      { applicant_id: citizen.citizen_id, persona: appData.persona },
      `Application submitted for restricted persona ${appData.persona}`,
      "Role & Persona Management"
    );
  };

  // Consent Toggle (CID-FR-12)
  const handleToggleConsent = async (consentId, granted) => {
    try {
      const response = await citizenService.updateConsent(consentId, granted);
      setConsents(prev => prev.map(consent => (
        consent.id === consentId
          ? {
            ...consent,
            ...response,
            service_id: response.consent_type,
            service_name: response.consent_type,
            description: response.purpose,
            data_points: [],
            granted_at: response.captured_at
          }
          : consent
      )));
      recordEvent(
        granted ? "ConsentGranted" : "ConsentWithdrawn",
        consentId,
        { consent_id: consentId, granted },
        `Citizen ${granted ? 'granted' : 'withdrew'} data access for service`,
        "Access, Consent & Audit"
      );
    } catch (error) {
      setOperationError(error.message || 'Could not update consent.');
    }
  };

  // Revoke Session (CID-FR-03)
  const handleRevokeSession = async (sessionId) => {
    try {
      await citizenService.revokeSession(sessionId);
      setSessions(prev => prev.filter(session => session.id !== sessionId));
      recordEvent(
        "SessionRevoked",
        sessionId,
        { session_id: sessionId },
        `Session revoked. Refresh token rotated & placed in deny-list `,
        "Registration & Login"
      );
    } catch (error) {
      setOperationError(error.message || 'Could not revoke this session.');
    }
  };

  const handleRevokeAllOtherSessions = async () => {
    try {
      await citizenService.revokeOtherSessions();
      setSessions(prev => prev.filter(session => session.current));
      recordEvent(
        "AllOtherSessionsRevoked",
        "BULK-REVOKE",
        { citizen_id: citizen.citizen_id },
        `Revoked all other devices. Tokens pushed to deny-list `,
        "Registration & Login"
      );
    } catch (error) {
      setOperationError(error.message || 'Could not revoke other sessions.');
    }
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
  const handleAdminLoginSuccess = async (admin) => {
    setAdminSession(admin);
    setActiveTab('admin-approvals');
    await loadAdminPersonaApplications();
  };

  const handleAdminLogout = () => {
    adminService.logout();
    setAdminSession(null);
  };

  const handleApprovePersona = async (appId, notes) => {
    try {
      await adminService.decidePersonaApplication(appId, 'APPROVED', 'ADMIN_APPROVED');
      setPersonaApplications(prev => prev.map(a => {
        if (a.id === appId || a.persona_id === appId) {
          return {
            ...a,
            status: 'APPROVED',
            approved_by: adminSession?.username || 'ADMIN_COMPLIANCE_DESK',
            approved_at: new Date().toISOString()
          };
        }
        return a;
      }));
      await loadAdminPersonaApplications();
      if (isLoggedIn) {
        await syncCitizenPersonas();
      }
      recordEvent(
        "PersonaApproved",
        appId,
        { application_id: appId, notes },
        `Compliance desk approved restricted persona application`,
        "Role & Persona Management"
      );
    } catch (error) {
      setOperationError(error.message || 'Could not approve persona application.');
    }
  };

  const handleRejectPersona = async (appId, reason) => {
    try {
      await adminService.decidePersonaApplication(appId, 'REJECTED', reason || 'ADMIN_REJECTED');
      setPersonaApplications(prev => prev.map(a => (
        (a.id === appId || a.persona_id === appId)
          ? { ...a, status: 'REJECTED', comments: reason }
          : a
      )));
      await loadAdminPersonaApplications();
      if (isLoggedIn) {
        await syncCitizenPersonas();
      }
      recordEvent(
        "PersonaRejected",
        appId,
        { application_id: appId, reason },
        `Compliance desk rejected persona application: ${reason}`,
        "Role & Persona Management"
      );
    } catch (error) {
      setOperationError(error.message || 'Could not reject persona application.');
    }
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
      "Citizen Wallet"
    );
  };

  const handleUpdateLimitRule = (updatedRule) => {
    setLimitRules(prev => prev.map(r => r.id === updatedRule.id ? updatedRule : r));
    recordEvent(
      "LimitRuleUpdated",
      updatedRule.id,
      updatedRule,
      `Limit rule ${updatedRule.id} updated by Finance Operations`,
      "Citizen Wallet"
    );
  };

  const handleAddFeeRule = (newRule) => {
    setFeeSchedules(prev => [newRule, ...prev]);
    recordEvent(
      "FeeRuleCreated",
      newRule.id,
      newRule,
      `New fee schedule created for ${newRule.service}`,
      "Citizen Wallet"
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
      "Citizen Wallet"
    );
  };

  return (
    <div className="app-root">
      {isLoggedIn && (
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
          onOpenAuthModal={handleOpenAuthModal}
          onLogout={handleLogout}
          isLoggedIn={isLoggedIn}
        />
      )}

      {/* Main Body Surface */}
      <main className={`app-content ${isLoggedIn ? '' : 'app-content-auth'}`}>
        {operationError && (
          <div className="alert-callout danger" role="alert">
            {operationError}
          </div>
        )}
        {activeSurface === 'CITIZEN' ? (
          !isLoggedIn ? (
            <HomePage 
              key={registeredIdentifier}
              onLoginSuccess={handleLoginSuccess}
              onOpenRegister={() => handleOpenAuthModal('REGISTER')}
              registeredIdentifier={registeredIdentifier}
              registrationNotice={registrationNotice}
            />
          ) : (
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


            {activeTab === 'addresses' && (
              <AddressManagementView
                addresses={addresses}
                onAddAddress={handleAddAddress}
                onUpdateAddress={handleUpdateAddress}
                onDeleteAddress={handleDeleteAddress}
                onSetDefaultAddress={handleSetDefaultAddress}
              />
            )}

            {activeTab === 'bank' && (
              <BankAccountManagementView
                bankAccounts={bankAccounts}
                onAddBankAccount={handleAddBankAccount}
                onDeleteBankAccount={handleDeleteBankAccount}
                onSetDefaultBankAccount={handleSetDefaultBankAccount}
              />
            )}

            {activeTab === 'report' && (
              <CitizenReportView
                citizen={citizen}
                bankAccounts={bankAccounts}
              />
            )}

            {activeTab === 'profile' && (
              <ProfileKycView
                citizen={citizen}
                profileHistory={profileHistory}
                onUpdateProfile={handleUpdateProfile}
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
          )
        ) : !adminSession ? (
          <AdminLoginView onLoginSuccess={handleAdminLoginSuccess} />
        ) : (
          /* ADMIN OPERATIONS SURFACE */
          <>
            <div
              className="card"
              style={{
                marginBottom: '16px',
                padding: '12px 18px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px'
              }}
            >
              <div>
                <strong>Admin Session:</strong> {adminSession.full_name || adminSession.username}
                <span className="badge badge-green" style={{ marginLeft: '10px' }}>
                  {adminSession.role || 'ADMIN_COMPLIANCE_DESK'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={loadAdminPersonaApplications}
                >
                  Refresh Queue
                </button>
                <button
                  type="button"
                  className="btn btn-outline-danger btn-sm"
                  onClick={handleAdminLogout}
                >
                  Sign Out Admin
                </button>
              </div>
            </div>
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
        tierLimits={tierLimits}
        onTopupSuccess={handleTopupSuccess}
        onUpdateWalletLimit={handleUpdateWalletLimit}
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
            recordEvent("PinChanged", "PIN-SET", {}, "Wallet security PIN updated by citizen");
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
        onVerified={async () => {
          if (pendingMfaAction?.type === 'TRANSFER') {
            try {
              await executeTransferCommit(pendingMfaAction.data);
              setPendingMfaAction(null);
              setOperationError(null);
            } catch (error) {
              throw new Error(error.message || 'Transfer failed. Please try again.');
            }
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
