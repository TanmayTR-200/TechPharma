'use client';

import { useEffect } from 'react';
import { useAuth } from '@/contexts/auth';
import { SkeletonLoader } from "@/components/skeleton-loader";
import { useRouter } from 'next/navigation';

export default function withAuth<P extends object>(
  WrappedComponent: React.ComponentType<P>
) {
  return function WithAuthComponent(props: P) {
    const { user, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (!isLoading && !user) {
        router.replace('/auth');
      }
    }, [user, isLoading, router]);

    if (isLoading) {
      return <div className="pt-14 min-h-screen"><div className="max-w-7xl mx-auto px-6 py-8"><SkeletonLoader type="dashboard" /></div></div>;
    }

    if (!user) {
      return null;
    }

    return <WrappedComponent {...props} />;
  };
}
