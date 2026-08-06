import Mail from "lucide-react/dist/esm/icons/mail"
import Phone from "lucide-react/dist/esm/icons/phone"
import MapPin from "lucide-react/dist/esm/icons/map-pin"

export function Footer() {
  return (
    <footer className="border-t border-border glass-card rounded-none border-x-0 border-b-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex h-6 w-6 items-center justify-center rounded bg-primary">
                <span className="text-primary-foreground font-bold text-xs">T</span>
              </div>
              <span className="font-semibold text-sm text-foreground">TechPharma</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">A B2B marketplace for verified suppliers.</p>
          </div>
          <div>
            <p className="text-xs font-medium text-foreground mb-2">Suppliers</p>
            <ul className="space-y-1.5 text-xs">
              <li><a href="/supplier/guidelines" className="text-muted-foreground hover:text-primary">Guidelines</a></li>
              <li><a href="/supplier/verification" className="text-muted-foreground hover:text-primary">Verification</a></li>
              <li><a href="/supplier/support" className="text-muted-foreground hover:text-primary">Support</a></li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-medium text-foreground mb-2">Company</p>
            <ul className="space-y-1.5 text-xs">
              <li><a href="/about" className="text-muted-foreground hover:text-primary">About</a></li>
              <li><a href="/products" className="text-muted-foreground hover:text-primary">Products</a></li>
              <li><a href="/privacy" className="text-muted-foreground hover:text-primary">Privacy</a></li>
              <li><a href="/terms" className="text-muted-foreground hover:text-primary">Terms</a></li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-medium text-foreground mb-2">Contact</p>
            <ul className="space-y-1.5 text-xs">
              <li className="flex items-center text-muted-foreground"><Mail className="h-3 w-3 mr-2" />techpharma10@gmail.com</li>
              <li className="flex items-center text-muted-foreground"><Phone className="h-3 w-3 mr-2" />+91 1800-123-4567</li>
              <li className="flex items-center text-muted-foreground"><MapPin className="h-3 w-3 mr-2" />Bangalore, India</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-border pt-4">
          <p className="text-xs text-muted-foreground">&copy; 2025 TechPharma. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
