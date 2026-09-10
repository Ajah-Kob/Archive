import Link from 'next/link'
import TemplateDefault from '@/templates/Default'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { APP_NAME } from '@/config/constants'
import { roleHome } from '@/lib/helper'

export default async function Home() {
  const session = await getServerSession(authOptions)

  const role = (session?.user as { role?: string } | undefined)?.role
  const home = role ? roleHome(role) : '/guest'

  return (
    <TemplateDefault>
      <section className="min-h-[calc(100vh-128px)] flex items-center justify-center px-5 py-16 sm:py-24">
        <div className="w-full max-w-[640px] mx-auto flex flex-col items-center text-center gap-6">
          <div className="flex flex-col items-center gap-3">
            <h1 className="font-heading font-extrabold text-[42px] sm:text-[52px] leading-none tracking-[-0.03em] text-[#10133a]">
              {APP_NAME}
            </h1>
            <p className="font-sans font-medium text-[14px] sm:text-[15px] leading-[22px] text-[#5a6382] max-w-[520px]">
              From topic to archiving, in one place.
              <span className="hidden sm:inline"> The capstone workflow for BSIS — no more Drive links or Messenger threads.</span>
            </p>
          </div>

          {session ? (
            <div className="flex flex-col items-center gap-3 w-full">
              <p className="font-sans font-medium text-[13.5px] leading-[20px] text-[#8a93b4]">
                Hello <span className="font-semibold text-[#1e2145]">{session.user.name}</span> — you are logged in.
              </p>
              <Link
                href={home}
                className="inline-flex items-center justify-center h-[40px] px-6 rounded-[10px] bg-[#707dff] border border-[#707dff] font-sans font-bold text-[13px] leading-none text-white shadow-[0_4px_12px_rgba(112,125,255,0.32)] hover:bg-[#5a67ff] hover:border-[#5a67ff] active:scale-[0.98] transition-all"
              >
                Go to {home.replace('/', '') || 'home'}
              </Link>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full sm:w-auto">
              <Link
                href="/login"
                className="inline-flex items-center justify-center h-[40px] px-7 rounded-[10px] bg-[#707dff] border border-[#707dff] font-sans font-bold text-[13px] leading-none text-white shadow-[0_4px_12px_rgba(112,125,255,0.32)] hover:bg-[#5a67ff] hover:border-[#5a67ff] active:scale-[0.98] transition-all w-full sm:w-auto"
              >
                Login
              </Link>
              <Link
                href="/signup"
                className="inline-flex items-center justify-center h-[40px] px-7 rounded-[10px] bg-white border border-[#eceef8] font-sans font-bold text-[13px] leading-none text-[#1e2145] hover:bg-[#f8f9fe] hover:border-[#e0e3ff] active:scale-[0.98] transition-all w-full sm:w-auto"
              >
                Sign In
              </Link>
            </div>
          )}

          <div className="flex items-center justify-center gap-2 pt-2 opacity-60" aria-hidden="true">
            <span className="size-[7px] rounded-full bg-[#707dff]" />
            <span className="h-px w-[28px] bg-[#e0e3ff] rounded-full" />
            <span className="size-[7px] rounded-full bg-[#c4cadf]" />
            <span className="h-px w-[28px] bg-[#e0e3ff] rounded-full" />
            <span className="size-[7px] rounded-full bg-[#c4cadf]" />
            <span className="h-px w-[28px] bg-[#e0e3ff] rounded-full" />
            <span className="size-[7px] rounded-full bg-[#c4cadf]" />
          </div>
          <p className="font-sans font-medium text-[11px] leading-[16.5px] tracking-[0.4px] uppercase text-[#8a93b4] -mt-1">
            Topic → Chapters 1–5 → Defense → Archiving
          </p>
        </div>
      </section>
    </TemplateDefault>
  )
}
