'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Product, SupplierInfo } from '@/types/product'
import { useAuth } from "@/contexts/auth"
import { EditProductDialog } from './edit-product-dialog'
import { ProductSellerActions } from './product-seller-actions'
import { Button } from './ui/button'
import { useToast } from '@/hooks/use-toast'
import { useCart } from '@/contexts/cart'
import { motion } from 'framer-motion'

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

  // Supplier name now comes directly from the product (public API returns supplierName)
  const supplierName = isSupplierInfo(product.supplier) && product.supplier.name
    ? product.supplier.name
    : (product as any).supplierName || null

  const isOwner = user && isSupplierInfo(product.supplier) && user._id === product.supplier._id
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  const validImages = Array.isArray(product.images) ? product.images.filter(img => typeof img === 'string' && img.startsWith('http')) : []
  const imageSrc = validImages.length > 0 ? validImages[currentImageIndex] : '/placeholder.svg'

  return (
    <>
      <Card className="glass-card group border border-border overflow-hidden h-full rounded-xl">
        <CardContent className="p-0">
          <div className="relative group">
            <div className="relative w-full h-44 bg-secondary overflow-hidden">
              <img src={imageSrc} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" onError={(e) => { const target = e.target as HTMLImageElement; target.onerror = null; target.src = '/placeholder.svg' }} />
              <div onClick={() => router.push('/products/' + product._id)} className="absolute inset-0 cursor-pointer" />
              {validImages.length > 1 && (
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                  {validImages.map((_, index) => (
                    <button key={index} onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(index) }} className={'h-1.5 rounded-full transition-all ' + (index === currentImageIndex ? 'w-4 bg-primary' : 'w-1.5 bg-foreground/30')} />
                  ))}
                </div>
              )}
            </div>
            <div className="absolute top-2 left-2 flex flex-col gap-1">
              <Badge className="glass-card border border-border text-foreground text-xs font-medium px-2.5 py-1 capitalize">{product.category}</Badge>
              {product.stock === 0 ? (
                <Badge className="bg-rose-500/80 text-white text-xs font-medium px-2.5 py-1">Out of Stock</Badge>
              ) : product.stock < 10 && (
                <Badge className="bg-amber-500/80 text-white text-xs font-medium px-2.5 py-1">Low Stock</Badge>
              )}
            </div>
          </div>

          <div className="p-4 cursor-pointer" onClick={() => router.push('/products/' + product._id)}>
            <div className="mb-3 pb-3 border-b border-border">
              <p className="text-xs text-muted-foreground mb-0.5">Sold by</p>
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
              <span className="text-lg font-bold gradient-text">{'\u20B9' + Number(product.price).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
              <Badge variant="secondary" className="bg-secondary text-foreground text-xs">{product.stock} in stock</Badge>
            </div>
          </div>

          <div className="px-4 pb-4">
            {isOwner ? (
              <ProductSellerActions productId={product.id} onEdit={() => setIsEditDialogOpen(true)} />
            ) : (
              <div className="space-y-2">
                <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-md text-xs" onClick={() => router.push('/products/' + product._id)}>
                  View details
                </Button>
                <Button
                  variant="outline"
                  className="w-full border-border text-foreground hover:bg-secondary rounded-md text-xs"
                  onClick={async () => {
                    if (product.stock === 0) return
                    setAddingToCart(true)
                    try {
                      await addToCart(product._id, 1)
                    } finally {
                      setAddingToCart(false)
                    }
                  }}
                  disabled={product.stock === 0 || addingToCart}
                >
                  {product.stock === 0 ? 'Out of stock' : addingToCart ? 'Adding...' : 'Add to cart'}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <EditProductDialog product={product} isOpen={isEditDialogOpen} onClose={() => setIsEditDialogOpen(false)} onSaved={() => { setIsEditDialogOpen(false); window.location.reload() }} />
    </>
  )
}
