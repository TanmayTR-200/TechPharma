"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "./auth";
import { useRouter } from "next/navigation";
import { API_ENDPOINTS } from "@/lib/api-endpoints";

type Product = {
  _id: string
  id?: string | number // Add optional id field that can be string or number
  name: string
  description: string
  price: number
  category: string
  stock: number
  images: string[]
  supplierId: string
  userId: string
  status: 'active' | 'inactive'
  createdAt: string
  updatedAt: string
}

type ProductContextType = {
  products: Product[]
  userProducts: Product[]
  isLoading: boolean
  refreshProducts: () => Promise<void>
  createProduct: (productData: Omit<Product, '_id' | 'supplierId' | 'createdAt' | 'updatedAt'>) => Promise<Product>
  updateProduct: (productId: string, updates: Partial<Product>) => Promise<Product>
  deleteProduct: (productId: string) => Promise<void>
  canEditProduct: (productId: string) => boolean
  getQuote: (product: Product) => Promise<void>
  viewAllProducts: () => void
  searchProducts: (query: string) => Promise<void>
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

const ProductProvider = ({ children }: { children: React.ReactNode }): React.ReactElement => {
  const [products, setProducts] = useState<Product[]>([])
  const [userProducts, setUserProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const { user } = useAuth()
  const router = useRouter()

  // Function to refresh product lists
  const refreshProducts = async () => {
    try {
      setIsLoading(true)
      const token = localStorage.getItem('token')
      if (!token) return

      // Fetch all products
      const allProductsRes = await fetch(API_ENDPOINTS.products.base);
      if (allProductsRes.ok) {
        const data = await allProductsRes.json();
        const allProducts = Array.isArray(data) ? data : (data.products || []);
        setProducts(allProducts);
        // Filter products for current user
        if (user && user._id) {
          setUserProducts(allProducts.filter((p: Product) => p.userId === user._id || !p.userId));
        } else {
          setUserProducts(allProducts);
        }
      }
    } catch (error) {
      console.error('Error refreshing products:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Create a new product
  const createProduct = async (productData: Omit<Product, '_id' | 'supplierId' | 'createdAt' | 'updatedAt'>) => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }

      if (!user?._id) {
        throw new Error('User not found');
      }

      // Clean up the payload
      const cleanPayload = {
        name: productData.name.trim(),
        description: productData.description.trim(),
        price: parseFloat(String(productData.price)),
        category: productData.category.trim(),
        stock: parseInt(String(productData.stock)),
        images: Array.isArray(productData.images) ? productData.images : [],
        status: productData.status || 'active',
        userId: user._id // Add userId from logged in user
      };

      console.log('Sending payload:', cleanPayload);
      
      const response = await fetch(API_ENDPOINTS.products.base, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(cleanPayload)
      });

      const result = await response.json();
      console.log('API Response:', result);
      
      if (!response.ok) {
        console.error('Server error:', result);
        const errorMessage = result.error ? 
          (result.details ? `${result.error}: ${JSON.stringify(result.details)}` : result.error) 
          : 'Failed to create product';
        throw new Error(errorMessage);
      }

      // Show success message
      toast({
        title: 'Success',
        description: 'Product created successfully',
        variant: 'default',
      });

      // Sync with backend
      await refreshProducts();

      return result.product;
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create product',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }

  // Update a product
  const updateProduct = async (productId: string, updates: Partial<Product>) => {
    try {
      if (!canEditProduct(productId)) {
        throw new Error('Unauthorized to edit this product')
      }

      setIsLoading(true)
      const token = localStorage.getItem('token')
      if (!token) throw new Error('Authentication required')

      // Find the product to get both _id and numeric id
      const product = products.find(p => p._id === productId || p.id === productId);
      if (!product) {
        throw new Error('Product not found');
      }

      const response = await fetch(`${API_ENDPOINTS.products.base}/${product._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...updates,
          userId: product.userId // Ensure we keep the original userId
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update product');
      }

      const updatedProduct = await response.json();
      
      // Update local state
      setProducts(prev => prev.map(p => p._id === productId ? updatedProduct : p));
      setUserProducts(prev => prev.map(p => p._id === productId ? updatedProduct : p));

      toast({
        title: 'Product Updated',
        description: 'Your product has been updated successfully.',
      });

      return updatedProduct
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update product',
        variant: 'destructive',
      })
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  // Delete a product
  const deleteProduct = async (productId: string) => {
    try {
      if (!canEditProduct(productId)) {
        throw new Error('Unauthorized to delete this product')
      }

      setIsLoading(true)
      const token = localStorage.getItem('token')
      if (!token) throw new Error('Authentication required')

      // Find the product to get both _id and numeric id
      const product = products.find(p => p._id === productId || p.id === productId);
      if (!product) {
        throw new Error('Product not found');
      }

      // Use the delete endpoint from API_ENDPOINTS
      const deleteUrl = API_ENDPOINTS.products.delete(product._id);
      console.log('Deleting product at:', deleteUrl);

      const response = await fetch(deleteUrl, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Delete error response:', errorData);
        throw new Error(errorData.message || 'Failed to delete product');
      }

      // Update local state
      setProducts(prev => prev.filter(p => p._id !== productId && p.id !== productId))
      setUserProducts(prev => prev.filter(p => p._id !== productId && p.id !== productId))

      toast({
        title: 'Product Deleted',
        description: 'Your product has been deleted successfully.',
      })

      // Refresh products list to ensure sync with server
      await refreshProducts();
    } catch (error: any) {
      console.error('Delete error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete product',
        variant: 'destructive',
      })
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  // Check if user can edit a product
  const canEditProduct = (productId: string) => {
    if (!user) return false;
    const product = userProducts.find(p => p._id === productId || p.id === productId);
    return product?.userId === user._id || product?.supplierId === user._id;
  };

  const getQuote = async (product: Product) => {
    try {
      setIsLoading(true)
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please login to request a quote",
          variant: "destructive",
        })
        return
      }

      // Create quote request
      await fetch(`${API_ENDPOINTS.products.base}/quotes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ productId: product._id }),
      })

      toast({
        title: "Quote Requested",
        description: "The supplier will contact you soon",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to request quote. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Load initial products
  // Navigation functions
  const viewAllProducts = () => {
    router.push("/products");
  };

  const searchProducts = async (query: string, scope?: string) => {
    try {
      const q = query?.toString().trim();
      // If query is empty or only whitespace, navigate to products list without search param
      if (!q) {
        router.push('/products');
        return;
      }

      setIsLoading(true);
      const params = new URLSearchParams();
      params.set('search', q);
      if (scope && scope !== 'all') params.set('scope', scope);
      router.push(`/products?${params.toString()}`);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to search products. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Load initial products
  useEffect(() => {
    if (user) {
      refreshProducts()
    }
  }, [user])

  const contextValue: ProductContextType = {
    products,
    userProducts,
    isLoading,
    refreshProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    canEditProduct,
    getQuote,
    viewAllProducts,
    searchProducts
  };

  return (
    <ProductContext.Provider value={contextValue}>
      {children}
    </ProductContext.Provider>
  );
}

function useProduct(): ProductContextType {
  const context = useContext(ProductContext);
  if (context === undefined) {
    throw new Error("useProduct must be used within a ProductProvider");
  }
  return context;
}

export { ProductProvider as default, useProduct };