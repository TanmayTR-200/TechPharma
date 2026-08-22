'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Product, SupplierInfo } from '@/types/product'
import { useAuth } from "@/contexts/auth"
import { EditProductDialog } from './edit-product-dialog'
import { ProductSellerActions } from './product-seller-actions'
import { Button } from './ui/button'
import { useToast } from '@/hooks/use-toast'
import { useCart } from '@/contexts/cart'

interface ProductDisplayProps {
  product: Product
  onAddToCart?: (productId: string | number) => Promise<void>
  onDeleted?: () => void
}

function isSupplierInfo(supplier: Product['supplier']): supplier is SupplierInfo {
  return supplier !== null && typeof supplier === 'object' && '_id' in supplier
}

export function ProductDisplay({ product, onAddToCart, onDeleted }: ProductDisplayProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const { addToCart } = useCart()
  const router = useRouter()
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [addingToCart, setAddingToCart] = useState(false)

  const supplierName = isSupplierInfo(product.supplier) && product.supplier.name
    ? product.supplier.name
    : (product as any).supplierName || null

  const supplierState = isSupplierInfo(product.supplier) && (product.supplier as any).state
    ? (product.supplier as any).state
    : null

  const isOwner = user && isSupplierInfo(product.supplier) && user._id === product.supplier._id

  const validImages = Array.isArray(product.images) ? product.images.filter(img => typeof img === 'string' && img.startsWith('http')) : []
  const imageSrc = validImages.length > 0 ? validImages[0] : '/placeholder.svg'

  return (
    <>
      <Card className="bg-card border border-border overflow-hidden h-full rounded-none">
        <CardContent className="p-0">
          <div className="relative group">
            <div className="relative w-full h-44 bg-secondary overflow-hidden">
              <img src={imageSrc} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" onError={(e) => { const target = e.target as HTMLImageElement; target.onerror = null; target.src = '/placeholder.svg' }} />
              <div onClick={() => router.push('/products/' + product._id)} className="absolute inset-0 cursor-pointer" />
            </div>
            <div className="absolute top-2 left-2">
              <Badge className="bg-card border border-border text-foreground text-xs font-medium px-2.5 py-1 capitalize">{product.category}</Badge>
            </div>
          </div>

          <div className="p-4 cursor-pointer" onClick={() => router.push('/products/' + product._id)}>
            <div className="mb-3 pb-3 border-b border-border">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground mb-0.5">Sold by</p>
                {supplierState && !isOwner && (
                  <span className="text-xs text-muted-foreground">{supplierState}</span>
                )}
              </div>
              {isOwner ? (
                <p className="text-sm font-semibold text-muted-foreground">You</p>
              ) : supplierName ? (
                <p className="text-sm font-semibold text-primary">{supplierName}</p>
              ) : (
                <p className="text-sm font-semibold text-muted-foreground">Supplier</p>
              )}
            </div>

            <h3 className="text-sm font-bold text-foreground mb-1 line-clamp-2">{product.name}</h3>
            <p className="text-xs text-muted-foreground mb-4 line-clamp-2">{product.description}</p>

            <div className="flex items-center justify-between">
              <span className="text-lg font-bold text-foreground font-display">{'\u20B9' + Number(product.price).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
              <Badge variant="secondary" className="bg-secondary text-foreground text-xs">{product.stock} in stock</Badge>
            </div>
          </div>

          <div className="px-4 pb-4 space-y-2">
            {isOwner ? (
              <ProductSellerActions productId={product.id} onEdit={() => setIsEditDialogOpen(true)} onDeleted={onDeleted} />
            ) : (
              <>
                <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-md text-xs" onClick={() => router.push('/products/' + product._id)}>
                  View details
                </Button>
                <Button
                  variant="outline"
                  className="w-full border-border text-foreground hover:bg-secondary rounded-md text-xs"
                  onClick={async () => {
                    if (!user) {
                      toast({ title: 'Login required', description: 'Please sign in to add items to cart.', variant: 'destructive' })
                      return
                    }
                    if (product.stock === 0) return
                    setAddingToCart(true)
                    try {
                      await addToCart(product._id, 1)
                      toast({ title: 'Added to cart', description: product.name + ' has been added to your cart.' })
                    } finally {
                      setAddingToCart(false)
                    }
                  }}
                  disabled={product.stock === 0 || addingToCart}
                >
                  {product.stock === 0 ? 'Out of stock' : addingToCart ? 'Adding...' : 'Add to cart'}
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <EditProductDialog product={product} isOpen={isEditDialogOpen} onClose={() => setIsEditDialogOpen(false)} onSaved={() => { setIsEditDialogOpen(false); window.location.reload() }} />
    </>
  )
}