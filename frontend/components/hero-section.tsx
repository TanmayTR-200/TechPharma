"use client"

import { useState } from "react"
import { Search, ArrowRight, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useProductNavigation } from "@/hooks/use-product-navigation"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth"
import { motion, useScroll, useTransform } from "framer-motion"
import { useRef } from "react"

export function HeroSection() {
  const [query, setQuery] = useState("")
  const { navigateToProducts } = useProductNavigation()
  const router = useRouter()
  const { user } = useAuth()
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] })
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "10%"])
  const opacity = useTransform(scrollYProgress, [0, 1], [1, 0])

  const handleSearch = () => {
    if (query.trim()) navigateToProducts({ search: query.trim() })
    else navigateToProducts({})
  }

  if (user) {
    return (
      <section ref={ref} className="pt-20 pb-10 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div style={{ y, opacity }}>
            <p className="text-sm text-muted-foreground mb-1">Welcome back</p>
            <h1 className="text-3xl font-bold mb-6">{user.name}</h1>
            <div className="flex gap-2 max-w-lg mb-8">
              <Input type="search" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} placeholder="Search suppliers and products..." className="h-11 rounded-lg glass-card border-border text-foreground placeholder:text-muted-foreground focus:border-primary/50" />
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg h-11 px-4 shadow-lg shadow-primary/20" onClick={handleSearch}><Search className="h-4 w-4" /></Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => router.push('/dashboard')} className="glass-card px-3 py-1.5 text-sm text-foreground hover:translate-y-[-3px] transition-all">Dashboard</button>
              <button onClick={() => router.push('/orders')} className="glass-card px-3 py-1.5 text-sm text-foreground hover:translate-y-[-3px] transition-all">Orders</button>
              <button onClick={() => router.push('/products')} className="glass-card px-3 py-1.5 text-sm text-foreground hover:translate-y-[-3px] transition-all">Browse all</button>
            </div>
          </motion.div>
        </div>
      </section>
    )
  }

  return (
    <section ref={ref} className="min-h-[60vh] flex items-center justify-center pt-16 relative z-10">
      <motion.div style={{ y, opacity }} className="max-w-2xl mx-auto px-6 text-center">
        <div className="inline-flex items-center gap-2 rounded-full glass-card px-3 py-1 text-xs font-medium text-primary mb-6">
          <Sparkles className="h-3 w-3" /> B2B marketplace for verified suppliers
        </div>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-[1.1]">
          Find industrial suppliers
          <br />
          <span className="gradient-text">for your business.</span>
        </h1>
        <p className="text-base md:text-lg text-muted-foreground mt-5 max-w-lg mx-auto leading-relaxed">
          Search machinery, safety equipment, electronics, and more. Compare prices, request quotes, and order directly from verified suppliers.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg px-6 h-11 shadow-lg shadow-primary/25" onClick={() => router.push('/auth?mode=signup')}>
            Get Started <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
          <Button variant="outline" className="glass-card border-border text-foreground hover:bg-secondary/50 rounded-lg h-11" onClick={() => router.push('/products')}>
            Browse Products
          </Button>
        </div>
      </motion.div>
    </section>
  )
}
