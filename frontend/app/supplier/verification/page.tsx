'use client'

import { Check, Clock, X, FileText, Shield } from 'lucide-react'
import { Footer } from '@/components/footer'

const documents = [
  { name: 'GST Certificate', status: 'verified', date: 'Submitted on Jan 15, 2025' },
  { name: 'PAN Card', status: 'verified', date: 'Submitted on Jan 15, 2025' },
  { name: 'Business Registration', status: 'pending', date: 'Submitted on Jan 20, 2025' },
  { name: 'Bank Account Proof', status: 'rejected', date: 'Submitted on Jan 22, 2025' },
]

const statusConfig = {
  verified: { icon: Check, color: 'text-primary', bg: 'bg-primary/10', label: 'Verified' },
  pending: { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', label: 'Under review' },
  rejected: { icon: X, color: 'text-red-600', bg: 'bg-red-50', label: 'Rejected' },
}

export default function SupplierVerificationPage() {
  return (
    <div className="flex min-h-screen flex-col pt-14 relative z-10">
      <main className="flex-1 bg-secondary/30">
        <div className="container-app py-12">
          <div className="mx-auto max-w-3xl">
            <h1 className="text-2xl font-bold text-foreground">Account verification</h1>
            <p className="mt-1 text-muted-foreground">Track the status of your submitted documents</p>

            {/* Status banner */}
            <div className="mt-8 flex items-start gap-4 rounded-lg border border-amber-200 bg-amber-50 p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100">
                <Shield className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-foreground">Verification in progress</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  2 of 4 documents verified. We're reviewing your remaining documents. This usually takes 2-3 business days.
                </p>
              </div>
            </div>

            {/* Documents */}
            <div className="mt-6 overflow-hidden rounded-lg border border-border bg-card">
              <div className="border-b border-border px-5 py-4">
                <h2 className="text-base font-semibold text-foreground">Submitted documents</h2>
              </div>
              <div className="divide-y divide-slate-100">
                {documents.map((doc) => {
                  const config = statusConfig[doc.status as keyof typeof statusConfig]
                  const StatusIcon = config.icon
                  return (
                    <div key={doc.name} className="flex items-center justify-between p-5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{doc.name}</p>
                          <p className="text-xs text-muted-foreground">{doc.date}</p>
                        </div>
                      </div>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${config.bg} ${config.color}`}>
                        <StatusIcon className="h-3 w-3" />
                        {config.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Rejected document action */}
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-5">
              <h3 className="text-sm font-semibold text-foreground">Action needed: Bank Account Proof</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Your bank account proof was rejected because the document was unclear. Please re-upload a clear copy of your bank statement or cancelled cheque.
              </p>
              <button className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90">
                Re-upload document
              </button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
