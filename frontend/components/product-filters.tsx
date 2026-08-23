"use client"

import { useState, useEffect, useRef } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useProductNavigation } from "@/hooks/use-product-navigation"
import { useProductFilters } from "@/hooks/use-product-filters"
import { PRODUCT_CATEGORIES } from "@/lib/constants"
import { Check, ChevronDown, X } from "lucide-react"

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
  const [priceMin, setPriceMin] = useState('')
  const [priceMax, setPriceMax] = useState('')
  const [selectedFilters, setSelectedFilters] = useState<string[]>([])
  const [selectedStates, setSelectedStates] = useState<string[]>([])
  const [catDropdownOpen, setCatDropdownOpen] = useState(false)
  const [stateDropdownOpen, setStateDropdownOpen] = useState(false)
  const catRef = useRef<HTMLDivElement>(null)
  const stateRef = useRef<HTMLDivElement>(null)
  const { navigateToProducts } = useProductNavigation()
  const { categoryCounts } = useProductFilters()
  const searchParams = useSearchParams()
  const router = useRouter()

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

  useEffect(() => {
    const stateParam = searchParams.get('state') || ''
    setSelectedStates(stateParam ? stateParam.split(',').map(s => s.trim()).filter(Boolean) : [])
    setPriceMin(searchParams.get('priceMin') || '')
    setPriceMax(searchParams.get('priceMax') || '')
  }, [searchParams])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (catRef.current && !catRef.current.contains(e.target as Node)) {
        setCatDropdownOpen(false)
      }
      if (stateRef.current && !stateRef.current.contains(e.target as Node)) {
        setStateDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const updateUrl = (updates: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(updates).forEach(([key, value]) => {
      if (value) params.set(key, value)
      else params.delete(key)
    })
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

  const toggleState = (state: string) => {
    const newStates = selectedStates.includes(state)
      ? selectedStates.filter(s => s !== state)
      : [...selectedStates, state]
    setSelectedStates(newStates)
    updateUrl({ state: newStates.join(',') || undefined })
  }

  const applyPriceFilter = () => {
    updateUrl({
      priceMin: priceMin || undefined,
      priceMax: priceMax || undefined
    })
  }

  const clearAll = () => {
    setSelectedFilters([])
    setSelectedStates([])
    setPriceMin('')
    setPriceMax('')
    router.push('/products', { scroll: false })
  }

  return (
    <div className="border border-border bg-card p-5 rounded-lg">
      <div className="grid md:grid-cols-3 gap-6">
        {/* Category multi-select dropdown */}
        <div className="relative" ref={catRef}>
          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.15em] mb-2 block">Category</label>
          <button
            onClick={() => setCatDropdownOpen(!catDropdownOpen)}
            className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm text-left flex items-center justify-between hover:border-foreground/40 transition-colors"
          >
            <span className="truncate text-foreground">
              {selectedFilters.length === 0
                ? 'All categories'
                : selectedFilters.length === 1
                  ? PRODUCT_CATEGORIES.find(c => c.name === selectedFilters[0])?.displayName || selectedFilters[0]
                  : `${selectedFilters.length} categories selected`}
            </span>
            <ChevronDown className={'h-4 w-4 text-muted-foreground transition-transform ' + (catDropdownOpen ? 'rotate-180' : '')} />
          </button>
          {catDropdownOpen && (
            <div className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto rounded-md border border-border bg-card shadow-lg">
              {PRODUCT_CATEGORIES.map(cat => (
                <button
                  key={cat.name}
                  onClick={() => toggleFilter(cat.name)}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-secondary/50 transition-colors"
                >
                  <div className={'flex h-4 w-4 items-center justify-center rounded border ' + (selectedFilters.includes(cat.name) ? 'bg-foreground border-foreground' : 'border-border')}>
                    {selectedFilters.includes(cat.name) && <Check className="h-3 w-3 text-background" />}
                  </div>
                  <span className="flex-1 text-foreground">{cat.displayName}</span>
                  <span className="text-xs text-muted-foreground">({categoryCounts.find(c => c.name === cat.name)?.count || 0})</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* State multi-select dropdown */}
        <div className="relative" ref={stateRef}>
          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.15em] mb-2 block">State</label>
          <button
            onClick={() => setStateDropdownOpen(!stateDropdownOpen)}
            className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm text-left flex items-center justify-between hover:border-foreground/40 transition-colors"
          >
            <span className="truncate text-foreground">
              {selectedStates.length === 0
                ? 'All states'
                : selectedStates.length === 1
                  ? selectedStates[0]
                  : `${selectedStates.length} states selected`}
            </span>
            <ChevronDown className={'h-4 w-4 text-muted-foreground transition-transform ' + (stateDropdownOpen ? 'rotate-180' : '')} />
          </button>
          {stateDropdownOpen && (
            <div className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto rounded-md border border-border bg-card shadow-lg">
              {INDIAN_STATES.map(state => (
                <button
                  key={state}
                  onClick={() => toggleState(state)}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-secondary/50 transition-colors"
                >
                  <div className={'flex h-4 w-4 items-center justify-center rounded border ' + (selectedStates.includes(state) ? 'bg-foreground border-foreground' : 'border-border')}>
                    {selectedStates.includes(state) && <Check className="h-3 w-3 text-background" />}
                  </div>
                  <span className="flex-1 text-foreground">{state}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Price range */}
        <div>
          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.15em] mb-2 block">
            Price
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={priceMin}
              onChange={(e) => setPriceMin(e.target.value)}
              placeholder="Min ₹"
              className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm text-foreground focus:border-foreground focus:outline-none"
            />
            <span className="text-muted-foreground text-xs">—</span>
            <input
              type="number"
              value={priceMax}
              onChange={(e) => setPriceMax(e.target.value)}
              placeholder="Max ₹"
              className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm text-foreground focus:border-foreground focus:outline-none"
            />
            <button
              onClick={applyPriceFilter}
              className="rounded-md bg-foreground text-background px-4 py-2 text-xs font-medium hover:bg-foreground/90 whitespace-nowrap"
            >
              Apply
            </button>
          </div>
        </div>
      </div>

      {/* Active filters */}
      {(selectedFilters.length > 0 || selectedStates.length > 0 || searchParams.get('priceMin') || searchParams.get('priceMax')) && (
        <div className="flex flex-wrap items-center gap-2 mt-5 pt-4 border-t border-border">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.15em] mr-1">Active:</span>
          {selectedFilters.map(f => (
            <button
              key={f}
              onClick={() => toggleFilter(f)}
              className="flex items-center gap-1.5 bg-secondary text-foreground text-xs px-3 py-1 rounded-full hover:bg-foreground hover:text-background transition-colors"
            >
              {PRODUCT_CATEGORIES.find(c => c.name === f)?.displayName || f} <X className="h-3 w-3" />
            </button>
          ))}
          {selectedStates.map(s => (
            <button
              key={s}
              onClick={() => toggleState(s)}
              className="flex items-center gap-1.5 bg-secondary text-foreground text-xs px-3 py-1 rounded-full hover:bg-foreground hover:text-background transition-colors"
            >
              {s} <X className="h-3 w-3" />
            </button>
          ))}
          {(searchParams.get('priceMin') || searchParams.get('priceMax')) && (
            <button
              onClick={() => updateUrl({ priceMin: undefined, priceMax: undefined })}
              className="flex items-center gap-1.5 bg-secondary text-foreground text-xs px-3 py-1 rounded-full hover:bg-foreground hover:text-background transition-colors"
            >
              ₹{searchParams.get('priceMin') || '0'} — ₹{searchParams.get('priceMax') || '∞'} <X className="h-3 w-3" />
            </button>
          )}
          <button
            onClick={clearAll}
            className="text-xs text-primary hover:underline ml-1"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  )
}
