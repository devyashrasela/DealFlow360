import { apiClient } from './client.js';

export const dealHealthApi = {
  scan: () => apiClient.post('/deal-health/scan'),
  getAlerts: () => apiClient.get('/deal-health/alerts'),
  sendNudge: (alert_id) => apiClient.post('/deal-health/send-nudge', { alert_id }),
  escalate: (alert_id) => apiClient.post('/deal-health/escalate-to-finance', { alert_id }),
};
