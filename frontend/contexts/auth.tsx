import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { User } from '@/types/user';
import { API_ENDPOINTS, fetcher } from '@/lib/api-config';

interface LoginResponse {
  token: string;
  user: User;
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const login = async (email: string, password: string) => {
    try {
      const result = await fetcher(
        API_ENDPOINTS.auth.login,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
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
      console.error('Login error:', error);
      const message = error.message || 'Login failed';
      
      if (message.includes('Server is not responding') || message.includes('Cannot connect')) {
        throw new Error('The server is currently unavailable. Please check your connection and try again.');
      } else if (message.includes('401') || message.includes('403')) {
        throw new Error('Invalid email or password');
      } else if (message.includes('Network Error') || message.includes('Failed to fetch')) {
        throw new Error('Network error. Please check your internet connection.');
      }
      
      throw new Error(message);
    }
  };

  const register = async (userData: Omit<User, '_id' | 'id' | 'role' | 'createdAt' | 'updatedAt'>) => {
    try {
      const result = await fetcher(
        API_ENDPOINTS.auth.register,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(userData)
        }
      ) as LoginResponse;

      if (!result?.token || !result?.user) {
        throw new Error('Invalid server response');
      }

      localStorage.setItem('token', result.token);
      setUser(result.user);
      router.push('/dashboard');
    } catch (error: any) {
      console.error('Registration error:', error);
      const message = error.message || 'Registration failed';

      if (message.includes('Server is not responding') || message.includes('Cannot connect')) {
        throw new Error('The server is currently unavailable. Please check your connection and try again.');
      } else if (message.includes('Network Error') || message.includes('Failed to fetch')) {
        throw new Error('Network error. Please check your internet connection.');
      } else if (message.includes('exists')) {
        throw new Error('An account with this email already exists');
      }

      throw new Error(message);
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
          // Check if current route is protected
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
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        });

        if (response?.success === false) {
          throw new Error('Token validation failed');
        }

        if (response?.user) {
          const userData = response.user;
          if (!userData._id && !userData.id) {
            throw new Error('Invalid user data');
          }

          // Log successful auth validation
          console.log('Auth validation successful:', {
            userId: userData._id || userData.id,
            userRole: userData.role
          });

          setUser(userData);
        } else {
          throw new Error('Invalid response format');
        }
      } catch (error: any) {
        console.error('Token validation error:', error);
        // Clear auth data and redirect on error
        localStorage.removeItem('token');
        localStorage.removeItem('tokenData');
        setUser(null);
        
        // Only redirect to auth if on a protected route
        const isProtectedRoute = window.location.pathname.startsWith('/dashboard') || 
                               window.location.pathname.startsWith('/settings') ||
                               window.location.pathname.startsWith('/messages') ||
                               window.location.pathname.startsWith('/supplier') ||
                               window.location.pathname.startsWith('/orders');
        if (isProtectedRoute) {
          router.replace('/auth');
        }
      } finally {
        setIsLoading(false);
      }
    };

    validateToken();

    // Handle token removal in other tabs
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

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
