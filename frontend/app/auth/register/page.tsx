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

      // If verification is required, show OTP dialog
      if (data.requiresVerification && data.token) {
        setToken(data.token); // Store token temporarily for verification
        setShowOtpDialog(true);
        toast({
          title: "Check your email",
          description: data.message || "We've sent you a verification code."
        });
      } else if (data.token) {
        // No verification required - store token and redirect
        localStorage.setItem('token', data.token);
        toast({
          title: "Registration successful!",
          description: "You can now log in with your credentials.",
        });
        router.push('/auth?mode=login&message=registration_success');
      } else {
        throw new Error('No token received from server');
      }
    } catch (error: any) {
      toast({
        title: "Registration failed",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100">
      <div className="w-full max-w-md space-y-8 rounded-xl bg-white p-8 shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Create an account</h1>
          <p className="mt-2 text-sm text-gray-600">
            Already have an account?{' '}
            <Link href="/auth?mode=login" className="font-medium text-blue-600 hover:text-blue-500">
              Sign in
            </Link>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Full Name
              </label>
              <Input
                id="name"
                name="name"
                type="text"
                required
                value={formData.name}
                onChange={handleChange}
                className="mt-1"
                placeholder="John Doe"
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
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
                className="mt-1"
                placeholder="you@example.com"
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
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
                className="mt-1"
                placeholder="••••••••"
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="companyName" className="block text-sm font-medium text-gray-700">
                Company Name
              </label>
              <Input
                id="companyName"
                name="companyName"
                type="text"
                value={formData.companyName}
                onChange={handleChange}
                className="mt-1"
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

        <div className="mt-6">
          <p className="text-center text-sm text-gray-600">
            By creating an account, you agree to our{' '}
            <Link href="/terms" className="font-medium text-blue-600 hover:text-blue-500">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="font-medium text-blue-600 hover:text-blue-500">
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
              // Store token and redirect
              localStorage.setItem('token', token);
              toast({
                title: "Verification successful!",
                description: result.message || "Your email has been verified. You can now log in.",
              });
              
              // Redirect to login
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
                title: "Code sent!",
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
            throw error; // Re-throw to handle in the OTP component
          }
        }}
      />
    </div>
  );
}
