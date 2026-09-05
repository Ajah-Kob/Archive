'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ArrowLeft, History } from 'lucide-react'
import { HeaderBar } from '@/components/globals/HeaderBar'

interface MilestoneHeaderProps {
  /**
   * When provided, renders a "Document History" button on the right side of
   * the header. Used on defense milestone pages to open the document
   * history drawer.
   */
  onDocumentHistory?: () => void
}

const DEFENSE_SLUGS = ['proposal-defense', 'final-defense'] as const

function getDefenseBase(pathname: string): string | null {
  const match = pathname.match(/\/student\/milestone\/(proposal-defense|final-defense)/)
  return match ? `/student/milestone/${match[1]}` : null
}

function isDefenseTabActive(pathname: string, base: string): boolean {
  return pathname === `${base}/defense` || pathname === base
}

function isResubmissionTabActive(pathname: string, base: string): boolean {
  return pathname === `${base}/resubmission`
}

/**
 * Milestone header for the student milestone pages (renamed from GroupContext).
 * Renders Back + Defense/Resubmission tabs + Document History in a HeaderBar.
 */
export function MilestoneHeader({ onDocumentHistory }: MilestoneHeaderProps) {
  const pathname = usePathname() || ''
  const router = useRouter()
  const isListPage = pathname === '/student/milestone'

  if (isListPage) return null

  const defenseBase = getDefenseBase(pathname)
  const isDefenseMilestone = defenseBase !== null
  const defenseActive = defenseBase ? isDefenseTabActive(pathname, defenseBase) : false
  const resubmissionActive = defenseBase ? isResubmissionTabActive(pathname, defenseBase) : false

  return (
    <HeaderBar
      actions={
        <>
          {onDocumentHistory && (
            <button
              type="button"
              onClick={onDocumentHistory}
              className="flex items-center gap-[7px] h-[30px] px-[11px] bg-[#f7f7ff] border border-[rgba(112,125,255,0.19)] rounded-[9px] font-sans font-bold text-[12.5px] text-[#707dff] hover:bg-[#eeefff] transition-colors shrink-0"
            >
              <History className="size-3.5" />
              Document History
            </button>
          )}
          <button
            type="button"
            onClick={() => router.push('/student/milestone')}
            className="flex items-center gap-[7px] h-[30px] px-[11px] bg-[#f7f7ff] border border-[rgba(112,125,255,0.19)] rounded-[9px] font-sans font-bold text-[12.5px] text-[#707dff] hover:bg-[#eeefff] transition-colors shrink-0"
          >
            <ArrowLeft className="size-3.5" />
            Back
          </button>
        </>
      }
    >
      {isDefenseMilestone && defenseBase ? (
        <>
          <Link
            href={`${defenseBase}/defense`}
            aria-current={defenseActive ? 'page' : undefined}
            className={`relative flex items-center h-[40px] px-[14px] font-sans text-[13px] transition-colors shrink-0 ${
              defenseActive
                ? 'font-bold text-[#707dff]'
                : 'font-semibold text-[#8a93b4] hover:text-[#5a6382]'
            }`}
          >
            Defense
            {defenseActive && (
              <span className="absolute left-0 right-0 bottom-0 h-[2px] rounded-full bg-[#707dff]" />
            )}
          </Link>
          <Link
            href={`${defenseBase}/resubmission`}
            aria-current={resubmissionActive ? 'page' : undefined}
            className={`relative flex items-center h-[40px] px-[14px] font-sans text-[13px] transition-colors shrink-0 ${
              resubmissionActive
                ? 'font-bold text-[#707dff]'
                : 'font-semibold text-[#8a93b4] hover:text-[#5a6382]'
            }`}
          >
            Resubmission
            {resubmissionActive && (
              <span className="absolute left-0 right-0 bottom-0 h-[2px] rounded-full bg-[#707dff]" />
            )}
          </Link>
        </>
      ) : null}
    </HeaderBar>
  )
}

// Backward compat alias — GroupContext was renamed to MilestoneHeader
export const GroupContext = MilestoneHeader
