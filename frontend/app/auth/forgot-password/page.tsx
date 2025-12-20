'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import Link from 'next/link';
import { authApi } from '@/lib/api';

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
        title: "Success!",
        description: response.message || "Reset instructions have been sent to your email.",
      });

      // Delay redirect to allow user to read the message
      setTimeout(() => {
        router.push(`/auth/reset-password?token=${response.token}`);
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
    <div className="min-h-screen flex flex-col bg-white">
      {/* Top Navigation Bar */}
      <nav className="bg-[#0A0A0A] border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/" className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-transparent flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">T</span>
                </div>
                <span className="text-xl font-semibold text-white hidden sm:inline">TechPharma</span>
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <Link 
                href="/auth?mode=login"
                className="text-sm text-white border border-white/50 px-4 py-2 rounded-md hover:bg-white/10 transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/auth?mode=signup"
                className="text-sm bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90 transition-colors"
              >
                Sign Up
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md space-y-8 rounded-xl bg-[#0A0A0A] p-8 shadow-[0_0_40px_rgba(0,0,0,0.6)] border border-[#1a1a1a]">
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight text-white">Reset your password</h1>
            <p className="mt-2 text-sm text-gray-400">
              Enter your email and we&apos;ll send you instructions to reset your password.
            </p>
          </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-200">
              Email address
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 bg-[#141414] border-[#1a1a1a] text-white placeholder:text-gray-500 focus:ring-primary/20 focus:border-primary"
              placeholder="you@example.com"
              disabled={isLoading}
            />
          </div>

          <Button
            type="submit"
            className="w-full border-2 border-primary bg-transparent hover:bg-primary text-white font-semibold transition-all duration-200"
            disabled={isLoading}
          >
            {isLoading ? "Sending..." : "Send reset instructions"}
          </Button>

          <div className="text-center">
            <Link
              href="/auth?mode=login"
              className="text-sm font-medium text-gray-400 hover:text-primary transition-colors"
            >
              Back to login
            </Link>
          </div>
        </form>
      </div>
    </div>
  </div>
  );
}