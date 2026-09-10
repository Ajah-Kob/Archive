import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { roleHome } from '@/lib/helper'

export default async function Home() {
  const session = await getServerSession(authOptions)
  const role = (session?.user as { role?: string } | undefined)?.role
  const home = role ? roleHome(role) : '/guest'

  return (
    <section className="min-h-dvh w-full bg-tertiary relative overflow-hidden bg-linear-55 from-slate-900 via-violet-950 via-40% to-indigo-800 flex flex-col">
      <img
        className="absolute inset-0 w-full h-full object-cover opacity-100 pointer-events-none"
        src="/Glasseffect.png"
        alt=""
      />
      <div className="absolute -top-20 -right-20 size-96 opacity-20 bg-indigo-400 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-[493px] h-[475px] opacity-20 bg-radial from-red-400 to-pink-800 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-16 md:py-24 w-full">
        <div className="w-full max-w-[640px] flex flex-col gap-8 items-center text-center">
          <div className="inline-flex justify-center items-center gap-3">
            <div className="size-10 bg-white/20 rounded-2xl outline outline-1 outline-offset-[-1px] outline-white/20 flex justify-center items-center text-white text-base backdrop-blur-md">
              📖
            </div>
            <span className="text-white text-base font-bold leading-6 tracking-widest">ARCHIVE</span>
          </div>

          <div className="w-full flex flex-col gap-5 items-center">
            <div className="px-3 py-1.5 bg-white/10 rounded-full outline outline-1 outline-offset-[-1px] outline-white/20 inline-flex justify-center items-center gap-2">
              <span className="size-1.5 rounded-full bg-red-400" />
              <span className="text-white/75 text-xs font-normal leading-4 tracking-wide">Capstone Project Management</span>
            </div>

            <div className="flex flex-col gap-1">
              <h1 className="text-white text-4xl sm:text-5xl lg:text-[56px] font-extrabold tracking-tight leading-[1.1] text-center">
                Where Capstone
              </h1>
              <h1 className="bg-gradient-to-r from-red-400 to-pink-500 bg-clip-text text-transparent text-4xl sm:text-5xl lg:text-[56px] font-extrabold tracking-tight leading-[1.1] text-center pb-1">
                Work Comes Together.
              </h1>
            </div>

            <p className="max-w-[520px] text-white/60 text-sm font-normal leading-relaxed text-center">
              ARCHIVE unifies submission, review, and milestone tracking in one organized platform — from topic to archiving, in one place. For BSIS at Bulacan State University.
            </p>
          </div>

          {session ? (
            <div className="flex flex-col items-center gap-3 w-full">
              <p className="text-white/75 text-sm font-normal">
                Hello <span className="font-semibold text-white">{session.user.name}</span> — you are logged in.
              </p>
              <Link
                href={home}
                className="inline-flex items-center justify-center h-10 px-7 rounded-xl bg-white text-slate-900 text-sm font-bold shadow-[0_4px_20px_rgba(0,0,0,0.15)] hover:bg-white/90 active:scale-[0.98] transition-all"
              >
                Go to {home.replace('/', '') || 'home'}
              </Link>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full sm:w-auto pt-2">
              <Link
                href="/login"
                className="inline-flex items-center justify-center h-10 px-7 rounded-xl bg-white text-slate-900 text-sm font-bold shadow-[0_4px_20px_rgba(0,0,0,0.15)] hover:bg-white/90 active:scale-[0.98] transition-all w-full sm:w-auto"
              >
                Login
              </Link>
              <Link
                href="/signup"
                className="inline-flex items-center justify-center h-10 px-7 rounded-xl bg-white/10 text-white text-sm font-bold outline outline-1 outline-offset-[-1px] outline-white/20 backdrop-blur-md hover:bg-white/15 active:scale-[0.98] transition-all w-full sm:w-auto"
              >
                Sign In
              </Link>
            </div>
          )}

          <div className="flex items-center justify-center gap-2 pt-2 opacity-40" aria-hidden="true">
            <span className="size-1.5 rounded-full bg-white" />
            <span className="h-px w-7 bg-white/40 rounded-full" />
            <span className="size-1.5 rounded-full bg-white/60" />
            <span className="h-px w-7 bg-white/40 rounded-full" />
            <span className="size-1.5 rounded-full bg-white/60" />
            <span className="h-px w-7 bg-white/40 rounded-full" />
            <span className="size-1.5 rounded-full bg-white/60" />
          </div>
          <p className="text-white/40 text-[10px] font-medium tracking-[0.6px] uppercase -mt-1">Topic → Chapters 1–5 → Defense → Archiving</p>
        </div>
      </div>

      <div className="relative z-10 w-full flex flex-col items-center justify-center gap-2 py-6 border-t border-white/10">
        <div className="flex justify-center items-center gap-5 text-white/40 text-[10px] font-normal leading-4">
          <Link href="#" className="hover:text-white transition-colors">
            Help Center
          </Link>
          <Link href="#" className="hover:text-white transition-colors">
            Privacy Policy
          </Link>
          <Link href="#" className="hover:text-white transition-colors">
            Terms of Use
          </Link>
        </div>
        <p className="text-center text-white/40 text-[10px] font-normal leading-4 tracking-wide">© 2025 ARCHIVE · Capstone Project Management Platform</p>
      </div>
    </section>
  )
}
