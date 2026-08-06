'use client'

import { useState } from 'react'
import { Loader2, Pencil, TriangleAlert, X } from 'lucide-react'
import { toast } from 'sonner'
import { renameGroup } from '@/lib/actions/groups'

interface RenameGroupModalProps {
  groupId: number
  currentName: string
  onClose: () => void
  onRenamed: () => void
}

export function RenameGroupModal({
  groupId,
  currentName,
  onClose,
  onRenamed,
}: RenameGroupModalProps) {
  const [name, setName] = useState(currentName)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!name.trim()) return
    setSubmitting(true)
    setError(null)
    const res = await renameGroup(groupId, name)
    setSubmitting(false)
    if (!res.success) {
      setError(res.message)
      return
    }
    toast.success(res.message)
    onRenamed()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(16,19,58,0.3)] backdrop-blur-[4px]">
      <div className="relative bg-white border border-[#eceef8] rounded-[16px] w-[420px] px-[24px] pt-[26px] pb-[22px] shadow-[0px_24px_64px_0px_rgba(16,20,58,0.16),0px_4px_16px_0px_rgba(0,0,0,0.06)] flex flex-col">
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-[18px] right-[18px] bg-[#fafbff] border border-[#eceef8] rounded-[14px] size-[28px] flex items-center justify-center hover:bg-gray-50 transition-colors"
        >
          <X className="size-[13px] text-[#8a93b4]" />
        </button>

        <p className="font-heading font-bold text-[17px] leading-[25.5px] text-[#12143a] tracking-[-0.17px]">
          Rename Group
        </p>
        <p className="font-sans font-medium text-[13px] leading-[20.15px] text-[#8a93b4] pt-[4px]">
          Choose a new name for your capstone group.
        </p>

        <div className="pt-[20px] flex flex-col">
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
          {error && (
            <div className="flex gap-[6px] items-start pt-[8px] w-full">
              <TriangleAlert className="size-[13px] text-[#fe6f6f] shrink-0 mt-px" />
              <p className="font-medium text-[12px] leading-[17.4px] text-[#fe6f6f]">
                {error}
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-[10px] items-center w-full pt-[20px]">
          <button
            onClick={onClose}
            disabled={submitting}
            className="flex-1 bg-white border border-[#dddff0] rounded-[9px] py-[11px] text-center font-semibold text-[13.5px] text-[#5a6382] hover:bg-gray-50 disabled:opacity-60 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim() || submitting}
            className="flex-1 flex items-center justify-center gap-[8px] rounded-[9px] py-[11px] text-[13.5px] font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed transition-opacity shadow-[0px_4px_14px_0px_rgba(112,125,255,0.3)]"
            style={{
              backgroundImage: 'linear-gradient(165deg, #707dff 0%, #5565ff 100%)',
            }}
          >
            {submitting ? (
              <Loader2 className="size-[14px] animate-spin" />
            ) : (
              <Pencil className="size-[14px]" />
            )}
            {submitting ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
