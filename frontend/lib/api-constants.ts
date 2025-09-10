export const API_BASE_URL = 'http://localhost:5000/api';

export const ENDPOINTS = {
  products: `${API_BASE_URL}/products`,
  dashboard: `${API_BASE_URL}/dashboard`,
  auth: {
    login: `${API_BASE_URL}/auth/login`,
    register: `${API_BASE_URL}/auth/register`,
    me: `${API_BASE_URL}/auth/me`
  }
};
