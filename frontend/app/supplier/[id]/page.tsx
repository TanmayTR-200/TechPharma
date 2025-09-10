import { Footer } from "@/components/footer"
import { SupplierHeader } from "@/components/supplier-header"
import { SupplierTabs } from "@/components/supplier-tabs"

export default function SupplierProfilePage() {
  return (
    <div className="min-h-screen">
      <SupplierHeader />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <SupplierTabs />
      </div>
      <Footer />
    </div>
  )
}
