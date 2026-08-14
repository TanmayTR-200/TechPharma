'use client'

import { useEffect, useState } from 'react'
import { ShoppingBag, Package, Truck, CheckCircle, X } from 'lucide-react'
import { API_ENDPOINTS, fetcher } from '@/lib/api-config'

interface Order {
  _id: string
  orderNumber?: string
  items: { product?: { _id: string; name: string }; name?: string; quantity: number; price: number }[]
  total: number
  totalAmount?: number
  status: string
  createdAt: string
  paymentMethod?: string
  shippingAddress?: {
    name?: string
    phone?: string
    line1?: string
    city?: string
    state?: string
    pincode?: string
  }
}

const statusConfig: Record<string, { color: string; icon: any }> = {
  pending: { color: 'bg-secondary text-muted-foreground', icon: Package },
  processing: { color: 'bg-amber-500/15 text-amber-600 dark:text-amber-400', icon: Package },
  shipped: { color: 'bg-sky-500/15 text-sky-600 dark:text-sky-400', icon: Truck },
  delivered: { color: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400', icon: CheckCircle },
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)

  useEffect(() => {
    async function fetchOrders() {
      try {
        const data = await fetcher(API_ENDPOINTS.orders.list)
        setOrders(data.orders || [])
      } catch (err) {
        // Use empty state
      } finally {
        setLoading(false)
      }
    }
    fetchOrders()
  }, [])

  return (
    <>
      <div className="w-full space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Orders</h1>
          <p className="mt-1 text-muted-foreground">Track and manage all your orders</p>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-lg border border-border bg-secondary" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-card p-10 text-center mx-auto" style={{ maxWidth: 512 }}>
            <ShoppingBag className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <h3 className="mt-4 text-base font-medium text-foreground">No orders yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">Orders will appear here once you start selling.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-secondary/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Order</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Items</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Total</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {orders.map((order) => {
                  const status = order.status?.toLowerCase() || 'pending'
                  const config = statusConfig[status] || statusConfig.pending
                  const StatusIcon = config.icon
                  return (
                    <tr key={order._id} className="hover:bg-secondary/30">
                      <td className="px-4 py-3 font-medium text-foreground">
                        #{order.orderNumber || order._id.slice(-6)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {order.items?.length || 0} item(s)
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground">
                        ₹{(order.totalAmount || order.total || 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${config.color}`}>
                          <StatusIcon className="h-3 w-3" />
                          {order.status || 'Pending'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="text-xs uppercase tracking-wider text-foreground underline hover:text-muted-foreground transition-colors"
                        >
                          View details
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Order details popup */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-foreground/50" onClick={() => setSelectedOrder(null)} />
          <div className="relative bg-card border border-border w-full max-w-lg max-h-[80vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-xl font-bold text-foreground">Order details</h2>
              <button onClick={() => setSelectedOrder(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Order info */}
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Order ID</span>
                <span className="font-medium text-foreground">#{selectedOrder._id}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Date</span>
                <span className="text-foreground">{selectedOrder.createdAt ? new Date(selectedOrder.createdAt).toLocaleDateString() : '-'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                <span className="text-foreground capitalize">{selectedOrder.status || 'Pending'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Payment</span>
                <span className="text-foreground uppercase">{selectedOrder.paymentMethod || 'COD'}</span>
              </div>
            </div>

            {/* Items */}
            <div className="border-t border-border pt-4 mb-4">
              <h3 className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-3">Items</h3>
              <div className="space-y-3">
                {selectedOrder.items?.map((item, idx) => {
                  const name = item.product?.name || item.name || 'Product'
                  return (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <div>
                        <p className="font-medium text-foreground">{name}</p>
                        <p className="text-xs text-muted-foreground">Sold by {item.supplierName || 'Seller'}</p>
                        <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                      </div>
                      <p className="text-foreground">₹{(item.price || 0).toFixed(2)}</p>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Total */}
            <div className="border-t border-border pt-4 mb-4">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Total</span>
                <span className="font-display text-lg font-bold text-foreground">₹{(selectedOrder.totalAmount || selectedOrder.total || 0).toFixed(2)}</span>
              </div>
            </div>

            {/* Shipping address */}
            {selectedOrder.shippingAddress && (
              <div className="border-t border-border pt-4">
                <h3 className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-3">Delivery address</h3>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p className="text-foreground">{selectedOrder.shippingAddress.name || ''}</p>
                  <p>{selectedOrder.shippingAddress.line1 || ''}</p>
                  <p>{[selectedOrder.shippingAddress.city, selectedOrder.shippingAddress.state].filter(Boolean).join(', ')}</p>
                  <p>{selectedOrder.shippingAddress.pincode || ''}</p>
                  {selectedOrder.shippingAddress.phone && <p>Phone: {selectedOrder.shippingAddress.phone}</p>}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
