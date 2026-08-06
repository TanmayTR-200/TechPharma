'use client'

import { useEffect, useState } from 'react'
import { TrendingUp, Package, DollarSign, ShoppingCart } from 'lucide-react'
import DashboardLayout from '@/components/dashboard-layout'

interface SalesStats {
  totalRevenue: number
  totalOrders: number
  avgOrderValue: number
}

interface TopProduct {
  name: string
  sold: number
  revenue: number
}

export default function SalesPage() {
  const [stats, setStats] = useState<SalesStats>({
    totalRevenue: 0,
    totalOrders: 0,
    avgOrderValue: 0,
  })
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchSales() {
      try {
        const token = localStorage.getItem('token')
        if (!token) {
          setLoading(false)
          return
        }

        const res = await fetch('/api/dashboard/analytics', {
          headers: { 'Authorization': `Bearer ${token}` },
        })
        if (res.ok) {
          const data = await res.json()
          setStats({
            totalRevenue: data.totalRevenue || 0,
            totalOrders: data.totalOrders || 0,
            avgOrderValue: data.avgOrderValue || 0,
          })
          if (data.topProducts) {
            setTopProducts(data.topProducts)
          }
        }
      } catch (err) {
        // Silent fail
      } finally {
        setLoading(false)
      }
    }
    fetchSales()
  }, [])

  const statCards = [
    { label: 'Total revenue', value: `₹${stats.totalRevenue.toLocaleString('en-IN')}`, icon: DollarSign },
    { label: 'Total orders', value: stats.totalOrders.toString(), icon: ShoppingCart },
    { label: 'Avg. order value', value: `₹${stats.avgOrderValue.toFixed(0)}`, icon: TrendingUp },
  ]

  return (
    <DashboardLayout>
      <div className="w-full space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Sales</h1>
          <p className="mt-1 text-muted-foreground">Track your revenue and sales performance</p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          {statCards.map((stat) => {
            const Icon = stat.icon
            return (
              <div key={stat.label} className="rounded-lg border border-border bg-card p-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{stat.label}</span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
                <p className="mt-3 text-2xl font-bold text-foreground">
                  {loading ? '...' : stat.value}
                </p>
              </div>
            )
          })}
        </div>

        {/* Top products */}
        <div className="rounded-lg border border-border bg-card p-5">
          <h2 className="mb-4 text-base font-semibold text-foreground">Top selling products</h2>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : topProducts.length > 0 ? (
            <div className="space-y-3">
              {topProducts.map((product, i) => (
                <div key={product.name} className="flex items-center justify-between border-b border-border pb-3 last:border-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-xs font-bold text-muted-foreground">
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-foreground">{product.name}</p>
                      <p className="text-xs text-muted-foreground">{product.sold} units sold</p>
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-foreground">₹{product.revenue.toLocaleString('en-IN')}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No sales data available yet.</p>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}