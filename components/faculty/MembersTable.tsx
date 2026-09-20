'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { UserProfile } from '@/components/ui/UserProfile'
import { ActivityStatus } from '@/components/ui/ActivityStatus'
import { EmptyState } from '@/components/ui/EmptyState'
import { ActionMenu } from '@/components/ui/ActionMenu'
import { RemoveFacultyModal } from '@/components/faculty/modal/RemoveFacultyModal'
import { removeFaculty } from '@/lib/actions/faculty'
import { ChevronUp, ChevronDown } from 'lucide-react'

export type SortKey = 'name' | 'activity'

export interface MemberRow {
  id: number
  userId: number
  initials: string
  name: string
  email: string
  avatarGradient: string
  activityStatus: 'active' | string
}

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

interface MembersTableProps {
  members: MemberRow[]
  emptyMessage?: string
  onSelect: (facultyId: number) => void
  onRemoved: (facultyId: number) => void
  viewerUserId?: number | null
  sortField?: SortKey
  sortDir?: 'asc' | 'desc'
  onSort?: (field: SortKey) => void
}

// Inline column template — guarantees the 3-column layout even if the
// Tailwind scanner misses the arbitrary grid-cols utility.
const gridTemplateColumns = '1fr 140px 60px'

export function MembersTable({
  members,
  emptyMessage = 'No members found.',
  onSelect,
  onRemoved,
  viewerUserId = null,
  sortField,
  sortDir,
  onSort,
}: MembersTableProps) {
  const [removing, setRemoving] = useState<MemberRow | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleRemove = async () => {
    if (!removing) return
    setIsLoading(true)
    const res = await removeFaculty(removing.id)
    if (res.success) {
      toast.success(res.message)
      onRemoved(removing.id)
      setRemoving(null)
    } else {
      toast.error(res.message)
    }
    setIsLoading(false)
  }

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
        <span />
      </div>

      {members.length === 0 ? (
        <EmptyState
          heading="No Members Found"
          description={emptyMessage}
          variant="table"
        />
      ) : (
        members.map((member) => (
          <div
            key={member.id}
            role="button"
            tabIndex={0}
            aria-label={`View details for ${member.name}`}
            onClick={() => onSelect(member.id)}
            onKeyDown={(e) => {
              if (e.key !== 'Enter' && e.key !== ' ') return
              if ((e.target as HTMLElement).closest('button, a')) return
              e.preventDefault()
              onSelect(member.id)
            }}
            className="grid w-full items-center px-[20px] h-[63px] border-b border-[#f0f2fa] text-left hover:bg-slate-50/40 transition-colors cursor-pointer"
            style={{ gridTemplateColumns }}
          >
            <span className="min-w-0 pr-4">
              <UserProfile
                initials={member.initials}
                name={member.name}
                email={member.email}
                gradient={member.avatarGradient}
                badge={member.userId === viewerUserId ? 'You' : undefined}
              />
            </span>
            <span className="pr-4">
              <ActivityStatus status={member.activityStatus} />
            </span>
            <span
              className="flex justify-end"
              onClick={(e) => e.stopPropagation()}
            >
              <ActionMenu
                items={[
                  {
                    label: 'Remove Faculty',
                    onClick: () => setRemoving(member),
                    variant: 'danger',
                  },
                ]}
              />
            </span>
          </div>
        ))
      )}

      <RemoveFacultyModal
        isOpen={removing !== null}
        memberName={removing?.name ?? ''}
        memberEmail={removing?.email ?? ''}
        isLoading={isLoading}
        onConfirm={handleRemove}
        onCancel={() => setRemoving(null)}
      />
    </div>
  )
}
