"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MapPin, ArrowRight, Package } from "lucide-react"
import { useProduct } from "@/contexts/product-provider"
import { useAuth } from "@/contexts/auth"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Reveal } from "@/components/reveal"

interface Product {
  _id: string; name: string; price: number; images: string[]
  salesCount: number; supplierName: string; supplierLocation: string
  category: string; stock: number
}

function ProductSkeleton() {
  return (
    <div className="glass-card overflow-hidden animate-fade-up">
      <div className="aspect-[4/3] shimmer" />
      <div className="p-5 space-y-3">
        <div className="shimmer h-4 w-2/3" />
        <div className="shimmer h-3 w-1/2" />
        <div className="flex justify-between items-center">
          <div className="shimmer h-6 w-20" />
          <div className="shimmer h-8 w-16 rounded-md" />
        </div>
      </div>
    </div>
  )
}

export function FeaturedProducts() {
  const { getQuote, viewAllProducts } = useProduct()
  const { user } = useAuth()
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/products/featured')
        const data = await res.json()
        if (data.success && data.products) setProducts(data.products)
      } catch (e) { console.error(e) }
      finally { setLoading(false) }
    }
    fetchProducts()
    const interval = setInterval(fetchProducts, 30000)
    return () => clearInterval(interval)
  }, [])

  const fmt = (p) => '\u20B9' + p.toLocaleString('en-IN')

  return (
    <section className="py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold gradient-text">Featured products</h2>
          <button onClick={viewAllProducts} className="flex items-center gap-1 text-[13px] text-muted-foreground hover:text-primary transition-colors">
            View all <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => <ProductSkeleton key={i} />)}
          </div>
        ) : products.length === 0 ? (
          <div className="glass-card p-16 text-center">
            <Package className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-sm text-foreground font-medium">No products listed yet</p>
            <Button variant="outline" size="sm" className="mt-3 border-border text-foreground hover:bg-secondary rounded-md" onClick={viewAllProducts}>
              Browse all products
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {products.map((p, idx) => (
              <Reveal key={p._id} delay={idx * 0.1} y={30} className="glass-card group overflow-hidden">
                <div className="relative aspect-[4/3] bg-secondary overflow-hidden">
                  {p.images?.[0] ? (
                    <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="flex items-center justify-center h-full"><Package className="h-8 w-8 text-muted-foreground/30" /></div>
                  )}
                  <Badge className="absolute top-2 left-2 glass-card border-border text-foreground text-xs capitalize">{p.category}</Badge>
                </div>
                <div className="p-5">
                  <h3 className="text-sm font-medium text-foreground mb-1">{p.name}</h3>
                  <div className="flex items-center text-xs text-muted-foreground mb-4">
                    <MapPin className="h-3 w-3 mr-1" /> {p.supplierName}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold gradient-text">{fmt(p.price)}</span>
                    {user && (p.userId === user._id || p.supplierId === user._id) ? (
                      <Button size="sm" variant="outline" className="border-border text-foreground hover:bg-secondary rounded-md" onClick={() => router.push('/products/' + p._id)}>
                        Manage
                      </Button>
                    ) : (
                      <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-md shadow-md shadow-primary/20" onClick={() => getQuote(p)} disabled={p.stock === 0}>
                        {p.stock === 0 ? 'Sold out' : 'Get quote'}
                      </Button>
                    )}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
