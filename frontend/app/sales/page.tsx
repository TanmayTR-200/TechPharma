'use client'

import { useEffect, useState } from 'react'
import { TrendingUp, Package, IndianRupee, ShoppingCart, ChevronDown } from 'lucide-react'
import DashboardLayout from '@/components/dashboard-layout'
import { API_ENDPOINTS, fetcher } from '@/lib/api-config'

interface SoldProduct {
  _id: string
  name: string
  quantitySold: number
  revenue: number
  lastSoldAt?: string
  buyers: { name: string; email: string; quantity: number; date: string; orderId: string }[]
}

export default function SalesPage() {
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [totalOrders, setTotalOrders] = useState(0)
  const [avgOrderValue, setAvgOrderValue] = useState(0)
  const [soldProducts, setSoldProducts] = useState<SoldProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    async function fetchSales() {
      try {
        const token = localStorage.getItem('token')
        if (!token) {
          setLoading(false)
          return
        }

        // Fetch analytics (revenue, orders)
        const data = await fetcher(API_ENDPOINTS.dashboard.analytics, {
          headers: { 'Authorization': `Bearer ${token}` },
        })
        const a = data?.analytics || data?.data?.analytics || {}
        setTotalRevenue(Number(a.totalSales || 0))
        setTotalOrders(Number(a.totalOrders || 0))
        setAvgOrderValue(Number(a.averageOrderValue || 0))

        // Fetch sold products (units + buyer breakdown)
        const sold = await fetcher(API_ENDPOINTS.products.sold.list)
        setSoldProducts(sold.products || [])
      } catch (err) {
        // Silent fail
      } finally {
        setLoading(false)
      }
    }
    fetchSales()
  }, [])

  const totalUnits = soldProducts.reduce((sum, p) => sum + (p.quantitySold || 0), 0)

  return (
    <DashboardLayout>
      <div className="w-full space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Sales</h1>
          <p className="mt-1 text-muted-foreground">Track your revenue, orders, and sold items</p>
        </div>

        {/* 2x2 grid of metric cards */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Total revenue */}
          <div className="rounded-lg border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total revenue</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary">
                <IndianRupee className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            <p className="mt-3 font-display text-2xl font-bold text-foreground">
              {loading ? '...' : `₹${totalRevenue.toLocaleString('en-IN')}`}
            </p>

          </div>

          {/* Total orders */}
          <div className="rounded-lg border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total orders</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary">
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            <p className="mt-3 font-display text-2xl font-bold text-foreground">
              {loading ? '...' : totalOrders.toLocaleString('en-IN')}
            </p>
          </div>

          {/* Avg order value */}
          <div className="rounded-lg border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Avg. order value</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            <p className="mt-3 font-display text-2xl font-bold text-foreground">
              {loading ? '...' : `₹${Math.round(avgOrderValue).toLocaleString('en-IN')}`}
            </p>
          </div>

          {/* Total units sold */}
          <div className="rounded-lg border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total units sold</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary">
                <Package className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            <p className="mt-3 font-display text-2xl font-bold text-foreground">
              {loading ? '...' : totalUnits.toLocaleString('en-IN')}
            </p>
          </div>
        </div>

        {/* Product sales breakdown — click to expand buyers */}
        <div className="rounded-lg border border-border bg-card p-5">
          <h2 className="mb-4 text-base font-semibold text-foreground">Product sales breakdown</h2>
          {loading ? (
            <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => (<div key={i} className="h-16 shimmer" />))}</div>
          ) : soldProducts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sales yet. Your sold items will appear here.</p>
          ) : (
            <div className="space-y-3">
              {soldProducts.map((product) => {
                const id = product._id || product.name
                const isOpen = expandedId === id
                return (
                  <div key={id} className="rounded-lg border border-border overflow-hidden">
                    <button
                      onClick={() => setExpandedId(isOpen ? null : id)}
                      className="w-full flex items-center justify-between p-4 text-left hover:bg-secondary/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                        <div>
                          <p className="text-sm font-medium text-foreground">{product.name}</p>
                          <p className="text-xs text-muted-foreground">{product.buyers?.length || 0} buyer(s)</p>
                        </div>
                      </div>
                      <div className="text-right flex items-center gap-4">
                        <div>
                          <p className="text-sm font-bold text-foreground">{product.quantitySold} sold</p>
                          <p className="text-xs text-muted-foreground">₹{(product.revenue || 0).toLocaleString('en-IN')}</p>
                        </div>
                        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                      </div>
                    </button>

                    {isOpen && (
                      <div className="border-t border-border bg-secondary/20 p-4">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Who bought this</h4>
                        {product.buyers && product.buyers.length > 0 ? (
                          <div className="space-y-2">
                            {product.buyers.map((b, idx) => (
                              <div key={idx} className="flex items-center justify-between text-sm p-3 bg-card border border-border rounded">
                                <div>
                                  <p className="font-medium text-foreground">{b.name || 'Unknown buyer'}</p>
                                  <p className="text-xs text-muted-foreground">{b.email || ''}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm text-foreground">Qty {b.quantity}</p>
                                  <p className="text-xs text-muted-foreground">{b.date ? new Date(b.date).toLocaleDateString() : ''}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">No buyer details available.</p>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}