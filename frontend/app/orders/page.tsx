"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth'

import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import ChevronDown from "lucide-react/dist/esm/icons/chevron-down";
import ChevronUp from "lucide-react/dist/esm/icons/chevron-up";
import ShoppingCart from "lucide-react/dist/esm/icons/shopping-cart";
import Link from 'next/link'
import Image from 'next/image'
import { API_ENDPOINTS, fetcher } from '@/lib/api-config'
import { formatDateShort } from '@/lib/formatDate'

interface Product {
  _id: string;
  name: string;
  image: string;
  price: number;
}

interface OrderItem {
  _id: string;
  product: Product;
  quantity: number;
  price: number;
}

interface Order {
  _id: string;
  items: OrderItem[];
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  totalAmount: number;
  createdAt: string;
  archived?: boolean;
}

export default function OrdersPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [showArchived, setShowArchived] = useState(false)

  useEffect(() => {
    if (!user) {
      router.push('/auth?mode=login')
      return
    }

    const fetchOrders = async () => {
      try {
        setLoading(true)
        const token = localStorage.getItem('token')
        
        if (!token) {
          router.push('/auth?mode=login')
          return
        }

        // Check if user is a buyer
        if (user?.role !== 'buyer') {
          setOrders([])
          setLoading(false)
          return
        }

        const response = await fetch('http://localhost:5000/api/orders', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })

        if (response.status === 401) {
          // Token invalid or expired
          localStorage.removeItem('token')
          router.push('/auth?mode=login')
          return
        }

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()
        if (data.success) {
          // Add archived field if not present
          const ordersWithArchived = (data.orders || []).map((order: any) => ({
            ...order,
            archived: order.archived || false
          }))
          setOrders(ordersWithArchived)
        } else {
          console.error('Failed to fetch orders:', data.message)
          setOrders([])
        }
      } catch (error) {
        console.error('Error fetching orders:', error)
        setOrders([])
      } finally {
        setLoading(false)
      }
    }

    fetchOrders()
  }, [user, router])

  return (
    <div className="min-h-screen">
      <div className="container py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2 text-black">
              {showArchived ? 'Archived Orders' : user?.role === 'supplier' ? 'Manage Orders' : 'My Orders'}
            </h1>
            <p className="text-gray-600 text-lg">
              {showArchived 
                ? 'View and restore archived orders'
                : user?.role === 'supplier' 
                  ? 'View and manage orders from your customers'
                  : 'Track and manage your purchases'}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowArchived(!showArchived)}
              className="flex items-center gap-2"
            >
              {showArchived ? (
                <>
                  <ChevronUp className="h-4 w-4" />
                  View Active Orders
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4" />
                  View Archived Orders
                </>
              )}
            </Button>
            {user?.role === 'buyer' && !showArchived && (
              <Button asChild>
                <Link href="/products">Browse Products</Link>
              </Button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12 bg-black text-white rounded-lg">
            <ShoppingCart className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold mb-2 text-white">No orders yet</h3>
            <p className="text-gray-400 text-lg mb-4">
              {user?.role === 'supplier' 
                ? 'Start adding products to receive orders from customers'
                : 'Browse our marketplace to make your first purchase'}
            </p>
            <Button variant="outline" className="text-white hover:text-white border-zinc-700 hover:bg-zinc-800">
              <Link href={user?.role === 'supplier' ? '/dashboard' : '/products'}>
                {user?.role === 'supplier' ? 'Go to Dashboard' : 'Browse Products'}
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.filter((order) => order.archived === showArchived).map((order) => (
              <Card key={order._id} className="border border-gray-300 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="bg-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-black text-xl">Order #{order._id}</CardTitle>
                      <CardDescription className="text-gray-600 font-medium">Placed on {formatDateShort(order.createdAt)}</CardDescription>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge className={
                        order.status === 'pending' ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' :
                        order.status === 'processing' ? 'bg-blue-100 text-blue-800 hover:bg-blue-200' :
                        order.status === 'completed' ? 'bg-green-100 text-green-800 hover:bg-green-200' :
                        order.status === 'cancelled' ? 'bg-red-100 text-red-800 hover:bg-red-200' :
                        'bg-gray-100 text-gray-800 hover:bg-gray-200'
                      }>
                        {order.status}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          try {
                            const token = localStorage.getItem('token')
                            await fetcher(API_ENDPOINTS.orders.archive(order._id), {
                              method: 'POST',
                              body: JSON.stringify({ archived: !order.archived })
                            });

                            setOrders(orders.map(o => 
                              o._id === order._id ? { ...o, archived: !order.archived } : o
                            ));

                            // Show success notification
                            const toast = (await import('@/components/ui/use-toast')).toast;
                            toast({
                              title: order.archived ? 'Order Restored' : 'Order Archived',
                              description: order.archived 
                                ? 'The order has been restored from archives'
                                : 'The order has been moved to archives',
                              duration: 3000
                            });
                          } catch (error) {
                            console.error('Error archiving order:', error);
                            // Show error notification
                            const toast = (await import('@/components/ui/use-toast')).toast;
                            toast({
                              title: 'Error',
                              description: 'Failed to update order status. Please try again.',
                              variant: 'destructive',
                              duration: 3000
                            });
                          }
                        }}
                        className="hover:text-accent"
                      >
                        {order.archived ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="bg-white">
                  <div className="space-y-4">
                    {order.items.map((item: any) => (
                      <div key={item._id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                        <div className="flex items-center gap-4">
                          <Image
                            src={item.product.image || '/placeholder.png'}
                            alt={item.product.name}
                            width={48}
                            height={48}
                            className="rounded-md border border-gray-200"
                          />
                          <div>
                            <p className="font-semibold text-black text-lg">{item.product.name}</p>
                            <p className="text-base text-gray-600 font-medium">
                              Quantity: {item.quantity}
                            </p>
                          </div>
                        </div>
                        <p className="font-bold text-black text-lg">
                          ${item.price * item.quantity}
                        </p>
                      </div>
                    ))}
                  </div>
                  <Separator className="my-4 bg-gray-300" />
                  <div className="flex justify-between p-4 bg-gray-100 rounded-lg">
                    <p className="font-semibold text-black text-lg">Total Amount:</p>
                    <p className="font-bold text-black text-xl">${order.totalAmount}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
