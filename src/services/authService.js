/**
 * Authentication Service (FastAPI /api/v1/auth/*)
 * Supports Password, Mobile OTP, and Biometric Face Recognition Login & Enrollment.
 */
import apiClient from './apiClient';

export const authService = {
  /**
   * Register a new citizen (supports optional face_image for automatic biometric enrollment)
   */
  async register(registrationData) {
    const res = await apiClient.post('/auth/register', {
      full_name: registrationData.full_name,
      email: registrationData.email || null,
      mobile: registrationData.mobile ? (registrationData.mobile.startsWith('+') ? registrationData.mobile : `+91${registrationData.mobile}`) : null,
      password: registrationData.password,
      confirm_password: registrationData.confirm_password || registrationData.password,
      preferred_language: registrationData.language || 'en',
      nationality_code: registrationData.nationality_code || 'IN',
      face_image: registrationData.face_image || null
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
   * Biometric Face Recognition Login (matches captured webcam face against enrolled embeddings)
   */
  async loginWithFace(faceImageBase64, identifier = null) {
    const res = await apiClient.post('/auth/login-face', {
      face_image: faceImageBase64,
      identifier: identifier || null,
      device_label: 'Web Browser (Biometric Face Unlock)'
    });
    if (res?.access_token) {
      apiClient.setToken(res.access_token);
      apiClient.setRefreshToken(res.refresh_token);
    }
    return res;
  },

  /**
   * Enroll or update face biometrics for the authenticated citizen
   */
  async enrollFace(faceImageBase64) {
    return apiClient.post('/auth/enroll-face', {
      face_image: faceImageBase64
    });
  },

  /**
   * Check face recognition enrollment status
   */
  async getFaceStatus() {
    return apiClient.get('/auth/face-status');
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
