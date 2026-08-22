import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { API_ENDPOINTS, fetcher } from '@/lib/api-config';
import { useRouter } from 'next/navigation';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';

interface ProductSellerActionsProps {
  productId: string | number;
  onEdit: () => void;
}

export function ProductSellerActions({ productId, onEdit, onDeleted }: ProductSellerActionsProps & { onDeleted?: () => void }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const handleDelete = async () => {
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

      window.dispatchEvent(new CustomEvent('product-deleted', { detail: { id: String(productId) } }));
      onDeleted?.();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete product',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setConfirmOpen(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <Button
        onClick={onEdit}
        variant="outline"
        className="w-full"
      >
        Edit product
      </Button>
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" className="w-full" disabled={isDeleting}>
            {isDeleting ? 'Deleting...' : 'Delete product'}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete product?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this product? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}