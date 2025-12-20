"use client";

import { useRouter, useSearchParams } from 'next/navigation';

export const useProductNavigation = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const navigateToProducts = ({
    category,
    search,
    page = 1,
    sortBy = 'featured',
    priceMin,
    priceMax
  }: {
    category?: string;
    search?: string;
    page?: number;
    sortBy?: string;
    priceMin?: string;
    priceMax?: string;
  }) => {
    const params = new URLSearchParams();
    
    // Only set parameters that are explicitly provided
    if (category) {
      params.set('category', category);
    }
    if (search) {
      params.set('search', search);
    }
    if (page && page > 1) {
      params.set('page', page.toString());
    }
    if (sortBy && sortBy !== 'featured') {
      params.set('sort', sortBy);
    }
    if (priceMin && priceMin !== '0') {
      params.set('priceMin', priceMin);
    }
    if (priceMax && priceMax !== '10000') {
      params.set('priceMax', priceMax);
    }

    const queryString = params.toString();
    router.push(`/products${queryString ? `?${queryString}` : ''}`);
  };

  return {
    navigateToProducts
  };
};
