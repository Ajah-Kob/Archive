import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { roleHome } from '@/lib/helper'

export default async function Home() {
  const session = await getServerSession(authOptions)
  const role = (session?.user as { role?: string } | undefined)?.role
  const home = role ? roleHome(role) : '/guest'

  return (
    <div className="min-h-dvh w-full bg-white flex flex-col">
      <header className="w-full flex items-center justify-between px-6 md:px-10 py-4 border-b border-[#f0f2fa]">
        <Link href="/" className="inline-flex items-center gap-2.5">
          <div className="size-8 rounded-lg bg-[#10133a] flex items-center justify-center text-white text-sm">📖</div>
          <span className="text-[#10133a] text-sm font-bold tracking-widest">ARCHIVE</span>
          <span className="hidden sm:inline text-[#10133a]/40 text-sm font-bold">·</span>
          <span className="hidden sm:inline text-[#5a6382] text-xs font-medium">BSIS · BulSU</span>
        </Link>
        <nav className="flex items-center gap-3">
          {session ? (
            <Link
              href={home}
              className="inline-flex items-center justify-center h-8 px-4 rounded-full bg-[#10133a] text-white text-xs font-bold hover:bg-[#1a1f4a] transition-colors"
            >
              Go to {home.replace('/', '') || 'home'}
            </Link>
          ) : (
            <>
              <Link href="/signup" className="hidden sm:inline-flex text-[#5a6382] text-xs font-semibold hover:text-[#10133a] transition-colors">
                Sign Up
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center h-8 px-4 rounded-full bg-[#10133a] text-white text-xs font-bold hover:bg-[#1a1f4a] transition-colors"
              >
                Login
              </Link>
            </>
          )}
        </nav>
      </header>

      <section className="flex-1 flex flex-col items-center px-6 py-16 md:py-20">
        <div className="w-full max-w-[720px] flex flex-col items-center text-center gap-6">
          <h1 className="font-heading font-extrabold tracking-tight leading-[0.95] text-[#10133a] text-[36px] sm:text-[44px] md:text-[48px]">
            Capstone submissions,
            <br />
            <span className="font-normal">without the chaos.</span>
          </h1>

          <p className="max-w-[560px] font-sans font-normal text-[14px] leading-[22px] text-[#5a6382]">
            ARCHIVE unifies topic, chapters, defense and archiving for BSIS at Bulacan State University — so you focus on the work, not the workflow.
          </p>

          <div className="w-full max-w-[520px] grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-left">
            <div className="flex gap-2.5 items-start bg-[#f8f9fe] border border-[#eceef8] rounded-xl px-3 py-3">
              <span className="size-6 rounded-full bg-[#10133a] text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">A</span>
              <p className="font-sans font-medium text-[12px] leading-[16px] text-[#1e2145]">Draft chapters with adviser feedback in one place</p>
            </div>
            <div className="flex gap-2.5 items-start bg-[#f8f9fe] border border-[#eceef8] rounded-xl px-3 py-3">
              <span className="size-6 rounded-full bg-[#10133a] text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">B</span>
              <p className="font-sans font-medium text-[12px] leading-[16px] text-[#1e2145]">Track milestones as coordinators unlock them</p>
            </div>
            <div className="flex gap-2.5 items-start bg-[#f8f9fe] border border-[#eceef8] rounded-xl px-3 py-3">
              <span className="size-6 rounded-full bg-[#10133a] text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">C</span>
              <p className="font-sans font-medium text-[12px] leading-[16px] text-[#1e2145]">Submit once, archiving handled for the repository</p>
            </div>
          </div>

          {session ? (
            <div className="flex flex-col items-center gap-3 pt-2">
              <p className="font-sans text-[13px] text-[#5a6382]">
                Hello <span className="font-semibold text-[#1e2145]">{session.user.name}</span> — you are logged in.
              </p>
              <Link
                href={home}
                className="inline-flex items-center justify-center h-10 px-7 rounded-full bg-[#10133a] text-white text-sm font-bold hover:bg-[#1a1f4a] active:scale-[0.98] transition-all"
              >
                Go to {home.replace('/', '') || 'home'}
              </Link>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2 w-full sm:w-auto">
              <Link
                href="/login"
                className="inline-flex items-center justify-center h-10 px-7 rounded-full bg-[#10133a] text-white text-sm font-bold hover:bg-[#1a1f4a] active:scale-[0.98] transition-all w-full sm:w-auto"
              >
                Get Started
              </Link>
              <Link
                href="/signup"
                className="inline-flex items-center justify-center h-10 px-7 rounded-full bg-white border border-[#eceef8] text-[#1e2145] text-sm font-bold hover:bg-[#f8f9fe] active:scale-[0.98] transition-all w-full sm:w-auto"
              >
                Sign In
              </Link>
            </div>
          )}

          <div className="w-full max-w-[440px] mt-4 bg-white border border-[#eceef8] rounded-2xl shadow-[0_8px_30px_rgba(16,19,58,0.08)] overflow-hidden text-left">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#f0f2fa]">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-wide text-[#707dff] bg-[#f7f7ff] border border-[#e0e3ff] rounded-full px-2.5 py-1">
                <span className="size-1.5 rounded-full bg-[#22c55e]" /> Approved
              </span>
              <span className="text-[11px] font-semibold text-[#8a93b4]">96%</span>
            </div>
            <div className="px-4 py-3 flex flex-col gap-2">
              <p className="font-sans font-bold text-[13px] leading-[18px] text-[#10133a]">Chapter 1 — In Review</p>
              <p className="font-sans font-normal text-[12px] leading-[18px] text-[#5a6382]">Adviser feedback stays in the document. Version 2 awaiting review.</p>
              <div className="h-1.5 w-full bg-[#f0f2fa] rounded-full overflow-hidden">
                <div className="h-full w-[68%] bg-[#10133a] rounded-full" />
              </div>
            </div>
          </div>

          <p className="font-sans font-normal text-[11px] leading-[16.5px] text-[#8a93b4]">BSIS-only · Invitation code required to join</p>
        </div>
      </section>

      <footer className="w-full border-t border-[#f0f2fa] flex flex-col sm:flex-row items-center justify-between gap-3 px-6 md:px-10 py-4">
        <div className="flex items-center gap-2 text-[#8a93b4] text-[11px]">
          <span>© 2025 ARCHIVE</span>
          <span className="opacity-40">·</span>
          <span>BSIS · Bulacan State University</span>
        </div>
        <div className="flex items-center gap-5 text-[#8a93b4] text-[11px] font-medium">
          <Link href="#" className="hover:text-[#1e2145] transition-colors">
            Privacy Policy
          </Link>
          <Link href="#" className="hover:text-[#1e2145] transition-colors">
            Terms of Service
          </Link>
          <a href="mailto:hello@archive.bulsu.edu.ph" className="hover:text-[#1e2145] transition-colors">
            hello@archive.bulsu.edu.ph
          </a>
        </div>
      </footer>
    </div>
  )
}
