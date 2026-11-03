/**
 * Persona Management Service (/api/v1/personas)
 */
import apiClient from './apiClient';

export const personaService = {
  /**
   * List all registered personas for the authenticated citizen
   */
  async getPersonas() {
    return apiClient.get('/personas');
  },

  /**
   * Apply for a new persona (FARMER, AGGREGATOR, DELIVERY_PARTNER)
   */
  async applyPersona(personaType, displayName = null, notes = null, extraFields = {}) {
    return apiClient.post('/personas', {
      persona_type: personaType,
      display_name: displayName,
      notes,
      ...extraFields
    });
  },

  /**
   * Activate / set default persona
   */
  async activatePersona(personaId) {
    return apiClient.post(`/personas/${personaId}/activate`, {});
  }
};

export default personaService;
