"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-new'

import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ShoppingCart } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

export default function OrdersPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      router.push('/auth?mode=login')
      return
    }

    const fetchOrders = async () => {
      try {
        setLoading(true)
        const token = localStorage.getItem('token')
        const response = await fetch('http://localhost:5000/api/orders', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        const data = await response.json()
        setOrders(data)
      } catch (error) {
        console.error('Error fetching orders:', error)
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
            <h1 className="text-2xl font-bold mb-2">
              {user?.role === 'supplier' ? 'Manage Orders' : 'My Orders'}
            </h1>
            <p className="text-muted-foreground">
              {user?.role === 'supplier' 
                ? 'View and manage orders from your customers'
                : 'Track and manage your purchases'}
            </p>
          </div>
          {user?.role === 'buyer' && (
            <Button asChild>
              <Link href="/products">Browse Products</Link>
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No orders yet</h3>
            <p className="text-muted-foreground mb-4">
              {user?.role === 'supplier' 
                ? 'Start adding products to receive orders from customers'
                : 'Browse our marketplace to make your first purchase'}
            </p>
            <Button asChild>
              <Link href={user?.role === 'supplier' ? '/dashboard' : '/products'}>
                {user?.role === 'supplier' ? 'Go to Dashboard' : 'Browse Products'}
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order: any) => (
              <Card key={order._id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Order #{order._id}</CardTitle>
                      <CardDescription>
                        Placed on {new Date(order.createdAt).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <Badge>
                      {order.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {order.items.map((item: any) => (
                      <div key={item._id} className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <Image
                            src={item.product.image || '/placeholder.png'}
                            alt={item.product.name}
                            width={48}
                            height={48}
                            className="rounded-md"
                          />
                          <div>
                            <p className="font-medium">{item.product.name}</p>
                            <p className="text-sm text-muted-foreground">
                              Quantity: {item.quantity}
                            </p>
                          </div>
                        </div>
                        <p className="font-medium">
                          ${item.price * item.quantity}
                        </p>
                      </div>
                    ))}
                  </div>
                  <Separator className="my-4" />
                  <div className="flex justify-between">
                    <p className="font-medium">Total Amount:</p>
                    <p className="font-bold">${order.totalAmount}</p>
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
