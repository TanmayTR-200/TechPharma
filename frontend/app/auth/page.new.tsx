"use client";

import { Suspense, useEffect } from "react";
import Link from "next/link";
import { Building2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoginForm } from "@/components/auth/login-form";
import { SignupForm } from "@/components/auth/signup-form";

function AuthContent() {
  const searchParams = useSearchParams();
  const { toast } = useToast();

  useEffect(() => {
    const message = searchParams.get("message");
    if (message === "existing_user") {
      toast({
        title: "Account Exists",
        description: "An account with this email already exists. Please sign in.",
        variant: "default",
      });
    }
  }, [searchParams, toast]);

  return (
    <div className="flex min-h-screen">
      {/* Left side - Illustration */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary/10 via-primary/5 to-background items-center justify-center p-12">
        <div className="max-w-md text-center">
          <div className="mb-8">
            <div className="mx-auto mb-6 flex h-32 w-32 items-center justify-center rounded-full bg-primary/10">
              <Building2 className="h-16 w-16 text-primary" />
            </div>
            <h2 className="mb-4 text-3xl font-bold text-foreground">
              Connect with Global Suppliers
            </h2>
            <p className="text-lg leading-relaxed text-muted-foreground">
              Join thousands of businesses finding trusted suppliers and growing
              their operations through our B2B marketplace platform.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-primary">50K+</div>
              <div className="text-sm text-muted-foreground">Suppliers</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary">1M+</div>
              <div className="text-sm text-muted-foreground">Products</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary">100+</div>
              <div className="text-sm text-muted-foreground">Countries</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Auth Forms */}
      <div className="flex w-full items-center justify-center p-6 lg:w-1/2 lg:p-12">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center lg:text-left">
            <Link
              href="/"
              className="mb-2 inline-flex items-center gap-2 text-2xl font-bold text-primary"
            >
              <Building2 className="h-8 w-8" />
              TradeConnect
            </Link>
            <p className="text-muted-foreground">
              Welcome to the future of B2B commerce
            </p>
          </div>

          <Tabs
            defaultValue={searchParams.get("mode") || "login"}
            className="w-full"
          >
            <TabsList className="mb-6 grid w-full grid-cols-2">
              <TabsTrigger value="login">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <Card>
                <CardHeader className="space-y-1">
                  <CardTitle className="text-2xl">
                    Sign in to your account
                  </CardTitle>
                  <CardDescription>
                    Enter your credentials to access your dashboard
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <LoginForm />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="signup">
              <Card>
                <CardHeader className="space-y-1">
                  <CardTitle className="text-2xl">Create your account</CardTitle>
                  <CardDescription>
                    Join our marketplace and start connecting with suppliers
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <SignupForm />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
        </div>
      }
    >
      <AuthContent />
    </Suspense>
  );
}