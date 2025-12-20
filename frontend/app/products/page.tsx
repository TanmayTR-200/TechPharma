

"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Footer } from "@/components/footer";
import { ProductGrid } from "@/components/product-grid";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
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
  // if scope is not present we treat it as All implicitly; keep undefined so API isn't sent a scope param
  const scope = searchParams.get("scope");
  const page = parseInt(searchParams.get("page") || "1");
  const sort = searchParams.get("sort") || "featured";

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const filters: Record<string, string> = {};
      if (category) filters.category = category.toLowerCase();
      if (search) filters.search = search;
      if (scope) filters.scope = scope;
      const params = new URLSearchParams(window.location.search);
      if (params.get('priceMin')) filters.priceMin = params.get('priceMin')!;
      if (params.get('priceMax')) filters.priceMax = params.get('priceMax')!;
      const token = localStorage.getItem('token');
            const requestUrl = API_ENDPOINTS.products.list(page, sort, filters);
            // Debug: log the exact request URL and filters so we can diagnose missing results
            // (remove these logs in production)
            // eslint-disable-next-line no-console
            console.debug('[Products] Fetching', requestUrl, { filters });
            const data = await fetcher(requestUrl, {
        headers: {
          'Cache-Control': 'no-cache',
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
            // eslint-disable-next-line no-console
            console.debug('[Products] API response', data);
            // If we requested a category-scoped search but got no results from the API,
            // try a fallback: fetch without scope and perform client-side category matching.
            if (scope === 'category' && (!data || (Array.isArray(data.products) && data.products.length === 0))) {
              try {
                // eslint-disable-next-line no-console
                console.debug('[Products] No results for category-scoped search — running fallback without scope');
                const fallbackFilters = { ...filters };
                delete fallbackFilters.scope;
                const fallbackUrl = API_ENDPOINTS.products.list(page, sort, fallbackFilters);
                // eslint-disable-next-line no-console
                console.debug('[Products] Fallback fetching', fallbackUrl, { fallbackFilters });
                const fallbackData = await fetcher(fallbackUrl, {
                  headers: {
                    'Cache-Control': 'no-cache',
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                  }
                });
                // eslint-disable-next-line no-console
                console.debug('[Products] Fallback API response', fallbackData);
                let fallbackProducts = [];
                if (fallbackData.products && Array.isArray(fallbackData.products)) {
                  fallbackProducts = fallbackData.products;
                } else if (Array.isArray(fallbackData)) {
                  fallbackProducts = fallbackData;
                }
                // perform client-side category matching using the search text
                const q = (search || '').toLowerCase();
                const matched = fallbackProducts.filter((p: any) => p.category && p.category.toLowerCase().includes(q));
                if (matched.length > 0) {
                  // reuse the transformed mapping logic to ensure consistent shape
                  const transformedProducts = matched.map((product: any) => {
                    let transformedSupplier = null;
                    if (product.supplier) {
                      if (typeof product.supplier === 'string') {
                        transformedSupplier = { _id: product.supplier };
                      } else if (typeof product.supplier === 'object') {
                        transformedSupplier = {
                          _id: product.supplier._id || product.supplier.id,
                          name: product.supplier.name || product.supplier.company?.name,
                          ...product.supplier
                        };
                      }
                    }
                    if (!transformedSupplier && product.userId) {
                      transformedSupplier = { _id: product.userId };
                    }
                    if (!transformedSupplier) {
                      transformedSupplier = { _id: 'unknown', name: 'Unknown Supplier' };
                    }
                    const rawImages = Array.isArray(product.images) ? product.images : [];
                    const images = rawImages.filter((img: string) => 
                      typeof img === 'string' && 
                      img.trim() && 
                      (img.startsWith('http://') || img.startsWith('https://'))
                    );
                    if (images.length === 0) {
                      images.push('/placeholder.svg');
                    }
                    let id = typeof product.id === 'number' ? product.id : (product._id ? product._id : null);
                    return {
                      ...product,
                      id,
                      supplier: transformedSupplier,
                      images
                    };
                  });
                  setProducts(transformedProducts);
                  setTotalProducts(matched.length);
                }
              } catch (err) {
                // ignore fallback errors — primary fetch already failed to return results
                // eslint-disable-next-line no-console
                console.warn('[Products] Fallback search failed', err);
              }
            }
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
      const transformedProducts = processedProducts.map((product: any) => {
        let transformedSupplier = null;
        if (product.supplier) {
          if (typeof product.supplier === 'string') {
            transformedSupplier = { _id: product.supplier };
          } else if (typeof product.supplier === 'object') {
            transformedSupplier = {
              _id: product.supplier._id || product.supplier.id,
              name: product.supplier.name || product.supplier.company?.name,
              ...product.supplier
            };
          }
        }
        if (!transformedSupplier && product.userId) {
          transformedSupplier = { _id: product.userId };
        }
        if (!transformedSupplier) {
          transformedSupplier = { _id: 'unknown', name: 'Unknown Supplier' };
        }
        const rawImages = Array.isArray(product.images) ? product.images : [];
        const images = rawImages.filter((img: string) => 
          typeof img === 'string' && 
          img.trim() && 
          (img.startsWith('http://') || img.startsWith('https://'))
        );
        if (images.length === 0) {
          images.push('/placeholder.svg');
        }
        // Always provide a numeric id for frontend filtering
        let id = typeof product.id === 'number' ? product.id : (product._id ? product._id : null);
        return {
          ...product,
          id,
          supplier: transformedSupplier,
          images
        };
      });
      setProducts(transformedProducts);
      setTotalProducts(data.total || transformedProducts.length);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load products. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
    // Re-fetch when any of these search params change
  }, [category, search, scope, page, sort]);

  // Apply price range filter
  const priceMin = searchParams.get('priceMin') ? parseInt(searchParams.get('priceMin')!) : 0;
  const priceMax = searchParams.get('priceMax') ? parseInt(searchParams.get('priceMax')!) : 10000;
  let filteredProducts = products;
  if (category) {
    const categories = category.toLowerCase().split(',');
    filteredProducts = filteredProducts.filter(p => 
      p.category && categories.includes(p.category.toLowerCase())
    );
  }
  filteredProducts = filteredProducts.filter(p => typeof p.price === 'number' && p.price >= priceMin && p.price <= priceMax);

  return (
    <div className="min-h-screen flex flex-col">
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8">
        <div className="flex gap-8 relative">
          <aside className="w-64 flex-shrink-0 -ml-4">
            <div className="fixed w-64" style={{ top: '5.5rem' }}>
              <ProductFilters selectedCategory={category} selectedSort={sort} />
            </div>
          </aside>
          <main className="flex-1 min-h-screen">
            <div className="text-center mb-4 -mt-1">
              <h1 className="text-3xl font-serif font-bold text-black mb-1.5">
                {category ? `${category.split(',').map(cat => cat.charAt(0).toUpperCase() + cat.slice(1)).join(', ')} Products` : search ? `Search Results: ${search}` : "All Available Products"}
              </h1>
              <p className="text-black">
                {loading ? "Loading..." : `Browse through our marketplace - ${filteredProducts.length} products available`}
              </p>
              {category && (
                <div className="flex items-center justify-center gap-3 mt-4 mb-2">
                  <div className="flex flex-wrap gap-2 justify-center">
                    {category.split(',').map((filter) => (
                      <Badge key={filter} variant="secondary" className="flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-md shadow-blue-500/20 border-0 hover:from-blue-700 hover:to-blue-600 transition-all duration-200 px-3 py-1.5 rounded-full">
                        {filter.charAt(0).toUpperCase() + filter.slice(1)}
                        <button
                          type="button"
                          aria-label={`Remove filter ${filter}`}
                          className="ml-0.5 p-1 rounded-full hover:bg-blue-700/50 focus:outline-none transition-colors"
                          onClick={() => {
                            const newCategories = category.split(',').filter(c => c !== filter).join(',');
                            if (newCategories) {
                              window.location.search = `?category=${newCategories}`;
                            } else {
                              window.location.search = '';
                            }
                          }}
                        >
                          <X className="h-3.5 w-3.5 cursor-pointer hover:text-white/90" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      window.location.search = '';
                    }}
                    className="text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 font-medium h-8 px-4 rounded-full"
                  >
                    Clear All
                  </Button>
                </div>
              )}
            </div>
            <div className="mb-4">
              <ProductGrid products={filteredProducts} loading={loading} />
            </div>
            <div className="mt-4 border-t bg-white py-4">
              <ProductPagination 
                currentPage={page}
                totalPages={Math.ceil(filteredProducts.length / 12)}
              />
            </div>
          </main>
        </div>
      </div>
      <Footer />
    </div>
  );
}

