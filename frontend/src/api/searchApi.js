import { apiClient } from './client.js';

export const searchApi = {
  globalSearch: (query) => apiClient.get('/search', { q: query }),
};

export default searchApi;
