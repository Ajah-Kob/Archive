'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Send, UserRound, X } from 'lucide-react'
import { toast } from 'sonner'
import { ActionMenu } from '@/components/ui/ActionMenu'
import { UserProfile } from '@/components/ui/UserProfile'
import {
  cancelAdviserInvitation,
  cancelGroupInvitation,
  leaveGroup,
  removeGroupMember,
  transferLeadership,
} from '@/lib/actions/groups'
import { ADVISER_CAP } from '@/config/constants'
import { GROUP_CAP, type WorkspaceData } from '@/types/milestones'
import { getInitials } from '@/lib/helper'
import { ConfirmDialog } from '@/components/milestones/ConfirmDialog'
import { RenameGroupModal } from '@/components/milestones/RenameGroupModal'
import { InviteMembersModal } from '@/components/milestones/InviteMembersModal'
import { AdviserModal } from '@/components/milestones/AdviserModal'

interface ConfirmState {
  title: string
  message: string
  confirmLabel: string
  action: () => Promise<{ success: boolean; message: string }>
}

export function GroupDashboard({ data }: { data: WorkspaceData }) {
  const router = useRouter()
  const group = data.group!

  const [inviteOpen, setInviteOpen] = useState(false)
  const [renameOpen, setRenameOpen] = useState(false)
  const [adviserOpen, setAdviserOpen] = useState(false)
  const [confirm, setConfirm] = useState<ConfirmState | null>(null)
  const [busy, setBusy] = useState(false)

  const isLeader = group.isLeader
  const remaining = Math.max(0, GROUP_CAP - group.memberCount)
  const isFull = remaining === 0

  const runConfirm = async () => {
    if (!confirm) return
    setBusy(true)
    const res = await confirm.action()
    setBusy(false)
    if (res.success) {
      toast.success(res.message)
      setConfirm(null)
      router.refresh()
    } else {
      toast.error(res.message)
      setConfirm(null)
    }
  }

  const makeRemove = (name: string, id: number): ConfirmState => ({
    title: `Remove ${name}?`,
    message: `${name} will be removed from ${group.name} and will need a new invite to rejoin.`,
    confirmLabel: 'Remove',
    action: () => removeGroupMember(id),
  })

  const makeTransfer = (name: string, id: number): ConfirmState => ({
    title: `Transfer Leadership?`,
    message: `Leadership of ${group.name} will move to ${name}. You'll no longer manage the group.`,
    confirmLabel: 'Transfer',
    action: () => transferLeadership(id),
  })

  const makeLeave = (): ConfirmState => ({
    title: 'Leave Group?',
    message: `You'll leave ${group.name} and lose access to its workspace.`,
    confirmLabel: 'Leave',
    action: () => leaveGroup(),
  })

  const makeCancelInvite = (name: string, id: number): ConfirmState => ({
    title: 'Cancel Invitation?',
    message: `${name} won't be able to join ${group.name} from their notifications.`,
    confirmLabel: 'Cancel',
    action: () => cancelGroupInvitation(id),
  })

  const makeCancelAdviser = (invitationId: number): ConfirmState => ({
    title: 'Cancel Adviser Invite?',
    message: 'The faculty member won\'t be able to accept the adviser request.',
    confirmLabel: 'Cancel',
    action: () => cancelAdviserInvitation(invitationId),
  })

  const leaderMenu = [
    ...(isFull
      ? []
      : [{ label: 'Invite Members', onClick: () => setInviteOpen(true) }]),
    { label: 'Rename Group', onClick: () => setRenameOpen(true) },
    { label: 'Invite Adviser', onClick: () => setAdviserOpen(true) },
  ]

  const { adviser } = group
  const pendingInvites = group.invitations.filter(
    (i) => i.status === 'PENDING',
  )

  return (
    <div className="h-full flex flex-col gap-[16px] overflow-y-auto pr-[2px] pb-[4px]">
      {/* Members */}
      <div className="bg-white border border-[#eceef8] rounded-[14px] shadow-[0px_2px_12px_0px_rgba(112,125,255,0.06),0px_1px_3px_0px_rgba(0,0,0,0.04)] p-[20px] shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-[8px]">
            <p className="font-heading font-bold text-[15px] leading-[22.5px] text-[#12143a] tracking-[-0.15px]">
              Group Members
            </p>
            <span
              className={`rounded-full px-[8px] py-[2px] font-sans font-bold text-[10.5px] ${
                isFull
                  ? 'bg-[rgba(34,197,94,0.08)] text-[#16a34a]'
                  : 'bg-[#f4f6ff] border border-[#e5e8ff] text-[#707dff]'
              }`}
            >
              {group.memberCount}/{GROUP_CAP}
            </span>
            {isFull && (
              <span className="font-sans font-semibold text-[11px] text-[#16a34a]">
                Full
              </span>
            )}
          </div>
          {isLeader && <ActionMenu items={leaderMenu} />}
        </div>

        <div className="pt-[6px] flex flex-col">
          {group.members.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between py-[10px] border-b border-[#f4f5fc] last:border-b-0"
            >
              <UserProfile
                initials={getInitials(member.name)}
                name={member.name}
                email={member.email}
                badge={member.isLeader ? 'Leader' : undefined}
              />
              {isLeader && !member.isLeader && (
                <ActionMenu
                  items={[
                    {
                      label: 'Transfer Leadership',
                      onClick: () =>
                        setConfirm(makeTransfer(member.name, member.id)),
                    },
                    {
                      label: 'Remove from Group',
                      variant: 'danger',
                      onClick: () => setConfirm(makeRemove(member.name, member.id)),
                    },
                  ]}
                />
              )}
            </div>
          ))}
        </div>

        {!isLeader && (
          <div className="pt-[6px] border-t border-[#f4f5fc]">
            <button
              onClick={() => setConfirm(makeLeave())}
              className="font-sans font-semibold text-[12px] text-[#e85555] hover:text-[#d84444] transition-colors"
            >
              Leave Group
            </button>
          </div>
        )}
      </div>

      {/* Invites + Adviser */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-[16px] shrink-0">
        {pendingInvites.length > 0 && (
          <div className="bg-white border border-[#eceef8] rounded-[14px] shadow-[0px_2px_12px_0px_rgba(112,125,255,0.06),0px_1px_3px_0px_rgba(0,0,0,0.04)] p-[20px]">
            <div className="flex items-center gap-[8px]">
              <p className="font-heading font-bold text-[15px] leading-[22.5px] text-[#12143a] tracking-[-0.15px]">
                Pending Invitations
              </p>
              <span className="bg-[rgba(245,158,11,0.08)] border border-[rgba(245,158,11,0.18)] rounded-full px-[8px] py-[2px] font-sans font-bold text-[10.5px] text-[#f59e0b]">
                {pendingInvites.length}
              </span>
            </div>

            <div className="pt-[6px] flex flex-col">
              {pendingInvites.map((invite) => (
                <div
                  key={invite.id}
                  className="flex items-center justify-between py-[10px] border-b border-[#f4f5fc] last:border-b-0"
                >
                  <UserProfile
                    initials={getInitials(invite.name)}
                    name={invite.name}
                    email={invite.email}
                  />
                  {isLeader && (
                    <button
                      onClick={() =>
                        setConfirm(makeCancelInvite(invite.name, invite.id))
                      }
                      className="flex items-center gap-[5px] h-[26px] px-[10px] bg-[#fafbff] border border-[#eceef8] rounded-[7px] font-sans font-semibold text-[11.5px] text-[#8a93b4] hover:bg-gray-50 hover:text-[#e85555] transition-colors"
                    >
                      <X className="size-[11px]" />
                      Cancel
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Adviser card */}
        <div
          className={`bg-white border border-[#eceef8] rounded-[14px] shadow-[0px_2px_12px_0px_rgba(112,125,255,0.06),0px_1px_3px_0px_rgba(0,0,0,0.04)] p-[20px] ${
            pendingInvites.length === 0 ? 'xl:col-span-2' : ''
          }`}
        >
          <p className="font-heading font-bold text-[15px] leading-[22.5px] text-[#12143a] tracking-[-0.15px]">
            Adviser
          </p>

          <div className="pt-[6px]">
            {adviser.state === 'none' && (
              <div className="flex flex-col items-center gap-[12px] py-[10px]">
                <div className="size-[52px] rounded-full bg-[#f4f5fc] flex items-center justify-center">
                  <UserRound className="size-6 text-[#9ea8c6]" strokeWidth={1.75} />
                </div>
                <p className="font-sans text-[12.5px] text-[#8a93b4]">
                  No adviser assigned yet.
                </p>
                {isLeader && (
                  <button
                    onClick={() => setAdviserOpen(true)}
                    className="flex gap-[7px] items-center h-[36px] px-[16px] rounded-[9px] text-[12.5px] font-semibold text-white shadow-[0px_4px_7px_rgba(112,125,255,0.32)] hover:opacity-95 transition-opacity"
                    style={{
                      backgroundImage:
                        'linear-gradient(165deg, #707dff 0%, #5565ff 100%)',
                    }}
                  >
                    <Send className="size-[13px]" />
                    Invite Adviser
                  </button>
                )}
              </div>
            )}

            {adviser.state === 'pending' && (
              <div className="flex flex-col">
                <UserProfile
                  initials={getInitials(adviser.name ?? 'Pending')}
                  name={adviser.name ?? 'Awaiting reply'}
                  email={adviser.email ?? 'Pending acceptance'}
                  badge="Invited"
                />
                {isLeader && (
                  <div className="flex gap-[8px] pt-[12px]">
                    <button
                      onClick={() => setAdviserOpen(true)}
                      className="flex items-center gap-[5px] h-[28px] px-[12px] bg-[#f7f7ff] border border-[rgba(112,125,255,0.19)] rounded-[7px] font-sans font-semibold text-[11.5px] text-[#707dff] hover:bg-[#eeefff] transition-colors"
                    >
                      Change
                    </button>
                    <button
                      onClick={() =>
                        setConfirm(makeCancelAdviser(adviser.invitationId))
                      }
                      className="flex items-center gap-[5px] h-[28px] px-[12px] bg-[#fafbff] border border-[#eceef8] rounded-[7px] font-sans font-semibold text-[11.5px] text-[#8a93b4] hover:bg-gray-50 hover:text-[#e85555] transition-colors"
                    >
                      <X className="size-[11px]" />
                      Cancel Invite
                    </button>
                  </div>
                )}
              </div>
            )}

            {adviser.state === 'assigned' && (
              <div className="flex flex-col">
                <UserProfile
                  initials={getInitials(adviser.name)}
                  name={adviser.name}
                  email={adviser.email}
                  badge="Adviser"
                />
                <div className="flex items-center gap-[8px] pt-[12px]">
                  <span className="bg-[#f4f6ff] border border-[#e5e8ff] rounded-[6px] px-[8px] py-[3px] text-[11px] font-semibold text-[#707dff]">
                    {adviser.workload}/{ADVISER_CAP} load
                  </span>
                  {adviser.atCap && (
                    <span className="bg-[rgba(254,111,111,0.07)] border border-[rgba(254,111,111,0.15)] rounded-[6px] px-[8px] py-[3px] text-[11px] font-semibold text-[#e85555]">
                      Workload full
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {inviteOpen && (
        <InviteMembersModal
          remaining={remaining}
          onClose={() => setInviteOpen(false)}
          onInvited={() => {
            setInviteOpen(false)
            router.refresh()
          }}
        />
      )}

      {renameOpen && (
        <RenameGroupModal
          groupId={group.id}
          currentName={group.name}
          onClose={() => setRenameOpen(false)}
          onRenamed={() => {
            setRenameOpen(false)
            router.refresh()
          }}
        />
      )}

      {adviserOpen && (
        <AdviserModal
          onClose={() => setAdviserOpen(false)}
          onInvited={() => {
            setAdviserOpen(false)
            router.refresh()
          }}
        />
      )}

      {confirm && (
        <ConfirmDialog
          title={confirm.title}
          message={confirm.message}
          confirmLabel={confirm.confirmLabel}
          busy={busy}
          onConfirm={runConfirm}
          onClose={() => setConfirm(null)}
        />
      )}
    </div>
  )
}
