"use client";

import { Card, CardContent } from "@/components/ui/card"
import Smartphone from "lucide-react/dist/esm/icons/smartphone"
import Cog from "lucide-react/dist/esm/icons/cog"
import Briefcase from "lucide-react/dist/esm/icons/briefcase"
import Shield from "lucide-react/dist/esm/icons/shield"
import Lightbulb from "lucide-react/dist/esm/icons/lightbulb"
import { useProductNavigation } from "@/hooks/use-product-navigation"
import { useEffect, useState } from "react"

const categoryConfig = [
  { name: "Electronics", icon: Smartphone, key: "electronics" },
  { name: "Machinery", icon: Cog, key: "machinery" },
  { name: "Tools", icon: Briefcase, key: "tools" },
  { name: "Safety Equipment", icon: Shield, key: "safety" },
  { name: "Lighting", icon: Lightbulb, key: "lighting" },
]

export function CategoryGrid() {
  const { navigateToProducts } = useProductNavigation();
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategoryCounts = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/products/category-counts');
        const data = await response.json();
        if (data.success) {
          setCategoryCounts(data.counts);
        }
      } catch (error) {
        console.error('Error fetching category counts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCategoryCounts();
  }, []);

  const getCountDisplay = (categoryKey: string) => {
    const count = categoryCounts[categoryKey] || 0;
    if (count === 0) return "No Products";
    return `${count}+ Products`;
  };

  return (
    <section className="py-16 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-serif font-bold text-foreground mb-4">Browse by Category</h2>
          <p className="text-lg text-muted-foreground">Find products across various industries and categories</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 max-w-6xl mx-auto">
          {categoryConfig.map((category) => (
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
                <p className="text-sm text-muted-foreground">
                  {loading ? "Loading..." : getCountDisplay(category.key)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}

