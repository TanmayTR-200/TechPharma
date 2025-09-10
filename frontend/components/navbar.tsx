"use client"

import { useState } from 'react'
import { Search, Menu } from "lucide-react"
import { useAuth } from "@/contexts/auth-new"
import { useProduct } from "@/contexts/product-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

export function Navbar() {
  const { user, login, logout } = useAuth();
  const { searchProducts } = useProduct();
  const [searchQuery, setSearchQuery] = useState("");
  return (
    <nav className="border-b bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <h1 className="text-2xl font-serif font-bold text-primary">TechPharma</h1>
            </div>
          </div>

          {/* Search Bar */}
          <div className="hidden md:flex flex-1 max-w-2xl mx-8">
            <div className="relative w-full">
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for products, suppliers, or categories..."
                className="w-full pl-4 pr-12 py-2 border-2 border-border focus:border-accent"
              />
              <Button 
                size="sm" 
                className="absolute right-1 top-1 bottom-1 px-3 bg-accent hover:bg-accent/90"
                onClick={() => searchProducts(searchQuery)}
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Navigation Links & Auth */}
          <div className="hidden md:flex items-center space-x-4">
            {!user && (
              <Button 
                variant="ghost" 
                className="text-foreground hover:text-accent"
                onClick={() => window.location.href = '/auth?mode=signup&type=supplier'}
              >
                Become a Supplier
              </Button>
            )}
            {user ? (
              <div className="flex items-center space-x-4">
                {user.role === 'supplier' ? (
                  <Button
                    variant="ghost"
                    className="text-foreground hover:text-accent"
                    onClick={() => window.location.href = '/dashboard'}
                  >
                    Supplier Dashboard
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    className="text-foreground hover:text-accent"
                    onClick={() => window.location.href = '/orders'}
                  >
                    My Orders
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="border-accent text-accent hover:bg-accent hover:text-accent-foreground bg-transparent"
                  onClick={logout}
                >
                  Logout
                </Button>
              </div>
            ) : (
              <>
                <Button
                  variant="outline"
                  className="border-accent text-accent hover:bg-accent hover:text-accent-foreground bg-transparent"
                  onClick={() => window.location.href = '/auth?mode=login'}
                >
                  Login
                </Button>
                <Button 
                  className="bg-accent hover:bg-accent/90 text-accent-foreground"
                  onClick={() => window.location.href = '/auth?mode=signup'}
                >
                  Sign Up
                </Button>
              </>
            )}
          </div>

          {/* Mobile menu */}
          <div className="md:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Menu className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {user ? (
                  <>
                    {user.role === 'supplier' ? (
                      <DropdownMenuItem onClick={() => window.location.href = '/dashboard'}>
                        Supplier Dashboard
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem onClick={() => window.location.href = '/orders'}>
                        My Orders
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={logout}>
                      Logout
                    </DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <DropdownMenuItem onClick={() => window.location.href = '/auth?mode=signup&type=supplier'}>
                      Become a Supplier
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => window.location.href = '/auth?mode=login'}>
                      Login
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => window.location.href = '/auth?mode=signup'}>
                      Sign Up
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Mobile Search */}
        <div className="md:hidden pb-4">
          <div className="relative">
            <Input
              type="text"
              placeholder="Search products..."
              className="w-full pl-4 pr-12 py-2 border-2 border-border focus:border-accent"
            />
            <Button size="sm" className="absolute right-1 top-1 bottom-1 px-3 bg-accent hover:bg-accent/90">
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </nav>
  )
}
