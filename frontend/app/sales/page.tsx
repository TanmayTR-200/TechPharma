'use client'

import { useEffect, useState } from 'react'
import { TrendingUp, Package, IndianRupee, ShoppingCart, ChevronDown, Truck, Clock, CheckCircle, Link as LinkIcon } from 'lucide-react'
import DashboardLayout from '@/components/dashboard-layout'
import { API_ENDPOINTS, fetcher } from '@/lib/api-config'
import Link from 'next/link'

interface SoldProduct {
  _id: string
  name: string
  quantitySold: number
  revenue: number
  lastSoldAt?: string
  buyers: { name: string; email: string; quantity: number; date: string; orderId: string }[]
}

interface SellerOrder {
  _id: string
  trackingId?: string
  buyerName: string
  items: { name: string; quantity: number; price: number }[]
  totalAmount: number
  status: string
  createdAt: string
}

const statusConfig: Record<string, { color: string; icon: any }> = {
  pending: { color: 'bg-secondary text-muted-foreground', icon: Clock },
  processing: { color: 'bg-amber-500/15 text-amber-600', icon: Package },
  shipped: { color: 'bg-sky-500/15 text-sky-600', icon: Truck },
  delivered: { color: 'bg-emerald-500/15 text-emerald-600', icon: CheckCircle },
}

export default function SalesPage() {
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [totalOrders, setTotalOrders] = useState(0)
  const [avgOrderValue, setAvgOrderValue] = useState(0)
  const [soldProducts, setSoldProducts] = useState<SoldProduct[]>([])
  const [sellerOrders, setSellerOrders] = useState<SellerOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  useEffect(() => {
    fetchSales()
  }, [])

  const fetchSales = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) { setLoading(false); return }

      const data = await fetcher(API_ENDPOINTS.dashboard.analytics, {
        headers: { 'Authorization': `Bearer ${token}` },
      })
      const a = data?.analytics || data?.data?.analytics || {}
      setTotalRevenue(Number(a.totalSales || 0))
      setTotalOrders(Number(a.totalOrders || 0))
      setAvgOrderValue(Number(a.averageOrderValue || 0))

      const sold = await fetcher(API_ENDPOINTS.products.sold.list)
      setSoldProducts(sold.products || [])

      // Fetch seller orders from dashboard
      const dash = await fetcher(API_ENDPOINTS.dashboard.base, {
        headers: { 'Authorization': `Bearer ${token}` },
      })
      setSellerOrders(dash?.data?.orders || [])
    } catch (err) {
      // Silent fail
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    setUpdatingStatus(true)
    try {
      await fetcher(API_ENDPOINTS.orders.base + '/' + orderId + '/status', {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus }),
      })
      setSellerOrders(prev => prev.map(o => o._id === orderId ? { ...o, status: newStatus } : o))
    } catch (e) {
      // ignore
    } finally {
      setUpdatingStatus(false)
    }
  }

  const totalUnits = soldProducts.reduce((sum, p) => sum + (p.quantitySold || 0), 0)

  return (
    <DashboardLayout>
      <div className="w-full space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Sales</h1>
          <p className="mt-1 text-muted-foreground">Track your revenue, manage orders, and update delivery status</p>
        </div>

        {/* 2x2 grid of metric cards */}
        <div className="grid gap-4 sm:grid-cols-2">
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

        {/* Seller Orders — manage delivery status */}
        <div className="rounded-lg border border-border bg-card p-5">
          <h2 className="mb-4 text-base font-semibold text-foreground">Orders to fulfill</h2>
          {loading ? (
            <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => (<div key={i} className="h-20 shimmer rounded-lg" />))}</div>
          ) : sellerOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No orders yet. When buyers purchase your products, they'll appear here.</p>
          ) : (
            <div className="space-y-3">
              {sellerOrders.map((order) => {
                const status = order.status?.toLowerCase() || 'pending'
                const config = statusConfig[status] || statusConfig.pending
                const StatusIcon = config.icon
                const orderSteps = ['pending', 'processing', 'shipped', 'delivered']
                const currentStepIdx = orderSteps.indexOf(status)
                const fmt = (p: number) => '\u20B9' + p.toLocaleString('en-IN')

                return (
                  <div key={order._id} className="rounded-lg border border-border p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">#{order._id.slice(-8)}</p>
                        <p className="text-xs text-muted-foreground">{order.buyerName} · {new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-foreground">{fmt(order.totalAmount)}</p>
                        <span className={'inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ' + config.color}>
                          <StatusIcon className="h-3 w-3" /> {status}
                        </span>
                      </div>
                    </div>

                    {/* Items */}
                    <div className="space-y-1 mb-3">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-xs text-muted-foreground">
                          <span>{item.name} × {item.quantity}</span>
                          <span>{fmt((item.price || 0) * (item.quantity || 1))}</span>
                        </div>
                      ))}
                    </div>

                    {/* Status timeline */}
                    <div className="flex items-center gap-1 mb-3">
                      {orderSteps.map((step, idx) => (
                        <div key={step} className="flex items-center flex-1">
                          <div className={'h-2 flex-1 rounded-full ' + (idx <= currentStepIdx ? 'bg-foreground' : 'bg-border')} />
                        </div>
                      ))}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {status !== 'delivered' && status !== 'cancelled' && orderSteps
                        .filter(s => orderSteps.indexOf(s) > currentStepIdx)
                        .map(s => (
                          <button
                            key={s}
                            onClick={() => handleUpdateStatus(order._id, s)}
                            disabled={updatingStatus}
                            className="rounded-md border border-border px-3 py-1.5 text-xs font-medium capitalize text-foreground hover:border-foreground hover:bg-foreground hover:text-background transition-colors disabled:opacity-50"
                          >
                            {updatingStatus ? 'Updating...' : `Mark as ${s}`}
                          </button>
                        ))
                      }
                      {order.trackingId && (
                        <Link
                          href={`/orders/track?id=${order.trackingId}`}
                          className="flex items-center gap-1 text-xs text-primary hover:underline ml-auto"
                        >
                          <LinkIcon className="h-3 w-3" /> Track
                        </Link>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
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
