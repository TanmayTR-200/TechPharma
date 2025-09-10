"use client";

import { Card, CardContent } from "@/components/ui/card"
import { Smartphone, Shirt, Cog, Beaker, Home, Car, Utensils, Briefcase } from "lucide-react"
import { useProductNavigation } from "@/hooks/use-product-navigation"

const categories = [
  { name: "Electronics", icon: Smartphone, count: "50K+ Products" },
  { name: "Clothing & Textiles", icon: Shirt, count: "35K+ Products" },
  { name: "Machinery", icon: Cog, count: "25K+ Products" },
  { name: "Chemicals", icon: Beaker, count: "15K+ Products" },
  { name: "Home & Garden", icon: Home, count: "40K+ Products" },
  { name: "Automotive", icon: Car, count: "20K+ Products" },
  { name: "Food & Beverage", icon: Utensils, count: "30K+ Products" },
  { name: "Office Supplies", icon: Briefcase, count: "18K+ Products" },
]

export function CategoryGrid() {
  const { navigateToProducts } = useProductNavigation();
  return (
    <section className="py-16 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-serif font-bold text-foreground mb-4">Browse by Category</h2>
          <p className="text-lg text-muted-foreground">Find products across various industries and categories</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {categories.map((category) => (
            <Card
              key={category.name}
              className="hover:shadow-lg transition-shadow cursor-pointer border-border hover:border-accent/50"
              onClick={() => navigateToProducts({ 
                category: category.name, 
                sortBy: 'featured',
                page: 1
              })}
            >
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-accent/10 rounded-full flex items-center justify-center">
                  <category.icon className="h-8 w-8 text-accent" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{category.name}</h3>
                <p className="text-sm text-muted-foreground">{category.count}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
