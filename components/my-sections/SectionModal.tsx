'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, PenLine, Plus, X } from 'lucide-react'
import { useActionState } from 'react'
import { toast } from 'sonner'
import {
  createSection,
  updateSection,
  type MySectionCardData,
} from '@/lib/actions/sections'

const YEAR_LEVELS = ['3rd Year', '4th Year']
const SECTION_LETTERS = ['A', 'B', 'C']
const GROUP_NUMBERS = ['1', '2']

interface ParsedName {
  yearLevel: string
  section: string
  groupNumber: string
}

function parseName(name?: string): ParsedName {
  const match = name?.match(/^(\d)([A-Z])G(\d{1,2})$/i)
  if (!match) return { yearLevel: '4th Year', section: 'A', groupNumber: '1' }
  return {
    yearLevel: match[1] === '3' ? '3rd Year' : '4th Year',
    section: match[2].toUpperCase(),
    groupNumber: match[3],
  }
}

function yearDigit(yearLevel: string) {
  return yearLevel === '4th Year' ? '4' : '3'
}

interface SectionModalProps {
  mode: 'create' | 'edit'
  section?: MySectionCardData
  onClose: () => void
  onSuccess: () => void
}

export function SectionModal({ mode, section, onClose, onSuccess }: SectionModalProps) {
  const action = mode === 'edit' ? updateSection : createSection
  const [state, formAction, isPending] = useActionState(action, null)

  const initial = parseName(section?.name)
  const [yearLevel, setYearLevel] = useState(initial.yearLevel)
  const [sectionLetter, setSectionLetter] = useState(initial.section)
  const [groupNumber, setGroupNumber] = useState(initial.groupNumber)

  const previewName = `${yearDigit(yearLevel)}${sectionLetter}G${groupNumber}`

  useEffect(() => {
    if (state && state.success) {
      toast.success(state.message)
      onSuccess()
      onClose()
    }
  }, [state, onClose, onSuccess])

  const inputClass =
    'w-full h-[42.25px] pl-[12px] pr-[30px] appearance-none bg-white border border-[#e8ebf8] rounded-[10px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.04)] font-sans font-semibold text-[13px] text-[#3d4566] outline-none focus:border-[rgba(112,125,255,0.5)] transition-colors'

  function SelectField({
    label,
    name,
    value,
    options,
    onChange,
  }: {
    label: string
    name: string
    value: string
    options: string[]
    onChange: (v: string) => void
  }) {
    return (
      <div className="flex flex-col items-start">
        <label className="font-sans font-bold text-[12px] leading-[18px] text-[#5a6382]">
          {label}
        </label>
        <div className="relative w-full pt-[6px]">
          <select
            name={name}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={inputClass}
          >
            {options.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-[12px] top-1/2 -translate-y-1/2 size-[14px] text-[#8a93b4] pointer-events-none" />
        </div>
      </div>
    )
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[rgba(15,18,40,0.45)] backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-[460px] max-w-full rounded-[16px] shadow-[0px_24px_64px_0px_rgba(30,58,138,0.18),0px_4px_16px_0px_rgba(0,0,0,0.08)] overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-[22px] pt-[18px] pb-[19px] border-b border-[#f0f2fa]">
          <div className="flex gap-[10px] items-center">
            <div className="size-[30px] rounded-[8px] bg-[rgba(112,125,255,0.05)] flex items-center justify-center">
              {mode === 'edit' ? (
                <PenLine className="size-[14px] text-[#707dff]" />
              ) : (
                <Plus className="size-[14px] text-[#707dff]" />
              )}
            </div>
            <h2 className="font-['Sora',sans-serif] font-bold text-[14px] leading-[21px] text-[#1e3a8a] tracking-[-0.14px]">
              {mode === 'edit' ? 'Edit Section' : 'Create Section'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="size-[28px] rounded-[7px] bg-[#f4f5fc] border border-[#e8ebf8] flex items-center justify-center cursor-pointer hover:bg-[#eef0fb] transition-colors"
          >
            <X className="size-[13px] text-[#8a93b4]" />
          </button>
        </div>

        <form action={formAction} className="flex flex-col">
          {mode === 'edit' && section && (
            <input type="hidden" name="sectionId" value={section.id} />
          )}

          <div className="flex flex-col items-start pt-[22px] px-[22px]">
            <div className="grid grid-cols-3 gap-x-[14px] gap-y-[14px] w-full">
              <SelectField
                label="Year Level"
                name="yearLevel"
                value={yearLevel}
                options={YEAR_LEVELS}
                onChange={setYearLevel}
              />
              <SelectField
                label="Section"
                name="section"
                value={sectionLetter}
                options={SECTION_LETTERS}
                onChange={setSectionLetter}
              />
              <SelectField
                label="Group Number"
                name="groupNumber"
                value={groupNumber}
                options={GROUP_NUMBERS}
                onChange={setGroupNumber}
              />
            </div>

            <div className="flex items-center justify-between w-full mt-[22px] px-[19px] py-[17px] rounded-[12px] bg-[rgba(112,125,255,0.02)] border border-[rgba(112,125,255,0.13)]">
              <div className="flex flex-col items-start">
                <span className="font-sans font-bold text-[10.5px] leading-[15.75px] text-[#9ea8c6] tracking-[1.05px] uppercase">
                  Section Preview
                </span>
                <span className="pt-[4px] font-['Sora',sans-serif] font-extrabold text-[28px] leading-[28px] text-[#1e3a8a] tracking-[-0.56px]">
                  {previewName}
                </span>
              </div>
              <span className="px-[11px] py-[4px] rounded-[20px] bg-[rgba(112,125,255,0.06)] border border-[rgba(112,125,255,0.14)] font-sans font-bold text-[11px] leading-[16.5px] text-[#707dff] whitespace-nowrap">
                {yearLevel}
              </span>
            </div>

            {state && !state.success && (
              <p className="w-full pt-[10px] font-sans font-medium text-[12.5px] leading-[19px] text-[#ef4444]">
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
              disabled={isPending}
              className="px-[20px] py-[9px] rounded-[10px] font-sans font-bold text-[13px] leading-[19.5px] text-white cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed hover:opacity-90 active:scale-[0.98] transition-all"
              style={{
                backgroundImage:
                  'linear-gradient(163.7deg, rgb(112, 125, 255) 0%, rgb(85, 101, 255) 100%)',
                boxShadow: '0px 4px 6px rgba(112,125,255,0.25)',
              }}
            >
              {mode === 'edit' ? 'Save Changes' : 'Create Section'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  )
}
