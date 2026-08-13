'use client'

import { ChevronUp, ChevronDown } from 'lucide-react'
import { UserProfile } from '@/components/ui/UserProfile'
import { ActionMenu } from '@/components/ui/ActionMenu'
import { ActivityStatus } from '../ui/ActivityStatus'
import { Workload } from './Workload'

export type SortKey = 'name' | 'activity' | 'workload' | 'coordinator'

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
      className="flex items-center gap-1 cursor-pointer select-none text-[11px] font-bold text-[#9ea8c6] tracking-[0.88px] uppercase"
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
  const gridCols = manageMode
    ? 'grid-cols-[2fr_1fr_1fr_1fr_150px]'
    : 'grid-cols-[2fr_1fr_1fr_150px]'

  return (
    <div className="w-full">
      {/* Header Row */}
      <div
        className={`grid ${gridCols} items-center px-[20px] h-[39px] bg-[#fafbff] border-b border-[#f0f2fa]`}
      >
        <SortHeader
          field="name"
          label="Adviser"
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
        {manageMode && (
          <SortHeader
            field="coordinator"
            label="Coordinator"
            {...{ sortField, sortDir, onSort }}
          />
        )}
        <div />
      </div>

      {faculty.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-10 py-16 w-full">
          <h3 className="font-heading font-bold text-[14px] leading-[21px] text-[#3d4566] tracking-[-0.14px] text-center mb-1">
            No Faculty Found
          </h3>
          <p className="font-sans font-medium text-[12.5px] leading-[20px] text-[#8a93b4] text-center max-w-[340px]">
            {emptyMessage}
          </p>
        </div>
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
            {manageMode && (
              <div className="pr-4">
                {member.isCoordinator ? (
                  <span className="inline-flex items-center px-[10px] py-[4px] bg-[#f4f6ff] border border-[#e5e8ff] rounded-full font-sans font-semibold text-[11px] leading-[16.5px] text-[#707dff] whitespace-nowrap">
                    {member.sectionsManaged}{' '}
                    {member.sectionsManaged === 1 ? 'Section' : 'Sections'}
                  </span>
                ) : (
                  <span className="font-sans font-medium italic text-[12.5px] leading-[18.75px] text-[#c4cadf]">
                    Not assigned as coordinator
                  </span>
                )}
              </div>
            )}
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
