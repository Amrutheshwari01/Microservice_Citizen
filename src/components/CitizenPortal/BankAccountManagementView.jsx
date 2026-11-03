import React, { useState } from 'react';
import { 
  Building2, 
  Plus, 
  CheckCircle2, 
  Trash2, 
  ShieldCheck, 
  X, 
  AlertCircle, 
  FileText, 
  UploadCloud 
} from 'lucide-react';

export default function BankAccountManagementView({
  bankAccounts = [],
  onAddBankAccount,
  onDeleteBankAccount,
  onSetDefaultBankAccount
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
  const [formError, setFormError] = useState(null);

  const initialFormState = {
    account_holder_name: '',
    bank_name: '',
    account_number: '',
    confirm_account_number: '',
    ifsc_code: '',
    branch_name: '',
    account_type: 'SAVINGS',
    proof_document_type: 'CANCELLED_CHEQUE',
    is_primary: false
  };

  const [formData, setFormData] = useState(initialFormState);
  const [selectedFile, setSelectedFile] = useState(null);

  const handleOpenAdd = () => {
    setFormData(initialFormState);
    setSelectedFile(null);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.account_holder_name.trim() || !formData.bank_name.trim()) {
      setFormError('Please enter Account Holder Name and Bank Name.');
      return;
    }
    if (formData.account_number !== formData.confirm_account_number) {
      setFormError('Bank Account Numbers do not match. Please verify.');
      return;
    }
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(formData.ifsc_code.trim().toUpperCase())) {
      setFormError('Invalid IFSC code format (Expected: 4 letters, 0, followed by 6 alphanumeric characters, e.g. HDFC0001234).');
      return;
    }

    const last4 = formData.account_number.slice(-4);
    const masked = `•••• •••• •••• ${last4}`;

    const newAccount = {
      id: `BANK-${Date.now().toString().slice(-4)}`,
      account_holder_name: formData.account_holder_name,
      bank_name: formData.bank_name,
      account_number_masked: masked,
      ifsc_code: formData.ifsc_code.toUpperCase(),
      branch_name: formData.branch_name || 'Main Branch',
      account_type: formData.account_type,
      proof_document_type: formData.proof_document_type,
      verification_status: 'VERIFIED', // simulated penny drop verification
      is_primary: formData.is_primary || bankAccounts.length === 0,
      created_at: new Date().toISOString()
    };

    onAddBankAccount(newAccount);
    setIsModalOpen(false);
    setSuccessMessage(`Bank account ending in ${last4} linked and verified successfully via automated Penny-Drop!`);
    setTimeout(() => setSuccessMessage(null), 5000);
  };

  return (
    <div className="bank-account-view">
      <div className="view-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2>Payout Bank Accounts</h2>
          <p className="text-muted">Link your verified bank accounts for agricultural produce settlements, freight payouts, and wallet cash-outs.</p>
        </div>
        <button className="primary-btn" onClick={handleOpenAdd} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Plus size={16} />
          <span>Add Bank Account</span>
        </button>
      </div>

      {successMessage && (
        <div className="alert-callout success" style={{ marginBottom: '20px' }}>
          <CheckCircle2 size={18} />
          <span>{successMessage}</span>
        </div>
      )}

      {bankAccounts.length === 0 ? (
        <div className="empty-state-card" style={{ textAlign: 'center', padding: '48px 24px', background: 'var(--slate-50)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--slate-300)' }}>
          <Building2 size={40} style={{ color: 'var(--slate-400)', margin: '0 auto 12px' }} />
          <h3>No Payout Bank Accounts Linked</h3>
          <p className="text-muted" style={{ maxWidth: '420px', margin: '0 auto 20px' }}>
            Add your primary savings or current bank account to receive direct sales proceeds from mandis and buyers.
          </p>
          <button className="primary-btn" onClick={handleOpenAdd}>
            <Plus size={16} /> Link Bank Account
          </button>
        </div>
      ) : (
        <div className="bank-accounts-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
          {bankAccounts.map((account) => (
            <div 
              key={account.id}
              className={`bank-card ${account.is_primary ? 'default-card' : ''}`}
              style={{
                background: '#fff',
                borderRadius: 'var(--radius-lg)',
                padding: '24px',
                border: account.is_primary ? '2px solid var(--primary-600)' : '1px solid var(--slate-200)',
                boxShadow: 'var(--shadow-sm)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ background: 'var(--primary-50)', padding: '10px', borderRadius: 'var(--radius-md)' }}>
                      <Building2 size={24} className="text-primary" />
                    </div>
                    <div>
                      <strong style={{ fontSize: '1.05rem', color: 'var(--slate-900)' }}>{account.bank_name}</strong>
                      <div style={{ fontSize: '0.8rem', color: 'var(--slate-500)' }}>{account.account_type} Account</div>
                    </div>
                  </div>

                  {account.is_primary && (
                    <span className="badge badge-green">Default Payout</span>
                  )}
                </div>

                <div style={{ background: 'var(--slate-50)', padding: '12px 16px', borderRadius: 'var(--radius-md)', marginBottom: '16px' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)', marginBottom: '4px' }}>ACCOUNT NUMBER</div>
                  <div className="font-mono" style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--slate-800)', letterSpacing: '1px' }}>
                    {account.account_number_masked}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.85rem', marginBottom: '16px' }}>
                  <div>
                    <span className="text-muted">Account Holder:</span>
                    <div style={{ fontWeight: 600, color: 'var(--slate-800)' }}>{account.account_holder_name}</div>
                  </div>
                  <div>
                    <span className="text-muted">IFSC Code:</span>
                    <div className="font-mono" style={{ fontWeight: 600, color: 'var(--slate-800)' }}>{account.ifsc_code}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--primary-700)', marginBottom: '16px' }}>
                  <ShieldCheck size={16} />
                  <span>Verified via Instant Penny-Drop Rail</span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid var(--slate-100)' }}>
                {!account.is_primary ? (
                  <button 
                    className="link-btn"
                    onClick={() => onSetDefaultBankAccount(account.id)}
                    style={{ fontSize: '0.85rem', color: 'var(--primary-700)', fontWeight: 600 }}
                  >
                    Set as Default Payout
                  </button>
                ) : <span style={{ fontSize: '0.82rem', color: 'var(--primary-600)', fontWeight: 600 }}>Active Destination</span>}

                <button 
                  className="action-icon-btn danger" 
                  onClick={() => {
                    if (window.confirm('Are you sure you want to remove this bank account?')) {
                      onDeleteBankAccount(account.id);
                    }
                  }}
                  title="Remove Account"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Bank Account Modal */}
      {isModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '600px', width: '90%' }}>
            <div className="modal-header">
              <h3>Link Bank Account for Payouts</h3>
              <button className="close-btn" onClick={() => setIsModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {formError && (
                <div className="alert-callout danger" style={{ margin: 0 }}>
                  <AlertCircle size={16} />
                  <span>{formError}</span>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label className="form-label">Bank Name *</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. State Bank of India, HDFC Bank"
                    required
                    value={formData.bank_name}
                    onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label">Account Type</label>
                  <select 
                    className="form-input"
                    value={formData.account_type}
                    onChange={(e) => setFormData({ ...formData, account_type: e.target.value })}
                  >
                    <option value="SAVINGS">Savings Account</option>
                    <option value="CURRENT">Current Account (Business / FPO)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="form-label">Account Holder Name (as printed on cheque/passbook) *</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. Ramesh Kumar"
                  required
                  value={formData.account_holder_name}
                  onChange={(e) => setFormData({ ...formData, account_holder_name: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label className="form-label">Account Number *</label>
                  <input 
                    type="password" 
                    className="form-input font-mono" 
                    placeholder="Enter account number"
                    required
                    value={formData.account_number}
                    onChange={(e) => setFormData({ ...formData, account_number: e.target.value.replace(/\D/g, '') })}
                  />
                </div>
                <div>
                  <label className="form-label">Confirm Account Number *</label>
                  <input 
                    type="text" 
                    className="form-input font-mono" 
                    placeholder="Re-enter account number"
                    required
                    value={formData.confirm_account_number}
                    onChange={(e) => setFormData({ ...formData, confirm_account_number: e.target.value.replace(/\D/g, '') })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label className="form-label">IFSC Code *</label>
                  <input 
                    type="text" 
                    maxLength={11}
                    className="form-input font-mono" 
                    placeholder="e.g. SBIN0001234"
                    required
                    style={{ textTransform: 'uppercase' }}
                    value={formData.ifsc_code}
                    onChange={(e) => setFormData({ ...formData, ifsc_code: e.target.value.toUpperCase() })}
                  />
                </div>
                <div>
                  <label className="form-label">Branch Name (Optional)</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. Mandi Branch"
                    value={formData.branch_name}
                    onChange={(e) => setFormData({ ...formData, branch_name: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Proof Document (Cancelled Cheque or Bank Passbook) *</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
                  <select 
                    className="form-input"
                    value={formData.proof_document_type}
                    onChange={(e) => setFormData({ ...formData, proof_document_type: e.target.value })}
                  >
                    <option value="CANCELLED_CHEQUE">Cancelled Cheque</option>
                    <option value="PASSBOOK">Bank Passbook Front Page</option>
                    <option value="BANK_STATEMENT">Recent Bank Statement</option>
                  </select>
                  <div style={{ border: '1px dashed var(--slate-300)', padding: '10px 16px', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--slate-50)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--slate-600)' }}>
                      <UploadCloud size={18} />
                      <span>{selectedFile ? selectedFile.name : 'Upload PDF or JPG (Max 5MB)'}</span>
                    </div>
                    <label className="secondary-btn" style={{ padding: '4px 12px', fontSize: '0.8rem', cursor: 'pointer' }}>
                      Browse
                      <input 
                        type="file" 
                        accept=".pdf,.jpg,.jpeg,.png"
                        style={{ display: 'none' }}
                        onChange={(e) => setSelectedFile(e.target.files[0])}
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input 
                  type="checkbox" 
                  id="primary_bank_check"
                  checked={formData.is_primary}
                  onChange={(e) => setFormData({ ...formData, is_primary: e.target.checked })}
                  style={{ width: '18px', height: '18px' }}
                />
                <label htmlFor="primary_bank_check" style={{ fontSize: '0.9rem', color: 'var(--slate-800)', cursor: 'pointer' }}>
                  Make this my default account for automated payouts
                </label>
              </div>

              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                <button type="button" className="secondary-btn" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="primary-btn">
                  Verify & Link Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
