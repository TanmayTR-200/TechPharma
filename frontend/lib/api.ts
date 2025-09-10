import axios from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

import { User } from '@/types/user';

interface AuthResponse {
  token: string;
  user: User;
}

interface OtpResponse {
  success: boolean;
  message: string;
}

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

  register: async (userData: Omit<User, '_id' | 'id' | 'role' | 'createdAt' | 'updatedAt'>): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/register', userData);
    return response.data;
  },

  verifyOtp: async (email: string, otp: string) => {
    const response = await api.post('/auth/otp', {
      email,
      otp,
      action: 'verify'
    });
    return response.data;
  },

  resendOtp: async (email: string) => {
    const response = await api.post('/auth/otp', {
      email,
      action: 'send'
    });
    return response.data;
  },

  forgotPassword: async (email: string) => {
    const response = await api.post('/auth/forgot-password', { email });
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
