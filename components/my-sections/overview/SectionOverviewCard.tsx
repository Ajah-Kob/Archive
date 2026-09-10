'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, Copy, Link2 } from 'lucide-react'
import { toast } from 'sonner'
import { APP_BASE_URL } from '@/config/constants'
import { headerStyleFor } from '@/lib/sectionHeader'

// Reuses getCoordinatorSectionById data shape — `section` object only.
// Accepts the coordinator section payload without extra queries.
interface SectionOverviewCardProps {
  section: {
    id: number
    name: string
    hasJoinCode: boolean
    joinCode: string | null
    dateCreated: string
    studentsCount: number
    groupsCount: number
    headerColor?: string | null
  }
}

export function SectionOverviewCard({ section }: SectionOverviewCardProps) {
  const [copiedCode, setCopiedCode] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const timerCode = useRef<ReturnType<typeof setTimeout> | null>(null)
  const timerLink = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (timerCode.current) clearTimeout(timerCode.current)
      if (timerLink.current) clearTimeout(timerLink.current)
    }
  }, [])

  async function handleCopyCode() {
    if (!section.joinCode || copiedCode) return
    try {
      await navigator.clipboard.writeText(section.joinCode)
    } catch {
      toast.error('Could not copy invite code.')
      return
    }
    setCopiedCode(true)
    toast.success('Invite code copied')
    if (timerCode.current) clearTimeout(timerCode.current)
    timerCode.current = setTimeout(() => setCopiedCode(false), 1500)
  }

  async function handleCopyLink() {
    if (!section.joinCode || copiedLink) return
    // TODO(invite-link): final invite flow / link shape is TBD — currently
    // copies `${APP_BASE_URL}/guest/join-archive?code=${joinCode}` as a
    // functional placeholder. Also supports `/join?code=` alias if routing
    // changes — keep this functional until the invite route is finalized.
    const inviteLink = `${APP_BASE_URL}/guest/join-archive?code=${section.joinCode}`
    try {
      await navigator.clipboard.writeText(inviteLink)
    } catch {
      toast.error('Could not copy invite link.')
      return
    }
    setCopiedLink(true)
    toast.success('Invite link copied')
    if (timerLink.current) clearTimeout(timerLink.current)
    timerLink.current = setTimeout(() => setCopiedLink(false), 1500)
  }

  const header = headerStyleFor(section.headerColor ?? null)
  const hasAccent = !!section.headerColor
  const hasCode = !!section.joinCode

  return (
    <div className="bg-white border border-[#eceef8] rounded-[14px] shadow-[0_4px_24px_rgba(112,125,255,0.08),0px_1px_4px_rgba(0,0,0,0.04)] overflow-hidden">
      {/* headerColor accent strip — mirrors SectionCard palette when present */}
      {hasAccent && (
        <div
          className="h-1 w-full shrink-0"
          style={{ backgroundColor: header.dot }}
          aria-hidden
        />
      )}

      <div className="p-5 sm:p-6 flex flex-col gap-4">
        {/* Top: name + meta */}
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            {hasAccent && (
              <span
                className="size-2 rounded-full shrink-0 hidden sm:inline-block"
                style={{ backgroundColor: header.dot }}
                aria-hidden
              />
            )}
            <h2 className="font-heading font-extrabold text-[20px] leading-[1.2] tracking-[-0.15px] text-[#1e3a8a] truncate">
              {section.name}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-sans font-semibold text-[12.5px] leading-[18.75px] text-[#5a6382]">
              {section.studentsCount} {section.studentsCount === 1 ? 'Student' : 'Students'} ·{' '}
              {section.groupsCount} {section.groupsCount === 1 ? 'Group' : 'Groups'}
            </span>
            <span className="hidden sm:inline-block size-1 rounded-full bg-[#e0e3f0] shrink-0" aria-hidden />
            <span className="font-sans font-medium text-[12px] leading-[18px] text-[#8a93b4]">
              Created {section.dateCreated}
            </span>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px w-full bg-[#f0f2fa]" />

        {/* Bottom: join code (mono) + copy actions — responsive stack */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-sans font-bold text-[11px] leading-[16.5px] uppercase tracking-[0.6px] text-[#9ea8c6] shrink-0">
              Join code
            </span>
            <span
              className={`inline-flex items-center h-[30px] px-3 rounded-[8px] border font-mono font-bold text-[13px] tracking-[0.6px] truncate max-w-[160px] sm:max-w-[200px] ${
                hasCode
                  ? 'bg-[#f7f7ff] border-[#e8ebf8] text-[#1e3a8a]'
                  : 'bg-[#fafbff] border-[#eceef8] text-[#9ea8c6]'
              }`}
              title={section.joinCode ?? 'No code generated'}
            >
              {section.joinCode ?? '—'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCopyCode}
              disabled={!hasCode || copiedCode}
              aria-label={copiedCode ? 'Invite code copied' : 'Copy invite code'}
              className={`inline-flex items-center justify-center gap-[7px] h-[32px] px-[12px] rounded-[9px] font-sans font-bold text-[12.5px] leading-none transition-colors disabled:opacity-60 disabled:cursor-not-allowed shrink-0 ${
                copiedCode
                  ? 'bg-[rgba(34,197,94,0.08)] border border-[rgba(34,197,94,0.25)] text-[#22c55e]'
                  : 'bg-white border border-[rgba(112,125,255,0.19)] text-[#707dff] hover:bg-[#f7f7ff] active:bg-[#eef0ff]'
              }`}
            >
              {copiedCode ? <Check className="size-3.5 shrink-0" /> : <Copy className="size-3.5 shrink-0" />}
              {copiedCode ? 'Copied' : 'Copy code'}
            </button>

            <button
              type="button"
              onClick={handleCopyLink}
              disabled={!hasCode || copiedLink}
              aria-label={copiedLink ? 'Invite link copied' : 'Copy invite link'}
              className={`inline-flex items-center justify-center gap-[7px] h-[32px] px-[12px] rounded-[9px] font-sans font-bold text-[12.5px] leading-none transition-colors disabled:opacity-60 disabled:cursor-not-allowed shrink-0 ${
                copiedLink
                  ? 'bg-[rgba(34,197,94,0.08)] border border-[rgba(34,197,94,0.25)] text-[#22c55e]'
                  : 'bg-[#707dff] border border-[#707dff] text-white hover:bg-[#606dee] hover:border-[#606dee] active:bg-[#5562e8] shadow-[0_1px_2px_rgba(112,125,255,0.18)]'
              }`}
            >
              {copiedLink ? <Check className="size-3.5 shrink-0" /> : <Link2 className="size-3.5 shrink-0" />}
              {copiedLink ? 'Copied' : 'Copy invite link'}
            </button>
          </div>
        </div>

        {!hasCode && (
          <p className="font-sans font-medium text-[12px] leading-[18px] text-[#9ea8c6]">
            No invite code yet — generate one from the section actions.
          </p>
        )}
      </div>
    </div>
  )
}
