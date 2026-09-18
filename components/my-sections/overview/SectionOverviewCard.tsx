'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, Copy } from 'lucide-react'
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
    // One-click invite link — /join/[code] auto-joins on open (with
    // login-then-resume for guests). /guest itself stays for manual entry.
    const inviteLink = `${APP_BASE_URL}/join/${section.joinCode}`
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
  const header = headerStyleFor(section.headerColor ?? null)

  return (
    <div className="bg-white border border-[#eceef8] rounded-[14px] shadow-[0_4px_24px_rgba(112,125,255,0.08),0px_1px_4px_rgba(0,0,0,0.04)] overflow-hidden h-fit">
      {/* Upper part — same colored header as the /my-sections SectionCard */}
      <div
        className="border-[#e4e7f8] border-b border-solid flex flex-col items-start pb-[15px] pt-[20px] px-[20px] relative shrink-0 w-full"
        style={{ backgroundColor: (header as any).bg }}
      >
        <div className="flex items-center gap-3 relative shrink-0 w-full">
          <p
            className="font-['Sora',sans-serif] font-extrabold leading-[normal] text-[20px] tracking-[-0.15px] whitespace-nowrap min-w-0 truncate"
            style={{ color: (header as any).text }}
          >
            {section.name}
          </p>
        </div>
      </div>

      {/* Bottom part — copy code + copy invite link */}
      <div className="px-[20px] py-[15px]">
        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 p-0">
          <button
            type="button"
            onClick={handleCopyCode}
            disabled={!hasCode || copiedCode}
            aria-label={copiedCode ? 'Copied' : 'Copy invite code'}
            className={`group flex items-center py-[3px] px-[8px] gap-1 min-w-0 rounded-md transition-colors disabled:cursor-not-allowed ${hasCode ? 'hover:bg-[#f7f7ff] cursor-pointer' : 'cursor-default'}`}
          >
            <span
              className={`font-sans font-semibold text-[12.5px] leading-[18.75px] whitespace-nowrap transition-colors ${copiedCode ? 'text-[#22c55e]' : hasCode ? 'text-[#5a6382] group-hover:text-[#707dff]' : 'text-[#9ea8c6]'}`}
              title={section.joinCode ?? 'No code'}
            >
              {section.joinCode ?? '—'}
            </span>
            <span
              className={`inline-flex items-center justify-center size-5 shrink-0 transition-colors ${copiedCode ? 'text-[#22c55e]' : 'text-[#707dff] group-hover:text-[#5a67ff]'}`}
            >
              {copiedCode ? (
                <Check className="size-3.5" />
              ) : (
                <Copy className="size-3.5" />
              )}
            </span>
          </button>

          <span
            className="hidden sm:block w-px h-[20px] bg-[#d2d5e0] shrink-0"
            aria-hidden
          />

          <button
            type="button"
            onClick={handleCopyLink}
            disabled={!hasCode || copiedLink}
            aria-label={copiedLink ? 'Copied' : 'Copy invite link'}
            className={`group flex items-center py-[3px]  px-[8px] gap-1 rounded-md transition-colors disabled:cursor-not-allowed ${hasCode ? 'hover:bg-[#f7f7ff] cursor-pointer' : 'cursor-default'}`}
          >
            <span
              className={`font-sans font-semibold text-[12.5px] leading-[18.75px] whitespace-nowrap transition-colors ${copiedLink ? 'text-[#22c55e]' : hasCode ? 'text-[#5a6382] group-hover:text-[#707dff]' : 'text-[#9ea8c6]'}`}
            >
              Copy Invite Link
            </span>
            <span
              className={`inline-flex items-center justify-center size-5 shrink-0 transition-colors ${copiedLink ? 'text-[#22c55e]' : 'text-[#707dff] group-hover:text-[#5a67ff]'}`}
            >
              {copiedLink ? (
                <Check className="size-3.5" />
              ) : (
                <Copy className="size-3.5" />
              )}
            </span>
          </button>
        </div>

        {!hasCode && (
          <p className="font-sans font-medium text-[12px] leading-[18px] text-[#9ea8c6]">
            No invite code yet.
          </p>
        )}
      </div>
    </div>
  )
}
