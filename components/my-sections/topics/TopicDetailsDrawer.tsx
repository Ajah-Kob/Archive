'use client'

import { useEffect, useState } from 'react'
import { Eye, History, X } from 'lucide-react'
import type { PendingTopic, TopicVersionInfo } from '@/lib/actions/sections'
import { getTopicVersions } from '@/lib/actions/sections'
import { TopicInfoBox } from './TopicInfoBox'
import { TopicStatusBadge } from '@/components/milestones/topic-submission/TopicStatusBadge'
import { TopicDetailsModal } from './TopicDetailsModal'

interface TopicDetailsDrawerProps {
  topic: PendingTopic | null
  onClose: () => void
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-sans font-extrabold text-[10px] leading-[15px] tracking-[0.9px] uppercase text-[#bbc0d8]">
      {children}
    </p>
  )
}

export function TopicDetailsDrawer({ topic, onClose }: TopicDetailsDrawerProps) {
  const [versions, setVersions] = useState<TopicVersionInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [versionTarget, setVersionTarget] = useState<TopicVersionInfo | null>(
    null,
  )

  useEffect(() => {
    if (!topic) return
    setLoading(true)
    setVersions([])
    getTopicVersions(topic.id).then((res) => {
      setVersions(res.success ? (res.payload?.versions ?? []) : [])
      setLoading(false)
    })
  }, [topic])

  const isOpen = topic != null
  const previousVersions = versions.filter((v) => !v.isCurrent)

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
              Topic Details
            </p>
            <p className="font-sans font-medium text-[12.5px] leading-[18.75px] text-[#8a93b4] pt-[4px]">
              Read-only view of this topic submission.
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
          {topic && (
            <div className="flex flex-col gap-[22px]">
              <div className="flex flex-col gap-[12px]">
                <div className="flex items-center justify-between gap-[10px]">
                  <SectionHeading>Submission</SectionHeading>
                  <TopicStatusBadge status={topic.status} />
                </div>
                <p className="font-sans font-medium text-[12.5px] leading-[18.75px] text-[#8a93b4]">
                  Submitted by {topic.submittedBy || 'Unknown'} ·{' '}
                  {formatDate(topic.createdAt)}
                </p>
              </div>

              <div className="flex flex-col gap-[10px]">
                <SectionHeading>Current Topic</SectionHeading>
                <TopicInfoBox
                  groupName={topic.groupName}
                  title={topic.title}
                  background={topic.background}
                />
              </div>

              <div className="flex flex-col gap-[10px]">
                <div className="flex items-center gap-[8px]">
                  <SectionHeading>Previous Versions</SectionHeading>
                  {previousVersions.length > 0 && (
                    <span className="bg-[#f4f6ff] border border-[#e5e8ff] rounded-full px-[8px] py-[2px] font-sans font-bold text-[10.5px] text-[#707dff]">
                      {previousVersions.length}
                    </span>
                  )}
                </div>

                <div className="border border-[#eceef8] rounded-[9px] divide-y divide-[#f4f5fc]">
                  {loading ? (
                    <div className="px-[14px] py-[11px]">
                      <span className="font-sans font-medium text-[12.5px] text-[#9ea8c6]">
                        Loading versions…
                      </span>
                    </div>
                  ) : previousVersions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center px-[8px] py-[18px]">
                      <div className="size-[40px] rounded-full bg-[#f4f5fc] flex items-center justify-center">
                        <History
                          className="size-[18px] text-[#c4cadf]"
                          strokeWidth={1.75}
                        />
                      </div>
                      <p className="pt-[8px] font-sans font-semibold text-[12.5px] text-[#8a93b4]">
                        No previous versions
                      </p>
                      <p className="pt-[3px] font-sans font-medium text-[11px] text-[#c4cadf] leading-[16.5px]">
                        Resubmissions of this topic will appear here.
                      </p>
                    </div>
                  ) : (
                    previousVersions.map((version) => (
                      <div key={version.id} className="px-[14px] py-[11px]">
                        <div className="flex items-center justify-between gap-[8px]">
                          <div className="flex items-center gap-[7px] min-w-px">
                            <span className="bg-[#f4f6ff] border border-[#e5e8ff] rounded-[6px] px-[7px] py-[2px] font-sans font-bold text-[10px] text-[#707dff] shrink-0">
                              v{version.version}
                            </span>
                            <p className="truncate font-sans font-semibold text-[12.5px] leading-[17px] text-[#3c4268]">
                              Version {version.version}
                            </p>
                          </div>
                          <button
                            onClick={() => setVersionTarget(version)}
                            className="flex items-center gap-[5px] h-[26px] px-[10px] bg-white border border-[#e8ebf8] rounded-[7px] font-sans font-semibold text-[11px] text-[#5a6382] hover:bg-gray-50 transition-colors shrink-0"
                          >
                            <Eye className="size-[11px]" />
                            View
                          </button>
                        </div>
                        <p className="pt-[5px] font-sans font-medium text-[11px] text-[#9ea8c6]">
                          Submitted {formatDate(version.createdAt)}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <TopicDetailsModal
        version={versionTarget}
        groupName={topic?.groupName ?? ''}
        onClose={() => setVersionTarget(null)}
      />
    </>
  )
}
