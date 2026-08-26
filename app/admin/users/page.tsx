'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { UserPlus } from 'lucide-react'
import { PageLabel } from '@/components/globals/PageLabel'
import UsersToolbar, {
  type FiltersState,
} from '@/components/features/users/main/UsersToolbar'
import UsersTable, { type UserItem } from '@/components/features/users/main/UsersTable'
import AddUserModal from '@/components/features/users/modal/AddUserModal'
import EditUserModal from '@/components/features/users/modal/EditUserModal'
import DeleteUserModal from '@/components/features/users/modal/DeleteUserModal'
import ConfirmChairModal from '@/components/features/users/modal/ConfirmChairModal'
import { getUsers } from '@/lib/actions/user'

export default function DashboardUsersPage() {
  const { data: session } = useSession()

  const [users, setUsers] = useState<UserItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<FiltersState>({
    searchTerm: '',
    roleFilter: '',
    dateFrom: '',
    dateTo: '',
    perPage: 10,
  })
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [sortField, setSortField] = useState('id')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  // Modal state
  const [modal, setModal] = useState<'add' | 'edit' | null>(null)
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<UserItem | null>(null)
  const [chairConfirmTarget, setChairConfirmTarget] = useState<UserItem | null>(
    null,
  )

  const scrollContainerRef = useRef<HTMLDivElement | null>(null)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  const mapUser = useCallback(
    (u: any): UserItem => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      isProgramChair: u.faculty?.isProgramChair ?? false,
      createdAt: new Date(u.createdAt).toLocaleDateString(),
    }),
    [],
  )

  const fetchPage = useCallback(
    async (
      p: number,
      opts?: {
        append?: boolean
        search?: string
        role?: string
        df?: string
        dt?: string
        pp?: number
        sf?: string
        sd?: string
      },
    ) => {
      const s = opts?.search ?? filters.searchTerm
      const r = opts?.role ?? filters.roleFilter
      const df = opts?.df ?? filters.dateFrom
      const dt = opts?.dt ?? filters.dateTo
      const pp = opts?.pp ?? filters.perPage
      const sf = opts?.sf ?? sortField
      const sd = opts?.sd ?? sortDir

      if (p === 1) setLoading(true)
      else setLoadingMore(true)

      try {
        const res = await getUsers(p, pp, s, r, df, dt, sf, sd)
        if (res.success) {
          const mapped = (res.payload ?? []).map(mapUser)
          if (opts?.append) {
            setUsers((prev) => [...prev, ...mapped])
          } else {
            setUsers(mapped)
          }
          setTotalPages(res.totalPages ?? 1)
          setTotal(res.total ?? 0)
          setError(null)
        } else {
          setError(res.message ?? 'Failed to load users')
        }
      } catch {
        setError('Failed to load users')
      } finally {
        if (p === 1) setLoading(false)
        else setLoadingMore(false)
      }
    },
    [
      filters.searchTerm,
      filters.roleFilter,
      filters.dateFrom,
      filters.dateTo,
      filters.perPage,
      sortField,
      sortDir,
      mapUser,
    ],
  )

  // Fetch on filter/sort changes
  useEffect(() => {
    setPage(1)
    fetchPage(1)
  }, [
    filters.searchTerm,
    filters.roleFilter,
    filters.dateFrom,
    filters.dateTo,
    filters.perPage,
    sortField,
    sortDir,
    fetchPage,
  ])

  // Infinite scroll
  const hasMore = page < totalPages

  const loadMore = useCallback(async () => {
    if (loadingMore || loading || !hasMore) return
    const nextPage = page + 1
    setPage(nextPage)
    await fetchPage(nextPage, { append: true })
  }, [loadingMore, loading, hasMore, page, fetchPage])

  useEffect(() => {
    const sentinel = sentinelRef.current
    const scrollContainer = scrollContainerRef.current
    if (!sentinel || !scrollContainer) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) loadMore()
      },
      { root: scrollContainer, threshold: 0.1 },
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [loadMore])

  function handleSort(field: string) {
    setSortDir((prev) =>
      sortField === field ? (prev === 'asc' ? 'desc' : 'asc') : 'asc',
    )
    setSortField(field)
  }

  function openAddUserModal() {
    setModal('add')
  }

  function openEditUserModal(user: UserItem) {
    setSelectedUser(user)
    setModal('edit')
  }

  function closeModal() {
    setModal(null)
    setSelectedUser(null)
  }

  const canManage =
    session?.user?.role === 'SUPERADMIN' || session?.user?.role === 'ADMIN'
  const isSuperadmin = session?.user?.role === 'SUPERADMIN'

  return (
    <div className="flex flex-col w-full gap-5 h-full">
      <PageLabel label="Users" />
      <div className="flex flex-col gap-[12px]">
        <div className="flex">
          <div className="flex flex-col w-full gap-1">
            <h1 className="font-heading font-bold text-[26px] leading-[20.25px] text-[#10133a] tracking-[-0.135px]">
              Users
            </h1>
            <p className="font-sans font-medium text-[13.5px] text-[#8a93b4]">
              Manage user accounts, roles, and faculty program chair
              assignments.
            </p>
          </div>
          {canManage && (
            <button
              type="button"
              onClick={openAddUserModal}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-br from-[#707dff] via-[#707dff] to-[#5555ff] bg-[length:200%_200%] bg-[position:0%_0%] hover:bg-[position:100%_100%] text-white rounded-xl text-sm font-semibold transition-all duration-500 shadow-sm hover:shadow-md hover:shadow-indigo-500/20 active:scale-95 shrink-0"
            >
              <UserPlus size={16} />
              <span>Add User</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-[10px] flex-1 min-h-px">
        <UsersToolbar filters={filters} onFilterChange={setFilters} />

        <span className="text-[13px] font-semibold text-[#6b7399] pl-[5px]">
          {total > 0 ? `${total} result${total !== 1 ? 's' : ''}` : ''}
        </span>

        <UsersTable
          users={users}
          error={loading ? null : error}
          loading={loading}
          loadingMore={loadingMore}
          isEmpty={
            !loading &&
            users.length === 0 &&
            !filters.searchTerm &&
            !filters.roleFilter
          }
          sortField={sortField}
          sortDir={sortDir}
          onSort={handleSort}
          scrollContainerRef={scrollContainerRef}
          sentinelRef={sentinelRef}
          getRowActions={(item) => {
            const actions: any[] = [
              { label: 'Edit', onClick: () => openEditUserModal(item) },
            ]

            if (isSuperadmin) {
              if (item.role === 'FACULTY') {
                actions.push({
                  label: item.isProgramChair
                    ? 'Remove as Chair'
                    : 'Set as Chair',
                  onClick: () => setChairConfirmTarget(item),
                })
              }

              actions.push({
                label: 'Delete',
                variant: 'danger' as const,
                onClick: () => setDeleteTarget(item),
              })
            }

            return actions
          }}
        />
      </div>

      <AddUserModal
        isOpen={modal === 'add'}
        onClose={closeModal}
        onSuccess={() => fetchPage(1)}
      />

      <EditUserModal
        user={selectedUser}
        onClose={closeModal}
        onSuccess={() => fetchPage(1)}
      />

      <DeleteUserModal
        user={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onSuccess={() => fetchPage(1)}
      />

      <ConfirmChairModal
        user={chairConfirmTarget}
        onClose={() => setChairConfirmTarget(null)}
        onSuccess={() => fetchPage(1)}
      />
    </div>
  )
}
