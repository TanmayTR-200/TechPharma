'use client'

import { useEffect, useState } from 'react'
import { ShoppingBag, Package, Truck, CheckCircle, X, FileText, MapPin } from 'lucide-react'
import { API_ENDPOINTS, fetcher } from '@/lib/api-config'
import Link from 'next/link'

interface Order {
  _id: string
  orderNumber?: string
  trackingId?: string
  items: { product?: { _id: string; name: string }; name?: string; quantity: number; price: number; supplierName?: string }[]
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
  const [downloadingInvoice, setDownloadingInvoice] = useState(false)

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

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

  const handleDownloadInvoice = async (orderId: string) => {
    setDownloadingInvoice(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API_URL}/api/orders/${orderId}/invoice`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.message)

      const inv = data.invoice
      // Generate printable invoice HTML
      const invoiceHTML = `
        <!DOCTYPE html>
        <html><head><title>Invoice ${inv.invoiceNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; color: #1a1a1a; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 2px solid #1a1a1a; padding-bottom: 20px; }
          .logo { font-size: 24px; font-weight: bold; letter-spacing: 1px; }
          .invoice-meta { text-align: right; font-size: 13px; color: #666; }
          .invoice-meta strong { color: #1a1a1a; font-size: 18px; display: block; margin-bottom: 4px; }
          .section { margin-bottom: 30px; }
          .section h3 { font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #999; margin-bottom: 8px; }
          .party { font-size: 14px; line-height: 1.6; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #999; padding: 10px 0; border-bottom: 2px solid #e5e5e5; }
          td { padding: 12px 0; font-size: 14px; border-bottom: 1px solid #f0f0f0; }
          .total-row { display: flex; justify-content: space-between; padding: 15px 0; border-top: 2px solid #1a1a1a; font-size: 18px; font-weight: bold; }
          .status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 500; text-transform: capitalize; background: #f0f0f0; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e5e5; font-size: 12px; color: #999; text-align: center; }
          @media print { body { padding: 0; } }
        </style></head>
        <body>
          <div class="header">
            <div class="logo">TECHPHARMA</div>
            <div class="invoice-meta">
              <strong>INVOICE</strong>
              ${inv.invoiceNumber}<br>
              ${new Date(inv.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}<br>
              Tracking: ${inv.trackingId || 'N/A'}
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; margin-bottom: 30px;">
            <div class="section" style="flex: 1;">
              <h3>Bill To</h3>
              <div class="party">
                <strong>${inv.buyer.name}</strong><br>
                ${inv.buyer.email}
              </div>
            </div>
            <div class="section" style="flex: 1; text-align: right;">
              <h3>Status</h3>
              <span class="status-badge">${inv.status}</span>
              <p style="margin-top: 8px; font-size: 13px; color: #666;">Payment: ${inv.paymentMethod.toUpperCase()}</p>
            </div>
          </div>

          ${inv.shippingAddress && inv.shippingAddress.line1 ? `
          <div class="section">
            <h3>Shipping Address</h3>
            <div class="party">
              ${inv.shippingAddress.name || ''}<br>
              ${inv.shippingAddress.line1 || ''}<br>
              ${[inv.shippingAddress.city, inv.shippingAddress.state].filter(Boolean).join(', ')} ${inv.shippingAddress.pincode || ''}<br>
              ${inv.shippingAddress.phone ? 'Phone: ' + inv.shippingAddress.phone : ''}
            </div>
          </div>` : ''}

          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th style="text-align: center;">Qty</th>
                <th style="text-align: right;">Price</th>
                <th style="text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${inv.items.map((item: any) => `
                <tr>
                  <td>${item.name}</td>
                  <td style="text-align: center;">${item.quantity}</td>
                  <td style="text-align: right;">₹${item.price.toFixed(2)}</td>
                  <td style="text-align: right;">₹${item.total.toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="total-row">
            <span>Total</span>
            <span>₹${inv.totalAmount.toFixed(2)}</span>
          </div>

          <div class="footer">
            TechPharma — B2B Industrial Marketplace<br>
            This is a computer-generated invoice and does not require a signature.
          </div>
        </body></html>`
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(invoiceHTML)
        printWindow.document.close()
        setTimeout(() => printWindow.print(), 500)
      }
    } catch (err: any) {
      alert('Failed to generate invoice: ' + err.message)
    } finally {
      setDownloadingInvoice(false)
    }
  }

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
              {selectedOrder.trackingId && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tracking ID</span>
                  <Link href={`/orders/track?id=${selectedOrder.trackingId}`} className="font-medium text-primary hover:underline">
                    {selectedOrder.trackingId}
                  </Link>
                </div>
              )}
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

            {/* Action buttons */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => handleDownloadInvoice(selectedOrder._id)}
                disabled={downloadingInvoice}
                className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary/30 disabled:opacity-50"
              >
                <FileText className="h-4 w-4" />
                {downloadingInvoice ? 'Generating...' : 'Download Invoice'}
              </button>
              {selectedOrder.trackingId && (
                <Link
                  href={`/orders/track?id=${selectedOrder.trackingId}`}
                  className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary/30"
                >
                  <MapPin className="h-4 w-4" />
                  Track Order
                </Link>
              )}
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
