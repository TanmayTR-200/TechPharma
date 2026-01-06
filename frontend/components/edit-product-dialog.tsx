import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { API_ENDPOINTS, fetcher } from '@/lib/api-config';
import { Product } from '@/types/product';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { uploadToCloudinary } from '@/lib/cloudinary';

interface EditProductDialogProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function EditProductDialog({ product, isOpen, onClose, onSaved }: EditProductDialogProps) {
  const [name, setName] = useState(product.name);
  const [description, setDescription] = useState(product.description);
  const [price, setPrice] = useState(product.price.toString());
  const [stock, setStock] = useState(product.stock.toString());
  const [category, setCategory] = useState(product.category);
  const [images, setImages] = useState<string[]>(product.images || []);
  const [isSaving, setIsSaving] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const { toast } = useToast();
  const dialogTitleId = 'edit-product-title';
  const dialogDescriptionId = 'edit-product-description';

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
      if (files.length + images.length > 5) {
        toast({
          title: 'Too Many Images',
          description: `You can only upload up to 5 images total. You can select ${5 - images.length} more images.`,
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
            setImages(prev => [...prev, result.url]);
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
    setIsSaving(true);

    try {
      if (images.length === 0) {
        throw new Error('Please upload at least one product image');
      }

      const token = localStorage.getItem('token');
      // Always use the string _id for backend requests
      if (!product._id) {
        throw new Error('Product ID not found');
      }
      await fetcher(`${API_ENDPOINTS.products.base}/${product._id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          description,
          price: parseFloat(price),
          stock: parseInt(stock),
          category,
          images
        }),
      });

      toast({
        title: 'Success',
        description: 'Product updated successfully',
      });

      onSaved();
      onClose();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update product',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent 
        className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto bg-black text-white border-zinc-800"
        aria-labelledby={dialogTitleId}
        aria-describedby={dialogDescriptionId}
      >
        <DialogHeader>
          <DialogTitle id={dialogTitleId}>Edit Product</DialogTitle>
          <DialogDescription id={dialogDescriptionId}>
            Make changes to your product details below.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Product Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter product name"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter product description"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Price</Label>
              <Input
                id="price"
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="Enter price"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="stock">Stock</Label>
              <Input
                id="stock"
                type="number"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                placeholder="Enter stock"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-9 px-3 py-1 w-[200px]">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="electronics">Electronics</SelectItem>
                <SelectItem value="machinery">Machinery</SelectItem>
                <SelectItem value="tools">Tools</SelectItem>
                <SelectItem value="safety">Safety Equipment</SelectItem>
                <SelectItem value="lighting">Lighting</SelectItem>
                <SelectItem value="lighting">Lighting</SelectItem>
              </SelectContent>
            </Select>
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
              
              {images.length > 0 && (
                <div className="space-y-4">
                  {/* Current Image Display */}
                  <div className="relative aspect-video rounded-lg overflow-hidden border border-zinc-700">
                    <img
                      src={images[currentImageIndex]}
                      alt={`Product image ${currentImageIndex + 1}`}
                      className="w-full h-full object-contain bg-zinc-900"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setImages(prev => prev.filter((_, i) => i !== currentImageIndex));
                        setCurrentImageIndex(prev => prev > 0 ? prev - 1 : 0);
                      }}
                      className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center shadow-sm"
                    >
                      ×
                    </button>
                    
                    {/* Navigation Arrows */}
                    {images.length > 1 && (
                      <>
                        <button
                          type="button"
                          onClick={() => setCurrentImageIndex(prev => (prev - 1 + images.length) % images.length)}
                          className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full w-8 h-8 flex items-center justify-center transition-all"
                          aria-label="Previous image"
                        >
                          ←
                        </button>
                        <button
                          type="button"
                          onClick={() => setCurrentImageIndex(prev => (prev + 1) % images.length)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full w-8 h-8 flex items-center justify-center transition-all"
                          aria-label="Next image"
                        >
                          →
                        </button>
                      </>
                    )}
                  </div>

                  {/* Image Thumbnails */}
                  <div className="grid grid-cols-5 gap-2">
                    {images.map((image, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => setCurrentImageIndex(index)}
                        className={`relative aspect-square rounded overflow-hidden border-2 ${
                          currentImageIndex === index ? 'border-blue-500' : 'border-transparent'
                        }`}
                      >
                        <img
                          src={image}
                          alt={`Thumbnail ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={onClose}
              type="button"
              className="border-white text-white hover:bg-zinc-800"
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}