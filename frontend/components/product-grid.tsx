import { ShoppingCart } from "lucide-react";
import { ProductDisplay } from "@/components/product-display";
import { Product } from '@/types/product';
import { useAuth } from "@/contexts/auth";
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";
import { API_ENDPOINTS, fetcher } from "@/lib";
import { useCart } from "@/contexts/cart";

interface ProductGridProps {
  products: Product[];
  loading?: boolean;
}

export function ProductGrid({ products, loading }: ProductGridProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const { addToCart } = useCart();

  // If no auth context is available, assume user is not logged in
  const currentUser = user;

  const handleAddToCart = async (productId: string | number) => {
    if (!currentUser) {
      toast({ 
        title: "Login Required", 
        description: "Please login to add items to cart", 
        variant: "destructive" 
      });
      router.push('/auth?mode=login');
      return;
    }
    try {
      // Convert number id to string and ensure it's in the correct format
      const formattedId = typeof productId === 'number' ? productId.toString() : productId;
      await addToCart(formattedId, 1);
    } catch (error) {
      console.error('Add to cart error:', error);
      // Toast is already handled in the cart context
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array(8).fill(0).map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="aspect-square bg-gray-200 rounded-lg mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  // Filter out products with missing or duplicate ids
  const filteredProducts = Array.isArray(products)
    ? products.filter((p, idx, arr) => 
        (typeof p.id === 'number' || typeof p.id === 'string') && 
        arr.findIndex(x => x.id === p.id) === idx)
    : products;

  return (
    <div className="min-h-full p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 auto-rows-min">
        {!Array.isArray(filteredProducts) || filteredProducts.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center p-8 text-center min-h-[400px]">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <ShoppingCart className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No Products Found</h3>
            <p className="text-sm text-gray-500">
              {Array.isArray(filteredProducts) ? "No products are available at the moment." : "Failed to load products."}
            </p>
          </div>
        ) : (
          filteredProducts.map((product) => (
            <ProductDisplay
              key={product.id}
              product={product}
              onAddToCart={handleAddToCart}
              onDeleted={() => window.location.reload()}
            />
          ))
        )}
      </div>
    </div>
  );
}

