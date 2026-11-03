/**
 * AgriLink Citizen Identity & Wallet Service — Centralized API Client
 * 
 * Handles base URL configuration, JWT Bearer token injection, request correlation,
 * multipart file uploads, and standardized error normalization.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

class ApiClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  getToken() {
    return localStorage.getItem('agrilink_access_token');
  }

  setToken(token) {
    if (token) {
      localStorage.setItem('agrilink_access_token', token);
    } else {
      localStorage.removeItem('agrilink_access_token');
    }
  }

  getRefreshToken() {
    return localStorage.getItem('agrilink_refresh_token');
  }

  setRefreshToken(token) {
    if (token) {
      localStorage.setItem('agrilink_refresh_token', token);
    } else {
      localStorage.removeItem('agrilink_refresh_token');
    }
  }

  clearTokens() {
    localStorage.removeItem('agrilink_access_token');
    localStorage.removeItem('agrilink_refresh_token');
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const token = this.getToken();

    const headers = {
      ...(options.headers || {})
    };

    // Attach JWT Bearer token if available and not explicitly skipped
    if (token && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Do NOT set Content-Type for FormData (browser automatically sets boundary)
    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      // 204 No Content
      if (response.status === 204) {
        return null;
      }

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const error = new Error(data?.message || `Request failed with status ${response.status}`);
        error.status = response.status;
        error.code = data?.code || 'API_ERROR';
        error.details = data?.details;
        throw error;
      }

      return data;
    } catch (err) {
      // Re-throw normalized error
      throw err;
    }
  }

  get(endpoint, headers = {}) {
    return this.request(endpoint, { method: 'GET', headers });
  }

  post(endpoint, body, headers = {}) {
    const isFormData = body instanceof FormData;
    return this.request(endpoint, {
      method: 'POST',
      headers,
      body: isFormData ? body : JSON.stringify(body)
    });
  }

  patch(endpoint, body, headers = {}) {
    return this.request(endpoint, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(body)
    });
  }

  delete(endpoint, headers = {}) {
    return this.request(endpoint, { method: 'DELETE', headers });
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
export default apiClient;
