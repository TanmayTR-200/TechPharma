"use client"

import { useState, useEffect } from "react"
import { useProductNavigation } from "@/hooks/use-product-navigation"
import { useProductFilters } from "@/hooks/use-product-filters"
import { PRODUCT_CATEGORIES } from "@/lib/constants"
import { ChevronDown } from "lucide-react"

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

  const toggleFilter = (filter: string) => {
    const newFilters = selectedFilters.includes(filter)
      ? selectedFilters.filter(f => f !== filter)
      : [...selectedFilters, filter]
    setSelectedFilters(newFilters)
    navigateToProducts({
      category: newFilters.map(f => f.toLowerCase()).join(',') || undefined,
      sortBy: selectedSort
    })
  }

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>, idx: number) => {
    const val = parseInt(e.target.value) || 0
    const newRange = [...priceRange]
    newRange[idx] = val
    setPriceRange(newRange)
  }

  const applyPriceFilter = () => {
    navigateToProducts({
      category: selectedFilters.map(f => f.toLowerCase()).join(',') || undefined,
      sortBy: selectedSort,
      priceMin: priceRange[0].toString(),
      priceMax: priceRange[1].toString()
    })
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
              navigateToProducts({
                category: e.target.value || undefined,
                sortBy: selectedSort
              })
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
            value={typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('state') || '' : ''}
            onChange={(e) => {
              const params = new URLSearchParams(window.location.search)
              if (e.target.value) {
                params.set('state', e.target.value)
              } else {
                params.delete('state')
              }
              window.location.search = params.toString()
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
              onChange={(e) => handlePriceChange(e, 0)}
              placeholder="Min"
              className="w-full rounded-lg border border-border bg-transparent px-2 py-1.5 text-xs focus:border-primary focus:outline-none"
            />
            <span className="text-muted-foreground text-xs">to</span>
            <input
              type="number"
              value={priceRange[1]}
              onChange={(e) => handlePriceChange(e, 1)}
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
      {(selectedFilters.length > 0 || (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('state'))) && (
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
          {typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('state') && (
            <button
              onClick={() => {
                const params = new URLSearchParams(window.location.search)
                params.delete('state')
                window.location.search = params.toString()
              }}
              className="flex items-center gap-1.5 bg-secondary text-foreground text-xs px-2.5 py-1 rounded hover:bg-foreground hover:text-background transition-colors"
            >
              {new URLSearchParams(window.location.search).get('state')} ✕
            </button>
          )}
          <button
            onClick={() => { setSelectedFilters([]); navigateToProducts({}) }}
            className="text-xs text-primary hover:underline ml-2"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  )
}
