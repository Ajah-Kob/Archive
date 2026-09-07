'use client'

import Link from 'next/link'
import { Check, Clock, Upload } from 'lucide-react'
import type { ArchivingUiStatus } from '@/lib/actions/archiving'

interface StatusCalloutProps {
  status: ArchivingUiStatus
}

const CONFIG: Record<
  ArchivingUiStatus,
  {
    Icon: typeof Upload
    outerClass: string
    iconBoxClass: string
    iconClass: string
    title: string
    titleClass: string
    message: string
  }
> = {
  READY_FOR_ARCHIVING: {
    Icon: Upload,
    outerClass: 'bg-[rgba(112,125,255,0.07)] border-[rgba(112,125,255,0.2)]',
    iconBoxClass: 'bg-[rgba(112,125,255,0.08)] border-[rgba(112,125,255,0.2)]',
    iconClass: 'text-[#707dff]',
    title: 'Ready for Archiving',
    titleClass: 'text-[#707dff]',
    message: 'Complete your capstone details and submit your final document for approval.',
  },
  IN_REVIEW: {
    Icon: Clock,
    outerClass: 'bg-[rgba(245,158,11,0.07)] border-[rgba(245,158,11,0.2)]',
    iconBoxClass: 'bg-[rgba(245,158,11,0.08)] border-[rgba(245,158,11,0.2)]',
    iconClass: 'text-[#f59e0b]',
    title: 'In Review',
    titleClass: 'text-[#f59e0b]',
    message: 'Your capstone has been submitted and is awaiting Program Chair approval.',
  },
  CAPSTONE_ARCHIVED: {
    Icon: Check,
    outerClass: 'bg-[rgba(22,163,74,0.07)] border-[rgba(22,163,74,0.2)]',
    iconBoxClass: 'bg-[rgba(22,163,74,0.08)] border-[rgba(22,163,74,0.2)]',
    iconClass: 'text-[#16a34a]',
    title: 'Capstone Archived',
    titleClass: 'text-[#16a34a]',
    message: 'Your capstone has been approved and published to the Repository.',
  },
}

export function StatusCallout({ status }: StatusCalloutProps) {
  const cfg = CONFIG[status]
  const Icon = cfg.Icon

  return (
    <section
      aria-live="polite"
      className={`flex items-center gap-[16px] rounded-[14px] border px-[22px] py-[18px] w-full ${cfg.outerClass}`}
    >
      <div
        className={`flex size-[40px] items-center justify-center rounded-[12px] border shrink-0 ${cfg.iconBoxClass}`}
      >
        <Icon className={`size-[20px] ${cfg.iconClass}`} strokeWidth={2} />
      </div>

      <div className="min-w-0 flex-1 flex flex-col gap-[2px]">
        <h2 className={`font-heading font-bold text-[15px] leading-[22.5px] tracking-[-0.135px] ${cfg.titleClass}`}>
          {cfg.title}
        </h2>
        <p className="font-sans text-[13px] leading-[19.5px] text-[#5a6382]">
          {cfg.message}
        </p>
      </div>

      {status === 'CAPSTONE_ARCHIVED' && (
        <Link
          href="/repository"
          className="shrink-0 inline-flex items-center justify-center rounded-[9px] px-[18px] py-[9px] font-heading text-[13px] font-semibold text-white shadow-[0px_2px_4px_rgba(22,163,74,0.2)] transition-opacity hover:opacity-95 bg-gradient-to-r from-[#16a34a] to-[#15803d] border border-[rgba(22,163,74,0.25)]"
        >
          View in Repository
        </Link>
      )}
    </section>
  )
}
