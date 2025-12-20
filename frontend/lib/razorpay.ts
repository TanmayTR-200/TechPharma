// Razorpay configuration and utils
import { loadScript } from "@/lib/utils"

export interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  orderId: string;
  prefill: {
    name: string;
    email: string;
    contact: string;
  };
  notes: {
    orderId: string;
  };
  theme: {
    color: string;
  };
}

export const initializeRazorpay = async () => {
  return new Promise((resolve) => {
    loadScript("https://checkout.razorpay.com/v1/checkout.js").then((res) => {
      resolve(true);
    });
  });
};

export const displayRazorpay = async (options: RazorpayOptions) => {
  const res = await initializeRazorpay();

  if (!res) {
    alert("Razorpay SDK failed to load. Please try again later.");
    return;
  }

  const paymentObject = new (window as any).Razorpay(options);
  paymentObject.open();
};

// Example usage:
/*
const handlePayment = async () => {
  const order = await createOrder(); // Call your backend to create order
  
  const options: RazorpayOptions = {
    key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
    amount: order.amount,
    currency: "INR",
    name: "TechPharma",
    description: "Payment for your order",
    orderId: order.id,
    prefill: {
      name: user.name,
      email: user.email,
      contact: user.phone
    },
    notes: {
      orderId: order._id
    },
    theme: {
      color: "#3B82F6"
    }
  };

  displayRazorpay(options);
};
*/