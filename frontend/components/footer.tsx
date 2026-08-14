import Mail from "lucide-react/dist/esm/icons/mail"
import Phone from "lucide-react/dist/esm/icons/phone"
import MapPin from "lucide-react/dist/esm/icons/map-pin"

export function Footer() {
  return (
    <footer className="bg-foreground text-background border-t border-border">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          <div className="col-span-2 md:col-span-1">
            <p className="font-display text-sm font-bold tracking-[0.2em] uppercase mb-2">TechPharma</p>
            <p className="text-xs text-background/60 leading-relaxed">A B2B marketplace for verified suppliers.</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.15em] text-background/50 mb-3">Suppliers</p>
            <ul className="space-y-2 text-xs">
              <li><a href="/supplier/guidelines" className="text-background/80 hover:text-background transition-colors">Guidelines</a></li>
              <li><a href="/supplier/verification" className="text-background/80 hover:text-background transition-colors">Verification</a></li>
              <li><a href="/supplier/support" className="text-background/80 hover:text-background transition-colors">Support</a></li>
            </ul>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.15em] text-background/50 mb-3">Company</p>
            <ul className="space-y-2 text-xs">
              <li><a href="/about" className="text-background/80 hover:text-background transition-colors">About</a></li>
              <li><a href="/products" className="text-background/80 hover:text-background transition-colors">Products</a></li>
              <li><a href="/privacy" className="text-background/80 hover:text-background transition-colors">Privacy</a></li>
              <li><a href="/terms" className="text-background/80 hover:text-background transition-colors">Terms</a></li>
            </ul>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.15em] text-background/50 mb-3">Contact</p>
            <ul className="space-y-2 text-xs">
              <li className="flex items-center text-background/80"><Mail className="h-3 w-3 mr-2" />techpharma10@gmail.com</li>
              <li className="flex items-center text-background/80"><Phone className="h-3 w-3 mr-2" />+91 1800-123-4567</li>
              <li className="flex items-center text-background/80"><MapPin className="h-3 w-3 mr-2" />Bangalore, India</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-background/20 pt-4">
          <p className="text-[10px] text-background/50">&copy; 2025 TechPharma. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
