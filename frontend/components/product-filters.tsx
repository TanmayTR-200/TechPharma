"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useProductNavigation } from "@/hooks/use-product-navigation"
import { useProductFilters } from "@/hooks/use-product-filters"
import { PRODUCT_CATEGORIES } from "@/lib/constants"

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
  "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal", "Delhi",
  "Jammu and Kashmir", "Ladakh", "Puducherry", "Chandigarh",
  "Andaman and Nicobar Islands", "Dadra and Nagar Haveli and Daman and Diu",
  "Lakshadweep"
]

interface ProductFiltersProps {
  selectedCategory?: string | null
  selectedSort?: string
}

export function ProductFilters({ selectedCategory, selectedSort = 'featured' }: ProductFiltersProps) {
  const [priceRange, setPriceRange] = useState([0, 10000])
  const [selectedFilters, setSelectedFilters] = useState<string[]>([])
  const { navigateToProducts } = useProductNavigation()
  const { categoryCounts } = useProductFilters()
  const searchParams = useSearchParams()
  const router = useRouter()

  const currentState = searchParams.get('state') || ''

  useEffect(() => {
    if (selectedCategory) {
      const categories = selectedCategory.split(',').map(c => {
        const match = PRODUCT_CATEGORIES.find(cat => cat.name.toLowerCase() === c.trim().toLowerCase())
        return match ? match.name : c.trim()
      })
      setSelectedFilters(categories)
    } else {
      setSelectedFilters([])
    }
  }, [selectedCategory])

  const updateUrl = (updates: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(updates).forEach(([key, value]) => {
      if (value) params.set(key, value)
      else params.delete(key)
    })
    // Reset to page 1 when filters change
    params.delete('page')
    router.push(`/products?${params.toString()}`, { scroll: false })
  }

  const toggleFilter = (filter: string) => {
    const newFilters = selectedFilters.includes(filter)
      ? selectedFilters.filter(f => f !== filter)
      : [...selectedFilters, filter]
    setSelectedFilters(newFilters)
    updateUrl({ category: newFilters.map(f => f.toLowerCase()).join(',') || undefined })
  }

  const applyPriceFilter = () => {
    updateUrl({
      category: selectedFilters.map(f => f.toLowerCase()).join(',') || undefined,
      priceMin: priceRange[0].toString(),
      priceMax: priceRange[1].toString()
    })
  }

  const clearAll = () => {
    setSelectedFilters([])
    router.push('/products', { scroll: false })
  }

  return (
    <div className="border border-border bg-card p-4 rounded-lg">
      <div className="grid md:grid-cols-3 gap-4">
        {/* Category dropdown */}
        <div>
          <label className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2 block">Category</label>
          <select
            value={selectedFilters[0] || ''}
            onChange={(e) => {
              setSelectedFilters(e.target.value ? [e.target.value] : [])
              updateUrl({ category: e.target.value || undefined })
            }}
            className="w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">All categories</option>
            {PRODUCT_CATEGORIES.map(cat => (
              <option key={cat.name} value={cat.name}>
                {cat.displayName} ({categoryCounts.find(c => c.name === cat.name)?.count || 0})
              </option>
            ))}
          </select>
        </div>

        {/* State dropdown */}
        <div>
          <label className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2 block">State</label>
          <select
            value={currentState}
            onChange={(e) => {
              updateUrl({ state: e.target.value || undefined })
            }}
            className="w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">All states</option>
            {INDIAN_STATES.map(state => (
              <option key={state} value={state}>{state}</option>
            ))}
          </select>
        </div>

        {/* Price range */}
        <div>
          <label className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2 block">
            Price: ₹{priceRange[0].toLocaleString('en-IN')} - ₹{priceRange[1].toLocaleString('en-IN')}
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={priceRange[0]}
              onChange={(e) => {
                const val = parseInt(e.target.value) || 0
                setPriceRange([val, priceRange[1]])
              }}
              placeholder="Min"
              className="w-full rounded-lg border border-border bg-transparent px-2 py-1.5 text-xs focus:border-primary focus:outline-none"
            />
            <span className="text-muted-foreground text-xs">to</span>
            <input
              type="number"
              value={priceRange[1]}
              onChange={(e) => {
                const val = parseInt(e.target.value) || 0
                setPriceRange([priceRange[0], val])
              }}
              placeholder="Max"
              className="w-full rounded-lg border border-border bg-transparent px-2 py-1.5 text-xs focus:border-primary focus:outline-none"
            />
            <button
              onClick={applyPriceFilter}
              className="rounded-lg bg-foreground text-background px-3 py-1.5 text-xs font-medium hover:bg-foreground/90 whitespace-nowrap"
            >
              Apply
            </button>
          </div>
        </div>
      </div>

      {/* Active filters */}
      {(selectedFilters.length > 0 || currentState) && (
        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-border">
          {selectedFilters.map(f => (
            <button
              key={f}
              onClick={() => toggleFilter(f)}
              className="flex items-center gap-1.5 bg-secondary text-foreground text-xs px-2.5 py-1 rounded hover:bg-foreground hover:text-background transition-colors"
            >
              {PRODUCT_CATEGORIES.find(c => c.name === f)?.displayName || f} ✕
            </button>
          ))}
          {currentState && (
            <button
              onClick={() => updateUrl({ state: undefined })}
              className="flex items-center gap-1.5 bg-secondary text-foreground text-xs px-2.5 py-1 rounded hover:bg-foreground hover:text-background transition-colors"
            >
              {currentState} ✕
            </button>
          )}
          <button
            onClick={clearAll}
            className="text-xs text-primary hover:underline ml-2"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  )
}
