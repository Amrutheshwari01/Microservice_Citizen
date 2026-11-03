/**
 * KYC & Document Verification Service (/api/v1/kyc)
 */
import apiClient from './apiClient';

export const kycService = {
  /**
   * Get current KYC tier and status
   */
  async getKycStatus() {
    return apiClient.get('/kyc/me');
  },

  /**
   * Upload private KYC document
   */
  async uploadDocument(documentType, file, documentNumber = null) {
    const formData = new FormData();
    formData.append('document_type', documentType);
    formData.append('file', file);
    if (documentNumber) {
      formData.append('document_number', documentNumber);
    }
    return apiClient.post('/kyc/documents', formData);
  },

  /**
   * Get time-limited signed download URL for private document
   */
  async getSignedUrl(documentId) {
    return apiClient.get(`/kyc/documents/${documentId}/signed-url`);
  }
};

export default kycService;
