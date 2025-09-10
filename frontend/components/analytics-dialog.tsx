import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';
import { TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

export function AnalyticsDialog() {
  // Mock data - replace with real data from your API
  const analytics = {
    totalSales: 45231,
    totalOrders: 156,
    averageOrderValue: 290,
    topProducts: [
      { name: 'Industrial LED Lights', sales: 500 },
      { name: 'Hydraulic Pumps', sales: 250 },
      { name: 'Safety Equipment', sales: 200 },
    ],
    monthlySales: [
      { month: 'Jan', value: 12500 },
      { month: 'Feb', value: 15600 },
      { month: 'Mar', value: 17100 },
    ],
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2 bg-transparent">
          <TrendingUp className="w-4 h-4" />
          View Analytics
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Business Analytics</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Total Sales</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">${analytics.totalSales.toLocaleString()}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Total Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{analytics.totalOrders}</p>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-sm">Top Products</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {analytics.topProducts.map((product, index) => (
                <li key={index} className="flex justify-between text-sm">
                  <span>{product.name}</span>
                  <span className="font-medium">{product.sales} units</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-sm">Monthly Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {analytics.monthlySales.map((month, index) => (
                <li key={index} className="flex justify-between text-sm">
                  <span>{month.month}</span>
                  <span className="font-medium">${month.value.toLocaleString()}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}
