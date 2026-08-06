"use client"

import { Button } from "@/components/ui/button"
import { ArrowRight, CheckCircle2 } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/contexts/auth"
import { Reveal } from "@/components/reveal"

const benefits = ["Free to sign up", "Verified suppliers only", "Secure payments", "24/7 support"]

export function CTABanner() {
  const { user } = useAuth()

  return (
    <section className="py-20 border-t border-border">
      <div className="max-w-6xl mx-auto px-4">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-8 lg:p-16 text-center">
            {/* Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 h-64 w-64 rounded-full opacity-30" style={{ background: `radial-gradient(ellipse at center, hsl(38 92% 52% / 0.2), transparent 70%)` }} />

            <div className="relative">
              <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-3">Ready to grow your business?</h2>
              <p className="text-muted-foreground text-lg max-w-lg mx-auto mb-6">
                Join thousands of businesses sourcing quality products from verified suppliers on TechPharma.
              </p>
              <div className="flex flex-wrap justify-center gap-4 mb-8">
                {benefits.map((b) => (
                  <div key={b} className="flex items-center gap-1.5 text-muted-foreground text-sm">
                    <CheckCircle2 className="h-4 w-4 text-primary" />{b}
                  </div>
                ))}
              </div>
              <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg px-8 shadow-lg shadow-primary/20">
                <Link href={user ? "/dashboard" : "/auth?mode=signup"}>
                  {user ? "Go to Dashboard" : "Start Free Today"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
