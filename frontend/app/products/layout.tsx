"use client"

import { useAuth } from "@/contexts/auth"
import { SkeletonLoader } from "@/components/skeleton-loader"
import DashboardLayout from "@/components/dashboard-layout"

export default function ProductsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="pt-14 min-h-screen">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <SkeletonLoader type="products" />
        </div>
      </div>
    )
  }

  if (user) {
    return <DashboardLayout>{children}</DashboardLayout>
  }

  return <div className="pt-[88px] px-6 sm:px-8 max-w-7xl mx-auto">{children}</div>
}
