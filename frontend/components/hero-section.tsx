"use client"

import { useState } from "react"
import { Search, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useProductNavigation } from "@/hooks/use-product-navigation"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth"
import { motion } from "framer-motion"
import { useRef } from "react"

export function HeroSection() {
  const [query, setQuery] = useState("")
  const { navigateToProducts } = useProductNavigation()
  const router = useRouter()
  const { user } = useAuth()
  const ref = useRef(null)

  const handleSearch = () => {
    if (query.trim()) navigateToProducts({ search: query.trim() })
    else navigateToProducts({})
  }

  if (user) {
    return (
      <section ref={ref} className="pt-20 pb-10 relative z-10">
        <div className="max-w-7xl mx-auto px-6 sm:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground mb-2">Welcome back</p>
            <h1 className="font-display text-4xl font-bold mb-6">{user.name}</h1>
            <div className="flex gap-2 max-w-lg mb-8">
              <Input type="search" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} placeholder="Search suppliers and products..." className="h-11 rounded-none bg-transparent border-border text-foreground placeholder:text-muted-foreground focus:border-foreground" />
              <Button className="rounded-none bg-foreground text-background hover:bg-foreground/90 h-11 px-4" onClick={handleSearch}><Search className="h-4 w-4" /></Button>
            </div>
            <div className="flex flex-wrap gap-3">
              <button onClick={() => router.push('/dashboard')} className="border border-border px-4 py-2 text-xs uppercase tracking-wider text-foreground hover:bg-foreground hover:text-background transition-colors">Dashboard</button>
              <button onClick={() => router.push('/orders')} className="border border-border px-4 py-2 text-xs uppercase tracking-wider text-foreground hover:bg-foreground hover:text-background transition-colors">Orders</button>
              <button onClick={() => router.push('/products')} className="border border-border px-4 py-2 text-xs uppercase tracking-wider text-foreground hover:bg-foreground hover:text-background transition-colors">Browse all</button>
            </div>
          </motion.div>
        </div>
      </section>
    )
  }

  const headlineWords = ["Suppliers", "and", "buyers,", "one", "platform."]

  return (
    <section ref={ref} className="relative min-h-[85vh] overflow-hidden z-10">
      {/* Background image — right side visible, left fades to solid */}
      <div className="absolute inset-0 z-0">
        <img
          src="/hero-bg.png"
          alt="Industrial corridor"
          className="w-full h-full object-cover"
        />
        {/* Strong left gradient so text is readable, image bleeds right */}
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-transparent" />
      </div>

      {/* Content — left-aligned, generous padding */}
      <div className="relative z-10 min-h-[85vh] flex items-center">
        <div className="w-full max-w-7xl mx-auto px-6 sm:px-8">
          <div className="max-w-xl">
            {/* Eyebrow */}
            <motion.p
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="text-[10px] uppercase tracking-[0.35em] text-muted-foreground mb-8"
            >
              The B2B Industrial Marketplace
            </motion.p>

            {/* Headline — word-by-word stagger, large serif */}
            <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[0.9] text-foreground mb-6">
              {headlineWords.map((word, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, y: 35 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.3 + i * 0.12, ease: [0.22, 1, 0.36, 1] }}
                  className="inline-block mr-[0.2em]"
                >
                  {word}
                </motion.span>
              ))}
            </h1>

            {/* Subhead */}
            <motion.p
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 1.0 }}
              className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-md mb-10"
            >
              Stop chasing quotes across emails and spreadsheets. List, find, compare, and order industrial supplies in one place.
            </motion.p>

            {/* Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1.2 }}
              className="flex gap-4"
            >
              <Button className="rounded-none bg-foreground text-background hover:bg-foreground/90 px-8 h-12 text-xs uppercase tracking-[0.15em] font-medium" onClick={() => router.push('/auth?mode=signup')}>
                Get Started
              </Button>
              <Button variant="outline" className="rounded-none border-foreground text-foreground hover:bg-foreground hover:text-background px-8 h-12 text-xs uppercase tracking-[0.15em] font-medium" onClick={() => router.push('/products')}>
                Browse Products
              </Button>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  )
}
