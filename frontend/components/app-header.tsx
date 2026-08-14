'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useAuth } from "@/contexts/auth";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import dynamic from 'next/dynamic';
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from './theme-toggle';

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
    <header className="fixed top-0 z-50 w-full h-14 bg-background border-b border-border">
      <div className="w-full px-6 sm:px-8 h-full flex items-center justify-between gap-6">
        <div className="flex items-center gap-8">
          <Link href="/" className="font-display text-sm font-bold tracking-[0.2em] uppercase text-foreground">
            TechPharma
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={'text-[11px] uppercase tracking-[0.15em] transition-colors ' + (isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground')}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex-1 max-w-xs hidden md:block">
          <form onSubmit={handleSearch} className="relative w-full">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search..."
              className="h-8 pl-8 pr-3 text-xs rounded-none bg-transparent border-border text-foreground placeholder:text-muted-foreground focus:border-foreground"
            />
          </form>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <button
            className="md:hidden flex items-center justify-center h-8 w-8 hover:bg-secondary text-muted-foreground"
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
              <Button asChild variant="ghost" size="sm" className="text-[11px] uppercase tracking-wider text-muted-foreground hover:bg-secondary hover:text-foreground">
                <Link href="/auth?mode=login">Sign in</Link>
              </Button>
              <Button asChild size="sm" variant="outline" className="text-[11px] uppercase tracking-wider border-foreground text-foreground hover:bg-foreground hover:text-background rounded-none">
                <Link href="/auth?mode=signup">Get started</Link>
              </Button>
            </>
          )}
        </div>
      </div>

      {mobileSearch && (
        <div className="md:hidden border-t border-border p-3 bg-background">
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search..."
              autoFocus
              className="h-10 pl-10 pr-4 rounded-none bg-transparent border-border text-foreground"
            />
          </form>
        </div>
      )}
    </header>
  );
}
