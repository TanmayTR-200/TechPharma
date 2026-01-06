"use client"

import { Footer } from "@/components/footer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import CheckCircle2 from "lucide-react/dist/esm/icons/check-circle-2"
import AlertCircle from "lucide-react/dist/esm/icons/alert-circle"
import Shield from "lucide-react/dist/esm/icons/shield"
import Package from "lucide-react/dist/esm/icons/package"
import DollarSign from "lucide-react/dist/esm/icons/dollar-sign"
import Truck from "lucide-react/dist/esm/icons/truck"
import Star from "lucide-react/dist/esm/icons/star"
import FileText from "lucide-react/dist/esm/icons/file-text"
import Users from "lucide-react/dist/esm/icons/users"
import Zap from "lucide-react/dist/esm/icons/zap"

export default function SupplierGuidelinesPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Supplier Guidelines</h1>
            <p className="text-xl text-blue-100 max-w-3xl mx-auto">
              Your complete guide to selling successfully on TechPharma. Follow these guidelines to provide the best experience for buyers and grow your business.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-6 text-center">
              <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-3" />
              <div className="text-3xl font-bold text-green-700 mb-1">98%</div>
              <div className="text-sm text-green-600">Verified Suppliers</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-6 text-center">
              <Package className="h-12 w-12 text-blue-600 mx-auto mb-3" />
              <div className="text-3xl font-bold text-blue-700 mb-1">50K+</div>
              <div className="text-sm text-blue-600">Active Products</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-6 text-center">
              <Users className="h-12 w-12 text-purple-600 mx-auto mb-3" />
              <div className="text-3xl font-bold text-purple-700 mb-1">10K+</div>
              <div className="text-sm text-purple-600">Active Buyers</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-6 text-center">
              <Star className="h-12 w-12 text-orange-600 mx-auto mb-3" />
              <div className="text-3xl font-bold text-orange-700 mb-1">4.7</div>
              <div className="text-sm text-orange-600">Average Rating</div>
            </CardContent>
          </Card>
        </div>

        {/* Getting Started */}
        <Card className="mb-8 border-2 border-blue-200 bg-blue-50/50">
          <CardHeader>
            <CardTitle className="flex items-center text-2xl">
              <Zap className="h-6 w-6 mr-3 text-blue-600" />
              Getting Started
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-white leading-relaxed">
              Welcome to TechPharma! To start selling on our platform, complete your supplier profile, verify your business documents, and list your first products. Our team reviews all applications to maintain quality standards.
            </p>
            <div className="grid md:grid-cols-3 gap-4 pt-4">
              <div className="flex items-start space-x-3">
                <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 font-bold">1</div>
                <div>
                  <h4 className="font-semibold text-white">Create Account</h4>
                  <p className="text-sm text-gray-300">Sign up and complete your business profile</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 font-bold">2</div>
                <div>
                  <h4 className="font-semibold text-white">Get Verified</h4>
                  <p className="text-sm text-gray-300">Submit business documents for verification</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 font-bold">3</div>
                <div>
                  <h4 className="font-semibold text-white">List Products</h4>
                  <p className="text-sm text-gray-300">Add products and start receiving orders</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Product Listing Guidelines */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center text-2xl">
              <Package className="h-6 w-6 mr-3 text-blue-600" />
              Product Listing Requirements
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="font-semibold text-lg mb-3 flex items-center">
                <CheckCircle2 className="h-5 w-5 mr-2 text-green-600" />
                Product Information
              </h3>
              <ul className="space-y-2 ml-7">
                <li className="flex items-start">
                  <span className="text-green-600 mr-2">•</span>
                  <span className="text-white"><strong>Accurate Titles:</strong> Use clear, descriptive product names (50-200 characters)</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-600 mr-2">•</span>
                  <span className="text-white"><strong>Detailed Descriptions:</strong> Include specifications, materials, dimensions, and usage (minimum 200 characters)</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-600 mr-2">•</span>
                  <span className="text-white"><strong>Correct Categorization:</strong> Select the most relevant category for your product</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-600 mr-2">•</span>
                  <span className="text-white"><strong>Accurate Pricing:</strong> Display prices in Indian Rupees (₹) with proper tax inclusions</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-600 mr-2">•</span>
                  <span className="text-white"><strong>Stock Availability:</strong> Keep inventory levels updated in real-time</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-3 flex items-center">
                <CheckCircle2 className="h-5 w-5 mr-2 text-green-600" />
                Image Requirements
              </h3>
              <ul className="space-y-2 ml-7">
                <li className="flex items-start">
                  <span className="text-green-600 mr-2">•</span>
                  <span className="text-white"><strong>High Quality:</strong> Upload clear, high-resolution images (minimum 800x800 pixels)</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-600 mr-2">•</span>
                  <span className="text-white"><strong>Multiple Angles:</strong> Provide 3-5 images showing different views of the product</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-600 mr-2">•</span>
                  <span className="text-white"><strong>White Background:</strong> Use plain backgrounds for main product images</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-600 mr-2">•</span>
                  <span className="text-white"><strong>No Watermarks:</strong> Do not add logos or text overlays to product images</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-600 mr-2">•</span>
                  <span className="text-white"><strong>Actual Products:</strong> Only use real product photos, no stock images or renders</span>
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Pricing & Payment */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center text-2xl">
              <DollarSign className="h-6 w-6 mr-3 text-blue-600" />
              Pricing & Payment Terms
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-yellow-600 mr-3 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-yellow-900 mb-1">Competitive Pricing</h4>
                  <p className="text-sm text-yellow-800">Set competitive prices. Products with unreasonable pricing may be delisted.</p>
                </div>
              </div>
            </div>
            <ul className="space-y-3">
              <li className="flex items-start">
                <CheckCircle2 className="h-5 w-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                <span className="text-white"><strong>Transparent Pricing:</strong> All prices must be in Indian Rupees (₹) and include applicable taxes</span>
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="h-5 w-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                <span className="text-white"><strong>Payment Cycle:</strong> Payments processed within 7-10 business days after order delivery</span>
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="h-5 w-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                <span className="text-white"><strong>Commission:</strong> Platform fee of 5-12% depending on category and seller tier</span>
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="h-5 w-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                <span className="text-white"><strong>Bulk Discounts:</strong> Offer volume-based pricing to attract B2B buyers</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Shipping & Fulfillment */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center text-2xl">
              <Truck className="h-6 w-6 mr-3 text-blue-600" />
              Shipping & Fulfillment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-3">
              <li className="flex items-start">
                <CheckCircle2 className="h-5 w-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                <span className="text-white"><strong>Processing Time:</strong> Ship orders within 1-3 business days of confirmation</span>
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="h-5 w-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                <span className="text-white"><strong>Secure Packaging:</strong> Use appropriate packaging materials to prevent damage during transit</span>
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="h-5 w-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                <span className="text-white"><strong>Tracking:</strong> Provide tracking information for all shipments</span>
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="h-5 w-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                <span className="text-white"><strong>Pan-India Delivery:</strong> Offer nationwide shipping or clearly state delivery regions</span>
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="h-5 w-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                <span className="text-white"><strong>Insurance:</strong> Insure high-value shipments against loss or damage</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Customer Service */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center text-2xl">
              <Users className="h-6 w-6 mr-3 text-blue-600" />
              Customer Service Standards
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-3">
              <li className="flex items-start">
                <CheckCircle2 className="h-5 w-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                <span className="text-white"><strong>Response Time:</strong> Reply to buyer inquiries within 24 hours</span>
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="h-5 w-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                <span className="text-white"><strong>Professional Communication:</strong> Maintain courteous and professional tone in all interactions</span>
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="h-5 w-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                <span className="text-white"><strong>Returns & Refunds:</strong> Honor return policy within 7-14 days for defective products</span>
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="h-5 w-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                <span className="text-white"><strong>Dispute Resolution:</strong> Work proactively to resolve issues before escalation</span>
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="h-5 w-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                <span className="text-white"><strong>After-Sales Support:</strong> Provide technical support and documentation as needed</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Prohibited Items */}
        <Card className="mb-8 border-2 border-red-200">
          <CardHeader className="bg-red-50">
            <CardTitle className="flex items-center text-2xl text-red-700">
              <AlertCircle className="h-6 w-6 mr-3" />
              Prohibited Items & Practices
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="bg-red-50 rounded-lg p-4 mb-4">
              <p className="text-red-800 font-medium">
                Listing prohibited items will result in immediate account suspension and possible legal action.
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold text-white mb-2">Prohibited Products:</h4>
                <ul className="space-y-1 text-sm">
                  <li className="flex items-center text-white"><span className="text-red-600 mr-2">✗</span> Counterfeit or fake products</li>
                  <li className="flex items-center text-white"><span className="text-red-600 mr-2">✗</span> Expired pharmaceutical items</li>
                  <li className="flex items-center text-white"><span className="text-red-600 mr-2">✗</span> Illegal drugs or substances</li>
                  <li className="flex items-center text-white"><span className="text-red-600 mr-2">✗</span> Weapons and explosives</li>
                  <li className="flex items-center text-white"><span className="text-red-600 mr-2">✗</span> Stolen goods</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-white mb-2">Prohibited Practices:</h4>
                <ul className="space-y-1 text-sm">
                  <li className="flex items-center text-white"><span className="text-red-600 mr-2">✗</span> Fake reviews or ratings</li>
                  <li className="flex items-center text-white"><span className="text-red-600 mr-2">✗</span> Price manipulation</li>
                  <li className="flex items-center text-white"><span className="text-red-600 mr-2">✗</span> Bait-and-switch tactics</li>
                  <li className="flex items-center text-white"><span className="text-red-600 mr-2">✗</span> Misleading product information</li>
                  <li className="flex items-center text-white"><span className="text-red-600 mr-2">✗</span> Contact buyer outside platform</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Performance Metrics */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center text-2xl">
              <Star className="h-6 w-6 mr-3 text-blue-600" />
              Performance Metrics & Seller Ratings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-white">
              Maintain high performance standards to achieve better visibility and seller badges:
            </p>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium text-gray-900">Order Fulfillment Rate</span>
                  <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">≥ 95%</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium text-gray-900">On-Time Shipping Rate</span>
                  <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">≥ 90%</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium text-gray-900">Response Rate</span>
                  <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">≥ 85%</Badge>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium text-gray-900">Customer Rating</span>
                  <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">≥ 4.0★</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium text-gray-900">Order Defect Rate</span>
                  <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">≤ 2%</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium text-gray-900">Return Rate</span>
                  <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">≤ 5%</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Verification Process */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center text-2xl">
              <Shield className="h-6 w-6 mr-3 text-blue-600" />
              Verification & Documentation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-white mb-4">
              To maintain trust and quality, all suppliers must complete business verification:
            </p>
            <div className="space-y-3">
              <div className="flex items-start p-4 bg-blue-50 rounded-lg border border-blue-200">
                <FileText className="h-5 w-5 text-blue-600 mr-3 mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Required Documents:</h4>
                  <ul className="text-sm text-gray-700 space-y-1">
                    <li>• Business Registration Certificate</li>
                    <li>• GST Registration Number (GSTIN)</li>
                    <li>• PAN Card (for businesses)</li>
                    <li>• Bank Account Details</li>
                    <li>• Address Proof (utility bill, lease agreement)</li>
                    <li>• Identity Proof of authorized signatory</li>
                  </ul>
                </div>
              </div>
              <div className="flex items-start p-4 bg-green-50 rounded-lg border border-green-200">
                <CheckCircle2 className="h-5 w-5 text-green-600 mr-3 mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Certification (Optional but Recommended):</h4>
                  <ul className="text-sm text-gray-700 space-y-1">
                    <li>• ISO 9001 (Quality Management)</li>
                    <li>• CE Certification (for applicable products)</li>
                    <li>• Industry-specific certifications</li>
                    <li>• Export licenses (if applicable)</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Support & Resources */}
        <Card className="mb-8 bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200">
          <CardHeader>
            <CardTitle className="text-2xl text-blue-900">Need Help?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-900">
              Our dedicated seller support team is here to help you succeed:
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <h4 className="font-semibold text-gray-900 mb-2">📧 Email Support</h4>
                <p className="text-sm text-gray-600">techpharma10@gmail.com</p>
                <p className="text-xs text-gray-500 mt-1">Response within 24 hours</p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <h4 className="font-semibold text-gray-900 mb-2">📞 Phone Support</h4>
                <p className="text-sm text-gray-600">+91 1800-123-4567</p>
                <p className="text-xs text-gray-500 mt-1">Mon-Fri: 9 AM - 6 PM IST</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bottom CTA */}
        <div className="text-center py-8">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg p-8">
            <h2 className="text-3xl font-bold mb-4">Ready to Start Selling?</h2>
            <p className="text-blue-100 mb-6 max-w-2xl mx-auto">
              Join thousands of successful suppliers on TechPharma and reach customers across India
            </p>
            <div className="flex justify-center gap-4 flex-wrap">
              <a 
                href="/auth?mode=signup" 
                className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
              >
                Create Supplier Account
              </a>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}



