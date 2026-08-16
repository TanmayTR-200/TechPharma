import type { Metadata } from 'next'
import { Inter, Playfair_Display } from 'next/font/google'
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
  variable: '--font-sans',
})

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  preload: true,
  variable: '--font-display',
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
    <html lang="en" className={`${inter.variable} ${playfair.variable}`} suppressHydrationWarning>
      <head>
        <meta
          httpEquiv="Content-Security-Policy"
          content={`default-src 'self' http://localhost:* https://*.cloudinary.com https://techpharma-5ml5.onrender.com https://images.unsplash.com https://images.pexels.com data: blob:;
            script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.cloudinary.com https://upload-widget.cloudinary.com;
            style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://upload-widget.cloudinary.com;
            font-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com data:;
            img-src 'self' data: blob: https://*.cloudinary.com https://res.cloudinary.com https://images.unsplash.com https://images.pexels.com;
            connect-src 'self' http://localhost:* https://*.cloudinary.com https://api.cloudinary.com https://fonts.googleapis.com https://fonts.gstatic.com https://techpharma-5ml5.onrender.com;
            worker-src 'self' blob:;`.replace(/\s+/g, ' ').trim()}
        />
      </head>
      <body className="font-sans">
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