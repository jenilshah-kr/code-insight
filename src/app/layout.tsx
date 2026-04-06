import type { Metadata } from 'next'
import { Geist_Mono, Syne } from 'next/font/google'
import Script from 'next/script'
import './globals.css'
import { TopNav } from '@/common/components/layout/top-nav'
import { AppearanceProvider } from '@/common/components/appearance-provider'

const monoFont = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

const displayFont = Syne({
  variable: '--font-syne',
  subsets: ['latin'],
  weight: ['400', '600', '700', '800'],
})

export const metadata: Metadata = {
  title: 'Code Insight | Kroger Engineering',
  description: 'AI developer analytics dashboard for Kroger technology teams.',
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('theme')||'dark';document.documentElement.classList.add(t);})()`,
          }}
        />
      </head>
      <body suppressHydrationWarning className={`${monoFont.variable} ${displayFont.variable} antialiased`}>
        <AppearanceProvider>
          <div className="flex flex-col min-h-screen">
            <TopNav />
            <main className="flex-1 overflow-x-hidden bg-background">
              {children}
            </main>
          </div>
        </AppearanceProvider>
      </body>
    </html>
  )
}
