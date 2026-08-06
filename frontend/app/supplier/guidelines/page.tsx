'use client'

import { Package, DollarSign, Truck, Shield, FileText, AlertCircle } from 'lucide-react'
import { Footer } from '@/components/footer'

const sections = [
  {
    icon: Package,
    title: 'Product listing rules',
    items: [
      'Only list products that you are licensed to sell',
      'Include accurate product names, specifications, and descriptions',
      'Upload clear product images with packaging visible',
      'Do not list expired or near-expiry products (less than 6 months)',
    ],
  },
  {
    icon: DollarSign,
    title: 'Pricing guidelines',
    items: [
      'Prices must be inclusive of all taxes (GST)',
      'Offer competitive pricing compared to market rates',
      'No hidden charges. All costs must be transparent',
      'Bulk discounts are encouraged for large orders',
    ],
  },
  {
    icon: Truck,
    title: 'Fulfillment standards',
    items: [
      'Ship orders within 48 hours of receiving them',
      'Use secure packaging for all products',
      'Provide tracking information once the order is shipped',
      'Ensure proper handling for sensitive products',
    ],
  },
  {
    icon: Shield,
    title: 'Quality and compliance',
    items: [
      'All products must comply with applicable regulations',
      'Maintain proper storage conditions as per product type',
      'Keep batch numbers and expiry dates updated in the system',
      'Report any quality issues or recalls immediately',
    ],
  },
]

export default function SupplierGuidelinesPage() {
  return (
    <div className="flex min-h-screen flex-col pt-14 relative z-10">
      <main className="flex-1 bg-secondary/30">
        <div className="container-app py-12">
          <div className="mx-auto max-w-3xl">
            <h1 className="text-2xl font-bold text-foreground">Supplier guidelines</h1>
            <p className="mt-1 text-muted-foreground">Rules and best practices for selling on TechPharma</p>

            {/* Important notice */}
            <div className="mt-8 flex items-start gap-4 rounded-lg border border-amber-200 bg-amber-50 p-5">
              <AlertCircle className="h-5 w-5 shrink-0 text-amber-600" />
              <div>
                <h2 className="text-sm font-semibold text-foreground">Important</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Failure to follow these guidelines may result in account suspension or permanent removal from the platform.
                </p>
              </div>
            </div>

            {/* Guidelines */}
            <div className="mt-8 space-y-6">
              {sections.map((section) => {
                const Icon = section.icon
                return (
                  <div key={section.title} className="rounded-lg border border-border bg-card p-6">
                    <div className="mb-4 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <h2 className="text-base font-semibold text-foreground">{section.title}</h2>
                    </div>
                    <ul className="space-y-2">
                      {section.items.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              })}
            </div>

            {/* Contact */}
            <div className="mt-8 rounded-lg border border-border bg-card p-6 text-center">
              <FileText className="mx-auto h-8 w-8 text-muted-foreground/60" />
              <h2 className="mt-3 text-base font-semibold text-foreground">Have questions?</h2>
              <p className="mt-1 text-sm text-muted-foreground">Our team is here to help you understand the guidelines.</p>
              <a
                href="/supplier/support"
                className="mt-4 inline-block rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
              >
                Contact support
              </a>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}