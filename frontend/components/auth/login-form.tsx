'use client';

import { useState, FormEvent } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Mail, Lock, Loader2 } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/auth";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function LoginForm() {
  const { toast } = useToast();
  const { login, setUser } = useAuth();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    remember: false
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // Basic validation
      if (!formData.email.trim()) {
        throw new Error('Please enter your email');
      }
      if (!formData.password.trim()) {
        throw new Error('Please enter your password');
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        throw new Error('Please enter a valid email address');
      }

      // Try to login
      try {
        await login(formData.email, formData.password);
      } catch (loginError: any) {
        if (loginError.message.includes('Invalid credentials')) {
          throw new Error('Invalid email or password');
        }
        throw loginError;
      }
      
      // Show success message
      toast({
        title: "Login Successful",
        description: "Welcome back! Redirecting to your dashboard...",
      });
      
    } catch (error: any) {
      // Log structured error information
      const errorLog = {
        timestamp: new Date().toISOString(),
        source: 'login-form',
        error: {
          message: error.message,
          type: error.constructor.name,
          ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
        },
        context: {
          email: formData.email // never log passwords
        }
      };
      console.error('Login error:', JSON.stringify(errorLog, null, 2));
      
      // Show appropriate error message based on error type
      if (error.message.includes('Cannot connect to the server')) {
        toast({
          title: "Connection Error",
          description: "Unable to connect to the server. Please try again later.",
          variant: "destructive",
          duration: 5000
        });
      } else if (error.message.includes('Network') || error.message.includes('Failed to fetch')) {
        toast({
          title: "Network Error",
          description: "Please check your internet connection and try again.",
          variant: "destructive",
          duration: 5000
        });
      } else if (error.message.includes('password') || error.message.includes('Invalid')) {
        toast({
          title: "Login Failed",
          description: "Invalid email or password. Please try again.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Error",
          description: error.message || "An unexpected error occurred. Please try again.",
          variant: "destructive",
          duration: 5000
        });
      }
      
      // Clear password field on error
      setFormData(prev => ({ ...prev, password: '' }));
    } finally {
      setIsLoading(false);
    }
  };



  return (
    <form onSubmit={handleSubmit} className="space-y-4">


      <div className="space-y-2">
        <Label htmlFor="login-email">Email or Phone</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            id="login-email"
            placeholder="Enter your email or phone number"
            type="text"
            className="pl-10"
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            required
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="login-password">Password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            id="login-password"
            placeholder="Enter your password"
            type={showPassword ? "text" : "password"}
            className="pl-10 pr-10"
            value={formData.password}
            onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <input type="checkbox" id="remember" className="rounded" />
          <Label htmlFor="remember" className="text-sm">
            Remember me
          </Label>
        </div>
        <Link href="/auth/forgot-password" className="text-sm text-primary hover:underline">
          Forgot password?
        </Link>
      </div>
      
      <Button 
        className="w-full" 
        size="lg" 
        type="submit"
        disabled={isLoading}
      >
        {isLoading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          "Sign in with Email"
        )}
      </Button>
    </form>
  );
}
