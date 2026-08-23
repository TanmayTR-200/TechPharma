'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import Link from 'next/link';
import { OtpVerification } from '@/components/otp-verification';
import { authApi } from '@/lib/api';

export default function RegisterPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showOtpDialog, setShowOtpDialog] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    companyName: '',
  });
  const [token, setToken] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const data = await authApi.register(formData);

      if (data.requiresVerification && data.token) {
        setToken(data.token);
        setShowOtpDialog(true);
        toast({
          title: "Check your email",
          description: data.message || "We've sent you a verification code."
        });
      } else if (data.token) {
        localStorage.setItem('token', data.token);
        toast({
          title: "Account created",
          description: "You can now log in with your credentials.",
        });
        router.push('/auth?mode=login&message=registration_success');
      } else {
        throw new Error('No token received from server');
      }
    } catch (error: any) {
      const serverMsg = error.response?.data?.message;
      toast({
        title: "Registration failed",
        description: serverMsg || error.message || "Something went wrong",
        variant: "destructive",
      });
      if (serverMsg && serverMsg.includes('already exists')) {
        setTimeout(() => router.push('/auth?mode=login'), 2000);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/30 px-4 py-12 relative z-10">
      <div className="w-full max-w-md space-y-6 rounded-lg border border-border bg-card p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Create an account</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/auth?mode=login" className="font-medium text-primary hover:text-primary">
              Sign in
            </Link>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-foreground">
                Full name
              </label>
              <Input
                id="name"
                name="name"
                type="text"
                required
                value={formData.name}
                onChange={handleChange}
                className="mt-1.5"
                placeholder="John Doe"
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-foreground">
                Email address
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="mt-1.5"
                placeholder="you@example.com"
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-foreground">
                Password
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={formData.password}
                onChange={handleChange}
                className="mt-1.5"
                placeholder="••••••••"
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="companyName" className="block text-sm font-medium text-foreground">
                Company name
              </label>
              <Input
                id="companyName"
                name="companyName"
                type="text"
                value={formData.companyName}
                onChange={handleChange}
                className="mt-1.5"
                placeholder="Your Company Ltd."
                disabled={isLoading}
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? "Creating account..." : "Create account"}
          </Button>
        </form>

        <div className="mt-2">
          <p className="text-center text-xs text-muted-foreground">
            By creating an account, you agree to our{' '}
            <Link href="/terms" className="font-medium text-primary hover:text-primary">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="font-medium text-primary hover:text-primary">
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>

      <OtpVerification
        isOpen={showOtpDialog}
        isVerifying={isVerifying}
        onVerify={async (otp) => {
          setIsVerifying(true);
          try {
            const result = await authApi.verifyOtp(otp, token);
            
            if (result.success) {
              localStorage.setItem('token', token);
              toast({
                title: "Email verified",
                description: result.message || "Your email has been verified. You can now log in.",
              });
              
              router.push('/auth?mode=login&message=registration_success');
              return true;
            } else {
              throw new Error(result.message || 'Verification failed');
            }
          } catch (error: any) {
            toast({
              title: "Verification failed",
              description: error.message || "Please try again",
              variant: "destructive"
            });
            return false;
          } finally {
            setIsVerifying(false);
          }
        }}
        onResend={async () => {
          try {
            const result = await authApi.resendOtp(token);

            if (result.success) {
              toast({
                title: "Code sent",
                description: result.message || "Check your email for the new verification code.",
              });
            } else {
              throw new Error(result.message || 'Failed to resend code');
            }
          } catch (error: any) {
            toast({
              title: "Failed to resend code",
              description: error.message || "Please try again later",
              variant: "destructive"
            });
            throw error;
          }
        }}
      />
    </div>
  );
}