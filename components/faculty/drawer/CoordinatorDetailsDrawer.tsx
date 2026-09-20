'use client'

import { useEffect, useState } from 'react'
import { X, Users, Layers } from 'lucide-react'
import { toast } from 'sonner'
import { CoordinatorDetailsSkeleton } from '@/components/faculty/drawer/CoordinatorDetailsSkeleton'
import { ActivityStatus } from '@/components/ui/ActivityStatus'
import { useCoordinatorDetailDrawer } from '@/store/useCoordinatorDetailDrawer'
import { getInitials } from '@/lib/helper'
import { getCoordinatorDetail } from '@/lib/actions/coordinator'

interface CoordinatorSection {
  id: number
  name: string
  studentCount: number
}

interface CoordinatorDetail {
  id: number
  userId: number
  name: string
  email: string
  activityStatus: 'active' | string
  totalStudents: number
  sections: CoordinatorSection[]
}

export function CoordinatorDetailsDrawer() {
  const { isOpen, facultyId, close } = useCoordinatorDetailDrawer()
  const [detail, setDetail] = useState<CoordinatorDetail | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isOpen || !facultyId) return
    setLoading(true)
    setDetail(null)
    getCoordinatorDetail(facultyId).then((res) => {
      if (!res.success) toast.error(res.message)
      setDetail(res.payload ?? null)
      setLoading(false)
    })
  }, [isOpen, facultyId])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen, close])

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-[rgba(16,19,58,0.3)] backdrop-blur-[4px] transition-all duration-300 ${
          isOpen
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none'
        }`}
        onClick={close}
      />
      <div
        className={`fixed top-0 right-0 h-dvh w-[500px] z-50 bg-white border-l border-[#eceef8] shadow-[-8px_0px_40px_rgba(112,125,255,0.14)] transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#eceef8]">
          <div className="flex items-center gap-2.5">
            <div className="size-10 bg-[#f4f6ff] rounded-lg flex justify-center items-center text-[#707dff]">
              <Users className="size-4" />
            </div>
            <span className="font-heading font-bold text-[16px] leading-[24px] text-[#10133a]">
              Coordinator Details
            </span>
          </div>
          <button
            onClick={close}
            className="flex justify-center items-center size-7 bg-violet-50 rounded-lg outline outline-1 outline-offset-[-1px] outline-violet-100"
          >
            <X className="size-4 text-slate-400" />
          </button>
        </div>

        <div className="flex flex-col px-6 overflow-y-auto h-[calc(100dvh-73px)]">
          {loading || !detail ? (
            <CoordinatorDetailsSkeleton />
          ) : (
            <>
              {/* Profile Card */}
              <div className="flex items-center gap-[16px] py-[24px] border-b border-[#f0f2fa]">
                <div className="flex justify-center items-center size-14 rounded-full shrink-0 drop-shadow-[0_2px_6px_rgba(0,0,0,0.16)] bg-[#707dff]">
                  <span className="font-heading font-bold text-[19px] leading-[24px] text-white tracking-[0.57px]">
                    {getInitials(detail.name)}
                  </span>
                </div>
                <div className="flex flex-col gap-[6px] min-w-0">
                  <div className="flex items-center gap-[8px]">
                    <p className="font-heading font-bold text-[16px] leading-[24px] text-[#10133a] truncate">
                      {detail.name}
                    </p>
                    <span className="px-[9px] py-[3px] bg-[#f4f6ff] border border-[#e5e8ff] rounded-full font-sans font-semibold text-[10.5px] leading-[15.75px] text-[#707dff] whitespace-nowrap">
                      Coordinator
                    </span>
                  </div>
                  <p className="font-sans font-medium text-[12.5px] leading-[18.75px] text-[#8a93b4] truncate">
                    {detail.email}
                  </p>
                  <ActivityStatus status={detail.activityStatus} />
                </div>
              </div>

              {/* Totals */}
              <div className="grid grid-cols-2 gap-3 pt-[24px]">
                <div className="bg-[#f8f9fe] border border-[#eceef8] rounded-[12px] px-[14px] py-[12px]">
                  <p className="font-heading font-bold text-[20px] leading-[28px] text-[#10133a]">
                    {detail.totalStudents}
                  </p>
                  <p className="font-sans font-medium text-[11.5px] leading-[17.25px] text-[#8a93b4]">
                    {detail.totalStudents === 1
                      ? 'Student handled'
                      : 'Students handled'}
                  </p>
                </div>
                <div className="bg-[#f8f9fe] border border-[#eceef8] rounded-[12px] px-[14px] py-[12px]">
                  <p className="font-heading font-bold text-[20px] leading-[28px] text-[#10133a]">
                    {detail.sections.length}
                  </p>
                  <p className="font-sans font-medium text-[11.5px] leading-[17.25px] text-[#8a93b4]">
                    {detail.sections.length === 1
                      ? 'Section handled'
                      : 'Sections handled'}
                  </p>
                </div>
              </div>

              {/* Handled Sections */}
              <div className="flex flex-col gap-[16px] pt-[24px] pb-[24px]">
                <div className="flex items-center gap-[8px]">
                  <Layers className="size-4 text-[#707dff]" />
                  <span className="font-heading font-bold text-[13.5px] leading-[20.25px] text-[#10133a]">
                    Handled Sections
                  </span>
                  <span className="px-[8px] py-[2px] bg-[#f4f6ff] rounded-full font-sans font-bold text-[11px] leading-[16.5px] text-[#707dff]">
                    {detail.sections.length}
                  </span>
                </div>

                {detail.sections.length === 0 ? (
                  <p className="font-sans font-medium italic text-[12.5px] leading-[18.75px] text-[#c4cadf]">
                    No sections assigned
                  </p>
                ) : (
                  detail.sections.map((section) => (
                    <div
                      key={section.id}
                      className="flex items-center gap-[12px] bg-[#f8f9fe] border border-[#eceef8] rounded-[12px] px-[14px] py-[12px]"
                    >
                      <div className="flex justify-center items-center size-9 rounded-[10px] shrink-0 bg-[#707dff]">
                        <Layers className="size-4 text-white" />
                      </div>
                      <div className="flex flex-col flex-1 min-w-0">
                        <p className="font-sans font-bold text-[13px] leading-[19.5px] text-[#1e2145] truncate">
                          {section.name}
                        </p>
                        <p className="font-sans font-medium text-[11.5px] leading-[17.25px] text-[#8a93b4]">
                          {section.studentCount}{' '}
                          {section.studentCount === 1
                            ? 'student'
                            : 'students'}
                        </p>
                      </div>
                      <span className="px-[10px] py-[4px] bg-white border border-[#e5e8ff] rounded-full font-sans font-semibold text-[11px] leading-[16.5px] text-[#707dff] whitespace-nowrap">
                        {section.studentCount}{' '}
                        {section.studentCount === 1 ? 'member' : 'members'}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
