import { ShoppingCart, Package } from "lucide-react"
import { ProductDisplay } from "@/components/product-display"
import { Product } from '@/types/product'
import { motion } from "framer-motion"

interface ProductGridProps {
  products: Product[]
  loading?: boolean
}

export function ProductGrid({ products, loading }: ProductGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
        {Array(8).fill(0).map((_, i) => (
          <div key={i} className="glass-card overflow-hidden animate-fade-up">
            <div className="aspect-square shimmer" />
            <div className="p-4 space-y-2">
              <div className="shimmer h-4 w-3/4" />
              <div className="shimmer h-4 w-1/2" />
              <div className="shimmer h-8 w-full rounded-md mt-2" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  const filteredProducts = Array.isArray(products)
    ? products.filter((p, idx, arr) =>
        (typeof p.id === 'number' || typeof p.id === 'string') &&
        arr.findIndex(x => x.id === p.id) === idx)
    : products

  return (
    <div className="min-h-full p-1">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 auto-rows-min">
        {!Array.isArray(filteredProducts) || filteredProducts.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center p-8 text-center min-h-[400px]">
            <div className="glass-card flex flex-col items-center p-8">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary mb-4">
                <ShoppingCart className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-1">No Products Found</h3>
              <p className="text-sm text-muted-foreground">
                {Array.isArray(filteredProducts) ? "No products are available at the moment." : "Failed to load products."}
              </p>
            </div>
          </div>
        ) : (
          filteredProducts.map((product, idx) => (
            <motion.div key={product.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
              <ProductDisplay product={product} onDeleted={() => window.location.reload()} />
            </motion.div>
          ))
        )}
      </div>
    </div>
  )
}
