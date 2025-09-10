"use client"

import { AuthProvider } from "@/contexts/auth-new"
import { ProductProvider } from "@/contexts/product-provider"
import { Toaster } from "@/components/ui/toaster"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ProductProvider>
        {children}
        <Toaster />
      </ProductProvider>
    </AuthProvider>
  )
}
