'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { StudentsActionBar } from './StudentsActionBar'
import { RemoveStudentModal } from './RemoveStudentModal'
import { type FilterOption } from '@/components/ui/Filter'
import { StudentsTable, type StudentSortKey } from './StudentsTable'
import type { StudentData } from './StudentDataRow'

type GroupFilter = 'all' | 'none' | string

export function StudentList({ students }: { students: StudentData[] }) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<GroupFilter>('all')
  const [sortField, setSortField] = useState<StudentSortKey>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [confirmOpen, setConfirmOpen] = useState(false)

  const handleSort = (field: StudentSortKey) => {
    if (sortField !== field) {
      setSortField(field)
      setSortDir(field === 'activity' ? 'desc' : 'asc')
    } else {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    }
  }

  const groupNames = useMemo(
    () =>
      Array.from(
        new Set(
          students.map((s) => s.group?.name).filter((n) => !!n) as string[],
        ),
      ),
    [students],
  )

  const filterOptions = useMemo<FilterOption[]>(() => {
    const groups: FilterOption[] = groupNames.map((name, i) => ({
      value: name,
      label: name,
      dividerBefore: i === 0,
    }))
    return [
      { value: 'all', label: 'All Groups' },
      ...groups,
      { value: 'none', label: 'No Group', dividerBefore: true },
    ]
  }, [groupNames])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    const rows = students.filter((s) => {
      if (filter === 'none' && s.group) return false
      if (filter !== 'all' && filter !== 'none' && s.group?.name !== filter) {
        return false
      }
      if (
        term &&
        !s.name.toLowerCase().includes(term) &&
        !s.email.toLowerCase().includes(term)
      ) {
        return false
      }
      return true
    })

    rows.sort((a, b) => {
      let cmp = 0
      if (sortField === 'name') {
        cmp = a.name.localeCompare(b.name)
      } else if (sortField === 'group') {
        cmp = (a.group?.name ?? '').localeCompare(b.group?.name ?? '')
      } else {
        const ta = a.loggedInAt ? new Date(a.loggedInAt).getTime() : 0
        const tb = b.loggedInAt ? new Date(b.loggedInAt).getTime() : 0
        cmp = ta - tb
      }
      return sortDir === 'asc' ? cmp : -cmp
    })

    return rows
  }, [students, search, filter, sortField, sortDir])

  const selectedStudents = useMemo(
    () => students.filter((s) => selectedIds.has(s.id)),
    [students, selectedIds],
  )

  // Drives the mobile select-all checkbox in the page container.
  const allSelected = filtered.length > 0 && filtered.every((s) => selectedIds.has(s.id))
  const someSelected = filtered.some((s) => selectedIds.has(s.id))
  const toggleAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (allSelected) for (const id of filtered.map((s) => s.id)) next.delete(id)
      else for (const id of filtered.map((s) => s.id)) next.add(id)
      return next
    })
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <StudentsActionBar
        search={search}
        onSearchChange={setSearch}
        filter={filter}
        onFilterChange={setFilter}
        filterOptions={filterOptions}
      />

      {confirmOpen && (
        <RemoveStudentModal
          students={selectedStudents}
          onClose={() => setConfirmOpen(false)}
          onSuccess={() => {
            setConfirmOpen(false)
            setSelectedIds(new Set())
            router.refresh()
          }}
        />
      )}

      <div className="flex-1 min-h-0 px-4 py-4 sm:px-8 flex flex-col gap-[12px]">
        {/* Bulk controls sit above the table at every width. Select-all used to
          live in the table header and Delete in the toolbar; both are here now,
          so there is one place to reach them regardless of viewport. */}
      <div className="flex items-center gap-[12px] h-[32px]">
          <label className="flex items-center gap-[10px] cursor-pointer h-[32px]">
            <input
              type="checkbox"
              checked={allSelected}
              ref={(el) => {
                if (el) el.indeterminate = !allSelected && someSelected
              }}
              onChange={toggleAll}
              aria-label="Select all visible students"
              className="size-4 rounded border-[#dddff0] accent-[#707dff]"
            />
            <span className="font-sans font-bold text-[11px] leading-none text-[#9ea8c6] tracking-[0.88px] uppercase">
              Select all
            </span>
          </label>

          {/* No fill: the icon and label carry the red, so the control sits on the page
              rather than reading as another panel. ml-auto pins it right. */}
          {selectedIds.size > 0 && (
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              className="ml-auto flex h-[32px] items-center gap-[6px] rounded-[8px] px-[10px] font-sans font-bold text-[12.5px] leading-none text-[#ef4444] transition-colors hover:bg-[rgba(239,68,68,0.08)] active:bg-[rgba(239,68,68,0.14)] cursor-pointer"
            >
              <Trash2 className="size-[14px]" />
              Delete ({selectedIds.size})
            </button>
          )}
        </div>

        <div className="flex-1 min-h-0 flex flex-col">
          <StudentsTable
              students={filtered}
              emptyMessage={
                students.length === 0
                  ? 'No students in this section yet.'
                  : 'No students match your search or filter.'
              }
              sortField={sortField}
              sortDir={sortDir}
              onSort={handleSort}
              selectedIds={selectedIds}
              onToggle={(id) => {
                setSelectedIds((prev) => {
                  const next = new Set(prev)
                  if (next.has(id)) next.delete(id)
                  else next.add(id)
                  return next
                })
              }}
            />
        </div>
      </div>
    </div>
  )
}
