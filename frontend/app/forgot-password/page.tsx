"use client"

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ForgotPassword() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace('/auth/forgot-password');
  }, [router]);

  // Return null since we're redirecting
  return null;
}