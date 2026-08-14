import { Footer } from "@/components/footer"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Privacy Policy - TechPharma",
  description: "How TechPharma collects, uses, and protects your data.",
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen relative z-10 pt-16">
      <main className="max-w-2xl mx-auto px-6 py-10">
        <h1 className="font-display text-2xl font-bold text-foreground mb-1">Privacy Policy</h1>
        <p className="text-xs text-muted-foreground mb-8">Last updated: August 2026</p>

        <div className="space-y-6">
          <section>
            <h2 className="text-sm font-semibold text-foreground mb-2">1. Information we collect</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We collect information you provide when you register: your name, email address, phone number, and company name. We also collect product listings, order data, and messages you send through the platform.
            </p>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-foreground mb-2">2. How we use your information</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We use your information to provide the marketplace service: process orders, facilitate communication between buyers and sellers, verify supplier accounts, and prevent fraud. We do not sell your data to third parties.
            </p>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-foreground mb-2">3. Data storage and security</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Your data is stored securely. Passwords are hashed using bcrypt. Authentication tokens are signed with JWT. We use HTTPS for all data in transit. Access to personal data is restricted to authorized personnel only.
            </p>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-foreground mb-2">4. Cookies</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We use essential cookies for authentication and session management. We do not use third-party tracking cookies or advertising networks.
            </p>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-foreground mb-2">5. Your rights</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              You can request access to, correction of, or deletion of your personal data at any time. Contact us at techpharma10@gmail.com with any data requests.
            </p>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-foreground mb-2">6. Product images</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Product images uploaded by suppliers are hosted on Cloudinary and are visible to all platform users. Suppliers are responsible for ensuring they have the right to use uploaded images.
            </p>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-foreground mb-2">7. Changes to this policy</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We may update this policy as the platform evolves. We will notify users of significant changes via email. Continued use after changes constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-foreground mb-2">8. Contact</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Questions about this policy? Email us at techpharma10@gmail.com.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  )
}
