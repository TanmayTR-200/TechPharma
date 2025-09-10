"use client";

import {HeroSection} from "@/components/hero-section"
import { CategoryGrid } from "@/components/category-grid"
import { FeaturedProducts } from "@/components/featured-products"
import { TrustedSuppliers } from "@/components/trusted-suppliers"
import { Footer } from "@/components/footer"
import { ProductProvider } from "@/contexts/product-provider"
import { Toaster } from "@/components/ui/toaster"

export default function HomePage() {
  return (
    <ProductProvider>
      <div className="min-h-screen">
        <HeroSection />
        <CategoryGrid />
        <FeaturedProducts />
        <TrustedSuppliers />
        <Footer />
        <Toaster />
      </div>
    </ProductProvider>
  )
}
