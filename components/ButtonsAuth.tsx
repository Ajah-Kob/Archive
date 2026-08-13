'use client'

import { signIn, signOut } from 'next-auth/react'
import { LogOut } from 'lucide-react'

export function ButtonSignIn({
  className,
  label = 'Login',
}: {
  className?: string
  label?: string
}) {
  return (
    <button type="button" className={`button ${className}`} onClick={() => signIn()}>
      {label}
    </button>
  )
}

export function ButtonSignOut({ className }: { className?: string }) {
  return (
    <button
      onClick={() => {
        signOut()
      }}
      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-[8px] text-[13px] font-medium text-[#e85555] hover:bg-[rgba(254,111,111,0.07)] transition-colors ${className}`}
    >
      <LogOut className="size-4 shrink-0" />
      Logout
    </button>
  )
}
