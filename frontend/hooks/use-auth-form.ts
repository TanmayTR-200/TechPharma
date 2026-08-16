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

  const handleSignup = async (data: SignupData) => {
    try {
      setSignupData(data);
      
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      const response = await fetch(`${API_URL}/api/auth/register`, {
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

      const result = await response.json();
      clearTimeout(timeoutId);

      if (result.success && result.token) {
        localStorage.setItem('token', result.token);
        toast({
          title: 'Welcome!',
          description: 'Your account has been created successfully.',
        });
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 1500);
        return;
      }

      if (!response.ok) {
        if (result.message?.toLowerCase().includes('already') || response.status === 400) {
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
        throw new Error(result.message || 'Registration failed');
      }
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

  const verifyOtp = async (_otp: string) => {
    return true;
  };

  const resendOtp = async () => {};

  return {
    handleSignup,
    verifyOtp,
    resendOtp,
    isVerifying,
    otpSent
  };
}
