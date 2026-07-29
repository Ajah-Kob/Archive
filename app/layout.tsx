import type { Metadata } from 'next'
import { Plus_Jakarta_Sans, Sora } from 'next/font/google'
import HydrationZustand from '@/templates/hydrationZustand'
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
  title: 'NEXT.js CRUD template with Zustand and NextAuth',
  description:
    'A template for building a CRUD application using NEXT.js, Zustand for state management, and NextAuth for authentication.',
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
