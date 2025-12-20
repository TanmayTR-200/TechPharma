import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './auth';
import { API_ENDPOINTS, fetcher } from '@/lib/api-config';
import { useToast } from '@/components/ui/use-toast';

interface CartItem {
  productId: string;
  quantity: number;
  addedAt: string;
  product: {
    _id: string;
    name: string;
    price: number;
    images: string[];
    stock: number;
  };
  totalPrice: number;
}

interface Cart {
  items: CartItem[];
  total: number;
}

import { Order } from '@/types/order';

interface CartContextType {
  cart: Cart | null;
  isLoading: boolean;
  addToCart: (productId: string, quantity: number) => Promise<void>;
  updateQuantity: (productId: string, quantity: number) => Promise<void>;
  removeFromCart: (productId: string) => Promise<void>;
  checkout: (paymentMethod: string, shippingAddress: Order['shippingAddress']) => Promise<Order | undefined>;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchCart = async () => {
    try {
      const response = await fetcher(API_ENDPOINTS.cart.base);
      if (response.success) {
        setCart(response.cart);
      }
    } catch (error) {
      console.error('Error fetching cart:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch cart',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const refreshCart = async () => {
    setIsLoading(true);
    await fetchCart();
  };

  useEffect(() => {
    if (user) {
      fetchCart();
    } else {
      setCart(null);
      setIsLoading(false);
    }
  }, [user]);

  const addToCart = async (productId: string, quantity: number) => {
    try {
      setIsLoading(true);
      const response = await fetcher(API_ENDPOINTS.cart.add, {
        method: 'POST',
        body: JSON.stringify({ productId, quantity }),
      });

      if (response.success) {
        setCart(response.cart);
        toast({
          title: 'Success',
          description: 'Item added to cart',
        });
      }
    } catch (error: any) {
      console.error('Error adding to cart:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to add item to cart',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateQuantity = async (productId: string, quantity: number) => {
    try {
      setIsLoading(true);
      const response = await fetcher(`${API_ENDPOINTS.cart.base}/update/${productId}`, {
        method: 'PUT',
        body: JSON.stringify({ quantity }),
      });

      if (response.success) {
        setCart(response.cart);
      }
    } catch (error: any) {
      console.error('Error updating cart:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update cart',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const removeFromCart = async (productId: string) => {
    try {
      setIsLoading(true);
      const response = await fetcher(`${API_ENDPOINTS.cart.base}/remove/${productId}`, {
        method: 'DELETE',
      });

      if (response.success) {
        setCart(response.cart);
        toast({
          title: 'Success',
          description: 'Item removed from cart',
        });
      }
    } catch (error: any) {
      console.error('Error removing from cart:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove item from cart',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const checkout = async (paymentMethod: string, shippingAddress: any) => {
    try {
      setIsLoading(true);
      const response = await fetcher(`${API_ENDPOINTS.cart.base}/checkout`, {
        method: 'POST',
        body: JSON.stringify({ paymentMethod, shippingAddress }),
      });

      if (response.success) {
        setCart({ items: [], total: 0 });
        toast({
          title: 'Success',
          description: 'Order placed successfully',
        });
        return response.order;
      }
    } catch (error: any) {
      console.error('Error during checkout:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to process checkout',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        isLoading,
        addToCart,
        updateQuantity,
        removeFromCart,
        checkout,
        refreshCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}