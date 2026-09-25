import Link from 'next/link'
import { Metadata } from 'next'
import { AlertTriangle } from 'lucide-react'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/authOptions'
import prisma from '@/lib/prisma'
import { roleHome } from '@/lib/helper'
import { joinSectionWithCode } from '@/lib/actions/sections'
import { joinFacultyWithCode } from '@/lib/actions/faculty'
import { JoinRedirect } from '@/components/join-archive/JoinRedirect'

export const metadata: Metadata = {
  title: 'Join Archive',
  description: 'Join Archive with an invitation link',
}

function ExpiredInvite({ message }: { message?: string }) {
  return (
    <div className="bg-[#f4f6ff] min-h-dvh flex flex-col items-center justify-center px-5 py-16">
      <div className="w-full max-w-[420px] bg-white border border-[#eceef8] rounded-[14px] shadow-[0_4px_24px_rgba(112,125,255,0.08),0_1px_4px_rgba(0,0,0,0.04)] p-8 flex flex-col items-center text-center gap-3">
        <div className="size-12 rounded-full bg-red-50 flex items-center justify-center">
          <AlertTriangle className="size-5 text-[#ef4444]" strokeWidth={2} />
        </div>
        <h1 className="font-heading font-bold text-[18px] leading-[27px] text-[#12143a] tracking-[-0.18px]">
          This link is expired
        </h1>
        <p className="font-sans font-medium text-[13px] leading-[21px] text-[#8a93b4]">
          {message ?? 'Please contact your coordinator to send a new link.'}
        </p>
        <Link
          href="/"
          className="mt-2 inline-flex items-center justify-center h-10 px-6 rounded-[10px] bg-[#707dff] font-sans font-bold text-[13px] text-white hover:bg-[#5a67ff] transition-colors"
        >
          Back to home
        </Link>
      </div>
    </div>
  )
}

export default async function JoinPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code: rawCode } = await params
  const code = rawCode?.trim() ?? ''
  if (!code) return <ExpiredInvite />

  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect(`/login?next=/join/${encodeURIComponent(code)}`)

  const role = (session.user as { role?: string } | undefined)?.role
  if (role && role !== 'GUEST') redirect(roleHome(role))

  const record = await prisma.joinCode.findFirst({
    where: { code, deletedAt: null, expiresAt: { gt: new Date() } },
    include: { section: true },
  })
  if (!record || (record.type === 'STUDENT' && !record.section)) {
    return <ExpiredInvite />
  }

  const userId = +session.user.id
  const result =
    record.type === 'STUDENT'
      ? await joinSectionWithCode(code)
      : await joinFacultyWithCode(userId, code)
  if (!result.success) return <ExpiredInvite message={result.message} />

  // Client-settled redirect: the JWT cookie still carries the old GUEST role
  // until the session refreshes, so JoinRedirect awaits update() first —
  // otherwise proxy.ts bounces the user back to /guest.
  return (
    <JoinRedirect
      to={
        record.type === 'STUDENT'
          ? '/student/milestone?joined=1'
          : '/faculty?joined=1'
      }
    />
  )
}
