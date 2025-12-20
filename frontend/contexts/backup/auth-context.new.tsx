'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { User } from '@/types/user';
import { API_ENDPOINTS, fetcher } from '@/lib/api-config';

// Types for API responses
interface LoginResponse {
  token: string;
  user: User;
}

interface AuthResponse {
  success: boolean;
  message?: string;
  user?: User;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: Omit<User, '_id' | 'id' | 'role' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

async function checkServerHealth(): Promise<boolean> {
  const controller = new AbortController();
  
  try {
    const response = await Promise.race([
      fetcher(API_ENDPOINTS.auth.health, {
        method: 'GET',
        signal: controller.signal
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Health check timed out')), 5000)
      )
    ]);

    return response?.status === 'ok';
  } catch (error) {
    console.error('Health check failed:', error);
    return false;
  } finally {
    controller.abort(); // Clean up
  }
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const login = async (email: string, password: string) => {
    const controller = new AbortController();

    try {
      const trimmedEmail = email.trim().toLowerCase();
      
      // Clear any existing tokens
      localStorage.removeItem('token');
      localStorage.removeItem('tokenData');

      // Check server health
      const isHealthy = await checkServerHealth();
      if (!isHealthy) {
        throw new Error('Server is not responding. Please try again later.');
      }

      // Make login request with timeout
      const loginResponse = await Promise.race([
        fetcher(API_ENDPOINTS.auth.login, {
          method: 'POST',
          body: JSON.stringify({
            email: trimmedEmail,
            password
          }),
          signal: controller.signal,
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timed out')), 10000)
        )
      ]) as LoginResponse;

      if (!loginResponse?.token || !loginResponse?.user) {
        throw new Error('Invalid response from server');
      }

      const { token, user } = loginResponse;

      // Store token and user
      localStorage.setItem('token', token);
      setUser(user);
      
      // Navigate to dashboard
      router.push('/dashboard');
    } catch (error: any) {
      console.error('Login error:', error);
      let errorMessage = 'Login failed. Please try again.';
      
      if (error.name === 'AbortError' || error.message.includes('timed out')) {
        errorMessage = 'Request timed out. Please try again.';
      } else if (error.message.includes('Failed to fetch')) {
        errorMessage = 'Unable to connect to the server. Please check your connection.';
      } else if (error.message.includes('Invalid credentials')) {
        errorMessage = 'Invalid email or password.';
      }
      
      throw new Error(errorMessage);
    } finally {
      controller.abort(); // Clean up
    }
  };

  const validateTokenAndGetUser = async (token: string): Promise<User | null> => {
    try {
      const response = await fetcher(API_ENDPOINTS.auth.me, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response?.user) {
        throw new Error('Invalid response format');
      }

      return response.user;
    } catch (error) {
      console.error('Token validation error:', error);
      if (error instanceof Error && error.message === 'Session expired') {
        window.location.href = '/auth?mode=login&message=session_expired';
      }
      return null;
    }
  };

  const register = async (userData: Omit<User, '_id' | 'id' | 'role' | 'createdAt' | 'updatedAt'>) => {
    try {
      const isHealthy = await checkServerHealth();
      if (!isHealthy) {
        throw new Error('Unable to connect to the server. Please try again later.');
      }

      const response = await fetcher(API_ENDPOINTS.auth.register, {
        method: 'POST',
        body: JSON.stringify(userData)
      }) as LoginResponse;

      if (!response?.token || !response?.user) {
        throw new Error('Invalid server response');
      }

      const { token, user } = response;

      localStorage.setItem('token', token);
      setUser(user);
      router.push('/dashboard');
    } catch (error: any) {
      console.error('Registration error:', error);
      throw new Error(error.message || 'Registration failed');
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('tokenData');
    setUser(null);
    router.replace('/auth');
  };

  useEffect(() => {
    const loadUserFromToken = async () => {
      try {
        setIsLoading(true);
        const token = localStorage.getItem('token');
        
        if (!token) {
          setIsLoading(false);
          const isProtectedRoute = window.location.pathname.startsWith('/dashboard') || 
                                 window.location.pathname.startsWith('/settings') ||
                                 window.location.pathname.startsWith('/messages') ||
                                 window.location.pathname.startsWith('/supplier') ||
                                 window.location.pathname.startsWith('/orders');
          if (isProtectedRoute) {
            router.replace('/auth');
          }
          return;
        }

        const userData = await validateTokenAndGetUser(token);
        if (!userData) {
          throw new Error('Invalid token');
        }

        setUser(userData);
      } catch (error) {
        console.error('Error loading user:', error);
        if (error instanceof Error && 
            (error.message.includes('token') || 
             error.message.includes('auth') || 
             error.message.includes('unauthorized'))) {
          localStorage.removeItem('token');
          localStorage.removeItem('tokenData');
        }
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadUserFromToken();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'token') {
        if (!e.newValue) {
          setUser(null);
        } else {
          loadUserFromToken();
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
