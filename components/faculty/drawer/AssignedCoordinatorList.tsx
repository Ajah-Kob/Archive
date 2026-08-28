'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { UserProfile } from '@/components/ui/UserProfile'
import { ActionMenu } from '@/components/ui/ActionMenu'
import { RemoveCoordinatorModal } from '@/components/faculty/modal/RemoveCoordinatorModal'
import { removeCoordinator } from '@/lib/actions/coordinator'

export interface AssignedCoordinator {
  id: number
  initials: string
  name: string
  email: string
  gradient: string
  sections: number
}

interface AssignedCoordinatorListProps {
  data: AssignedCoordinator[]
  onRemoved: (id: number) => void
}

const ADMIN_ROLES = ['SUPERADMIN', 'ADMIN']

export function AssignedCoordinatorList({
  data = [],
  onRemoved,
}: AssignedCoordinatorListProps) {
  const { data: session } = useSession()
  const role = session?.user?.role
  const isAdmin = !!role && ADMIN_ROLES.includes(role)
  const canRemove = isAdmin || session?.user?.isProgramChair
  const [removing, setRemoving] = useState<AssignedCoordinator | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleRemove = async () => {
    if (!removing) return
    setIsLoading(true)
    const result = await removeCoordinator(String(removing.id))
    if (result.success) {
      toast.success(result.message)
      onRemoved(removing.id)
    } else {
      toast.error(result.message)
    }
    setRemoving(null)
    setIsLoading(false)
  }

  return (
    <div className="flex flex-col gap-2 py-5 items-start w-full">
      <div className="flex items-center gap-2 pb-1">
        <span className="text-blue-900 text-xs font-bold font-['Sora'] leading-5">
          Assigned Coordinators
        </span>
        <div className="flex px-3 py-0.5 items-center bg-slate-100 rounded-[20px] outline outline-1 outline-offset-[-1px] outline-violet-100">
          <span className="text-slate-500 text-xs font-bold font-['Plus_Jakarta_Sans'] leading-4">
            {data.length}
          </span>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="w-full bg-[#fafbff] border border-dashed border-[#e8ebf8] rounded-xl px-4 py-6 flex items-center justify-center">
          <span className="text-[13px] font-medium text-[#8a93b4]">
            No coordinators assigned
          </span>
        </div>
      ) : (
        data.map((coordinator) => (
          <div
            key={coordinator.id}
            className="w-full bg-[#fafbff] border border-[#e8ebf8] rounded-xl"
          >
            <div className="flex items-center gap-3 p-3">
              <UserProfile
                initials={coordinator.initials}
                name={coordinator.name}
                email={coordinator.email}
                gradient={coordinator.gradient}
              />

              <div className="flex items-center gap-2 ml-auto">
                <div className="flex align-center justify-center px-[10px] py-[4px] bg-[#f0f2fa] border border-[#e8ebf8] rounded-[20px]">
                  <span className="font-['Plus_Jakarta_Sans'] font-bold text-[11px] leading-[16.5px] text-[#6b7399] whitespace-nowrap">
                    {coordinator.sections}{' '}
                    {coordinator.sections === 1 ? 'Section' : 'Sections'}
                  </span>
                </div>
                {canRemove && (
                  <ActionMenu
                    items={[
                      {
                        label: 'Remove',
                        onClick: () => setRemoving(coordinator),
                        variant: 'danger',
                      },
                    ]}
                  />
                )}
              </div>
            </div>
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
