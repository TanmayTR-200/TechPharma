'use client'

import { useEffect, useState } from 'react'
import { Package, TrendingUp } from 'lucide-react'
import DashboardLayout from '@/components/dashboard-layout'

interface SoldProduct {
  _id: string
  name: string
  quantitySold: number
  revenue: number
  lastSoldAt?: string
}

export default function SoldProductsPage() {
  const [products, setProducts] = useState<SoldProduct[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchSold() {
      try {
        const res = await fetch('/api/sold-products')
        if (res.ok) {
          const data = await res.json()
          setProducts(data.products || data || [])
        }
      } catch (err) {
        // Use empty state
      } finally {
        setLoading(false)
      }
    }
    fetchSold()
  }, [])

  const totalRevenue = products.reduce((sum, p) => sum + (p.revenue || 0), 0)
  const totalSold = products.reduce((sum, p) => sum + (p.quantitySold || 0), 0)

  return (
    <DashboardLayout>
      <div className="w-full space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Sold products</h1>
          <p className="mt-1 text-muted-foreground">Track which products are selling best</p>
        </div>

        {/* Summary */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total units sold</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary">
                <Package className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            <p className="mt-3 text-2xl font-bold text-foreground">
              {loading ? '...' : totalSold.toLocaleString()}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total revenue</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            <p className="mt-3 text-2xl font-bold text-foreground">
              {loading ? '...' : `₹${totalRevenue.toLocaleString()}`}
            </p>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg border border-border bg-secondary" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-card p-12 text-center">
            <Package className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <h3 className="mt-4 text-base font-medium text-foreground">No sales yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">Your sold products will appear here once you make a sale.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-secondary/30">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Product</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Units sold</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Revenue</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Last sold</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((product) => (
                  <tr key={product._id} className="hover:bg-secondary/30">
                    <td className="px-4 py-3 font-medium text-foreground">{product.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{product.quantitySold}</td>
                    <td className="px-4 py-3 font-medium text-foreground">₹{(product.revenue || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {product.lastSoldAt ? new Date(product.lastSoldAt).toLocaleDateString() : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}