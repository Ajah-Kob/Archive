'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { PenLine, Plus, X } from 'lucide-react'
import { useActionState } from 'react'
import { toast } from 'sonner'
import {
  createSection,
  updateSection,
  type MySectionCardData,
} from '@/lib/actions/sections'
import { SECTION_HEADER_PALETTE } from '@/lib/sectionHeader'
import {
  getDefaultAcademicYear,
  getSupportedAcademicYears,
} from '@/lib/academicYear'

// Explicit form variants aligned with the capability-aware server actions:
// - create: Admin/Program Chair global create (name + academic year).
// - global-edit: Admin/Program Chair edit (name + academic year, no color).
// - coordinator-edit: assigned coordinator edit (name + header color,
//   academic year read-only).
// Legacy 'edit' is a deprecated alias for 'coordinator-edit' retained for the
// coordinator detail context; the My Sections list uses 'coordinator-edit'
// explicitly and never uses create/global-edit.
export type SectionModalMode =
  | 'create'
  | 'global-edit'
  | 'coordinator-edit'
  | 'edit'

type SectionRef = Pick<MySectionCardData, 'id' | 'name'> & {
  academicYear?: string | null
  headerColor?: string | null
}

interface SectionModalProps {
  mode: SectionModalMode
  section?: SectionRef
  onClose: () => void
  onSuccess: () => void
}

// Layout (Stage 1): header / name / variant field / join-code notice or
// read-only year / error / footer. Theme (Stage 2): existing palette,
// Sora/Sans type, indigo gradient CTA. Animation (Stage 3): existing
// fade-in/zoom-in portal. Implementation (Stage 4): variant-scoped FormData
// so each mode submits only its permitted fields.
export function SectionModal({
  mode,
  section,
  onClose,
  onSuccess,
}: SectionModalProps) {
  const resolvedMode: 'create' | 'global-edit' | 'coordinator-edit' =
    mode === 'create'
      ? 'create'
      : mode === 'global-edit'
        ? 'global-edit'
        : 'coordinator-edit'
  const isCreate = resolvedMode === 'create'
  const isGlobalEdit = resolvedMode === 'global-edit'
  const isCoordinatorEdit = resolvedMode === 'coordinator-edit'

  const action = isCreate ? createSection : updateSection
  const [state, formAction, isPending] = useActionState(action, null)
  const [name, setName] = useState(section?.name ?? '')
  const [supportedYears] = useState<string[]>(() =>
    getSupportedAcademicYears(),
  )
  const [academicYear, setAcademicYear] = useState<string>(() => {
    const initial = section?.academicYear?.trim() ?? ''
    if (initial && getSupportedAcademicYears().includes(initial)) {
      return initial
    }
    return getDefaultAcademicYear()
  })
  const [headerColor, setHeaderColor] = useState<string | null>(
    section?.headerColor ?? null,
  )

  // Display normalization mirrors the server duplicate rule:
  // trim + collapse internal whitespace runs; the duplicate key adds
  // lowercase. Length is checked on the collapsed value.
  const collapsed = name.trim().replace(/\s+/g, ' ')
  const nameValid =
    collapsed.length >= 3 && collapsed.length <= 60 && name.trim() === name
  const yearValid =
    academicYear !== '' && supportedYears.includes(academicYear)
  const canSubmit = isCoordinatorEdit
    ? nameValid
    : nameValid && yearValid

  useEffect(() => {
    if (state && state.success) {
      toast.success(state.message)
      onSuccess()
      onClose()
    }
  }, [state, onClose, onSuccess])

  const inputClass =
    'w-full h-[42.25px] px-[14px] bg-white border border-[#e8ebf8] rounded-[10px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.04)] font-sans font-semibold text-[13px] text-[#3d4566] outline-none focus:border-[rgba(112,125,255,0.5)] transition-colors'

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[rgba(15,18,40,0.45)] backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-[460px] max-w-full rounded-[16px] shadow-[0px_24px_64px_0px_rgba(30,58,138,0.18),0px_4px_16px_0px_rgba(0,0,0,0.08)] overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-[22px] pt-[18px] pb-[19px] border-b border-[#f0f2fa]">
            <div className="flex gap-[10px] items-center">
              <div className="size-[30px] rounded-[8px] bg-[rgba(112,125,255,0.05)] flex items-center justify-center">
                {isCreate ? (
                  <Plus className="size-[14px] text-[#707dff]" />
                ) : (
                  <PenLine className="size-[14px] text-[#707dff]" />
                )}
              </div>
              <h2 className="font-['Sora',sans-serif] font-bold text-[14px] leading-[21px] text-[#1e3a8a] tracking-[-0.14px]">
                {isCreate ? 'Create Section' : 'Edit Section'}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="size-[28px] rounded-[7px] bg-[#f4f5fc] border border-[#e8ebf8] flex items-center justify-center cursor-pointer hover:bg-[#eef0fb] transition-colors"
            >
            <X className="size-[13px] text-[#8a93b4]" />
          </button>
        </div>

        <form action={formAction} className="flex flex-col">
          {!isCreate && section && (
            <input type="hidden" name="sectionId" value={section.id} />
          )}
          {isCoordinatorEdit && (
            <input type="hidden" name="headerColor" value={headerColor ?? ''} />
          )}

          <div className="flex flex-col items-start pt-[22px] px-[22px] gap-[18px]">
            <div className="flex flex-col items-start w-full">
              <label
                htmlFor="section-name"
                className="font-sans font-bold text-[12px] leading-[18px] text-[#5a6382]"
              >
                Section Name
              </label>
              <div className="relative w-full pt-[6px]">
                <input
                  id="section-name"
                  type="text"
                  name="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. BSIS 4A"
                  maxLength={60}
                  required
                  aria-label="Section name"
                  className={inputClass}
                />
              </div>
            </div>

            {(isCreate || isGlobalEdit) && (
              <div className="flex flex-col items-start w-full">
                <label
                  htmlFor="section-academic-year"
                  className="font-sans font-bold text-[12px] leading-[18px] text-[#5a6382]"
                >
                  Academic Year
                </label>
                <div className="relative w-full pt-[6px]">
                  <select
                    id="section-academic-year"
                    name="academicYear"
                    value={academicYear}
                    onChange={(e) => setAcademicYear(e.target.value)}
                    required
                    aria-label="Academic year"
                    className={`${inputClass} cursor-pointer pr-[32px]`}
                  >
                    {supportedYears.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {isCreate && (
              <p className="w-full rounded-[10px] bg-[#f7f7ff] border border-[#e8ebf8] px-[14px] py-[10px] font-sans font-medium text-[12.5px] leading-[19px] text-[#5a6382]">
                A student join code is generated automatically when the
                section is created. Share it from the section after creation.
              </p>
            )}

            {isCoordinatorEdit && (
              <>
                <div className="flex flex-col items-start w-full">
                  <label
                    htmlFor="section-academic-year-readonly"
                    className="font-sans font-bold text-[12px] leading-[18px] text-[#5a6382]"
                  >
                    Academic Year
                  </label>
                  <div className="relative w-full pt-[6px]">
                    <input
                      id="section-academic-year-readonly"
                      type="text"
                      value={section?.academicYear ?? '—'}
                      disabled
                      readOnly
                      aria-readonly="true"
                      aria-label="Academic year (read-only)"
                      className={`${inputClass} opacity-70 cursor-not-allowed`}
                    />
                  </div>
                </div>

                <div className="flex flex-col items-start w-full">
                  <label className="font-sans font-bold text-[12px] leading-[18px] text-[#5a6382]">
                    Header Color
                  </label>
                  <div className="flex items-center gap-[10px] pt-[10px] flex-wrap">
                    {SECTION_HEADER_PALETTE.map((c) => {
                      const isDefault = c.key === 'default'
                      const active = isDefault
                        ? headerColor === null
                        : headerColor === c.key
                      return (
                        <button
                          key={c.key}
                          type="button"
                          onClick={() =>
                            setHeaderColor(isDefault ? null : c.key)
                          }
                          disabled={active}
                          aria-label={c.label}
                          title={c.label}
                          className={`size-[32px] rounded-full border-2 border-[#5a6382] flex items-center justify-center transition-all ${
                            active
                              ? 'ring-2 ring-[rgba(112,125,255,0.22)] ring-offset-2 ring-offset-white opacity-100 cursor-not-allowed'
                              : 'border-none shadow-[0_1px_4px_rgba(0,0,0,0.12)] hover:scale-90 cursor-pointer'
                          }`}
                          style={{ backgroundColor: c.dot }}
                        >
                          {active && (
                            <span className="size-[8px] rounded-full bg-white shadow-[0_0_2px_rgba(0,0,0,0.2)]" />
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </>
            )}

            {state && !state.success && (
              <p className="w-full font-sans font-medium text-[12.5px] leading-[19px] text-[#ef4444]">
                {state.message}
              </p>
            )}
          </div>

          <div className="flex items-center justify-end gap-[10px] mt-[22px] px-[22px] pt-[17px] pb-[16px] border-t border-[#f0f2fa]">
            <button
              type="button"
              onClick={onClose}
              className="px-[21px] py-[10px] rounded-[10px] bg-white border border-[#e8ebf8] font-sans font-semibold text-[13px] leading-[19.5px] text-[#5a6382] cursor-pointer hover:bg-[#fafbff] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || !canSubmit}
              className="px-[20px] py-[9px] rounded-[10px] font-sans font-bold text-[13px] leading-[19.5px] text-white cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed hover:opacity-90 active:scale-[0.98] transition-all"
              style={{
                backgroundImage:
                  'linear-gradient(163.7deg, rgb(112, 125, 255) 0%, rgb(85, 101, 255) 100%)',
                boxShadow: '0px 4px 6px rgba(112,125,255,0.25)',
              }}
            >
              {isCreate ? 'Create Section' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  )
}
