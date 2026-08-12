'use client'

import { createPortal } from 'react-dom'
import { History, TriangleAlert, X } from 'lucide-react'
import type { TopicVersionInfo } from '@/lib/actions/sections'
import { TopicInfoBox } from './TopicInfoBox'
import { TopicStatusBadge } from '@/components/milestones/topic-submission/TopicStatusBadge'

interface TopicDetailsModalProps {
  version: TopicVersionInfo | null
  groupName: string
  onClose: () => void
}

export function TopicDetailsModal({
  version,
  groupName,
  onClose,
}: TopicDetailsModalProps) {
  if (!version) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[rgba(15,18,40,0.45)] backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-[756px] max-w-full rounded-[16px] shadow-[0px_24px_64px_0px_rgba(30,58,138,0.18),0px_4px_16px_0px_rgba(0,0,0,0.08)] overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
        <div className="flex items-center justify-between px-[22px] pt-[18px] pb-[16px] border-b border-[#f0f2fa] shrink-0">
          <div className="flex flex-col">
            <div className="flex gap-[10px] items-center">
              <div className="size-[30px] rounded-[8px] bg-[rgba(112,125,255,0.05)] flex items-center justify-center">
                <History className="size-[14px] text-[#707dff]" />
              </div>
              <h2 className="font-['Sora',sans-serif] font-bold text-[14px] leading-[21px] text-[#1e3a8a] tracking-[-0.14px]">
                Topic {version.topicNumber}
              </h2>
            </div>
            <p className="font-sans font-semibold text-[11px] leading-[16.5px] text-[#9ea8c6] pl-[40px]">
              Version {version.version}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="size-[28px] rounded-[7px] bg-[#f4f5fc] border border-[#e8ebf8] flex items-center justify-center cursor-pointer hover:bg-[#eef0fb] transition-colors"
          >
            <X className="size-[13px] text-[#8a93b4]" />
          </button>
        </div>

        <div className="px-[22px] py-[20px] flex flex-col gap-[16px] overflow-y-auto">
          <div className="flex items-center justify-between gap-[10px]">
            <p className="font-sans font-medium text-[11px] leading-[16.5px] text-[#9ea8c6]">
              You are viewing a previous version of this topic.
            </p>
            <TopicStatusBadge status={version.status} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-[6fr_4fr] gap-[16px] items-start">
            <div className="min-w-0">
              <TopicInfoBox
                groupName={groupName}
                title={version.title}
                background={version.background}
              />
            </div>

            <div className="min-w-0">
              {version.reviewNote && (
                <div
                  className={`rounded-[12px] p-[14px] flex flex-col gap-[8px] ${
                    version.status === 'NEED_REVISION'
                      ? 'bg-[rgba(225,29,72,0.04)] border border-[rgba(225,29,72,0.16)]'
                      : 'bg-[rgba(112,125,255,0.04)] border border-[rgba(112,125,255,0.16)]'
                  }`}
                >
                  <p
                    className={`font-sans font-bold text-[10.5px] leading-[15.75px] tracking-[0.6px] uppercase ${
                      version.status === 'NEED_REVISION'
                        ? 'text-[#e11d48]'
                        : 'text-[#707dff]'
                    }`}
                  >
                    Coordinator Feedback
                  </p>
                  <div className="flex gap-[7px] items-start">
                    <TriangleAlert
                      className={`size-[13px] shrink-0 mt-px ${
                        version.status === 'NEED_REVISION'
                          ? 'text-[#e11d48]'
                          : 'text-[#707dff]'
                      }`}
                    />
                    <p
                      className={`font-medium text-[12px] leading-[17.4px] ${
                        version.status === 'NEED_REVISION'
                          ? 'text-[#e11d48]'
                          : 'text-[#3c4268]'
                      }`}
                    >
                      {version.reviewNote}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end px-[22px] pt-[16px] pb-[16px] border-t border-[#f0f2fa] shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="bg-white border border-[#e8ebf8] rounded-[9px] h-[38px] px-[20px] text-[#5a6382] font-semibold text-[11px] hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
