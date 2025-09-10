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
      
      // First check if user exists
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const checkResponse = await fetch('/api/auth/register', {
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

      if (checkResult.redirectTo) {
        // User already exists, show message and redirect
        toast({
          title: 'Account Exists',
          description: checkResult.message || 'Please login with your existing account.',
          variant: 'default'
        });
        
        setTimeout(() => {
          window.location.href = checkResult.redirectTo;
        }, 1500);
        
        return;
      }

      // If user doesn't exist, proceed with OTP
      const response = await fetch('/api/auth/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: data.email,
          action: 'send'
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setOtpSent(true);
        toast({
          title: 'OTP Sent',
          description: 'Please check your email for the verification code.',
        });
      } else {
        throw new Error(result.message);
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
      
      // First verify OTP
      const verifyResponse = await fetch('/api/auth/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: signupData.email,
          otp,
          action: 'verify'
        })
      });

      const verifyResult = await verifyResponse.json();
      
      if (verifyResult.success) {
        toast({
          title: 'Success',
          description: 'Email verified successfully. Creating your account...',
        });

        // Now complete the registration
        const registerResponse = await fetch('/api/auth/register', {
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
          // Store the token
          localStorage.setItem('token', registerResult.token);
          
          toast({
            title: 'Welcome!',
            description: 'Your account has been created successfully.',
          });

          // Redirect to dashboard after a short delay
          setTimeout(() => {
            window.location.href = '/dashboard';
          }, 1500);
          
          return true;
        } else if (registerResult.redirectTo) {
          // If user already exists, show message and redirect to login
          toast({
            title: 'Account Exists',
            description: registerResult.message || 'Please login with your existing account.',
            variant: 'default'
          });
          
          // Reset the form state
          setSignupData(null);
          setOtpSent(false);
          
          // Redirect to login page
          setTimeout(() => {
            window.location.href = registerResult.redirectTo;
          }, 1500);
          
          return false;
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
      const response = await fetch('/api/auth/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: signupData.email,
          action: 'send'
        })
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
