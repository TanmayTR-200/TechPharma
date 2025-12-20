import { Product } from "./product";

export interface CartItem {
  productId: string;
  quantity: number;
  product: Product;
}

export interface Cart {
  userId: string;
  items: CartItem[];
  total: number;
  updatedAt: string;
}