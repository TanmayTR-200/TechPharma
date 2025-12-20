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

const ratings = [
  { stars: 5, count: 0 },
  { stars: 4, count: 0 },
  { stars: 3, count: 0 },
  { stars: 2, count: 0 },
  { stars: 1, count: 0 },
]

interface ProductFiltersProps {
  selectedCategory?: string | null;
  selectedSort?: string;
}

export function ProductFilters({ selectedCategory, selectedSort = 'featured' }: ProductFiltersProps) {
  const [priceRange, setPriceRange] = useState([0, 10000])
  const [selectedFilters, setSelectedFilters] = useState<string[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const { navigateToProducts } = useProductNavigation()
   const { categoryCounts } = useProductFilters()

  // Sync selected categories from URL
  useEffect(() => {
    if (selectedCategory) {
      const categories = selectedCategory.split(',').map(c => {
        // Find the matching category with proper casing
        const match = categoryCounts.find(cat => cat.name.toLowerCase() === c.trim().toLowerCase());
        return match ? match.name : c.trim();
      });
      setSelectedFilters(categories);
    } else {
      setSelectedFilters([]);
    }
  }, [selectedCategory, categoryCounts]);

  const addFilter = (filter: string) => {
    if (!selectedFilters.includes(filter)) {
      const newFilters = [...selectedFilters, filter];
      setSelectedFilters(newFilters);
      navigateToProducts({ 
        category: newFilters.map(f => f.toLowerCase()).join(','), 
        sortBy: selectedSort 
      });
    }
  }

  const removeFilter = (filter: string) => {
    const newFilters = selectedFilters.filter((f) => f !== filter);
    setSelectedFilters(newFilters);
    // When removing a filter, keep all remaining filters
    if (newFilters.length > 0) {
      navigateToProducts({ 
        category: newFilters.map(f => f.toLowerCase()).join(','),
        sortBy: selectedSort 
      });
    } else {
      // If no filters left, clear all parameters
      navigateToProducts({});
    }
  }

  const clearAllFilters = () => {
    setSelectedFilters([]);
    setPriceRange([0, 10000]);
    // When clearing all filters, remove all URL parameters
    navigateToProducts({});
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
    <div className="space-y-1">
      <div className={`space-y-1 ${isOpen ? "block" : "hidden lg:block"}`}>
        {/* Price Range */}
        <Card className="bg-gray-900 border-gray-700 shadow-lg">
          <CardHeader className="px-3 py-0.5 border-b border-gray-700">
            <CardTitle className="text-sm font-semibold text-white">Price Range</CardTitle>
          </CardHeader>
          <CardContent className="px-2 py-0 bg-gray-900">
            <div className="space-y-2 -mt-0.5">
              <Slider 
                value={priceRange} 
                onValueChange={setPriceRange} 
                onValueCommit={handlePriceChange}
                max={10000} 
                step={100} 
                className="w-full" 
              />
              <div className="flex items-center justify-between text-sm text-gray-200 font-medium">
                <span>₹{priceRange[0]}</span>
                <span>₹{priceRange[1]}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Categories */}
        <Card className="bg-gray-900 border-gray-700 shadow-lg">
          <CardHeader className="px-3 py-0.5 border-b border-gray-700">
            <CardTitle className="text-sm font-semibold text-white">Categories</CardTitle>
          </CardHeader>
          <CardContent className="px-2 py-0 bg-gray-900">
            <div className="space-y-0.5 -mt-0.5">
              {categoryCounts.map((category) => (
                <div key={category.name} className="flex items-center space-x-2 py-0.5 px-2 rounded hover:bg-gray-800 transition-colors">
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
                    className="h-4 w-4 border-gray-400 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                  />
                  <label
                    htmlFor={category.name}
                    className="text-sm leading-none text-gray-200 peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1 cursor-pointer hover:text-white"
                  >
                    {category.displayName}
                  </label>
                  <span className="text-xs text-gray-300 font-medium bg-gray-800 px-1.5 py-0.5 rounded">({category.count || 0})</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Rating */}
        <Card className="bg-gray-900 border-gray-700 shadow-lg">
          <CardHeader className="px-3 py-0.5 border-b border-gray-700">
            <CardTitle className="text-sm font-semibold text-white">Supplier Rating</CardTitle>
          </CardHeader>
          <CardContent className="px-2 py-0 bg-gray-900">
            <div className="space-y-0.5 -mt-0.5">
              {ratings.map((rating) => (
                <div key={rating.stars} className="flex items-center space-x-2 py-0.5 px-2 rounded hover:bg-gray-800 transition-colors">
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
                    className="h-4 w-4 border-gray-400 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                  />
                  <label
                    htmlFor={`rating-${rating.stars}`}
                    className="text-sm leading-none text-gray-200 peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1 cursor-pointer flex items-center hover:text-white"
                  >
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <span key={i} className={`text-sm ${i < rating.stars ? "text-yellow-400" : "text-gray-600"}`}>
                          ★
                        </span>
                      ))}
                    </div>
                    <span className="ml-1.5 text-xs">& Up</span>
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
