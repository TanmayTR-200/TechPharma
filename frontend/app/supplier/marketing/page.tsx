"use client"

import { Footer } from "@/components/footer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import TrendingUp from "lucide-react/dist/esm/icons/trending-up"
import Target from "lucide-react/dist/esm/icons/target"
import BarChart from "lucide-react/dist/esm/icons/bar-chart"
import Megaphone from "lucide-react/dist/esm/icons/megaphone"
import Star from "lucide-react/dist/esm/icons/star"
import Eye from "lucide-react/dist/esm/icons/eye"
import Zap from "lucide-react/dist/esm/icons/zap"
import Award from "lucide-react/dist/esm/icons/award"

export default function MarketingToolsPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-white">Marketing Tools for Suppliers</h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Boost your visibility, reach more buyers, and grow your business on TechPharma
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Marketing Tools Overview */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center text-2xl">
              <Megaphone className="h-6 w-6 mr-3 text-blue-600" />
              Available Marketing Tools
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-300 mb-6">
              Leverage our comprehensive suite of marketing tools to increase your product visibility, attract more buyers, and maximize sales on TechPharma.
            </p>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="p-6 border border-gray-700 rounded-lg bg-gray-800/50 hover:border-blue-500 transition-colors">
                <div className="bg-blue-600 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-semibold text-lg mb-2 text-white">Featured Listings</h3>
                <p className="text-gray-300 text-sm mb-4">
                  Get your products featured on the homepage and category pages for maximum exposure
                </p>
                <Badge className="bg-green-600 text-white">High Impact</Badge>
              </div>

              <div className="p-6 border border-gray-700 rounded-lg bg-gray-800/50 hover:border-purple-500 transition-colors">
                <div className="bg-purple-600 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                  <Star className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-semibold text-lg mb-2 text-white">Sponsored Products</h3>
                <p className="text-gray-300 text-sm mb-4">
                  Promote specific products to appear at the top of search results and category listings
                </p>
                <Badge className="bg-purple-600 text-white">Premium</Badge>
              </div>

              <div className="p-6 border border-gray-700 rounded-lg bg-gray-800/50 hover:border-orange-500 transition-colors">
                <div className="bg-orange-600 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                  <Eye className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-semibold text-lg mb-2 text-white">Banner Ads</h3>
                <p className="text-gray-300 text-sm mb-4">
                  Display banner advertisements on high-traffic pages to boost brand awareness
                </p>
                <Badge className="bg-orange-600 text-white">Brand Building</Badge>
              </div>

              <div className="p-6 border border-gray-700 rounded-lg bg-gray-800/50 hover:border-green-500 transition-colors">
                <div className="bg-green-600 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                  <BarChart className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-semibold text-lg mb-2 text-white">Analytics Dashboard</h3>
                <p className="text-gray-300 text-sm mb-4">
                  Track views, clicks, inquiries, and conversions with detailed analytics
                </p>
                <Badge className="bg-green-600 text-white">Free</Badge>
              </div>

              <div className="p-6 border border-gray-700 rounded-lg bg-gray-800/50 hover:border-yellow-500 transition-colors">
                <div className="bg-yellow-600 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                  <Target className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-semibold text-lg mb-2 text-white">Email Campaigns</h3>
                <p className="text-gray-300 text-sm mb-4">
                  Send targeted email campaigns to buyers interested in your product categories
                </p>
                <Badge className="bg-yellow-600 text-white">Targeted</Badge>
              </div>

              <div className="p-6 border border-gray-700 rounded-lg bg-gray-800/50 hover:border-red-500 transition-colors">
                <div className="bg-red-600 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                  <Zap className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-semibold text-lg mb-2 text-white">Flash Deals</h3>
                <p className="text-gray-300 text-sm mb-4">
                  Create time-limited offers and flash sales to drive urgency and boost sales
                </p>
                <Badge className="bg-red-600 text-white">Conversion</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Featured Listings Details */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center text-2xl">
              <TrendingUp className="h-6 w-6 mr-3 text-blue-600" />
              Featured Listings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="font-semibold text-lg mb-3 text-white">What You Get:</h3>
                <ul className="space-y-3">
                  <li className="flex items-start text-gray-300">
                    <span className="text-green-500 mr-2">✓</span>
                    <span>Homepage placement in "Featured Products" section</span>
                  </li>
                  <li className="flex items-start text-gray-300">
                    <span className="text-green-500 mr-2">✓</span>
                    <span>Category page featured section</span>
                  </li>
                  <li className="flex items-start text-gray-300">
                    <span className="text-green-500 mr-2">✓</span>
                    <span>Special "Featured" badge on product listings</span>
                  </li>
                  <li className="flex items-start text-gray-300">
                    <span className="text-green-500 mr-2">✓</span>
                    <span>3-5x more product views and inquiries</span>
                  </li>
                  <li className="flex items-start text-gray-300">
                    <span className="text-green-500 mr-2">✓</span>
                    <span>Priority placement for 30 days</span>
                  </li>
                </ul>
              </div>
              <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-6">
                <div className="text-center mb-4">
                  <div className="text-3xl font-bold text-white mb-2">₹4,999<span className="text-lg text-gray-400">/month</span></div>
                  <p className="text-sm text-gray-300">Per product</p>
                </div>
                <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                  Get Featured Now
                </Button>
                <p className="text-xs text-center text-gray-400 mt-3">
                  Limited slots available per category
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sponsored Products */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center text-2xl">
              <Star className="h-6 w-6 mr-3 text-purple-600" />
              Sponsored Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="font-semibold text-lg mb-3 text-white">Benefits:</h3>
                <ul className="space-y-3">
                  <li className="flex items-start text-gray-300">
                    <span className="text-purple-500 mr-2">✓</span>
                    <span>Top position in search results</span>
                  </li>
                  <li className="flex items-start text-gray-300">
                    <span className="text-purple-500 mr-2">✓</span>
                    <span>Highlighted with "Sponsored" badge</span>
                  </li>
                  <li className="flex items-start text-gray-300">
                    <span className="text-purple-500 mr-2">✓</span>
                    <span>Appear in related product recommendations</span>
                  </li>
                  <li className="flex items-start text-gray-300">
                    <span className="text-purple-500 mr-2">✓</span>
                    <span>Pay only when buyers click your listing</span>
                  </li>
                  <li className="flex items-start text-gray-300">
                    <span className="text-purple-500 mr-2">✓</span>
                    <span>Set your own daily budget</span>
                  </li>
                </ul>
              </div>
              <div className="bg-purple-900/20 border border-purple-700 rounded-lg p-6">
                <div className="text-center mb-4">
                  <div className="text-3xl font-bold text-white mb-2">₹10<span className="text-lg text-gray-400">/click</span></div>
                  <p className="text-sm text-gray-300">Pay-per-click pricing</p>
                </div>
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Min. Daily Budget:</span>
                    <span className="text-white">₹500</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Recommended Budget:</span>
                    <span className="text-white">₹2,000-5,000</span>
                  </div>
                </div>
                <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white">
                  Start Sponsoring
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Analytics Dashboard */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center text-2xl">
              <BarChart className="h-6 w-6 mr-3 text-green-600" />
              Analytics & Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-300 mb-6">
              Access comprehensive analytics to track your marketing performance and make data-driven decisions:
            </p>
            <div className="grid md:grid-cols-4 gap-4">
              <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                <div className="text-2xl font-bold text-blue-500 mb-1">Product Views</div>
                <p className="text-sm text-gray-400">Track how many buyers view your products</p>
              </div>
              <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                <div className="text-2xl font-bold text-green-500 mb-1">Inquiries</div>
                <p className="text-sm text-gray-400">Monitor buyer interest and messages</p>
              </div>
              <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                <div className="text-2xl font-bold text-purple-500 mb-1">Conversions</div>
                <p className="text-sm text-gray-400">Track successful transactions</p>
              </div>
              <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                <div className="text-2xl font-bold text-orange-500 mb-1">ROI</div>
                <p className="text-sm text-gray-400">Measure return on marketing spend</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Success Stories */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center text-2xl">
              <Award className="h-6 w-6 mr-3 text-yellow-600" />
              Supplier Success Stories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="p-6 bg-gray-800 rounded-lg border border-gray-700">
                <div className="mb-4">
                  <div className="text-3xl font-bold text-green-500 mb-1">+350%</div>
                  <p className="text-sm text-gray-400">Increase in inquiries</p>
                </div>
                <p className="text-sm text-gray-300 italic mb-3">
                  "Featured listings helped us reach buyers we never could have found otherwise. Sales tripled in just 2 months!"
                </p>
                <p className="text-xs text-gray-500">— Industrial Equipment Supplier</p>
              </div>
              <div className="p-6 bg-gray-800 rounded-lg border border-gray-700">
                <div className="mb-4">
                  <div className="text-3xl font-bold text-blue-500 mb-1">5x ROI</div>
                  <p className="text-sm text-gray-400">On sponsored products</p>
                </div>
                <p className="text-sm text-gray-300 italic mb-3">
                  "Sponsored products deliver consistent high-quality leads. Every rupee spent generates 5 rupees in revenue."
                </p>
                <p className="text-xs text-gray-500">— Electronics Distributor</p>
              </div>
              <div className="p-6 bg-gray-800 rounded-lg border border-gray-700">
                <div className="mb-4">
                  <div className="text-3xl font-bold text-purple-500 mb-1">+200%</div>
                  <p className="text-sm text-gray-400">More product visibility</p>
                </div>
                <p className="text-sm text-gray-300 italic mb-3">
                  "Banner ads built our brand awareness. Now buyers actively search for our company name on the platform."
                </p>
                <p className="text-xs text-gray-500">— Safety Equipment Manufacturer</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* How to Get Started */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-2xl">How to Get Started</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="bg-blue-600 text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 font-bold text-xl">1</div>
                <h4 className="font-semibold text-white mb-2">Choose Your Tool</h4>
                <p className="text-sm text-gray-300">Select the marketing tool that fits your goals</p>
              </div>
              <div className="text-center">
                <div className="bg-blue-600 text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 font-bold text-xl">2</div>
                <h4 className="font-semibold text-white mb-2">Set Your Budget</h4>
                <p className="text-sm text-gray-300">Define your budget and campaign duration</p>
              </div>
              <div className="text-center">
                <div className="bg-blue-600 text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 font-bold text-xl">3</div>
                <h4 className="font-semibold text-white mb-2">Launch Campaign</h4>
                <p className="text-sm text-gray-300">Activate your marketing campaign instantly</p>
              </div>
              <div className="text-center">
                <div className="bg-blue-600 text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 font-bold text-xl">4</div>
                <h4 className="font-semibold text-white mb-2">Track Results</h4>
                <p className="text-sm text-gray-300">Monitor performance and optimize</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CTA */}
        <div className="text-center py-8">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg p-8">
            <h2 className="text-3xl font-bold mb-4">Ready to Boost Your Sales?</h2>
            <p className="text-blue-100 mb-6 max-w-2xl mx-auto">
              Start using our marketing tools today and watch your business grow on TechPharma
            </p>
            <div className="flex justify-center gap-4 flex-wrap">
              <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50">
                View Marketing Dashboard
              </Button>
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                Schedule Consultation
              </Button>
            </div>
            <p className="text-sm text-blue-200 mt-4">
              Questions? Contact us at techpharma10@gmail.com or +91 1800-123-4567
            </p>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}
