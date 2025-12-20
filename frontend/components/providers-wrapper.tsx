'use client';

import { ReactNode } from 'react';
import AuthProvider from '@/contexts/auth';
import ProductProvider from '@/contexts/product-context';
import { CartProvider } from '@/contexts/cart';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/toaster';

interface ProvidersWrapperProps {
  children: ReactNode;
}

export function ProvidersWrapper({ children }: ProvidersWrapperProps) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
      forcedTheme="dark"
      storageKey="techpharma-theme"
    >
      <AuthProvider>
        <ProductProvider>
          <CartProvider>
            {children}
            <Toaster />
          </CartProvider>
        </ProductProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
