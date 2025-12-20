'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import Link from 'next/link';
import { authApi } from '@/lib/api';

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const token = searchParams.get('token');

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100">
        <div className="w-full max-w-md space-y-8 rounded-xl bg-white p-8 shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
          <div className="text-center text-red-600">
            <h1 className="text-3xl font-bold">Invalid Reset Link</h1>
            <p className="mt-2">This password reset link is invalid or has expired.</p>
            <div className="mt-4">
              <Link
                href="/auth/forgot-password"
                className="text-sm font-medium text-blue-600 hover:text-blue-500"
              >
                Request a new reset link
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure both passwords match.",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await authApi.resetPassword(token, password);

      toast({
        title: "Success!",
        description: response.message || "Your password has been reset. Please log in with your new password.",
      });

      // Redirect to login
      router.push('/auth?mode=login&message=password_reset');
    } catch (error: any) {
      toast({
        title: "Reset failed",
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
              Enter your new password below.
            </p>
          </div>
          
          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-200">
                New password
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 bg-[#141414] border-[#1a1a1a] text-white placeholder:text-gray-500 focus:ring-primary/20 focus:border-primary"
                placeholder="••••••••"
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-200">
                Confirm new password
              </label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 bg-[#141414] border-[#1a1a1a] text-white placeholder:text-gray-500 focus:ring-primary/20 focus:border-primary"
                placeholder="••••••••"
                disabled={isLoading}
              />
            </div>

          </div>

          <Button
            type="submit"
            className="w-full border-2 border-primary bg-transparent hover:bg-primary text-white font-semibold transition-all duration-200"
            disabled={isLoading}
          >
            {isLoading ? "Resetting..." : "Reset password"}
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