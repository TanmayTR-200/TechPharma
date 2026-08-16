'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCart } from '@/contexts/cart'
import { useAuth } from '@/contexts/auth'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function CheckoutPage() {
  const { cart, checkout } = useCart()
  const { user } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('cod')
  const [address, setAddress] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    line1: '',
    city: '',
    state: '',
    pincode: '',
  })

  const items = cart?.items ?? []
  const total = cart?.total ?? 0

  const fmt = (p) => '\u20B9' + p.toLocaleString('en-IN', { maximumFractionDigits: 2 })

  const handleCheckout = async () => {
    if (!address.line1 || !address.city || !address.pincode) {
      toast({ title: 'Missing details', description: 'Please fill in your delivery address.', variant: 'destructive' })
      return
    }
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const userId = user?._id || 'anonymous'

      // Step 1: Reserve inventory for each cart item (with idempotency)
      const reservations = []
      for (const item of items) {
        const productId = item.productId
        const quantity = item.quantity || 1
        const idempotencyKey = `key_${userId}_${productId}_${Date.now()}`

        const res = await fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000') + '/api/inventory/reserve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
          body: JSON.stringify({ productId, quantity, idempotencyKey })
        })

        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.message || `Failed to reserve ${item.product?.name || 'product'}`)
        }

        const data = await res.json()
        reservations.push(data.reservation.reservation_id)
      }

      // Step 2: Place the order
      const order = await checkout(paymentMethod, address)

      // Step 3: Confirm all reservations (move reserved → sold)
      await Promise.all(reservations.map(rid =>
        fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000') + '/api/inventory/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
          body: JSON.stringify({ reservationId: rid })
        })
      ))

      toast({ title: 'Order placed', description: 'Your order has been placed successfully.' })
      router.push('/orders')
    } catch (error) {
      toast({ title: 'Error', description: error.message || 'Failed to place order. Please try again.', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  if (items.length === 0) {
    return (
      <div className="pt-14 min-h-screen flex flex-col items-center justify-center relative z-10">
        <Package className="h-10 w-10 mb-3 text-muted-foreground/40" />
        <p className="text-sm text-foreground font-medium">Your cart is empty</p>
        <Button variant="outline" size="sm" className="mt-3 rounded-none border-foreground text-foreground hover:bg-foreground hover:text-background text-xs uppercase tracking-wider" onClick={() => router.push('/products')}>
          Browse products
        </Button>
      </div>
    )
  }

  return (
    <div className="pt-14 min-h-screen relative z-10">
      <div className="max-w-2xl mx-auto px-6 py-8">
        <button onClick={() => router.back()} className="flex items-center gap-1 text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-3 w-3" /> Back
        </button>

        <h1 className="font-display text-2xl font-bold text-foreground mb-6">Checkout</h1>

        {/* Order summary */}
        <div className="border border-border p-5 mb-6">
          <h2 className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-4">Order summary</h2>
          <div className="space-y-3">
            {items.map((item: any) => {
              const p = item.product || item
              return (
                <div key={p._id || item.productId} className="flex items-center gap-3">
                  <div className="h-12 w-12 shrink-0 overflow-hidden bg-secondary">
                    {p.images?.[0] ? (
                      <img src={p.images[0]} alt={p.name} className="h-full w-full object-cover" />
                    ) : (
                      <Package className="h-6 w-6 text-muted-foreground/30 m-auto mt-3" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                  </div>
                  <p className="text-sm font-semibold text-foreground">{fmt((p.price || 0) * (item.quantity || 1))}</p>
                </div>
              )
            })}
          </div>
          <div className="border-t border-border mt-4 pt-3 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total</span>
            <span className="font-display text-lg font-bold text-foreground">{fmt(total)}</span>
          </div>
        </div>

        {/* Delivery address */}
        <div className="border border-border p-5 mb-6">
          <h2 className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-4">Delivery address</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Full name</label>
              <input
                type="text"
                value={address.name}
                onChange={e => setAddress({ ...address, name: e.target.value })}
                className="w-full border border-border bg-transparent px-3 py-2 text-sm text-foreground focus:border-foreground focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Phone</label>
              <input
                type="text"
                value={address.phone}
                onChange={e => setAddress({ ...address, phone: e.target.value })}
                className="w-full border border-border bg-transparent px-3 py-2 text-sm text-foreground focus:border-foreground focus:outline-none"
              />
            </div>
          </div>
          <div className="mt-3">
            <label className="text-xs text-muted-foreground mb-1 block">Address line</label>
            <input
              type="text"
              value={address.line1}
              onChange={e => setAddress({ ...address, line1: e.target.value })}
              placeholder="House no, street, area"
              className="w-full border border-border bg-transparent px-3 py-2 text-sm text-foreground focus:border-foreground focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-3 gap-4 mt-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">City</label>
              <input
                type="text"
                value={address.city}
                onChange={e => setAddress({ ...address, city: e.target.value })}
                className="w-full border border-border bg-transparent px-3 py-2 text-sm text-foreground focus:border-foreground focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">State</label>
              <input
                type="text"
                value={address.state}
                onChange={e => setAddress({ ...address, state: e.target.value })}
                className="w-full border border-border bg-transparent px-3 py-2 text-sm text-foreground focus:border-foreground focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Pincode</label>
              <input
                type="text"
                value={address.pincode}
                onChange={e => setAddress({ ...address, pincode: e.target.value })}
                className="w-full border border-border bg-transparent px-3 py-2 text-sm text-foreground focus:border-foreground focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Payment method */}
        <div className="border border-border p-5 mb-6">
          <h2 className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-4">Payment method</h2>
          <div className="space-y-2">
            <label className={`flex items-center gap-3 border p-3 cursor-pointer transition-colors ${paymentMethod === 'cod' ? 'border-foreground' : 'border-border'}`}>
              <input
                type="radio"
                name="payment"
                value="cod"
                checked={paymentMethod === 'cod'}
                onChange={e => setPaymentMethod(e.target.value)}
                className="accent-foreground"
              />
              <span className="text-sm text-foreground">Cash on Delivery</span>
            </label>
            <label className={`flex items-center gap-3 border p-3 cursor-pointer transition-colors ${paymentMethod === 'online' ? 'border-foreground' : 'border-border'}`}>
              <input
                type="radio"
                name="payment"
                value="online"
                checked={paymentMethod === 'online'}
                onChange={e => setPaymentMethod(e.target.value)}
                className="accent-foreground"
              />
              <span className="text-sm text-foreground">Online Payment</span>
            </label>
          </div>
        </div>

        {/* Place order */}
        <Button
          className="w-full bg-foreground text-background hover:bg-foreground/90 text-xs uppercase tracking-wider rounded-none"
          onClick={handleCheckout}
          disabled={loading}
        >
          {loading ? 'Placing order...' : 'Place order'}
        </Button>
      </div>
    </div>
  )
}
