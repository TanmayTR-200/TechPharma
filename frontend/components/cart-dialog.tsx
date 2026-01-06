import { useCart } from '@/contexts/cart';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
// Using lightweight inline icons/characters here to avoid lucide-react export issues
import { useState } from 'react';
import { useToast } from './ui/use-toast';
import { Card } from './ui/card';
import Image from 'next/image';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { displayRazorpay, type RazorpayOptions } from '@/lib/razorpay';
import { useAuth } from '@/contexts/auth';
import { useRouter } from 'next/navigation';

export function CartDialog() {
  const [open, setOpen] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const { cart, isLoading, updateQuantity, removeFromCart, checkout } = useCart();
  const { toast } = useToast();
  const router = useRouter();
  const { user } = useAuth();
  const [shippingAddress, setShippingAddress] = useState({
    street: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India'
  });

  const handleQuantityChange = async (productId: string, newQuantity: number) => {
    try {
      await updateQuantity(productId, newQuantity);
    } catch (error) {
      console.error('Error updating quantity:', error);
    }
  };

  const handleRemoveItem = async (productId: string) => {
    try {
      await removeFromCart(productId);
    } catch (error) {
      console.error('Error removing item:', error);
    }
  };

  const handleCheckout = async () => {
    try {
      // Validate cart
      if (!cart || cart.items.length === 0) {
        toast({
          title: 'Error',
          description: 'Your cart is empty',
          variant: 'destructive',
        });
        return;
      }

      // Validate shipping address
      if (!shippingAddress.street || !shippingAddress.city || !shippingAddress.state || !shippingAddress.pincode) {
        toast({
          title: 'Error',
          description: 'Please fill in all shipping address fields',
          variant: 'destructive',
        });
        return;
      }

      setIsCheckingOut(true);

      // Create order and get Razorpay order ID
      const order = await checkout('online', shippingAddress);

      if (!order || !order._id || !order.paymentDetails?.razorpayOrderId) {
        throw new Error('Failed to create order');
      }

      // Initialize Razorpay payment
      const options: RazorpayOptions = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
        amount: cart.total * 100, // Razorpay expects amount in smallest currency unit (paise)
        currency: "INR",
        name: "TechPharma",
        description: `Payment for order #${order._id}`,
        orderId: order.paymentDetails.razorpayOrderId,
        prefill: {
          name: user?.name || '',
          email: user?.email || '',
          contact: user?.phone || ''
        },
        notes: {
          orderId: order._id
        },
        theme: {
          color: "#2563eb"
        }
      };

      try {
        await displayRazorpay(options);
        setOpen(false);
        toast({
          title: "Order Placed Successfully",
          description: "Your order has been confirmed. Check your notifications for updates.",
        });
        router.push('/orders');
      } catch (error) {
        throw new Error("Payment failed. Please try again.")
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to process checkout',
        variant: 'destructive',
      });
    } finally {
      setIsCheckingOut(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="icon"
          className="relative"
        >
          <span className="h-5 w-5 inline-flex items-center justify-center text-lg">🛒</span>
          {cart && cart.items.length > 0 && (
            <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {cart.items.length}
            </span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle>Your Cart</DialogTitle>
          <DialogDescription>
            Review your items and proceed to checkout
          </DialogDescription>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-8 w-8 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
        ) : !cart || cart.items.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Your cart is empty</p>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 px-6 overflow-y-auto">
              <div className="space-y-4 pb-4">
                {cart.items.map((item) => (
                  <Card key={item.productId} className="p-4">
                    <div className="flex gap-4">
                      <div className="relative h-20 w-20 rounded-lg overflow-hidden">
                        <Image
                          src={item.product.images[0]}
                          alt={item.product.name}
                          fill
                          sizes="80px"
                          className="object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold">{item.product.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          ₹{item.product.price.toLocaleString('en-IN')}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleQuantityChange(item.productId, item.quantity - 1)}
                            disabled={item.quantity <= 1}
                            aria-label={`Decrease quantity of ${item.product.name}`}
                          >
                            <span className="text-lg font-medium">−</span>
                          </Button>
                          <span className="w-8 text-center">{item.quantity}</span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleQuantityChange(item.productId, item.quantity + 1)}
                            disabled={item.quantity >= item.product.stock}
                            aria-label={`Increase quantity of ${item.product.name}`}
                          >
                            <span className="text-lg font-medium">+</span>
                          </Button>
                          <Button
                            variant="destructive"
                            size="icon"
                            className="h-8 w-8 ml-auto"
                            onClick={() => handleRemoveItem(item.productId)}
                            aria-label={`Remove ${item.product.name} from cart`}
                          >
                            <span className="text-lg">×</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              <div className="space-y-4 pb-4">
                <h3 className="font-semibold">Shipping Address</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="street" className="mb-2 block">Street Address</Label>
                    <Input
                      id="street"
                      value={shippingAddress.street}
                      onChange={(e) => setShippingAddress(prev => ({ ...prev, street: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="city" className="mb-2 block">City</Label>
                    <Input
                      id="city"
                      value={shippingAddress.city}
                      onChange={(e) => setShippingAddress(prev => ({ ...prev, city: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="state" className="mb-2 block">State</Label>
                    <Input
                      id="state"
                      value={shippingAddress.state}
                      onChange={(e) => setShippingAddress(prev => ({ ...prev, state: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="pincode" className="mb-2 block">PIN Code</Label>
                    <Input
                      id="pincode"
                      value={shippingAddress.pincode}
                      onChange={(e) => setShippingAddress(prev => ({ ...prev, pincode: e.target.value }))}
                      required
                    />
                  </div>
                </div>
              </div>
            </ScrollArea>

            <div className="border-t px-6 py-4 bg-background">
              <div className="flex justify-between font-semibold mb-4">
                <span>Total:</span>
                <span>₹{cart.total.toLocaleString('en-IN')}</span>
              </div>
              <Button 
                className="w-full border-2" 
                  onClick={handleCheckout}
                  disabled={isCheckingOut}
                >
                  {isCheckingOut ? (
                    <>
                      <div className="mr-2 h-4 w-4 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Proceed to Online Payment'
                  )}
                </Button>
              </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}