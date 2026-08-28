'use client'

import { useState } from 'react'
import { Crown, User, X } from 'lucide-react'
import { UserProfile } from '@/components/ui/UserProfile'
import { getInitials } from '@/lib/helper'
import type { FacultyMember, PanelSlot, PanelSlotState } from './types'

interface SlotZoneProps {
  label: string
  isChair: boolean
  members: FacultyMember[]
  limit: number
  highlight: boolean
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void
  onDragLeave: (e: React.DragEvent<HTMLDivElement>) => void
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void
  onDragStart: (e: React.DragEvent<HTMLDivElement>, memberId: number) => void
  onRemoveMember: (memberId: number) => void
}

function SlotZone({
  label,
  isChair,
  members,
  limit,
  highlight,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragStart,
  onRemoveMember,
}: SlotZoneProps) {
  const icon = isChair ? (
    <Crown className="size-[13px] text-[#f59e0b] shrink-0" />
  ) : (
    <User className="size-[13px] text-[#707dff] shrink-0" />
  )

  return (
    <div className="flex flex-col gap-[5px]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-[6px]">
          {icon}
          <span className="font-sans font-bold text-[11.5px] text-[#5a6382] uppercase tracking-[0.06em]">
            {label}
          </span>
        </div>
        <span className="font-sans font-semibold text-[11px] text-[#8a93b4]">
          {members.length}/{limit}
        </span>
      </div>

      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`flex flex-col items-center gap-[10px] rounded-[14px] border-[2px] border-dashed px-[12px] py-[10px] transition-colors
  ${
    highlight
      ? 'border-[#707dff] bg-[rgba(112,125,255,0.06)]'
      : 'border-[#e0e3f5] bg-[#fbfcff]'
  }
  ${isChair ? 'h-[80px]' : 'h-[145px]'}
  ${members.length > 0 ? 'justify-start' : 'justify-center'}
`}
      >
        {members.length > 0 ? (
          members.map((member) => (
            <div
              key={member.id}
              draggable
              onDragStart={(e) => onDragStart(e, member.id)}
              title="Drag to change role"
              className="group flex w-full h-fit items-center justify-between gap-[8px] px-[12px] py-[8px] rounded-[10px] bg-[#f4f5fc] border border-[#e8ebf8] hover:border-[rgba(112,125,255,0.5)] transition-colors cursor-grab active:cursor-grabbing select-none"
            >
              <UserProfile
                initials={getInitials(member.name)}
                name={member.name}
                email={member.email ?? ''}
              />
              <button
                type="button"
                onClick={() => onRemoveMember(member.id)}
                title="Remove"
                className="shrink-0 rounded-[6px] p-[2px] hover:bg-[rgba(239,68,68,0.1)] transition-colors cursor-pointer"
              >
                <X className="size-[14px] text-[#a0a8c4] group-hover:text-[#ef4444] transition-colors" />
              </button>
            </div>
          ))
        ) : (
          <span
            className={`font-sans items-center flex font-medium text-[11.5px] text-[#a0a8c4]`}
          >
            Drop a faculty member here
          </span>
        )}
      </div>
    </div>
  )
}

interface StepPanelistsProps {
  faculty: FacultyMember[]
  slots: PanelSlotState
  onAssign: (slot: PanelSlot, member: FacultyMember) => void
  onRemove: (slot: PanelSlot) => void
}

export function StepPanelists({
  faculty,
  slots,
  onAssign,
  onRemove,
}: StepPanelistsProps) {
  const [overSlot, setOverSlot] = useState<PanelSlot | null>(null)

  const assignedIds = [slots.chair?.id, slots.member1?.id, slots.member2?.id]
  const available = faculty.filter((member) => !assignedIds.includes(member.id))

  function handleDragOver(e: React.DragEvent<HTMLDivElement>, slot: PanelSlot) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setOverSlot(slot)
  }

  function handleDragLeave(
    e: React.DragEvent<HTMLDivElement>,
    slot: PanelSlot,
  ) {
    // Ignore dragLeave events bubbling from the zone's children.
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setOverSlot((prev) => (prev === slot ? null : prev))
    }
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>, slot: PanelSlot) {
    e.preventDefault()
    setOverSlot(null)
    const memberId = Number(e.dataTransfer.getData('text/plain'))
    if (!Number.isInteger(memberId)) return
    const member = faculty.find((f) => f.id === memberId)
    if (member) onAssign(slot, member)
  }

  // The Panel Members dropzone accepts up to two members. Assign to the first
  // free member slot (member1, then member2) so a second drop doesn't
  // overwrite the first.
  function handleMembersDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setOverSlot(null)
    const memberId = Number(e.dataTransfer.getData('text/plain'))
    if (!Number.isInteger(memberId)) return
    const member = faculty.find((f) => f.id === memberId)
    if (!member) return
    if (!slots.member1) onAssign('member1', member)
    else if (!slots.member2) onAssign('member2', member)
  }

  // Dragging an assigned member card starts a drag with that member's id so
  // they can be moved between the Panel Chair and Panel Members zones.
  function handleMemberDragStart(
    e: React.DragEvent<HTMLDivElement>,
    memberId: number,
  ) {
    e.dataTransfer.setData('text/plain', String(memberId))
    e.dataTransfer.effectAllowed = 'move'
  }

  const chairMembers = slots.chair ? [slots.chair] : []
  const memberMembers = [slots.member1, slots.member2].filter(
    (m): m is FacultyMember => m != null,
  )

  return (
    <div className="w-[700px] grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-[20px] max-sm:grid-cols-1">
      <div className="flex flex-col w-full gap-[10px] h-full">
        <span className="font-sans font-bold text-[12px] leading-[18px] text-[#5a6382]">
          Faculty
        </span>
        <div className="flex flex-col gap-[8px] h-[300px] overflow-y-auto pr-[4px]">
          {available.length === 0 ? (
            <p className="font-sans font-medium text-[11.5px] leading-[17px] text-[#a0a8c4]">
              All faculty are assigned. Remove someone from a slot first.
            </p>
          ) : (
            available.map((member) => (
              <div
                key={member.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/plain', String(member.id))
                  e.dataTransfer.effectAllowed = 'move'
                }}
                className="flex items-center h-fit gap-[8px] px-[12px] py-[8px] rounded-[10px] border border-[#e8ebf8] bg-white shadow-[0px_1px_3px_0px_rgba(0,0,0,0.04)] cursor-grab active:cursor-grabbing select-none hover:border-[rgba(112,125,255,0.5)] hover:shadow-[0px_2px_8px_rgba(112,125,255,0.12)] transition-all"
              >
                <UserProfile
                  initials={getInitials(member.name)}
                  name={member.name}
                  email={member.email ?? ''}
                />
              </div>
            ))
          )}
        </div>
      </div>

      <div className="flex flex-col w-full gap-[14px]">
        <SlotZone
          label="Panel Chair"
          isChair
          members={chairMembers}
          limit={1}
          highlight={overSlot === 'chair'}
          onDragOver={(e) => handleDragOver(e, 'chair')}
          onDragLeave={(e) => handleDragLeave(e, 'chair')}
          onDrop={(e) => handleDrop(e, 'chair')}
          onDragStart={handleMemberDragStart}
          onRemoveMember={() => onRemove('chair')}
        />
        <SlotZone
          label="Panel Members"
          isChair={false}
          members={memberMembers}
          limit={2}
          highlight={overSlot === 'member1' || overSlot === 'member2'}
          onDragOver={(e) => handleDragOver(e, 'member1')}
          onDragLeave={(e) => handleDragLeave(e, 'member1')}
          onDrop={handleMembersDrop}
          onDragStart={handleMemberDragStart}
          onRemoveMember={(id) => {
            if (slots.member1?.id === id) onRemove('member1')
            else if (slots.member2?.id === id) onRemove('member2')
          }}
        />
      </div>
    </div>
  )
}
