"use client"

import { useRef, useState, useEffect } from "react"
import { useScroll, useMotionValueEvent } from "framer-motion"

interface Product {
  _id: string
  name: string
  images: string[]
  price: number
  supplierName: string
}

export function ProductCarousel3D() {
  const sectionRef = useRef(null)
  const [activeIdx, setActiveIdx] = useState(0)
  const [progress, setProgress] = useState(0)
  const [products, setProducts] = useState<Product[]>([])

  useEffect(() => {
    fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000') + '/api/products/all')
      .then(r => r.json())
      .then(data => {
        if (data.success && data.products) setProducts(data.products)
      })
      .catch(() => {})
  }, [])

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  })

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    setProgress(latest)
    const idx = Math.min(products.length - 1, Math.max(0, Math.round(latest * (products.length - 1))))
    setActiveIdx(idx)
  })

  const total = products.length || 1
  const scrollHeight = `${total * 100}vh`

  function getCardStyle(idx: number) {
    if (total <= 1) return { transform: "translate(-50%, -50%)", opacity: 1, zIndex: 1 }
    const segmentSize = 1 / (total - 1)
    const cardCenter = idx * segmentSize
    const distance = progress - cardCenter

    const xPercent = distance * -45
    const opacity = Math.max(0, 1 - Math.abs(distance) * 2.5)
    const scale = 1 - Math.abs(distance) * 0.1
    const z = activeIdx === idx ? total : total - Math.abs(activeIdx - idx)

    return {
      transform: `translate(-50%, -50%) translateX(${xPercent}vw) scale(${scale})`,
      opacity,
      zIndex: z,
    }
  }

  // Section border-radius: starts at 40px, gradually sharpens to 0px as you scroll
  // Smooth linear decrease across the full scroll range
  const sectionRadius = `${Math.max(0, 40 - progress * 40)}px`

  return (
    <section
      ref={sectionRef}
      className="relative bg-foreground mt-8"
      style={{
        height: scrollHeight,
        borderRadius: sectionRadius,
        zIndex: 1,
      }}
    >
      {/* Sticky pinned div — also gets the radius */}
      <div
        className="sticky top-0 h-screen w-full flex flex-col items-center justify-center overflow-hidden"
        style={{
          position: "sticky",
          borderRadius: sectionRadius,
        }}
      >
        {/* Heading — NO eyebrow text */}
        <div className="absolute top-[12%] left-0 right-0 text-center z-30 pointer-events-none px-6">
          <h2 className="font-display text-3xl md:text-5xl font-bold text-background">
            Our <span className="italic">products.</span>
          </h2>
        </div>

        {/* Card stack */}
        {products.length > 0 && (
        <div className="relative w-[300px] h-[400px] z-20">
          {products.map((product, idx) => (
            <div
              key={product._id || idx}
              style={getCardStyle(idx)}
              className="absolute left-1/2 top-1/2 w-full h-full"
            >
              <div className="w-full h-full bg-background border border-border/20 overflow-hidden shadow-2xl flex flex-col rounded-2xl">
                <div className="flex-1 overflow-hidden bg-secondary min-h-0">
                  <img
                    src={product.images?.[0] || '/placeholder.svg'}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-5 shrink-0 text-foreground">
                  <p className="font-display text-lg font-bold">{product.name}</p>
                  <div className="mt-2">
                    <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">{product.supplierName || 'Seller'}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        )}

        {/* Progress dots */}
        <div className="absolute bottom-[12%] left-1/2 -translate-x-1/2 flex gap-2 z-30">
          {products.map((_, idx) => (
            <div
              key={idx}
              className={`h-1 transition-all duration-300 rounded-full ${
                activeIdx === idx ? "w-8 bg-background" : "w-2 bg-background/30"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
