"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useDashboard } from "@/hooks/use-dashboard"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { AddProductDialog } from "@/components/add-product-dialog"
import { EditProfileDialog } from "@/components/edit-profile-dialog"
import { AnalyticsDialog } from "@/components/analytics-dialog"
import { useAuth } from "@/contexts/auth"
import { splitName } from "@/types/user"
import DashboardLayout from '@/components/dashboard-layout'
import { formatDateShort } from '@/lib/formatDate'
import { Package, Eye, ShoppingCart, DollarSign, ArrowUpRight } from "lucide-react"
import { motion } from "framer-motion"

function StatSkeleton() {
  return (
    <div className="glass-card p-5 animate-fade-up">
      <div className="shimmer h-3 w-16 mb-2" />
      <div className="shimmer h-8 w-24 mb-1" />
      <div className="shimmer h-2 w-20" />
    </div>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { data, error, isLoading } = useDashboard()
  const stats = data?.stats || { totalProducts: 0, productViews: 0, recentOrders: 0, revenue: 0 }
  const orders = (data?.orders || []).slice(0, 5)

  useEffect(() => { if (!user) router.push('/auth?mode=login') }, [user, router])

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="w-full space-y-6">
          <div className="shimmer h-8 w-48" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            {[1, 2, 3, 4].map(i => <StatSkeleton key={i} />)}
          </div>
          <div className="grid lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 glass-card p-5">
              <div className="shimmer h-4 w-32 mb-4" />
              <div className="space-y-3">
                {[1, 2, 3].map(i => <div key={i} className="flex gap-3"><div className="shimmer h-8 w-8 rounded-md" /><div className="flex-1 space-y-2"><div className="shimmer h-3 w-1/2" /><div className="shimmer h-2 w-1/3" /></div></div>)}
              </div>
            </div>
            <div className="glass-card p-5"><div className="shimmer h-4 w-20 mb-4" /><div className="shimmer h-8 w-8 rounded-full mb-3" /><div className="shimmer h-3 w-24 mb-2" /><div className="shimmer h-3 w-16" /></div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const tiles = [
    { icon: Package, label: 'Products', value: stats.totalProducts, variant: 'stat-primary', text: 'text-white' },
    { icon: Eye, label: 'Views', value: stats.productViews, variant: 'stat-teal', text: 'text-white' },
    { icon: ShoppingCart, label: 'Orders', value: orders.length, variant: 'stat-amber', text: 'text-white' },
    { icon: DollarSign, label: 'Revenue', value: stats.revenue > 0 ? '\u20B9' + stats.revenue.toLocaleString('en-IN') : '\u20B90', variant: 'stat-emerald', text: 'text-white' },
  ]

  return (
    <DashboardLayout>
      <div className="w-full space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Welcome back, {user?.name?.split(' ')[0] || 'User'}</p>
        </motion.div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {tiles.map((t, idx) => (
            <motion.div
              key={t.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className={t.variant + ' rounded-xl p-5 transition-all hover:translate-y-[-3px]'}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white/80 mb-1">{t.label}</p>
                  <p className="text-4xl font-bold text-white">{t.value}</p>
                </div>
                <div className="bg-white/20 p-3 rounded-xl">
                  <t.icon className="h-6 w-6 text-white" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-5">
          {/* Left */}
          <div className="lg:col-span-2 space-y-5">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Quick actions</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <AddProductDialog />
                <EditProfileDialog />
                <AnalyticsDialog />
              </div>
            </motion.div>

            {orders.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="glass-card p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-foreground">Recent orders</h3>
                  <Button variant="ghost" size="sm" onClick={() => router.push('/orders')} className="text-primary text-xs h-7">View all <ArrowUpRight className="ml-1 h-3 w-3" /></Button>
                </div>
                <div className="divide-y divide-border">
                  {orders.map((o) => (
                    <div key={o._id} className="flex items-center justify-between py-3 hover:bg-secondary/30 rounded-md px-2 -mx-2 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-secondary flex-shrink-0"><Package className="h-3.5 w-3.5 text-muted-foreground" /></div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2"><span className="text-sm font-medium text-foreground truncate">#{o._id}</span><Badge variant="secondary" className="text-xs">{o.status}</Badge></div>
                          <p className="text-xs text-muted-foreground truncate">{o.items?.[0]?.product?.name}</p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0"><p className="text-sm font-medium text-foreground">{'\u20B9' + o.totalAmount}</p><p className="text-xs text-muted-foreground">{formatDateShort(o.createdAt)}</p></div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>

          {/* Right */}
          <div className="space-y-5">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Profile</p>
              <div className="flex items-center gap-3 mb-4">
                <Avatar className="h-9 w-9"><AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">{user ? (() => { const { firstName, lastName } = splitName(user.name); return (firstName[0] + (lastName[0] || '')).toUpperCase() })() : 'U'}</AvatarFallback></Avatar>
                <div className="min-w-0"><p className="text-sm font-medium text-foreground truncate">{user?.name || 'User'}</p><p className="text-xs text-muted-foreground truncate">{user?.company?.name || 'Company not set'}</p></div>
              </div>
              <Button asChild variant="outline" size="sm" className="w-full rounded-md text-xs"><a href="/settings">Manage profile</a></Button>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="glass-card p-5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Revenue</p>
              <p className="text-2xl font-bold gradient-text">{'\u20B9' + stats.revenue.toLocaleString('en-IN')}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{stats.revenue > 0 ? 'From completed orders' : 'No revenue yet'}</p>
              <div className="mt-3 pt-3 border-t border-border space-y-2">
                <div className="flex justify-between text-xs"><span className="text-muted-foreground">Active products</span><span className="font-medium text-foreground">{stats.totalProducts}</span></div>
                <div className="flex justify-between text-xs"><span className="text-muted-foreground">Monthly views</span><span className="font-medium text-foreground">{stats.productViews}</span></div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
