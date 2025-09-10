const suppliers = [
  { name: "TechCorp Industries", logo: "/techcorp-industries-logo.png" },
  { name: "Global Manufacturing", logo: "/placeholder-9w0je.png" },
  { name: "Premium Textiles", logo: "/placeholder-f5cme.png" },
  { name: "ChemSolutions Ltd", logo: "/chemsolutions-ltd-logo.png" },
  { name: "Machinery Pro", logo: "/machinery-pro-logo.png" },
  { name: "ElectroTech Systems", logo: "/electrotech-systems-logo.png" },
]

export function TrustedSuppliers() {
  return (
    <section className="py-16 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-serif font-bold text-foreground mb-4">
            Trusted by Leading Suppliers
          </h2>
          <p className="text-lg text-muted-foreground">
            Join thousands of verified suppliers serving businesses worldwide
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 items-center">
          {suppliers.map((supplier) => (
            <div
              key={supplier.name}
              className="flex items-center justify-center p-4 grayscale hover:grayscale-0 transition-all duration-300"
            >
              <img
                src={supplier.logo || "/placeholder.svg"}
                alt={supplier.name}
                className="max-h-12 w-auto opacity-60 hover:opacity-100 transition-opacity"
              />
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-3xl font-serif font-bold text-accent mb-2">50K+</div>
              <p className="text-muted-foreground">Verified Suppliers</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-serif font-bold text-accent mb-2">2M+</div>
              <p className="text-muted-foreground">Products Listed</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-serif font-bold text-accent mb-2">180+</div>
              <p className="text-muted-foreground">Countries Served</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
