'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { UserProfile } from '@/components/ui/UserProfile'
import { ActivityStatus } from '@/components/ui/ActivityStatus'
import { EmptyState } from '@/components/ui/EmptyState'
import { ActionMenu } from '@/components/ui/ActionMenu'
import { RemoveCoordinatorModal } from '@/components/faculty/modal/RemoveCoordinatorModal'
import { removeCoordinator } from '@/lib/actions/coordinator'
import { ChevronUp, ChevronDown } from 'lucide-react'

export type SortKey = 'name' | 'activity' | 'sections'

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

export interface CoordinatorRow {
  id: number
  userId: number
  coordinatorId: number
  initials: string
  name: string
  email: string
  avatarGradient: string
  activityStatus: 'active' | string
  sectionsManaged: number
}

interface CoordinatorTableProps {
  coordinators: CoordinatorRow[]
  emptyMessage?: string
  onSelect: (facultyId: number) => void
  onRemoved: (facultyId: number) => void
  viewerUserId?: number | null
  sortField?: SortKey
  sortDir?: 'asc' | 'desc'
  onSort?: (field: SortKey) => void
}

export function CoordinatorTable({
  coordinators,
  emptyMessage = 'No coordinators found.',
  onSelect,
  onRemoved,
  viewerUserId = null,
  sortField,
  sortDir,
  onSort,
}: CoordinatorTableProps) {
  const [removing, setRemoving] = useState<CoordinatorRow | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleRemove = async () => {
    if (!removing) return
    setIsLoading(true)
    const result = await removeCoordinator(String(removing.coordinatorId))
    if (result.success) {
      toast.success(result.message)
      onRemoved(removing.id)
      setRemoving(null)
    } else {
      toast.error(result.message)
    }
    setIsLoading(false)
  }

  // Inline column template — guarantees the 4-column layout even if the
  // Tailwind scanner misses the arbitrary grid-cols utility.
  const gridTemplateColumns = '1fr 140px 110px 60px'

  return (
    <div className="w-full">
      {/* Header Row */}
      <div
        className="grid items-center px-[20px] h-[39px] bg-[#fafbff] border-b border-[#f0f2fa]"
        style={{ gridTemplateColumns }}
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
          field="sections"
          label="Sections"
          {...{ sortField, sortDir, onSort }}
        />
        <span />
      </div>

      {coordinators.length === 0 ? (
        <EmptyState
          heading="No Coordinators Found"
          description={emptyMessage}
          variant="table"
        />
      ) : (
        coordinators.map((coordinator) => (
          <div
            key={coordinator.id}
            role="button"
            tabIndex={0}
            aria-label={`View details for ${coordinator.name}`}
            onClick={() => onSelect(coordinator.id)}
            onKeyDown={(e) => {
              if (e.key !== 'Enter' && e.key !== ' ') return
              if ((e.target as HTMLElement).closest('button, a')) return
              e.preventDefault()
              onSelect(coordinator.id)
            }}
            className="grid w-full items-center px-[20px] h-[63px] border-b border-[#f0f2fa] text-left hover:bg-slate-50/40 transition-colors cursor-pointer"
            style={{ gridTemplateColumns }}
          >
            <span className="min-w-0 pr-4">
              <UserProfile
                initials={coordinator.initials}
                name={coordinator.name}
                email={coordinator.email}
                gradient={coordinator.avatarGradient}
                badge={
                  coordinator.userId === viewerUserId ? 'You' : undefined
                }
              />
            </span>
            <span className="pr-4">
              <ActivityStatus status={coordinator.activityStatus} />
            </span>
            <span className="pr-4">
              <span className="inline-flex items-center px-[10px] py-[4px] bg-[#f4f6ff] border border-[#e5e8ff] rounded-full font-sans font-semibold text-[11px] leading-[16.5px] text-[#707dff] whitespace-nowrap">
                {coordinator.sectionsManaged}{' '}
                {coordinator.sectionsManaged === 1 ? 'Section' : 'Sections'}
              </span>
            </span>
            <span
              className="flex justify-end"
              onClick={(e) => e.stopPropagation()}
            >
              <ActionMenu
                items={[
                  {
                    label: 'View Details',
                    onClick: () => onSelect(coordinator.id),
                  },
                  {
                    label: 'Remove Coordinator',
                    onClick: () => setRemoving(coordinator),
                    variant: 'danger',
                  },
                ]}
              />
            </span>
          </div>
        ))
      )}

      <RemoveCoordinatorModal
        isOpen={removing !== null}
        coordinatorName={removing?.name ?? ''}
        onConfirm={handleRemove}
        onCancel={() => setRemoving(null)}
        isLoading={isLoading}
      />
    </div>
  )
}
