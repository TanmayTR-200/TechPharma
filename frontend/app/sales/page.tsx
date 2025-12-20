"use client"

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/auth'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { API_ENDPOINTS, fetcher } from '@/lib/api-config'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Loader2, BarChart3, TrendingUp, Users } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface SalesSummary {
  totalSales: number
  totalOrders: number
  totalCustomers: number
  recentSales: {
    _id: string
    buyerId: string
    buyerName: string
    productId: string
    productName: string
    quantity: number
    amount: number
    date: string
  }[]
  topProducts: {
    _id: string
    name: string
    totalSold: number
    totalRevenue: number
  }[]
}

export default function SalesTracking() {
  const [salesData, setSalesData] = useState<SalesSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  useEffect(() => {
    fetchSalesData()
  }, [])

  const fetchSalesData = async () => {
    try {
      const data = await fetcher(API_ENDPOINTS.dashboard.stats)
      setSalesData(data)
    } catch (error) {
      console.error('Error fetching sales data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!salesData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <BarChart3 className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-lg font-medium">No sales data available</h2>
        <p className="text-muted-foreground">Start selling to view your sales analytics</p>
        <Button asChild>
          <a href="/products">Manage Products</a>
        </Button>
      </div>
    )
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Sales Dashboard</h1>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Sales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <TrendingUp className="h-4 w-4 text-green-500 mr-2" />
              <span className="text-2xl font-bold">
                {formatCurrency(salesData.totalSales)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <BarChart3 className="h-4 w-4 text-blue-500 mr-2" />
              <span className="text-2xl font-bold">
                {salesData.totalOrders}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Customers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Users className="h-4 w-4 text-purple-500 mr-2" />
              <span className="text-2xl font-bold">
                {salesData.totalCustomers}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salesData.recentSales.map((sale) => (
                  <TableRow key={sale._id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{sale.productName}</p>
                        <p className="text-sm text-muted-foreground">
                          Qty: {sale.quantity}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{sale.buyerName}</TableCell>
                    <TableCell>{formatCurrency(sale.amount)}</TableCell>
                    <TableCell>{formatDate(sale.date)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Products</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Units Sold</TableHead>
                  <TableHead>Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salesData.topProducts.map((product) => (
                  <TableRow key={product._id}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>{product.totalSold}</TableCell>
                    <TableCell>{formatCurrency(product.totalRevenue)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}