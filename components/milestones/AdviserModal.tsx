'use client'

import { useEffect, useState } from 'react'
import { Loader2, UserRound, X } from 'lucide-react'
import { toast } from 'sonner'
import { getAvailableAdvisers, sendAdviserInvitation } from '@/lib/actions/groups'
import type { AdviserOption } from '@/types/milestones'
import { ADVISER_CAP } from '@/config/constants'
import { getInitials } from '@/lib/helper'

interface AdviserModalProps {
  onClose: () => void
  onInvited: () => void
}

export function AdviserModal({ onClose, onInvited }: AdviserModalProps) {
  const [advisers, setAdvisers] = useState<AdviserOption[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    getAvailableAdvisers().then((res) => {
      if (cancelled) return
      setAdvisers(res.success ? (res.payload ?? []) : [])
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const handleInvite = async (facultyId: number) => {
    setBusyId(facultyId)
    const res = await sendAdviserInvitation(facultyId)
    setBusyId(null)
    if (!res.success) {
      toast.error(res.message)
      return
    }
    toast.success(res.message)
    onInvited()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(16,19,58,0.3)] backdrop-blur-[4px]">
      <div className="relative bg-white border border-[#eceef8] rounded-[16px] w-[480px] shadow-[0px_24px_64px_0px_rgba(16,20,58,0.16),0px_4px_16px_0px_rgba(0,0,0,0.06)] flex flex-col">
        <div className="flex items-start justify-between gap-[16px] px-[24px] pt-[22px] pb-[19px] border-b border-[#eceef8]">
          <div>
            <p className="font-heading font-bold text-[17px] leading-[25.5px] text-[#12143a] tracking-[-0.17px]">
              Invite an Adviser
            </p>
            <p className="font-sans font-medium text-[12.5px] leading-[18.75px] text-[#8a93b4] pt-[4px]">
              Choose a faculty member to supervise your group. They&apos;ll accept
              from their notification panel.
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

        <div className="px-[24px] py-[20px] flex flex-col">
          <div className="border border-[#eceef8] rounded-[9px] max-h-[360px] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-[200px]">
                <span className="text-[12.5px] font-medium text-[#9ea8c6]">
                  Loading faculty…
                </span>
              </div>
            ) : advisers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[200px] gap-[8px]">
                <UserRound className="size-6 text-[#c4cadf]" strokeWidth={1.75} />
                <span className="text-[12.5px] font-medium text-[#9ea8c6]">
                  No faculty members available.
                </span>
              </div>
            ) : (
              advisers.map((adviser, i) => (
                <button
                  key={adviser.id}
                  type="button"
                  disabled={busyId !== null}
                  onClick={() => handleInvite(adviser.id)}
                  className={`w-full flex items-center gap-[12px] px-[14px] py-[11px] border-b border-[#f4f5fc] last:border-b-0 text-left transition-colors ${
                    busyId === null ? 'hover:bg-[#fafbff] cursor-pointer' : 'cursor-wait'
                  }`}
                >
                  <div
                    className="size-[36px] rounded-full flex items-center justify-center shrink-0 drop-shadow-[0px_2px_3px_rgba(0,0,0,0.12)]"
                    style={{
                      backgroundImage:
                        i % 2 === 0
                          ? 'linear-gradient(135deg, #707dff 0%, #5565ff 100%)'
                          : 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
                    }}
                  >
                    <span className="text-white text-[12px] font-bold tracking-[0.24px]">
                      {getInitials(adviser.name)}
                    </span>
                  </div>

                  <div className="flex-1 min-w-px">
                    <p className="font-sans font-semibold text-[13.5px] leading-[20.25px] text-[#1e2145] truncate">
                      {adviser.name}
                    </p>
                    <p className="font-sans font-medium text-[11.5px] leading-[17.25px] text-[#9ea8c6] truncate">
                      {adviser.email}
                    </p>
                  </div>

                  <span
                    className={`rounded-[6px] px-[8px] py-[3px] text-[10.5px] font-semibold whitespace-nowrap ${
                      adviser.atCap
                        ? 'bg-[rgba(254,111,111,0.08)] text-[#e85555]'
                        : 'bg-[#f4f5fc] text-[#8a93b4]'
                    }`}
                  >
                    {adviser.atCap
                      ? 'Full'
                      : `${adviser.workload}/${ADVISER_CAP} load`}
                  </span>

                  {busyId === adviser.id && (
                    <Loader2 className="size-[14px] text-[#707dff] animate-spin shrink-0" />
                  )}
                </button>
              ))
            )}
          </div>

          {!loading && advisers.some((a) => a.atCap) && (
            <p className="pt-[10px] text-[11.5px] font-medium text-[#e85555]">
              Faculty at full workload ({ADVISER_CAP}) can&apos;t accept new
              advisories.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
