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
  user: string
  items: { product?: { _id: string; name: string }; name?: string; quantity: number; price: number; sellerId?: string }[]
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

const orderSteps = ['pending', 'processing', 'shipped', 'delivered']

export default function SalesPage() {
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [totalOrders, setTotalOrders] = useState(0)
  const [avgOrderValue, setAvgOrderValue] = useState(0)
  const [soldProducts, setSoldProducts] = useState<SoldProduct[]>([])
  const [sellerOrders, setSellerOrders] = useState<SellerOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [viewMode, setViewMode] = useState<'orders' | 'products'>('orders')

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
  const fmt = (p: number) => '\u20B9' + p.toLocaleString('en-IN')

  return (
    <DashboardLayout>
      <div className="w-full space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Sales</h1>
          <p className="mt-1 text-muted-foreground">Track your revenue, manage orders, and update delivery status</p>
        </div>

        {/* Stats grid */}
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

        {/* Sales breakdown with toggle */}
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-foreground">Sales breakdown</h2>
            <div className="flex gap-1 border border-border rounded-md p-0.5">
              <button
                onClick={() => setViewMode('orders')}
                className={'px-3 py-1 text-xs font-medium rounded transition-colors ' + (viewMode === 'orders' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground')}
              >
                Order-wise
              </button>
              <button
                onClick={() => setViewMode('products')}
                className={'px-3 py-1 text-xs font-medium rounded transition-colors ' + (viewMode === 'products' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground')}
              >
                Product-wise
              </button>
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => (<div key={i} className="h-16 shimmer" />))}</div>
          ) : viewMode === 'orders' ? (
            /* Order-wise breakdown — each order as its own card */
            sellerOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground">No orders yet. When buyers purchase your products, they'll appear here.</p>
            ) : (
              <div className="space-y-3">
                {sellerOrders.map(order => {
                  const status = order.status?.toLowerCase() || 'pending'
                  const config = statusConfig[status] || statusConfig.pending
                  const StatusIcon = config.icon
                  const currentStepIdx = orderSteps.indexOf(status)
                  const nextStep = orderSteps[currentStepIdx + 1]
                  const isOpen = expandedId === order._id

                  return (
                    <div key={order._id} className="rounded-lg border border-border overflow-hidden">
                      <button
                        onClick={() => setExpandedId(isOpen ? null : order._id)}
                        className="w-full flex items-center justify-between p-4 text-left hover:bg-secondary/30 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                          <div>
                            <p className="text-sm font-medium text-foreground">#{order._id.slice(-8)}</p>
                            <p className="text-xs text-muted-foreground">{order.user} · {new Date(order.createdAt).toLocaleDateString('en-GB')}</p>
                          </div>
                        </div>
                        <div className="text-right flex items-center gap-3">
                          <span className={'inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ' + config.color}>
                            <StatusIcon className="h-3 w-3" /> {status}
                          </span>
                          <p className="text-sm font-bold text-foreground">{fmt(order.totalAmount)}</p>
                        </div>
                      </button>

                      {isOpen && (
                        <div className="border-t border-border bg-secondary/20 p-4 space-y-4">
                          {/* Items in this order */}
                          <div>
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Items</h4>
                            <div className="space-y-1">
                              {order.items.map((item, idx) => (
                                <div key={idx} className="flex justify-between text-sm p-2 bg-card border border-border rounded">
                                  <span className="text-foreground">{item.product?.name || item.name || 'Product'} × {item.quantity}</span>
                                  <span className="text-muted-foreground">{fmt((item.price || 0) * (item.quantity || 1))}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Timeline */}
                          <div>
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Timeline</h4>
                            <div className="flex items-center gap-1 mb-3">
                              {orderSteps.map((step, idx) => (
                                <div key={step} className="flex items-center flex-1">
                                  <div className={'h-2 flex-1 rounded-full ' + (idx <= currentStepIdx ? 'bg-foreground' : 'bg-border')} />
                                </div>
                              ))}
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              {orderSteps.filter(s => s !== 'pending').map(s => {
                                const stepIdx = orderSteps.indexOf(s)
                                const isNext = s === nextStep
                                const isPast = stepIdx <= currentStepIdx
                                return (
                                  <button
                                    key={s}
                                    onClick={() => isNext && handleUpdateStatus(order._id, s)}
                                    disabled={!isNext || updatingStatus || isPast}
                                    className={'rounded-md border px-3 py-1.5 text-xs font-medium capitalize transition-colors ' + (
                                      isNext ? 'border-foreground text-foreground hover:bg-foreground hover:text-background' :
                                      isPast ? 'border-border text-muted-foreground/40 cursor-default' :
                                      'border-border text-muted-foreground/40 cursor-not-allowed'
                                    )}
                                  >
                                    {isNext && updatingStatus ? 'Updating...' : `Mark as ${s}`}
                                  </button>
                                )
                              })}
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
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          ) : (
            /* Product-wise breakdown — grouped by product */
            soldProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No sales yet. Your sold items will appear here.</p>
            ) : (
              <div className="space-y-3">
                {soldProducts.map((product) => {
                  const id = product._id || product.name
                  const isOpen = expandedId === id
                  const productOrders = sellerOrders.filter(o =>
                    o.items.some(item => (item.product?.name || item.name) === product.name)
                  )

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
                            <p className="text-xs text-muted-foreground">{product.buyers?.length || 0} buyer(s) · {product.quantitySold} sold</p>
                          </div>
                        </div>
                        <p className="text-sm font-bold text-foreground">₹{(product.revenue || 0).toLocaleString('en-IN')}</p>
                      </button>

                      {isOpen && (
                        <div className="border-t border-border bg-secondary/20 p-4 space-y-3">
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Who bought this</h4>
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
                                    <p className="text-xs text-muted-foreground">{b.date ? new Date(b.date).toLocaleDateString('en-GB') : ''}</p>
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
            )
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
