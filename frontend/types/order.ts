import type { CartItem } from "./cart";

export interface Order {
  _id: string;
  userId: string;
  items: CartItem[];
  totalAmount: number;
  status: string;
  paymentDetails: {
    method: string;
    status: string;
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
  };
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
  createdAt: string;
  updatedAt: string;
  archived?: boolean;
}