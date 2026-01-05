export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

// Ensure we're using consistent ports across the application
if (!process.env.NEXT_PUBLIC_API_URL && typeof window !== 'undefined' && window.location.hostname === 'localhost') {
  console.log('Using default API URL:', API_BASE_URL);
}

// Remove '/api' if it's already in the base URL
const BASE_URL = API_BASE_URL.endsWith('/api') ? API_BASE_URL : `${API_BASE_URL}/api`;

export const API_ENDPOINTS = {
  auth: {
    login: `${BASE_URL}/auth/login`,
    register: `${BASE_URL}/auth/register`,
    verifyEmail: `${BASE_URL}/auth/verify-email`,
    forgotPassword: `${BASE_URL}/auth/forgot-password`,
    resetPassword: `${BASE_URL}/auth/reset-password`,
    me: `${BASE_URL}/auth/me`,
  },
  products: {
    base: `${BASE_URL}/products`,
    list: `${BASE_URL}/products`,
    create: `${BASE_URL}/products`,
    update: (id: string) => `${BASE_URL}/products/${id}`,
    delete: (id: string) => `${BASE_URL}/products/${id}`,
  },
  cart: {
    list: `${API_BASE_URL}/cart`,
    add: `${API_BASE_URL}/cart/add`,
    remove: (id: string) => `${API_BASE_URL}/cart/${id}`,
    update: (id: string) => `${API_BASE_URL}/cart/${id}`,
    clear: `${API_BASE_URL}/cart/clear`,
  },
  orders: {
    base: `${API_BASE_URL}/orders`,
    list: `${API_BASE_URL}/orders`,
    create: `${API_BASE_URL}/orders`,
    update: (id: string) => `${API_BASE_URL}/orders/${id}`,
  },
};