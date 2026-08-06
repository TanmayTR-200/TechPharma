'use client'

import { TrendingUp, Eye, MousePointerClick, ShoppingCart } from 'lucide-react'
import { Footer } from '@/components/footer'

const stats = [
  { label: 'Product views', value: '12,450', change: '+18%', icon: Eye },
  { label: 'Click-through rate', value: '4.2%', change: '+0.5%', icon: MousePointerClick },
  { label: 'Conversion rate', value: '2.8%', change: '+0.3%', icon: ShoppingCart },
  { label: 'Revenue', value: '₹4.2L', change: '+12%', icon: TrendingUp },
]

const tips = [
  {
    title: 'Add clear product images',
    desc: 'Products with high-quality images get 3x more views. Upload multiple angles and include packaging shots.',
  },
  {
    title: 'Write detailed descriptions',
    desc: 'Include dosage, ingredients, and usage instructions. Detailed listings convert 40% better than minimal ones.',
  },
  {
    title: 'Set competitive prices',
    desc: 'Check similar products on the platform and price competitively. Buyers often sort by price.',
  },
  {
    title: 'Keep stock updated',
    desc: 'Out-of-stock products lose ranking. Update your inventory regularly to maintain visibility.',
  },
]

export default function SupplierMarketingPage() {
  return (
    <div className="flex min-h-screen flex-col pt-14 relative z-10">
      <main className="flex-1 bg-secondary/30">
        <div className="container-app py-12">
          <h1 className="text-2xl font-bold text-foreground">Marketing tools</h1>
          <p className="mt-1 text-muted-foreground">Track your store performance and improve visibility</p>

          {/* Stats */}
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => {
              const Icon = stat.icon
              return (
                <div key={stat.label} className="rounded-lg border border-border bg-card p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{stat.label}</span>
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                  <p className="mt-3 text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="mt-1 text-xs text-primary">{stat.change} vs last month</p>
                </div>
              )
            })}
          </div>

          {/* Tips */}
          <div className="mt-8">
            <h2 className="text-lg font-bold text-foreground">Tips to boost sales</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {tips.map((tip) => (
                <div key={tip.title} className="rounded-lg border border-border bg-card p-5">
                  <h3 className="text-sm font-semibold text-foreground">{tip.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{tip.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}