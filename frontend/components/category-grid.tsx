"use client"

import Smartphone from "lucide-react/dist/esm/icons/smartphone"
import Cog from "lucide-react/dist/esm/icons/cog"
import Briefcase from "lucide-react/dist/esm/icons/briefcase"
import Shield from "lucide-react/dist/esm/icons/shield"
import Lightbulb from "lucide-react/dist/esm/icons/lightbulb"
import { useProductNavigation } from "@/hooks/use-product-navigation"
import { useEffect, useState } from "react"
import { ChevronRight, ArrowRight } from "lucide-react"
import { Reveal } from "@/components/reveal"

const categories = [
  { name: "Electronics", icon: Smartphone, key: "electronics" },
  { name: "Machinery", icon: Cog, key: "machinery" },
  { name: "Safety", icon: Shield, key: "safety" },
  { name: "Tools", icon: Briefcase, key: "tools" },
  { name: "Lighting", icon: Lightbulb, key: "lighting" },
]

function CategorySkeleton() {
  return (
    <div className="glass-card p-4 animate-fade-up">
      <div className="shimmer h-9 w-9 rounded-lg mb-3" />
      <div className="shimmer h-3 w-20 mb-2" />
      <div className="shimmer h-2.5 w-12" />
    </div>
  )
}

export function CategoryGrid() {
  const { navigateToProducts } = useProductNavigation()
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('http://localhost:5000/api/products/category-counts')
      .then(r => r.json())
      .then(d => { if (d.success) setCounts(d.counts) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const populated = categories.filter(c => (counts[c.key] || 0) > 0)
  const empty = categories.filter(c => (counts[c.key] || 0) === 0)

  return (
    <section className="py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold gradient-text">Categories</h2>
          <button onClick={() => navigateToProducts({})} className="flex items-center gap-1 text-[13px] text-muted-foreground hover:text-primary transition-colors">
            View all <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map(i => <CategorySkeleton key={i} />)}
          </div>
        ) : (
          <>
            {populated.length > 0 && (
              <div className="grid gap-4 mb-3" style={{ gridTemplateColumns: 'repeat(' + Math.min(populated.length, 5) + ', 1fr)' }}>
                {populated.map((cat, idx) => {
                  const count = counts[cat.key] || 0
                  return (
                    <Reveal key={cat.name} delay={idx * 0.08} y={25}>
                    <button
                      onClick={() => navigateToProducts({ category: cat.name, sortBy: 'featured', page: 1 })}
                      className="glass-card group flex items-center gap-4 p-4 text-left w-full"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                        <cat.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{cat.name}</p>
                        <p className="text-xs text-muted-foreground">{count} product{count !== 1 ? 's' : ''}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                    </button>
                    </Reveal>
                  )
                })}
              </div>
            )}
            {empty.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {empty.map((cat) => (
                  <button key={cat.name} onClick={() => navigateToProducts({ category: cat.name, sortBy: 'featured', page: 1 })} className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-secondary/30 border border-border/50 text-muted-foreground hover:text-foreground hover:border-border transition-colors">
                    <cat.icon className="h-3.5 w-3.5 opacity-50" />
                    <span className="text-xs">{cat.name}</span>
                    <span className="text-[10px] text-muted-foreground/60">No listings</span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  )
}
