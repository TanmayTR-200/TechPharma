'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { authApi } from '@/lib/api';

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [userInfo, setUserInfo] = useState<{ email: string; name: string } | null>(null);

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) return;

    authApi.verifyResetToken(token)
      .then((data) => {
        if (data.success && data.user) {
          setUserInfo(data.user);
        }
      })
      .catch((error) => {
        console.error('Failed to verify reset token:', error);
      });
  }, [token]);

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-secondary/30 relative z-10">
        <div className="w-full max-w-md space-y-6 rounded-lg border border-border bg-card p-8 text-center">
          <div className="text-red-600">
            <h1 className="text-2xl font-bold">Invalid reset link</h1>
            <p className="mt-2 text-sm text-muted-foreground">This password reset link is invalid or has expired.</p>
            <div className="mt-4">
              <Link
                href="/auth/forgot-password"
                className="text-sm font-medium text-primary hover:text-primary"
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
        title: "Password reset",
        description: response.message || "Your password has been reset. Please log in with your new password.",
      });

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
    <div className="min-h-screen relative z-10 flex flex-col bg-card">
      {/* Top Navigation Bar */}
      <nav className="border-b border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between">
            <div className="flex items-center">
              <Link href="/" className="flex items-center gap-2">
                <span className="text-lg font-bold text-foreground">TechPharma</span>
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/auth?mode=login"
                className="text-sm text-foreground border border-border px-4 py-2 rounded-lg hover:bg-secondary/30 transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/auth?mode=signup"
                className="text-sm bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
              >
                Sign up
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md space-y-6 rounded-lg border border-border bg-card p-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Set a new password</h1>
            {userInfo ? (
              <p className="mt-2 text-sm text-muted-foreground">
                Resetting password for <span className="font-medium text-foreground">{userInfo.name}</span> ({userInfo.email})
              </p>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                Enter your new password below.
              </p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-4">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-foreground">
                  New password
                </label>
                <div className="relative mt-1.5">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-10"
                    placeholder="••••••••"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground">
                  Confirm new password
                </label>
                <div className="relative mt-1.5">
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pr-10"
                    placeholder="••••••••"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? "Resetting..." : "Reset password"}
            </Button>

            <div className="text-center">
              <Link
                href="/auth?mode=login"
                className="text-sm font-medium text-primary hover:text-primary transition-colors"
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
