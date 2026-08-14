'use client'

import { useState, useEffect } from 'react'
import { X, ShoppingCart, Trash2, Plus, Minus } from 'lucide-react'
import { useCart } from '@/contexts/cart'
import { useRouter } from 'next/navigation'

export function CartDialog() {
  const { cart, removeFromCart, updateQuantity } = useCart()
  const [open, setOpen] = useState(false)
  const items = cart?.items ?? []
  const total = cart?.total ?? 0
  const router = useRouter()

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  const handleCheckout = () => {
    setOpen(false)
    router.push('/checkout')
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="relative rounded-md p-1.5 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Cart"
      >
        <ShoppingCart className="h-4 w-4" />
        {items.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-foreground px-1 text-[10px] font-bold text-background">
            {items.length}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-foreground/50"
            onClick={() => setOpen(false)}
          />

          {/* Panel */}
          <div className="relative flex h-full w-full max-w-md flex-col bg-card border-l border-border shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="font-display text-base font-semibold text-foreground">Your cart</h2>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto p-5">
              {items.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <ShoppingCart className="h-12 w-12 text-muted-foreground/40" />
                  <h3 className="mt-4 text-sm font-medium text-foreground">Your cart is empty</h3>
                  <p className="mt-1 text-xs text-muted-foreground">Add products to get started.</p>
                  <button
                    onClick={() => setOpen(false)}
                    className="mt-4 border border-foreground px-4 py-2 text-xs uppercase tracking-wider text-foreground hover:bg-foreground hover:text-background transition-colors"
                  >
                    Browse products
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {items.map((item: any) => {
                    const p = item.product || item
                    return (
                      <div key={p._id || item.productId} className="flex gap-3 border border-border p-3">
                        {/* Image */}
                        <div className="h-16 w-16 shrink-0 overflow-hidden bg-secondary">
                          {p.images?.[0] ? (
                            <img
                              src={p.images[0]}
                              alt={p.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center">
                              <ShoppingCart className="h-6 w-6 text-muted-foreground/30" />
                            </div>
                          )}
                        </div>

                        {/* Details */}
                        <div className="flex flex-1 flex-col">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="text-sm font-medium text-foreground line-clamp-2">{p.name}</h3>
                            <button
                              onClick={() => removeFromCart(item.productId)}
                              className="shrink-0 text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                          <p className="text-xs text-muted-foreground">₹{(p.price || 0).toFixed(2)}</p>

                          {/* Quantity */}
                          <div className="mt-auto flex items-center justify-between pt-2">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => updateQuantity(item.productId, Math.max(1, (item.quantity || 1) - 1))}
                                className="flex h-7 w-7 items-center justify-center border border-border text-muted-foreground hover:text-foreground"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="w-8 text-center text-sm font-medium text-foreground">
                                {item.quantity || 1}
                              </span>
                              <button
                                onClick={() => updateQuantity(item.productId, (item.quantity || 1) + 1)}
                                className="flex h-7 w-7 items-center justify-center border border-border text-muted-foreground hover:text-foreground"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                            <p className="text-sm font-semibold text-foreground">
                              ₹{((p.price || 0) * (item.quantity || 1)).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="border-t border-border p-5">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Subtotal</span>
                  <span className="font-display text-lg font-bold text-foreground">₹{total.toFixed(2)}</span>
                </div>
                <button
                  onClick={handleCheckout}
                  className="flex w-full items-center justify-center bg-foreground py-2.5 text-xs uppercase tracking-wider text-background hover:bg-foreground/90 transition-colors"
                >
                  Proceed to checkout
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
