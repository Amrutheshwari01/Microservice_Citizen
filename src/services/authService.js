/**
 * Authentication Service (FastAPI /api/v1/auth/*)
 */
import apiClient from './apiClient';

export const authService = {
  /**
   * Register a new citizen
   */
  async register(registrationData) {
    const res = await apiClient.post('/auth/register', {
      full_name: registrationData.full_name,
      email: registrationData.email,
      mobile: registrationData.mobile,
      password: registrationData.password,
      confirm_password: registrationData.confirm_password || registrationData.password,
      preferred_language: registrationData.language || 'en',
      nationality_code: registrationData.nationality_code || 'IN'
    });
    return res;
  },

  /**
   * Login using Email, Mobile, or Citizen UUID + Password
   */
  async login(identifier, password) {
    const res = await apiClient.post('/auth/login', {
      identifier,
      password
    });
    if (res?.access_token) {
      apiClient.setToken(res.access_token);
      apiClient.setRefreshToken(res.refresh_token);
    }
    return res;
  },

  /**
   * Request OTP challenge
   */
  async requestOtp(channel, destination, purpose = 'LOGIN') {
    return apiClient.post('/auth/otp/request', {
      channel, // 'EMAIL' or 'SMS'
      destination,
      purpose
    });
  },

  /**
   * Verify OTP challenge
   */
  async verifyOtp(challengeId, otp) {
    const res = await apiClient.post('/auth/otp/verify', {
      challenge_id: challengeId,
      otp
    });
    if (res?.access_token) {
      apiClient.setToken(res.access_token);
      apiClient.setRefreshToken(res.refresh_token);
    }
    return res;
  },

  /**
   * Logout and revoke active JWT token (adds JTI to deny-list)
   */
  async logout() {
    try {
      await apiClient.post('/auth/logout', {});
    } finally {
      apiClient.clearTokens();
    }
  },

  /**
   * Check if a token currently exists in storage
   */
  isAuthenticated() {
    return !!apiClient.getToken();
  }
};

export default authService;
