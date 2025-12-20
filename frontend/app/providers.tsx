"use client"

import { AuthProvider } from "@/contexts/auth"
import ProductProvider from "@/contexts/product-context"
import { CartProvider } from "@/contexts/cart"
import { Toaster } from "@/components/ui/toaster"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ProductProvider>
        <CartProvider>
          {children}
          <Toaster />
        </CartProvider>
      </ProductProvider>
    </AuthProvider>
  )
}
