export interface SupplierInfo {
  _id: string;
  name?: string;
  company?: {
    name?: string;
  };
}

export interface Product {
  _id?: string;
  id: string | number;
  name: string;
  description: string;
  price: number;
  category: string;
  images: string[];
  stock: number;
  status?: string;
  userId?: string;
  supplier?: SupplierInfo | string | null;
}
