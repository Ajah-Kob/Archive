'use client'

import { useEffect, useState } from 'react'
import { ChevronDown, X } from 'lucide-react'
import { JourneyTracker } from '@/components/milestones/JourneyTracker'
import { UserProfile } from '@/components/ui/UserProfile'
import { getInitials } from '@/lib/helper'
import { getCoordinatorGroupDetail, type SectionGroupDetail, type SectionGroupTopic } from '@/lib/actions/sections'

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

function formatDateShort(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function TopicStatusPill({ status }: { status: SectionGroupTopic['status'] }) {
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

type TabKey = 'overview' | 'chapters' | 'defense' | 'archiving'

export function GroupProgressDrawer({ groupId, onClose }: GroupProgressDrawerProps) {
  const [detail, setDetail] = useState<SectionGroupDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<TabKey>('overview')
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set())
  const [showAllMap, setShowAllMap] = useState<Set<string>>(new Set())

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

        <div className="flex items-center gap-1 px-6 border-b border-[#eceef8] shrink-0 overflow-x-auto">
          {(['overview', 'chapters', 'defense', 'archiving'] as TabKey[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`relative h-[36px] px-3 font-sans text-[12px] font-semibold whitespace-nowrap transition-colors ${activeTab === tab ? 'text-[#707dff]' : 'text-[#8a93b4] hover:text-[#5a6382]'}`}
            >
              {tab === 'overview' ? 'Overview' : tab === 'chapters' ? 'Chapters' : tab === 'defense' ? 'Defense' : 'Archiving'}
              {activeTab === tab && <span className="absolute left-0 right-0 bottom-0 h-[2px] bg-[#707dff] rounded-full" />}
            </button>
          ))}
        </div>

        <div className="flex-1 min-h-0 px-6 py-4 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-[200px]">
              <span className="text-[12.5px] font-medium text-[#9ea8c6]">Loading group…</span>
            </div>
          ) : !detail ? (
            <div className="flex items-center justify-center h-[200px]">
              <span className="text-[12.5px] font-medium text-[#9ea8c6]">Could not load this group.</span>
            </div>
          ) : activeTab === 'overview' ? (
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
                      <UserProfile initials={getInitials(m.name)} name={m.name} email={m.email} badge={m.isLeader ? 'Leader' : undefined} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-[10px]">
                <SectionHeading>Adviser</SectionHeading>
                {detail.adviser ? (
                  <div className="border border-[#eceef8] rounded-[9px] px-[14px] py-[11px]">
                    <UserProfile initials={getInitials(detail.adviser.name)} name={detail.adviser.name} email={detail.adviser.email} />
                  </div>
                ) : (
                  <p className="font-sans font-medium italic text-[12.5px] leading-[18.75px] text-[#c4cadf]">No adviser assigned yet.</p>
                )}
              </div>

              <div className="flex flex-col gap-[10px]">
                <SectionHeading>Topic</SectionHeading>
                {detail.topic ? (
                  <div className="border border-[#eceef8] rounded-[9px] px-[14px] py-[11px]">
                    <div className="flex items-center justify-between gap-[12px]">
                      <p className="min-w-0 truncate font-sans font-bold text-[13px] leading-[19.5px] text-[#1e2145]">{detail.topic.title}</p>
                      <TopicStatusPill status={detail.topic.status} />
                    </div>
                    {detail.topic.note && <p className="font-sans font-medium text-[12px] leading-[18px] text-[#6b7399] pt-[6px]">{detail.topic.note}</p>}
                    <p className="font-sans font-medium text-[11px] leading-[16.5px] text-[#9ea8c6] pt-[6px]">
                      {detail.topic.submittedBy || 'Unknown'} · {formatDate(detail.topic.createdAt)}
                    </p>
                  </div>
                ) : (
                  <p className="font-sans font-medium italic text-[12.5px] leading-[18.75px] text-[#c4cadf]">No topic selected yet.</p>
                )}
              </div>
            </div>
          ) : activeTab === 'chapters' ? (
            <div className="flex flex-col gap-3">
              <SectionHeading>Chapters 1–5</SectionHeading>
              {(detail as unknown as { chapters: { chapter: string; label: string; status: string; submissions: { id: number; version: number; fileName: string; blobUrl: string; createdAt: string; status: string; comments: number; pages: number }[] }[] }).chapters?.length ? (
                (detail as unknown as { chapters: { chapter: string; label: string; status: string; submissions: { id: number; version: number; fileName: string; blobUrl: string; createdAt: string; status: string; comments: number; pages: number }[] }[] }).chapters.map((ch) => {
                  const key = ch.chapter
                  const isOpen = expandedChapters.has(key)
                  const showAll = showAllMap.has(key)
                  const visible = showAll ? ch.submissions.slice(0, 6) : ch.submissions.slice(0, 3)
                  const isLocked = ch.status === 'LOCKED'
                  const isEmpty = !isLocked && ch.submissions.length === 0
                  return (
                    <div key={ch.chapter} className="border border-[#eceef8] rounded-[9px] overflow-hidden">
                      {isLocked ? (
                        <div className="w-full flex items-center justify-between px-3 py-2.5 bg-slate-50/50 cursor-not-allowed">
                          <span className="flex items-center gap-2 min-w-0">
                            <span className="font-sans font-bold text-[12px] text-[#9ea8c6] truncate">{ch.label}</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap bg-slate-50 border-[#eceef8] text-[#8a93b4]">Locked</span>
                            {ch.submissions.length > 0 && <span className="font-sans text-[11px] text-[#c4cadf] hidden sm:inline">{ch.submissions.length} versions</span>}
                          </span>
                          <span className="size-4 flex items-center justify-center">
                            <span className="size-2 rounded-full bg-[#e0e3ff]" />
                          </span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            const next = new Set(expandedChapters)
                            if (next.has(key)) next.delete(key)
                            else next.add(key)
                            setExpandedChapters(next)
                          }}
                          className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-slate-50/60 transition-colors"
                        >
                          <span className="flex items-center gap-2 min-w-0">
                            <span className="font-sans font-bold text-[12px] text-[#1e2145] truncate">{ch.label}</span>
                            {ch.submissions.length > 0 && <span className="font-sans text-[11px] text-[#8a93b4] hidden sm:inline">{ch.submissions.length} versions</span>}
                          </span>
                          <ChevronDown className={`size-4 text-[#8a93b4] shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                        </button>
                      )}
                      {isOpen && !isLocked && (
                        <div className="border-t border-[#f0f2fa] bg-white">
                          {isEmpty ? (
                            <div className="px-3 py-3 text-center">
                              <p className="font-sans text-[11px] text-[#8a93b4]">No submission yet.</p>
                            </div>
                          ) : (
                            <>
                              <div className="divide-y divide-[#f4f5fc]">
                                {visible.map((sub) => (
                                  <div key={sub.id} className="flex items-center justify-between gap-3 px-3 py-2.5 hover:bg-[#fafbff] transition-colors">
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-2 min-w-0">
                                        <a href={sub.blobUrl} target="_blank" rel="noopener noreferrer" className="font-sans font-semibold text-[11px] leading-[16.5px] text-[#707dff] hover:text-[#5a67ff] hover:underline truncate">
                                          {sub.fileName}
                                        </a>
                                        <span className="font-sans text-[10px] px-1.5 py-0.5 rounded bg-[#f4f6ff] border border-[#e0e3ff] text-[#707dff] shrink-0">v{sub.version}</span>
                                      </div>
                                      <div className="flex items-center gap-2 pt-1">
                                        <span className="font-sans text-[11px] text-[#8a93b4]">{formatDateShort(sub.createdAt)}</span>
                                        <span className="size-1 rounded-full bg-[#e8ebf8]" />
                                        <span className={`text-[11px] font-semibold ${sub.status === 'APPROVED' ? 'text-[#16a34a]' : sub.status === 'NEED_REVISION' || sub.status === 'NEEDS_REVISION' ? 'text-[#dc2626]' : 'text-[#d97706]'}`}>{sub.status === 'APPROVED' ? 'Approved' : sub.status === 'NEED_REVISION' || sub.status === 'NEEDS_REVISION' ? 'Need Revision' : 'In Review'}</span>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2.5 shrink-0">
                                      <span className="inline-flex items-center gap-1 font-sans text-[11px] text-[#8a93b4]">
                                        <span className="size-1.5 rounded-full bg-[#e0e3ff]" />
                                        {sub.comments} comments
                                      </span>
                                      <span className="inline-flex items-center gap-1 font-sans text-[11px] text-[#8a93b4]">
                                        <span className="size-1.5 rounded-full bg-[#e0e3ff]" />
                                        {sub.pages} {sub.pages === 1 ? 'page' : 'pages'}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              {ch.submissions.length > 3 && (
                                <div className="px-3 py-2 border-t border-[#f0f2fa] flex justify-center">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const next = new Set(showAllMap)
                                      if (next.has(key)) next.delete(key)
                                      else next.add(key)
                                      setShowAllMap(next)
                                    }}
                                    className="font-sans font-semibold text-[11px] text-[#707dff] hover:text-[#5a67ff] transition-colors"
                                  >
                                    {showAll ? 'Show less' : `+${Math.min(3, ch.submissions.length - 3)} more`}
                                  </button>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })
              ) : (
                <p className="font-sans text-[12px] italic text-[#c4cadf]">No chapter submissions yet.</p>
              )}
            </div>
          ) : activeTab === 'defense' ? (
            <div className="flex flex-col gap-3">
              <SectionHeading>Defense Schedules</SectionHeading>
              {(detail as unknown as { defenses: { id: number; type: string; date: string; venue: string; verdict: string }[] }).defenses?.length ? (
                (detail as unknown as { defenses: { id: number; type: string; date: string; venue: string; verdict: string }[] }).defenses.map((d) => (
                  <div key={d.id} className="border border-[#eceef8] rounded-[9px] px-3 py-2.5 flex flex-col gap-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-sans font-bold text-[12px] text-[#1e2145]">{d.type === 'PROPOSAL' ? 'Proposal Defense' : 'Final Defense'}</span>
                      <span className="font-sans text-[10px] font-bold px-2 py-0.5 rounded-full border bg-slate-50 border-[#eceef8] text-[#5a6382]">{d.verdict}</span>
                    </div>
                    <span className="font-sans text-[11px] text-[#6b7399]">
                      {formatDate(d.date)} · {d.venue}
                    </span>
                  </div>
                ))
              ) : (
                <p className="font-sans text-[12px] italic text-[#c4cadf]">No defense scheduled.</p>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <SectionHeading>Archiving</SectionHeading>
              {(detail as unknown as { archiving: { status: string | null; title: string | null; fileName: string | null; blobUrl: string | null } | null }).archiving?.status ? (
                <div className="border border-[#eceef8] rounded-[9px] px-3 py-2.5 flex flex-col gap-1.5">
                  <span className="font-sans font-bold text-[12px] text-[#1e2145]">{(detail as unknown as { archiving: { title: string } }).archiving.title ?? 'Archiving'}</span>
                  <span className="font-sans text-[11px] px-2 py-0.5 rounded-full bg-[#f4f6ff] border border-[#e0e3ff] text-[#707dff] self-start">
                    {(detail as unknown as { archiving: { status: string } }).archiving.status}
                  </span>
                  {(detail as unknown as { archiving: { fileName: string | null; blobUrl: string | null } }).archiving.fileName && (
                    <a href={(detail as unknown as { archiving: { blobUrl: string } }).archiving.blobUrl} target="_blank" rel="noopener noreferrer" className="font-sans text-[11px] text-[#707dff] hover:underline truncate">
                      {(detail as unknown as { archiving: { fileName: string } }).archiving.fileName}
                    </a>
                  )}
                </div>
              ) : (
                <p className="font-sans text-[12px] italic text-[#c4cadf]">No archiving submission yet.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
