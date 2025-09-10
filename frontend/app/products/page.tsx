"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { Footer } from "@/components/footer";
import { ProductGrid } from "@/components/product-grid";
import { ProductFilters } from "@/components/product-filters";
import { ProductPagination } from "@/components/product-pagination";
import { useToast } from "@/hooks/use-toast";
import { API_ENDPOINTS, fetcher } from "@/lib/api-config";

import { Product } from '@/types/product';

export default function ProductsPage() {
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [totalProducts, setTotalProducts] = useState(0);

  const category = searchParams.get("category");
  const search = searchParams.get("search");
  const page = parseInt(searchParams.get("page") || "1");
  const sort = searchParams.get("sort") || "featured";
  const created = searchParams.get("created");

  // Define fetchProducts outside useEffect to be able to call it manually
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams(window.location.search);
      const queryParams = new URLSearchParams();
      
      // Add only non-null and non-empty parameters
      if (page) queryParams.set('page', page.toString());
      if (sort) queryParams.set('sort', sort);
      if (category) queryParams.set('category', category.toLowerCase());
      if (search) queryParams.set('search', search);
      if (params.get('priceMin')) queryParams.set('priceMin', params.get('priceMin')!);
      if (params.get('priceMax')) queryParams.set('priceMax', params.get('priceMax')!);

      // Get auth token
      const token = localStorage.getItem('token');
      
      // First check if backend is running
      try {
        const healthCheck = await fetch('http://localhost:5000/health', {
          method: 'GET',
          headers: {
            'Cache-Control': 'no-cache'
          }
        });
        
        if (!healthCheck.ok) {
          throw new Error('Backend server is not responding');
        }
      } catch (error) {
        console.error('Backend health check failed:', error);
        throw new Error('Backend server is not running. Please start the backend server.');
      }
      
      const data = await fetcher(`${API_ENDPOINTS.products.base}?${queryParams}`, {
        headers: {
          'Cache-Control': 'no-cache',
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      
      // Log the response to debug supplier info
      console.log('Products response:', data);
      
      // Handle case where data is direct array of products
      if (Array.isArray(data)) {
        setProducts(data);
        setTotalProducts(data.length);
        return;
      }
      
      // Transform and validate product data
      let processedProducts = [];
      
      if (data.products && Array.isArray(data.products)) {
        processedProducts = data.products;
      } else if (Array.isArray(data)) {
        processedProducts = data;
      } else {
        const extractedProducts = Object.values(data).find(val => Array.isArray(val));
        if (extractedProducts) {
          processedProducts = extractedProducts;
        }
      }

      // Transform products to ensure supplier info is correctly formatted
      const transformedProducts = processedProducts.map((product: any) => {
        // Log raw product data for debugging
        console.log('Raw product data:', {
          id: product._id || product.id,
          supplier: product.supplier,
          userId: product.userId
        });

        // Extract supplier info with proper type checking and transformation
        let transformedSupplier;
        
        if (product.supplier) {
          if (typeof product.supplier === 'string') {
            // If supplier is a string ID, create a supplier object
            transformedSupplier = { _id: product.supplier };
          } else if (typeof product.supplier === 'object') {
            // If supplier is an object, ensure it has required fields
            transformedSupplier = {
              _id: product.supplier._id || product.supplier.id, // Try both _id and id
              name: product.supplier.name || product.supplier.company?.name,
              ...product.supplier
            };
          }
        }
        
        // Fallback to userId if no supplier info is available
        if (!transformedSupplier && product.userId) {
          transformedSupplier = { _id: product.userId };
        }

        // Ensure we have either supplier or userId
        if (!transformedSupplier) {
          console.error('Product missing supplier info:', product);
        }

        return {
          ...product,
          id: product._id || product.id,
          supplier: transformedSupplier || { _id: 'unknown' } // Never return null/undefined
        };
      });

      if (transformedProducts.length === 0 && !Array.isArray(data)) {
        console.error('Could not process products data:', data);
        throw new Error('Could not process products data');
      }

      setProducts(transformedProducts);
      setTotalProducts(data.total || transformedProducts.length);
    } catch (error) {
      console.error('Error fetching products:', error);
      let errorMessage = "Failed to load products. Please try again.";
      
      if (error instanceof Error) {
        if (error.message.includes('Backend server is not running')) {
          errorMessage = "Backend server is not running. Please start the backend server.";
        } else if (error.message.includes('Failed to fetch')) {
          errorMessage = "Could not connect to the server. Please check your connection.";
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Show success message if product was just created
    if (created === 'true') {
      const highlightedProductId = searchParams.get('highlight');
      toast({
        title: "Product Added",
        description: "Your product has been successfully created and is now listed in the marketplace.",
      });
      
      // Clean up URL parameters without triggering a page reload
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('created');
      newUrl.searchParams.delete('highlight');
      window.history.replaceState({}, '', newUrl);

      // Fetch the latest products and scroll to the new one
      fetchProducts().then(() => {
        if (highlightedProductId) {
          setTimeout(() => {
            const element = document.getElementById(highlightedProductId);
            if (element) {
              element.scrollIntoView({ behavior: 'smooth', block: 'center' });
              element.classList.add('highlight-product');
              setTimeout(() => element.classList.remove('highlight-product'), 3000);
            }
          }, 500);
        }
      });
    } else {
      // Regular product fetch
      fetchProducts();
    }
  }, [category, search, page, sort, created, searchParams, toast]);

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-serif font-bold text-foreground mb-2">
            {category ? `${category} Products` : search ? `Search Results: ${search}` : "All Available Products"}
          </h1>
          <p className="text-foreground/70">
            {loading ? "Loading..." : `Browse through our marketplace - ${totalProducts} products available`}
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          <aside className="lg:w-64 flex-shrink-0">
            <div className="bg-card rounded-lg p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-foreground mb-4">Filters</h2>
              <ProductFilters 
                selectedCategory={category}
                selectedSort={sort}
              />
            </div>
          </aside>
          <main className="flex-1">
            <div className="flex items-center justify-between mb-6 bg-card p-4 rounded-lg shadow-sm">
              <p className="text-sm text-foreground/80">
                {!loading && !category && !search && "Showing all products from our trusted suppliers"}
              </p>
              <select
                value={sort}
                onChange={(e) => {
                  const params = new URLSearchParams(window.location.search);
                  params.set('sort', e.target.value);
                  window.location.search = params.toString();
                }}
                className="p-2 border rounded-md min-w-[200px] font-medium bg-black text-white"
              >
                <option value="featured">Featured</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="rating">Highest Rated</option>
                <option value="newest">Newest First</option>
              </select>
            </div>

            <ProductGrid products={products} loading={loading} />
            <ProductPagination 
              currentPage={page}
              totalPages={Math.ceil(totalProducts / 12)}
            />
          </main>
        </div>
      </div>
      <Footer />
    </div>
  );
}
