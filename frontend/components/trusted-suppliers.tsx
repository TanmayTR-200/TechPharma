"use client"

import { Users, Package } from "lucide-react"
import { useEffect, useState } from "react"
import { Reveal } from "@/components/reveal"

export function TrustedSuppliers() {
  const [supplierCount, setSupplierCount] = useState<number | null>(null)
  const [productCount, setProductCount] = useState<number | null>(null)

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const res = await fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000') + '/api/products/category-counts')
        const data = await res.json()
        if (data.success && data.counts) {
          const total = Object.values(data.counts).reduce((a: number, b: any) => a + Number(b), 0)
          setProductCount(total)
        }
      } catch (e) {
        // fallback
      }
    }
    fetchCounts()
  }, [])

  return (
    <section className="py-16 border-t border-border">
      <div className="max-w-3xl mx-auto px-4">
        <Reveal>
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-2">A growing marketplace</h2>
            <p className="text-sm text-muted-foreground">Real numbers from our platform</p>
          </div>
        </Reveal>

        <div className="grid grid-cols-2 gap-6">
          <Reveal delay={0.1}>
            <div className="text-center p-8 rounded-2xl border border-border bg-card">
              <div className="flex h-11 w-11 mx-auto mb-4 items-center justify-center rounded-xl bg-primary/10">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div className="text-3xl font-bold text-foreground">
                {productCount !== null ? productCount : '-'}
              </div>
              <p className="text-sm text-muted-foreground mt-1">Products Listed</p>
            </div>
          </Reveal>

          <Reveal delay={0.2}>
            <div className="text-center p-8 rounded-2xl border border-border bg-card">
              <div className="flex h-11 w-11 mx-auto mb-4 items-center justify-center rounded-xl bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div className="text-3xl font-bold text-foreground">Growing</div>
              <p className="text-sm text-muted-foreground mt-1">Supplier Community</p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
