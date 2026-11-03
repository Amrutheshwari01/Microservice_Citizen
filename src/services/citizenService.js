/**
 * Citizen Profile, Consents & Sessions Service (/api/v1/citizens, /consents, /sessions)
 */
import apiClient from './apiClient';

export const citizenService = {
  /**
   * Get authenticated citizen full profile (including KYC tier, personas, wallet summary)
   */
  async getMyProfile() {
    return apiClient.get('/citizens/me');
  },

  /**
   * Partially update citizen profile details
   */
  async updateProfile(updates) {
    return apiClient.patch('/citizens/me', updates);
  },

  /**
   * Upload profile avatar image
   */
  async uploadAvatar(file) {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post('/citizens/me/avatar', formData);
  },

  /**
   * Get chronological profile change audit history
   */
  async getProfileHistory() {
    return apiClient.get('/citizens/me/history');
  },

  // ── Consents ───────────────────────────────────────────────────────────────

  /**
   * List citizen's data governance consent records
   */
  async getConsents() {
    return apiClient.get('/consents');
  },

  /**
   * Grant or withdraw a consent record
   */
  async updateConsent(consentId, granted) {
    return apiClient.patch(`/consents/${consentId}`, { granted });
  },

  // ── Sessions & Devices ─────────────────────────────────────────────────────

  /**
   * List active non-revoked sessions
   */
  async getActiveSessions() {
    return apiClient.get('/sessions');
  },

  /**
   * Revoke a specific session
   */
  async revokeSession(sessionId) {
    return apiClient.delete(`/sessions/${sessionId}`);
  },

  /**
   * Revoke all other active sessions except current
   */
  async revokeOtherSessions() {
    return apiClient.post('/sessions/revoke-others', {});
  }
};

export default citizenService;
