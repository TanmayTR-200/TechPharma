"use client"

import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface SignupData {
  name: string;
  companyName: string;
  email: string;
  phone: string;
  password: string;
}

export function useAuthForm() {
  const { toast } = useToast();
  const [isVerifying, setIsVerifying] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [signupData, setSignupData] = useState<SignupData | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  const handleSignup = async (data: SignupData) => {
    try {
      setSignupData(data);

      // Check if user already exists
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const checkResponse = await fetch(`${API_URL}/api/auth/register`, {
        signal: controller.signal,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          password: data.password,
          companyName: data.companyName
        })
      });

      const checkResult = await checkResponse.json();
      clearTimeout(timeoutId);

      // If user already exists
      if (!checkResponse.ok && (checkResult.message?.toLowerCase().includes('already') || checkResponse.status === 400)) {
        toast({
          title: 'Account Exists',
          description: 'This email is already registered. Please login instead.',
          variant: 'default'
        });
        setTimeout(() => {
          window.location.href = '/auth?mode=login&message=existing_user';
        }, 1500);
        return;
      }

      // If registration succeeded (user was created), we still send OTP
      // Delete the user we just created so they can re-register after OTP verification
      if (checkResult.success && checkResult.token) {
        // User created — now send OTP for email verification
        const otpResponse = await fetch(`${API_URL}/api/auth/send-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: data.email })
        });

        const otpResult = await otpResponse.json();

        if (otpResult.success) {
          // Store token temporarily — user is created but needs to verify email
          localStorage.setItem('token', checkResult.token);
          setOtpSent(true);
          toast({
            title: 'OTP Sent',
            description: 'Please check your email for the verification code.',
          });
        } else {
          // OTP failed but user is created — just log them in
          localStorage.setItem('token', checkResult.token);
          toast({
            title: 'Welcome!',
            description: 'Your account has been created successfully.',
          });
          setTimeout(() => {
            window.location.href = '/dashboard';
          }, 1500);
        }
        return;
      }

      throw new Error(checkResult.message || 'Registration failed');
    } catch (error: any) {
      if (error.name === 'AbortError') {
        toast({
          title: 'Connection Timeout',
          description: 'The server is taking too long to respond. Please try again.',
          variant: 'destructive',
          duration: 5000
        });
      } else {
        toast({
          title: 'Error',
          description: error.message || 'Failed to sign up',
          variant: 'destructive',
          duration: 5000
        });
      }
    }
  };

  const verifyOtp = async (otp: string) => {
    if (!signupData) return false;

    try {
      setIsVerifying(true);

      const verifyResponse = await fetch(`${API_URL}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: signupData.email,
          otp
        })
      });

      const verifyResult = await verifyResponse.json();

      if (verifyResult.success) {
        toast({
          title: 'Success',
          description: 'Email verified successfully!',
        });

        // User already registered — token already stored
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 1500);

        return true;
      } else {
        throw new Error(verifyResult.message);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to verify code',
        variant: 'destructive'
      });
      return false;
    } finally {
      setIsVerifying(false);
    }
  };

  const resendOtp = async () => {
    if (!signupData) return;

    try {
      const response = await fetch(`${API_URL}/api/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: signupData.email })
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: 'OTP Sent',
          description: 'A new verification code has been sent to your email.',
        });
      } else {
        throw new Error(result.message);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to resend verification code',
        variant: 'destructive'
      });
    }
  };

  return {
    handleSignup,
    verifyOtp,
    resendOtp,
    isVerifying,
    otpSent
  };
}
