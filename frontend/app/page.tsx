import { HeroSection } from '@/components/hero-section'
import { CategoryGrid } from '@/components/category-grid'
import { FeaturedProducts } from '@/components/featured-products'
import { ProductCarousel3D } from '@/components/product-carousel-3d'
import { FAQSection } from '@/components/faq-section'
import { Footer } from '@/components/footer'

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col pt-14 relative z-10">
      <main className="flex-1">
        <HeroSection />
        <CategoryGrid />
        <FeaturedProducts />
        <ProductCarousel3D />
        <FAQSection />
      </main>
      <Footer />
    </div>
  )
}
