'use client'

import { useState, useSyncExternalStore } from 'react'
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
  onDragEnd: () => void
  onZoneClick: () => void
  onRemoveMember: (memberId: number) => void
  /** Ids currently held by a zone, so an assigned card can show the same
   *  selected ring as a card in the pool. */
  selectedMemberId: number | null
  onSelectMember: (memberId: number) => void
  /** Whether the layout is the narrow one, so the empty state can name the
   *  gesture that device actually has. */
  isTouchLayout: boolean
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
  onDragEnd,
  onZoneClick,
  onRemoveMember,
  selectedMemberId,
  onSelectMember,
  isTouchLayout,
}: SlotZoneProps) {
  const icon = isChair ? (
    <Crown className="size-[13px] text-[#f59e0b] shrink-0" />
  ) : (
    <User className="size-[13px] text-[#707dff] shrink-0" />
  )

  // Dashed only while the slot is empty. Once someone is in it the zone is a
  // container, not a target, and the dashed outline read as "still waiting for
  // someone" on a slot that was already filled.
  const isEmpty = members.length === 0

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
        onClick={onZoneClick}
        className={`flex flex-col items-center gap-[10px] rounded-[14px] border-[2px] px-[12px] py-[10px] transition-colors
  ${
    highlight
      ? 'border-[#707dff] bg-[rgba(112,125,255,0.06)]'
      : isEmpty
        ? 'border-dashed border-[#e0e3f5] bg-[#fbfcff]'
        : 'border-[#e8ebf8] bg-white'
  }
  ${isChair ? 'h-[80px]' : 'h-[145px]'}
  ${isEmpty ? 'justify-center' : 'justify-start'}
`}
      >
        {members.length > 0 ? (
          members.map((member) => (
            <div
              key={member.id}
              draggable
              onDragStart={(e) => onDragStart(e, member.id)}
              onDragEnd={onDragEnd}
              // Tap to select, then tap a zone to change role. Without this an
              // assigned member could only be moved by dragging, which never
              // fires on touch. stopPropagation because the click would
              // otherwise reach the zone and reassign them to where they
              // already are.
              onClick={(e) => {
                e.stopPropagation()
                onSelectMember(member.id)
              }}
              role="button"
              tabIndex={0}
              aria-pressed={selectedMemberId === member.id}
              onKeyDown={(e) => {
                if (e.key !== 'Enter' && e.key !== ' ') return
                e.preventDefault()
                e.stopPropagation()
                onSelectMember(member.id)
              }}
              title="Tap to select, then tap a slot — or drag"
              className={`group flex w-full h-fit items-center justify-between gap-[8px] px-[12px] py-[8px] rounded-[10px] bg-[#f4f5fc] border transition-colors cursor-pointer select-none ${
                selectedMemberId === member.id
                  ? 'border-[#707dff] ring-2 ring-[rgba(112,125,255,0.35)]'
                  : 'border-[#e8ebf8] hover:border-[rgba(112,125,255,0.5)]'
              }`}
            >
              <UserProfile
                initials={getInitials(member.name)}
                name={member.name}
                email={member.email ?? ''}
              />
              <button
                type="button"
                onClick={(e) => {
                  // Must not bubble: the zone's own click handler would read
                  // this as "assign the selected member to this zone".
                  e.stopPropagation()
                  onRemoveMember(member.id)
                }}
                aria-label={`Remove ${member.name} from ${label}`}
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
            {isTouchLayout
              ? 'Tap a faculty member, then tap here'
              : 'Drag a faculty member here'}
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
  // Click fallback for when drag-and-drop is unavailable (touch devices, or
  // a wedged browser drag operation): click a faculty card to select it,
  // then click a zone to assign. Mirrors the drop targets exactly.
  const [selectedId, setSelectedId] = useState<number | null>(null)

  // The empty dropzone names the gesture the device actually has. Subscribed
  // rather than read once on mount, so rotating a phone or narrowing a desktop
  // window updates the wording. useSyncExternalStore keeps this off the server,
  // where window does not exist — the third argument is the server snapshot.
  const isTouchLayout = useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia('(max-width: 639px)')
      query.addEventListener('change', onChange)
      return () => query.removeEventListener('change', onChange)
    },
    () => window.matchMedia('(max-width: 639px)').matches,
    () => false,
  )

  const assignedIds = [slots.chair?.id, slots.member1?.id, slots.member2?.id]
  const available = faculty.filter((member) => !assignedIds.includes(member.id))

  function handleDragOver(e: React.DragEvent<HTMLDivElement>, slot: PanelSlot) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    // dragover fires continuously — only update on actual change so every
    // pointer move doesn't schedule render work mid-drag (drag lag).
    setOverSlot((prev) => (prev === slot ? prev : slot))
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
    // Defer past the drag sequence: assigning synchronously unmounts the
    // dragged card mid-drag, which sticks the ghost/cursor in some browsers.
    if (member) requestAnimationFrame(() => onAssign(slot, member))
  }

  function assignToMembers(member: FacultyMember) {
    if (!slots.member1) requestAnimationFrame(() => onAssign('member1', member))
    else if (!slots.member2)
      requestAnimationFrame(() => onAssign('member2', member))
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
    assignToMembers(member)
  }

  // Tapping a card toggles it. One toggle for both the pool and the assigned
  // slots, so the same gesture means the same thing wherever the card is.
  function selectMember(memberId: number) {
    setSelectedId((prev) => (prev === memberId ? null : memberId))
  }

  // Click fallback: assign or move the selected member to a zone. Works on
  // touch, where drag-and-drop never fires, and doubles as the keyboard path.
  function handleZoneClick(slot: PanelSlot) {
    if (selectedId == null) return
    const member = faculty.find((f) => f.id === selectedId)
    setSelectedId(null)
    if (!member) return
    if (slot === 'chair') requestAnimationFrame(() => onAssign('chair', member))
    else assignToMembers(member)
  }

  // Clears the drop highlight when a drag ends anywhere — cancelled drags
  // (Esc) and drops outside a zone never fire drop/dragleave.
  function handleDragEnd() {
    setOverSlot(null)
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
    <div className="w-full max-w-[700px] grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-[20px] max-sm:grid-cols-1">
      <div className="flex flex-col w-full gap-[10px] h-full">
        <span className="font-sans font-bold text-[12px] leading-[18px] text-[#5a6382]">
          Faculty
        </span>
        {/* Visible on every viewport. The `title` tooltips this replaces only
            appeared on hover, so on touch the tap-to-assign gesture was
            undiscoverable. */}
<p className="font-sans font-medium text-[11.5px] leading-[17px] text-[#8a93b4] -mt-[4px]">
            {isTouchLayout
              ? 'Tap a name to select it, then tap a slot.'
              : 'Tap a name to select it, then tap a slot. You can also drag.'}
          </p>
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
                onDragEnd={handleDragEnd}
                onClick={() =>
                  setSelectedId((prev) => (prev === member.id ? null : member.id))
                }
            title="Tap to select, then tap a slot — or drag"
            role="button"
            tabIndex={0}
            aria-pressed={selectedId === member.id}
            onKeyDown={(e) => {
              if (e.key !== 'Enter' && e.key !== ' ') return
              e.preventDefault()
              selectMember(member.id)
            }}
            className={`flex items-center h-fit gap-[8px] px-[12px] py-[8px] rounded-[10px] border bg-white shadow-[0px_1px_3px_0px_rgba(0,0,0,0.04)] cursor-pointer select-none hover:border-[rgba(112,125,255,0.5)] hover:shadow-[0px_2px_8px_rgba(112,125,255,0.12)] transition-all ${
                  selectedId === member.id
                    ? 'border-[#707dff] ring-2 ring-[rgba(112,125,255,0.35)]'
                    : 'border-[#e8ebf8]'
                }`}
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
          onDragEnd={handleDragEnd}
          onZoneClick={() => handleZoneClick('chair')}
          onRemoveMember={() => onRemove('chair')}
          selectedMemberId={selectedId}
          onSelectMember={selectMember}
          isTouchLayout={isTouchLayout}
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
          onDragEnd={handleDragEnd}
          onZoneClick={() => handleZoneClick('member1')}
          onRemoveMember={(id) => {
            if (slots.member1?.id === id) onRemove('member1')
            else if (slots.member2?.id === id) onRemove('member2')
          }}
          selectedMemberId={selectedId}
          onSelectMember={selectMember}
          isTouchLayout={isTouchLayout}
        />
      </div>
    </div>
  )
}
