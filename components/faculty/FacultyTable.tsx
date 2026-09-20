'use client'

import { ChevronUp, ChevronDown } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import { UserProfile } from '@/components/ui/UserProfile'
import { ActionMenu } from '@/components/ui/ActionMenu'
import { ActivityStatus } from '../ui/ActivityStatus'
import { Workload } from './Workload'

export type SortKey = 'name' | 'activity' | 'workload'

function SortHeader({
  field,
  label,
  sortField,
  sortDir,
  onSort,
}: {
  field: SortKey
  label: string
  sortField?: SortKey
  sortDir?: 'asc' | 'desc'
  onSort?: (field: SortKey) => void
}) {
  return (
    <div
      className="flex items-center gap-1 cursor-pointer select-none font-sans font-bold text-[11px] leading-[16.5px] text-[#9ea8c6] tracking-[0.88px] uppercase"
      onClick={() => onSort?.(field)}
    >
      {label}
      {sortField === field ? (
        sortDir === 'asc' ? (
          <ChevronUp size={12} />
        ) : (
          <ChevronDown size={12} />
        )
      ) : (
        <ChevronUp size={12} className="opacity-50" />
      )}
    </div>
  )
}

export interface FacultyMember {
  id: number
  userId: number
  initials: string
  name: string
  email: string
  avatarGradient: string
  activityStatus: 'active' | string
  workload: { current: number; max: number }
  isCoordinator: boolean
  sectionsManaged: number
}

interface FacultyTableProps {
  faculty: FacultyMember[]
  emptyMessage?: string
  sortField?: SortKey
  sortDir?: 'asc' | 'desc'
  onSort?: (field: SortKey) => void
  onViewDetails: (member: FacultyMember) => void
  onRemove: (member: FacultyMember) => void
  manageMode?: boolean
  viewerUserId?: number | null
}

export function FacultyTable({
  faculty,
  emptyMessage = 'No faculty found.',
  sortField,
  sortDir,
  onSort,
  onViewDetails,
  onRemove,
  manageMode = true,
  viewerUserId = null,
}: FacultyTableProps) {
  const gridCols = 'grid-cols-[2fr_1fr_1fr_150px]'

  return (
    <div className="w-full flex flex-col flex-1 min-h-0">
      {/* Header Row */}
      <div
        className={`grid ${gridCols} items-center px-[20px] h-[39px] bg-[#fafbff] border-b border-[#f0f2fa]`}
      >
        <SortHeader
          field="name"
          label="Name"
          {...{ sortField, sortDir, onSort }}
        />
        <SortHeader
          field="activity"
          label="Activity"
          {...{ sortField, sortDir, onSort }}
        />
        <SortHeader
          field="workload"
          label="Workload"
          {...{ sortField, sortDir, onSort }}
        />
        <div />
      </div>

      {faculty.length === 0 ? (
        <EmptyState heading="No Faculty Found" description={emptyMessage} variant="table" />
      ) : (
        faculty.map((member) => (
          <div
            key={member.id}
            className={`grid ${gridCols} items-center px-[20px] h-[63px] border-b border-[#f0f2fa] hover:bg-slate-50/40 transition-colors`}
          >
            <div className="min-w-0 pr-4">
              <UserProfile
                initials={member.initials}
                name={member.name}
                email={member.email}
                gradient={member.avatarGradient}
                badge={member.userId === viewerUserId ? 'You' : undefined}
              />
            </div>
            <div className="pr-4">
              <ActivityStatus status={member.activityStatus} />
            </div>
            <div className="pr-4">
              <Workload
                current={member.workload.current}
                max={member.workload.max}
              />
            </div>
            <div className="flex justify-end">
              <ActionMenu
                items={[
                  {
                    label: 'View Details',
                    onClick: () => onViewDetails(member),
                  },
                  ...(manageMode
                    ? [
                        {
                          label: 'Remove Faculty',
                          onClick: () => onRemove(member),
                          variant: 'danger' as const,
                        },
                      ]
                    : []),
                ]}
              />
            </div>
          </div>
        ))
      )}
    </div>
  )
}
