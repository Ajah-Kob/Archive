'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { Check, Loader2, Lock, Unlock } from 'lucide-react'
import { toast } from 'sonner'
import { openCapstone2 } from '@/lib/actions/sections'

interface MilestonePhasesCardProps {
  sectionId: number
  capstone2OpenedAt: string | null
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function MilestonePhasesCard({
  sectionId,
  capstone2OpenedAt,
}: MilestonePhasesCardProps) {
  const router = useRouter()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  async function handleOpen() {
    setBusy(true)
    const res = await openCapstone2(sectionId)
    setBusy(false)
    setConfirmOpen(false)
    if (res.success) {
      toast.success(res.message)
      router.refresh()
    } else {
      toast.error(res.message)
    }
  }

  return (
    <>
      <div className="bg-white border border-[#e8ebf8] rounded-[14px] shadow-[0px_2px_12px_0px_rgba(30,58,138,0.06),0px_1px_3px_0px_rgba(0,0,0,0.04)] px-[18px] py-[13px] flex flex-wrap items-center gap-x-[24px] gap-y-[10px] shrink-0">
        <p className="font-heading font-bold text-[13px] leading-[19.5px] text-[#1e3a8a] tracking-[-0.13px]">
          Milestone Phases
        </p>

        <div className="flex flex-wrap items-center gap-[8px]">
          <span className="font-sans font-semibold text-[12px] leading-[18px] text-[#6b7399]">
            Capstone 1
          </span>
          <span className="flex gap-[5px] items-center px-[9px] py-[3px] rounded-full bg-[#eefbf2] border border-[rgba(34,197,94,0.25)] font-sans font-bold text-[11px] leading-[16.5px] text-[#22c55e]">
            <Check className="size-[11px]" strokeWidth={3} />
            Open
          </span>
          <span className="font-sans font-medium text-[11px] leading-[16.5px] text-[#9ea8c6]">
            Available to groups by default
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-[8px]">
          <span className="font-sans font-semibold text-[12px] leading-[18px] text-[#6b7399]">
            Capstone 2
          </span>
          {capstone2OpenedAt ? (
            <>
              <span className="flex gap-[5px] items-center px-[9px] py-[3px] rounded-full bg-[#eefbf2] border border-[rgba(34,197,94,0.25)] font-sans font-bold text-[11px] leading-[16.5px] text-[#22c55e]">
                <Check className="size-[11px]" strokeWidth={3} />
                Open
              </span>
              <span className="font-sans font-medium text-[11px] leading-[16.5px] text-[#9ea8c6]">
                since {formatDate(capstone2OpenedAt)}
              </span>
            </>
          ) : (
            <>
              <span className="flex gap-[5px] items-center px-[9px] py-[3px] rounded-full bg-[#f4f5fc] border border-[#e8ebf8] font-sans font-bold text-[11px] leading-[16.5px] text-[#8a93b4]">
                <Lock className="size-[11px]" />
                Closed
              </span>
              <button
                type="button"
                onClick={() => setConfirmOpen(true)}
                className="flex gap-[6px] items-center h-[28px] px-[11px] rounded-[8px] font-sans font-bold text-[12px] leading-[18px] text-white hover:opacity-90 active:scale-[0.98] transition-all"
                style={{
                  backgroundImage:
                    'linear-gradient(165deg, #707dff 0%, #5565ff 100%)',
                  boxShadow: '0px 3px 8px rgba(112,125,255,0.25)',
                }}
              >
                <Unlock className="size-[13px]" />
                Open Capstone 2
              </button>
            </>
          )}
        </div>
      </div>

      {confirmOpen &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(16,19,58,0.3)] backdrop-blur-[4px]">
            <div className="relative bg-white border border-[#eceef8] rounded-[16px] w-[400px] px-[24px] pt-[26px] pb-[22px] shadow-[0px_24px_64px_0px_rgba(16,20,58,0.16),0px_4px_16px_0px_rgba(0,0,0,0.06)] flex flex-col items-center">
              <div className="size-[52px] rounded-[16px] bg-[rgba(112,125,255,0.08)] flex items-center justify-center">
                <Unlock className="size-6 text-[#707dff]" strokeWidth={2} />
              </div>

              <p className="font-heading font-bold text-[16px] leading-[24px] text-[#12143a] tracking-[-0.16px] pt-[16px]">
                Open Capstone 2?
              </p>
              <p className="font-sans font-medium text-[13px] leading-[20.15px] text-[#8a93b4] text-center pt-[8px]">
                Groups in this section will gain access to Chapters 4 and 5.
                This opens the phase for the whole section and cannot be undone.
              </p>

              <div className="flex gap-[10px] items-center w-full pt-[20px]">
                <button
                  type="button"
                  onClick={() => setConfirmOpen(false)}
                  disabled={busy}
                  className="flex-1 bg-white border border-[#dddff0] rounded-[9px] py-[11px] text-center font-semibold text-[13.5px] text-[#5a6382] hover:bg-gray-50 disabled:opacity-60 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleOpen}
                  disabled={busy}
                  className="flex-1 flex items-center justify-center gap-[8px] rounded-[9px] py-[11px] text-[13.5px] font-semibold text-white disabled:opacity-60 transition-opacity"
                  style={{
                    backgroundImage:
                      'linear-gradient(165deg, #707dff 0%, #5565ff 100%)',
                    boxShadow: '0px 4px 14px rgba(112,125,255,0.3)',
                  }}
                >
                  {busy && <Loader2 className="size-[14px] animate-spin" />}
                  Open Capstone 2
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
