'use client';

import { usePathname } from 'next/navigation';
import { AppHeader } from './app-header';

export function ConditionalHeader() {
  const pathname = usePathname();
  
  if (pathname.startsWith('/auth')) {
    return null;
  }

  return <AppHeader />;
}
