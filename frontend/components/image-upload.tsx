'use client';

import { useEffect, useState } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { createUploadWidget } from '@/lib/cloudinary';
import { cn } from '@/lib/utils';
import Image from 'next/image';

interface ImageUploadProps {
  onUploadComplete?: (url: string) => void;
  defaultImage?: string;
  className?: string;
}

export function ImageUpload({
  onUploadComplete,
  defaultImage,
  className,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState(defaultImage);
  const [isCloudinaryReady, setIsCloudinaryReady] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://upload-widget.cloudinary.com/global/all.js';
    script.async = true;
    script.defer = true;

    script.onload = () => {
      console.log('Cloudinary widget loaded successfully');
      setIsCloudinaryReady(true);
    };

    script.onerror = () => {
      console.error('Failed to load Cloudinary widget');
      toast({
        title: 'Error',
        description: 'Failed to initialize upload functionality. Please refresh the page.',
        variant: 'destructive',
      });
    };

    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
      setIsCloudinaryReady(false);
    };
  }, [toast]);
  
  const handleUpload = () => {
    setUploading(true);

    const widget = createUploadWidget(
      // Success callback
      (url) => {
        setUploading(false);
        setImageUrl(url);
        toast({
          title: 'Success',
          description: 'Image uploaded successfully',
        });
        if (onUploadComplete) {
          onUploadComplete(url);
        }
      },
      // Error callback
      (error) => {
        setUploading(false);
        toast({
          title: 'Upload Failed',
          description: error || 'Failed to upload image. Please try again.',
          variant: 'destructive',
        });
      }
    );

    if (widget) {
      widget.open();
    } else {
      setUploading(false);
      toast({
        title: 'Error',
        description: 'Upload widget failed to initialize',
        variant: 'destructive',
      });
    }
  };

  const removeImage = () => {
    setImageUrl(undefined);
    if (onUploadComplete) {
      onUploadComplete('');
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      {!isCloudinaryReady ? (
        <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center">
          <p className="text-sm text-gray-500">Loading upload functionality...</p>
        </div>
      ) : imageUrl ? (
        <div className="relative rounded-lg overflow-hidden border-2 border-dashed border-gray-200">
          <Image
            src={imageUrl}
            alt="Uploaded image"
            width={400}
            height={300}
            className="w-full h-[200px] object-cover"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <Button
              onClick={handleUpload}
              variant="secondary"
              size="sm"
              className="bg-white hover:bg-gray-100"
            >
              <Upload className="w-4 h-4 mr-2" />
              Change
            </Button>
            <Button
              onClick={removeImage}
              variant="destructive"
              size="sm"
            >
              <X className="w-4 h-4 mr-2" />
              Remove
            </Button>
          </div>
        </div>
      ) : (
        <div
          onClick={handleUpload}
          className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center cursor-pointer hover:border-gray-300 transition-colors"
        >
          <div className="flex flex-col items-center gap-2">
            <div className="p-3 rounded-full bg-gray-50">
              <ImageIcon className="w-6 h-6 text-gray-400" />
            </div>
            <div className="mt-2">
              <Button
                disabled={uploading}
                variant="secondary"
                className="font-medium text-sm"
              >
                {uploading ? (
                  'Uploading...'
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Image
                  </>
                )}
              </Button>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              PNG, JPG, GIF up to 10MB
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
