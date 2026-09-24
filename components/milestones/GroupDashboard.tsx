'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Crown, Pencil, Send, UserPlus, X } from 'lucide-react'
import { toast } from 'sonner'
import { ActionMenu } from '@/components/ui/ActionMenu'
import { UserProfile } from '@/components/ui/UserProfile'
import { ActivityStatus } from '@/components/ui/ActivityStatus'
import {
  cancelAdviserInvitation,
  cancelGroupInvitation,
  leaveGroup,
  removeGroupMember,
  transferLeadership,
} from '@/lib/actions/groups'
import { GROUP_CAP, type WorkspaceData } from '@/types/milestones'
import { getInitials } from '@/lib/helper'
import { ConfirmDialog } from '@/components/milestones/ConfirmDialog'
import { RenameGroupModal } from '@/components/milestones/RenameGroupModal'
import { AdviserModal } from '@/components/milestones/AdviserModal'
import { InviteMembersModal } from '@/components/milestones/InviteMembersModal'
import { FinalTopicModal } from '@/components/milestones/FinalTopicModal'

interface ConfirmState {
  title: string
  message: string
  confirmLabel: string
  action: () => Promise<{ success: boolean; message: string }>
}

export function GroupDashboard({ data }: { data: WorkspaceData }) {
  const router = useRouter()
  const group = data.group!

  const [renameOpen, setRenameOpen] = useState(false)
  const [adviserOpen, setAdviserOpen] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [topicOpen, setTopicOpen] = useState(false)
  const [confirm, setConfirm] = useState<ConfirmState | null>(null)
  const [busy, setBusy] = useState(false)

  const isLeader = group.isLeader
  const isFull = group.memberCount >= GROUP_CAP
  const remaining = Math.max(0, GROUP_CAP - group.memberCount)

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

  const { adviser } = group
  const pendingInvites = group.invitations.filter(
    (i) => i.status === 'PENDING',
  )

  return (
    <div className="h-full flex flex-col gap-[16px] overflow-y-auto pr-[2px] pb-[4px]">
      {/* Group name */}
      <div className="bg-white border border-[#eceef8] rounded-[14px] shadow-[0px_2px_12px_0px_rgba(112,125,255,0.06),0px_1px_3px_0px_rgba(0,0,0,0.04)] p-[20px] shrink-0">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-heading font-bold text-[20px] leading-[28px] text-[#12143a] tracking-[-0.2px] break-words">
              {group.name}
            </p>
            <p className="font-sans font-medium text-[12.5px] leading-[18px] text-[#8a93b4]">
              {data.section.name}
            </p>
          </div>
          {isLeader ? (
            <button
              type="button"
              onClick={() => setRenameOpen(true)}
              aria-label="Rename group"
              title="Rename group"
              className="flex items-center justify-center size-[30px] rounded-[8px] bg-[#fafbff] border border-[#eceef8] text-[#8a93b4] hover:bg-[#f4f6ff] hover:text-[#707dff] hover:border-[#d5dbff] transition-colors shrink-0"
            >
              <Pencil className="size-[14px]" strokeWidth={2} />
            </button>
          ) : null}
        </div>
      </div>

      {/* Topic */}
      <div className="bg-white border border-[#eceef8] rounded-[14px] shadow-[0px_2px_12px_0px_rgba(112,125,255,0.06),0px_1px_3px_0px_rgba(0,0,0,0.04)] p-[20px] shrink-0">
        <div className="flex items-center justify-between gap-3">
          <p className="font-sans font-bold text-[11px] leading-[16.5px] text-[#9ea8c6] tracking-[0.88px] uppercase">
            Topic
          </p>
          {isLeader && group.finalTopic && (
            <button
              type="button"
              onClick={() => setTopicOpen(true)}
              aria-label="Edit final topic"
              title="Edit final topic"
              className="flex items-center justify-center size-[30px] rounded-[8px] bg-[#fafbff] border border-[#eceef8] text-[#8a93b4] hover:bg-[#f4f6ff] hover:text-[#707dff] hover:border-[#d5dbff] transition-colors shrink-0"
            >
              <Pencil className="size-[14px]" strokeWidth={2} />
            </button>
          )}
        </div>

        <div className="pt-[6px]">
          {group.finalTopic ? (
            <p className="font-sans font-bold text-[14px] leading-[21px] text-[#1e2145] break-words">
              {group.finalTopic.title}
            </p>
          ) : (
            <div className="flex flex-col items-center gap-[12px] py-[10px]">
              <p className="font-sans text-[12.5px] text-[#8a93b4] text-center">
                No final topic yet. Set your group&apos;s capstone topic to
                unlock the next steps.
              </p>
              {isLeader && (
                <button
                  type="button"
                  onClick={() => setTopicOpen(true)}
                  className="flex w-full h-[38px] items-center justify-center gap-[7px] rounded-[10px] border border-dashed border-[#d4d8f0] bg-white font-sans font-bold text-[12.5px] leading-[18px] text-[#707dff] hover:bg-[#f8f9ff] hover:border-[#707dff] active:bg-[#f4f6ff] transition-colors"
                >
                  <Pencil className="size-[14px]" strokeWidth={2.5} />
                  Add Topic
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Members + Adviser */}
      <div className="bg-white border border-[#eceef8] rounded-[14px] shadow-[0px_2px_12px_0px_rgba(112,125,255,0.06),0px_1px_3px_0px_rgba(0,0,0,0.04)] p-[20px] shrink-0">
        <div className="flex items-center justify-between">
          <p className="font-sans font-bold text-[11px] leading-[16.5px] text-[#9ea8c6] tracking-[0.88px] uppercase">
            Members
          </p>
          {isFull && (
            <span className="font-sans font-semibold text-[11px] text-[#16a34a]">
              Full
            </span>
          )}
        </div>

        <div className="pt-[6px] flex flex-col">
          {group.members.map((member) => (
            <div
              key={member.id}
              className="grid items-center gap-3 py-[10px]"
              style={{ gridTemplateColumns: '1fr auto auto auto' }}
            >
              <span className="min-w-0">
                <UserProfile
                  initials={getInitials(member.name)}
                  name={member.name}
                  email={member.email}
                  gradient={member.avatarGradient ?? undefined}
                  badge={
                    member.userId === data.student.userId ? 'You' : undefined
                  }
                />
              </span>
              {member.isLeader ? (
                <Crown
                  className="size-[14px] text-[#f59e0b] shrink-0"
                  aria-label="Group leader"
                />
              ) : (
                <span className="size-[14px] shrink-0" />
              )}
              <ActivityStatus status={member.activityStatus} />
              {isLeader && !member.isLeader ? (
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
              ) : (
                <span />
              )}
            </div>
          ))}
          {pendingInvites.map((invite) => (
            <div
              key={`pending-${invite.id}`}
              className="grid items-center gap-3 py-[10px]"
              style={{ gridTemplateColumns: '1fr auto auto' }}
            >
              <UserProfile
                initials={getInitials(invite.name)}
                name={invite.name}
                email={invite.email}
              />
              <span className="px-[10px] py-[4px] bg-[rgba(245,158,11,0.07)] border border-[rgba(245,158,11,0.2)] rounded-full font-sans font-semibold text-[11px] leading-[16.5px] text-[#f59e0b] whitespace-nowrap justify-self-end">
                Pending
              </span>
              {isLeader ? (
                <button
                  onClick={() =>
                    setConfirm(makeCancelInvite(invite.name, invite.id))
                  }
                  className="flex items-center gap-[5px] h-[26px] px-[10px] bg-[#fafbff] border border-[#eceef8] rounded-[7px] font-sans font-semibold text-[11.5px] text-[#8a93b4] hover:bg-gray-50 hover:text-[#e85555] transition-colors justify-self-end"
                >
                  <X className="size-[11px]" />
                  Cancel
                </button>
              ) : (
                <span />
              )}
            </div>
          ))}
        </div>

        {!isFull && isLeader && (
          <button
            type="button"
            onClick={() => setInviteOpen(true)}
            className="mt-[12px] flex w-full h-[38px] items-center justify-center gap-[7px] rounded-[10px] border border-dashed border-[#d4d8f0] bg-white font-sans font-bold text-[12.5px] leading-[18px] text-[#707dff] hover:bg-[#f8f9ff] hover:border-[#707dff] active:bg-[#f4f6ff] transition-colors"
          >
            <UserPlus className="size-[14px]" strokeWidth={2.5} />
            Invite Members
          </button>
        )}

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

        <div aria-hidden="true" className="h-[20px]" />

        {/* Adviser */}
        <p className="font-sans font-bold text-[11px] leading-[16.5px] text-[#9ea8c6] tracking-[0.88px] uppercase">
          Adviser
        </p>
        <div className="pt-[6px]">
          {adviser.state === 'none' && isLeader && (
            <button
              type="button"
              onClick={() => setAdviserOpen(true)}
              className="flex w-full h-[38px] items-center justify-center gap-[7px] rounded-[10px] border border-dashed border-[#d4d8f0] bg-white font-sans font-bold text-[12.5px] leading-[18px] text-[#707dff] hover:bg-[#f8f9ff] hover:border-[#707dff] active:bg-[#f4f6ff] transition-colors"
            >
              <Send className="size-[14px]" strokeWidth={2.5} />
              Invite Adviser
            </button>
          )}

          {adviser.state === 'pending' && (
            <div className="flex flex-col">
              <UserProfile
                initials={getInitials(adviser.name ?? 'Pending')}
                name={adviser.name ?? 'Awaiting reply'}
                email={adviser.email ?? 'Pending acceptance'}
                gradient={adviser.avatarGradient ?? undefined}
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
                gradient={adviser.avatarGradient ?? undefined}
              />
              {adviser.atCap && (
                <div className="flex items-center gap-[8px] pt-[12px]">
                  <span className="bg-[rgba(254,111,111,0.07)] border border-[rgba(254,111,111,0.15)] rounded-[6px] px-[8px] py-[3px] text-[11px] font-semibold text-[#e85555]">
                    Workload full
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {topicOpen && (
        <FinalTopicModal
          currentTitle={group.finalTopic?.title ?? null}
          onClose={() => setTopicOpen(false)}
          onSaved={() => {
            setTopicOpen(false)
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