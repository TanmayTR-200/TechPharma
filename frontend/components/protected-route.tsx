"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SkeletonLoader } from "@/components/skeleton-loader"
import { useAuth } from '@/contexts/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/auth?mode=login&message=auth_required');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="pt-14 min-h-screen">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <SkeletonLoader type="dashboard" />
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
