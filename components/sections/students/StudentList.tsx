'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { StudentsActionBar } from '@/components/my-sections/students/StudentsActionBar'
import { RemoveStudentModal } from '@/components/my-sections/students/RemoveStudentModal'
import { type FilterOption } from '@/components/ui/Filter'
import { StudentTable, type StudentSortKey } from './StudentTable'
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
        new Set(students.map((s) => s.group?.name).filter((n) => !!n) as string[]),
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

  return (
    <div className="flex flex-col gap-3 flex-1 min-h-0">
      <StudentsActionBar
        search={search}
        onSearchChange={setSearch}
        filter={filter}
        onFilterChange={setFilter}
        filterOptions={filterOptions}
        selectedCount={selectedIds.size}
        onDeleteClick={() => setConfirmOpen(true)}
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

      <div className="bg-white border border-[#eceef8] rounded-[14px] shadow-[0_4px_24px_rgba(112,125,255,0.08),0_1px_4px_rgba(0,0,0,0.04)] flex flex-col flex-1 min-h-0">
        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col">
          <StudentTable
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
            onToggleAll={() => {
              setSelectedIds((prev) => {
                const visibleIds = filtered.map((s) => s.id)
                const allSelected = visibleIds.every((id) => prev.has(id))
                if (allSelected) {
                  const next = new Set(prev)
                  for (const id of visibleIds) next.delete(id)
                  return next
                }
                return new Set([...prev, ...visibleIds])
              })
            }}
          />
        </div>
      </div>
    </div>
  )
}
