import { Facebook, Twitter, Linkedin, Instagram, Mail, Phone, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"

export function Footer() {
  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div>
            <h3 className="text-2xl font-serif font-bold mb-4">TradeMart</h3>
            <p className="text-primary-foreground/80 mb-4">
              Connecting businesses with trusted suppliers worldwide. Your gateway to quality products and reliable
              partnerships.
            </p>
            <div className="flex space-x-4">
              <Button variant="ghost" size="sm" className="text-primary-foreground hover:text-accent">
                <Facebook className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="text-primary-foreground hover:text-accent">
                <Twitter className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="text-primary-foreground hover:text-accent">
                <Linkedin className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="text-primary-foreground hover:text-accent">
                <Instagram className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-primary-foreground/80">
              <li>
                <a href="/about" className="hover:text-accent transition-colors">
                  About Us
                </a>
              </li>
              <li>
                <a href="/how-it-works" className="hover:text-accent transition-colors">
                  How It Works
                </a>
              </li>
              <li>
                <a href="/pricing" className="hover:text-accent transition-colors">
                  Pricing
                </a>
              </li>
              <li>
                <a href="/success-stories" className="hover:text-accent transition-colors">
                  Success Stories
                </a>
              </li>
              <li>
                <a href="/help" className="hover:text-accent transition-colors">
                  Help Center
                </a>
              </li>
            </ul>
          </div>

          {/* For Suppliers */}
          <div>
            <h4 className="font-semibold mb-4">For Suppliers</h4>
            <ul className="space-y-2 text-primary-foreground/80">
              <li>
                <a href="/supplier/onboarding" className="hover:text-accent transition-colors">
                  Sell on TradeMart
                </a>
              </li>
              <li>
                <a href="/supplier/guidelines" className="hover:text-accent transition-colors">
                  Supplier Guidelines
                </a>
              </li>
              <li>
                <a href="/supplier/verification" className="hover:text-accent transition-colors">
                  Verification Process
                </a>
              </li>
              <li>
                <a href="/supplier/marketing" className="hover:text-accent transition-colors">
                  Marketing Tools
                </a>
              </li>
              <li>
                <a href="/supplier/support" className="hover:text-accent transition-colors">
                  Seller Support
                </a>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="font-semibold mb-4">Contact Us</h4>
            <div className="space-y-3 text-primary-foreground/80">
              <div className="flex items-center">
                <Mail className="h-4 w-4 mr-2" />
                <span>support@trademart.com</span>
              </div>
              <div className="flex items-center">
                <Phone className="h-4 w-4 mr-2" />
                <span>+1 (555) 123-4567</span>
              </div>
              <div className="flex items-center">
                <MapPin className="h-4 w-4 mr-2" />
                <span>
                  123 Business Ave, Suite 100
                  <br />
                  New York, NY 10001
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-primary-foreground/20 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-primary-foreground/60 text-sm">© 2024 TradeMart. All rights reserved.</p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <a href="#" className="text-primary-foreground/60 hover:text-accent text-sm transition-colors">
              Privacy Policy
            </a>
            <a href="#" className="text-primary-foreground/60 hover:text-accent text-sm transition-colors">
              Terms of Service
            </a>
            <a href="#" className="text-primary-foreground/60 hover:text-accent text-sm transition-colors">
              Cookie Policy
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
