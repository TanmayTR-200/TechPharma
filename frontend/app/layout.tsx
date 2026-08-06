import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ProvidersWrapper } from '@/components/providers-wrapper'
import { ConditionalHeader } from '@/components/conditional-header'
import { ServerStatus } from '@/components/server-status'
import { Suspense } from 'react'

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  adjustFontFallback: true,
  preload: true,
})

export const metadata: Metadata = {
  title: 'TechPharma - B2B Marketplace',
  description: 'Buy and sell industrial products directly from verified suppliers. Track orders, manage inventory, and grow your business.',
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.className} suppressHydrationWarning>
      <head>
        <meta
          httpEquiv="Content-Security-Policy"
          content={`default-src 'self' http://localhost:* https://*.cloudinary.com data: blob:;
            script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.cloudinary.com https://upload-widget.cloudinary.com;
            style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://upload-widget.cloudinary.com;
            font-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com data:;
            img-src 'self' data: blob: https://*.cloudinary.com https://res.cloudinary.com;
            connect-src 'self' http://localhost:* https://*.cloudinary.com https://api.cloudinary.com https://fonts.googleapis.com https://fonts.gstatic.com https://techpharma-backend.onrender.com;
            worker-src 'self' blob:;`.replace(/\s+/g, ' ').trim()}
        />
      </head>
      <body className={inter.className}>
        <ProvidersWrapper>
          <div className="relative min-h-screen flex flex-col app-bg">
            <Suspense>
              <ConditionalHeader />
              {children}
              <ServerStatus />
            </Suspense>
          </div>
        </ProvidersWrapper>
      </body>
    </html>
  )
}
