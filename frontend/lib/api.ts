import axios from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

import { User } from '@/types/user';

import { AuthResponse, OtpResponse } from '@/types/auth';

export const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to include the token in all requests
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Authentication APIs
export const authApi = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/login', { email, password });
    return response.data;
  },

  register: async (userData: {
    name: string;
    email: string;
    password: string;
    companyName?: string;
  }): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/register', userData);
    return response.data;
  },

  verifyOtp: async (otp: string, token: string): Promise<OtpResponse> => {
    const response = await api.post('/auth/verify-otp', 
      { otp },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  },

  resendOtp: async (token: string): Promise<OtpResponse> => {
    const response = await api.post('/auth/resend-otp', 
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  },

  forgotPassword: async (email: string) => {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  },

  resetPassword: async (token: string, password: string) => {
    const response = await api.post('/auth/reset-password', { token, password });
    return response.data;
  },
};

// Product APIs
export const productApi = {
  getProducts: async (params?: any) => {
    const response = await api.get('/products', { params });
    return response.data;
  },

  getFeaturedProducts: async () => {
    const response = await api.get('/products/featured');
    return response.data;
  },

  getProduct: async (slug: string) => {
    const response = await api.get(`/products/${slug}`);
    return response.data;
  },
};

// Order APIs
export const orderApi = {
  createOrder: async (orderData: any) => {
    const response = await api.post('/orders', orderData);
    return response.data;
  },

  verifyPayment: async (paymentData: any) => {
    const response = await api.post('/orders/verify-payment', paymentData);
    return response.data;
  },

  getOrders: async () => {
    const response = await api.get('/orders');
    return response.data;
  },
};
