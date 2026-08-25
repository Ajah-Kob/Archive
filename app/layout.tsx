import type { Metadata } from 'next'
import { Suspense } from 'react'
import { Plus_Jakarta_Sans, Sora } from 'next/font/google'
import HydrationZustand from '@/templates/hydrationZustand'
import { RouteTracker } from '@/components/globals/RouteTracker'
import { Providers } from './providers'
import { Toaster } from 'sonner'
import './globals.css'

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: '--font-plus-jakarta-sans',
  subsets: ['latin'],
})

const sora = Sora({
  variable: '--font-sora',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Archive',
  description:
    'A capstone management system that unifies submission, review, and milestone tracking for the BSIS program.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${plusJakartaSans.variable} ${sora.variable} antialiased`}
      >
        <Providers>
          <HydrationZustand>{children}</HydrationZustand>
          {/* Suspense: usePathname() must not block static prerendering. */}
          <Suspense fallback={null}>
            <RouteTracker />
          </Suspense>
          <Toaster
            richColors
            position="top-center"
            toastOptions={{ style: { fontSize: '16px' } }}
          />
        </Providers>
      </body>
    </html>
  )
}
