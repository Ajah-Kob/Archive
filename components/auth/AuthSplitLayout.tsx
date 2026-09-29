import type { ReactNode } from 'react'
import Authentication from '@/templates/Authentication'
import { AuthCardFrame } from '@/components/auth/AuthCardFrame'

interface AuthSplitLayoutProps {
  children: ReactNode
  footer?: ReactNode
}

/**
 * Auth page shell: the centered, width-capped card on the shared backdrop.
 *
 * `forgot-password` and `reset-password` previously hand-rolled this same
 * structure. They use it now, so the card surface lives in exactly one place
 * (`AuthCardFrame`).
 */
export default function AuthSplitLayout({ children, footer }: AuthSplitLayoutProps) {
  return (
    <Authentication>
      <main className="w-full max-w-[420px] flex flex-col gap-5 items-center relative z-10">
        <AuthCardFrame>{children}</AuthCardFrame>
        {footer}
      </main>
    </Authentication>
  )
}
