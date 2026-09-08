'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Copy, TriangleAlert } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ActionMenu } from '@/components/ui/ActionMenu'
import { SectionModal } from './SectionModal'
import {
  copySectionJoinCode,
  type MySectionCardData,
} from '@/lib/actions/sections'
import { headerStyleFor } from '@/lib/sectionHeader'
import { useSectionsRefresh } from '@/store/useSectionsRefresh'

interface SectionCardProps {
  section: MySectionCardData
}

export function SectionCard({ section }: SectionCardProps) {
  const router = useRouter()
  const bump = useSectionsRefresh((s) => s.bump)
  const [editOpen, setEditOpen] = useState(false)

  async function handleHeaderCopy(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!section.joinCode) return
    try {
      await navigator.clipboard.writeText(section.joinCode)
    } catch {
      toast.error('Could not copy invite code.')
      return
    }
    toast.success('Invite code copied')
  }

  async function handleMenuCopy() {
    const res = await copySectionJoinCode(section.id)
    if (!res.success || !res.payload) {
      toast.error(res.message)
      return
    }
    try {
      await navigator.clipboard.writeText(res.payload.code)
    } catch {
      // clipboard unavailable — code still regenerated
    }
    toast.success(
      res.payload.regenerated
        ? 'New invite code generated and copied.'
        : 'Invite code copied.',
    )
    router.refresh()
    bump()
  }

  function handleEditSuccess() {
    setEditOpen(false)
    bump()
    router.refresh()
  }

  const studentsLabel = `${section.students} ${section.students === 1 ? 'Student' : 'Students'}`
  const groupsLabel = `${section.groups} ${section.groups === 1 ? 'Group' : 'Groups'}`
  const hasAvatar = section.previewAvatars.length > 0
  const overflow = Math.max(0, section.students - section.previewAvatars.length)
  const header = headerStyleFor(section.headerColor)

  return (
    <>
      <Link
        href={`/faculty/my-sections/${section.id}?tab=students`}
        className="block group/card"
      >
        {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events */}
        <div className="bg-white flex flex-col items-start overflow-clip relative rounded-[8px] border border-[#eceef8] shadow-[0px_2px_12px_0px_rgba(30,58,138,0.06),0px_1px_3px_0px_rgba(0,0,0,0.04)] w-full hover:shadow-[0px_8px_24px_0px_rgba(30,58,138,0.12),0px_2px_8px_0px_rgba(0,0,0,0.06)] hover:-translate-y-1 hover:border-[rgba(112,125,255,0.22)] transition-all duration-200 will-change-transform">
          {/* Header — palette-driven solid, border fixed grey like Figma */}
          <div
            className="border-[#e4e7f8] border-b border-solid flex flex-col items-start pb-[15px] pt-[20px] px-[20px] relative shrink-0 w-full"
            style={{
              backgroundColor: (header as any).bg,
            }}
          >
            <div className="flex items-center gap-3 relative shrink-0 w-full">
              <p
                className="font-['Sora',sans-serif] font-extrabold leading-[normal] text-[20px] tracking-[-0.15px] whitespace-nowrap min-w-0"
                style={{ color: (header as any).text }}
              >
                {section.name}
              </p>
            </div>

            {/* JoinCode row — CODE [copy icon] whole button clickable, icon adopts header color */}
            <button
              type="button"
              onClick={handleHeaderCopy}
              disabled={!section.joinCode}
              className="flex gap-[6px] h-[25px] items-center pt-[4px] px-1.5 -mx-1.5 rounded-[6px] relative shrink-0 w-fit text-left group/codebtn disabled:opacity-60 disabled:cursor-not-allowed hover:bg-black/[0.09] active:bg-black/[0.13] transition-colors"
            >
              <span
                className="font-['Sora',sans-serif] font-bold leading-[18.75px] text-[12.5px] tracking-[1px] whitespace-nowrap"
                style={{ color: (header as any).code }}
              >
                {section.joinCode ?? '—'}
              </span>
              <Copy
                className="size-[11px] shrink-0"
                style={{ color: (header as any).text }}
                strokeWidth={2.2}
              />
            </button>
          </div>

          {/* Body — replaces Figma 1463:5615 empty h63 */}
          <div className="flex flex-col items-start relative shrink-0 w-full">
            <div className="flex flex-col gap-[10px] p-[16px] relative shrink-0 w-full min-h-[88px]">
              {/* Avatars row */}
              <div className="flex items-center gap-2">
                {hasAvatar ? (
                  <div className="flex items-center -space-x-2">
                    {section.previewAvatars.map((a, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-center size-[28px] rounded-full border-2 border-white shadow-[0_1px_3px_rgba(0,0,0,0.12)] shrink-0"
                        style={{ backgroundImage: a.gradient }}
                      >
                        <span className="font-heading font-bold text-[10px] leading-[15px] text-white tracking-[0.3px]">
                          {a.initials}
                        </span>
                      </div>
                    ))}
                    {overflow > 0 && (
                      <div className="flex items-center justify-center size-[28px] rounded-full bg-[#eef0ff] border-2 border-white shadow-[0_1px_3px_rgba(0,0,0,0.08)] shrink-0">
                        <span className="font-sans font-bold text-[10px] text-[#707dff]">
                          +{overflow}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center size-[28px] rounded-full border-2 border-dashed border-[#e0e3f0] bg-[#fafbff] shrink-0">
                    <span className="font-sans font-bold text-[10px] text-[#b0b8d4] text-center">
                      —
                    </span>
                  </div>
                )}
                <span className="font-sans font-semibold text-[12.5px] leading-[18.75px] text-[#5a6382] pl-1">
                  {studentsLabel} · {groupsLabel}
                </span>
              </div>

              {/* Topic review anchor — button to avoid nested <a> inside outer <Link> */}
              <div className="flex items-center">
                {section.pendingTopics > 0 ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      router.push(
                        `/faculty/my-sections/${section.id}?tab=topics`,
                      )
                    }}
                    className="inline-flex items-center gap-[5px] h-[22px] px-[9px] rounded-full bg-[rgba(245,158,11,0.12)] border border-[rgba(245,158,11,0.25)] font-sans font-bold text-[11px] leading-[16px] text-[#d97706] hover:bg-[rgba(245,158,11,0.18)] transition-colors"
                  >
                    <TriangleAlert className="size-[11px] shrink-0" />
                    {section.pendingTopics}{' '}
                    {section.pendingTopics === 1 ? 'topic' : 'topics'} to review
                  </button>
                ) : (
                  <span className="inline-flex items-center h-[22px] px-[9px] rounded-full bg-[#f4f5fc] border border-[#e8ebf8] font-sans font-medium text-[11px] leading-[16px] text-[#8a93b4]">
                    No pending topics
                  </span>
                )}
              </div>
            </div>

            {/* Footer — left bottom Capstone phase + right action menu */}
            <div className="flex items-center justify-between pb-[8px] px-[12px] relative shrink-0 w-full">
              <span className="inline-flex items-center gap-1.5 font-sans font-bold text-[11px] leading-[16.5px] text-[#9fa5b7] shrink-0">
                <span className="size-[6px] rounded-full shrink-0 bg-[#9fa5b7]" />
                {section.capstone2OpenedAt ? 'Capstone 2' : 'Capstone 1'}
              </span>
              <div
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                }}
                onMouseDown={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                }}
              >
                <ActionMenu
                  items={[
                    {
                      label: 'Edit Section',
                      onClick: () => setEditOpen(true),
                    },
                    {
                      label: 'Copy code',
                      onClick: handleMenuCopy,
                    },
                  ]}
                />
              </div>
            </div>
          </div>
        </div>
      </Link>

      {editOpen && (
        <SectionModal
          mode="edit"
          section={{
            id: section.id,
            name: section.name,
            headerColor: section.headerColor,
          }}
          onClose={() => setEditOpen(false)}
          onSuccess={handleEditSuccess}
        />
      )}
    </>
  )
}
