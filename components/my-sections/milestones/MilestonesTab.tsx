'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Lock, Unlock } from 'lucide-react'
import { toast } from 'sonner'
import { setMilestoneAvailability, setPhaseAvailability } from '@/lib/actions/sections'
import type { MilestoneAvailabilityItem } from '@/lib/actions/sections'
import { CAPSTONE1_KEYS, CAPSTONE2_KEYS } from '@/lib/milestones/phase'
import { MilestoneConfirmModal } from '@/components/my-sections/milestones/MilestoneConfirmModal'
import { PhaseConfirmModal } from '@/components/my-sections/milestones/PhaseConfirmModal'

interface MilestonesTabProps {
  sectionId: number
  initial: MilestoneAvailabilityItem[]
  capstone1Open: boolean
  capstone2Open: boolean
}

function StatusDot({ open }: { open: boolean }) {
  if (open) {
    return (
      <span className="flex items-center gap-[6px] whitespace-nowrap">
        <span className="size-[7px] rounded-full bg-[#22c55e]" />
        <span className="font-sans font-bold text-[11px] leading-[16.5px] text-[#22c55e]">Open</span>
      </span>
    )
  }
  return (
    <span className="flex items-center gap-[6px] whitespace-nowrap">
      <span className="size-[7px] rounded-full border border-[#b6bcd6] bg-white" />
      <span className="font-sans font-semibold text-[11px] leading-[16.5px] text-[#8a93b4]">Locked</span>
    </span>
  )
}

function PhaseStatus({ open, total, count }: { open: boolean; total: number; count: number }) {
  if (count === total && open) {
    return (
      <span className="flex items-center gap-[6px] whitespace-nowrap">
        <span className="size-[7px] rounded-full bg-[#22c55e]" />
        <span className="font-sans font-bold text-[11px] leading-[16.5px] text-[#22c55e]">Open</span>
        <span className="font-sans font-medium text-[11px] leading-[16.5px] text-[#8a93b4]">{count}/{total}</span>
      </span>
    )
  }
  if (count === 0) {
    return (
      <span className="flex items-center gap-[6px] whitespace-nowrap">
        <span className="size-[7px] rounded-full border border-[#b6bcd6] bg-white" />
        <span className="font-sans font-semibold text-[11px] leading-[16.5px] text-[#8a93b4]">Locked</span>
        <span className="font-sans font-medium text-[11px] leading-[16.5px] text-[#8a93b4]">{count}/{total}</span>
      </span>
    )
  }
  return (
    <span className="flex items-center gap-[6px] whitespace-nowrap">
      <span className="size-[7px] rounded-full bg-[#f59e0b]" />
      <span className="font-sans font-bold text-[11px] leading-[16.5px] text-[#f59e0b]">Partial</span>
      <span className="font-sans font-medium text-[11px] leading-[16.5px] text-[#8a93b4]">{count}/{total}</span>
    </span>
  )
}

export function MilestonesTab({ sectionId, initial, capstone1Open: initialCap1Open, capstone2Open: initialCap2Open }: MilestonesTabProps) {
  const router = useRouter()
  const [items, setItems] = useState<MilestoneAvailabilityItem[]>(initial)
  const [capstone1Open, setCapstone1Open] = useState(initialCap1Open)
  const [capstone2Open, setCapstone2Open] = useState(initialCap2Open)
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [busyPhase, setBusyPhase] = useState<'CAPSTONE 1' | 'CAPSTONE 2' | null>(null)
  const [pendingMilestone, setPendingMilestone] = useState<{ item: MilestoneAvailabilityItem; willOpen: boolean } | null>(null)
  const [pendingPhase, setPendingPhase] = useState<{ phase: 'CAPSTONE 1' | 'CAPSTONE 2'; willOpen: boolean } | null>(null)

  const cap1 = useMemo(() => items.filter((m) => (CAPSTONE1_KEYS as string[]).includes(m.key)), [items])
  const cap2 = useMemo(() => items.filter((m) => (CAPSTONE2_KEYS as string[]).includes(m.key)), [items])
  const cap1Open = cap1.filter((m) => m.open).length
  const cap2Open = cap2.filter((m) => m.open).length
  const cap1AllOpen = cap1Open === cap1.length && cap1.length > 0
  const cap2AllOpen = cap2Open === cap2.length && cap2.length > 0

  async function applySingle(item: MilestoneAvailabilityItem, open: boolean) {
    if (busyKey || busyPhase) return
    setBusyKey(item.key)
    const res = await setMilestoneAvailability(sectionId, item.key as any, open)
    setBusyKey(null)
    setPendingMilestone(null)
    if (!res.success) {
      toast.error(res.message)
      return
    }
    setItems((prev) => prev.map((m) => (m.key === item.key ? { ...m, open, openedAt: open ? new Date().toISOString() : null } : m)))
    toast.success(res.message)
    router.refresh()
  }

  async function applyPhase(phase: 'CAPSTONE 1' | 'CAPSTONE 2', open: boolean) {
    if (busyKey || busyPhase) return
    setBusyPhase(phase)
    const res = await setPhaseAvailability(sectionId, phase, open)
    setBusyPhase(null)
    setPendingPhase(null)
    if (!res.success) {
      toast.error(res.message)
      return
    }
    if (phase === 'CAPSTONE 1') setCapstone1Open(open)
    else setCapstone2Open(open)
    toast.success(res.message)
    router.refresh()
  }

  const Group = ({
    title,
    phase,
    phaseItems,
    gateOpen,
  }: {
    title: string
    phase: 'CAPSTONE 1' | 'CAPSTONE 2'
    phaseItems: MilestoneAvailabilityItem[]
    gateOpen: boolean
  }) => {
    const isBusy = busyPhase === phase
    const nextOpen = !gateOpen
    const isLocked = !gateOpen
    return (
      <div className="bg-white border border-[#e8ebf8] rounded-[14px] shadow-[0px_2px_12px_0px_rgba(30,58,138,0.06),0px_1px_3px_0px_rgba(0,0,0,0.04)] flex flex-col min-w-0 overflow-hidden">
        <div className="px-5 py-[12px] border-b border-[#f0f2fa] flex items-center justify-between gap-3">
          <h4 className="font-heading font-bold text-[13px] leading-[19.5px] text-[#1e3a8a] tracking-[-0.14px]">{title}</h4>
          <span className="flex items-center gap-2 shrink-0">
            {gateOpen ? (
              <span className="flex items-center gap-[6px] whitespace-nowrap">
                <span className="size-[7px] rounded-full bg-[#22c55e]" />
                <span className="font-sans font-bold text-[11px] leading-[16.5px] text-[#22c55e]">Open</span>
              </span>
            ) : (
              <span className="flex items-center gap-[6px] whitespace-nowrap">
                <span className="size-[7px] rounded-full border border-[#b6bcd6] bg-white" />
                <span className="font-sans font-semibold text-[11px] leading-[16.5px] text-[#8a93b4]">Locked</span>
              </span>
            )}
            <button
              type="button"
              onClick={() => setPendingPhase({ phase, willOpen: nextOpen })}
              disabled={!!busyKey || !!busyPhase}
              className={`inline-flex items-center gap-1.5 h-[28px] px-3 rounded-[9px] font-sans font-bold text-[11.5px] leading-none border transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${gateOpen ? 'bg-white border-[#dddff0] text-[#5a6382] hover:bg-gray-50' : 'bg-[#707dff] border-[#707dff] text-white hover:bg-[#5a67ff]'}`}
              aria-label={nextOpen ? `Unlock ${title}` : `Lock ${title}`}
            >
              {isBusy ? <Loader2 className="size-[12px] animate-spin" /> : gateOpen ? <Lock className="size-[12px]" /> : <Unlock className="size-[12px]" />}
              {gateOpen ? 'Lock' : 'Unlock'}
            </button>
          </span>
        </div>
        <div className="relative flex flex-col py-[4px]">
          {phaseItems.map((item) => (
            <div key={item.key} className="flex items-center justify-between gap-[10px] px-5 py-[8px]">
              <span className="min-w-0 truncate font-sans font-semibold text-[12.5px] leading-[18.75px] text-[#1e2145]">{item.label}</span>
              <span className="flex items-center gap-[10px] shrink-0">
                <StatusDot open={item.open} />
                <button
                  type="button"
                  onClick={() => setPendingMilestone({ item, willOpen: !item.open })}
                  disabled={!!busyKey || !!busyPhase || isLocked}
                  aria-label={item.open ? `Lock ${item.label}` : `Unlock ${item.label}`}
                  className={`flex items-center justify-center size-[26px] rounded-[7px] transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${item.open ? 'bg-white border border-[#dddff0] text-[#8a93b4] hover:bg-gray-50 hover:text-[#5a6382]' : 'bg-[#f7f7ff] border border-[rgba(112,125,255,0.19)] text-[#707dff] hover:bg-[#eeefff]'}`}
                >
                  {busyKey === item.key ? <Loader2 className="size-[12px] animate-spin" /> : item.open ? <Lock className="size-[12px]" strokeWidth={2.25} /> : <Unlock className="size-[12px]" strokeWidth={2.25} />}
                </button>
              </span>
            </div>
          ))}
          {isLocked && (
            <div className="absolute inset-0 bg-white/75 backdrop-blur-[1.5px] flex flex-col items-center justify-center gap-2 p-4">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-[#eceef8] shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
                <Lock className="size-[11px] text-[#8a93b4]" />
                <span className="font-sans font-bold text-[11px] leading-[16.5px] text-[#5a6382] tracking-[0.3px]">
                  {title} locked
                </span>
              </div>
              <p className="font-sans font-medium text-[11px] leading-[16.5px] text-[#8a93b4] text-center max-w-[240px]">
                Unlock {title} to manage its milestones.
              </p>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="flex flex-col gap-[16px] flex-1 min-h-0">
        <Group title="Capstone 1" phase="CAPSTONE 1" phaseItems={cap1} gateOpen={capstone1Open} />
        <Group title="Capstone 2" phase="CAPSTONE 2" phaseItems={cap2} gateOpen={capstone2Open} />
        <p className="font-sans font-medium text-[11px] leading-[16.5px] text-[#8a93b4] px-1">
          Locking a phase hides its milestones for students. Unlock a phase to make its milestones available, then unlock milestones individually.
        </p>
      </div>

      <MilestoneConfirmModal
        isOpen={!!pendingMilestone}
        milestoneLabel={pendingMilestone?.item.label ?? ''}
        willOpen={pendingMilestone?.willOpen ?? false}
        phase={
          pendingMilestone
            ? ((CAPSTONE1_KEYS as string[]).includes(pendingMilestone.item.key) ? 'CAPSTONE 1' : 'CAPSTONE 2')
            : undefined
        }
        isLoading={!!busyKey}
        onConfirm={() => {
          if (pendingMilestone) applySingle(pendingMilestone.item, pendingMilestone.willOpen)
        }}
        onCancel={() => {
          if (!busyKey) setPendingMilestone(null)
        }}
      />

      <PhaseConfirmModal
        isOpen={!!pendingPhase}
        phase={pendingPhase?.phase ?? 'CAPSTONE 1'}
        willOpen={pendingPhase?.willOpen ?? false}
        milestoneLabels={
          pendingPhase?.phase === 'CAPSTONE 1' ? cap1.map((m) => m.label) : cap2.map((m) => m.label)
        }
        isLoading={!!busyPhase}
        onConfirm={() => {
          if (pendingPhase) applyPhase(pendingPhase.phase, pendingPhase.willOpen)
        }}
        onCancel={() => {
          if (!busyPhase) setPendingPhase(null)
        }}
      />
    </>
  )
}
