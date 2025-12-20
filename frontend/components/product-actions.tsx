'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/auth';
import { useProduct } from '@/contexts/product-context';
import { useCart } from '@/contexts/cart';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { initializePayment } from '@/lib/payment';

interface ProductActionsProps {
  product: {
    _id: string;
    name: string;
    supplierId: string;
    price: number;
    description: string;
    images: string[];
    category: string;
    stock: number;
    status: 'active' | 'inactive';
  };
  mode?: 'marketplace' | 'management';
}

export function ProductActions({ product, mode = 'marketplace' }: ProductActionsProps) {
  const { user } = useAuth();
  const { updateProduct, deleteProduct, canEditProduct } = useProduct();
  const { addToCart } = useCart();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);

  const handlePurchase = async () => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to make a purchase',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsProcessing(true);
      await initializePayment({
        amount: product.price * 100, // Convert to smallest currency unit
        currency: 'INR',
        items: [
          {
            productId: product._id,
            quantity: 1,
          },
        ],
        shippingAddress: {
          street: user.company?.address || '',
          city: '',
          state: '',
          country: '',
          zipCode: '',
        },
      });
    } catch (error: any) {
      toast({
        title: 'Payment Failed',
        description: error.message || 'Failed to initialize payment',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGetQuote = async () => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to request a quote',
        variant: 'destructive',
      });
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      // TODO: Implement quote functionality
      toast({
        title: 'Coming Soon',
        description: 'Quote functionality will be available soon',
      });
      
      toast({
        title: 'Message Sent',
        description: 'Quote request functionality coming soon',
      });
    } catch (error: any) {
      toast({
        title: 'Failed to Send Message',
        description: error.message || 'An error occurred while sending your message',
        variant: 'destructive',
      });
    }
  };

  const handleToggleStatus = async () => {
    try {
      if (!canEditProduct(product._id)) {
        throw new Error('You do not have permission to edit this product');
      }

      // If product has no stock, force it to be inactive
      if (product.stock === 0 && product.status === 'active') {
        toast({
          title: 'Cannot Activate',
          description: 'Cannot set product as active when stock is 0',
          variant: 'destructive',
        });
        return;
      }

      const newStatus = product.status === 'active' ? 'inactive' : 'active';
      await updateProduct(product._id, { status: newStatus });

      toast({
        title: 'Status Updated',
        description: `Product is now ${newStatus}`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update product status',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    try {
      if (!canEditProduct(product._id)) {
        throw new Error('You do not have permission to delete this product');
      }

      setIsDeleting(true);
      await deleteProduct(product._id);

      toast({
        title: 'Product Deleted',
        description: 'The product has been successfully deleted',
      });

      // Force refresh the page after successful deletion
      window.location.reload();
    } catch (error: any) {
      console.error('Delete error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete product',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Show management actions for the product owner
  if (mode === 'management' && canEditProduct(product._id)) {
    return (
      <div className="space-y-4">
        <Button
          onClick={handleToggleStatus}
          variant="outline"
          className="w-full"
        >
          {product.status === 'active' ? 'Deactivate Product' : 'Activate Product'}
        </Button>
        
        <Button
          onClick={handleDelete}
          variant="destructive"
          className="w-full bg-red-600 hover:bg-red-700"
          disabled={isDeleting}
        >
          {isDeleting ? 'Deleting...' : 'Delete Product'}
        </Button>
      </div>
    );
  }

  const handleAddToCart = async () => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to add items to cart',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsAddingToCart(true);
      await addToCart(product._id, 1);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add item to cart',
        variant: 'destructive',
      });
    } finally {
      setIsAddingToCart(false);
    }
  };

  // Show marketplace actions for buyers
  return (
    <div className="space-y-4">
      <Button
        onClick={handlePurchase}
        disabled={isProcessing || product.status !== 'active'}
        className="w-full bg-primary hover:bg-primary/90"
      >
        {isProcessing ? 'Processing...' : product.status === 'active' ? 'Buy Now' : 'Product Unavailable'}
      </Button>
      
      {product.status === 'active' && (
        <>
          <Button
            onClick={handleAddToCart}
            variant="secondary"
            className="w-full"
            disabled={isAddingToCart}
          >
            {isAddingToCart ? 'Adding to Cart...' : 'Add to Cart'}
          </Button>
          
          <Button
            onClick={handleGetQuote}
            variant="outline"
            className="w-full"
          >
            Get Quote
          </Button>
        </>
      )}
    </div>
  );
}
