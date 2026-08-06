'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useAuth } from "@/contexts/auth";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import dynamic from 'next/dynamic';
import { Search, Moon, Sun } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from './theme-toggle';

// Code-split the heavy interactive components so they only load when needed,
// keeping the initial bundle smaller.
const UserMenu = dynamic(() => import('./user-menu').then(m => m.UserMenu), { ssr: false });
const CartDialog = dynamic(() => import('./cart-dialog').then(m => m.CartDialog), { ssr: false });
const NotificationBell = dynamic(() => import('./notification-bell').then(m => m.NotificationBell), { ssr: false });

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/products', label: 'Products' },
  { href: '/about', label: 'About' },
];

export function AppHeader() {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [mobileSearch, setMobileSearch] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  useEffect(() => {
    if (pathname?.startsWith('/products')) {
      setQuery(searchParams?.get('search') || '');
    }
  }, [searchParams?.toString(), pathname]);

  const handleSearch = (e) => {
    e?.preventDefault?.();
    router.push(query.trim() ? '/products?search=' + query.trim() : '/products');
  };

  return (
    <header className="fixed top-0 z-50 w-full h-14 bg-card border-b border-border">
      <div className="w-full px-4 sm:px-5 h-full flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary shadow-md shadow-primary/25">
              <span className="text-primary-foreground font-bold text-xs">T</span>
            </div>
            <span className="font-semibold text-sm tracking-tight hidden sm:block">TechPharma</span>
          </Link>
          <nav className="hidden md:flex items-center gap-1 ml-4">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={'px-2.5 py-1 rounded-md text-[13px] font-medium transition-colors ' + (isActive ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50')}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex-1 max-w-xs hidden md:block">
          <form onSubmit={handleSearch} className="relative w-full">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products..."
              className="h-8 pl-9 pr-3 text-[13px] rounded-md bg-secondary/50 border-border text-foreground placeholder:text-muted-foreground focus:border-primary/50"
            />
          </form>
        </div>

        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          <button
            className="md:hidden flex items-center justify-center h-8 w-8 rounded-md hover:bg-secondary text-muted-foreground"
            onClick={() => setMobileSearch(!mobileSearch)}
          >
            <Search className="h-4 w-4" />
          </button>

          {user ? (
            <>
              <CartDialog />
              <NotificationBell />
              <UserMenu />
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground text-[13px]">
                <Link href="/auth?mode=login">Sign in</Link>
              </Button>
              <Button asChild size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground text-[13px] shadow-md shadow-primary/20">
                <Link href="/auth?mode=signup">Get started</Link>
              </Button>
            </>
          )}
        </div>
      </div>

      {mobileSearch && (
        <div className="md:hidden border-t border-border p-3 bg-card">
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products..."
              autoFocus
              className="h-10 pl-10 pr-4 rounded-md bg-secondary border-border text-foreground"
            />
          </form>
        </div>
      )}
    </header>
  );
}
