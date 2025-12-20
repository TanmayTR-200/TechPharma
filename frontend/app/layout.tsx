import type React from "react"
import type { Metadata } from "next"
import { ConditionalHeader } from "@/components/conditional-header"
import { DM_Sans } from 'next/font/google'
import "./globals.css"

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  adjustFontFallback: true,
  preload: true,
})
import { Suspense } from "react"
import { ProvidersWrapper } from "@/components/providers-wrapper"
import { ServerStatus } from "@/components/server-status"

export const metadata: Metadata = {
  title: "TechPharma - B2B Marketplace for Trusted Suppliers",
  description: "Find quality products and trusted suppliers for your business needs",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`antialiased dark ${dmSans.className}`} suppressHydrationWarning>
      <head>
        <meta
          httpEquiv="Content-Security-Policy"
          content={`
            default-src 'self' http://localhost:* https://*.cloudinary.com data: blob:;
            script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.cloudinary.com https://upload-widget.cloudinary.com;
            style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://upload-widget.cloudinary.com;
            font-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com data:;
            img-src 'self' data: blob: https://*.cloudinary.com https://res.cloudinary.com;
            connect-src 'self' http://localhost:* https://*.cloudinary.com https://api.cloudinary.com https://fonts.googleapis.com https://fonts.gstatic.com;
            worker-src 'self' blob:;
          `.replace(/\s+/g, ' ').trim()}
        />
      </head>
      <body className={dmSans.className}>
        <ProvidersWrapper>
          <div className="relative min-h-screen flex flex-col">
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
