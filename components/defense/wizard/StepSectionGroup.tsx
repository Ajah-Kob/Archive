'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown } from 'lucide-react'
import type { DefenseType, GroupOption, SectionOption } from './types'

// Inline label styling (Section & Group step).
const LABEL_CLASS =
  'font-sans font-bold text-[12px] leading-[18px] text-[#5a6382]'

interface DropdownOption {
  value: string
  label: string
  disabled?: boolean
}

interface DropdownProps {
  value: string
  options: DropdownOption[]
  onChange: (value: string) => void
  placeholder: string
  disabled?: boolean
  ariaLabel: string
}

// Custom dropdown styled like the Defense Scheduling toolbar filter menu:
// a trigger button plus a popup list with a checkmark on the selected option.
// The popup is rendered in a portal to document.body so it is never clipped by
// the wizard's overflow container and never causes scrolling.
function Dropdown({
  value,
  options,
  onChange,
  placeholder,
  disabled,
  ariaLabel,
}: DropdownProps) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number; width: number }>({
    top: 0,
    left: 0,
    width: 0,
  })
  const triggerRef = useRef<HTMLButtonElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        rootRef.current &&
        !rootRef.current.contains(e.target as Node) &&
        !(e.target as Node).parentElement?.closest('[data-dropdown-menu]')
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Close the popup when the page scrolls or resizes so it never sits in a
  // stale position relative to the trigger.
  useEffect(() => {
    if (!open) return
    function close() {
      setOpen(false)
    }
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => {
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [open])

  const selected = options.find((o) => o.value === value)

  function toggle() {
    if (disabled) return
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setPos({ top: rect.bottom, left: rect.left, width: rect.width })
    }
    setOpen((prev) => !prev)
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={toggle}
        className={`flex w-full items-center justify-between gap-2 h-[42px] px-[14px] bg-white border border-[#e8ebf8] rounded-[10px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.04)] font-sans font-semibold text-[13px] transition-colors ${
          disabled
            ? 'text-[#a0a8c4] bg-[#f8f9fd] cursor-not-allowed'
            : selected
              ? 'text-[#3d4566] hover:border-[rgba(112,125,255,0.6)] cursor-pointer'
              : 'text-[#a0a8c4] hover:border-[rgba(112,125,255,0.6)] cursor-pointer'
        }`}
      >
        <span className="truncate">
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          className={`size-[14px] shrink-0 transition-colors ${
            disabled ? 'text-[#a0a8c4]' : 'text-[#8a93b4]'
          }`}
        />
      </button>
      {open &&
        createPortal(
          <div
            data-dropdown-menu
            role="listbox"
            aria-label={ariaLabel}
            style={{ top: pos.top + 6, left: pos.left, width: pos.width }}
            className="fixed z-[100] bg-white border border-[#e8ebf8] rounded-lg py-1 shadow-[0_8px_24px_rgba(112,125,255,0.14),0_2px_6px_rgba(0,0,0,0.06)]"
          >
            {options.map((option) => {
              const isSelected = option.value === value
              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  disabled={option.disabled}
                  onClick={() => {
                    onChange(option.value)
                    setOpen(false)
                  }}
                  className={`w-full flex items-center justify-between px-[13px] py-[8.5px] font-sans font-semibold text-[13px] transition-colors ${
                    option.disabled
                      ? 'text-[#a0a8c4] cursor-not-allowed'
                      : isSelected
                        ? 'text-[#707dff] hover:bg-[#fafbff]'
                        : 'text-[#3d4566] hover:bg-[#fafbff]'
                  }`}
                >
                  <span className="truncate">{option.label}</span>
                  {isSelected && <Check className="size-[13px] shrink-0" />}
                </button>
              )
            })}
          </div>,
          document.body,
        )}
    </div>
  )
}

interface StepSectionGroupProps {
  sections: SectionOption[]
  sectionGroups: GroupOption[]
  sectionId: number | null
  groupId: number | null
  defenseType: DefenseType
  /** Edit mode: section/group are locked; the scheduled group is allowed. */
  isEdit: boolean
  onSectionChange: (id: number | null) => void
  onGroupChange: (id: number | null) => void
  onTypeChange: (type: DefenseType) => void
}

export function StepSectionGroup({
  sections,
  sectionGroups,
  sectionId,
  groupId,
  defenseType,
  isEdit,
  onSectionChange,
  onGroupChange,
  onTypeChange,
}: StepSectionGroupProps) {
  const allScheduled =
    sectionGroups.length > 0 && sectionGroups.every((g) => g.hasSchedule)

  const sectionOptions: DropdownOption[] = sections.map((section) => ({
    value: String(section.id),
    label: section.name,
  }))

  const groupOptions: DropdownOption[] = sectionGroups.map((group) => ({
    value: String(group.id),
    label:
      group.name +
      (group.hasSchedule && !(isEdit && group.id === groupId)
        ? ' — already scheduled'
        : ''),
    disabled: group.hasSchedule && !(isEdit && group.id === groupId),
  }))

  const typeOptions: DropdownOption[] = [
    { value: 'PROPOSAL', label: 'Proposal Defense (Capstone 1)' },
    { value: 'FINAL', label: 'Final Defense (Capstone 2)' },
  ]

  return (
    <div className="flex flex-col gap-[16px] w-[450px]">
      {/*Section Dropdown Menu */}
      <div className="flex flex-col gap-[6px]">
        <label className={LABEL_CLASS}>Defense Type</label>
        <Dropdown
          value={defenseType}
          options={typeOptions}
          onChange={(v) => onTypeChange(v as DefenseType)}
          placeholder="Select a defense type…"
          ariaLabel="Defense Type"
        />
      </div>

      {/*Section Dropdown Menu */}
      <div className="flex flex-col gap-[6px]">
        <label className={LABEL_CLASS}>Section</label>
        <Dropdown
          value={sectionId ? String(sectionId) : ''}
          options={sectionOptions}
          onChange={(v) => onSectionChange(v ? Number(v) : null)}
          placeholder="Select a section…"
          disabled={isEdit}
          ariaLabel="Section"
        />
      </div>

      {/*Section Dropdown Menu */}
      <div className="flex flex-col gap-[6px]">
        <label className={LABEL_CLASS}>Group</label>
        <Dropdown
          value={groupId ? String(groupId) : ''}
          options={groupOptions}
          onChange={(v) => onGroupChange(v ? Number(v) : null)}
          placeholder={sectionId ? 'Select a group…' : 'Select a section first'}
          disabled={!sectionId || isEdit}
          ariaLabel="Group"
        />
        {isEdit ? (
          <p className="font-sans font-medium text-[11.5px] leading-[17px] text-[#8a93b4]">
            The section and group cannot be changed after the schedule is
            created.
          </p>
        ) : sectionId && sectionGroups.length === 0 ? (
          <p className="font-sans font-medium text-[11.5px] leading-[17px] text-[#8a93b4]">
            No groups available in this section.
          </p>
        ) : null}
        {!isEdit && allScheduled ? (
          <p className="font-sans font-medium text-[11.5px] leading-[17px] text-[#8a93b4]">
            All groups in this section already have a defense schedule.
          </p>
        ) : null}
      </div>
    </div>
  )
}
