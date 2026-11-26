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
   * Save customer-entered KYC document details without uploading a file
   */
  async submitDocument(documentType, documentNumber, details) {
    return apiClient.post('/kyc/documents', {
      document_type: documentType,
      document_number: documentNumber,
      details
    });
  },

  /**
   * Get time-limited signed download URL for private document
   */
  async getSignedUrl(documentId) {
    return apiClient.get(`/kyc/documents/${documentId}/signed-url`);
  }
};

export default kycService;
