'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { useToast } from './ui/use-toast'
import { Plus, Loader2 } from 'lucide-react'
import { createUploadWidget } from '@/lib/cloudinary'
import { useAuth } from '@/contexts/auth'

export function AddProductDialog() {
  const { toast } = useToast()
  const { refreshUserData } = useAuth()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [stock, setStock] = useState('')
  const [category, setCategory] = useState('')
  const [images, setImages] = useState<string[]>([])

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

  const handleImageUpload = () => {
    const widget = createUploadWidget(
      (url: string) => {
        setImages(prev => [...prev, url])
        toast({ title: 'Image uploaded', description: 'Image added successfully.' })
      },
      (error: string) => {
        toast({ title: 'Upload failed', description: error, variant: 'destructive' })
      }
    )
    if (widget) {
      widget.open()
    } else {
      toast({ title: 'Error', description: 'Upload widget failed to initialize', variant: 'destructive' })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !price || !stock || !category) {
      toast({ title: 'Missing fields', description: 'Please fill in all required fields.', variant: 'destructive' })
      return
    }

    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API_URL}/api/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name,
          description,
          price: parseFloat(price),
          stock: parseInt(stock),
          category,
          images,
          status: 'active'
        })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || 'Failed to add product')
      }

      toast({ title: 'Success', description: 'Product added successfully.' })
      setOpen(false)
      // Reset form
      setName('')
      setDescription('')
      setPrice('')
      setStock('')
      setCategory('')
      setImages([])
      // Refresh user data
      refreshUserData()
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to add product.', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const allCategories = [
    'electronics', 'machinery', 'safety', 'tools', 'lighting',
    'chemicals', 'medical', 'packaging', 'construction', 'automotive',
    'textiles', 'agriculture', 'industrial-supplies', 'power-energy', 'lab-equipment'
  ]

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-5 py-2 rounded-lg">
          <Plus className="w-4 h-4" />
          Add Product
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] rounded-2xl border-border max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add new product</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="product-name">Product name *</Label>
            <Input
              id="product-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g. Drilling Machine"
              className="rounded-lg mt-1"
            />
          </div>

          <div>
            <Label htmlFor="product-desc">Description</Label>
            <textarea
              id="product-desc"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the product"
              className="w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="product-price">Price (₹) *</Label>
              <Input
                id="product-price"
                type="number"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
                placeholder="0.00"
                className="rounded-lg mt-1"
              />
            </div>
            <div>
              <Label htmlFor="product-stock">Stock *</Label>
              <Input
                id="product-stock"
                type="number"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                required
                placeholder="0"
                className="rounded-lg mt-1"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="product-category">Category *</Label>
            <select
              id="product-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
              className="w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary mt-1"
            >
              <option value="">Select a category</option>
              {allCategories.map(cat => (
                <option key={cat} value={cat} className="capitalize">
                  {cat.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label>Product images</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {images.map((url, idx) => (
                <div key={idx} className="relative h-20 w-20 overflow-hidden rounded-lg border border-border">
                  <img src={url} alt={`Product ${idx + 1}`} className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setImages(prev => prev.filter((_, i) => i !== idx))}
                    className="absolute top-0 right-0 bg-destructive text-white rounded-bl-lg px-1.5 py-0.5 text-xs"
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={handleImageUpload}
                className="flex h-20 w-20 items-center justify-center rounded-lg border border-dashed border-border hover:border-primary hover:bg-secondary/30 transition-colors"
              >
                <Plus className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex flex-1 items-center justify-center gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {loading ? 'Adding...' : 'Add product'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
