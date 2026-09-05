'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface DefenseTabsProps {
  milestone: string
  defenseType?: 'PROPOSAL' | 'FINAL'
}

function isDefenseActive(pathname: string, base: string): boolean {
  return pathname === `${base}/defense` || pathname === base
}

function isResubmissionActive(pathname: string, base: string): boolean {
  return pathname === `${base}/resubmission`
}

function tabClasses(isActive: boolean): string {
  const base = 'px-4 py-2 rounded-[9px] font-sans font-bold text-[13px] leading-[19.5px] transition-colors'
  const active = 'bg-[#707dff] text-white shadow-[0px_2px_8px_rgba(112,125,255,0.24)]'
  const inactive =
    'bg-[#f7f7ff] text-[#6b7399] border border-[rgba(112,125,255,0.15)] hover:bg-[#eeefff] hover:text-[#707dff]'
  return `${base} ${isActive ? active : inactive}`
}

/**
 * Defense tab navigation shared via defenseType prop.
 * Highlights active segment using pathname. Works for both
 * proposal-defense and final-defense without duplication.
 */
export function DefenseTabs({ milestone }: DefenseTabsProps) {
  const pathname = usePathname() || ''
  const base = `/student/milestone/${milestone}`
  const defenseActive = isDefenseActive(pathname, base)
  const resubmissionActive = isResubmissionActive(pathname, base)

  return (
    <div className="flex items-center gap-2 px-8 py-3 bg-white border-b border-[#e8ebf8] shrink-0">
      <Link
        href={`${base}/defense`}
        aria-current={defenseActive ? 'page' : undefined}
        className={tabClasses(defenseActive)}
      >
        Defense
      </Link>
      <Link
        href={`${base}/resubmission`}
        aria-current={resubmissionActive ? 'page' : undefined}
        className={tabClasses(resubmissionActive)}
      >
        Resubmission
      </Link>
    </div>
  )
}
