"use client"

import { useState, useEffect } from "react"
import { useProductNavigation } from "@/hooks/use-product-navigation"
import { useProductFilters } from "@/hooks/use-product-filters"
import { Checkbox } from "@/components/ui/checkbox"
import { Slider } from "@/components/ui/slider"
import { X } from "lucide-react"

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
        const match = categoryCounts.find(cat => cat.name.toLowerCase() === c.trim().toLowerCase())
        return match ? match.name : c.trim()
      })
      setSelectedFilters(categories)
    } else {
      setSelectedFilters([])
    }
  }, [selectedCategory, categoryCounts])

  const addFilter = (filter: string) => {
    if (!selectedFilters.includes(filter)) {
      const newFilters = [...selectedFilters, filter]
      setSelectedFilters(newFilters)
      navigateToProducts({ category: newFilters.map(f => f.toLowerCase()).join(','), sortBy: selectedSort })
    }
  }

  const removeFilter = (filter: string) => {
    const newFilters = selectedFilters.filter((f) => f !== filter)
    setSelectedFilters(newFilters)
    if (newFilters.length > 0) {
      navigateToProducts({ category: newFilters.map(f => f.toLowerCase()).join(','), sortBy: selectedSort })
    } else {
      navigateToProducts({})
    }
  }

  const handlePriceChange = (values: number[]) => {
    setPriceRange(values)
    navigateToProducts({ category: selectedFilters[0], sortBy: selectedSort, priceMin: values[0].toString(), priceMax: values[1].toString() })
  }

  return (
    <div className="border border-border bg-card p-4">
      {/* Selected filters — removable chips */}
      {selectedFilters.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b border-border">
          {selectedFilters.map((f) => (
            <button
              key={f}
              onClick={() => removeFilter(f)}
              className="flex items-center gap-1.5 bg-secondary text-foreground text-xs px-2.5 py-1 hover:bg-foreground hover:text-background transition-colors"
            >
              {f} <X className="h-3 w-3" />
            </button>
          ))}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">Category</h3>
          <div className="space-y-1">
            {categoryCounts.map((cat) => (
              <div key={cat.name} className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-secondary/30 transition-colors cursor-pointer" onClick={() => { selectedFilters.includes(cat.name) ? removeFilter(cat.name) : addFilter(cat.name) }}>
                <Checkbox checked={selectedFilters.includes(cat.name)} className="h-4 w-4 border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary pointer-events-none" />
                <span className="text-sm text-foreground flex-1">{cat.displayName}</span>
                <span className="text-xs text-muted-foreground">({cat.count || 0})</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">Price</h3>
          <div className="space-y-3 px-1 pt-2">
            <Slider value={priceRange} onValueChange={setPriceRange} onValueCommit={handlePriceChange} max={10000} step={100} className="w-full" />
            <div className="flex items-center justify-between text-sm text-muted-foreground font-medium">
              <span>{'\u20B9' + priceRange[0].toLocaleString('en-IN')}</span>
              <span>{'\u20B9' + priceRange[1].toLocaleString('en-IN')}</span>
            </div>
          </div>
          <button onClick={() => { setPriceRange([0, 10000]); navigateToProducts({ sortBy: selectedSort }) }} className="mt-4 text-xs text-primary hover:underline">
            Clear price
          </button>
        </div>
      </div>
    </div>
  )
}