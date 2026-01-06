"use client"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Star, MapPin } from "lucide-react"
import { useProduct } from "@/contexts/product-provider"
import { ProductActions } from "@/components/product-actions"
import { useEffect, useState } from "react"
import { productApi } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import Image from "next/image"

interface FeaturedProduct {
  _id: string;
  name: string;
  price: number;
  images: string[];
  salesCount: number;
  supplierName: string;
  supplierLocation: string;
  category: string;
  stock: number;
}

export function FeaturedProducts() {
  const { getQuote, viewAllProducts } = useProduct();
  const [products, setProducts] = useState<FeaturedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchFeaturedProducts();
    
    // Poll for updates every 30 seconds to reflect real-time sales
    const interval = setInterval(() => {
      fetchFeaturedProducts();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const fetchFeaturedProducts = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/products/featured');
      const data = await response.json();
      
      if (data.success && data.products) {
        setProducts(data.products);
      }
    } catch (error) {
      console.error('Error fetching featured products:', error);
    } finally {
      setLoading(false);
    }
  };

  const getBadgeText = (salesCount: number) => {
    if (salesCount > 10) return "Best Seller";
    if (salesCount > 5) return "Top Rated";
    if (salesCount > 0) return "Popular";
    return "New Arrival";
  };

  const formatPrice = (price: number) => {
    return `₹${price.toLocaleString('en-IN')}`;
  };

  if (loading) {
    return (
      <section className="py-16 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-serif font-bold text-foreground mb-4">Featured Products</h2>
            <p className="text-lg text-muted-foreground">Discover top-quality products from our verified suppliers</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-0">
                  <div className="w-full h-48 bg-gray-200 rounded-t-lg" />
                  <div className="p-4 space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    <div className="h-4 bg-gray-200 rounded w-1/2" />
                    <div className="h-8 bg-gray-200 rounded" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-serif font-bold text-foreground mb-4">Featured Products</h2>
          <p className="text-lg text-muted-foreground">Discover top-quality products from our verified suppliers</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <p className="text-muted-foreground">No featured products available at the moment.</p>
            </div>
          ) : (
            products.map((product) => (
              <Card key={product._id} className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="p-0">
                  <div className="relative">
                    {product.images && product.images.length > 0 ? (
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="w-full h-48 object-cover rounded-t-lg"
                      />
                    ) : (
                      <div className="w-full h-48 bg-gray-200 rounded-t-lg flex items-center justify-center">
                        <span className="text-gray-400">No Image</span>
                      </div>
                    )}
                    <Badge className="absolute top-2 left-2 bg-accent text-accent-foreground">
                      {getBadgeText(product.salesCount)}
                    </Badge>
                    {product.salesCount > 0 && (
                      <Badge className="absolute top-2 right-2 bg-green-600 text-white">
                        {product.salesCount} sold
                      </Badge>
                    )}
                  </div>

                  <div className="p-4">
                    <h3 className="font-semibold text-foreground mb-2 line-clamp-2 min-h-[3rem]">{product.name}</h3>

                    <p className="text-lg font-semibold text-accent mb-2">{formatPrice(product.price)}</p>

                    <div className="text-sm text-muted-foreground mb-3">
                      <p className="font-medium truncate">{product.supplierName}</p>
                      <div className="flex items-center">
                        <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
                        <span className="truncate">{product.supplierLocation}</span>
                      </div>
                    </div>

                    <div className="text-xs text-muted-foreground mb-3">
                      <p>Category: <span className="capitalize">{product.category}</span></p>
                      <p>Stock: {product.stock > 0 ? `${product.stock} available` : 'Out of stock'}</p>
                    </div>

                    <Button 
                      className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
                      onClick={getQuote}
                      disabled={product.stock === 0}
                    >
                      {product.stock === 0 ? 'Out of Stock' : 'Get Quote'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <div className="text-center mt-12">
          <Button
            variant="outline"
            size="lg"
            className="border-accent text-accent hover:bg-accent hover:text-accent-foreground bg-transparent"
            onClick={viewAllProducts}
          >
            View All Products
          </Button>
        </div>
      </div>
    </section>
  )
}
