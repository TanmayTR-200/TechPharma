"use client"

import { useProductNavigation } from "@/hooks/use-product-navigation"
import { useEffect, useState } from "react"
import { ChevronRight } from "lucide-react"
import { Reveal } from "@/components/reveal"

const categories = [
  { name: "Tech Transfer", key: "tech-transfer" },
  { name: "Technical Consultant", key: "technical-consultant" },
  { name: "Job Workers", key: "job-workers" },
  { name: "Equipment Fabrication", key: "equipment-fabrication" },
  { name: "AHU/HVAC", key: "ahu-hvac" },
  { name: "Clean Room Fabricator", key: "clean-room-fabricator" },
  { name: "Purified Water System", key: "purified-water-system" },
  { name: "Pest Control (Industrial)", key: "pest-control-industrial" },
  { name: "Pipeline Fabrication", key: "pipeline-fabrication" },
  { name: "Electrical", key: "electrical" },
  { name: "Civil Work", key: "civil-work" },
  { name: "Utility", key: "utility" },
  { name: "ETP Equipment", key: "etp-equipment" },
  { name: "Plant Instruments", key: "plant-instruments" },
  { name: "Lab Instruments", key: "lab-instruments" },
  { name: "Approvals/Licences", key: "approvals-licences" },
  { name: "QA/QC/RA Consultant", key: "qa-qc-ra-consultant" },
  { name: "Consent/Environment Consultant", key: "consent-environment-consultant" },
  { name: "Safety Consultant", key: "safety-consultant" },
  { name: "Manpower Consultant", key: "manpower-consultant" },
  { name: "Labour Contractors", key: "labour-contractors" },
  { name: "IT Support", key: "it-support" },
  { name: "External Laboratories", key: "external-laboratories" },
  { name: "Trainings - External Faculties", key: "trainings-external-faculties" },
  { name: "Industrial Land", key: "industrial-land" },
  { name: "Defect Handling", key: "defect-handling" },
  { name: "Documents and Updates", key: "documents-and-updates" },
]

function CategorySkeleton() {
  return (
    <div className="border border-border p-4 animate-fade-up">
      <div className="shimmer h-3 w-20 mb-2" />
      <div className="shimmer h-2.5 w-12" />
    </div>
  )
}

export function CategoryGrid() {
  const { navigateToProducts } = useProductNavigation()
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000') + '/api/products/category-counts')
      .then(r => r.json())
      .then(d => { if (d.success) setCounts(d.counts) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const populated = categories.filter(c => (counts[c.key] || 0) > 0)
  const empty = categories.filter(c => (counts[c.key] || 0) === 0)

  return (
    <section className="py-16">
      <div className="max-w-7xl mx-auto px-6 sm:px-8">
        <div className="flex items-center justify-between mb-8">
          <h2 className="font-display text-2xl font-bold text-foreground">Categories</h2>
          <button onClick={() => navigateToProducts({})} className="flex items-center gap-1 text-[11px] uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors">
            View all <ChevronRight className="h-3 w-3" />
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <CategorySkeleton key={i} />)}
          </div>
        ) : (
          <>
            {populated.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-3">
                {populated.map((cat, idx) => {
                  const count = counts[cat.key] || 0
                  return (
                    <Reveal key={cat.name} delay={idx * 0.05} y={20}>
                      <button
                        onClick={() => navigateToProducts({ category: cat.name, sortBy: 'featured', page: 1 })}
                        className="group border border-border p-5 text-left w-full hover:border-foreground transition-colors"
                      >
                        <p className="font-display text-lg font-semibold text-foreground mb-1">{cat.name}</p>
                        <p className="text-xs text-muted-foreground">{count} product{count !== 1 ? 's' : ''}</p>
                      </button>
                    </Reveal>
                  )
                })}
              </div>
            )}
            {empty.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mt-4">
                {empty.map((cat) => (
                  <button key={cat.name} onClick={() => navigateToProducts({ category: cat.name, sortBy: 'featured', page: 1 })} className="border border-border/50 px-3 py-2 text-muted-foreground hover:text-foreground hover:border-foreground transition-colors text-left">
                    <span className="text-xs font-medium">{cat.name}</span>
                    <span className="text-[10px] text-muted-foreground/60 block">No listings</span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  )
}
