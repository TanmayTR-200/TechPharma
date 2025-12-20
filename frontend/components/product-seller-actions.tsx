import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { API_ENDPOINTS, fetcher } from '@/lib/api-config';
import { useRouter } from 'next/navigation';

interface ProductSellerActionsProps {
  productId: string | number;
  onEdit: () => void;
}

export function ProductSellerActions({ productId, onEdit }: ProductSellerActionsProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
      return;
    }

    setIsDeleting(true);
    try {
      const token = localStorage.getItem('token');
      await fetcher(API_ENDPOINTS.products.delete(productId.toString()), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });

      toast({
        title: 'Success',
        description: 'Product deleted successfully',
      });

      // Refresh the page to update the product list
      router.refresh();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete product',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <Button
        onClick={onEdit}
        variant="outline"
        className="w-full border-white text-white hover:bg-zinc-800"
      >
        Edit Product
      </Button>
      <Button
        onClick={handleDelete}
        variant="destructive"
        className="w-full !bg-red-600 hover:!bg-red-700 text-white"
        disabled={isDeleting}
      >
        {isDeleting ? 'Deleting...' : 'Delete Product'}
      </Button>
    </div>
  );
}