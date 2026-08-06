'use client'

import { useState, useEffect } from 'react'
import { X, ShoppingCart, Trash2, Plus, Minus } from 'lucide-react'
import { useCart } from '@/contexts/cart'
import { useRouter } from 'next/navigation'

interface CartDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CartDialog({ open, onOpenChange }: CartDialogProps) {
  const { cart, removeFromCart, updateQuantity } = useCart()
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

  if (!open) return null

  const handleCheckout = () => {
    onOpenChange(false)
    router.push('/checkout')
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/50"
        onClick={() => onOpenChange(false)}
      />

      {/* Panel */}
      <div className="relative flex h-full w-full max-w-md flex-col bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-900">Your cart</h2>
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-5">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <ShoppingCart className="h-12 w-12 text-slate-300" />
              <h3 className="mt-4 text-base font-medium text-slate-900">Your cart is empty</h3>
              <p className="mt-1 text-sm text-slate-500">Add products to get started.</p>
              <button
                onClick={() => onOpenChange(false)}
                className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
              >
                Browse products
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item: any) => {
                const p = item.product || item
                return (
                <div key={p._id || item.productId} className="flex gap-3 rounded-lg border border-slate-200 p-3">
                  {/* Image */}
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                    {p.images?.[0] ? (
                      <img
                        src={p.images[0]}
                        alt={p.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <ShoppingCart className="h-6 w-6 text-slate-300" />
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex flex-1 flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-medium text-slate-900 line-clamp-2">{p.name}</h3>
                      <button
                        onClick={() => removeFromCart(item.productId)}
                        className="shrink-0 text-slate-400 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="text-xs text-slate-500">₹{(p.price || 0).toFixed(2)}</p>

                    {/* Quantity */}
                    <div className="mt-auto flex items-center justify-between pt-2">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.productId, Math.max(1, (item.quantity || 1) - 1))}
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-8 text-center text-sm font-medium text-slate-900">
                          {item.quantity || 1}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.productId, (item.quantity || 1) + 1)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <p className="text-sm font-semibold text-slate-900">
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
          <div className="border-t border-slate-200 p-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm text-slate-600">Subtotal</span>
              <span className="text-lg font-bold text-slate-900">₹{total.toFixed(2)}</span>
            </div>
            <button
              onClick={handleCheckout}
              className="flex w-full items-center justify-center rounded-lg bg-emerald-600 py-2.5 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Proceed to checkout
            </button>
          </div>
        )}
      </div>
    </div>
  )
}