"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, Package } from "lucide-react"
import { useProduct } from "@/contexts/product-provider"
import { useAuth } from "@/contexts/auth"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Reveal } from "@/components/reveal"
import { getCategoryDisplayName } from "@/lib/constants"

interface Product {
  _id: string; name: string; price: number; images: string[]
  supplierName: string; category: string; stock: number; userId: string; supplierId: string
}

function ProductSkeleton() {
  return (
    <div className="border border-border animate-fade-up">
      <div className="aspect-[4/3] shimmer" />
      <div className="p-5 space-y-3">
        <div className="shimmer h-4 w-2/3" />
        <div className="shimmer h-3 w-1/2" />
        <div className="shimmer h-6 w-20" />
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
        const res = await fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000') + '/api/products/featured')
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
    <section className="py-16">
      <div className="max-w-7xl mx-auto px-6 sm:px-8">
        <div className="flex items-center justify-between mb-8">
          <h2 className="font-display text-2xl font-bold text-foreground">Featured products</h2>
          <button onClick={viewAllProducts} className="flex items-center gap-1 text-[11px] uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors">
            View all <ArrowRight className="h-3 w-3" />
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => <ProductSkeleton key={i} />)}
          </div>
        ) : products.length === 0 ? (
          <div className="border border-border p-16 text-center">
            <Package className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-sm text-foreground font-medium">No products listed yet</p>
            <Button variant="outline" size="sm" className="mt-3 rounded-none border-foreground text-foreground hover:bg-foreground hover:text-background" onClick={viewAllProducts}>
              Browse all products
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {products.map((p, idx) => (
              <Reveal key={p._id} delay={idx * 0.1} y={20} className="group border border-border overflow-hidden hover:border-foreground transition-colors">
                <div className="relative aspect-[4/3] bg-secondary overflow-hidden">
                  {p.images?.[0] ? (
                    <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="flex items-center justify-center h-full"><Package className="h-8 w-8 text-muted-foreground/30" /></div>
                  )}
                  <Badge className="absolute top-2 left-2 bg-background/90 text-foreground text-[10px] uppercase tracking-wider border border-border rounded-none">{getCategoryDisplayName(p.category)}</Badge>
                </div>
                <div className="p-5">
                  <h3 className="font-display text-base font-semibold text-foreground mb-1">{p.name}</h3>
                  <div className="flex items-center text-xs text-muted-foreground mb-4">
                    {p.supplierName}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-display text-lg font-bold text-foreground">{fmt(p.price)}</span>
                    {user && (p.userId === user._id || p.supplierId === user._id) ? (
                      <Button size="sm" variant="outline" className="rounded-none border-foreground text-foreground hover:bg-foreground hover:text-background text-xs" onClick={() => router.push('/products/' + p._id)}>
                        Manage
                      </Button>
                    ) : (
                      <Button size="sm" className="rounded-none bg-foreground text-background hover:bg-foreground/90 text-xs" onClick={() => router.push('/products/' + p._id)} disabled={p.stock === 0}>
                        {p.stock === 0 ? 'Sold out' : 'View details'}
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
