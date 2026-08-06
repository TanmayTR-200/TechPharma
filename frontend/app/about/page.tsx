"use client"

import { Footer } from "@/components/footer"
import { CheckCircle2 } from "lucide-react"

const features = [
  "Verified suppliers",
  "Secure payments",
  "Direct messaging",
  "Bulk pricing",
]

export default function AboutPage() {
  return (
    <div className="min-h-screen relative z-10 pt-16">
      <main className="max-w-2xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-2">About TechPharma</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            TechPharma is a B2B marketplace where suppliers list products and buyers find them. We verify suppliers, handle payments, and let you focus on business.
          </p>
        </div>

        <div className="bg-card border border-border rounded-lg p-5 mb-4">
          <h2 className="text-sm font-semibold text-foreground mb-2">How it works</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Suppliers create an account, list their products with photos and pricing, and receive orders from buyers. Buyers search for products, compare prices, and contact suppliers directly.
          </p>
        </div>

        <div className="bg-card border border-border rounded-lg p-5 mb-4">
          <h2 className="text-sm font-semibold text-foreground mb-3">What you get</h2>
          <div className="space-y-2">
            {features.map((f) => (
              <div key={f} className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                <span className="text-sm text-foreground">{f}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-5 text-center">
          <p className="text-sm text-foreground mb-3">Ready to start?</p>
          <a href="/auth?mode=signup" className="inline-flex items-center justify-center bg-primary hover:bg-primary/90 text-primary-foreground font-medium px-4 py-2 rounded-md text-sm transition-colors">
            Create an account
          </a>
        </div>
      </main>
      <Footer />
    </div>
  )
}