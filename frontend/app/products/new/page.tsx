"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { API_ENDPOINTS } from "@/lib/api-config";
import { ImageUpload } from "@/components/image-upload";
import { CloudinaryScriptProvider } from "@/components/cloudinary-script-provider";

export default function NewProductPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<string[]>([]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData(e.currentTarget);
      const productData = {
        name: formData.get("name"),
        description: formData.get("description"),
        price: parseFloat(formData.get("price") as string),
        category: formData.get("category"),
        stock: parseInt(formData.get("stock") as string),
        images: images,
      };

      const token = localStorage.getItem("token");
      const response = await fetch(API_ENDPOINTS.products.base, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(productData),
      });

      if (!response.ok) {
        throw new Error("Failed to create product");
      }

      toast({
        title: "Success",
        description: "Product created successfully",
      });

      router.push("/products");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create product. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <CloudinaryScriptProvider>
      <div className="container max-w-2xl mx-auto py-8">
        <h1 className="text-3xl font-serif font-bold mb-6">Add New Product</h1>
        <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="name">Product Name</Label>
          <Input
            id="name"
            name="name"
            required
            placeholder="Enter product name"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            name="description"
            required
            placeholder="Enter product description"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="price">Price</Label>
            <Input
              id="price"
              name="price"
              type="number"
              required
              min="0"
              step="0.01"
              placeholder="0.00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="stock">Stock</Label>
            <Input
              id="stock"
              name="stock"
              type="number"
              required
              min="0"
              placeholder="0"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Input
            id="category"
            name="category"
            required
            placeholder="Enter product category"
          />
        </div>

        <div className="space-y-2">
          <Label>Product Images</Label>
          {images.map((url, index) => (
            <ImageUpload
              key={index}
              defaultImage={url}
              onUploadComplete={(newUrl) => {
                const newImages = [...images];
                if (newUrl) {
                  newImages[index] = newUrl;
                } else {
                  newImages.splice(index, 1);
                }
                setImages(newImages);
              }}
            />
          ))}
          {images.length < 5 && (
            <ImageUpload
              onUploadComplete={(url) => {
                if (url) {
                  setImages([...images, url]);
                }
              }}
            />
          )}
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Creating..." : "Create Product"}
        </Button>
      </form>
    </div>
    </CloudinaryScriptProvider>
  );
}