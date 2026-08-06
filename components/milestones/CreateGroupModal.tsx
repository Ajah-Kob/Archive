'use client'

import { useState } from 'react'
import { Loader2, TriangleAlert, Users, X } from 'lucide-react'
import { toast } from 'sonner'
import { createGroup } from '@/lib/actions/groups'
import { GROUP_CAP } from '@/types/milestones'
import { ClassmatesPicker } from '@/components/milestones/ClassmatesPicker'

interface CreateGroupModalProps {
  onClose: () => void
  onCreated: () => void
}

export function CreateGroupModal({ onClose, onCreated }: CreateGroupModalProps) {
  const [name, setName] = useState('')
  const [selected, setSelected] = useState<number[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const maxSelect = GROUP_CAP - 1

  const toggle = (id: number) => {
    setError(null)
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((s) => s !== id)
      if (prev.length >= maxSelect) return prev
      return [...prev, id]
    })
  }

  const handleSubmit = async () => {
    if (!name.trim()) return
    setSubmitting(true)
    setError(null)
    const res = await createGroup(name, selected)
    setSubmitting(false)
    if (!res.success) {
      setError(res.message)
      return
    }
    toast.success(res.message)
    onCreated()
  }

  const canSubmit = name.trim().length > 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(16,19,58,0.3)] backdrop-blur-[4px]">
      <div className="relative bg-white border border-[#eceef8] rounded-[16px] w-[520px] shadow-[0px_24px_64px_0px_rgba(16,20,58,0.16),0px_4px_16px_0px_rgba(0,0,0,0.06)] flex flex-col">
        <div className="flex items-start justify-between gap-[16px] px-[24px] pt-[22px] pb-[19px] border-b border-[#eceef8]">
          <div>
            <p className="font-heading font-bold text-[17px] leading-[25.5px] text-[#12143a] tracking-[-0.17px]">
              Create a Capstone Group
            </p>
            <p className="font-sans font-medium text-[12.5px] leading-[18.75px] text-[#8a93b4] pt-[4px]">
              You&apos;ll be the Group Leader. Only students in your section
              appear below.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="bg-[#fafbff] border border-[#eceef8] rounded-[14px] size-[28px] flex items-center justify-center hover:bg-gray-50 transition-colors shrink-0"
          >
            <X className="size-[13px] text-[#8a93b4]" />
          </button>
        </div>

        <div className="px-[24px] py-[20px] flex flex-col gap-[18px]">
          <div>
            <p className="font-sans font-bold text-[12.5px] leading-[18.75px] text-[#3c4268] tracking-[0.125px] pb-[7px]">
              Group Name
            </p>
            <input
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                if (error) setError(null)
              }}
              placeholder="e.g. Archive Innovators"
              maxLength={50}
              className="w-full h-[42.25px] bg-white border border-[#dddff0] rounded-[9px] px-[15px] text-[13.5px] font-medium text-[#12143a] placeholder:text-[rgba(18,20,58,0.5)] outline-none focus:border-[#707dff] transition-colors"
            />
          </div>

          <ClassmatesPicker
            limit={maxSelect}
            selected={selected}
            onToggle={toggle}
          />

          {error && (
            <div className="flex gap-[6px] items-start w-full">
              <TriangleAlert className="size-[13px] text-[#fe6f6f] shrink-0 mt-px" />
              <p className="font-medium text-[12px] leading-[17.4px] text-[#fe6f6f]">
                {error}
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-[10px] items-center px-[24px] pt-[17px] pb-[16px] border-t border-[#eceef8]">
          <button
            onClick={onClose}
            className="self-stretch bg-white border border-[#dddff0] rounded-[10px] px-[19px] py-[10px] text-[13.5px] font-semibold text-[#5a6382] hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            className="flex-1 flex items-center justify-center gap-[7px] h-[40.25px] rounded-[10px] text-[13.5px] font-semibold text-white shadow-[0px_4px_7px_rgba(112,125,255,0.32)] disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            style={{
              backgroundImage: 'linear-gradient(165deg, #707dff 0%, #5565ff 100%)',
            }}
          >
            {submitting ? (
              <Loader2 className="size-[14px] animate-spin" />
            ) : (
              <Users className="size-[14px]" />
            )}
            {submitting ? 'Creating...' : 'Create Group'}
          </button>
        </div>
      </div>
    </div>
  )
}
