'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Lock, Unlock } from 'lucide-react'
import { toast } from 'sonner'
import { setMilestoneAvailability } from '@/lib/actions/sections'
import type { MilestoneAvailabilityItem } from '@/lib/actions/sections'

interface MilestoneManagementProps {
  sectionId: number
  initial: MilestoneAvailabilityItem[]
}

function StatusDot({ open }: { open: boolean }) {
  if (open) {
    return (
      <span className="flex items-center gap-[6px] whitespace-nowrap">
        <span className="size-[7px] rounded-full bg-[#22c55e]" />
        <span className="font-sans font-bold text-[11px] leading-[16.5px] text-[#22c55e]">
          Open
        </span>
      </span>
    )
  }
  return (
    <span className="flex items-center gap-[6px] whitespace-nowrap">
      <span className="size-[7px] rounded-full border border-[#b6bcd6] bg-white" />
      <span className="font-sans font-semibold text-[11px] leading-[16.5px] text-[#8a93b4]">
        Locked
      </span>
    </span>
  )
}

export function MilestoneManagement({
  sectionId,
  initial,
}: MilestoneManagementProps) {
  const router = useRouter()
  const [items, setItems] = useState<MilestoneAvailabilityItem[]>(initial)
  const [busyKey, setBusyKey] = useState<string | null>(null)

  async function applyChange(item: MilestoneAvailabilityItem, open: boolean) {
    if (busyKey) return
    setBusyKey(item.key)
    const res = await setMilestoneAvailability(sectionId, item.key, open)
    setBusyKey(null)
    if (!res.success) {
      toast.error(res.message)
      return
    }
    setItems((prev) =>
      prev.map((m) =>
        m.key === item.key
          ? { ...m, open, openedAt: open ? new Date().toISOString() : null }
          : m,
      ),
    )
    toast.success(res.message)
    router.refresh()
  }

  return (
    <div className="bg-white border border-[#e8ebf8] rounded-[14px] shadow-[0px_2px_12px_0px_rgba(30,58,138,0.06),0px_1px_3px_0px_rgba(0,0,0,0.04)] flex flex-col min-w-0">
      <div className="px-5 py-[14px] border-b border-[#f0f2fa]">
        <h3 className="font-heading font-bold text-[14px] leading-[21px] text-[#1e3a8a] tracking-[-0.14px]">
          Milestone Management
        </h3>
      </div>

      <div className="flex flex-col py-[4px]">
        {items.map((item) => (
          <div
            key={item.key}
            className="flex items-center justify-between gap-[10px] px-5 py-[8px]"
          >
            <span className="min-w-0 truncate font-sans font-semibold text-[12.5px] leading-[18.75px] text-[#1e2145]">
              {item.label}
            </span>

            <span className="flex items-center gap-[10px] shrink-0">
              <StatusDot open={item.open} />
              <button
                type="button"
                onClick={() => applyChange(item, !item.open)}
                disabled={busyKey != null}
                aria-label={
                  item.open
                    ? `Lock ${item.label}`
                    : `Unlock ${item.label}`
                }
                className={`flex items-center justify-center size-[26px] rounded-[7px] transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
                  item.open
                    ? 'bg-white border border-[#dddff0] text-[#8a93b4] hover:bg-gray-50 hover:text-[#5a6382]'
                    : 'bg-[#f7f7ff] border border-[rgba(112,125,255,0.19)] text-[#707dff] hover:bg-[#eeefff]'
                }`}
              >
                {busyKey === item.key ? (
                  <Loader2 className="size-[12px] animate-spin" />
                ) : item.open ? (
                  <Lock className="size-[12px]" strokeWidth={2.25} />
                ) : (
                  <Unlock className="size-[12px]" strokeWidth={2.25} />
                )}
              </button>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}