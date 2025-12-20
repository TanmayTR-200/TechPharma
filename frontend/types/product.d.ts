export interface SupplierInfo {
  _id: string;
  name: string;
  email: string;
  role: 'supplier';
}

export interface Product {
  id: string | number;
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  images: string[];
  status?: 'active' | 'inactive';
  supplier: SupplierInfo | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductResponse {
  products: Product[];
  total: number;
  page: number;
  limit: number;
}