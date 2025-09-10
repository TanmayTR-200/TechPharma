'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/auth-new';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { initializePayment } from '@/lib/payment';

interface ProductActionsProps {
  product: {
    id: string;
    name: string;
    supplierId: string;
    priceRange: {
      min: number;
      max: number;
      currency: string;
    };
  };
}

export function ProductActions({ product }: ProductActionsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePurchase = async () => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to make a purchase',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsProcessing(true);
      await initializePayment({
        amount: product.priceRange.min * 100, // Convert to smallest currency unit
        currency: product.priceRange.currency,
        items: [
          {
            productId: product.id,
            quantity: 1,
          },
        ],
        shippingAddress: {
          street: user.company?.address || '',
          city: '',
          state: '',
          country: '',
          zipCode: '',
        },
      });
    } catch (error: any) {
      toast({
        title: 'Payment Failed',
        description: error.message || 'Failed to initialize payment',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGetQuote = async () => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to request a quote',
        variant: 'destructive',
      });
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      // Create a new conversation with the initial message
      const response = await fetch('http://localhost:5000/api/messages', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          receiverId: product.supplierId, // Make sure your product object includes supplierId
          content: `Hi, I'm interested in your product. Can you provide more information?\nProduct: ${product.name}\nLink: /products/${product.id}`,
          productId: product.id
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      // Redirect to messages page
      window.location.href = '/messages';
      
      toast({
        title: 'Message Sent',
        description: 'You can continue the conversation in the messages page',
      });
    } catch (error: any) {
      toast({
        title: 'Failed to Send Message',
        description: error.message || 'An error occurred while sending your message',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-4">
      <Button
        onClick={handlePurchase}
        disabled={isProcessing}
        className="w-full bg-primary hover:bg-primary/90"
      >
        {isProcessing ? 'Processing...' : 'Buy Now'}
      </Button>
      
      <Button
        onClick={handleGetQuote}
        variant="outline"
        className="w-full"
      >
        Get Quote
      </Button>
    </div>
  );
}
