"use client"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Star, MapPin } from "lucide-react"
import { useProduct } from "@/contexts/product-provider"
import { ProductActions } from "@/components/product-actions"
import { useEffect, useState } from "react"
import { productApi } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

const featuredProducts = [
  {
    id: 1,
    name: "Industrial LED Lighting System",
    price: "$299 - $899",
    supplier: "TechLight Solutions",
    location: "Mumbai, India",
    rating: 4.8,
    reviews: 156,
    image: "/placeholder-dmrpd.png",
    badge: "Verified Supplier",
  },
  {
    id: 2,
    name: "Cotton Fabric Rolls - Premium Quality",
    price: "$12 - $45 per meter",
    supplier: "Global Textiles Co.",
    location: "Bangalore, India",
    rating: 4.9,
    reviews: 203,
    image: "/placeholder-0dl5n.png",
    badge: "Top Rated",
  },
  {
    id: 3,
    name: "CNC Machining Center",
    price: "$25,000 - $85,000",
    supplier: "Precision Machinery Ltd",
    location: "Chennai, India",
    rating: 4.7,
    reviews: 89,
    image: "/cnc-machining-center.png",
    badge: "Gold Supplier",
  },
  {
    id: 4,
    name: "Organic Chemical Compounds",
    price: "$50 - $200 per kg",
    supplier: "ChemPure Industries",
    location: "Pune, India",
    rating: 4.6,
    reviews: 124,
    image: "/organic-chemistry-lab.png",
    badge: "Certified",
  },
]

export function FeaturedProducts() {
  const { getQuote, viewAllProducts } = useProduct();
  return (
    <section className="py-16 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-serif font-bold text-foreground mb-4">Featured Products</h2>
          <p className="text-lg text-muted-foreground">Discover top-quality products from our verified suppliers</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredProducts.map((product) => (
            <Card key={product.id} className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-0">
                <div className="relative">
                  <img
                    src={product.image || "/placeholder.svg"}
                    alt={product.name}
                    className="w-full h-48 object-cover rounded-t-lg"
                  />
                  <Badge className="absolute top-2 left-2 bg-accent text-accent-foreground">{product.badge}</Badge>
                </div>

                <div className="p-4">
                  <h3 className="font-semibold text-foreground mb-2 line-clamp-2">{product.name}</h3>

                  <div className="flex items-center mb-2">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm text-muted-foreground ml-1">
                      {product.rating} ({product.reviews} reviews)
                    </span>
                  </div>

                  <p className="text-lg font-semibold text-accent mb-2">{product.price}</p>

                  <div className="text-sm text-muted-foreground mb-2">
                    <p className="font-medium">{product.supplier}</p>
                    <div className="flex items-center">
                      <MapPin className="h-3 w-3 mr-1" />
                      {product.location}
                    </div>
                  </div>

                  <Button 
                    className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
                    onClick={() => getQuote(product)}
                  >
                    Get Quote
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center mt-12">
          <Button
            variant="outline"
            size="lg"
            className="border-accent text-accent hover:bg-accent hover:text-accent-foreground bg-transparent"
            onClick={viewAllProducts}
          >
            View All Products
          </Button>
        </div>
      </div>
    </section>
  )
}
