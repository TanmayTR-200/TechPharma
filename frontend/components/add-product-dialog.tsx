import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useToast } from './ui/use-toast';
import { createUploadWidget } from '@/lib/cloudinary';
import { Plus, Loader2 } from 'lucide-react';
import { CloudinaryScriptLoader } from './cloudinary-script-loader';

export function AddProductDialog() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [product, setProduct] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    stock: '',
    images: [] as string[],
  });

  const handleImageUpload = () => {
    try {
      // Check if cloudinary is loaded
      if (!window.cloudinary) {
        console.error('Cloudinary not loaded');
        toast({
          title: 'Please Wait',
          description: 'Image upload service is initializing. Please try again in a moment.',
          variant: 'default',
        });
        return;
      }

      let uploadWidget = createUploadWidget(
        // Success callback
        (url) => {
          console.log('Upload success, URL:', url);
          // Keep track of the new image
          setProduct(prev => ({
            ...prev,
            images: [...prev.images, url]
          }));
          // Show success message
          toast({
            title: 'Image Added',
            description: 'Image uploaded successfully',
          });
          // Close the widget programmatically
          if (uploadWidget) {
            uploadWidget.close();
          }
        },
        // Error callback
        (error) => {
          console.error('Upload widget error:', error);
          toast({
            title: 'Upload Failed',
            description: error || 'Failed to upload image. Please try again.',
            variant: 'destructive',
          });
        }
      );

      if (!uploadWidget) {
        toast({
          title: 'Upload Error',
          description: 'Image upload service is not responding. Please refresh the page and try again.',
          variant: 'destructive',
        });
        return;
      }

      console.log('Opening upload widget...');
      uploadWidget.open();

    } catch (error) {
      console.error('Image upload error:', error);
      toast({
        title: 'Error',
        description: 'Failed to initialize upload widget. Please refresh the page and try again.',
        variant: 'destructive',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate required fields
      if (!product.name || !product.description || !product.price || !product.category || !product.stock) {
        throw new Error('Please fill in all required fields');
      }

      if (product.images.length === 0) {
        throw new Error('Please upload at least one product image');
      }

      // Get auth token
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }

      // Format the data
      const productData = {
        name: product.name.trim(),
        description: product.description.trim(),
        price: parseFloat(product.price),
        category: product.category,
        stock: parseInt(product.stock),
        images: product.images,
        status: 'active'
      };

      console.log('Sending product data:', productData);

      // Create product with already uploaded image URLs
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(productData),
      });

      console.log('Creating product:', productData);
      const data = await response.json();
      console.log('Server response:', data);

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to create product');
      }

      // Handle different response structures to get the product ID
      let createdProductId;
      if (data._id) {
        createdProductId = data._id; // Direct product object
      } else if (data.product?._id) {
        createdProductId = data.product._id; // Nested product object
      } else if (data.id) {
        createdProductId = data.id; // Alternative ID field
      } else if (typeof data === 'string') {
        createdProductId = data; // Direct ID return
      }

      if (!createdProductId) {
        console.error('Problematic server response:', data);
        throw new Error('Could not find product ID in server response');
      }

      toast({
        title: 'Success!',
        description: 'Your product has been created and is now live in the marketplace.',
        variant: 'default',
      });

      // Reset form
      setProduct({
        name: '',
        description: '',
        price: '',
        category: '',
        stock: '',
        images: [],
      });

      // Add a small delay to ensure the toast is visible
      setTimeout(() => {
        // Redirect to the products page with the new product highlighted
        window.location.href = `/products?created=true&highlight=${createdProductId}#${createdProductId}`;
      }, 1000);
    } catch (error) {
      console.error('Error creating product:', error);
      
      let errorMessage = 'Failed to create product. Please try again.';
      if (error instanceof Error) {
        if (error.message === 'Authentication required') {
          errorMessage = 'Please log in to create a product';
          window.location.href = '/auth?mode=login&message=auth_required';
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <CloudinaryScriptLoader />
      <Dialog>
        <DialogTrigger asChild>
          <Button className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add New Product
          </Button>
        </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Product</DialogTitle>
          <DialogDescription>Fill out the form below to add a new product to your inventory.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="name">Product Name</Label>
            <Input
              id="name"
              value={product.name}
              onChange={(e) => setProduct({ ...product, name: e.target.value })}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={product.description}
              onChange={(e) => setProduct({ ...product, description: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Price</Label>
              <Input
                id="price"
                type="number"
                value={product.price}
                onChange={(e) => setProduct({ ...product, price: e.target.value })}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="stock">Stock</Label>
              <Input
                id="stock"
                type="number"
                value={product.stock}
                onChange={(e) => setProduct({ ...product, stock: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select
              value={product.category}
              onValueChange={(value) => setProduct({ ...product, category: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="electronics">Electronics</SelectItem>
                <SelectItem value="machinery">Machinery</SelectItem>
                <SelectItem value="tools">Tools</SelectItem>
                <SelectItem value="safety">Safety Equipment</SelectItem>
                <SelectItem value="lighting">Lighting</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="images">Product Images</Label>
            <div className="space-y-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleImageUpload}
                className="w-full"
              >
                Upload Images
              </Button>
              {product.images.length > 0 && (
                <div className="grid grid-cols-2 gap-4">
                  {product.images.map((image, index) => (
                    <div key={index} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={image}
                        alt={`Product image ${index + 1}`}
                        className="w-full h-full object-contain bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => setProduct(prev => ({
                          ...prev,
                          images: prev.images.filter((_, i) => i !== index)
                        }))}
                        className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center shadow-sm"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating Product...
              </>
            ) : (
              'Create Product'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
    </>
  );
}
