'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { User } from '@/types/user';
import { API_ENDPOINTS, fetcher } from '@/lib/api-config';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: Omit<User, '_id' | 'id' | 'role' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  logout: () => void;
}

interface LoginResponse {
  token: string;
  user: User;
}

const AuthContext = createContext<AuthContextType | null>(null);

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const login = async (email: string, password: string) => {
    try {
      // Try to fetch with automatic retries
      const result = await fetcher(
        API_ENDPOINTS.auth.login,
        {
          method: 'POST',
          body: JSON.stringify({ email, password })
        }
      ) as LoginResponse;

      if (!result?.token || !result?.user) {
        throw new Error('Invalid response from server');
      }

      localStorage.setItem('token', result.token);
      setUser(result.user);
      router.push('/dashboard');
    } catch (error: any) {
      // Log detailed error information
      const errorInfo = {
        timestamp: new Date().toISOString(),
        source: 'auth-context-login',
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          type: error.constructor.name
        } : 'Unknown error type',
        context: {
          endpoint: API_ENDPOINTS.auth.login,
          email: email // never log passwords
        }
      };
      console.error('Login attempt failed:', JSON.stringify(errorInfo, null, 2));

      if (error?.name === 'TypeError' && error?.message === 'Failed to fetch') {
        throw new Error('Server is not responding. Please try again in a moment.');
      }
      
      if (error instanceof Error) {
        const msg = error.message.toLowerCase();
        if (msg.includes('network') || msg.includes('fetch')) {
          throw new Error('Could not connect to server. Please try again.');
        }
        if (msg.includes('invalid')) {
          throw new Error('Invalid email or password.');
        }
      }
      
      // For any other errors, throw a generic message
      throw new Error('Login failed. Please try again.');
    }
  };

  const register = async (userData: Omit<User, '_id' | 'id' | 'role' | 'createdAt' | 'updatedAt'>) => {
    try {
      const result = await fetcher(API_ENDPOINTS.auth.register, {
        method: 'POST',
        body: JSON.stringify(userData)
      }) as LoginResponse;

      if (!result?.token || !result?.user) {
        throw new Error('Invalid server response');
      }

      localStorage.setItem('token', result.token);
      setUser(result.user);
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
    const validateToken = async () => {
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

        const response = await fetcher(API_ENDPOINTS.auth.me, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response?.success === false) {
          throw new Error('Token validation failed');
        }

        if (response?.user) {
          // Ensure user has an ID
          const userData = response.user;
          if (!userData._id && !userData.id) {
            throw new Error('Invalid user data');
          }

          // Log the auth response
          console.log('Auth validation successful:', {
            user: userData,
            userId: userData._id || userData.id
          });

          setUser(userData);
        } else {
          throw new Error('Invalid response format');
        }
      } catch (error) {
        console.error('Error validating token:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('tokenData');
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    validateToken();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'token' && !e.newValue) {
        setUser(null);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, setUser, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export { AuthProvider, useAuth };
