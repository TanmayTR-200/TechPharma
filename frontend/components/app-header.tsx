'use client';

import { useAuth } from "@/contexts/auth-new";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Building2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { UserMenu } from "@/components/user-menu";

export function AppHeader() {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-black">
      <div className="container flex h-14 items-center">
        <div className="flex items-center gap-8 pl-4">
          <Link href="/" className="flex items-center space-x-2">
            <Building2 className="h-6 w-6 text-white" />
            <span className="font-bold text-xl text-white">TechPharma</span>
          </Link>
        </div>

        <div className="flex-1 px-8">
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              type="search"
              placeholder="Search for products, suppliers, or categories..."
              className="pl-10 pr-24 w-full h-10"
            />
            <Button 
              className="absolute right-0 top-0 h-full rounded-l-none bg-blue-600 hover:bg-blue-700"
              size="sm"
            >
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </div>
        </div>

        <nav className="flex items-center space-x-6">
          {user ? (
            <>
              <Link 
                href="/products" 
                className={`text-sm font-medium px-3 py-2 rounded-md ${
                  window.location.pathname === '/products' 
                    ? 'bg-black text-white' 
                    : 'hover:bg-gray-100'
                }`}
              >
                Marketplace
              </Link>
              {user.role === 'supplier' && (
                <Link 
                  href="/dashboard" 
                  className={`text-sm font-medium px-3 py-2 rounded-md ${
                    window.location.pathname === '/dashboard' 
                      ? 'bg-black text-white' 
                      : 'hover:bg-gray-100'
                  }`}
                >
                  Dashboard
                </Link>
              )}
              {user.role === 'buyer' && (
                <Link 
                  href="/orders" 
                  className={`text-sm font-medium px-3 py-2 rounded-md ${
                    window.location.pathname === '/orders' 
                      ? 'bg-black text-white' 
                      : 'hover:bg-gray-100'
                  }`}
                >
                  My Orders
                </Link>
              )}
              <UserMenu />
            </>
          ) : (
            <Button asChild>
              <Link href="/auth">Sign In</Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
