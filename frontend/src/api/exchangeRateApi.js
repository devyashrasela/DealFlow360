import { apiClient } from './client.js';

export const exchangeRateApi = {
  getCachedRates: () => apiClient.get('/exchange-rates'),
  refreshRates: () => apiClient.post('/exchange-rates/refresh'),
  convertAmount: (amount, from, to) => apiClient.get('/exchange-rates/convert', { amount, from, to }),
  getRateHistory: (currency, startDate, endDate) => apiClient.get('/exchange-rates/history', { currency, startDate, endDate }),
};
