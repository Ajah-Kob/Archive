'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { toast } from 'sonner'
import { APP_BASE_URL } from '@/config/constants'

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

  const hasCode = !!section.joinCode

  return (
    <div className="bg-white border border-[#eceef8] rounded-[14px] shadow-[0_4px_24px_rgba(112,125,255,0.08),0px_1px_4px_rgba(0,0,0,0.04)] overflow-hidden">
      <div className="p-5 sm:p-6 flex flex-col gap-4">
        <h2 className="font-heading font-extrabold text-[20px] leading-[1.2] tracking-[-0.15px] text-[#1e3a8a] truncate">{section.name}</h2>

        <div className="h-px w-full bg-[#f0f2fa]" />

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={`inline-flex items-center h-[32px] px-3 rounded-[8px] border font-mono font-bold text-[13px] tracking-[0.6px] truncate max-w-[160px] sm:max-w-[180px] ${hasCode ? 'bg-[#f7f7ff] border-[#e8ebf8] text-[#1e3a8a]' : 'bg-[#fafbff] border-[#eceef8] text-[#9ea8c6]'}`}
              title={section.joinCode ?? 'No code'}
            >
              {section.joinCode ?? '—'}
            </span>
            <button
              type="button"
              onClick={handleCopyCode}
              disabled={!hasCode || copiedCode}
              aria-label={copiedCode ? 'Copied' : 'Copy code'}
              className={`inline-flex items-center justify-center size-[32px] rounded-[8px] border shrink-0 transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${copiedCode ? 'bg-[rgba(34,197,94,0.08)] border-[rgba(34,197,94,0.25)] text-[#22c55e]' : 'bg-white border-[#eceef8] text-[#707dff] hover:bg-[#f7f7ff]'}`}
            >
              {copiedCode ? <Check className="size-4" /> : <Copy className="size-4" />}
            </button>
          </div>

          <span className="hidden sm:block w-px h-[24px] bg-[#eceef8] shrink-0" aria-hidden />

          <div className="flex items-center gap-2">
            <span className="font-sans font-semibold text-[12.5px] leading-[18.75px] text-[#5a6382] whitespace-nowrap">Copy Invite Link</span>
            <button
              type="button"
              onClick={handleCopyLink}
              disabled={!hasCode || copiedLink}
              aria-label={copiedLink ? 'Copied' : 'Copy invite link'}
              className={`inline-flex items-center justify-center size-[32px] rounded-[8px] border shrink-0 transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${copiedLink ? 'bg-[rgba(34,197,94,0.08)] border-[rgba(34,197,94,0.25)] text-[#22c55e]' : 'bg-white border-[#eceef8] text-[#707dff] hover:bg-[#f7f7ff]'}`}
            >
              {copiedLink ? <Check className="size-4" /> : <Copy className="size-4" />}
            </button>
          </div>
        </div>

        {!hasCode && <p className="font-sans font-medium text-[12px] leading-[18px] text-[#9ea8c6]">No invite code yet.</p>}
      </div>
    </div>
  )
}
