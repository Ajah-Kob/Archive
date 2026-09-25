'use client'

import { useMemo, useState } from 'react'
import { UserPlus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { UserProfile } from '@/components/ui/UserProfile'
import { AssignCoordinatorConfirmationModal } from '@/components/faculty/modal/AssignCoordinatorConfirmationModal'
import { assignCoordinatorRole } from '@/lib/actions/coordinator'

interface Faculty {
  id: number
  initials: string
  name: string
  email: string
  gradient: string
  isProgramChair: boolean
}

interface AvailableFacultyListProps {
  data: Faculty[]
}

export function AvailableFacultyList({ data = [] }: AvailableFacultyListProps) {
  const [assignedIds, setAssignedIds] = useState<Set<number>>(() => new Set())
  const [confirmingAssign, setConfirmingAssign] = useState<number | null>(null)
  const [loading, setLoading] = useState<number | null>(null)

  const availableFaculty = useMemo(
    () => data.filter((faculty) => !assignedIds.has(faculty.id)),
    [assignedIds, data],
  )
  const confirmingFaculty = data.find(
    (faculty) => faculty.id === confirmingAssign,
  )

  const handleAssign = async (facultyId: number) => {
    if (loading !== null) return
    setLoading(facultyId)
    try {
      const result = await assignCoordinatorRole(facultyId)
      if (result.success) {
        setAssignedIds((current) => new Set(current).add(facultyId))
        toast.success(result.message)
      } else {
        toast.error(result.message)
      }
    } catch {
      toast.error('Failed to assign coordinator role.')
    } finally {
      setLoading(null)
      setConfirmingAssign(null)
    }
  }

  return (
    <div className="flex flex-col gap-2 py-5 items-start w-full">
      <div className="flex items-center pb-1 gap-2">
        <span className="text-blue-900 text-xs font-bold font-['Sora'] leading-5">
          Available Faculty
        </span>
        <div className="flex px-3 py-0.5 items-center bg-slate-100 rounded-[20px] outline outline-1 outline-offset-[-1px] outline-violet-100">
          <span className="text-slate-500 text-xs font-bold font-['Plus_Jakarta_Sans'] leading-4">
            {availableFaculty.length}
          </span>
        </div>
      </div>

      {availableFaculty.length === 0 ? (
        <div className="w-full bg-white border border-dashed border-[#e8ebf8] rounded-xl px-4 py-6 flex items-center justify-center">
          <span className="text-[13px] font-medium text-[#8a93b4]">
            No faculty available
          </span>
        </div>
      ) : (
        availableFaculty.map((faculty) => {
          const isLoading = loading === faculty.id

          return (
            <div
              key={faculty.id}
              className="w-full bg-white border border-[#e8ebf8] rounded-xl"
            >
              <div className="flex items-center gap-3 px-[15px] py-[13px]">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <UserProfile
                      initials={faculty.initials}
                      name={faculty.name}
                      email={faculty.email}
                      gradient={faculty.gradient}
                    />
                  </div>
                  {faculty.isProgramChair ? (
                    <span className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full border border-slate-200 bg-slate-100 px-2 py-1 font-sans text-[10px] font-semibold leading-none text-slate-600">
                      Program Chair
                    </span>
                  ) : null}
                </div>

                <button
                  type="button"
                  onClick={() => setConfirmingAssign(faculty.id)}
                  disabled={isLoading || loading !== null}
                  className="flex gap-[6px] items-center px-3 py-[7px] rounded-lg drop-shadow-[0_2px_3px_rgba(112,125,255,0.19)] shrink-0 disabled:cursor-not-allowed disabled:opacity-50"
                  style={{
                    backgroundImage:
                      'linear-gradient(156.329deg, rgb(112, 125, 255) 0%, rgb(85, 101, 255) 100%)',
                  }}
                >
                  {isLoading ? (
                    <Loader2 className="size-[11px] text-white animate-spin" />
                  ) : (
                    <UserPlus className="size-[11px] text-white" />
                  )}
                  <span className="font-['Plus_Jakarta_Sans'] font-bold text-[11.5px] text-white text-center whitespace-nowrap">
                    {isLoading ? 'Assigning...' : 'Assign'}
                  </span>
                </button>
              </div>
            </div>
          )
        })
      )}

      <AssignCoordinatorConfirmationModal
        isOpen={confirmingAssign !== null && !!confirmingFaculty}
        facultyName={confirmingFaculty?.name ?? ''}
        onConfirm={() => confirmingFaculty && handleAssign(confirmingFaculty.id)}
        onCancel={() => setConfirmingAssign(null)}
        isLoading={loading === confirmingFaculty?.id}
      />
    </div>
  )
}
