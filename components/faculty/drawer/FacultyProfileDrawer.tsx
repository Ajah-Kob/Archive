'use client'

import { useEffect, useState } from 'react'
import { Users, CalendarClock } from 'lucide-react'
import { toast } from 'sonner'
import { DrawerSkeleton } from '@/components/faculty/drawer/DrawerSkeleton'
import { ActivityStatus } from '@/components/ui/ActivityStatus'
import { Drawer } from '@/components/ui/Drawer'
import { useFacultyDrawer } from '@/store/useFacultyDrawer'
import { getInitials } from '@/lib/helper'
import { getFacultyMemberDetail } from '@/lib/actions/faculty'

export interface FacultyGroup {
  id: number
  name: string
  sectionLabel: string
  memberCount: number
}

interface FacultyDetail {
  id: number
  name: string
  email: string
  activityStatus: 'active' | string
  roles: string[]
  groups: FacultyGroup[]
  defenses?: { id: number }[]
}

const groupGradients = [
  'linear-gradient(135deg, #707dff 0%, #5062f5 60%, #3a52ef 100%)',
  'linear-gradient(135deg, #10b981 0%, #059669 60%, #047857 100%)',
  'linear-gradient(135deg, #f59e0b 0%, #e08800 60%, #c47a00 100%)',
  'linear-gradient(135deg, #fe6f6f 0%, #f87c7c 55%, #ff9e9e 100%)',
]

export function FacultyProfileDrawer() {
  const { isOpen, facultyId, close } = useFacultyDrawer()
  const [requestState, setRequestState] = useState<{
    requestKey: number | null
    detail: FacultyDetail | null
  }>({
    requestKey: null,
    detail: null,
  })

  useEffect(() => {
    if (!isOpen || !facultyId) return
    const requestKey = facultyId

    void getFacultyMemberDetail(requestKey).then((res) => {
      if (!res.success) toast.error(res.message)
      setRequestState({
        requestKey,
        detail: res.payload ?? null,
      })
    })
  }, [isOpen, facultyId])

  // Derive the active response so a new request starts in the loading state.
  const requestKey = facultyId
  const detail =
    requestKey != null && requestState.requestKey === requestKey
      ? requestState.detail
      : null
  const loading = requestKey != null && requestState.requestKey !== requestKey

  return (
    <Drawer open={isOpen} onClose={close} size="sm">
      <Drawer.Header
        title="Faculty Profile"
        subtitle="Faculty roles, assigned groups, and upcoming defenses."
      />
      <Drawer.Body>
        <div className="flex flex-col px-6">
          {loading || !detail ? (
            <DrawerSkeleton />
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
                    {detail.roles.length > 0 && (
                      <span className="px-[9px] py-[3px] bg-[#f4f6ff] border border-[#e5e8ff] rounded-full font-sans font-semibold text-[10.5px] leading-[15.75px] text-[#707dff] whitespace-nowrap">
                        {detail.roles.join(' · ')}
                      </span>
                    )}
                  </div>
                  <p className="font-sans font-medium text-[12.5px] leading-[18.75px] text-[#8a93b4] truncate">
                    {detail.email}
                  </p>
                  <ActivityStatus status={detail.activityStatus} />
                </div>
              </div>

              {/* Handled Groups */}
              <div className="flex flex-col gap-[16px] pt-[24px]">
                <div className="flex items-center gap-[8px]">
                  <Users className="size-4 text-[#707dff]" />
                  <span className="font-heading font-bold text-[13.5px] leading-[20.25px] text-[#10133a]">
                    Handled Groups
                  </span>
                  <span className="px-[8px] py-[2px] bg-[#f4f6ff] rounded-full font-sans font-bold text-[11px] leading-[16.5px] text-[#707dff]">
                    {detail.groups.length}
                  </span>
                </div>

                {detail.groups.length === 0 ? (
                  <p className="font-sans font-medium italic text-[12.5px] leading-[18.75px] text-[#c4cadf]">
                    No assigned groups
                  </p>
                ) : (
                  detail.groups.map((group, i) => (
                    <div
                      key={group.id}
                      className="flex items-center gap-[12px] bg-[#f8f9fe] border border-[#eceef8] rounded-[12px] px-[14px] py-[12px]"
                    >
                      <div
                        className="flex justify-center items-center size-9 rounded-[10px] shrink-0"
                        style={{
                          background: groupGradients[i % groupGradients.length],
                        }}
                      >
                        <Users className="size-4 text-white" />
                      </div>
                      <div className="flex flex-col flex-1 min-w-0">
                        <p className="font-sans font-bold text-[13px] leading-[19.5px] text-[#1e2145] truncate">
                          {group.name}
                        </p>
                        <p className="font-sans font-medium text-[11.5px] leading-[17.25px] text-[#8a93b4]">
                          {group.sectionLabel}
                        </p>
                      </div>
                      <span className="px-[10px] py-[4px] bg-white border border-[#e5e8ff] rounded-full font-sans font-semibold text-[11px] leading-[16.5px] text-[#707dff] whitespace-nowrap">
                        {group.memberCount}{' '}
                        {group.memberCount === 1 ? 'member' : 'members'}
                      </span>
                    </div>
                  ))
                )}
              </div>

              {/* Upcoming Defense — hidden until defense data exists */}
              {detail.defenses && detail.defenses.length > 0 && (
                <div className="flex flex-col gap-[16px] pt-[24px]">
                  <div className="flex items-center gap-[8px]">
                    <CalendarClock className="size-4 text-[#707dff]" />
                    <span className="font-heading font-bold text-[13.5px] leading-[20.25px] text-[#10133a]">
                      Upcoming Defense
                    </span>
                    <span className="px-[8px] py-[2px] bg-[#f4f6ff] rounded-full font-sans font-bold text-[11px] leading-[16.5px] text-[#707dff]">
                      {detail.defenses.length}
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </Drawer.Body>
    </Drawer>
  )
}
