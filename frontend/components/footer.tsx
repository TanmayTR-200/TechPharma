import Facebook from "lucide-react/dist/esm/icons/facebook"
import Twitter from "lucide-react/dist/esm/icons/twitter"
import Linkedin from "lucide-react/dist/esm/icons/linkedin"
import Instagram from "lucide-react/dist/esm/icons/instagram"
import Mail from "lucide-react/dist/esm/icons/mail"
import Phone from "lucide-react/dist/esm/icons/phone"
import MapPin from "lucide-react/dist/esm/icons/map-pin"
import { Button } from "@/components/ui/button"

export function Footer() {
  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Company Info */}
          <div>
            <h3 className="text-2xl font-serif font-bold mb-4">TradeMart</h3>
            <p className="text-primary-foreground/80 mb-4">
              Connecting businesses with trusted suppliers worldwide. Your gateway to quality products and reliable
              partnerships.
            </p>
          </div>

          {/* For Suppliers */}
          <div>
            <h4 className="font-semibold mb-4">For Suppliers</h4>
            <ul className="space-y-2 text-primary-foreground/80">
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
                <span>techpharma10@gmail.com</span>
              </div>
              <div className="flex items-center">
                <Phone className="h-4 w-4 mr-2" />
                <span>+91 1800-123-4567</span>
              </div>
              <div className="flex items-center">
                <MapPin className="h-4 w-4 mr-2" />
                <span>
                  Bangalore, India
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-primary-foreground/20 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-primary-foreground/60 text-sm">© 2025 TradeMart. All rights reserved.</p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <a href="/about" className="text-primary-foreground/60 hover:text-accent text-sm transition-colors">
              About
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
