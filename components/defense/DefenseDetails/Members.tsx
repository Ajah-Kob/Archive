'use client'

import { Crown } from 'lucide-react'
import { useSession } from 'next-auth/react'
import type { DefenseMemberPayload } from '@/lib/actions/defense'
import { getInitials } from '@/lib/helper'

const AVATAR_GRADIENT = 'linear-gradient(135deg, #1e3a8a 0%, #2d52b8 100%)'

function LeaderPill() {
  return (
    <span className="inline-flex items-center gap-[5px] rounded-[20px] bg-[rgba(245,158,11,0.07)] border border-[rgba(245,158,11,0.13)] px-[10px] py-[3px] font-['Plus_Jakarta_Sans',sans-serif] font-bold text-[12px] leading-[18px] text-[#f59e0b] whitespace-nowrap shrink-0">
      <Crown className="size-[12px]" strokeWidth={2} />
      Leader
    </span>
  )
}

function MemberAvatar({ name }: { name: string }) {
  return (
    <div
      className="size-[35px] rounded-[20px] flex items-center justify-center shrink-0"
      style={{ backgroundImage: AVATAR_GRADIENT }}
    >
      <span className="font-['Sora',sans-serif] font-bold text-[12.8px] leading-none text-white">
        {getInitials(name)}
      </span>
    </div>
  )
}

function MeBadge() {
  return (
    <span className="inline-flex items-center gap-[4px] rounded-full bg-[#eef2ff] border border-[#c7d2fe] px-[7px] py-[2px] font-['Plus_Jakarta_Sans',sans-serif] font-bold text-[10px] leading-[14px] text-[#4f46e5] whitespace-nowrap shrink-0">
      Me
    </span>
  )
}

function MemberInfo({ member }: { member: DefenseMemberPayload }) {
  return (
    <div className="flex flex-col min-w-0">
      <p className="font-['Sora',sans-serif] font-bold text-[12.5px] leading-[normal] tracking-[-0.125px] text-[#1e3a8a] truncate">
        {member.name}
      </p>
      <p className="font-['Plus_Jakarta_Sans',sans-serif] font-medium text-[11px] leading-[normal] text-[#9ea8c6] truncate">
        {member.email}
      </p>
    </div>
  )
}

type MemberRowProps = {
  member: DefenseMemberPayload
  isFirst: boolean
  isLast: boolean
}

function buildRowClass(isFirst: boolean, isLast: boolean): string {
  const radius = isFirst
    ? 'rounded-tl-[10px] rounded-tr-[10px]'
    : isLast
      ? 'rounded-bl-[10px] rounded-br-[10px]'
      : ''
  const border = isLast
    ? 'border border-[#e8ebf8]'
    : 'border-l border-r border-t border-[#e8ebf8]'
  return `bg-white ${border} ${radius} flex items-center justify-between px-[17px] py-[6px] min-h-[61px] gap-2`
}

function MemberRow({ member, isFirst, isLast }: MemberRowProps) {
  const { data: session } = useSession()
  const isMe = session?.user?.id != null && String(session.user.id) === String(member.userId)
  return (
    <div className={buildRowClass(isFirst, isLast)}>
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <MemberAvatar name={member.name} />
        <MemberInfo member={member} />
        {isMe ? <MeBadge /> : null}
      </div>
      <div className="flex items-center justify-end shrink-0">
        {member.isLeader ? <LeaderPill /> : null}
      </div>
    </div>
  )
}

function MembersEmpty() {
  return (
    <p className="font-['Plus_Jakarta_Sans',sans-serif] font-medium text-[13px] leading-[21.45px] text-[#8a93b4]">
      No members have been added yet.
    </p>
  )
}

function orderMembers(members: DefenseMemberPayload[]): DefenseMemberPayload[] {
  const leader = members.filter((m) => m.isLeader)
  const rest = members.filter((m) => !m.isLeader)
  return [...leader, ...rest]
}

type DefenseDetailsMembersProps = {
  members: DefenseMemberPayload[]
}

export function DefenseDetailsMembers({ members }: DefenseDetailsMembersProps) {
  if (!members || members.length === 0) {
    return (
      <div className="flex flex-col gap-[10px] self-start w-full min-w-0">
        <p className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-[12px] leading-[18px] text-[#9ea8c6]">
          Members
        </p>
        <MembersEmpty />
      </div>
    )
  }

  const ordered = orderMembers(members)

  return (
    <div className="flex flex-col gap-[10px] self-start w-full min-w-0">
      <p className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-[12px] leading-[18px] text-[#9ea8c6]">
        Members
      </p>
      <div className="bg-white flex flex-col rounded-[12px] shadow-[0px_2px_12px_0px_rgba(30,58,138,0.06),0px_1px_3px_0px_rgba(0,0,0,0.04)] w-full overflow-clip">
        {ordered.map((member, index) => (
          <MemberRow
            key={member.userId}
            member={member}
            isFirst={index === 0}
            isLast={index === ordered.length - 1}
          />
        ))}
      </div>
    </div>
  )
}
