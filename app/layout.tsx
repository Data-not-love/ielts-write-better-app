import type React from "react"
import type { Metadata } from "next"
import { Be_Vietnam_Pro, Source_Serif_4 } from "next/font/google"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { Toaster } from "@/components/ui/toaster"
import { Suspense } from "react"
import { AuthProvider } from "@/components/auth/auth-provider"
import { ThemeProvider } from "@/components/theme-provider"
import { FloatingChatWidget } from "@/components/chat/floating-chat-widget"
import { accentInitScript } from "@/lib/accent"
import "./globals.css"

const bodyFont = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
  display: "swap",
})

const displayFont = Source_Serif_4({
  subsets: ["latin", "vietnamese"],
  variable: "--font-display-serif",
  display: "swap",
})

export const metadata: Metadata = {
  title: "IELTS WriteBetter - AI-Powered Writing Improvement",
  description: "Level up your IELTS Writing with AI feedback aligned to TR/CC/LR/GRA criteria.",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: accentInitScript }} />
      </head>
      <body className={`font-sans ${bodyFont.variable} ${displayFont.variable} ${GeistMono.variable} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <AuthProvider>
            <Suspense fallback={null}>
              {children}
              <FloatingChatWidget />
              <Toaster />
              <Analytics />
            </Suspense>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
