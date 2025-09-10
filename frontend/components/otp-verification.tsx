'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface OtpVerificationProps {
  isOpen: boolean;
  onVerify: (otp: string) => Promise<boolean>;
  onResend: () => void;
  isVerifying: boolean;
}

export function OtpVerification({
  isOpen,
  onVerify,
  onResend,
  isVerifying
}: OtpVerificationProps) {
  const [otp, setOtp] = useState('');
  const { toast } = useToast();
  const [resendDisabled, setResendDisabled] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      setOtp('');
      setResendDisabled(false);
      setResendCountdown(0);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length === 6) {
      try {
        await onVerify(otp);
      } catch (error: any) {
        toast({
          title: "Verification Failed",
          description: error.message || "Please try again",
          variant: "destructive"
        });
      }
    }
  };

  const handleResend = async () => {
    setResendDisabled(true);
    setResendCountdown(30);
    
    try {
      await onResend();
      toast({
        title: "OTP Sent",
        description: "A new verification code has been sent to your email"
      });

      // Start countdown
      const interval = setInterval(() => {
        setResendCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setResendDisabled(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (error: any) {
      toast({
        title: "Failed to Resend",
        description: error.message || "Please try again later",
        variant: "destructive"
      });
      setResendDisabled(false);
    }
  };

  return (
    <Dialog open={isOpen} modal={true}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Verify Your Email</DialogTitle>
          <DialogDescription>
            Please enter the 6-digit code we sent to your email.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Input
              placeholder="Enter verification code"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              maxLength={6}
              className="text-center text-2xl tracking-widest"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Button type="submit" disabled={otp.length !== 6 || isVerifying}>
              {isVerifying ? 'Verifying...' : 'Verify'}
            </Button>
            <Button 
              type="button" 
              variant="ghost" 
              onClick={handleResend}
              disabled={resendDisabled}
            >
              {resendDisabled 
                ? `Resend Code (${resendCountdown}s)` 
                : 'Resend Code'
              }
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
