'use client';

import { ReactNode } from 'react';
import { AuthProvider } from '@/contexts/auth-new';
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
