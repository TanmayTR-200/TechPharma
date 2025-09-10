'use client';

import { createContext, useContext, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-new';
import { useRouter } from 'next/navigation';

type Product = {
  id: string | number;
  name: string;
  price: string;
  supplier: string;
};

type ProductContextType = {
  getQuote: (product: Product) => Promise<void>;
  viewAllProducts: () => void;
  searchProducts: (query: string) => Promise<void>;
  isLoading: boolean;
};

const ProductContext = createContext<ProductContextType | undefined>(undefined);

export function ProductProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const router = useRouter();

  const getQuote = async (product: Product) => {
    try {
      setIsLoading(true);
      if (!user) {
        toast({
          title: 'Authentication Required',
          description: 'Please login to request a quote',
          variant: 'destructive',
        });
        return;
      }

      await fetch('/api/quotes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ productId: product.id }),
      });

      toast({
        title: 'Quote Requested',
        description: 'The supplier will contact you soon',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to request quote. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const viewAllProducts = () => {
    router.push('/products');
  };

  const searchProducts = async (query: string) => {
    try {
      setIsLoading(true);
      router.push(`/products?search=${encodeURIComponent(query)}`);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to search products. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ProductContext.Provider value={{ getQuote, viewAllProducts, searchProducts, isLoading }}>
      {children}
    </ProductContext.Provider>
  );
}

export function useProduct() {
  const context = useContext(ProductContext);
  if (context === undefined) {
    throw new Error('useProduct must be used within a ProductProvider');
  }
  return context;
}
