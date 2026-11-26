/**
 * Wallet, Ledger & Settlement Service (/api/v1/wallets)
 */
import apiClient from './apiClient';

export const walletService = {
  /**
   * Get wallet balance summary (Available + Held balances)
   */
  async getWalletSummary() {
    return apiClient.get('/wallets/me');
  },

  /**
   * Set a personal wallet cap within the active KYC tier maximum.
   */
  async updateWalletLimit(maxBalance) {
    return apiClient.patch('/wallets/me/limit', {
      max_balance: String(maxBalance)
    });
  },

  /**
   * Get paginated transaction history
   */
  async getTransactions(limit = 20, offset = 0) {
    return apiClient.get(`/wallets/me/transactions?limit=${limit}&offset=${offset}`);
  },

  /**
   * Perform atomic P2P wallet transfer
   */
  async transfer(recipientIdentifier, amount, description = '', idempotencyKey = null) {
    const key = idempotencyKey || `tx-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    return apiClient.post('/wallets/transfer', {
      recipient_identifier: recipientIdentifier,
      amount: String(amount),
      description,
      idempotency_key: key
    });
  },

  /**
   * Top-up wallet via payment gateway simulation
   */
  async topup(amount, providerName = 'UPI', providerReference = null, idempotencyKey = null) {
    const key = idempotencyKey || `topup-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const response = await apiClient.post('/wallets/topup', {
      amount: String(amount),
      provider_name: providerName,
      provider_reference: providerReference || `UTR-${Date.now().toString().slice(-6)}`,
      idempotency_key: key
    });
    return { ...response, idempotency_key: key };
  },

  /**
   * Request cash-out to linked bank account
   */
  async cashout(amount, beneficiaryRef, idempotencyKey = null) {
    const key = idempotencyKey || `cashout-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    return apiClient.post('/wallets/cashout', {
      amount: String(amount),
      beneficiary_reference: beneficiaryRef,
      idempotency_key: key
    });
  },

  /**
   * List active escrow holds
   */
  async getHolds() {
    return apiClient.get('/wallets/holds');
  },

  /**
   * Release an active wallet hold.
   */
  async releaseHold(holdId) {
    return apiClient.post(`/wallets/holds/${holdId}/release`, {});
  }
};

export default walletService;
