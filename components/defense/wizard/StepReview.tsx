'use client'

import { Crown, User } from 'lucide-react'
import type { DefenseType, PanelSlotState } from './types'

function formatDisplayDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

interface ReviewRow {
  label: string
  value: string
  icon?: 'crown' | 'user'
}

function ReviewCard({ title, rows }: { title: string; rows: ReviewRow[] }) {
  return (
    <div className="flex flex-col gap-[8px] w-full rounded-[14px] border border-[#e8ebf8] bg-[#fbfcff] px-[14px] py-[12px]">
      <p className="font-['Sora',sans-serif] font-bold text-[12.5px] leading-[18px] text-[#1e3a8a] tracking-[-0.1px]">
        {title}
      </p>
      {rows.map((row, index) => (
        <div
          key={`${row.label}-${index}`}
          className="flex items-center justify-between gap-[12px]"
        >
          <span className="flex items-center gap-[6px] font-sans font-medium text-[11.5px] text-[#8a93b4]">
            {row.icon === 'crown' ? (
              <Crown className="size-[12px] text-[#f59e0b]" />
            ) : null}
            {row.icon === 'user' ? (
              <User className="size-[12px] text-[#707dff]" />
            ) : null}
            {row.label}
          </span>
          <span className="truncate font-sans font-semibold text-[12px] text-[#10133a]">
            {row.value}
          </span>
        </div>
      ))}
    </div>
  )
}

interface StepReviewProps {
  sectionName: string
  groupName: string
  defenseType: DefenseType
  date: Date | null
  startTime: string
  endTime: string
  venue: string
  slots: PanelSlotState
}

export function StepReview({
  sectionName,
  groupName,
  defenseType,
  date,
  startTime,
  endTime,
  venue,
  slots,
}: StepReviewProps) {
  return (
    <div className="flex flex-col gap-[12px] w-[450px]">
      <ReviewCard
        title="Section & Group"
        rows={[
          { label: 'Section', value: sectionName || '—' },
          { label: 'Group', value: groupName || '—' },
          {
            label: 'Type',
            value:
              defenseType === 'PROPOSAL' ? 'Proposal Defense' : 'Final Defense',
          },
        ]}
      />
      <ReviewCard
        title="Schedule"
        rows={[
          { label: 'Date', value: date ? formatDisplayDate(date) : '—' },
          { label: 'Time', value: `${startTime || '—'} – ${endTime || '—'}` },
          { label: 'Venue', value: venue.trim() || '—' },
        ]}
      />
      <ReviewCard
        title="Panelists"
        rows={[
          { label: 'Chair', value: slots.chair?.name ?? '—', icon: 'crown' },
          {
            label: 'Member 1',
            value: slots.member1?.name ?? '—',
            icon: 'user',
          },
          {
            label: 'Member 2',
            value: slots.member2?.name ?? '—',
            icon: 'user',
          },
        ]}
      />
    </div>
  )
}
