'use client'

import { AlertCircle, Users, ChevronUp, ChevronDown } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import { ActionMenu, type ActionItem } from '@/components/ui/ActionMenu'
import UsersTableSkeleton from './UsersTableSkeleton'
import { useRef, RefObject } from 'react'
import { useSession } from 'next-auth/react'

export interface UserItem {
  id: number
  name: string
  email: string
  role: string
  isProgramChair: boolean
  createdAt: string
}

interface UsersTableProps {
  users: UserItem[]
  error?: string | null
  loading?: boolean
  loadingMore?: boolean
  isEmpty?: boolean
  hasMore?: boolean
  getRowActions?: (item: UserItem) => ActionItem[]
  sortField?: string
  sortDir?: 'asc' | 'desc'
  onSort?: (field: string) => void
  scrollContainerRef?: RefObject<HTMLDivElement | null>
  sentinelRef?: RefObject<HTMLDivElement | null>
}

function UserAvatar({ name }: { name: string }) {
  const initial = name.charAt(0).toUpperCase()
  return (
    <div
      className="size-[24px] rounded-[12px] flex items-center justify-center shrink-0"
      style={{
        backgroundImage:
          'linear-gradient(135deg, rgb(112,125,255), rgb(85,101,255))',
      }}
    >
      <span className="text-[9px] font-bold text-white leading-none">
        {initial}
      </span>
    </div>
  )
}

function RoleBadge({ role }: { role: string }) {
  const styles: Record<string, string> = {
    SUPERADMIN: 'bg-[#707dff] text-white',
    ADMIN: 'bg-[#f0f2fa] text-[#3d4566]',
    FACULTY: 'bg-[#e8f4fd] text-[#1a6fa8]',
    STUDENT: 'bg-[#e8fce8] text-[#15803d]',
    GUEST: 'bg-[#f5f5f5] text-[#737373]',
  }
  return (
    <span
      className={`inline-block text-[11px] font-semibold px-[10px] py-[4px] rounded-full tracking-wide ${styles[role] ?? 'bg-[#f0f2fa] text-[#3d4566]'}`}
    >
      {role}
    </span>
  )
}

function SortHeader({
  field,
  label,
  sortField,
  sortDir,
  onSort,
}: {
  field: string
  label: string
  sortField?: string
  sortDir?: 'asc' | 'desc'
  onSort?: (field: string) => void
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

const GRID_COLS = 'grid-cols-[50px_1fr_1fr_140px_110px_110px_80px]'

export default function UsersTable({
  users,
  error,
  loading,
  loadingMore,
  isEmpty,
  getRowActions,
  sortField,
  sortDir,
  onSort,
  scrollContainerRef,
  sentinelRef,
}: UsersTableProps) {
  const { data: session } = useSession()

  if (loading) {
    return <UsersTableSkeleton />
  }
  
  {/*Returns Error */}
  if (error) {
    return (
      <div className="bg-white border border-[#e8ebf8] rounded-[14px] shadow-[0_2px_12px_rgba(30,58,138,0.06),0_1px_3px_rgba(0,0,0,0.04)]">
        <EmptyState
          icon={<AlertCircle size={24} className="text-red-500" />}
          heading="Failed to Load Users"
          description={error}
        />
      </div>
    )
  }

  return (
    <>
      <style>{`
        .users-grid-scroll::-webkit-scrollbar {
          width: 5px;
          height: 5px;
        }
        .users-grid-scroll::-webkit-scrollbar-track {
          background: #f0f2fa;
          border-radius: 999px;
        }
        .users-grid-scroll::-webkit-scrollbar-thumb {
          background: #c8cde0;
          border-radius: 999px;
        }
        .users-grid-scroll::-webkit-scrollbar-thumb:hover {
          background: #a8aec8;
        }
        .users-grid-scroll {
          overflow-y: auto;
          scrollbar-gutter: stable;
          scrollbar-width: thin;
          scrollbar-color: #c8cde0 #f0f2fa;
        }
        .header-grid-gutter {
          overflow-y: auto;
          overflow-x: hidden;
          scrollbar-gutter: stable;
          scrollbar-width: thin;
          -ms-overflow-style: none;
        }
        .header-grid-gutter::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      <div className="bg-white border border-[#e8ebf8] rounded-[14px] shadow-[0_2px_12px_rgba(30,58,138,0.06),0_1px_3px_rgba(0,0,0,0.04)] flex flex-col flex-1 min-h-0">
        {/* Header row */}
        <div className="bg-[#f8f9fe] rounded-t-[14px] shrink-0 header-grid-gutter">
          <div
            className={`grid ${GRID_COLS} px-[20px] py-[10px] border-b border-[#eceef8] items-center`}
          >
            <SortHeader
              field="id"
              label="ID"
              {...{ sortField, sortDir, onSort }}
            />
            <SortHeader
              field="name"
              label="Name"
              {...{ sortField, sortDir, onSort }}
            />
            <SortHeader
              field="email"
              label="Email"
              {...{ sortField, sortDir, onSort }}
            />
            <SortHeader
              field="role"
              label="Role"
              {...{ sortField, sortDir, onSort }}
            />
            <SortHeader
              field="chair"
              label="Chair"
              {...{ sortField, sortDir, onSort }}
            />
            <SortHeader
              field="createdAt"
              label="Created"
              {...{ sortField, sortDir, onSort }}
            />
            <div></div>
          </div>
        </div>

        {users.length === 0 ? (
          <div className="flex-1 min-h-0 flex items-center justify-center">
            {isEmpty ? (
              <EmptyState
                icon={<Users size={24} className="text-slate-400" />}
                heading="No users yet"
                description="Users will appear here once they sign up."
              />
            ) : (
              <EmptyState
                icon={<Users size={24} className="text-slate-400" />}
                heading="No users found"
                description="We couldn't find any users matching your current search or filter."
              />
            )}
          </div>
        ) : (
          <div
            ref={scrollContainerRef}
            className="overflow-x-auto flex-1 min-h-0 users-grid-scroll"
          >
            {users.map((item) => (
              <div
                key={item.id}
                className={`grid ${GRID_COLS} px-[20px] h-[52px] items-center border-b border-[#f0f2fa] hover:bg-slate-50/40 transition-colors`}
              >
                <span className="text-[12.5px] font-medium text-[#9ea8c6]">
                  {item.id}
                </span>
                <div className="flex items-center gap-[12px] min-w-0">
                  <UserAvatar name={item.name} />
                  <span className="text-[13px] font-semibold text-[#1e2145] truncate">
                    {item.name}
                  </span>
                  {session?.user?.email && item.email === session.user.email && (
                    <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded-md leading-none">
                      Me
                    </span>
                  )}
                </div>
                <span className="text-[12.5px] font-medium text-[#6b7399] truncate">
                  {item.email}
                </span>
                <div>
                  <RoleBadge role={item.role} />
                </div>
                <span className="text-[12.5px] font-medium text-[#6b7399] whitespace-nowrap">
                  {item.isProgramChair ? (
                    <span className="text-emerald-600 font-semibold">Yes</span>
                  ) : (
                    <span className="text-[#9ea8c6]">—</span>
                  )}
                </span>
                <span className="text-[12.5px] font-medium text-[#9ea8c6] whitespace-nowrap">
                  {item.createdAt}
                </span>
                <div className="flex justify-end">
                  {getRowActions && <ActionMenu items={getRowActions(item)} />}
                </div>
              </div>
            ))}
            <div ref={sentinelRef} className="h-px" />
            {loadingMore && (
              <div className="flex items-center justify-center py-4">
                <div className="size-5 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
