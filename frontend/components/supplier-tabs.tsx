"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Star, Award, Shield, CheckCircle, Building, Globe, Users } from "lucide-react"

const supplierProducts = [
  {
    id: 1,
    name: "Professional LED Studio Lighting Kit",
    price: "$299 - $899",
    image: "/led-studio-lighting-kit.png",
    category: "Studio Equipment",
    minOrder: "10 pieces",
  },
  {
    id: 2,
    name: "Industrial LED Flood Lights",
    price: "$150 - $450",
    image: "/industrial-led-flood-lights.png",
    category: "Industrial Lighting",
    minOrder: "20 pieces",
  },
  {
    id: 3,
    name: "RGB LED Strip Lights - Commercial Grade",
    price: "$25 - $85",
    image: "/rgb-led-strip-lights.png",
    category: "Commercial Lighting",
    minOrder: "100 meters",
  },
  {
    id: 4,
    name: "Smart LED Panel Lights",
    price: "$89 - $199",
    image: "/smart-led-panel-lights.png",
    category: "Smart Lighting",
    minOrder: "50 pieces",
  },
]

const reviews = [
  {
    id: 1,
    name: "Rajesh Kumar",
    company: "Event Solutions Pvt Ltd",
    rating: 5,
    date: "2 weeks ago",
    review:
      "Excellent quality LED lighting equipment. Fast delivery and great customer service. Highly recommended for professional use.",
  },
  {
    id: 2,
    name: "Sarah Johnson",
    company: "Studio Pro Inc",
    rating: 5,
    date: "1 month ago",
    review:
      "Outstanding products and reliable supplier. The LED studio kit exceeded our expectations. Will definitely order again.",
  },
  {
    id: 3,
    name: "Michael Chen",
    company: "Industrial Solutions Co",
    rating: 4,
    date: "2 months ago",
    review:
      "Good quality industrial lighting. Competitive pricing and professional packaging. Minor delay in shipping but overall satisfied.",
  },
]

export function SupplierTabs() {
  const [activeTab, setActiveTab] = useState("products")

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="products">Products</TabsTrigger>
        <TabsTrigger value="about">About Company</TabsTrigger>
        <TabsTrigger value="reviews">Reviews</TabsTrigger>
        <TabsTrigger value="certifications">Certifications</TabsTrigger>
      </TabsList>

      <TabsContent value="products" className="mt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {supplierProducts.map((product) => (
            <Card key={product.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-0">
                <img
                  src={product.image || "/placeholder.svg"}
                  alt={product.name}
                  className="w-full h-48 object-cover rounded-t-lg"
                />
                <div className="p-4">
                  <Badge variant="secondary" className="mb-2 text-xs">
                    {product.category}
                  </Badge>
                  <h3 className="font-semibold text-foreground mb-2 line-clamp-2">{product.name}</h3>
                  <p className="text-lg font-semibold text-accent mb-2">{product.price}</p>
                  <p className="text-sm text-muted-foreground mb-3">Min. Order: {product.minOrder}</p>
                  <Button className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">Get Quote</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </TabsContent>

      <TabsContent value="about" className="mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Building className="h-5 w-5 mr-2" />
                Company Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">About TechLight Solutions</h4>
                <p className="text-muted-foreground">
                  Established in 2009, TechLight Solutions has grown to become one of India's leading manufacturers of
                  professional LED lighting equipment. We specialize in studio lighting, industrial lighting solutions,
                  and smart lighting systems.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Our Mission</h4>
                <p className="text-muted-foreground">
                  To provide innovative, energy-efficient lighting solutions that meet the evolving needs of our global
                  clientele while maintaining the highest standards of quality and service.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Globe className="h-5 w-5 mr-2" />
                Business Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Business Type</p>
                  <p className="font-medium">Manufacturer & Exporter</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Year Established</p>
                  <p className="font-medium">2009</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Employees</p>
                  <p className="font-medium">201-500</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Annual Turnover</p>
                  <p className="font-medium">$10-25 Million</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Export Markets</p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">USA</Badge>
                  <Badge variant="outline">Europe</Badge>
                  <Badge variant="outline">Middle East</Badge>
                  <Badge variant="outline">Southeast Asia</Badge>
                  <Badge variant="outline">Australia</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-3">Head Office</h4>
                  <div className="space-y-2 text-sm">
                    <p>TechLight Solutions Pvt. Ltd.</p>
                    <p>Plot No. 45, Industrial Area Phase-II</p>
                    <p>Andheri East, Mumbai - 400069</p>
                    <p>Maharashtra, India</p>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-3">Contact Details</h4>
                  <div className="space-y-2 text-sm">
                    <p>
                      <strong>Phone:</strong> +91 22 2834 5678
                    </p>
                    <p>
                      <strong>Mobile:</strong> +91 98765 43210
                    </p>
                    <p>
                      <strong>Email:</strong> info@techlightsolutions.com
                    </p>
                    <p>
                      <strong>Website:</strong> www.techlightsolutions.com
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="reviews" className="mt-6">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Customer Reviews</CardTitle>
              <div className="flex items-center gap-4">
                <div className="flex items-center">
                  <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  <span className="ml-1 text-lg font-semibold">4.8</span>
                </div>
                <span className="text-muted-foreground">Based on 156 reviews</span>
              </div>
            </CardHeader>
          </Card>

          <div className="space-y-4">
            {reviews.map((review) => (
              <Card key={review.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-semibold">{review.name}</h4>
                      <p className="text-sm text-muted-foreground">{review.company}</p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center mb-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${
                              i < review.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-sm text-muted-foreground">{review.date}</p>
                    </div>
                  </div>
                  <p className="text-muted-foreground">{review.review}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </TabsContent>

      <TabsContent value="certifications" className="mt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Award className="h-5 w-5 mr-2" />
                Quality Certifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
                  <div>
                    <p className="font-medium">ISO 9001:2015</p>
                    <p className="text-sm text-muted-foreground">Quality Management System</p>
                  </div>
                </div>
                <Badge variant="secondary">Verified</Badge>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
                  <div>
                    <p className="font-medium">CE Certification</p>
                    <p className="text-sm text-muted-foreground">European Conformity</p>
                  </div>
                </div>
                <Badge variant="secondary">Verified</Badge>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
                  <div>
                    <p className="font-medium">RoHS Compliance</p>
                    <p className="text-sm text-muted-foreground">Environmental Standards</p>
                  </div>
                </div>
                <Badge variant="secondary">Verified</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="h-5 w-5 mr-2" />
                Business Licenses
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
                  <div>
                    <p className="font-medium">Export License</p>
                    <p className="text-sm text-muted-foreground">Government of India</p>
                  </div>
                </div>
                <Badge variant="secondary">Active</Badge>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
                  <div>
                    <p className="font-medium">GST Registration</p>
                    <p className="text-sm text-muted-foreground">Tax Compliance</p>
                  </div>
                </div>
                <Badge variant="secondary">Active</Badge>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
                  <div>
                    <p className="font-medium">Factory License</p>
                    <p className="text-sm text-muted-foreground">Manufacturing Authorization</p>
                  </div>
                </div>
                <Badge variant="secondary">Active</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </TabsContent>
    </Tabs>
  )
}
