import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Phone, Mail, MapPin, Calendar, Users, Shield } from "lucide-react"

export function SupplierHeader() {
  return (
    <div className="bg-gradient-to-r from-muted/50 to-background">
      {/* Cover Image */}
      <div className="relative h-48 bg-gradient-to-r from-accent/20 to-accent/10">
        <img src="/supplier-cover-image.png" alt="Supplier Cover" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative -mt-16 pb-8">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Supplier Logo */}
            <div className="flex-shrink-0">
              <div className="w-32 h-32 bg-background border-4 border-background rounded-lg shadow-lg overflow-hidden">
                <img
                  src="/techlight-solutions-logo.png"
                  alt="TechLight Solutions"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* Supplier Info */}
            <div className="flex-1 bg-background rounded-lg shadow-sm border p-6">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-3xl font-serif font-bold text-foreground">TechLight Solutions</h1>
                    <Badge className="bg-green-100 text-green-800 border-green-200">
                      <Shield className="h-3 w-3 mr-1" />
                      Verified
                    </Badge>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 mr-1" />
                      Mumbai, Maharashtra, India
                    </div>
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      15 years in business
                    </div>
                    <div className="flex items-center">
                      <Users className="h-4 w-4 mr-1" />
                      201-500 employees
                    </div>
                  </div>

                  <p className="text-foreground mb-4">
                    Leading manufacturer and supplier of professional LED lighting solutions, studio equipment, and
                    industrial lighting systems. Serving clients across 25+ countries with premium quality products.
                  </p>

                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">ISO 9001 Certified</Badge>
                    <Badge variant="secondary">CE Certified</Badge>
                    <Badge variant="secondary">Export License</Badge>
                    <Badge variant="secondary">Gold Supplier</Badge>
                  </div>
                </div>

                {/* Contact Actions */}
                <div className="flex flex-col gap-3 lg:w-64">
                  <Button className="bg-accent hover:bg-accent/90 text-accent-foreground">
                    <Phone className="h-4 w-4 mr-2" />
                    Call Now
                  </Button>
                  <Button
                    variant="outline"
                    className="border-accent text-accent hover:bg-accent hover:text-accent-foreground bg-transparent"
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Get Quote
                  </Button>

                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-serif font-bold text-accent mb-1">4.8</div>
                <div className="text-sm text-muted-foreground">Supplier Rating</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-serif font-bold text-accent mb-1">156</div>
                <div className="text-sm text-muted-foreground">Products</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-serif font-bold text-accent mb-1">2.5K+</div>
                <div className="text-sm text-muted-foreground">Transactions</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-serif font-bold text-accent mb-1">98%</div>
                <div className="text-sm text-muted-foreground">Response Rate</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
