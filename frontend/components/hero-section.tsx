"use client"

import { useState } from "react"
import { Search } from "lucide-react"
import { useProductNavigation } from "@/hooks/use-product-navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function HeroSection() {
  const [searchQuery, setSearchQuery] = useState("");
  const { navigateToProducts } = useProductNavigation();
  
  const handleSearch = () => {
    if (searchQuery.trim()) {
      navigateToProducts({ search: searchQuery.trim() });
    }
  };

  return (
    <section className="bg-gradient-to-br from-background to-muted py-16 lg:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h1 className="text-4xl lg:text-6xl font-serif font-bold text-foreground mb-6">
          TechPharma: Your B2B
          <span className="text-accent block">Marketplace Solution</span>
        </h1>
        <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
          Discover quality products from verified suppliers worldwide. Build lasting business relationships and grow
          your enterprise.
        </p>

        {/* Hero Search */}
        <div className="max-w-2xl mx-auto mb-8">
          <div className="relative">
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="What are you looking for? (e.g., Electronics, Machinery, Textiles)"
              className="w-full pl-6 pr-32 h-12 text-lg border-2 border-border focus:border-accent rounded-lg"
            />
            <Button
              size="lg"
              className="absolute right-0 top-0 h-full px-6 rounded-l-none bg-blue-600 hover:bg-blue-700 text-white"
              onClick={handleSearch}
            >
              <Search className="h-5 w-5 mr-2" />
              Search
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
          <span>Popular searches:</span>
          <button
            onClick={() => navigateToProducts({ category: "electronics" })}
            className="text-accent hover:underline"
          >
            Electronics
          </button>
          <button
            onClick={() => navigateToProducts({ category: "machinery" })}
            className="text-accent hover:underline"
          >
            Machinery
          </button>
          <button
            onClick={() => navigateToProducts({ category: "textiles" })}
            className="text-accent hover:underline"
          >
            Textiles
          </button>
          <button
            onClick={() => navigateToProducts({ category: "chemicals" })}
            className="text-accent hover:underline"
          >
            Chemicals
          </button>
        </div>
      </div>
    </section>
  )
}
