import { Footer } from "@/components/footer"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Terms and Conditions - TechPharma",
  description: "The terms and conditions for using TechPharma marketplace.",
}

export default function TermsPage() {
  return (
    <div className="min-h-screen relative z-10 pt-16">
      <main className="max-w-2xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold text-foreground mb-1">Terms and Conditions</h1>
        <p className="text-xs text-muted-foreground mb-8">Last updated: August 2026</p>

        <div className="space-y-6">
          <section>
            <h2 className="text-sm font-semibold text-foreground mb-2">1. Acceptance of terms</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              By creating an account or using TechPharma, you agree to these terms. If you do not agree, do not use the platform.
            </p>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-foreground mb-2">2. Account registration</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              You must provide accurate information when registering. You are responsible for keeping your password secure and for all activity under your account. You must be 18 or older to use this platform.
            </p>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-foreground mb-2">3. Supplier responsibilities</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Suppliers must list accurate product information, including pricing, specifications, and images. Suppliers are responsible for fulfilling orders and honoring quoted prices. Misleading listings may result in account suspension.
            </p>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-foreground mb-2">4. Buyer responsibilities</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Buyers must provide accurate delivery information and make payments through the platform. Placing fraudulent orders or abusing the messaging system may result in account suspension.
            </p>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-foreground mb-2">5. Orders and payments</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Orders placed through TechPharma create a direct agreement between buyer and supplier. TechPharma facilitates the transaction but is not a party to the sale. Payment is processed at the time of order unless cash on delivery is selected.
            </p>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-foreground mb-2">6. Prohibited activities</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              You may not use TechPharma to list illegal products, engage in fraud, send spam, scrape data, or attempt to circumvent platform fees. Violations may result in immediate account termination.
            </p>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-foreground mb-2">7. Intellectual property</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              The TechPharma name, logo, and platform code are owned by TechPharma. Product images and listings belong to the respective suppliers. Do not copy or redistribute content without permission.
            </p>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-foreground mb-2">8. Limitation of liability</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              TechPharma is not liable for the quality, safety, or legality of products listed by suppliers. We are not liable for disputes between buyers and sellers. Our liability is limited to the transaction fees collected.
            </p>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-foreground mb-2">9. Account termination</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We may suspend or terminate accounts that violate these terms. You may delete your account at any time by contacting us.
            </p>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-foreground mb-2">10. Changes to terms</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We may update these terms as the platform grows. We will notify users of significant changes. Continued use after changes constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-foreground mb-2">11. Contact</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Questions about these terms? Email us at techpharma10@gmail.com.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  )
}
