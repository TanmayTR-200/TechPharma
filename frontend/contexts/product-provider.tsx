export function useProduct() {
  return {
    getQuote: () => {},
    viewAllProducts: () => {},
  };
}
import React, { createContext } from 'react';

export const ProductContext = createContext(null);

export function ProductProvider({ children }: { children: React.ReactNode }) {
  return (
    <ProductContext.Provider value={null}>
      {children}
    </ProductContext.Provider>
  );
}
