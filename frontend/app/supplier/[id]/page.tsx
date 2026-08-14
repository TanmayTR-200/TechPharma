"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Package, MapPin, Mail, Building, Search } from "lucide-react"

interface SupplierProduct {
  _id: string
  name: string
  description: string
  price: number
  category: string
  stock: number
  images: string[]
}

interface Supplier {
  _id: string
  name: string
  email: string
  role: string
  company?: { name?: string; address?: string } | null
  createdAt: string
  products: SupplierProduct[]
  productCount: number
}

export default function SupplierProfilePage() {
  const params = useParams()
  const router = useRouter()
  const [supplier, setSupplier] = useState<Supplier | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('http://localhost:5000/api/supplier/' + params.id)
      .then(r => r.json())
      .then(data => {
        if (data.success && data.supplier) setSupplier(data.supplier)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [params.id])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-14 px-4 relative z-10">
        <div className="w-full max-w-md space-y-4">
          <div className="shimmer h-12 w-32" />
          <div className="shimmer h-4 w-48" />
          <div className="grid grid-cols-2 gap-4 mt-6">
            {[1, 2, 3, 4].map(i => <div key={i} className="border border-border overflow-hidden"><div className="aspect-[4/3] shimmer" /><div className="p-3 space-y-2"><div className="shimmer h-4 w-2/3" /><div className="shimmer h-3 w-1/2" /></div></div>)}
          </div>
        </div>
      </div>
    )
  }

  if (!supplier) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-14 px-4 relative z-10">
        <div className="text-center max-w-md">
          <div className="flex h-12 w-12 mx-auto mb-4 items-center justify-center rounded-xl bg-secondary">
            <Search className="h-5 w-5 text-muted-foreground" />
          </div>
          <h1 className="text-xl font-semibold text-foreground mb-2">Supplier not found</h1>
          <p className="text-sm text-muted-foreground mb-6">This supplier profile doesn't exist.</p>
          <Link href="/products" className="inline-flex items-center justify-center rounded-lg bg-primary px-4 h-10 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            Browse products
          </Link>
        </div>
      </div>
    )
  }

  const fmt = (p) => '\u20B9' + p.toLocaleString('en-IN')

  return (
    <div className="min-h-screen pt-14 px-4 sm:px-6 lg:px-8 relative z-10">
      <div className="max-w-4xl mx-auto py-8">
        <button onClick={() => router.back()} className="flex items-center gap-1 text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-3 w-3" /> Back
        </button>

        {/* Supplier header */}
        <div className="border border-border bg-card p-6 mb-8">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary text-2xl font-bold text-muted-foreground">
                {supplier.name?.[0]?.toUpperCase() || 'S'}
              </div>
              <div>
                <h1 className="font-display text-2xl font-bold text-foreground">{supplier.name}</h1>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                  {supplier.company?.name && (
                    <span className="flex items-center gap-1"><Building className="h-3 w-3" />{supplier.company.name}</span>
                  )}
                  <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />India</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="font-display text-2xl font-bold text-foreground">{supplier.productCount}</p>
              <p className="text-xs text-muted-foreground">products listed</p>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-border flex items-center gap-2 text-xs text-muted-foreground">
            <Mail className="h-3 w-3" /> {supplier.email}
          </div>
        </div>

        {/* Products */}
        <h2 className="font-display text-xl font-bold text-foreground mb-4">Products by {supplier.name.split(' ')[0]}</h2>

        {supplier.products.length === 0 ? (
          <div className="border border-dashed border-border bg-card p-10 text-center">
            <p className="text-sm text-muted-foreground">No products listed yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {supplier.products.map(product => (
              <Link
                key={product._id}
                href={'/products/' + product._id}
                className="border border-border bg-card overflow-hidden hover:border-foreground transition-colors group"
              >
                <div className="aspect-[4/3] overflow-hidden bg-secondary">
                  {product.images?.[0] ? (
                    <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground/30">No image</div>
                  )}
                </div>
                <div className="p-4">
                  <p className="font-display text-base font-bold text-foreground line-clamp-1">{product.name}</p>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{product.description || product.category}</p>
                  <div className="flex items-center justify-between mt-3">
                    <p className="font-display text-sm font-bold text-foreground">{fmt(product.price)}</p>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{product.stock} in stock</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}