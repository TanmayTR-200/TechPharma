"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth'

import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import ChevronDown from "lucide-react/dist/esm/icons/chevron-down"
import ChevronUp from "lucide-react/dist/esm/icons/chevron-up"
import ShoppingCart from "lucide-react/dist/esm/icons/shopping-cart"
import Link from 'next/link'
import Image from 'next/image'
import { API_ENDPOINTS, fetcher } from '@/lib/api-config'
import { formatDateShort } from '@/lib/formatDate'

interface SoldProduct {
  _id: string;
  productId: string;
  name: string;
  image: string;
  price: number;
  quantity: number;
  soldAt: string;
  buyerName: string;
  buyerId: string;
  archived?: boolean;
}

export default function SoldProductsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [soldProducts, setSoldProducts] = useState<SoldProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [showArchived, setShowArchived] = useState(false)

  useEffect(() => {
    if (!user) {
      router.push('/auth?mode=login')
      return
    }

    const fetchSoldProducts = async () => {
      try {
        setLoading(true)
        const token = localStorage.getItem('token')
        
        if (!token) {
          router.push('/auth?mode=login')
          return
        }

        // Check if user is a supplier
        if (user?.role !== 'supplier') {
          setSoldProducts([])
          setLoading(false)
          return
        }

        const response = await fetch('http://localhost:5000/api/products/sold', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })

        if (response.status === 401) {
          localStorage.removeItem('token')
          router.push('/auth?mode=login')
          return
        }

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()
        if (data.success) {
          const productsWithArchived = (data.soldProducts || []).map((product: any) => ({
            ...product,
            archived: product.archived || false
          }))
          setSoldProducts(productsWithArchived)
        } else {
          console.error('Failed to fetch sold products:', data.message)
          setSoldProducts([])
        }
      } catch (error) {
        console.error('Error fetching sold products:', error)
        setSoldProducts([])
      } finally {
        setLoading(false)
      }
    }

    fetchSoldProducts()
  }, [user, router])

  return (
    <div className="min-h-screen">
      <div className="container py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2 text-black">
              {showArchived ? 'Archived Sales' : 'Sold Products'}
            </h1>
            <p className="text-gray-600 text-lg">
              {showArchived 
                ? 'View your archived product sales'
                : 'Track and manage your product sales'}
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
                  View Active Sales
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4" />
                  View Archived Sales
                </>
              )}
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : soldProducts.length === 0 ? (
          <div className="text-center py-12 bg-black text-white rounded-lg">
            <ShoppingCart className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold mb-2 text-white">No sales yet</h3>
            <p className="text-gray-400 text-lg mb-4">
              Start selling your products to see your sales history here
            </p>
            <Button variant="outline" className="text-white hover:text-white border-zinc-700 hover:bg-zinc-800">
              <Link href="/dashboard">
                Go to Dashboard
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {soldProducts.filter((product) => product.archived === showArchived).map((product) => (
              <Card key={product._id} className="border border-gray-300 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="bg-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-black text-xl">Sale #{product._id}</CardTitle>
                      <CardDescription className="text-gray-600 font-medium">Sold on {formatDateShort(product.soldAt)}</CardDescription>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant="outline" className="bg-blue-100 text-blue-800 hover:bg-blue-200">
                        Sold to: {product.buyerName}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          try {
                            const token = localStorage.getItem('token')
                            await fetcher(API_ENDPOINTS.products.sold.archiveSale(product._id), {
                              method: 'POST',
                              body: JSON.stringify({ archived: !product.archived })
                            });

                            setSoldProducts(products => 
                              products.map(p => 
                                p._id === product._id ? { ...p, archived: !product.archived } : p
                              )
                            );

                            const toast = (await import('@/components/ui/use-toast')).toast;
                            toast({
                              title: product.archived ? 'Sale Restored' : 'Sale Archived',
                              description: product.archived 
                                ? 'The sale has been restored from archives'
                                : 'The sale has been moved to archives',
                              duration: 3000
                            });
                          } catch (error) {
                            console.error('Error archiving sale:', error);
                            const toast = (await import('@/components/ui/use-toast')).toast;
                            toast({
                              title: 'Error',
                              description: 'Failed to update sale status. Please try again.',
                              variant: 'destructive',
                              duration: 3000
                            });
                          }
                        }}
                        className="hover:text-accent"
                      >
                        {product.archived ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="bg-white">
                  <div className="flex items-center gap-4">
                    <Image
                      src={product.image || '/placeholder.png'}
                      alt={product.name}
                      width={64}
                      height={64}
                      className="rounded-md border border-gray-200"
                    />
                    <div>
                      <p className="font-semibold text-black text-lg">{product.name}</p>
                      <p className="text-base text-gray-600 font-medium">
                        Quantity Sold: {product.quantity}
                      </p>
                    </div>
                    <div className="ml-auto">
                      <p className="font-bold text-black text-lg">
                        ${product.price * product.quantity}
                      </p>
                    </div>
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