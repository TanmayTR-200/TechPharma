import Link from "next/link"
import { Search } from "lucide-react"

export default function SupplierProfilePage() {
  return (
    <div className="min-h-screen flex items-center justify-center pt-14 px-4 relative z-10">
      <div className="text-center max-w-md">
        <div className="flex h-12 w-12 mx-auto mb-4 items-center justify-center rounded-xl bg-secondary">
          <Search className="h-5 w-5 text-muted-foreground" />
        </div>
        <h1 className="text-xl font-semibold text-foreground mb-2">Supplier profile not found</h1>
        <p className="text-sm text-muted-foreground mb-6">
          This supplier profile doesn't exist or hasn't been set up yet.
        </p>
        <Link
          href="/products"
          className="inline-flex items-center justify-center rounded-lg bg-primary px-4 h-10 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Browse products
        </Link>
      </div>
    </div>
  )
}
