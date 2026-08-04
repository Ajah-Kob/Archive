'use client'

import { useRouter } from 'next/navigation'
import { ArrowRight, Users } from 'lucide-react'
import { ActionMenu } from '@/components/ui/ActionMenu'
import { SectionCodeButton } from './SectionCodeButton'
import { slugify } from '@/lib/slug'
import type { MySectionCardData } from '@/lib/actions/sections'

const ACCENTS = {
  indigo: {
    bar: '#707dff',
    badgeBg: 'rgba(112,125,255,0.04)',
    badgeBorder: 'rgba(112,125,255,0.13)',
    badgeText: '#707dff',
  },
  amber: {
    bar: '#f59e0b',
    badgeBg: 'rgba(245,158,11,0.05)',
    badgeBorder: 'rgba(245,158,11,0.2)',
    badgeText: '#d97706',
  },
}

interface MySectionsCardProps {
  section: MySectionCardData
  onEdit: (section: MySectionCardData) => void
  onRemove: (section: MySectionCardData) => void
}

export function MySectionsCard({ section, onEdit, onRemove }: MySectionsCardProps) {
  const router = useRouter()
  const accent = ACCENTS[section.accent]

  return (
    <div className="relative flex items-center justify-between gap-[20px] bg-white border border-[#e8ebf8] rounded-[14px] shadow-[0px_2px_12px_0px_rgba(30,58,138,0.06),0px_1px_3px_0px_rgba(0,0,0,0.04)] pl-[26px] pr-[21px] py-[19px]">
      <div
        className="absolute left-0 top-0 h-full w-[5px] rounded-tl-[14px] rounded-bl-[14px]"
        style={{ backgroundColor: accent.bar }}
      />

      <div className="flex flex-col min-w-0 flex-1">
        <div className="flex gap-[10px] items-center">
          <h3 className="font-['Sora',sans-serif] font-extrabold text-[26px] leading-[26px] text-[#1e3a8a] tracking-[-0.52px] whitespace-nowrap">
            {section.name}
          </h3>
          <span
            className="px-[11px] py-[4px] rounded-[20px] border font-sans font-bold text-[11px] leading-[16.5px] whitespace-nowrap"
            style={{
              backgroundColor: accent.badgeBg,
              borderColor: accent.badgeBorder,
              color: accent.badgeText,
            }}
          >
            {section.yearLevel}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-[10px] pt-[8px]">
          <span className="flex gap-[6px] items-center font-sans font-semibold text-[12.5px] leading-[18.75px] text-[#6b7399]">
            <Users className="size-[13px] text-[#9ea8c6]" />
            {section.students} Students
          </span>
          <span className="font-sans text-[12px] leading-[18px] text-[#dde0f0]">
            ·
          </span>
          <span className="flex gap-[6px] items-center font-sans font-semibold text-[12.5px] leading-[18.75px] text-[#6b7399]">
            <Users className="size-[13px] text-[#9ea8c6]" />
            {section.groups} Groups
          </span>
          <span className="font-sans text-[12px] leading-[18px] text-[#dde0f0]">
            ·
          </span>
          <SectionCodeButton
            sectionId={section.id}
            initialCode={section.joinCode}
          />
          <span className="font-sans text-[12px] leading-[18px] text-[#dde0f0]">
            ·
          </span>
          <span className="font-sans font-medium text-[12px] leading-[18px] text-[#9ea8c6]">
            Created {section.dateCreated}
          </span>
        </div>
      </div>

      <div className="flex gap-[8px] items-center shrink-0">
        <button
          onClick={() => router.push(`/my-sections/${slugify(section.name)}`)}
          className="flex gap-[7px] items-center px-[16px] py-[9px] rounded-[9px] font-sans font-bold text-[12.5px] leading-[18.75px] text-white hover:opacity-90 active:scale-[0.98] transition-all"
          style={{
            backgroundImage:
              'linear-gradient(177.47deg, rgb(112, 125, 255) 6.9%, rgb(85, 101, 255) 93.1%)',
            boxShadow: '0px 3px 2.5px rgba(112,125,255,0.21)',
          }}
        >
          <Users className="size-[13px]" />
          Manage Students
          <ArrowRight className="size-[12px]" />
        </button>

        <ActionMenu
          items={[
            { label: 'Edit Section', onClick: () => onEdit(section) },
            {
              label: 'Remove Section',
              onClick: () => onRemove(section),
              variant: 'danger',
            },
          ]}
        />
      </div>
    </div>
  )
}
