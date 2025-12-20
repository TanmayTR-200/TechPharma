'use client';

import { useState, FormEvent } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, User, Building2, Mail, Phone, Lock } from "lucide-react";
import Link from 'next/link';
import { useAuthForm } from "@/hooks/use-auth-form";
import { OtpVerification } from "@/components/otp-verification";
import { useToast } from "@/hooks/use-toast";

export function SignupForm() {
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    companyName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });
  const { handleSignup, verifyOtp, resendOtp, isVerifying, otpSent } = useAuthForm();


  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (formData.password !== formData.confirmPassword) {
        toast({
          title: "Error",
          description: "Passwords do not match",
          variant: "destructive"
        });
        return;
      }
      await handleSignup({
        name: formData.name,
        companyName: formData.companyName,
        email: formData.email,
        phone: formData.phone,
        password: formData.password
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Full Name</Label>
        <div className="relative">
          <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input 
            id="name" 
            placeholder="Your Full Name" 
            className="pl-10"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            required
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="company-name">Company Name</Label>
        <div className="relative">
          <Building2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input 
            id="company-name" 
            placeholder="Your Company Ltd." 
            className="pl-10"
            value={formData.companyName}
            onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
            required
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="signup-email">Business Email</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input 
            id="signup-email" 
            placeholder="abc@company.com" 
            type="email" 
            className="pl-10"
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            required
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="signup-phone">Phone Number</Label>
        <div className="relative">
          <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input 
            id="signup-phone" 
            placeholder="+91..." 
            type="tel" 
            className="pl-10"
            value={formData.phone}
            onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
            required
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="signup-password">Password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            id="signup-password"
            placeholder="Create a strong password"
            type={showPassword ? "text" : "password"}
            className="pl-10 pr-10"
            value={formData.password}
            onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
            required
            minLength={8}
            aria-label="Password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="confirm-password">Confirm Password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            id="confirm-password"
            placeholder="Confirm your password"
            type={showConfirmPassword ? "text" : "password"}
            className="pl-10 pr-10"
            value={formData.confirmPassword}
            onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
            required
            minLength={8}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
          >
            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>
      
      <div className="flex items-center space-x-2">
        <input type="checkbox" id="terms" className="rounded" required />
        <Label htmlFor="terms" className="text-sm">
          I agree to the{" "}
          <Link href="/terms" className="text-primary hover:underline">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="text-primary hover:underline">
            Privacy Policy
          </Link>
        </Label>
      </div>
      
      <Button type="submit" className="w-full" size="lg" disabled={otpSent || isSubmitting}>
        {isSubmitting ? (
          "Connecting..."
        ) : otpSent ? (
          <>
            <span className="mr-2">✓</span>
            Verification Email Sent
          </>
        ) : (
          'Create Account'
        )}
      </Button>

      {/* OTP Verification Modal */}
      {otpSent && (
        <OtpVerification
          isOpen={otpSent}
          onVerify={async (otp) => {
            try {
              const result = await verifyOtp(otp);
              return result || false;
            } catch (error) {
              console.error('OTP verification error:', error);
              return false;
            }
          }}
          onResend={resendOtp}
          isVerifying={isVerifying}
        />
      )}
    </form>
  );
}
