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
      
      // First check if user exists by calling register
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
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

      // If user already exists, redirect to login
      if (!checkResponse.ok && (checkResult.message?.includes('already') || checkResponse.status === 400)) {
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

      // If registration succeeded, we still need OTP verification
      // Store the token for later, but don't log in yet
      if (checkResult.success && checkResult.token) {
        // Registration succeeded without OTP requirement on backend
        // Store token and redirect
        localStorage.setItem('token', checkResult.token);
        toast({
          title: 'Welcome!',
          description: 'Your account has been created successfully.',
        });
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 1500);
        return;
      }

      // If we reach here, send OTP via backend
      const otpResponse = await fetch(`${API_URL}/api/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.email })
      });

      const otpResult = await otpResponse.json();
      
      if (otpResult.success) {
        setOtpSent(true);
        toast({
          title: 'OTP Sent',
          description: 'Please check your email for the verification code.',
        });
      } else {
        throw new Error(otpResult.message);
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        toast({
          title: 'Connection Timeout',
          description: 'The server is taking too long to respond. Please check your connection and try again.',
          variant: 'destructive',
          duration: 5000
        });
      } else if (error.message.includes('fetch')) {
        toast({
          title: 'Connection Error',
          description: 'Unable to connect to the server. Please check if the server is running and try again.',
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
    if (!signupData) return;

    try {
      setIsVerifying(true);
      
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      
      // Verify OTP via backend
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
          description: 'Email verified successfully. Creating your account...',
        });

        // Now complete the registration via backend
        const registerResponse = await fetch(`${API_URL}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: signupData.name,
            email: signupData.email,
            password: signupData.password,
            company: {
              name: signupData.companyName
            }
          })
        });

        const registerResult = await registerResponse.json();

        if (registerResult.success) {
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
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
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
