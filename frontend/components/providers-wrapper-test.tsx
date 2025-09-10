'use client';

import { type ReactNode } from 'react';
import { AuthProvider } from '@/contexts/auth-test';
import { ProductProvider } from '@/contexts/product-provider';
import { Toaster } from '@/components/ui/toaster';

interface ProvidersWrapperProps {
  children: ReactNode;
}

export function ProvidersWrapper({ children }: ProvidersWrapperProps) {
  return (
    <AuthProvider>
      <ProductProvider>
        {children}
        <Toaster />
      </ProductProvider>
    </AuthProvider>
  );
}
