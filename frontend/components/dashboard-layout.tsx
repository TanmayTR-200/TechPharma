"use client"

import { useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAuth } from "@/contexts/auth"
import { splitName } from "@/types/user"
import { type ElementType } from 'react'
import {
  Package, BarChart3, ShoppingCart, Settings, LogOut, Mail, TrendingUp, Menu, X, Search
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

interface SidebarItem { icon: ElementType; label: string; href: string }

const sidebarItems: SidebarItem[] = [
  { icon: BarChart3, label: "Dashboard", href: "/dashboard" },
  { icon: Package, label: "Products", href: "/products" },
  { icon: ShoppingCart, label: "Orders", href: "/orders" },
  { icon: TrendingUp, label: "Sales", href: "/sales" },
  { icon: Search, label: "Track Order", href: "/orders/track" },
  { icon: Mail, label: "Messages", href: "/messages" },
  { icon: Settings, label: "Settings", href: "/settings" },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth()
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-screen relative z-10">
      <button
        className="fixed top-16 left-3 z-50 lg:hidden flex items-center justify-center h-9 w-9 bg-card border border-border"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </button>

      {mobileOpen && <div className="fixed inset-0 z-30 bg-black/30 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} />}

      <aside className={"fixed inset-y-0 left-0 z-40 w-56 bg-card border-r border-border transition-transform duration-200 lg:translate-x-0 " + (mobileOpen ? 'translate-x-0' : '-translate-x-full') + " pt-14"}>
        <nav className="px-3 py-4 space-y-0.5">
          {sidebarItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/orders' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={"flex items-center gap-2.5 px-3 py-2 text-sm transition-colors " + (isActive ? "bg-secondary text-foreground font-medium" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50")}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 border-t border-border p-3">
          <div className="flex items-center gap-2 px-2 py-2 mb-1">
            <Avatar className="w-8 h-8">
              <AvatarImage src="/placeholder-user.jpg" />
              <AvatarFallback className="bg-secondary text-foreground text-xs font-medium">
                {user ? (() => {
                  const { firstName, lastName } = splitName(user.name)
                  return (firstName[0] + (lastName[0] || '')).toUpperCase()
                })() : 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{user ? user.name : 'User'}</p>
              {user && user.company && user.company.name ? <p className="text-xs text-muted-foreground truncate">{user.company.name}</p> : null}
            </div>
          </div>
          <button onClick={() => logout()} className="flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium w-full bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors">
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>

      <div className="lg:pl-56 relative z-10">
        <main className="w-full p-4 sm:px-6 lg:px-8 pt-[88px] pb-6 min-h-screen">
          {children}
        </main>
      </div>
    </div>
  )
}
