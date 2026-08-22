'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCart } from '@/contexts/cart'
import { useAuth } from '@/contexts/auth'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft, Package, Plus, MapPin, Trash2, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { API_ENDPOINTS, fetcher } from '@/lib/api-config'

interface SavedAddress {
  _id: string
  label: string
  name: string
  phone: string
  line1: string
  city: string
  state: string
  pincode: string
}

const LABELS = ['Home', 'Work', 'Other']

export default function CheckoutPage() {
  const { cart, checkout } = useCart()
  const { user } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('cod')
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([])
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null)
  const [showAddressForm, setShowAddressForm] = useState(false)
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null)
  const [addressForm, setAddressForm] = useState({
    label: 'Home',
    name: user?.name || '',
    phone: user?.phone || '',
    line1: '',
    city: '',
    state: '',
    pincode: '',
  })

  const items = cart?.items ?? []
  const total = cart?.total ?? 0
  const fmt = (p: number) => '\u20B9' + p.toLocaleString('en-IN', { maximumFractionDigits: 2 })

  useEffect(() => {
    fetchAddresses()
  }, [])

  const fetchAddresses = async () => {
    try {
      const data = await fetcher(API_ENDPOINTS.addresses.list)
      if (data.addresses) {
        setSavedAddresses(data.addresses)
        if (data.addresses.length > 0 && !selectedAddressId) {
          setSelectedAddressId(data.addresses[0]._id)
        }
      }
    } catch (e) {
      // Addresses not available — user can still type manually
    }
  }

  const handleSaveAddress = async () => {
    if (!addressForm.name || !addressForm.line1 || !addressForm.city || !addressForm.pincode) {
      toast({ title: 'Missing fields', description: 'Please fill all required fields.', variant: 'destructive' })
      return
    }
    try {
      if (editingAddressId) {
        await fetcher(API_ENDPOINTS.addresses.update(editingAddressId), {
          method: 'PUT',
          body: JSON.stringify(addressForm),
        })
        toast({ title: 'Address updated' })
      } else {
        const data = await fetcher(API_ENDPOINTS.addresses.create, {
          method: 'POST',
          body: JSON.stringify(addressForm),
        })
        if (data.address) {
          setSavedAddresses(prev => [...prev, data.address])
          setSelectedAddressId(data.address._id)
        }
        toast({ title: 'Address saved' })
      }
      setShowAddressForm(false)
      setEditingAddressId(null)
      setAddressForm({ label: 'Home', name: user?.name || '', phone: user?.phone || '', line1: '', city: '', state: '', pincode: '' })
      fetchAddresses()
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Failed to save address', variant: 'destructive' })
    }
  }

  const handleDeleteAddress = async (id: string) => {
    try {
      await fetcher(API_ENDPOINTS.addresses.delete(id), { method: 'DELETE' })
      setSavedAddresses(prev => prev.filter(a => a._id !== id))
      if (selectedAddressId === id) setSelectedAddressId(null)
      toast({ title: 'Address deleted' })
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to delete address', variant: 'destructive' })
    }
  }

  const startEdit = (addr: SavedAddress) => {
    setEditingAddressId(addr._id)
    setAddressForm({ label: addr.label, name: addr.name, phone: addr.phone, line1: addr.line1, city: addr.city, state: addr.state, pincode: addr.pincode })
    setShowAddressForm(true)
  }

  const selectedAddress = savedAddresses.find(a => a._id === selectedAddressId)

  const handleCheckout = async () => {
    if (!selectedAddress && (!addressForm.line1 || !addressForm.city || !addressForm.pincode)) {
      toast({ title: 'Missing details', description: 'Please select or add a delivery address.', variant: 'destructive' })
      return
    }
    const finalAddress = selectedAddress || addressForm
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const userId = user?._id || 'anonymous'

      // Step 1: Reserve inventory for each cart item
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
      const order = await checkout(paymentMethod, finalAddress)

      // Step 3: Confirm all reservations
      await Promise.all(reservations.map(rid =>
        fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000') + '/api/inventory/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
          body: JSON.stringify({ reservationId: rid })
        })
      ))

      toast({ title: 'Order placed', description: 'Your order has been placed successfully.' })
      router.push('/orders')
    } catch (error: any) {
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
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Delivery address</h2>
            {!showAddressForm && (
              <button onClick={() => { setEditingAddressId(null); setAddressForm({ label: 'Home', name: user?.name || '', phone: user?.phone || '', line1: '', city: '', state: '', pincode: '' }); setShowAddressForm(true) }} className="flex items-center gap-1 text-xs text-primary hover:underline">
                <Plus className="h-3 w-3" /> Add new
              </button>
            )}
          </div>

          {/* Saved addresses list */}
          {savedAddresses.length > 0 && !showAddressForm && (
            <div className="space-y-2">
              {savedAddresses.map(addr => (
                <div key={addr._id} className={'flex items-start gap-3 border p-3 cursor-pointer transition-colors ' + (selectedAddressId === addr._id ? 'border-foreground bg-secondary/30' : 'border-border hover:border-foreground/40')} onClick={() => setSelectedAddressId(addr._id)}>
                  <div className={'mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 ' + (selectedAddressId === addr._id ? 'border-foreground bg-foreground' : 'border-border')}>
                    {selectedAddressId === addr._id && <Check className="h-3 w-3 text-background m-auto" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-medium bg-secondary text-foreground px-2 py-0.5 rounded">{addr.label}</span>
                      <p className="text-sm font-medium text-foreground">{addr.name}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">{addr.line1}, {addr.city}, {addr.state} - {addr.pincode}</p>
                    {addr.phone && <p className="text-xs text-muted-foreground mt-0.5">Phone: {addr.phone}</p>}
                  </div>
                  <div className="flex gap-1">
                    <button onClick={(e) => { e.stopPropagation(); startEdit(addr) }} className="text-xs text-muted-foreground hover:text-primary">Edit</button>
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteAddress(addr._id) }} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Address form */}
          {showAddressForm && (
            <div className="space-y-3">
              {/* Label selector */}
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Save as</label>
                <div className="flex gap-2">
                  {LABELS.map(l => (
                    <button key={l} type="button" onClick={() => setAddressForm({ ...addressForm, label: l })} className={'px-4 py-1.5 text-xs font-medium rounded-md border transition-colors ' + (addressForm.label === l ? 'border-foreground bg-foreground text-background' : 'border-border text-foreground hover:border-foreground/40')}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Full name *</label>
                  <input type="text" value={addressForm.name} onChange={e => setAddressForm({ ...addressForm, name: e.target.value })} className="w-full border border-border bg-transparent px-3 py-2 text-sm text-foreground focus:border-foreground focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Phone</label>
                  <input type="text" value={addressForm.phone} onChange={e => setAddressForm({ ...addressForm, phone: e.target.value })} className="w-full border border-border bg-transparent px-3 py-2 text-sm text-foreground focus:border-foreground focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Address line *</label>
                <input type="text" value={addressForm.line1} onChange={e => setAddressForm({ ...addressForm, line1: e.target.value })} placeholder="House no, street, area" className="w-full border border-border bg-transparent px-3 py-2 text-sm text-foreground focus:border-foreground focus:outline-none" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">City *</label>
                  <input type="text" value={addressForm.city} onChange={e => setAddressForm({ ...addressForm, city: e.target.value })} className="w-full border border-border bg-transparent px-3 py-2 text-sm text-foreground focus:border-foreground focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">State</label>
                  <input type="text" value={addressForm.state} onChange={e => setAddressForm({ ...addressForm, state: e.target.value })} className="w-full border border-border bg-transparent px-3 py-2 text-sm text-foreground focus:border-foreground focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Pincode *</label>
                  <input type="text" value={addressForm.pincode} onChange={e => setAddressForm({ ...addressForm, pincode: e.target.value })} className="w-full border border-border bg-transparent px-3 py-2 text-sm text-foreground focus:border-foreground focus:outline-none" />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" className="text-xs" onClick={() => { setShowAddressForm(false); setEditingAddressId(null) }}>Cancel</Button>
                <Button type="button" size="sm" className="text-xs" onClick={handleSaveAddress}>{editingAddressId ? 'Update' : 'Save'} address</Button>
              </div>
            </div>
          )}

          {savedAddresses.length === 0 && !showAddressForm && (
            <div className="text-center py-6">
              <MapPin className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground mb-2">No saved addresses yet</p>
              <Button type="button" variant="outline" size="sm" className="text-xs" onClick={() => setShowAddressForm(true)}>Add an address</Button>
            </div>
          )}
        </div>

        {/* Payment method */}
        <div className="border border-border p-5 mb-6">
          <h2 className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-4">Payment method</h2>
          <div className="space-y-2">
            <label className={`flex items-center gap-3 border p-3 cursor-pointer transition-colors ${paymentMethod === 'cod' ? 'border-foreground' : 'border-border'}`}>
              <input type="radio" name="payment" value="cod" checked={paymentMethod === 'cod'} onChange={e => setPaymentMethod(e.target.value)} className="accent-foreground" />
              <span className="text-sm text-foreground">Cash on Delivery</span>
            </label>
            <label className={`flex items-center gap-3 border p-3 cursor-pointer transition-colors ${paymentMethod === 'online' ? 'border-foreground' : 'border-border'}`}>
              <input type="radio" name="payment" value="online" checked={paymentMethod === 'online'} onChange={e => setPaymentMethod(e.target.value)} className="accent-foreground" />
              <span className="text-sm text-foreground">Online Payment</span>
            </label>
          </div>
        </div>

        {/* Place order */}
        <Button className="w-full bg-foreground text-background hover:bg-foreground/90 text-xs uppercase tracking-wider rounded-none" onClick={handleCheckout} disabled={loading || (!selectedAddress && !showAddressForm)}>
          {loading ? 'Placing order...' : 'Place order'}
        </Button>
      </div>
    </div>
  )
}
