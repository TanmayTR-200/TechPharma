"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, ArrowRight, Package, ShoppingCart, MessageSquare, MapPin, Calendar } from "lucide-react"
import { useAuth } from "@/contexts/auth"
import { SkeletonLoader } from "@/components/skeleton-loader"
import { useToast } from "@/hooks/use-toast"
import { motion } from "framer-motion"

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
  supplier?: { _id: string; name: string; state?: string } | null
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
        const token = localStorage.getItem("token")
        const res = await fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000') + "/api/products/" + params.id, {
          headers: token ? { 'Authorization': 'Bearer ' + token } : {}
        })
        const data = await res.json()
        if (data.success && data.product) setProduct(data.product)
      } catch (e) {
        console.error("Error fetching product:", e)
      } finally {
        setLoading(false)
      }
    }
    if (params.id) fetchProduct()
  }, [params.id])

  const fmt = (p: number) => "\u20B9" + p.toLocaleString("en-IN", { maximumFractionDigits: 2 })

  if (loading) {
    return (
      <div className="w-full flex items-center justify-center min-h-[60vh]">
        <SkeletonLoader type="product-detail" />
      </div>
    )
  }

  if (!product) {
    return (
        <div className="w-full min-h-[60vh] flex flex-col items-center justify-center">
          <Package className="h-10 w-10 mb-3 text-muted-foreground/40" />
          <p className="text-sm text-foreground font-medium">Product not found</p>
          <Button variant="outline" size="sm" className="mt-3 border-border text-foreground hover:bg-secondary rounded-md" onClick={() => router.push('/products')}>
            Back to products
          </Button>
        </div>
    )
  }

  const isOwner = user && (product.userId === user._id || product.supplier?._id === user._id)
  const validImages = (product.images || []).filter(img => typeof img === "string" && img.startsWith("http"))
  const supplierName = product.supplier?.name || product.supplierName || 'Supplier'
  const supplierState = (product.supplier as any)?.state || ''
  const listedDate = product.createdAt ? new Date(product.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : ''

  const handleContactSeller = () => {
    if (!user) {
      toast({ title: "Login required", description: "Please sign in to contact the seller.", variant: "destructive" })
      return
    }
    if (product.supplierId || product.supplier?._id) {
      router.push("/messages/" + (product.supplierId || product.supplier._id))
    }
  }

  const handleAddToCart = async () => {
    if (!user) {
      toast({ title: "Login required", description: "Please sign in to add to cart.", variant: "destructive" })
      return
    }
    try {
      const token = localStorage.getItem("token")
      await fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000') + "/api/cart/add", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
        body: JSON.stringify({ productId: product._id, quantity: 1 })
      })
      toast({ title: "Added to cart", description: product.name + " has been added." })
    } catch (e) {
      toast({ title: "Error", description: "Failed to add to cart.", variant: "destructive" })
    }
  }

  const stockLevel = product.stock > 10 ? 'high' : product.stock > 0 ? 'low' : 'out'

  return (
    <>
      <div className="w-full space-y-6">
        <button onClick={() => router.back()} className="flex items-center gap-1 text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3 w-3" /> Back to products
        </button>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Left: Images */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <div className="relative w-full aspect-square rounded-lg border border-border bg-secondary overflow-hidden">
              {validImages.length > 0 ? (
                <img src={validImages[currentImage]} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <div className="flex items-center justify-center h-full"><Package className="h-12 w-12 text-muted-foreground/30" /></div>
              )}
              {validImages.length > 1 && (
                <>
                  <button
                    onClick={() => setCurrentImage((prev) => (prev - 1 + validImages.length) % validImages.length)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-background/90 border border-border text-foreground hover:bg-background shadow z-10"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setCurrentImage((prev) => (prev + 1) % validImages.length)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-background/90 border border-border text-foreground hover:bg-background shadow z-10"
                  >
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                    {validImages.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentImage(idx)}
                        className={"h-1.5 rounded-full transition-all " + (currentImage === idx ? "w-4 bg-foreground" : "w-1.5 bg-muted-foreground/40")}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
            {validImages.length > 1 && (
              <div className="flex gap-2 mt-3">
                {validImages.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentImage(idx)}
                    className={"w-14 h-14 rounded-md border overflow-hidden transition-all " + (currentImage === idx ? "border-foreground ring-1 ring-foreground" : "border-border opacity-60 hover:opacity-100")}
                  >
                    <img src={img} alt={"Thumbnail " + (idx + 1)} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </motion.div>

          {/* Right: Details */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }} className="flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <Badge className="bg-secondary text-foreground border-0 text-xs font-medium px-3 py-1 capitalize">{product.category}</Badge>
            </div>

            <h1 className="font-display text-2xl font-bold text-foreground mb-2">{product.name}</h1>
            <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{product.description || 'No description provided.'}</p>

            {/* Price */}
            <div className="border-y border-border py-4 mb-4">
              <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-1">Price</p>
              <div className="flex items-baseline gap-2">
                <span className="font-display text-3xl font-bold text-foreground">{fmt(product.price)}</span>
                <span className="text-xs text-muted-foreground">fixed price</span>
              </div>
            </div>

            {/* Stock */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center gap-1.5">
                <div className={"h-2 w-2 rounded-full " + (stockLevel === 'high' ? 'bg-emerald-500' : stockLevel === 'low' ? 'bg-amber-500' : 'bg-destructive')} />
                <span className="text-sm text-foreground font-medium">
                  {stockLevel === 'out' ? 'Out of stock' : `${product.stock} in stock`}
                </span>
                {stockLevel === 'low' && product.stock > 0 && (
                  <span className="text-xs text-amber-500">— selling fast</span>
                )}
              </div>
            </div>

            {/* Seller card */}
            <div className="border border-border rounded-lg p-4 mb-4 bg-secondary/30">
              <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-2">Seller</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-foreground text-background font-medium text-sm">
                    {supplierName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{isOwner ? 'You' : supplierName}</p>
                    {supplierState && <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" /> {supplierState}</p>}
                  </div>
                </div>
                {listedDate && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" /> {listedDate}</p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2 mt-auto">
              {!isOwner ? (
                <>
                  <Button className="w-full bg-foreground hover:bg-foreground/90 text-background rounded-md h-11 text-sm font-medium" onClick={handleAddToCart} disabled={product.stock === 0}>
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    {product.stock === 0 ? 'Out of stock' : 'Add to cart'}
                  </Button>
                  <Button variant="outline" className="w-full border-border text-foreground hover:bg-secondary rounded-md h-11 text-sm" onClick={handleContactSeller}>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Contact seller
                  </Button>
                </>
              ) : (
                <Button variant="outline" className="w-full border-border text-foreground hover:bg-secondary rounded-md h-11 text-sm" onClick={() => router.push('/dashboard')}>
                  Manage in dashboard
                </Button>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </>
  )
}
