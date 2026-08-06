"use client"

import { useAuth } from "@/contexts/auth"
import DashboardLayout from "@/components/dashboard-layout"

export default function ProductsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-[3px] border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (user) {
    return <DashboardLayout>{children}</DashboardLayout>
  }

  return <div className="pt-[88px]">{children}</div>
}
