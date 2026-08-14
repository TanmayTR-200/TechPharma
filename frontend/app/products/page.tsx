'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Footer } from '@/components/footer'
import { ProductGrid } from '@/components/product-grid'
import { ProductFilters } from '@/components/product-filters'
import { ProductPagination } from '@/components/product-pagination'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { X, SlidersHorizontal, ChevronDown, Search } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { API_ENDPOINTS, fetcher } from '@/lib/api-config'
import { Product } from '@/types/product'
import { motion } from 'framer-motion'

export default function ProductsPage() {
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [products, setProducts] = useState<Product[]>([])
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [showFilters, setShowFilters] = useState(false)

  const category = searchParams.get('category')
  const search = searchParams.get('search')
  const page = parseInt(searchParams.get('page') || '1')
  const sort = searchParams.get('sort') || 'featured'

  const fetchProducts = async () => {
    try {
      setLoading(true)
      const filters: Record<string, string> = {}
      if (category) filters.category = category.toLowerCase()
      if (search) filters.search = search
      const params = new URLSearchParams(window.location.search)
      if (params.get('priceMin')) filters.priceMin = params.get('priceMin')!
      if (params.get('priceMax')) filters.priceMax = params.get('priceMax')!
      const token = localStorage.getItem('token')
      const requestUrl = API_ENDPOINTS.products.list(page, sort, filters)
      const data = await fetcher(requestUrl, {
        headers: {
          'Cache-Control': 'no-cache',
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': 'Bearer ' + token } : {})
        }
      })

      let processedProducts = []
      if (data.products && Array.isArray(data.products)) {
        processedProducts = data.products
      } else if (Array.isArray(data)) {
        processedProducts = data
      } else {
        const extractedProducts = Object.values(data).find(val => Array.isArray(val))
        if (extractedProducts) processedProducts = extractedProducts
      }

      // Capture pagination metadata (default to page 1 if no pagination response)
      setTotalPages(data?.pagination?.totalPages || 1)
      setTotalCount(data?.pagination?.total ?? processedProducts.length)

      const transformedProducts = processedProducts.map((product: any) => {
        let transformedSupplier = null
        if (product.supplier) {
          if (typeof product.supplier === 'string') {
            transformedSupplier = { _id: product.supplier }
          } else if (typeof product.supplier === 'object') {
            transformedSupplier = {
              _id: product.supplier._id || product.supplier.id,
              name: product.supplier.name || product.supplier.company?.name,
              ...product.supplier
            }
          }
        }
        if (!transformedSupplier && product.userId) {
          transformedSupplier = { _id: product.userId }
        }
        if (!transformedSupplier) {
          transformedSupplier = { _id: 'unknown', name: 'Unknown Supplier' }
        }
        const rawImages = Array.isArray(product.images) ? product.images : []
        const images = rawImages.filter((img: string) =>
          typeof img === 'string' && img.trim() &&
          (img.startsWith('http://') || img.startsWith('https://'))
        )
        if (images.length === 0) images.push('/placeholder.svg')
        let id = typeof product.id === 'number' ? product.id : (product._id ? product._id : null)
        return { ...product, id, supplier: transformedSupplier, images }
      })

      setProducts(transformedProducts)
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to load products.', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProducts()
  }, [category, search, page, sort])

  const priceMin = searchParams.get('priceMin') ? parseInt(searchParams.get('priceMin')!) : 0
  const priceMax = searchParams.get('priceMax') ? parseInt(searchParams.get('priceMax')!) : 10000
  let filteredProducts = products
  if (category) {
    const categories = category.toLowerCase().split(',')
    filteredProducts = filteredProducts.filter(p => p.category && categories.includes(p.category.toLowerCase()))
  }
  filteredProducts = filteredProducts.filter(p => typeof p.price === 'number' && p.price >= priceMin && p.price <= priceMax)

  return (
    <>
    <div className="w-full space-y-6 relative z-10">
      <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">
              {category ? category.charAt(0).toUpperCase() + category.slice(1) : search ? 'Search: ' + search : 'All products'}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {loading ? '' : totalCount + ' product' + (totalCount !== 1 ? 's' : '') + ' available'}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className="bg-card border border-border rounded-md flex items-center gap-2 text-foreground">
            <SlidersHorizontal className="h-4 w-4" /> Filters
            <ChevronDown className={'h-3 w-3 transition-transform ' + (showFilters ? 'rotate-180' : '')} />
          </Button>
        </div>

        {category && (
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            {category.split(',').map((filter) => (
              <Badge key={filter} className="flex items-center gap-1.5 bg-primary/10 text-primary border-0 rounded-full px-3 py-1">
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
                <button onClick={() => {
                  const newCategories = category.split(',').filter(c => c !== filter).join(',')
                  window.location.search = newCategories ? '?category=' + newCategories : ''
                }}><X className="h-3 w-3" /></button>
              </Badge>
            ))}
            <Button variant="ghost" size="sm" onClick={() => { window.location.search = '' }} className="text-xs text-primary h-7">Clear all</Button>
          </div>
        )}

        {showFilters && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mb-6">
            <ProductFilters selectedCategory={category} selectedSort={sort} />
          </motion.div>
        )}

        <div className="mb-4">
          <ProductGrid products={filteredProducts} loading={loading} />
        </div>

        {!loading && filteredProducts.length > 0 && (
          <ProductPagination currentPage={page} totalPages={totalPages} />
        )}
      </div>
      <Footer />
    </>
  )
}
