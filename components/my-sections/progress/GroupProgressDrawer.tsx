'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { JourneyTracker } from '@/components/milestones/JourneyTracker'
import { UserProfile } from '@/components/ui/UserProfile'
import { getInitials } from '@/lib/helper'
import { getCoordinatorGroupDetail, type SectionGroupDetail } from '@/lib/actions/sections'

interface GroupProgressDrawerProps {
  groupId: number | null
  onClose: () => void
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function TopicStatusPill({ status }: { status: SectionGroupDetail['topics'][number]['status'] }) {
  if (status === 'APPROVED') {
    return (
      <span className="inline-flex items-center px-[9px] py-[3px] rounded-full bg-[#eefbf2] border border-[rgba(34,197,94,0.25)] font-sans font-bold text-[10.5px] leading-[15.75px] text-[#22c55e] whitespace-nowrap">
        Approved
      </span>
    )
  }
  if (status === 'NEED_REVISION') {
    return (
      <span className="inline-flex items-center px-[9px] py-[3px] rounded-full bg-[rgba(245,158,11,0.08)] border border-[rgba(245,158,11,0.25)] font-sans font-bold text-[10.5px] leading-[15.75px] text-[#f59e0b] whitespace-nowrap">
        Needs revision
      </span>
    )
  }
  return (
    <span className="inline-flex items-center px-[9px] py-[3px] rounded-full bg-[#f4f6ff] border border-[#e5e8ff] font-sans font-bold text-[10.5px] leading-[15.75px] text-[#707dff] whitespace-nowrap">
      Pending
    </span>
  )
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-sans font-extrabold text-[10px] leading-[15px] tracking-[0.9px] uppercase text-[#bbc0d8]">
      {children}
    </p>
  )
}

export function GroupProgressDrawer({ groupId, onClose }: GroupProgressDrawerProps) {
  const [detail, setDetail] = useState<SectionGroupDetail | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (groupId == null) return
    setLoading(true)
    setDetail(null)
    getCoordinatorGroupDetail(groupId).then((res) => {
      setDetail(res.success ? (res.payload ?? null) : null)
      setLoading(false)
    })
  }, [groupId])

  const isOpen = groupId != null

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-[rgba(16,19,58,0.3)] backdrop-blur-[4px] transition-all duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />
      <div
        className={`fixed top-0 right-0 h-dvh w-[500px] z-50 bg-white border-l border-[#eceef8] shadow-[-8px_0px_40px_rgba(112,125,255,0.14)] transition-transform duration-300 flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-start justify-between gap-[16px] px-6 py-4 border-b border-[#eceef8] shrink-0">
          <div>
            <p className="font-heading font-bold text-[17px] leading-[25.5px] text-[#12143a] tracking-[-0.17px]">
              {detail?.name ?? 'Group Progress'}
            </p>
            <p className="font-sans font-medium text-[12.5px] leading-[18.75px] text-[#8a93b4] pt-[4px]">
              Read-only view of this group&apos;s capstone journey.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="bg-[#fafbff] border border-[#eceef8] rounded-[14px] size-[28px] flex items-center justify-center hover:bg-gray-50 transition-colors shrink-0"
          >
            <X className="size-[13px] text-[#8a93b4]" />
          </button>
        </div>

        <div className="flex-1 min-h-0 px-6 py-4 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-[200px]">
              <span className="text-[12.5px] font-medium text-[#9ea8c6]">
                Loading group…
              </span>
            </div>
          ) : !detail ? (
            <div className="flex items-center justify-center h-[200px]">
              <span className="text-[12.5px] font-medium text-[#9ea8c6]">
                Could not load this group.
              </span>
            </div>
          ) : (
            <div className="flex flex-col gap-[22px]">
              <div className="flex flex-col gap-[12px]">
                <SectionHeading>Capstone Journey</SectionHeading>
                <div className="border border-[#eceef8] rounded-[12px] px-[18px] py-[16px] bg-[#fafbff] flex items-center justify-center">
                  <JourneyTracker journey={detail.journey} size="md" />
                </div>
              </div>

              <div className="flex flex-col gap-[10px]">
                <SectionHeading>Members</SectionHeading>
                <div className="border border-[#eceef8] rounded-[9px] divide-y divide-[#f4f5fc]">
                  {detail.members.map((m) => (
                    <div key={m.id} className="px-[14px] py-[11px]">
                      <UserProfile
                        initials={getInitials(m.name)}
                        name={m.name}
                        email={m.email}
                        badge={m.isLeader ? 'Leader' : undefined}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-[10px]">
                <SectionHeading>Adviser</SectionHeading>
                {detail.adviser ? (
                  <div className="border border-[#eceef8] rounded-[9px] px-[14px] py-[11px]">
                    <UserProfile
                      initials={getInitials(detail.adviser.name)}
                      name={detail.adviser.name}
                      email={detail.adviser.email}
                    />
                  </div>
                ) : (
                  <p className="font-sans font-medium italic text-[12.5px] leading-[18.75px] text-[#c4cadf]">
                    No adviser assigned yet.
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-[10px]">
                <SectionHeading>Topic Proposals</SectionHeading>
                {detail.topics.length === 0 ? (
                  <p className="font-sans font-medium italic text-[12.5px] leading-[18.75px] text-[#c4cadf]">
                    No topics submitted yet.
                  </p>
                ) : (
                  <div className="flex flex-col gap-[8px]">
                    {detail.topics.map((t) => (
                      <div
                        key={t.id}
                        className="border border-[#eceef8] rounded-[9px] px-[14px] py-[11px]"
                      >
                        <div className="flex items-center justify-between gap-[12px]">
                          <p className="min-w-0 truncate font-sans font-bold text-[13px] leading-[19.5px] text-[#1e2145]">
                            {t.title}
                          </p>
                          <TopicStatusPill status={t.status} />
                        </div>
                        {t.note && (
                          <p className="font-sans font-medium text-[12px] leading-[18px] text-[#6b7399] pt-[6px]">
                            {t.note}
                          </p>
                        )}
                        <p className="font-sans font-medium text-[11px] leading-[16.5px] text-[#9ea8c6] pt-[6px]">
                          {t.submittedBy || 'Unknown'} · {formatDate(t.createdAt)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
