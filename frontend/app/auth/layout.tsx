'use client';

import { useAuth } from '@/contexts/auth-new';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      // Add a small delay to ensure context is fully updated
      const timer = setTimeout(() => {
        router.replace('/dashboard');
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [user, router]);

  return (
    <main className="min-h-screen bg-background">
      {children}
    </main>
  );
}
