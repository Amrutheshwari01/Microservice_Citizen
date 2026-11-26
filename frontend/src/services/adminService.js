/**
 * Admin & Operations Console Service (/api/v1/admin)
 */
import apiClient from './apiClient';

const ADMIN_TOKEN_KEY = 'agrilink_admin_token';
const ADMIN_USER_KEY = 'agrilink_admin_user';

function getAdminHeaders(serviceKey = null) {
  if (serviceKey) {
    return { 'X-Service-Key': serviceKey };
  }
  const adminToken = localStorage.getItem(ADMIN_TOKEN_KEY);
  if (adminToken) {
    return { Authorization: `Bearer ${adminToken}` };
  }
  return {};
}

export const adminService = {
  getAdminToken() {
    return localStorage.getItem(ADMIN_TOKEN_KEY);
  },

  getAdminUser() {
    const raw = localStorage.getItem(ADMIN_USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  async login(identifier, password) {
    const response = await apiClient.post('/admin/login', {
      identifier,
      password
    });
    if (response?.access_token) {
      localStorage.setItem(ADMIN_TOKEN_KEY, response.access_token);
      localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(response.admin || { username: identifier }));
    }
    return response;
  },

  logout() {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    localStorage.removeItem(ADMIN_USER_KEY);
  },

  /**
   * List pending persona applications
   */
  async getPendingPersonaApplications(serviceKey = null) {
    return apiClient.get('/admin/persona-applications', getAdminHeaders(serviceKey));
  },

  /**
   * Decide on a persona application (APPROVED or REJECTED)
   */
  async decidePersonaApplication(personaId, decision, reasonCode, serviceKey = null) {
    return apiClient.post(
      `/admin/persona-applications/${personaId}/decide`,
      { decision, reason_code: reasonCode },
      getAdminHeaders(serviceKey)
    );
  },

  /**
   * Review and verify/reject a KYC record
   */
  async reviewKycRecord(recordId, decision, kycTier, reasonCode, serviceKey = null) {
    return apiClient.post(
      `/admin/kyc/${recordId}/review`,
      { decision, kyc_tier: kycTier, reason_code: reasonCode },
      getAdminHeaders(serviceKey)
    );
  },

  /**
   * Query append-only audit logs
   */
  async getAuditLogs(params = {}, serviceKey = null) {
    const query = new URLSearchParams(params).toString();
    return apiClient.get(`/admin/audit?${query}`, getAdminHeaders(serviceKey));
  },

  /**
   * Query wallet limits matrix
   */
  async getWalletLimits(kycTier = null, serviceKey = null) {
    const query = kycTier ? `?kyc_tier=${kycTier}` : '';
    return apiClient.get(`/admin/limits${query}`, getAdminHeaders(serviceKey));
  }
};

export default adminService;
