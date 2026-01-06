"use client"

import { Footer } from "@/components/footer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import CheckCircle2 from "lucide-react/dist/esm/icons/check-circle-2"
import Shield from "lucide-react/dist/esm/icons/shield"
import FileText from "lucide-react/dist/esm/icons/file-text"
import Clock from "lucide-react/dist/esm/icons/clock"
import AlertCircle from "lucide-react/dist/esm/icons/alert-circle"
import Upload from "lucide-react/dist/esm/icons/upload"

export default function VerificationProcessPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-white">Supplier Verification Process</h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Build trust and credibility with verified supplier status on TechPharma
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Why Get Verified */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center text-2xl">
              <Shield className="h-6 w-6 mr-3 text-green-600" />
              Why Get Verified?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center p-4">
                <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="font-semibold text-lg mb-2 text-white">Verified Badge</h3>
                <p className="text-gray-300 text-sm">
                  Display a verified badge on your profile and products, increasing buyer confidence
                </p>
              </div>
              <div className="text-center p-4">
                <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="font-semibold text-lg mb-2 text-white">Enhanced Visibility</h3>
                <p className="text-gray-300 text-sm">
                  Verified suppliers appear higher in search results and get featured placement
                </p>
              </div>
              <div className="text-center p-4">
                <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="h-8 w-8 text-purple-600" />
                </div>
                <h3 className="font-semibold text-lg mb-2 text-white">Buyer Trust</h3>
                <p className="text-gray-300 text-sm">
                  93% of buyers prefer verified suppliers for B2B transactions
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Verification Steps */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center text-2xl">
              <FileText className="h-6 w-6 mr-3 text-blue-600" />
              Verification Steps
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Step 1 */}
            <div className="flex items-start">
              <div className="bg-blue-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold mr-4 flex-shrink-0">
                1
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-2 text-white">Submit Business Documents</h3>
                <p className="text-gray-300 mb-3">
                  Upload the following documents for verification:
                </p>
                <ul className="space-y-2 text-gray-300 ml-4">
                  <li className="flex items-start">
                    <CheckCircle2 className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span>Business Registration Certificate / Company Incorporation Certificate</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span>GST Registration Number (GSTIN)</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span>PAN Card (for businesses) or Aadhaar Card</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span>Bank Account Details (Cancelled Cheque / Bank Statement)</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span>Address Proof (Utility Bill, Lease Agreement, etc.)</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span>Identity Proof of Authorized Signatory</span>
                  </li>
                </ul>
                <div className="mt-4 p-4 bg-blue-900/20 border border-blue-700 rounded-lg">
                  <p className="text-sm text-blue-300">
                    <strong>Note:</strong> All documents must be clear, legible, and valid. Scanned copies or high-quality photos are accepted.
                  </p>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-start">
              <div className="bg-blue-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold mr-4 flex-shrink-0">
                2
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-2 text-white">Document Review</h3>
                <p className="text-gray-300 mb-3">
                  Our verification team will review your submitted documents for authenticity and completeness.
                </p>
                <div className="flex items-center space-x-4 text-sm">
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 text-yellow-500 mr-2" />
                    <span className="text-gray-300">Processing Time: 2-3 business days</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex items-start">
              <div className="bg-blue-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold mr-4 flex-shrink-0">
                3
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-2 text-white">Business Verification Call</h3>
                <p className="text-gray-300 mb-3">
                  A verification executive will contact you on your registered mobile number or email to:
                </p>
                <ul className="space-y-2 text-gray-300 ml-4">
                  <li className="flex items-start">
                    <CheckCircle2 className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span>Confirm business details and operations</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span>Verify your business address</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span>Clarify any questions about submitted documents</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Step 4 */}
            <div className="flex items-start">
              <div className="bg-green-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold mr-4 flex-shrink-0">
                4
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-2 text-white">Verification Approved!</h3>
                <p className="text-gray-300 mb-3">
                  Once approved, you'll receive:
                </p>
                <ul className="space-y-2 text-gray-300 ml-4">
                  <li className="flex items-start">
                    <CheckCircle2 className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span>Verified badge on your supplier profile</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span>Email confirmation with verification certificate</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span>Enhanced visibility in search results</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span>Access to premium supplier tools</span>
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Document Requirements */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center text-2xl">
              <Upload className="h-6 w-6 mr-3 text-purple-600" />
              Document Requirements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-yellow-900/20 border border-yellow-700 rounded-lg">
                <div className="flex items-start">
                  <AlertCircle className="h-5 w-5 text-yellow-500 mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-yellow-300 mb-2">Important Guidelines</h4>
                    <ul className="space-y-1 text-sm text-yellow-200">
                      <li>• Documents must be in PDF, JPG, or PNG format</li>
                      <li>• Maximum file size: 5MB per document</li>
                      <li>• Documents should be clear and readable</li>
                      <li>• All text and details must be visible</li>
                      <li>• Documents must be valid and not expired</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 border border-gray-700 rounded-lg">
                  <h4 className="font-semibold text-white mb-2">✅ Accepted</h4>
                  <ul className="text-sm text-gray-300 space-y-1">
                    <li>• Original documents</li>
                    <li>• Clear scanned copies</li>
                    <li>• High-quality photos</li>
                    <li>• Government-issued certificates</li>
                  </ul>
                </div>
                <div className="p-4 border border-red-700 rounded-lg bg-red-900/10">
                  <h4 className="font-semibold text-red-400 mb-2">❌ Not Accepted</h4>
                  <ul className="text-sm text-red-300 space-y-1">
                    <li>• Blurry or unclear images</li>
                    <li>• Expired documents</li>
                    <li>• Edited or tampered documents</li>
                    <li>• Incomplete information</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Verification Timeline */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center text-2xl">
              <Clock className="h-6 w-6 mr-3 text-orange-600" />
              Verification Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
                <span className="font-medium text-white">Document Submission</span>
                <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300">Instant</Badge>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
                <span className="font-medium text-white">Initial Review</span>
                <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-300">1-2 Days</Badge>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
                <span className="font-medium text-white">Verification Call</span>
                <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300">2-3 Days</Badge>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
                <span className="font-medium text-white">Final Approval</span>
                <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">3-5 Days</Badge>
              </div>
            </div>
            <p className="text-sm text-gray-400 mt-4 text-center">
              *Timeline may vary based on document completeness and response time
            </p>
          </CardContent>
        </Card>

        {/* FAQs */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-2xl">Frequently Asked Questions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold text-white mb-2">Is verification mandatory?</h4>
              <p className="text-gray-300 text-sm">
                No, but verified suppliers get 3x more inquiries and higher search rankings. It's highly recommended for serious sellers.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-2">How much does verification cost?</h4>
              <p className="text-gray-300 text-sm">
                Verification is completely FREE for all suppliers on TechPharma.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-2">What if my documents are rejected?</h4>
              <p className="text-gray-300 text-sm">
                You'll receive detailed feedback via email. You can resubmit corrected documents immediately.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-2">How long is verification valid?</h4>
              <p className="text-gray-300 text-sm">
                Verification is valid for 1 year. You'll be notified 30 days before expiry for renewal.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* CTA */}
        <div className="text-center py-8">
          <div className="bg-gradient-to-r from-green-600 to-green-800 text-white rounded-lg p-8">
            <h2 className="text-3xl font-bold mb-4">Ready to Get Verified?</h2>
            <p className="text-green-100 mb-6 max-w-2xl mx-auto">
              Join 10,000+ verified suppliers on TechPharma and boost your credibility
            </p>
            <Button size="lg" className="bg-white text-green-600 hover:bg-green-50">
              Start Verification Process
            </Button>
            <p className="text-sm text-green-200 mt-4">
              Need help? Contact us at techpharma10@gmail.com or +91 1800-123-4567
            </p>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}
