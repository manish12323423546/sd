import { CheckoutRedirect } from "@/components/payments/checkout-redirect"
import { TooltipProvider } from "@/components/ui/tooltip"
import { TailwindIndicator } from "@/components/utility/tailwind-indicator"
import { ClerkProvider } from "@clerk/nextjs"
import type { Metadata } from "next"
import { ThemeProvider } from "next-themes"
import { Geist, Geist_Mono } from "next/font/google"
import { Toaster } from "sonner"
import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"]
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"]
})

export const metadata: Metadata = {
  title: {
    template: "%s | Think AI",
    default: "Think AI - AI-Powered Film Pre-Production Platform"
  },
  description: "Revolutionize your film pre-production workflow with AI-powered script analysis, intelligent scheduling, budget automation, and storyboard generation. Perfect for filmmakers, studios, and content creators.",
  keywords: ["film production", "AI", "script analysis", "storyboard generation", "film scheduling", "budget planning", "pre-production", "filmmaking tools"],
  authors: [{ name: "Think AI" }],
  creator: "Think AI",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://thinkai.com",
    siteName: "Think AI",
    title: "Think AI - AI-Powered Film Pre-Production Platform",
    description: "Revolutionize your film pre-production workflow with AI-powered automation tools designed for modern filmmakers and studios.",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Think AI - Film Pre-Production Platform"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "Think AI - AI-Powered Film Pre-Production Platform",
    description: "Revolutionize your film pre-production workflow with AI-powered automation tools.",
    images: ["/og-image.jpg"],
    creator: "@thinkai"
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1
    }
  }
}

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
          suppressHydrationWarning
        >
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
            <TooltipProvider>
              {children}
              <CheckoutRedirect />

              <TailwindIndicator />
              <Toaster />
            </TooltipProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}
