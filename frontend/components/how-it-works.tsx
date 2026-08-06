import { UserPlus, Package, ShoppingCart } from "lucide-react"

const steps = [
  { icon: UserPlus, title: "Create your account", desc: "Sign up as a supplier or buyer. Add your business details and get started." },
  { icon: Package, title: "List or find products", desc: "Suppliers list products with photos and pricing. Buyers search, filter, and compare." },
  { icon: ShoppingCart, title: "Connect and order", desc: "Message suppliers, request quotes, place orders, and track everything from your dashboard." },
]

export function HowItWorks() {
  return (
    <section className="py-12 border-t border-border">
      <div className="max-w-5xl mx-auto px-6">
        <h2 className="text-xl font-semibold text-foreground mb-1">How it works</h2>
        <p className="text-sm text-muted-foreground mb-8">Three steps from signup to your first order.</p>

        <div className="grid md:grid-cols-3 gap-6">
          {steps.map((step, idx) => (
            <div key={step.title}>
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                  <step.icon className="h-4 w-4 text-primary" />
                </div>
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Step {idx + 1}</span>
              </div>
              <h3 className="text-sm font-semibold text-foreground mb-1">{step.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
