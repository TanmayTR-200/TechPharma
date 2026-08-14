'use client'

import { useState } from 'react'
import { Check, ChevronRight, Store, Upload, FileText } from 'lucide-react'
import { Footer } from '@/components/footer'

const steps = [
  { id: 1, label: 'Business details', icon: Store },
  { id: 2, label: 'Documents', icon: FileText },
  { id: 3, label: 'Verification', icon: Check },
]

export default function SupplierOnboardingPage() {
  const [currentStep, setCurrentStep] = useState(1)

  return (
    <div className="flex min-h-screen flex-col pt-14 relative z-10">
      <main className="flex-1 bg-secondary/30">
        <div className="container-app py-8">
          <div className="mx-auto max-w-2xl">
            <h1 className="font-display text-2xl font-bold text-foreground">Become a supplier</h1>
            <p className="mt-1 text-muted-foreground">List your products and start selling to buyers across India</p>

            {/* Steps */}
            <div className="mt-8 flex items-center justify-between">
              {steps.map((step, i) => {
                const Icon = step.icon
                const isComplete = currentStep > step.id
                const isActive = currentStep === step.id
                return (
                  <div key={step.id} className="flex flex-1 items-center">
                    <div className="flex flex-col items-center gap-2">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-full border-2 ${
                          isComplete
                            ? 'border-emerald-600 bg-primary text-white'
                            : isActive
                            ? 'border-emerald-600 text-primary'
                            : 'border-border text-muted-foreground/60'
                        }`}
                      >
                        {isComplete ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                      </div>
                      <span className={`text-xs ${isActive ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                        {step.label}
                      </span>
                    </div>
                    {i < steps.length - 1 && (
                      <div className={`mx-2 h-0.5 flex-1 ${isComplete ? 'bg-primary' : 'bg-slate-200'}`} />
                    )}
                  </div>
                )
              })}
            </div>

            {/* Step content */}
            <div className="mt-8 rounded-lg border border-border bg-card p-6">
              {currentStep === 1 && (
                <div className="space-y-4">
                  <h2 className="text-base font-semibold text-foreground">Business details</h2>
                  <p className="text-sm text-muted-foreground">Tell us about your business so we can verify your account.</p>
                  <div className="space-y-3">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-foreground">Business name</label>
                      <input
                        type="text"
                        placeholder="e.g. Global Traders Pvt Ltd"
                        className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-foreground">GST number</label>
                      <input
                        type="text"
                        placeholder="22AAAAA0000A1Z5"
                        className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-foreground">Business address</label>
                      <textarea
                        rows={3}
                        placeholder="Enter your business address"
                        className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => setCurrentStep(2)}
                    className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary/90"
                  >
                    Continue
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-4">
                  <h2 className="text-base font-semibold text-foreground">Upload documents</h2>
                  <p className="text-sm text-muted-foreground">Upload your business registration documents for verification.</p>
                  <div className="space-y-3">
                    {['GST Certificate', 'Business Registration', 'Bank Details'].map((doc) => (
                      <div key={doc} className="flex items-center justify-between rounded-lg border border-border p-4">
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-muted-foreground/60" />
                          <span className="text-sm font-medium text-foreground">{doc}</span>
                        </div>
                        <button className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary/30">
                          <Upload className="h-3.5 w-3.5" />
                          Upload
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentStep(1)}
                      className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-secondary/30"
                    >
                      Back
                    </button>
                    <button
                      onClick={() => setCurrentStep(3)}
                      className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary/90"
                    >
                      Submit for verification
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              {currentStep === 3 && (
                <div className="text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                    <Check className="h-8 w-8 text-primary" />
                  </div>
                  <h2 className="mt-4 text-lg font-bold text-foreground">Application submitted</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    We'll review your application and get back to you within 2-3 business days.
                  </p>
                  <button className="mt-6 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary/90">
                    Go to dashboard
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
