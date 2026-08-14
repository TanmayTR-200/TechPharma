"use client"

import { useRef } from "react"
import { motion, useScroll, useTransform } from "framer-motion"

const features = [
  {
    heading: "Verify before you buy",
    body: "Every supplier on TechPharma is verified. Check product details, compare prices, and contact sellers directly before committing to a purchase.",
  },
  {
    heading: "Order in seconds",
    body: "Add products to cart, choose your payment method, and place orders. Suppliers receive them instantly and start processing right away.",
  },
  {
    heading: "Track everything",
    body: "Monitor your orders, sales, and inventory from a single dashboard. Real-time stock updates prevent overselling, even under high demand.",
  },
  {
    heading: "Built for scale",
    body: "Concurrency-safe inventory reservations, idempotent checkout, and rate-limited auth. Your marketplace stays reliable as it grows.",
  },
]

const marqueeText = "Verified suppliers. Real-time inventory. Secure checkout. Direct messaging. Concurrency-safe reservations. Idempotent orders. Built for B2B."

export function FeatureShowcase() {
  return (
    <section className="relative py-24 overflow-hidden">
      {/* Scroll-linked text features */}
      <div className="max-w-3xl mx-auto px-6 mb-20">
        <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-2">How it works</p>
        <div className="space-y-1">
          {features.map((feature, idx) => (
            <ScrollFeature key={idx} feature={feature} />
          ))}
        </div>
      </div>

      {/* Scrolling marquee */}
      <div className="relative overflow-hidden border-y border-border py-4">
        <div
          className="whitespace-nowrap"
          style={{ animation: "marquee 30s linear infinite" }}
        >
          <span className="font-display text-lg text-muted-foreground/40 mr-8">{marqueeText}</span>
          <span className="font-display text-lg text-muted-foreground/40 mr-8">{marqueeText}</span>
        </div>
      </div>

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </section>
  )
}

function ScrollFeature({ feature }: { feature: { heading: string; body: string } }) {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start center", "end center"],
  })

  // Full opacity when the element is centered in the viewport
  // Fades to 0.3 as it enters from below or exits above
  const opacity = useTransform(scrollYProgress, [0, 0.5, 1], [0.3, 1, 0.3])
  const y = useTransform(scrollYProgress, [0, 0.5, 1], [30, 0, -30])

  return (
    <motion.div ref={ref} style={{ opacity, y }} className="border-b border-border py-8">
      <h3 className="font-display text-2xl font-bold text-foreground mb-2">{feature.heading}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed max-w-lg">{feature.body}</p>
    </motion.div>
  )
}
