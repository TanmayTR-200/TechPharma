"use client"

import { Suspense, useEffect } from "react"
import { Shield, Users, Package } from "lucide-react"
import Link from "next/link"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useSearchParams } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { LoginForm } from "@/components/auth/login-form"
import { SignupForm } from "@/components/auth/signup-form"

const points = [
  { icon: Package, text: "List products with photos and pricing" },
  { icon: Users, text: "Connect with verified buyers and sellers" },
  { icon: Shield, text: "Payments are handled securely" },
]

function AuthContent() {
  const searchParams = useSearchParams()
  const { toast } = useToast()

  useEffect(() => {
    if (searchParams.get('message') === 'existing_user') {
      toast({ title: 'Account exists', description: 'Sign in with your email.' })
    }
  }, [searchParams, toast])

  return (
    <div className="min-h-screen flex items-stretch relative z-10">
      {/* Left — brand showcase */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center p-16 bg-secondary">
        <Link href="/" className="inline-flex items-center gap-2.5 mb-12">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <span className="text-primary-foreground font-bold text-sm">T</span>
          </div>
          <span className="text-lg font-bold text-foreground">TechPharma</span>
        </Link>

        <h2 className="text-3xl font-bold text-foreground mb-3 leading-tight">
          List products. Get orders.
        </h2>
        <p className="text-sm text-muted-foreground mb-10 max-w-sm leading-relaxed">
          A marketplace for B2B suppliers and buyers.
        </p>

        <div className="space-y-3 max-w-sm">
          {points.map((p) => (
            <div key={p.text} className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 flex-shrink-0">
                <p.icon className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm text-foreground">{p.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right — auth form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-6 py-12">
        <div className="w-full max-w-sm mx-auto">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8 text-center">
            <Link href="/" className="inline-flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <span className="text-primary-foreground font-bold text-sm">T</span>
              </div>
              <span className="text-lg font-bold text-foreground">TechPharma</span>
            </Link>
          </div>

          <Tabs defaultValue={searchParams.get('mode') || 'login'} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6 bg-muted rounded-md">
              <TabsTrigger value="login">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Sign up</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <LoginForm />
            </TabsContent>

            <TabsContent value="signup">
              <SignupForm />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div></div>}>
      <AuthContent />
    </Suspense>
  )
}