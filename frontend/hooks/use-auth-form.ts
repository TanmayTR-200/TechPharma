"use client"

import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface SignupData {
  name: string;
  companyName: string;
  email: string;
  phone: string;
  state: string;
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

      // Step 1: Send OTP FIRST (before creating user)
      // Backend checks if email already exists before sending OTP
      const otpResponse = await fetch(`${API_URL}/api/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.email })
      });

      const otpResult = await otpResponse.json();

      if (!otpResponse.ok) {
        // Email already registered or error
        if (otpResult.message?.toLowerCase().includes('already')) {
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
        throw new Error(otpResult.message || 'Failed to send OTP');
      }

      if (otpResult.success) {
        setOtpSent(true);
        toast({
          title: 'OTP Sent',
          description: 'Please check your email for the verification code.',
        });
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
          description: error.message || 'Failed to send verification code',
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

      // Step 2: Verify OTP
      const verifyResponse = await fetch(`${API_URL}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: signupData.email,
          otp
        })
      });

      const verifyResult = await verifyResponse.json();

      if (!verifyResult.success) {
        throw new Error(verifyResult.message);
      }

      // Step 3: OTP verified — NOW create the user
      toast({
        title: 'Verified!',
        description: 'Creating your account...',
      });

      const registerResponse = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: signupData.name,
          email: signupData.email,
          password: signupData.password,
          companyName: signupData.companyName,
          phone: signupData.phone,
          state: signupData.state
        })
      });

      const registerResult = await registerResponse.json();

      if (registerResult.success && registerResult.token) {
        localStorage.setItem('token', registerResult.token);
        toast({
          title: 'Welcome!',
          description: 'Your account has been created successfully.',
        });
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 1500);
        return true;
      } else {
        throw new Error(registerResult.message || 'Registration failed');
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
