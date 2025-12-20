import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';
import { useAuth } from '@/contexts/auth';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useToast } from '@/hooks/use-toast';
import { useProduct } from '@/contexts/product-context';
import { Loader2 } from 'lucide-react';
import { uploadToCloudinary } from '@/lib/cloudinary';

export function AddProductDialog() {
  const { toast } = useToast();
  const router = useRouter();
  const { createProduct } = useProduct();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [product, setProduct] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    stock: '',
    images: [] as string[],
  });

  const handleImageUpload = () => {
    // Create a hidden file input element
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/png, image/jpeg, image/gif';
    fileInput.multiple = true;

    // Handle file selection
    fileInput.onchange = async (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (!files || files.length === 0) return;

      // Validate number of images
      if (files.length + product.images.length > 5) {
        toast({
          title: 'Too Many Images',
          description: `You can only upload up to 5 images total. You can select ${5 - product.images.length} more images.`,
          variant: 'destructive',
        });
        return;
      }

      // Validate file sizes
      for (let i = 0; i < files.length; i++) {
        if (files[i].size > 5 * 1024 * 1024) { // 5MB
          toast({
            title: 'File Too Large',
            description: `${files[i].name} is larger than 5MB`,
            variant: 'destructive',
          });
          return;
        }
      }

      let uploadedCount = 0;
      const errors = [];

      // Upload files one by one
      for (const file of Array.from(files)) {
        try {
          const result = await uploadToCloudinary(file);
          
          if (result.url) {
            setProduct(prev => ({
              ...prev,
              images: [...prev.images, result.url]
            }));
            uploadedCount++;
          } else {
            throw new Error(`Failed to upload ${file.name}`);
          }
        } catch (error) {
          console.error('Upload error:', error);
          errors.push(file.name);
        }
      }

      // Show final status
      if (uploadedCount > 0) {
        toast({
          title: 'Upload Complete',
          description: `Successfully uploaded ${uploadedCount} image${uploadedCount !== 1 ? 's' : ''}`,
          variant: 'default',
        });
      }

      if (errors.length > 0) {
        toast({
          title: 'Some Uploads Failed',
          description: `Failed to upload: ${errors.join(', ')}`,
          variant: 'destructive',
        });
      }
    };

    // Trigger file selection
    fileInput.click();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!user?._id) {
        throw new Error('You must be logged in to create a product');
      }

      if (!product.name || !product.description || !product.price || !product.category || !product.stock) {
        throw new Error('Please fill in all required fields');
      }

      if (product.images.length === 0) {
        throw new Error('Please upload at least one product image');
      }

      const productData = {
        userId: user._id,
        name: product.name.trim(),
        description: product.description.trim(),
        price: parseFloat(product.price),
        category: product.category,
        stock: parseInt(product.stock),
        images: product.images,
        status: 'active' as const
      };

      // Create the product
      await createProduct(productData);

      // Reset form
      setProduct({
        name: '',
        description: '',
        price: '',
        category: '',
        stock: '',
        images: [],
      });

      // Close dialog
      setIsOpen(false);

      toast({
        title: 'Success',
        description: 'Product created successfully',
        variant: 'default',
      });
    } catch (error) {
      console.error('Error creating product:', error);
      
      let errorMessage = 'Failed to create product. Please try again.';
      if (error instanceof Error) {
        errorMessage = error.message;
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
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2 border-white hover:bg-zinc-800" disabled={loading}>
          Add New Product
          <span>+</span>
        </Button>
      </DialogTrigger>
      <DialogContent
        className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto bg-black text-white border-zinc-800"
        aria-describedby="add-product-description"
        onPointerDownOutside={(e) => {
          // Prevent closing dialog if form is submitting
          if (loading) {
            e.preventDefault();
          }
        }}
        onInteractOutside={(e) => {
          // Prevent closing dialog if form is submitting
          if (loading) {
            e.preventDefault();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-white">Add New Product</DialogTitle>
          <DialogDescription id="add-product-description">
            Fill out the form below to add a new product to your inventory.
          </DialogDescription>
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
            <select
              id="category"
              value={product.category}
              onChange={(e) => setProduct({ ...product, category: e.target.value })}
              className="flex h-9 w-[200px] items-center justify-between rounded-md border border-zinc-700 bg-zinc-900 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="" disabled>Select Category</option>
              <option value="electronics">Electronics</option>
              <option value="machinery">Machinery</option>
              <option value="tools">Tools</option>
              <option value="safety">Safety Equipment</option>
              <option value="lighting">Lighting</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="images">Product Images</Label>
            <div className="space-y-4">
              <Button 
                type="button" 
                variant="secondary" 
                className="w-full h-auto py-4 flex flex-col items-center gap-2"
                onClick={handleImageUpload}
              >
                <Loader2 className="w-6 h-6" />
                <span>Upload Product Images</span>
                <p className="text-sm text-gray-400 font-normal">PNG, JPG, GIF up to 5MB each (max 5 images)</p>
              </Button>
              
              {product.images.length > 0 && (
                <div className="grid grid-cols-2 gap-4">
                  {product.images.map((image, index) => (
                    <div key={index} className="relative aspect-square rounded-lg overflow-hidden border border-zinc-700">
                      <img
                        src={image}
                        alt={`Product image ${index + 1}`}
                        className="w-full h-full object-contain bg-zinc-900"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setProduct(prev => ({
                            ...prev,
                            images: prev.images.filter((_, i) => i !== index)
                          }));
                        }}
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
  );
}
