'use client'

import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { SearchBar } from '@/components/ui/SearchBar'
import { Filter, type FilterOption } from '@/components/ui/Filter'
import { StudentTable, type StudentSortKey } from './StudentTable'
import type { StudentData } from './StudentDataRow'

type GroupFilter = 'all' | 'none' | string

export function StudentList({
  students,
  renderActions,
}: {
  students: StudentData[]
  renderActions?: (student: StudentData) => ReactNode
}) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<GroupFilter>('all')
  const [sortField, setSortField] = useState<StudentSortKey>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const handleSort = (field: StudentSortKey) => {
    if (sortField !== field) {
      setSortField(field)
      setSortDir(field === 'name' ? 'asc' : 'desc')
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
      } else {
        const ta = a.loggedInAt ? new Date(a.loggedInAt).getTime() : 0
        const tb = b.loggedInAt ? new Date(b.loggedInAt).getTime() : 0
        cmp = ta - tb
      }
      return sortDir === 'asc' ? cmp : -cmp
    })

    return rows
  }, [students, search, filter, sortField, sortDir])

  return (
    <div className="bg-white border border-[#eceef8] rounded-[14px] shadow-[0_4px_24px_rgba(112,125,255,0.08),0_1px_4px_rgba(0,0,0,0.04)] flex flex-col flex-1 min-h-0">
      <div className="flex items-center gap-2.5 pb-[15px] pt-[14px] px-5 border-b border-[#f0f2fa] shrink-0">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search students…"
          ariaLabel="Search students"
          className="flex-[0_0_320px] max-w-[320px] min-w-[180px]"
        />

        <Filter
          value={filter}
          options={filterOptions}
          onChange={setFilter}
          ariaLabel="Filter by group"
        />
      </div>

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
          renderActions={renderActions}
        />
      </div>
    </div>
  )
}
