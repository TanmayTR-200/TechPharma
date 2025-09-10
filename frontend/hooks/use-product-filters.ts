import { useEffect, useState } from 'react';
import { PRODUCT_CATEGORIES, Category } from '@/lib/constants';

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  stock: number;
  images: string[];
  status: string;
  userId: string;
}

export function useProductFilters() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categoryCounts, setCategoryCounts] = useState<Category[]>(PRODUCT_CATEGORIES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const response = await fetch('http://localhost:5000/api/products');
        if (!response.ok) {
          throw new Error('Failed to fetch products');
        }
        const data = await response.json();
        setProducts(data);
        
        // Update category counts
        const counts = PRODUCT_CATEGORIES.map(category => {
          const count = data.filter((product: Product) => 
            product.category.toLowerCase() === category.name.toLowerCase()
          ).length;
          return { ...category, count };
        });
        setCategoryCounts(counts);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch products');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  return {
    products,
    categoryCounts,
    loading,
    error
  };
}
