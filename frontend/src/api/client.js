const BASE_URL = import.meta.env.API_URL || 'http://localhost:5001/api';

function getHeaders() {
  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  };

  const token = localStorage.getItem('token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const activeOrgId = localStorage.getItem('activeOrgId');
  if (activeOrgId) {
    headers['x-organization-id'] = activeOrgId;
  }

  return headers;
}

function handleResponse(res, endpoint = '') {
  const isPublic = endpoint.startsWith('/exchange-rates') || endpoint.startsWith('/auth');
  if (res.status === 401 && !isPublic) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('memberships');
    localStorage.removeItem('activeOrgId');
    if (window.location.pathname !== '/login') {
      window.location.reload();
    }
  }
}

export const apiClient = {
  async get(endpoint, params = {}) {
    const url = new URL(BASE_URL + endpoint, window.location.origin);
    Object.keys(params).forEach((key) => {
      if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
        url.searchParams.append(key, params[key]);
      }
    });

    const headers = getHeaders();
    delete headers['Content-Type']; // Not usually needed for GET

    const res = await fetch(url.toString(), {
      headers,
    });

    handleResponse(res, endpoint);

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error ${res.status}`);
    }
    return res.json();
  },

  async post(endpoint, data = {}) {
    const res = await fetch(BASE_URL + endpoint, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });

    handleResponse(res, endpoint);

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error ${res.status}`);
    }
    return res.json();
  },

  async patch(endpoint, data = {}) {
    const res = await fetch(BASE_URL + endpoint, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });

    handleResponse(res, endpoint);

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error ${res.status}`);
    }
    return res.json();
  },
  async put(endpoint, data = {}) {
    const res = await fetch(BASE_URL + endpoint, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    handleResponse(res, endpoint);
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error ${res.status}`);
    }
    return res.json();
  },

  async delete(endpoint) {
    const res = await fetch(BASE_URL + endpoint, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    handleResponse(res, endpoint);
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error ${res.status}`);
    }
    return res.json().catch(() => ({}));
  },
};
