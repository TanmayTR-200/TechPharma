"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, ArrowRight, Package, MapPin, ShoppingCart, MessageSquare } from "lucide-react"
import { useAuth } from "@/contexts/auth"
import { useToast } from "@/hooks/use-toast"

interface ProductDetail {
  _id: string
  name: string
  description: string
  price: number
  category: string
  stock: number
  images: string[]
  status: string
  supplierId?: string
  userId?: string
  createdAt: string
  supplier?: { _id: string; name: string } | null
  supplierName?: string
}

export default function ProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()
  const [product, setProduct] = useState<ProductDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentImage, setCurrentImage] = useState(0)

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/products/' + params.id)
        const data = await res.json()
        if (data.success && data.product) {
          setProduct(data.product)
        }
      } catch (e) {
        console.error('Error fetching product:', e)
      } finally {
        setLoading(false)
      }
    }
    if (params.id) fetchProduct()
  }, [params.id])

  const fmt = (p) => '\u20B9' + p.toLocaleString('en-IN')

  if (loading) {
    return (
      <div className="h-[calc(100vh-56px)] flex items-center justify-center relative z-10">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="h-[calc(100vh-56px)] flex flex-col items-center justify-center relative z-10">
        <Package className="h-10 w-10 mb-3 text-muted-foreground/40" />
        <p className="text-sm text-foreground font-medium">Product not found</p>
        <Button variant="outline" size="sm" className="mt-3 border-border text-foreground hover:bg-secondary rounded-md" onClick={() => router.push('/products')}>
          Back to products
        </Button>
      </div>
    )
  }

  const isOwner = user && (product.userId === user._id || product.supplier?._id === user._id)
  const validImages = (product.images || []).filter(img => typeof img === 'string' && img.startsWith('http'))

  const handleContactSeller = () => {
    if (!user) {
      toast({ title: 'Login required', description: 'Please sign in to contact the seller.', variant: 'destructive' })
      router.push('/auth?mode=login')
      return
    }
    if (product.supplierId || product.supplier?._id) {
      const productInfo = encodeURIComponent(JSON.stringify({ id: product._id, name: product.name, price: product.price }))
      router.push('/messages/' + (product.supplierId || product.supplier._id) + '?product=' + productInfo)
    }
  }

  const handleAddToCart = async () => {
    if (!user) {
      toast({ title: 'Login required', description: 'Please sign in to add to cart.', variant: 'destructive' })
      router.push('/auth?mode=login')
      return
    }
    try {
      const token = localStorage.getItem('token')
      await fetch('http://localhost:5000/api/cart/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ productId: product._id, quantity: 1 })
      })
      toast({ title: 'Added to cart', description: product.name + ' has been added.' })
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to add to cart.', variant: 'destructive' })
    }
  }

  return (
    <div className="h-[calc(100vh-56px)] overflow-hidden z-10 flex items-center justify-center">
      <div className="w-full max-w-3xl mx-auto px-4 flex flex-col items-center">
        <button onClick={() => router.back()} className="self-start flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-3 w-3" /> Back
        </button>

        <div className="grid md:grid-cols-2 gap-6 items-center w-full">
          {/* Images */}
          <div className="flex flex-col items-center">
            <div className="relative w-full max-w-[280px] aspect-square rounded-lg border border-border bg-secondary overflow-hidden">
              {validImages.length > 0 ? (
                <img src={validImages[currentImage]} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <div className="flex items-center justify-center h-full"><Package className="h-8 w-8 text-muted-foreground/30" /></div>
              )}
              {validImages.length > 1 && (
                <>
                  <button
                    onClick={() => setCurrentImage((prev) => (prev - 1 + validImages.length) % validImages.length)}
                    className="absolute left-1.5 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full bg-background/90 border border-border text-foreground hover:bg-background shadow z-10"
                  >
                    <ArrowLeft className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => setCurrentImage((prev) => (prev + 1) % validImages.length)}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full bg-background/90 border border-border text-foreground hover:bg-background shadow z-10"
                  >
                    <ArrowRight className="h-3 w-3" />
                  </button>
                  <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-1">
                    {validImages.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentImage(idx)}
                        className={'h-1 rounded-full transition-all ' + (currentImage === idx ? 'w-3 bg-primary' : 'w-1 bg-muted-foreground/40')}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
            {validImages.length > 1 && (
              <div className="flex gap-1.5 mt-2">
                {validImages.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentImage(idx)}
                    className={'w-12 h-12 rounded border overflow-hidden ' + (currentImage === idx ? 'border-primary' : 'border-border')}
                  >
                    <img src={img} alt={'Thumbnail ' + (idx + 1)} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="flex flex-col">
            <Badge className="self-start mb-2 bg-primary/10 text-primary border-0 text-xs capitalize">{product.category}</Badge>
            <h1 className="text-xl font-bold text-foreground mb-1">{product.name}</h1>
            <p className="text-xs text-muted-foreground mb-3">{product.description}</p>

            <div className="text-2xl font-bold text-primary mb-3">{fmt(product.price)}</div>

            <div className="flex items-center gap-3 mb-4">
              <span className={'px-2 py-0.5 rounded text-xs ' + (product.stock > 0 ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive')}>
                {product.stock > 0 ? product.stock + ' in stock' : 'Out of stock'}
              </span>
              <span className="text-xs text-muted-foreground capitalize">{product.status}</span>
            </div>

            <div className="space-y-2">
              {!isOwner ? (
                <>
                  <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-md h-9 text-sm" onClick={handleAddToCart} disabled={product.stock === 0}>
                    <ShoppingCart className="h-3.5 w-3.5 mr-1.5" />
                    {product.stock === 0 ? 'Out of stock' : 'Add to cart'}
                  </Button>
                  <Button variant="outline" className="w-full border-border text-foreground hover:bg-secondary rounded-md h-9 text-sm" onClick={handleContactSeller}>
                    <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                    Contact seller
                  </Button>
                </>
              ) : (
                <Button variant="outline" className="w-full border-border text-foreground hover:bg-secondary rounded-md h-9 text-sm" onClick={() => router.push('/dashboard')}>
                  Manage in dashboard
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
