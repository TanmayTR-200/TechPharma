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
    const params = new URLSearchParams(searchParams.toString());
    
    if (category) {
      params.set('category', category);
    }
    if (search) {
      params.set('search', search);
    }
    if (page && page > 1) {
      params.set('page', page.toString());
    }
    if (sortBy) {
      params.set('sort', sortBy);
    }
    if (priceMin) {
      params.set('priceMin', priceMin);
    }
    if (priceMax) {
      params.set('priceMax', priceMax);
    }

    const queryString = params.toString();
    router.push(`/products${queryString ? `?${queryString}` : ''}`);
  };

  return {
    navigateToProducts
  };
};
