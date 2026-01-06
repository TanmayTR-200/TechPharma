"use client"

import { Footer } from "@/components/footer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Headphones from "lucide-react/dist/esm/icons/headphones"
import Mail from "lucide-react/dist/esm/icons/mail"
import Phone from "lucide-react/dist/esm/icons/phone"
import MessageSquare from "lucide-react/dist/esm/icons/message-square"
import FileText from "lucide-react/dist/esm/icons/file-text"
import HelpCircle from "lucide-react/dist/esm/icons/help-circle"
import Book from "lucide-react/dist/esm/icons/book"
import Video from "lucide-react/dist/esm/icons/video"

export default function SellerSupportPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-white">Seller Support Center</h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Get help, find answers, and grow your business on TechPharma
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Contact Support */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center text-2xl">
              <Headphones className="h-6 w-6 mr-3 text-blue-600" />
              Contact Our Support Team
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-300 mb-6">
              Our dedicated seller support team is available to help you with any questions or issues.
            </p>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="p-6 border border-gray-700 rounded-lg bg-gray-800/50 hover:border-blue-500 transition-colors">
                <div className="bg-blue-600 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                  <Mail className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-semibold text-lg mb-2 text-white">Email Support</h3>
                <p className="text-gray-300 text-sm mb-3">
                  Get detailed responses to your questions via email
                </p>
                <p className="text-blue-400 font-medium mb-2">techpharma10@gmail.com</p>
                <Badge className="bg-green-600 text-white">Response within 24 hours</Badge>
              </div>

              <div className="p-6 border border-gray-700 rounded-lg bg-gray-800/50 hover:border-green-500 transition-colors">
                <div className="bg-green-600 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                  <Phone className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-semibold text-lg mb-2 text-white">Phone Support</h3>
                <p className="text-gray-300 text-sm mb-3">
                  Speak directly with a support representative
                </p>
                <p className="text-green-400 font-medium mb-2">+91 1800-123-4567</p>
                <Badge className="bg-blue-600 text-white">Mon-Fri: 9 AM - 6 PM IST</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* FAQs */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-2xl">Frequently Asked Questions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-b border-gray-700 pb-4">
              <h4 className="font-semibold text-white mb-2">How long does verification take?</h4>
              <p className="text-gray-300 text-sm">
                The verification process typically takes 3-5 business days. You'll receive email updates at each stage of the process.
              </p>
            </div>
            <div className="border-b border-gray-700 pb-4">
              <h4 className="font-semibold text-white mb-2">Is there a fee to sell on TechPharma?</h4>
              <p className="text-gray-300 text-sm">
                Creating a seller account is free. We charge a small commission only when you make a sale. No hidden fees or monthly charges.
              </p>
            </div>
            <div className="border-b border-gray-700 pb-4">
              <h4 className="font-semibold text-white mb-2">How do I get paid for my sales?</h4>
              <p className="text-gray-300 text-sm">
                Payments are processed directly between you and the buyer based on the terms you agree upon. We provide secure messaging for payment coordination.
              </p>
            </div>
            <div className="border-b border-gray-700 pb-4">
              <h4 className="font-semibold text-white mb-2">Can I update my products after listing?</h4>
              <p className="text-gray-300 text-sm">
                Yes, you can edit your product listings anytime from your dashboard. Update prices, descriptions, images, and stock availability as needed.
              </p>
            </div>
            <div className="pb-4">
              <h4 className="font-semibold text-white mb-2">What if I have a dispute with a buyer?</h4>
              <p className="text-gray-300 text-sm">
                Our support team can mediate disputes and help resolve issues. Contact us immediately if you encounter any problems with a transaction.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* CTA */}
        <div className="text-center py-8">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg p-8">
            <h2 className="text-3xl font-bold mb-4">Still Need Help?</h2>
            <p className="text-blue-100 mb-6 max-w-2xl mx-auto">
              Our support team is here to assist you with any questions or concerns
            </p>
            <a href="mailto:techpharma10@gmail.com">
              <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50">
                Contact Support
              </Button>
            </a>
            <p className="text-sm text-blue-200 mt-6">
              Email: techpharma10@gmail.com | Phone: +91 1800-123-4567
            </p>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}
