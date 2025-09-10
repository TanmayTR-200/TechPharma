import { orderApi } from '@/lib/api';

export interface PaymentOptions {
  amount: number;
  currency: string;
  items: Array<{
    productId: string;
    quantity: number;
  }>;
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
  };
}

export const initializePayment = async (options: PaymentOptions) => {
  try {
    // Just create the order on backend (no payment for now)
    const orderResponse = await orderApi.createOrder({
      items: options.items,
      shippingAddress: options.shippingAddress,
      paymentMethod: 'COD', // Cash on Delivery or placeholder
    });

    console.log("Order created successfully:", orderResponse);

    // Redirect to order success page without payment
    window.location.href = '/orders/success';
  } catch (error) {
    console.error('Order creation failed:', error);
    window.location.href = '/orders/failed';
  }
};
