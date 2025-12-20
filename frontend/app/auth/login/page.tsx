'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';

export default function LoginPage() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-6 shadow-lg">
        <h1 className="text-center text-2xl font-bold">Login</h1>
        {/* Add your login form here */}
        <div className="space-y-4">
          <p className="text-center">Your login content will go here</p>
        </div>
      </div>
    </div>
  );
}
