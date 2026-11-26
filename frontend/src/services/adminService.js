/**
 * Admin & Operations Console Service (/api/v1/admin)
 */
import apiClient from './apiClient';

export const adminService = {
  /**
   * List pending persona applications
   */
  async getPendingPersonaApplications(serviceKey) {
    return apiClient.get('/admin/persona-applications', {
      'X-Service-Key': serviceKey
    });
  },

  /**
   * Decide on a persona application (APPROVED or REJECTED)
   */
  async decidePersonaApplication(personaId, decision, reasonCode, serviceKey) {
    return apiClient.post(
      `/admin/persona-applications/${personaId}/decide`,
      { decision, reason_code: reasonCode },
      { 'X-Service-Key': serviceKey }
    );
  },

  /**
   * Review and verify/reject a KYC record
   */
  async reviewKycRecord(recordId, decision, kycTier, reasonCode, serviceKey) {
    return apiClient.post(
      `/admin/kyc/${recordId}/review`,
      { decision, kyc_tier: kycTier, reason_code: reasonCode },
      { 'X-Service-Key': serviceKey }
    );
  },

  /**
   * Query append-only audit logs
   */
  async getAuditLogs(params = {}, serviceKey) {
    const query = new URLSearchParams(params).toString();
    return apiClient.get(`/admin/audit?${query}`, {
      'X-Service-Key': serviceKey
    });
  },

  /**
   * Query wallet limits matrix
   */
  async getWalletLimits(kycTier = null, serviceKey) {
    const query = kycTier ? `?kyc_tier=${kycTier}` : '';
    return apiClient.get(`/admin/limits${query}`, {
      'X-Service-Key': serviceKey
    });
  }
};

export default adminService;
