"use client"

import { useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAuth } from "@/contexts/auth"
import { splitName } from "@/types/user"
import { type ElementType } from 'react';
import {
  Package,
  BarChart3,
  ShoppingCart,
  Settings,
  LogOut,
  Mail,
  TrendingUp
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { usePathname } from "next/navigation"

interface SidebarItem {
  icon: ElementType;
  label: string;
  href: string;
  roles?: string[];
}

const sidebarItems: SidebarItem[] = [
  { icon: BarChart3, label: "Dashboard", href: "/dashboard" },
  { icon: Package, label: "Products", href: "/products" },
  { icon: ShoppingCart, label: "Orders", href: "/orders" },
  { icon: TrendingUp, label: "Sales Tracking", href: "/sales", roles: ["supplier"] },
  { icon: Package, label: "Sold Products", href: "/sold-products", roles: ["supplier"] },
  { icon: Mail, label: "Messages", href: "/messages" },
  { icon: Settings, label: "Profile Settings", href: "/settings" },
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, logout } = useAuth()
  const pathname = usePathname()

  const handleLogout = () => {
    logout();
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="fixed inset-y-0 left-0 z-40 w-64 bg-zinc-900 border-r border-zinc-800 lg:block hidden pt-14">
        <div className="flex flex-col h-full">
          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {sidebarItems.map((item) => {
              // Skip menu items that are role-restricted and user doesn't have the role
              if (item.roles && (!user || !item.roles.includes(user.role))) {
                return null;
              }
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    pathname === item.href 
                      ? "bg-blue-600 text-white" 
                      : "text-gray-300 hover:bg-zinc-800 hover:text-white"
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* User Profile and Logout */}
          <div className="mt-auto">
            <div className="p-4 border-t border-zinc-800">
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarImage src="/placeholder-user.jpg" />
                  <AvatarFallback className="bg-zinc-800 text-white">
                    {user ? (() => {
                      const { firstName, lastName } = splitName(user.name);
                      return `${firstName[0]}${lastName[0] || ''}`.toUpperCase()
                    })() : 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {user ? user.name : 'User'}
                  </p>
                  {user?.company?.name && (
                    <p className="text-xs text-gray-400 truncate">
                      {user.company.name}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium w-full bg-red-600 text-white hover:bg-red-700 transition-colors mt-4"
              >
                <LogOut className="w-5 h-5" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="lg:pl-64">
        <main className="p-4 md:p-6 lg:p-8 bg-white mt-14">
          {children}
        </main>
      </div>
    </div>
  )
}
