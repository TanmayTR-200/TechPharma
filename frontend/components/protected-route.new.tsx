'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const validateSession = async () => {
      if (isLoading) return;

      if (!user) {
        const queryParams = new URLSearchParams();
        queryParams.set('mode', 'login');
        queryParams.set('from', window.location.pathname);
        router.push(`/auth?${queryParams.toString()}`);
        return;
      }

      const token = localStorage.getItem('token');
      const tokenData = localStorage.getItem('tokenData');
      
      if (!token || !tokenData) {
        localStorage.removeItem('token');
        localStorage.removeItem('tokenData');
        router.push('/auth?mode=login');
        return;
      }

      try {
        // Check token expiration
        const { expiresAt } = JSON.parse(tokenData);
        if (new Date().getTime() > expiresAt) {
          localStorage.removeItem('token');
          localStorage.removeItem('tokenData');
          router.push('/auth?mode=login&message=session_expired');
          return;
        }

        // Validate token with server
        const response = await fetch('http://localhost:5000/api/auth/me', {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });

        const data = await response.json();

        if (!response.ok || !data.user) {
          throw new Error('Invalid session');
        }
      } catch (error) {
        console.error('Session validation error:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('tokenData');
        router.push('/auth?mode=login&message=invalid_session');
      }
    };

    validateSession();
  }, [user, isLoading, router]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Show nothing while redirecting
  if (!user) {
    return null;
  }

  // Show the protected content if authenticated
  return <>{children}</>;
}
