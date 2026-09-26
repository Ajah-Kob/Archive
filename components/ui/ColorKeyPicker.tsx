'use client'

import { SECTION_HEADER_PALETTE, type SectionHeaderColorKey } from '@/lib/sectionHeader'

type ColorKeyPickerProps = {
  label: string
  /** null = the palette default (Purple). */
  value: SectionHeaderColorKey | null
  onChange: (next: SectionHeaderColorKey | null) => void
  disabled?: boolean
}

/**
 * Swatch picker over SECTION_HEADER_PALETTE — the six header presets from
 * lib/sectionHeader.ts. Each button shows the preset's saturated `dot` tone,
 * which is what a reader recognises from the section cards.
 *
 * Shared by the section form and the calendar event form so the two pickers
 * cannot drift. The "default" key is represented as null (the palette's first
 * entry), matching how Section.headerColor stores it.
 */
export function ColorKeyPicker({
  label,
  value,
  onChange,
  disabled = false,
}: ColorKeyPickerProps) {
  return (
    <div className="flex flex-col items-start w-full">
      <span className="font-sans font-bold text-[12px] leading-[18px] text-[#5a6382]">
        {label}
      </span>
      <div className="flex items-center gap-[10px] pt-[10px] flex-wrap">
        {SECTION_HEADER_PALETTE.map((preset) => {
          const isDefault = preset.key === 'default'
          const active = isDefault ? value === null : value === preset.key
          return (
            <button
              key={preset.key}
              type="button"
              onClick={() => onChange(isDefault ? null : preset.key)}
              disabled={active || disabled}
              aria-label={preset.label}
              aria-pressed={active}
              title={preset.label}
              className={`size-[32px] rounded-full border-2 border-[#5a6382] flex items-center justify-center transition-all ${
                active
                  ? 'ring-2 ring-[rgba(112,125,255,0.22)] ring-offset-2 ring-offset-white opacity-100 cursor-not-allowed'
                  : 'border-none shadow-[0_1px_4px_rgba(0,0,0,0.12)] hover:scale-90 cursor-pointer'
              }`}
              style={{ backgroundColor: preset.dot }}
            >
              {active ? (
                <span className="size-[8px] rounded-full bg-white shadow-[0_0_2px_rgba(0,0,0,0.2)]" />
              ) : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}
