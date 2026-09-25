'use client'

import { HeaderBar } from '@/components/globals/HeaderBar'
import { SearchBar } from '@/components/ui/SearchBar'
import { Filter } from '@/components/ui/Filter'
import { AppDateRangePicker } from '@/components/ui/AppDateRangePicker'

export const ACTION_OPTIONS = [
  { value: '', label: 'All actions' },
  { value: 'ARCHIVE_PUBLISH', label: 'Archive Publish' },
  { value: 'ARCHIVE_REMOVE', label: 'Archive Remove' },
  { value: 'ARCHIVE_UPDATE', label: 'Archive Update' },
  { value: 'ARCHIVING_APPROVE', label: 'Archiving Approve' },
  { value: 'ARCHIVING_SUBMIT', label: 'Archiving Submit' },
  { value: 'CALENDAR_CREATE', label: 'Calendar Create' },
  { value: 'CALENDAR_DELETE', label: 'Calendar Delete' },
  { value: 'CALENDAR_UPDATE', label: 'Calendar Update' },
  { value: 'CHAPTER_RESUBMIT', label: 'Chapter Resubmit' },
  { value: 'CHAPTER_REVIEW', label: 'Chapter Review' },
  { value: 'CHAPTER_SUBMIT', label: 'Chapter Submit' },
  { value: 'COORDINATOR_ASSIGN', label: 'Coordinator Assign' },
  { value: 'DEFENSE_SCHEDULE_CREATE', label: 'Defense Create' },
  { value: 'DEFENSE_SCHEDULE_DELETE', label: 'Defense Delete' },
  { value: 'DEFENSE_SCHEDULE_UPDATE', label: 'Defense Update' },
  { value: 'DEFENSE_VERDICT', label: 'Defense Verdict' },
  { value: 'GROUP_CREATE', label: 'Group Create' },
  { value: 'GROUP_JOIN', label: 'Group Join' },
  { value: 'GROUP_LEAVE', label: 'Group Leave' },
  { value: 'GROUP_REMOVE_MEMBER', label: 'Group Remove' },
  { value: 'GROUP_TRANSFER', label: 'Group Transfer' },
  { value: 'SECTION_ARCHIVE', label: 'Section Archive' },
  { value: 'SECTION_COORDINATOR_REASSIGN', label: 'Section Coordinator Reassign' },
  { value: 'SECTION_CREATE', label: 'Section Create' },
  { value: 'SECTION_REMOVE', label: 'Section Remove (Legacy)' },
  { value: 'SECTION_UPDATE', label: 'Section Update' },
  { value: 'TEMPLATE_DELETE', label: 'Template Delete' },
  { value: 'TEMPLATE_UPLOAD', label: 'Template Upload' },
  { value: 'USER_CREATE', label: 'User Create' },
  { value: 'USER_ROLE_UPDATE', label: 'User Role Update' },
  { value: 'USER_SOFT_DELETE', label: 'User Delete' },
  { value: 'USER_UPDATE', label: 'User Update' },
] as const

export const ENTITY_OPTIONS = [
  { value: '', label: 'All entities' },
  { value: 'ARCHIVE', label: 'Archive' },
  { value: 'ARCHIVING', label: 'Archiving' },
  { value: 'CALENDAR', label: 'Calendar' },
  { value: 'CHAPTER', label: 'Chapter' },
  { value: 'DEFENSE_SCHEDULE', label: 'Defense' },
  { value: 'GROUP', label: 'Group' },
  { value: 'SECTION', label: 'Section' },
  { value: 'TEMPLATE', label: 'Template' },
  { value: 'USER', label: 'User' },
] as const

interface AuditFiltersProps {
  actor: string
  onActorChange: (value: string) => void
  actionValue: string
  onActionChange: (value: string) => void
  entityValue: string
  onEntityChange: (value: string) => void
  start: Date | null
  end: Date | null
  onStartChange: (value: Date | null) => void
  onEndChange: (value: Date | null) => void
}

export function AuditFilters({
  actor,
  onActorChange,
  actionValue,
  onActionChange,
  entityValue,
  onEntityChange,
  start,
  end,
  onStartChange,
  onEndChange,
}: AuditFiltersProps) {
  return (
    <HeaderBar
      actions={
        <div className="w-[320px] max-w-full shrink-0">
          <AppDateRangePicker
            start={start}
            end={end}
            onStartChange={onStartChange}
            onEndChange={onEndChange}
          />
        </div>
      }
    >
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="w-[280px] shrink-0 py-[8px]">
          <SearchBar
            value={actor}
            onChange={onActorChange}
            placeholder="Search actor (name or email)..."
            ariaLabel="Search actor"
            clearable
          />
        </div>
        <Filter
          value={actionValue}
          options={ACTION_OPTIONS}
          onChange={onActionChange}
          ariaLabel="Filter by action"
        />
        <Filter
          value={entityValue}
          options={ENTITY_OPTIONS}
          onChange={onEntityChange}
          ariaLabel="Filter by entity"
        />
      </div>
    </HeaderBar>
  )
}

export default AuditFilters
