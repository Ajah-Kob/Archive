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
  defenseType: DefenseType | null
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
  // Groups already holding a live schedule for the SELECTED defense type
  // (scheduled or finished) are ineligible — unless it's the group being
  // edited/rescheduled.
  function isGroupTaken(group: (typeof sectionGroups)[number]): boolean {
    if (!defenseType) return false
    return (
      group.scheduledTypes.includes(defenseType) &&
      !(isEdit && group.id === groupId)
    )
  }

  const eligibleGroups = defenseType
    ? sectionGroups.filter((g) => !isGroupTaken(g))
    : []
  const allScheduled =
    !!defenseType &&
    sectionGroups.length > 0 &&
    eligibleGroups.length === 0

  const sectionOptions: DropdownOption[] = sections.map((section) => ({
    value: String(section.id),
    label: section.name,
  }))

  const groupOptions: DropdownOption[] = sectionGroups.map((group) => ({
    value: String(group.id),
    label:
      group.name +
      (isGroupTaken(group) ? ' — already scheduled' : ''),
    disabled: isGroupTaken(group),
  }))

  const typeOptions: Array<{
    value: DefenseType
    label: string
    description: string
  }> = [
    {
      value: 'PROPOSAL',
      label: 'Proposal Defense (Capstone 1)',
      description: 'Topic and Chapters 1–3 readiness review',
    },
    {
      value: 'FINAL',
      label: 'Final Defense (Capstone 2)',
      description: 'Chapters 4–5 and manuscript final review',
    },
  ]

  // Per-type accents mirror the SubmitVerdictOptions pattern (selected card
  // gets a tinted border/bg + filled radio circle): proposal purple, final red.
  function getTypeAccent(type: DefenseType) {
    if (type === 'FINAL') {
      return {
        border: 'border-[#e11d48]',
        bg: 'bg-[rgba(225,29,72,0.08)]',
        circleBorder: 'border-[#e11d48]',
        circleBg: 'bg-[#e11d48]',
      }
    }
    return {
      border: 'border-[#a178cd]',
      bg: 'bg-[rgba(161,120,205,0.08)]',
      circleBorder: 'border-[#a178cd]',
      circleBg: 'bg-[#a178cd]',
    }
  }

  return (
    <div className="flex flex-col gap-[16px] w-[450px]">
      {/*Section Dropdown Menu */}
      <div className="flex flex-col gap-[6px]">
        <label className={LABEL_CLASS}>
          Section <span className="text-[#ef4444]">*</span>
        </label>
        <Dropdown
          value={sectionId ? String(sectionId) : ''}
          options={sectionOptions}
          onChange={(v) => onSectionChange(v ? Number(v) : null)}
          placeholder="Select a section…"
          disabled={isEdit}
          ariaLabel="Section"
        />
      </div>

      {/*Defense Type radio options (middle; enabled once a section is picked) */}
      <div className="flex flex-col gap-[6px]">
        <span className={LABEL_CLASS} id="defense-type-label">
          Defense Type <span className="text-[#ef4444]">*</span>
        </span>
        <div
          role="radiogroup"
          aria-labelledby="defense-type-label"
          className="flex flex-col gap-[8px]"
        >
          {typeOptions.map((option) => {
            const isSelected = defenseType === option.value
            const accent = getTypeAccent(option.value)
            const locked = !sectionId
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => onTypeChange(option.value)}
                disabled={locked}
                className={`flex items-center gap-[12px] w-full text-left rounded-[10px] border px-[14px] py-[11px] transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                  isSelected
                    ? `${accent.border} ${accent.bg}`
                    : 'border-[#eceef8] bg-white hover:bg-[#fafbff]'
                }`}
              >
                <span
                  className={`flex size-[22px] items-center justify-center rounded-full border shrink-0 ${
                    isSelected
                      ? `${accent.circleBorder} ${accent.circleBg} text-white`
                      : 'border-[#eceef8] bg-[#fafbff] text-[#bbc0d8]'
                  }`}
                >
                  {isSelected ? <Check className="size-[12px]" strokeWidth={2.5} /> : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="font-sans font-bold text-[13px] leading-[19px] text-[#12143a]">
                    {option.label}
                  </span>
                  <span className="block font-sans font-medium text-[11.5px] leading-[17px] text-[#8a93b4]">
                    {option.description}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
        {!sectionId ? (
          <p className="font-sans font-medium text-[11px] leading-[15px] text-[#8a93b4]">
            Select a section first to choose a defense type.
          </p>
        ) : null}
      </div>

      {/*Group Dropdown Menu (bottom; filtered by the selected defense type) */}
      <div className="flex flex-col gap-[6px]">
        <label className={LABEL_CLASS}>
          Group <span className="text-[#ef4444]">*</span>
        </label>
        <Dropdown
          value={groupId ? String(groupId) : ''}
          options={groupOptions}
          onChange={(v) => onGroupChange(v ? Number(v) : null)}
          placeholder={
            !sectionId
              ? 'Select a section first'
              : !defenseType
                ? 'Select a defense type first'
                : 'Select a group…'
          }
          disabled={!sectionId || !defenseType || isEdit}
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
            All groups in this section already have this defense scheduled or
            finished.
          </p>
        ) : null}
      </div>
    </div>
  )
}
