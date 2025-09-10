import type React from "react"
import type { Metadata } from "next"
import { Space_Grotesk, DM_Sans } from "next/font/google"
import { ConditionalHeader } from "@/components/conditional-header"
import Script from 'next/script'
import "./globals.css"

import { ProvidersWrapper } from "@/components/providers-wrapper"

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-space-grotesk",
})

const dmSans = DM_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-dm-sans",
})

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
    <html lang="en" className={`${spaceGrotesk.variable} ${dmSans.variable} antialiased dark`}>
      <head>
        <meta
          httpEquiv="Content-Security-Policy"
          content={`
            default-src 'self' http://localhost:* https://*.cloudinary.com data: blob:;
            script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.cloudinary.com https://upload-widget.cloudinary.com;
            style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://upload-widget.cloudinary.com;
            font-src 'self' https://fonts.gstatic.com;
            img-src 'self' data: blob: https://*.cloudinary.com https://res.cloudinary.com;
            connect-src 'self' http://localhost:* https://*.cloudinary.com https://api.cloudinary.com;
            worker-src 'self' blob:;
          `.replace(/\s+/g, ' ').trim()}
        />
      </head>
      <body className="font-sans">
        <ProvidersWrapper>
          <div className="relative min-h-screen flex flex-col">
            <ConditionalHeader />
            {children}
          </div>
        </ProvidersWrapper>
      </body>
    </html>
  )
}
