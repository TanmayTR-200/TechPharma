"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useProductNavigation } from "@/hooks/use-product-navigation"
import { Checkbox } from "@/components/ui/checkbox"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, Filter, X } from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { useProductFilters } from "@/hooks/use-product-filters"

const locations = [
  { name: "Mumbai, India", count: 345 },
  { name: "Delhi, India", count: 289 },
  { name: "Bangalore, India", count: 234 },
  { name: "Chennai, India", count: 178 },
  { name: "Pune, India", count: 156 },
]

const ratings = [
  { stars: 5, count: 234 },
  { stars: 4, count: 456 },
  { stars: 3, count: 289 },
  { stars: 2, count: 123 },
  { stars: 1, count: 45 },
]

interface ProductFiltersProps {
  selectedCategory?: string | null;
  selectedSort?: string;
}

export function ProductFilters({ selectedCategory, selectedSort = 'featured' }: ProductFiltersProps) {
  const [priceRange, setPriceRange] = useState([0, 10000])
  const [selectedFilters, setSelectedFilters] = useState<string[]>(
    selectedCategory ? [selectedCategory] : []
  )
  const [isOpen, setIsOpen] = useState(false)
  const { navigateToProducts } = useProductNavigation()
  const { categoryCounts } = useProductFilters()

  // Sync selected category when it changes from URL
  useEffect(() => {
    if (selectedCategory && !selectedFilters.includes(selectedCategory)) {
      setSelectedFilters([selectedCategory]);
    }
  }, [selectedCategory]);

  const addFilter = (filter: string) => {
    if (!selectedFilters.includes(filter)) {
      const newFilters = [...selectedFilters, filter];
      setSelectedFilters(newFilters);
      navigateToProducts({ category: filter.toLowerCase(), sortBy: selectedSort });
    }
  }

  const removeFilter = (filter: string) => {
    const newFilters = selectedFilters.filter((f) => f !== filter);
    setSelectedFilters(newFilters);
    navigateToProducts({ sortBy: selectedSort });
  }

  const clearAllFilters = () => {
    setSelectedFilters([]);
    setPriceRange([0, 10000]);
    navigateToProducts({ sortBy: selectedSort });
  }

  const handlePriceChange = (values: number[]) => {
    setPriceRange(values);
    navigateToProducts({ 
      category: selectedFilters[0],
      sortBy: selectedSort,
      priceMin: values[0].toString(),
      priceMax: values[1].toString()
    });
  }

  return (
    <div className="space-y-6">
      {/* Mobile Filter Toggle */}
      <div className="lg:hidden">
        <Button variant="outline" onClick={() => setIsOpen(!isOpen)} className="w-full justify-start">
          <Filter className="h-4 w-4 mr-2" />
          Filters
        </Button>
      </div>

      <div className={`space-y-6 ${isOpen ? "block" : "hidden lg:block"}`}>
        {/* Active Filters */}
        {selectedFilters.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-foreground">Active Filters</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllFilters}
                  className="text-xs text-foreground/70 hover:text-foreground font-medium"
                >
                  Clear All
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-wrap gap-2">
                {selectedFilters.map((filter) => {
                  const category = categoryCounts.find(c => c.name === filter);
                  return (
                    <Badge key={filter} variant="secondary" className="flex items-center gap-1 text-foreground font-medium">
                      {category ? category.displayName : filter}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => removeFilter(filter)} />
                    </Badge>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Price Range */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-foreground">Price Range</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Slider value={priceRange} onValueChange={setPriceRange} max={10000} step={100} className="w-full" />
              <div className="flex items-center justify-between text-sm text-foreground/80 font-medium">
                <span>₹{priceRange[0]}</span>
                <span>₹{priceRange[1]}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Categories */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {categoryCounts.map((category) => (
                <div key={category.name} className="flex items-center space-x-2">
                  <Checkbox
                    id={category.name}
                    checked={selectedFilters.includes(category.name)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        addFilter(category.name)
                      } else {
                        removeFilter(category.name)
                      }
                    }}
                  />
                  <label
                    htmlFor={category.name}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1 cursor-pointer"
                  >
                    {category.displayName}
                  </label>
                  <span className="text-xs text-foreground/70 font-medium">({category.count})</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Location */}
        <Card>
          <Collapsible>
            <CardHeader>
              <CollapsibleTrigger asChild>
                <CardTitle className="text-sm cursor-pointer hover:text-primary font-medium">Location</CardTitle>
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent>
                <div className="space-y-3">
                  {locations.map((location) => (
                    <div key={location.name} className="flex items-center space-x-2">
                      <Checkbox
                        id={location.name}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            addFilter(location.name)
                          } else {
                            removeFilter(location.name)
                          }
                        }}
                      />
                      <label
                        htmlFor={location.name}
                        className="text-sm font-medium leading-none text-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1 cursor-pointer"
                      >
                        {location.name}
                      </label>
                      <span className="text-xs text-foreground/70 font-medium">({location.count})</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        {/* Rating */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Supplier Rating</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {ratings.map((rating) => (
                <div key={rating.stars} className="flex items-center space-x-2">
                  <Checkbox
                    id={`rating-${rating.stars}`}
                    onCheckedChange={(checked) => {
                      const filterName = `${rating.stars} Stars & Up`
                      if (checked) {
                        addFilter(filterName)
                      } else {
                        removeFilter(filterName)
                      }
                    }}
                  />
                  <label
                    htmlFor={`rating-${rating.stars}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1 cursor-pointer flex items-center"
                  >
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <span key={i} className={`text-xs ${i < rating.stars ? "text-yellow-400" : "text-gray-300"}`}>
                          ★
                        </span>
                      ))}
                    </div>
                    <span className="ml-2">& Up</span>
                  </label>
                  <span className="text-xs text-muted-foreground">({rating.count})</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
