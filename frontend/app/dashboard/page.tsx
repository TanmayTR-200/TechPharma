"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useDashboard } from "@/hooks/use-dashboard"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { AddProductDialog } from "@/components/add-product-dialog"
import { EditProfileDialog } from "@/components/edit-profile-dialog"
import { AnalyticsDialog } from "@/components/analytics-dialog"
import { useAuth } from "@/contexts/auth"
import { splitName } from "@/types/user"
import { SkeletonLoader } from "@/components/skeleton-loader"
import DashboardLayout from '@/components/dashboard-layout'
import { formatDateShort } from '@/lib/formatDate'
import { Package, Eye, ShoppingCart, IndianRupee, TrendingUp, Users, ShieldCheck } from "lucide-react"
import { motion } from "framer-motion"

function StatSkeleton() {
  return (
    <div className="border border-border p-5 animate-fade-up">
      <div className="shimmer h-3 w-16 mb-2" />
      <div className="shimmer h-8 w-24 mb-1" />
      <div className="shimmer h-2 w-20" />
    </div>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { data, error, isLoading, mutate } = useDashboard()
  const stats = data?.stats || { totalProducts: 0, productViews: 0, recentOrders: 0, revenue: 0 }
  const activity = (data?.activity || []).slice(0, 6)

  const isAdmin = user?.role === 'admin' || user?.email === 'techpharma10@gmail.com'
  const adminStats = data?.admin?.stats
  const recentUsers = data?.admin?.recentUsers || []

  useEffect(() => { if (!user) router.push('/auth?mode=login') }, [user, router])

  useEffect(() => {
    const handleProductAdded = () => {
      mutate()
    }
    const handleProductDeleted = () => {
      mutate()
    }
    window.addEventListener('product-added', handleProductAdded)
    window.addEventListener('product-deleted', handleProductDeleted)
    return () => {
      window.removeEventListener('product-added', handleProductAdded)
      window.removeEventListener('product-deleted', handleProductDeleted)
    }
  }, [mutate])

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="w-full space-y-6">
          <div className="shimmer h-8 w-48" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            {[1, 2, 3, 4].map(i => <StatSkeleton key={i} />)}
          </div>
          <div className="grid lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 border border-border p-5">
              <div className="shimmer h-4 w-32 mb-4" />
              <div className="space-y-3">
                {[1, 2, 3].map(i => <div key={i} className="flex gap-3"><div className="shimmer h-8 w-8 rounded-md" /><div className="flex-1 space-y-2"><div className="shimmer h-3 w-1/2" /><div className="shimmer h-2 w-1/3" /></div></div>)}
              </div>
            </div>
            <div className="border border-border p-5"><div className="shimmer h-4 w-20 mb-4" /><div className="shimmer h-8 w-8 rounded-full mb-3" /><div className="shimmer h-3 w-24 mb-2" /><div className="shimmer h-3 w-16" /></div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const tiles = isAdmin && adminStats
    ? [
        { icon: Users, label: 'Users', value: adminStats.totalUsers, variant: 'bg-foreground text-background', text: 'text-background' },
        { icon: Package, label: 'Products', value: adminStats.totalProducts, variant: 'bg-foreground text-background', text: 'text-background' },
        { icon: ShoppingCart, label: 'Orders', value: adminStats.totalOrders, variant: 'bg-foreground text-background', text: 'text-background' },
        { icon: IndianRupee, label: 'Revenue', value: '\u20B9' + adminStats.platformRevenue.toLocaleString('en-IN'), variant: 'bg-foreground text-background', text: 'text-background' },
      ]
    : [
        { icon: Package, label: 'Products', value: stats.totalProducts, variant: 'bg-foreground text-background', text: 'text-background' },
        { icon: Eye, label: 'Views', value: stats.productViews, variant: 'bg-foreground text-background', text: 'text-background' },
        { icon: ShoppingCart, label: 'Orders', value: stats.recentOrders, variant: 'bg-foreground text-background', text: 'text-background' },
        { icon: IndianRupee, label: 'Revenue', value: stats.revenue > 0 ? '\u20B9' + stats.revenue.toLocaleString('en-IN') : '\u20B90', variant: 'bg-foreground text-background', text: 'text-background' },
      ]

  return (
    <DashboardLayout>
      <div className="w-full space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-3">Dashboard
            {isAdmin && <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium"><ShieldCheck className="h-3 w-3" />Admin</span>}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Welcome back, {isAdmin ? 'Admin' : user?.name?.split(' ')[0] || 'User'}</p>
        </motion.div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {tiles.map((t, idx) => (
            <motion.div
              key={t.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className={t.variant + ' p-5 transition-colors'}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-background/70 mb-1">{t.label}</p>
                  <p className="font-display text-4xl font-bold text-background">{t.value}</p>
                </div>
                <div className="bg-background/20 p-3">
                  <t.icon className="h-6 w-6 text-background" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-5">
          {/* Left */}
          <div className="lg:col-span-2 space-y-5">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="border border-border p-5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Quick actions</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <AddProductDialog />
                <EditProfileDialog />
                <AnalyticsDialog />
              </div>
            </motion.div>

            {activity.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="border border-border p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-foreground">Recent notifications</h3>
                </div>
                <div className="divide-y divide-border max-h-80 overflow-y-auto pr-1">
                  {activity.map((n) => (
                    <button
                      key={n.id + '-' + n.type}
                      onClick={() => router.push(n.type === 'sale' ? '/sales' : '/orders')}
                      className="w-full text-left flex items-center justify-between py-3 hover:bg-secondary/30 rounded-md px-2 -mx-2 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={'flex h-8 w-8 items-center justify-center rounded-md flex-shrink-0 ' + (n.type === 'sale' ? 'bg-emerald-500/15 text-emerald-600' : 'bg-sky-500/15 text-sky-600')}>
                          {n.type === 'sale' ? <TrendingUp className="h-3.5 w-3.5" /> : <ShoppingCart className="h-3.5 w-3.5" />}
                        </div>
                        <div className="min-w-0">
                          <span className={'inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full mb-1 ' + (n.type === 'sale' ? 'bg-emerald-500/15 text-emerald-600' : 'bg-sky-500/15 text-sky-600')}>{n.type === 'sale' ? 'New sale' : 'Order placed'}</span>
                          <p className="text-sm font-medium text-foreground truncate">{n.product}{n.itemCount > 1 ? ' (+' + (n.itemCount - 1) + ' more)' : ''}</p>
                          <p className="text-xs text-muted-foreground truncate">{n.type === 'sale' && n.counterparty ? 'From ' + n.counterparty : 'Your purchase'}</p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-3">
                        <p className="text-sm font-medium text-foreground">{'\u20B9' + Number(n.amount || 0).toLocaleString('en-IN')}</p>
                        <p className="text-xs text-muted-foreground">{formatDateShort(n.createdAt)}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {isAdmin && recentUsers.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="border border-border p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-foreground">Recent users</h3>
                  <span className="text-xs text-muted-foreground">Platform</span>
                </div>
                <div className="divide-y divide-border max-h-72 overflow-y-auto pr-1">
                  {recentUsers.map((u) => (
                    <div key={u._id} className="flex items-center justify-between py-2.5">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="h-8 w-8"><AvatarFallback className="bg-secondary text-muted-foreground text-xs">{(() => { const { firstName, lastName } = splitName(u.name); return (firstName[0] || '') + (lastName[0] || '') })()}</AvatarFallback></Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{u.name}{u.company ? <span className="text-xs text-muted-foreground"> · {u.company}</span> : null}</p>
                          <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-3">
                        <span className={'inline-flex items-center text-xs px-2 py-0.5 rounded-full ' + (u.role === 'admin' ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground')}>{u.role === 'admin' ? 'Admin' : 'User'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>

          {/* Right */}
          <div className="space-y-5">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="border border-border p-5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Profile</p>
              <div className="flex items-center gap-3 mb-4">
                <Avatar className="h-9 w-9"><AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">{user ? (() => { const { firstName, lastName } = splitName(user.name); return (firstName[0] + (lastName[0] || '')).toUpperCase() })() : 'U'}</AvatarFallback></Avatar>
                <div className="min-w-0"><p className="text-sm font-medium text-foreground truncate">{user?.name || 'User'}{isAdmin && <span className="ml-1.5 inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium"><ShieldCheck className="h-2.5 w-2.5" />Admin</span>}</p><p className="text-xs text-muted-foreground truncate">{user?.company?.name || 'Company not set'}</p></div>
              </div>
              <Button asChild variant="outline" size="sm" className="w-full rounded-md text-xs"><a href="/settings">Manage profile</a></Button>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="border border-border p-5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Revenue</p>
              <p className="text-2xl font-bold text-foreground font-display">{'\u20B9' + stats.revenue.toLocaleString('en-IN')}</p>
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
