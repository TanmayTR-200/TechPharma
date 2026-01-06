"use client";

import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { API_ENDPOINTS, fetcher } from '@/lib/api-config';
import Image from 'next/image';
import { Button } from './ui/button';
import { ShoppingCart } from 'lucide-react';
import { useCart } from '@/contexts/cart';
import { useToast } from './ui/use-toast';

interface ProductPreviewDialogProps {
  product: any | null;
  isOpen: boolean;
  onClose: () => void;
}

interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  stock: number;
  images: string[];
  sellerId: string;
  sellerName?: string;
}

export function ProductPreviewDialog({ product: propProduct, isOpen, onClose }: ProductPreviewDialogProps) {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const { addToCart } = useCart();
  const { toast } = useToast();

  useEffect(() => {
    if (!propProduct || !isOpen) {
      setProduct(null);
      return;
    }
    // Use the product passed from parent
    setProduct(propProduct);
  }, [propProduct, isOpen]);

  const handleAddToCart = async () => {
    if (!product) return;
    try {
      await addToCart(product._id, 1);
      toast({
        title: '✓ Added to cart',
        description: `${product.name} has been added to your cart`,
      });
      // Close dialog after a short delay
      setTimeout(() => onClose(), 500);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add product to cart',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl p-0 bg-gray-900 border-gray-800">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-pulse space-y-4">
              <div className="h-6 bg-gray-700 rounded w-3/4 mx-auto"></div>
              <div className="h-4 bg-gray-700 rounded w-1/2 mx-auto"></div>
            </div>
            <p className="mt-4 text-gray-400">Loading product...</p>
          </div>
        ) : product ? (
          <div className="flex flex-col md:flex-row">
            {/* Left: Product Image */}
            <div className="md:w-1/2 bg-gray-800 p-6 flex items-center justify-center">
              <div className="relative w-full aspect-square max-w-md">
                <Image
                  src={product.images[0] || '/placeholder.png'}
                  alt={product.name}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-contain rounded-lg"
                />
              </div>
            </div>
            
            {/* Right: Product Details */}
            <div className="md:w-1/2 p-6 flex flex-col">
              <DialogHeader className="mb-4">
                <DialogTitle className="text-2xl text-white">{product.name}</DialogTitle>
                <DialogDescription className="text-gray-400">
                  View product details and add to cart
                </DialogDescription>
              </DialogHeader>
              
              <div className="flex-1 space-y-4">
                <div>
                  <p className="text-sm text-gray-400 uppercase tracking-wide">Category</p>
                  <p className="text-white">{product.category}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-400 uppercase tracking-wide">Description</p>
                  <p className="text-white">{product.description}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-400 uppercase tracking-wide">Price</p>
                  <p className="text-3xl font-bold text-white">₹{product.price.toLocaleString('en-IN')}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-400 uppercase tracking-wide">Stock</p>
                  <p className="text-white">{product.stock > 0 ? `${product.stock} units available` : 'Out of stock'}</p>
                </div>
                
                {product.sellerName && (
                  <div>
                    <p className="text-sm text-gray-400 uppercase tracking-wide">Seller</p>
                    <p className="text-white">{product.sellerName}</p>
                  </div>
                )}
              </div>
              
              <div className="mt-6 flex gap-3">
                <Button
                  onClick={handleAddToCart}
                  disabled={product.stock === 0}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Add to Cart
                </Button>
                <Button
                  onClick={onClose}
                  variant="outline"
                  className="border-gray-600 text-gray-300 hover:bg-gray-800"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center">
            <p className="text-gray-400">Product not found</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
