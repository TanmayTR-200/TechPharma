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

const AuthContext = createContext<AuthContextType | null>(null);

import { API_ENDPOINTS, fetcher } from '@/lib/api-config';

async function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function makeRequest(url: string, options?: RequestInit) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (response.status === 404) {
    throw new Error('API endpoint not found');
  }

  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    const text = await response.text();
    console.error('Non-JSON response:', text);
    throw new Error('Server returned invalid response format');
  }

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Request failed');
  }

  return data;
}

async function checkServerHealth(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const response = await Promise.race([
      fetcher(API_ENDPOINTS.auth.health, {
        method: 'GET',
        signal: controller.signal
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Health check timed out')), 5000)
      )
    ]);

    return response.status === 'ok';
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

  const validateTokenAndGetUser = async (token: string) => {
    try {
      const response = await fetch('http://localhost:5000/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('token');
          throw new Error('Session expired');
        }
        throw new Error('Token validation failed');
      }

      const data = await response.json();
      if (!data.success || !data.user) {
        throw new Error('Invalid response format');
      }

      return data.user;
    } catch (error) {
      console.error('Token validation error:', error);
      if (error instanceof Error && error.message === 'Session expired') {
        window.location.href = '/auth?mode=login&message=session_expired';
      }
      return null;
    }
  };

  useEffect(() => {
    const loadUserFromToken = async () => {
      try {
        setIsLoading(true);
        const token = localStorage.getItem('token');
        
        if (!token) {
          setIsLoading(false);
          // Only redirect to login if on a protected page
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

        // Validate token and get user data in one request
        const userData = await validateTokenAndGetUser(token);

        if (!userData) {
          throw new Error('Token validation failed');
        }

        setUser(userData);
      } catch (error) {
        console.error('Error loading user:', error);
        // Only clear token if it's an auth error
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

    // Add event listener for storage changes
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

  const navigateDashboard = () => {
    if (window.location.pathname.includes('/auth/')) {
      router.replace('/dashboard');
    }
  };

  const login = async (email: string, password: string) => {
    const controller = new AbortController();

    try {
      const trimmedEmail = email.trim().toLowerCase();
      
      // Clear any existing tokens before login
      localStorage.removeItem('token');
      localStorage.removeItem('tokenData');

      // Set up request with timeout
      const response = await Promise.race([
        fetcher(API_ENDPOINTS.auth.login, {
          method: 'POST',
          body: JSON.stringify({
            email: trimmedEmail,
            password
          }),
          signal: controller.signal,
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timed out. Please try again.')), 10000)
        )
      ]);

      // Validate response data
      if (!response || !response.token || !response.user) {
        console.error('Invalid response data:', response);
        throw new Error('Server returned incomplete data. Please try again.');
      }

      // Race between fetch and timeout
      const response = await Promise.race([fetchPromise, timeoutPromise]) as Response;

      let data;
      try {
        data = await response.json();
      } catch (err) {
        console.error('Failed to parse response:', err);
        throw new Error('Invalid server response. Please try again.');
      }

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      // Validate response data
      if (!data.token || !data.user) {
        console.error('Invalid response data:', data);
        throw new Error('Server returned incomplete data. Please try again.');
      }

      const { token, user } = data;

      // Store token
      localStorage.setItem('token', token);
      setUser(user);
      
      // Navigate to dashboard
      router.push('/dashboard');
    } catch (error: any) {
      console.error('Login error:', error);
      let errorMessage = 'Login failed. Please try again.';
      
      if (error.name === 'AbortError') {
        errorMessage = 'Request timed out. Please try again.';
      } else if (error.message.includes('Failed to fetch')) {
        errorMessage = 'Unable to connect to the server. Please make sure the backend server is running.';
      } else if (error.message.includes('Invalid credentials')) {
        errorMessage = 'Invalid email or password.';
      } else if (error.message.includes('timed out')) {
        errorMessage = 'Request timed out. Please try again.';
      }
      
      throw new Error(errorMessage);
    } finally {
      clearTimeout(timeoutId);
      if (!controller.signal.aborted) {
        controller.abort(); // Clean up if not already aborted
      }
    }
  };

  const register = async (userData: Omit<User, '_id' | 'id' | 'role' | 'createdAt' | 'updatedAt'>) => {
    try {
      // Check server health first
      try {
        const isServerHealthy = await checkServerHealth();
        if (!isServerHealthy) {
          throw new Error('The server appears to be offline. Please ensure the backend server is running on port 5000 and try again. If the issue persists, contact support.');
        }
      } catch (error) {
        // If server health check throws an error, wrap it in a user-friendly message
        throw new Error('Unable to connect to the server. Please check if the server is running and try again.');
      }

      // Attempt registration
      const data = await makeRequest(ENDPOINTS.register, {
        method: 'POST',
        body: JSON.stringify(userData)
      });

      // Validate response data
      if (!data.token || !data.user) {
        throw new Error('Invalid server response: missing token or user data');
      }

      const { token, user } = data;

      // Store token with expiry
      const tokenData = {
        token,
        expiresAt: new Date().getTime() + (24 * 60 * 60 * 1000)
      };

      localStorage.setItem('token', token);
      localStorage.setItem('tokenData', JSON.stringify(tokenData));
      setUser(user);
      navigateDashboard();
    } catch (error: any) {
      console.error('Registration error:', error);
      throw new Error(error.message || 'Registration failed');
    }
  };



  const logout = () => {
    // Clear all auth-related data
    localStorage.removeItem('token');
    localStorage.removeItem('tokenData');
    setUser(null);
    
    // Redirect to login page
    router.replace('/auth');
  };

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
