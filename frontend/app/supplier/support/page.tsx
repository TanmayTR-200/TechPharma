'use client'

import Link from 'next/link'
import { Mail, Phone, MessageSquare, FileText } from 'lucide-react'
import { Footer } from '@/components/footer'

const supportOptions = [
  {
    icon: Mail,
    title: 'Email support',
    desc: 'Get a response within 24 hours',
    action: 'support@techpharma.com',
    href: 'mailto:support@techpharma.com',
  },
  {
    icon: Phone,
    title: 'Phone support',
    desc: 'Mon-Fat, 9am-6pm IST',
    action: '+91 80 4567 8900',
    href: 'tel:+918045678900',
  },
  {
    icon: MessageSquare,
    title: 'Live chat',
    desc: 'Chat with our team in real-time',
    action: 'Start chat',
    href: '/messages',
  },
]

const faqs = [
  {
    q: 'How do I list my products?',
    a: 'After your supplier account is verified, go to the Products page and click "Add product". Fill in the product details, pricing, and upload images.',
  },
  {
    q: 'When do I get paid?',
    a: 'Payments are processed within 3-5 business days after an order is marked as delivered. The amount is transferred to your registered bank account.',
  },
  {
    q: 'What are the commission rates?',
    a: 'TechPharma charges a flat 5% commission on each completed order. There are no listing fees or monthly charges.',
  },
  {
    q: 'How do I handle returns?',
    a: 'Returns are handled on a case-by-case basis. If a buyer requests a return, you\'ll receive a notification and can approve or reject it from your dashboard.',
  },
]

export default function SupplierSupportPage() {
  return (
    <div className="flex min-h-screen flex-col pt-14 relative z-10">
      <main className="flex-1 bg-secondary/30">
        <div className="container-app py-12">
          <div className="mx-auto max-w-3xl">
            <h1 className="text-2xl font-bold text-foreground">Supplier support</h1>
            <p className="mt-1 text-muted-foreground">We're here to help you succeed on TechPharma</p>

            {/* Support options */}
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {supportOptions.map((option) => {
                const Icon = option.icon
                return (
                  <Link
                    key={option.title}
                    href={option.href}
                    className="rounded-lg border border-border bg-card p-5 hover:border-emerald-300 hover:bg-primary/10"
                  >
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                      <Icon className="h-5 w-5 text-foreground" />
                    </div>
                    <h3 className="text-sm font-semibold text-foreground">{option.title}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">{option.desc}</p>
                    <p className="mt-2 text-sm font-medium text-primary">{option.action}</p>
                  </Link>
                )
              })}
            </div>

            {/* FAQs */}
            <div className="mt-12">
              <h2 className="text-lg font-bold text-foreground">Frequently asked questions</h2>
              <div className="mt-4 space-y-3">
                {faqs.map((faq) => (
                  <div key={faq.q} className="rounded-lg border border-border bg-card p-5">
                    <h3 className="text-sm font-semibold text-foreground">{faq.q}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{faq.a}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}