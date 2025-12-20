import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Product, SupplierInfo } from '@/types/product';
import { useAuth } from "@/contexts/auth";
import { EditProductDialog } from './edit-product-dialog';
import { ProductSellerActions } from './product-seller-actions';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';

interface ProductDisplayProps {
  product: Product;
  onAddToCart?: (productId: string | number) => Promise<void>;
  onDeleted?: () => void;
}

function isSupplierInfo(supplier: Product['supplier']): supplier is SupplierInfo {
  return supplier !== null && typeof supplier === 'object' && '_id' in supplier;
}

export function ProductDisplay({ product, onAddToCart, onDeleted }: ProductDisplayProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  // Check if the current user owns this product
  const isOwner = user && isSupplierInfo(product.supplier) && user._id === product.supplier._id;

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  // Get all valid images or use placeholder
  const validImages = Array.isArray(product.images) ? product.images.filter(img => 
    typeof img === "string" && img.startsWith("http")
  ) : [];
  
  const imageSrc = validImages.length > 0 ? validImages[currentImageIndex] : "/placeholder.svg";

  return (
    <>
      <Card className="hover:shadow-2xl border border-gray-700 bg-gray-900 text-white transition-all duration-200 group hover:border-blue-500">
        <CardContent className="p-0">
          <div className="relative group">
            <div className="relative w-full h-48 bg-gray-100">
              <Image
                src={imageSrc}
                alt={`${product.name} - Image ${currentImageIndex + 1} of ${validImages.length}`}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                priority={currentImageIndex === 0}
                className="object-cover rounded-t-lg bg-white"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.onerror = null;
                  target.src = "/placeholder.svg";
                }}
              />
              
              {/* Image Navigation */}
              {validImages.length > 1 && (
                <>
                  {/* Left Arrow */}
                  <button
                    onClick={() => setCurrentImageIndex((prev) => 
                      (prev - 1 + validImages.length) % validImages.length
                    )}
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    aria-label="Previous image"
                  >
                    ←
                  </button>
                  
                  {/* Right Arrow */}
                  <button
                    onClick={() => setCurrentImageIndex((prev) => 
                      (prev + 1) % validImages.length
                    )}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    aria-label="Next image"
                  >
                    →
                  </button>
                  
                  {/* Image Dots */}
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                    {validImages.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentImageIndex(index)}
                        className={`w-2 h-2 rounded-full transition-all ${
                          index === currentImageIndex 
                            ? 'bg-white scale-110' 
                            : 'bg-white/50 hover:bg-white/75'
                        }`}
                        aria-label={`Go to image ${index + 1}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
            
            <div className="absolute top-2 left-2 flex flex-col gap-1">
              <Badge className="bg-black text-white text-xs font-semibold px-3 py-1">
                {product.category.charAt(0).toUpperCase() + product.category.slice(1)}
              </Badge>
                {product.stock === 0 ? (
                <Badge variant="destructive" className="bg-red-600 text-white text-xs font-semibold px-3 py-1">
                  Out of Stock
                </Badge>
              ) : product.stock < 10 && (
                <Badge variant="destructive" className="bg-orange-600 text-white text-xs font-semibold px-3 py-1">
                  Low Stock
                </Badge>
              )}
            </div>
          </div>

          <div className="p-6">
            <div className="flex items-center justify-between mb-3">
              <Badge variant="outline" className="text-xs font-semibold border-2 border-gray-400 text-gray-200 px-3 py-1">
                {product.category.charAt(0).toUpperCase() + product.category.slice(1)}
              </Badge>
              {isSupplierInfo(product.supplier) && (
                <Badge variant="secondary" className="text-xs font-semibold bg-gray-800 text-gray-200 px-3 py-1">
                  {product.supplier.name}
                </Badge>
              )}
            </div>
            <h3 className="text-lg font-bold text-white mb-2 line-clamp-2 group-hover:text-gray-100">
              {product.name}
            </h3>
            <p className="text-base text-gray-300 mb-3 line-clamp-2">
              {product.description}
            </p>
            <div className="space-y-3 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-white">
                  ₹{Number(product.price).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-gray-800 text-white text-sm font-semibold px-3 py-1">
                  Stock: {Number(product.stock).toLocaleString('en-IN')}
                </Badge>
                {product.status && (
                  <Badge 
                    variant={product.status.toLowerCase() === 'active' && product.stock > 0 ? 'default' : 'secondary'} 
                    className={`text-sm font-semibold px-3 py-1 ${
                      product.status.toLowerCase() === 'active' && product.stock > 0
                        ? 'bg-green-600 text-white' 
                        : 'bg-red-600 text-white'
                    }`}
                  >
                    {product.stock === 0 ? 'Out of Stock' : product.status}
                  </Badge>
                )}
              </div>
            </div>

            {/* Product actions */}
            <div className="mt-4 pt-4 border-t border-gray-700">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm text-gray-400 mb-2">
                  <span>Available Stock: {product.stock} units</span>
                </div>

                {/* Show edit options if user owns the product */}
                {isOwner && (
                  <ProductSellerActions
                    productId={product.id}
                    onEdit={() => setIsEditDialogOpen(true)}
                  />
                )}

                {/* Show add to cart if callback provided and product in stock */}
                {onAddToCart && product.stock > 0 && !isOwner && (
                  <Button 
                    variant="outline"
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => onAddToCart(product.id)}
                  >
                    Add to Cart
                  </Button>
                )}

                {/* Show contact seller button for non-owners */}
                {!isOwner && (
                  <Button 
                    variant="default"
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    onClick={() => {
                      if (!user) {
                        toast({
                          title: "Login Required",
                          description: "Please login to contact the seller",
                          variant: "destructive"
                        });
                        router.push('/auth');
                        return;
                      }
                      if (isSupplierInfo(product.supplier)) {
                        const productInfo = encodeURIComponent(JSON.stringify({
                          id: product.id,
                          name: product.name,
                          price: product.price
                        }));

                        // Persist a lightweight recent conversation so the /messages
                        // sidebar shows this chat even if the server hasn't yet
                        // created a conversation entry. This avoids the mismatch
                        // where /messages/{id} shows the chat but /messages is empty.
                        try {
                          const raw = localStorage.getItem('recentConversations')
                          const list = raw ? JSON.parse(raw) : []
                          const entry = {
                            _id: product.supplier._id,
                            sender: user?._id || '',
                            receiver: product.supplier._id,
                            lastMessage: `Interested in ${product.name}`,
                            lastMessageTime: new Date().toISOString(),
                            senderName: user?.name || '',
                            receiverName: product.supplier.name || ''
                          }
                          const exists = list.find((c: any) => c._id === entry._id)
                          if (exists) {
                            // update
                            const updated = list.map((c: any) => c._id === entry._id ? { ...c, ...entry } : c)
                            localStorage.setItem('recentConversations', JSON.stringify([entry, ...updated.filter((c:any)=>c._id !== entry._id)].slice(0,50)))
                          } else {
                            list.unshift(entry)
                            localStorage.setItem('recentConversations', JSON.stringify(list.slice(0,50)))
                          }
                        } catch (err) {
                          console.warn('Could not persist recentConversations from product contact', err)
                        }

                        router.push(`/messages/${product.supplier._id}?product=${productInfo}`);
                      }
                    }}
                  >
                    Contact Seller
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <EditProductDialog
        product={product}
        isOpen={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        onSaved={() => {
          setIsEditDialogOpen(false);
          window.location.reload();
        }}
      />
    </>
  );
}