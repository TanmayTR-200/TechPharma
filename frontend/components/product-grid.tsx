import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Heart, ShoppingCart, Trash2, MessageCircle } from "lucide-react"
import { API_ENDPOINTS, API_BASE_URL, fetcher } from "@/lib/api-config"
import { useAuth } from "@/contexts/auth"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

// Product types are defined in the interface below

import { Product, SupplierInfo } from '@/types/product';

interface ProductGridProps {
  products: Product[];
  loading?: boolean;
}

// Type guard for SupplierInfo
function isSupplierInfo(supplier: Product['supplier']): supplier is SupplierInfo {
  return supplier !== null && 
         typeof supplier === 'object' && 
         '_id' in supplier;
}

export function ProductGrid({ products, loading }: ProductGridProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const handleAddToCart = async (productId: string | number) => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please login to add items to cart",
        variant: "destructive"
      });
      router.push('/auth?mode=login');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      // Use fetcher utility and API_ENDPOINTS
      await fetcher(`${API_BASE_URL}/api/cart/add`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          productId: productId.toString(),
          quantity: 1
        })
      });

      toast({
        title: "Success",
        description: "Item added to cart",
      });
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add item to cart. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleMessageSeller = async (
    productId: string | number, 
    sellerId: string, 
    productName: string,
    sellerName?: string
  ) => {
    // Pre-flight validation
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please login to message the seller",
        variant: "destructive"
      });
      router.push('/auth?mode=login');
      return;
    }

    const currentUserId = user?._id || user?.id;
    if (!currentUserId) {
      toast({
        title: "Authentication Error",
        description: "Please try logging out and back in.",
        variant: "destructive"
      });
      return;
    }

    // Check if user is messaging themselves
    if (sellerId === currentUserId) {
      toast({
        title: "Error",
        description: "You cannot message yourself about your own product.",
        variant: "destructive"
      });
      return;
    }

    // Validate required parameters
    if (!productId || !sellerId || !productName) {
      console.error('Missing required parameters:', { productId, sellerId, productName });
      toast({
        title: "Error",
        description: "Missing required information to message seller. Please try again.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Get authentication token
      const token = localStorage.getItem('token');
      if (!token) {
        toast({
          title: "Authentication Error",
          description: "Please log in again.",
          variant: "destructive"
        });
        router.push('/auth?mode=login');
        return;
      }

      // Prepare message content with product details
      const messageContent = {
        receiverId: sellerId.toString(),
        content: `Hi, I'm interested in your product "${productName}". Can you provide more information?`,
        productRef: productId.toString(),
        metadata: {
          productUrl: `/products/${productId}`,
          productName,
          initiatedAt: new Date().toISOString()
        }
      };

      // Create the conversation
      const messageResponse = await fetcher(API_ENDPOINTS.messages.base, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messageContent)
      });

      // Validate conversation creation
      const conversationId = messageResponse.conversationId || messageResponse._id;
      if (!conversationId) {
        throw new Error('Failed to create conversation');
      }

      // Construct messages URL with seller info
      let url = `/messages?active=${conversationId}`;
      if (sellerName) {
        url += `&name=${encodeURIComponent(sellerName)}`;
      }
      
      // Show success message and navigate
      toast({
        title: "Success",
        description: `Connected with ${sellerName || 'seller'}. Opening chat...`,
      });
      router.push(url);

    } catch (error) {
      console.error('Error initiating conversation:', error);
      let errorMessage = "Failed to start conversation. Please try again.";
      
      if (error instanceof Error) {
        if (error.message.includes('rate limit') || error.message.includes('429')) {
          errorMessage = "You're messaging too quickly. Please wait a moment and try again.";
        } else if (error.message.includes('blocked') || error.message.includes('403')) {
          errorMessage = "Unable to message this seller. They may have blocked messages.";
        } else {
          errorMessage = error.message;
        }
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetcher(`${API_ENDPOINTS.products.base}/${productId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      toast({
        title: "Success",
        description: "Product deleted successfully",
      });

      // Refresh the page to update the product list
      window.location.reload();
    } catch (error) {
      console.error('Error deleting product:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete product. Please try again.",
        variant: "destructive"
      });
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

  // Add CSS for highlighting new products
  const style = document.createElement('style');
  style.textContent = `
    @keyframes highlightProduct {
      0% { transform: scale(1); box-shadow: 0 0 0 rgba(59, 130, 246, 0); }
      50% { transform: scale(1.05); box-shadow: 0 0 20px rgba(59, 130, 246, 0.5); }
      100% { transform: scale(1); box-shadow: 0 0 0 rgba(59, 130, 246, 0); }
    }
    .highlight-product {
      animation: highlightProduct 2s ease-in-out;
    }
  `;
  document.head.appendChild(style);

  return (
    <div className="space-y-6">
      {/* Product Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {!Array.isArray(products) || products.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center p-8 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <ShoppingCart className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No Products Found</h3>
            <p className="text-sm text-gray-500">
              {Array.isArray(products) ? "No products are available at the moment." : "Failed to load products."}
            </p>
          </div>
        ) : (
          products.map((product) => {
          // Use product.id as the key since it's guaranteed to exist
          return (
            <Card 
              key={product.id} 
              id={product.id.toString()}
              className="hover:shadow-lg transition-shadow cursor-pointer group"
            >
              <CardContent className="p-0">
                <div className="relative">
                  <img
                    src={product.images?.[0] || "/placeholder-product.svg"}
                    alt={product.name}
                    className="w-full h-48 object-cover rounded-t-lg"
                />
                <div className="absolute top-2 left-2 flex flex-col gap-1">
                  <Badge className="bg-accent text-accent-foreground text-xs">{product.category}</Badge>
                  {product.stock < 10 && (
                    <Badge variant="destructive" className="text-xs">
                      Low Stock
                    </Badge>
                  )}
                </div>
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 bg-white/80 hover:bg-white">
                    <Heart className="h-4 w-4" />
                  </Button>
                </div>
              </div>

                <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <Badge variant="outline" className="text-xs font-medium">
                    {product.category}
                  </Badge>
                </div>

                <h3 className="font-semibold text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                  {product.name}
                </h3>

                <p className="text-sm text-foreground/70 mb-2 line-clamp-2">
                  {product.description}
                </p>                <div className="space-y-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-semibold text-primary">
                      ₹{Number(product.price).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs font-medium">
                      Stock: {Number(product.stock).toLocaleString('en-IN')}
                    </Badge>
                    {product.status && (
                      <Badge 
                        variant={product.status.toLowerCase() === 'active' ? 'default' : 'secondary'} 
                        className="text-xs font-medium"
                      >
                        {product.status}
                      </Badge>
                    )}
                  </div>
                </div>

                {(() => {
                  // Get the correct user ID (either _id or id)
                  const userId = user?.id || user?._id;
                  
                  // Check if the current user owns this product
                  const isOwner = user && userId && (
                    // Check against userId field
                    (product.userId && userId.toString() === product.userId.toString()) ||
                    // Also check against supplier field using type guard
                    (product.supplier && isSupplierInfo(product.supplier) &&
                     product.supplier._id === userId.toString())
                  );

                  return (
                    <div className="flex gap-2">
                      {isOwner ? (
                        <Button 
                          variant="destructive" 
                          className="flex-1"
                          onClick={() => handleDelete(product.id.toString())}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Product
                        </Button>
                      ) : (
                        <>
                          <Button 
                            className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground flex items-center justify-center"
                            onClick={() => {
                              // Get product ID
                              const productId = product._id || product.id;

                              // Extract supplier ID with proper type checking and fallbacks
                              let supplierId: string | undefined;

                              if (product.supplier) {
                                if (isSupplierInfo(product.supplier)) {
                                  supplierId = product.supplier._id;
                                } else if (typeof product.supplier === 'string') {
                                  supplierId = product.supplier;
                                }
                              }

                              // Fallback to userId if supplier info is missing
                              if (!supplierId && product.userId) {
                                supplierId = product.userId;
                              }

                              if (!supplierId) {
                                console.error('Missing supplier info:', {
                                  productId: product._id || product.id,
                                  supplier: product.supplier,
                                  userId: product.userId,
                                  fullProduct: product
                                });

                                // Check if user is trying to message their own product
                                const currentUserId = user?._id || user?.id;
                                if (currentUserId && (
                                  currentUserId === product.userId || 
                                  (product.supplier && typeof product.supplier === 'object' && 
                                   'id' in product.supplier && product.supplier.id === currentUserId)
                                )) {
                                  toast({
                                    title: "Error",
                                    description: "You cannot message yourself. This is your own product.",
                                    variant: "destructive"
                                  });
                                  return;
                                }

                                toast({
                                  title: "Error",
                                  description: "Could not determine seller information. Please try again.",
                                  variant: "destructive"
                                });
                                return;
                              }

                              // Get seller name from supplier info
                              const sellerName = product.supplier && typeof product.supplier === 'object'
                                ? ('name' in product.supplier 
                                   ? product.supplier.name 
                                   : product.supplier.company?.name ?? undefined)
                                : undefined;

                              handleMessageSeller(
                                productId, 
                                supplierId, 
                                product.name,
                                sellerName
                              );
                            }}
                          >
                            <MessageCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                            <span className="inline-block">Message Seller</span>
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="px-3 bg-transparent flex items-center justify-center"
                            onClick={() => handleAddToCart(product.id)}
                          >
                            <ShoppingCart className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  );
                })()}
              </div>
            </CardContent>
          </Card>
          );
        }))}
      </div>
    </div>
  )
}
