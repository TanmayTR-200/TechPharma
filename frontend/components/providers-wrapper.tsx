'use client';

import { ReactNode } from 'react';
import AuthProvider from '@/contexts/auth';
import ProductProvider from '@/contexts/product-context';
import { CartProvider } from '@/contexts/cart';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/toaster';
import { CloudinaryScriptProvider } from '@/components/cloudinary-script-provider';

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
      <CloudinaryScriptProvider>
        <AuthProvider>
          <ProductProvider>
            <CartProvider>
              {children}
              <Toaster />
            </CartProvider>
          </ProductProvider>
        </AuthProvider>
      </CloudinaryScriptProvider>
    </ThemeProvider>
  );
}
