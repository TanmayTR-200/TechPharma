"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useDashboard } from "@/hooks/use-dashboard"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

import { AddProductDialog } from "@/components/add-product-dialog"
import { EditProfileDialog } from "@/components/edit-profile-dialog"
import { AnalyticsDialog } from "@/components/analytics-dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useAuth } from "@/contexts/auth"
import { useProduct } from "@/contexts/product-context"
import { splitName } from "@/types/user"
import DashboardLayout from '@/components/dashboard-layout'
import { formatDateShort } from '@/lib/formatDate'
import { Package, Eye, Mail, DollarSign } from "lucide-react"

// Response Types
interface DashboardResponse {
  success: boolean;
  data: {
    stats: DashboardStats;
    orders: Order[];
  };
  error?: string;
}

interface DashboardErrorResponse {
  error: string;
  message?: string;
  details?: string;
}

// Data Types
interface Order {
  _id: string
  user: string
  items: Array<{
    product: {
      name: string
      _id: string
    }
    quantity: number
    price: number
  }>
  totalAmount: number
  status: string
  createdAt: string
  paymentDetails: {
    status: string
    method: string
  }
}

interface DashboardStats {
  totalProducts: number
  productViews: number
  recentOrders: number
  revenue: number
}

export default function DashboardPage() {
  const { user } = useAuth()
  const { userProducts } = useProduct()
  const router = useRouter()
  const { data, error, isLoading } = useDashboard()

  const stats = data?.stats || {
    totalProducts: 0,
    productViews: 0,
    recentOrders: 0,
    revenue: 0
  }
  
  // Get only the 5 most recent orders
  const orders = (data?.orders || []).slice(0, 5)

  useEffect(() => {
    if (!user) {
      router.push('/auth?mode=login');
    }
  }, [user, router]);

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <span className="text-red-600 text-2xl">!</span>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">Error Loading Dashboard</h3>
          <p className="text-sm text-gray-500">{error instanceof Error ? error.message : String(error)}</p>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => window.location.reload()}
          >
            Try Again
          </Button>
        </div>
      </DashboardLayout>
    )
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center p-8">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600">Loading dashboard data...</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-8 p-6 md:p-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              id: 'products',
              title: 'Your Active Products',
              icon: <Package className="h-4 w-4 text-gray-400" />,
              value: stats.totalProducts,
              description: stats.totalProducts === 0 
                ? "No products listed yet"
                : `${stats.totalProducts} active product${stats.totalProducts === 1 ? '' : 's'}`
            },
            {
              id: 'views',
              title: "This Month's Views",
              icon: <Eye className="h-4 w-4 text-gray-400" />,
              value: stats.productViews,
              description: stats.productViews === 0 
                ? "No product views yet"
                : `${stats.productViews} view${stats.productViews === 1 ? '' : 's'} this month`
            },
            {
              id: 'orders',
              title: 'Recent Orders',
              icon: <Package className="h-4 w-4 text-gray-400" />,
              value: orders.length,
              description: orders.length === 0 
                ? "No orders received yet"
                : `${orders.length} recent order${orders.length === 1 ? '' : 's'}`
            },
            {
              id: 'revenue',
              title: 'Total Revenue',
              icon: <span className="h-4 w-4 text-gray-400 font-bold text-xl">₹</span>,
              value: stats.revenue > 0 ? `₹${stats.revenue.toLocaleString('en-IN')}` : '₹0',
              description: stats.revenue === 0 ? "No revenue generated yet" : "From completed orders"
            }
          ].map(card => (
            <Card key={card.id} className="hover:shadow-md transition-shadow bg-black text-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b border-zinc-800">
                <CardTitle className="text-sm font-medium text-white">{card.title}</CardTitle>
                {card.icon}
              </CardHeader>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-white">{card.value}</div>
                <p className="text-xs text-gray-400">{card.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <Card className="mb-8 bg-black text-white">
          <CardHeader className="border-b border-zinc-800">
            <CardTitle className="text-white">Quick Actions</CardTitle>
            <CardDescription className="text-gray-400">Common actions to manage your store</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <AddProductDialog />
              </div>
              <div className="flex-1">
                <EditProfileDialog />
              </div>
              <div className="flex-1">
                <AnalyticsDialog />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Show orders if available */}
        {orders.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Recent Orders */}
            <Card className="hover:shadow-md transition-shadow bg-black text-white">
              <CardHeader className="border-b border-zinc-800">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-white">Recent Orders</CardTitle>
                    <CardDescription className="text-gray-400">Your 5 most recent orders - check Orders tab for full history</CardDescription>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => router.push('/orders')}
                    className="text-white hover:text-white border-zinc-700 hover:bg-zinc-800"
                  >
                    View All Orders
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-4">
                    {orders.map((order: Order) => (
                      <div
                        key={order._id}
                        className="flex items-center justify-between p-4 border border-zinc-800 rounded-lg bg-zinc-900"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm text-white">{order._id}</span>
                            <Badge
                              variant={
                                order.status === "CONFIRMED"
                                  ? "default"
                                  : order.status === "PENDING"
                                    ? "secondary"
                                    : "outline"
                              }
                              className="text-xs"
                            >
                              {order.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-400">{order.user}</p>
                          <div className="text-xs text-gray-500 space-y-1">
                            {order.items.map((item: {
                              product: { name: string; _id: string };
                              quantity: number;
                              price: number;
                            }, index: number) => (
                              <p key={`${order._id}-item-${item.product._id}-${index}`} className="text-gray-400">
                                {item.product.name} × {item.quantity}
                              </p>
                            ))}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-sm text-white">₹{order.totalAmount}</p>
                          <p className="text-xs text-gray-400">{formatDateShort(order.createdAt)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
