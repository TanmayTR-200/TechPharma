'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useAuth } from "@/contexts/auth";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Building2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { UserMenu } from './user-menu';
import { CartDialog } from './cart-dialog';
import { NotificationBell } from './notification-bell';

export function AppHeader() {
  const { user, logout } = useAuth();
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<'product' | 'category' | 'supplier' | undefined>(undefined);
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const isEditing = useRef(false);

  // Sync header search input with the URL `search` param when on products page.
  // Do not override while the user is actively editing the input.
  useEffect(() => {
    try {
      if (isEditing.current) return;
      if (pathname && pathname.startsWith('/products')) {
        const s = searchParams?.get('search') || '';
        // If there's no scope param we treat it as "All" implicitly. Keep scope undefined in the header.
        const sc = (searchParams?.get('scope') as 'product' | 'category' | 'supplier') || undefined;
        setQuery(s);
        setScope(sc);
      }
    } catch (err) {
      // ignore when searchParams not available
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams?.toString(), pathname]);

  const handleLogout = () => {
    logout();
  };

  const handleSearch = (e?: React.SyntheticEvent) => {
    e?.preventDefault?.();
    const q = query.trim();
    // If query is empty, show product listing (no search)
    if (!q) {
      router.push('/products');
      return;
    }

    // Build params. If user selected Category scope, map the query to the `category` param
    // so the products page and sidebar filters behave as expected.
    const params = new URLSearchParams();
    if (scope === 'category') {
      // products page expects category in lower-case for its client-side filters
      params.set('category', q.toLowerCase());
    } else {
      params.set('search', q);
      if (scope) params.set('scope', scope);
    }
    router.push(`/products?${params.toString()}`);
  };

  return (
    <header className="fixed top-0 z-50 w-full h-14 bg-black">
      <div className="flex h-full items-center justify-between px-4">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center space-x-2 text-white">
            <Building2 className="h-6 w-6 text-white" />
            <span className="font-bold text-xl">TechPharma</span>
          </Link>
        </div>

  <div className="flex-1 max-w-4xl px-4">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <form className="w-full" onSubmit={handleSearch}>
              <Input
                type="search"
                value={query}
                onChange={(e) => setQuery((e.target as HTMLInputElement).value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    // form submit will handle it
                    return;
                  }
                }}
                onFocus={() => { isEditing.current = true; }}
                onBlur={() => {
                  // stop overriding after user finishes editing
                  // NOTE: do not navigate here — clicking the scope buttons causes the input to blur
                  // and we don't want that to trigger an unintended navigation when the search is empty.
                  isEditing.current = false;
                }}
                placeholder="Search for products, suppliers, or categories..."
                // increase right padding so the scope buttons + search button don't overlap the text
                className="w-full h-10 pl-10 pr-56 bg-zinc-800 border-zinc-700 text-white placeholder:text-gray-400 focus:ring-blue-600 focus:border-blue-600"
              />
              <div className="absolute right-0 top-0 h-full flex items-center">
                <div className="hidden sm:flex items-center gap-2 mr-2">
                  {/* Clear button moved here so it appears to the left of the scope filters */}
                  {query.trim() !== '' && (
                    <button
                      type="button"
                      onClick={() => {
                        setQuery('');
                        router.push('/products');
                      }}
                      aria-label="Clear search"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-white/6 hover:bg-white/10 text-white"
                    >
                      <span className="text-sm">×</span>
                    </button>
                  )}
                  {/* no explicit "All" button — absence of selection is treated as All */}
                  <button
                    type="button"
                    onClick={() => setScope(prev => prev === 'product' ? undefined : 'product')}
                    className={`px-3 py-1 rounded-md text-sm ${scope === 'product' ? 'bg-blue-600 text-white' : 'bg-transparent text-white/80 hover:bg-zinc-800'}`}
                  >
                    Product
                  </button>
                  <button
                    type="button"
                    onClick={() => setScope(prev => prev === 'category' ? undefined : 'category')}
                    className={`px-3 py-1 rounded-md text-sm ${scope === 'category' ? 'bg-blue-600 text-white' : 'bg-transparent text-white/80 hover:bg-zinc-800'}`}
                  >
                    Category
                  </button>
                  <button
                    type="button"
                    onClick={() => setScope(prev => prev === 'supplier' ? undefined : 'supplier')}
                    className={`px-3 py-1 rounded-md text-sm ${scope === 'supplier' ? 'bg-blue-600 text-white' : 'bg-transparent text-white/80 hover:bg-zinc-800'}`}
                  >
                    Supplier
                  </button>
                </div>
                {/* let the button participate in flex layout so it doesn't overlap the scope buttons */}
                <Button
                  type="button"
                  onClick={handleSearch}
                  className="h-full rounded-l-none bg-blue-600 hover:bg-blue-700 text-white px-4"
                  size="sm"
                >
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </Button>
              </div>

              {/* Clear button moved into the scope-group so it appears left of the filters */}
            </form>
          </div>
        </div>

        <nav className="flex items-center gap-4 text-white">
          {user ? (
            <>
              <CartDialog />
              <NotificationBell />
              <UserMenu />
            </>
          ) : (
            <>
              <Button asChild className="bg-white text-black hover:bg-zinc-100 border border-zinc-300">
                <Link href="/auth?mode=login">Sign In</Link>
              </Button>
              <Button asChild className="bg-white text-black hover:bg-zinc-100 border border-zinc-300">
                <Link href="/auth?mode=signup">Sign Up</Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
