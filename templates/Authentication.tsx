import type { ReactNode } from 'react'

// Default backdrop for the auth routes (/login, /signup, /forgot-password,
// /reset-password): full-viewport wash with a dot grid and two soft color
// blobs. Children render centered above it — give them `relative z-10`.
export default function Authentication({
  children,
}: {
  children: ReactNode
}) {
  return (
    <section className="min-h-dvh w-full overflow-x-hidden bg-[#F8F7FF] flex items-center justify-center relative p-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle,#c9cfe9_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,black,transparent)] pointer-events-none z-0" />
      <div className="size-72 absolute -left-16 top-16 opacity-30 bg-purple-400 rounded-full blur-[80px] pointer-events-none z-0" />
      <div className="size-64 absolute -right-16 bottom-16 opacity-25 bg-rose-400 rounded-full blur-[80px] pointer-events-none z-0" />
      {children}
    </section>
  )
}
