import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';
import { TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { API_ENDPOINTS } from '@/lib/api-config';

export function AnalyticsDialog() {
  interface AnalyticsData {
    totalSales: number;
    totalOrders: number;
    averageOrderValue: number;
    topProducts: Array<{ name: string; sales: number }>;
  }

  const [analytics, setAnalytics] = React.useState<AnalyticsData>({
    totalSales: 0,
    totalOrders: 0,
    averageOrderValue: 0,
    topProducts: [],
  });
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  const fetchAnalytics = React.useCallback(async (signal: AbortSignal) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError("Please login to view analytics");
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_ENDPOINTS.dashboard.analytics}`, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache'
        },
        signal,
        cache: 'no-store'
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch stats: ${response.statusText}`);
      }

      const data = await response.json();

      interface ApiResponse {
        data?: {
          stats?: {
            totalProducts?: number;
            recentOrders?: number;
            revenue?: number;
          };
          orders?: Array<{
            items: Array<{
              product?: { name: string };
              quantity?: number;
            }>;
          }>;
        };
      }

      const apiData = data as ApiResponse;

      const revenue = Number(apiData.data?.stats?.revenue || 0);
      const totalOrders = Number(apiData.data?.stats?.recentOrders || 0);

      const productSales = new Map<string, number>();
      apiData.data?.orders?.forEach(order => {
        order.items?.forEach(item => {
          const productName = item.product?.name || 'Unknown Product';
          const quantity = Number(item.quantity || 0);
          productSales.set(productName, (productSales.get(productName) || 0) + quantity);
        });
      });

      const topProducts = Array.from(productSales.entries())
        .map(([name, sales]) => ({ name, sales }))
        .sort((a, b) => b.sales - a.sales)
        .slice(0, 5);

      setAnalytics({
        totalSales: revenue,
        totalOrders: totalOrders,
        averageOrderValue: totalOrders > 0 ? revenue / totalOrders : 0,
        topProducts: topProducts
      });
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      setError(err.message || "Failed to load analytics");
      setAnalytics({
        totalSales: 0,
        totalOrders: 0,
        averageOrderValue: 0,
        topProducts: []
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const [isOpen, setIsOpen] = React.useState(false);

  React.useEffect(() => {
    if (!isOpen) return;
    const controller = new AbortController();
    fetchAnalytics(controller.signal);
    return () => controller.abort();
  }, [fetchAnalytics, isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          View analytics
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Analytics</DialogTitle>
          <DialogDescription>
            Your sales performance at a glance
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-muted rounded w-3/4 mx-auto"></div>
              <div className="h-4 bg-muted rounded w-1/2 mx-auto"></div>
              <div className="h-4 bg-muted rounded w-2/3 mx-auto"></div>
            </div>
            <p className="mt-4 text-muted-foreground">Loading analytics...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <div className="text-destructive mb-4">{error}</div>
            <Button
              variant="outline"
              onClick={() => {
                setError("");
                const controller = new AbortController();
                fetchAnalytics(controller.signal);
              }}
            >
              Retry
            </Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Total sales</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-foreground">{`\u20B9${analytics.totalSales.toLocaleString('en-IN')}`}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Avg order value</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-foreground">{`\u20B9${Math.round(analytics.averageOrderValue).toLocaleString('en-IN')}`}</p>
                </CardContent>
              </Card>
            </div>
            <Card className="mt-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Top products</CardTitle>
              </CardHeader>
              <CardContent>
                {analytics.topProducts.length > 0 ? (
                  <ul className="space-y-2">
                    {analytics.topProducts.map((product: any, index: number) => (
                      <li key={index} className="flex justify-between text-sm items-center">
                        <span className="flex items-center gap-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold">{index + 1}</span>
                          {product.name}
                        </span>
                        <span className="font-medium text-foreground">{product.sales} units</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No product data available</p>
                )}
              </CardContent>
            </Card>
            <Card className="mt-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Order summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total orders:</span>
                    <span className="font-medium text-foreground">{analytics.totalOrders}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total revenue:</span>
                    <span className="font-medium text-foreground">{`\u20B9${analytics.totalSales.toLocaleString('en-IN')}`}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Avg order value:</span>
                    <span className="font-medium text-foreground">{`\u20B9${Math.round(analytics.averageOrderValue).toLocaleString('en-IN')}`}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
