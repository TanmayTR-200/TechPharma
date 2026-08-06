"use client"

import { useState, useEffect } from "react"
import { useProductNavigation } from "@/hooks/use-product-navigation"
import { useProductFilters } from "@/hooks/use-product-filters"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Slider } from "@/components/ui/slider"

const ratings = [
  { stars: 5, count: 0 },
  { stars: 4, count: 0 },
  { stars: 3, count: 0 },
  { stars: 2, count: 0 },
  { stars: 1, count: 0 },
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
    <div className="glass-card p-5">
      <div className="grid md:grid-cols-3 gap-6">
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">Categories</h3>
          <div className="space-y-1.5">
            {categoryCounts.map((cat) => (
              <div key={cat.name} className="flex items-center space-x-2 py-1 px-2 rounded-lg hover:bg-secondary/30 transition-colors">
                <Checkbox id={cat.name} checked={selectedFilters.includes(cat.name)} onCheckedChange={(checked) => { checked ? addFilter(cat.name) : removeFilter(cat.name) }} className="h-4 w-4 border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary" />
                <label htmlFor={cat.name} className="text-sm text-foreground cursor-pointer flex-1">{cat.displayName}</label>
                <span className="text-xs text-muted-foreground font-medium bg-secondary/50 px-1.5 py-0.5 rounded">({cat.count || 0})</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">Price Range</h3>
          <div className="space-y-3 px-1">
            <Slider value={priceRange} onValueChange={setPriceRange} onValueCommit={handlePriceChange} max={10000} step={100} className="w-full" />
            <div className="flex items-center justify-between text-sm text-muted-foreground font-medium">
              <span>{'\u20B9' + priceRange[0]}</span>
              <span>{'\u20B9' + priceRange[1]}</span>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">Rating</h3>
          <div className="space-y-1.5">
            {ratings.map((rating) => (
              <div key={rating.stars} className="flex items-center space-x-2 py-1 px-2 rounded-lg hover:bg-secondary/30 transition-colors">
                <Checkbox id={'rating-' + rating.stars} onCheckedChange={(checked) => { const filterName = rating.stars + ' Stars & Up'; checked ? addFilter(filterName) : removeFilter(filterName) }} className="h-4 w-4 border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary" />
                <label htmlFor={'rating-' + rating.stars} className="text-sm text-foreground cursor-pointer flex items-center">
                  <div className="flex">{[...Array(5)].map((_, i) => (<span key={i} className={'text-sm ' + (i < rating.stars ? 'text-amber-400' : 'text-muted-foreground/30')}>&#9733;</span>))}</div>
                  <span className="ml-1.5 text-xs">& Up</span>
                </label>
                <span className="text-xs text-muted-foreground">({rating.count})</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
