const BASE_URL = '/api';

export const apiClient = {
  getHeaders() {
    const token = localStorage.getItem('token');
    return {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
  },

  async get(endpoint, params = {}) {
    const url = new URL(BASE_URL + endpoint, window.location.origin);
    Object.keys(params).forEach((key) => {
      if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
        url.searchParams.append(key, params[key]);
      }
    });

    const res = await fetch(url.toString(), {
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error ${res.status}`);
    }
    return res.json();
  },

  async post(endpoint, data = {}) {
    const res = await fetch(BASE_URL + endpoint, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error ${res.status}`);
    }
    return res.json();
  },

  async patch(endpoint, data = {}) {
    const res = await fetch(BASE_URL + endpoint, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error ${res.status}`);
    }
    return res.json();
  },
};
