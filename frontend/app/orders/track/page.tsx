'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Package, Truck, CheckCircle, MapPin, Search, ArrowLeft, Clock } from 'lucide-react'
import Link from 'next/link'

interface TrackingData {
  trackingId: string
  status: string
  items: { name: string; quantity: number; price: number }[]
  totalAmount: number
  paymentMethod: string
  createdAt: string
  shippedAt: string | null
  deliveredAt: string | null
  shippingAddress: { name: string; city: string; state: string; pincode: string }
}

const statusSteps = [
  { key: 'pending', label: 'Order Placed', icon: Package },
  { key: 'processing', label: 'Processing', icon: Clock },
  { key: 'shipped', label: 'Shipped', icon: Truck },
  { key: 'delivered', label: 'Delivered', icon: CheckCircle },
]

function getStatusIndex(status: string): number {
  const idx = statusSteps.findIndex(s => s.key === status.toLowerCase())
  return idx >= 0 ? idx : 0
}

export default function TrackOrderPage() {
  const searchParams = useSearchParams()
  const [trackingId, setTrackingId] = useState(searchParams.get('id') || '')
  const [data, setData] = useState<TrackingData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

  const trackOrder = async (id?: string) => {
    const trackId = id || trackingId
    if (!trackId.trim()) {
      setError('Please enter a tracking ID')
      return
    }
    setLoading(true)
    setError('')
    setData(null)
    try {
      const res = await fetch(`${API_URL}/api/orders/track/${trackId.trim()}`)
      const result = await res.json()
      if (!result.success) {
        setError(result.message || 'Order not found')
      } else {
        setData(result.order)
      }
    } catch {
      setError('Failed to track order. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const id = searchParams.get('id')
    if (id) {
      setTrackingId(id)
      trackOrder(id)
    }
  }, [searchParams])

  const currentStep = data ? getStatusIndex(data.status) : -1

  return (
    <div className="w-full space-y-6">
      <div>
        <Link href="/orders" className="flex items-center gap-1 text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground mb-2">
          <ArrowLeft className="h-3 w-3" /> Back to Orders
        </Link>

        <h1 className="font-display text-2xl font-bold text-foreground mb-2">Track Order</h1>
        <p className="text-sm text-muted-foreground mb-6">Enter your tracking ID to see the latest status</p>

        {/* Search bar */}
        <div className="flex gap-2 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={trackingId}
              onChange={e => setTrackingId(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && trackOrder()}
              placeholder="e.g. TP12345678ABC"
              className="w-full border border-border bg-transparent pl-10 pr-3 py-2.5 text-sm text-foreground focus:border-foreground focus:outline-none"
            />
          </div>
          <button
            onClick={() => trackOrder()}
            disabled={loading}
            className="rounded-lg bg-foreground px-6 py-2.5 text-sm font-medium text-background hover:bg-foreground/90 disabled:opacity-50"
          >
            {loading ? 'Tracking...' : 'Track'}
          </button>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 mb-6">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {data && (
          <div className="space-y-6">
            {/* Status timeline */}
            <div className="border border-border p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-sm font-semibold text-foreground">Order Status</h2>
                <span className="text-xs text-muted-foreground">{data.trackingId}</span>
              </div>

              <div className="space-y-0">
                {statusSteps.map((step, idx) => {
                  const Icon = step.icon
                  const isDone = idx <= currentStep
                  const isCurrent = idx === currentStep
                  return (
                    <div key={step.key} className="flex items-start gap-4 pb-8 last:pb-0 relative">
                      {idx < statusSteps.length - 1 && (
                        <div className={`absolute left-4 top-8 h-full w-0.5 ${idx < currentStep ? 'bg-primary' : 'bg-border'}`} />
                      )}
                      <div className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full ${isDone ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'} ${isCurrent ? 'ring-4 ring-primary/20' : ''}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="pt-1.5">
                        <p className={`text-sm font-medium ${isDone ? 'text-foreground' : 'text-muted-foreground'}`}>{step.label}</p>
                        {isDone && idx === 0 && data.createdAt && (
                          <p className="text-xs text-muted-foreground mt-0.5">{new Date(data.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                        )}
                        {isDone && idx === 2 && data.shippedAt && (
                          <p className="text-xs text-muted-foreground mt-0.5">{new Date(data.shippedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                        )}
                        {isDone && idx === 3 && data.deliveredAt && (
                          <p className="text-xs text-muted-foreground mt-0.5">{new Date(data.deliveredAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Items */}
            <div className="border border-border p-6">
              <h2 className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-4">Items</h2>
              <div className="space-y-3">
                {data.items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium text-foreground">{item.name}</p>
                      <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                    </div>
                    <p className="text-foreground">₹{(item.price || 0).toFixed(2)}</p>
                  </div>
                ))}
              </div>
              <div className="border-t border-border mt-4 pt-3 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total</span>
                <span className="font-display text-lg font-bold text-foreground">₹{(data.totalAmount || 0).toFixed(2)}</span>
              </div>
            </div>

            {/* Shipping address */}
            {data.shippingAddress && (
              <div className="border border-border p-6">
                <h2 className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-3">Delivery Address</h2>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p className="text-foreground">{data.shippingAddress.name}</p>
                  <p>{[data.shippingAddress.city, data.shippingAddress.state].filter(Boolean).join(', ')}</p>
                  <p>{data.shippingAddress.pincode}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {!data && !error && !loading && (
          <div className="border border-dashed border-border p-10 text-center">
            <MapPin className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">Enter your tracking ID above to track your order</p>
          </div>
        )}
    </div>
  )
}
