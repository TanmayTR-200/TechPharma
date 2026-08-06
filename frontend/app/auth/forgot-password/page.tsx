'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import Link from 'next/link';
import { authApi } from '@/lib/api';
import { Mail, ArrowLeft } from 'lucide-react';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await authApi.forgotPassword(email);
      toast({
        title: "Check your email",
        description: response.message || "Reset instructions have been sent to your email.",
      });
      setTimeout(() => {
        router.push('/auth/reset-password?token=' + response.token);
      }, 3000);
    } catch (error: any) {
      toast({
        title: "Request failed",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative z-10 flex flex-col justify-center px-4 py-12">
      <div className="w-full max-w-sm mx-auto">
        <Link href="/" className="flex items-center gap-2 mb-8">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
            <span className="text-primary-foreground font-bold text-xs">T</span>
          </div>
          <span className="font-semibold text-sm tracking-tight text-foreground">TechPharma</span>
        </Link>

        <div className="glass-card p-6">
          <h1 className="text-xl font-semibold text-foreground mb-1">Reset your password</h1>
          <p className="text-sm text-muted-foreground mb-6">Enter your email and we'll send you instructions to reset it.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Email address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  disabled={isLoading}
                  className="w-full h-10 rounded-md border border-border bg-secondary text-sm text-foreground placeholder:text-muted-foreground pl-9 pr-3 focus:outline-none focus:border-primary/50 disabled:opacity-50"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full items-center justify-center rounded-md bg-primary h-10 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {isLoading ? "Sending..." : "Send reset instructions"}
            </button>
          </form>

          <Link href="/auth?mode=login" className="mt-4 flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
            <ArrowLeft className="h-3 w-3" /> Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
