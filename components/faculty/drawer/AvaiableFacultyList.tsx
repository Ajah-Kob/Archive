'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { UserPlus, Loader2 } from 'lucide-react'
import { UserProfile } from '@/components/ui/UserProfile'
import { InviteConfirmationModal } from '@/components/faculty/modal/InviteConfirmationModal'
import { InviteCancelationModal } from '@/components/faculty/modal/InviteCancelationModal'
import { sendInvitation, cancelInvitation } from '@/lib/actions/invitation'

interface Faculty {
  id: number
  initials: string
  name: string
  email: string
  gradient: string
}

interface PendingInvitation {
  id: number
  facultyId: number
}

interface AvailableFacultyListProps {
  data: Faculty[]
  pendingInvitations: PendingInvitation[]
}

export function AvailableFacultyList({
  data = [],
  pendingInvitations = [],
}: AvailableFacultyListProps) {
  const [invitedIds, setInvitedIds] = useState<Set<number>>(
    () => new Set(pendingInvitations.map((i) => i.facultyId)),
  )
  const [invitationMap, setInvitationMap] = useState<Record<number, number>>(
    () => Object.fromEntries(pendingInvitations.map((i) => [i.facultyId, i.id])),
  )
  const [confirmingInvite, setConfirmingInvite] = useState<number | null>(null)
  const [confirmingCancel, setConfirmingCancel] = useState<number | null>(null)
  const [loading, setLoading] = useState<number | null>(null)
  const { data: session } = useSession()
  const senderId = session?.user?.id ? +session.user.id : null

  const handleInvite = async (facultyId: number) => {
    if (!senderId) return
    setLoading(facultyId)
    const result = await sendInvitation(facultyId, 'COORDINATOR', senderId)
    if (result.success && result.payload) {
      setInvitedIds((prev) => new Set(prev).add(facultyId))
      setInvitationMap((prev) => ({
        ...prev,
        [result.payload.facultyId]: result.payload.id,
      }))
    }
    setLoading(null)
    setConfirmingInvite(null)
  }

  const handleCancel = async (facultyId: number) => {
    const invitationId = invitationMap[facultyId]
    if (!invitationId) return

    setLoading(facultyId)
    const result = await cancelInvitation(invitationId)
    if (result.success) {
      setInvitedIds((prev) => {
        const next = new Set(prev)
        next.delete(facultyId)
        return next
      })
      setInvitationMap((prev) => {
        const next = { ...prev }
        delete next[facultyId]
        return next
      })
    }
    setLoading(null)
    setConfirmingCancel(null)
  }

  const confirmingFaculty = data.find(
    (f) => f.id === confirmingInvite || f.id === confirmingCancel,
  )

  return (
    <div className="flex flex-col gap-2 py-5 items-start w-full">
      <div className="flex items-center pb-1 gap-2">
        <span className="text-blue-900 text-xs font-bold font-['Sora'] leading-5">
          Available Faculty
        </span>
        <div className="flex px-3 py-0.5 items-center bg-slate-100 rounded-[20px] outline outline-1 outline-offset-[-1px] outline-violet-100">
          <span className="text-slate-500 text-xs font-bold font-['Plus_Jakarta_Sans'] leading-4">
            {data.length}
          </span>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="w-full bg-white border border-dashed border-[#e8ebf8] rounded-xl px-4 py-6 flex items-center justify-center">
          <span className="text-[13px] font-medium text-[#8a93b4]">
            No faculty available
          </span>
        </div>
      ) : (
        data.map((faculty) => {
          const isInvited = invitedIds.has(faculty.id)
          const isLoading = loading === faculty.id
          const inviteId = invitationMap[faculty.id]

          return (
            <div
              key={faculty.id}
              className="w-full bg-white border border-[#e8ebf8] rounded-xl"
            >
              <div className="flex items-center gap-3 px-[15px] py-[13px]">
                <div className="flex w-full">
                  <UserProfile
                    initials={faculty.initials}
                    name={faculty.name}
                    email={faculty.email}
                    gradient={faculty.gradient}
                  />
                </div>

                {isInvited && inviteId ? (
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="h-[22px] px-[13px] py-[6px] bg-[rgba(245,158,11,0.07)] border border-[rgba(245,158,11,0.14)] rounded-[20px] flex items-center justify-center">
                      <span className="font-['Plus_Jakarta_Sans'] font-bold text-[10px] leading-[10px] text-[#f59e0b] whitespace-nowrap">
                        Pending Invitation
                      </span>
                    </div>
                    <button
                      onClick={() => setConfirmingCancel(faculty.id)}
                      disabled={isLoading}
                      className="flex items-center px-3 py-[7px] rounded-lg border border-[#e8ebf8] bg-white hover:bg-slate-50 transition-colors"
                    >
                      {isLoading ? (
                        <Loader2 className="size-[11px] text-slate-500 animate-spin" />
                      ) : (
                        <span className="font-['Plus_Jakarta_Sans'] font-bold text-[11.5px] text-slate-500 text-center whitespace-nowrap">
                          Cancel
                        </span>
                      )}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmingInvite(faculty.id)}
                    disabled={isLoading}
                    className="flex gap-[6px] items-center px-3 py-[7px] rounded-lg drop-shadow-[0_2px_3px_rgba(112,125,255,0.19)] shrink-0 disabled:opacity-50"
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
                      {isLoading ? 'Sending...' : 'Invite'}
                    </span>
                  </button>
                )}
              </div>
            </div>
          )
        })
      )}

      <InviteConfirmationModal
        isOpen={confirmingInvite !== null && !!confirmingFaculty}
        facultyName={confirmingFaculty?.name ?? ''}
        onConfirm={() => confirmingFaculty && handleInvite(confirmingFaculty.id)}
        onCancel={() => setConfirmingInvite(null)}
        isLoading={loading === confirmingFaculty?.id}
      />

      <InviteCancelationModal
        isOpen={confirmingCancel !== null && !!confirmingFaculty}
        facultyName={confirmingFaculty?.name ?? ''}
        onConfirm={() => confirmingFaculty && handleCancel(confirmingFaculty.id)}
        onCancel={() => setConfirmingCancel(null)}
        isLoading={loading === confirmingFaculty?.id}
      />
    </div>
  )
}
