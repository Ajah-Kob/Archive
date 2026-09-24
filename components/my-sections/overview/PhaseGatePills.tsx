import { resolveSectionAvailability } from '@/lib/journey'
import { CAPSTONE1_KEYS, CAPSTONE2_KEYS } from '@/lib/milestones/phase'
import type { MilestoneAvailabilityItem } from '@/lib/actions/sections'

interface PhaseGatePillsProps {
  /** ISO string or null — mirrors Section.capstone1OpenedAt / capstone2OpenedAt */
  capstone1OpenedAt: string | null
  capstone2OpenedAt: string | null
  /** Optional explicit milestone availability rows — when provided we run through
   *  resolveSectionAvailability so the phase hard-gate cannot be bypassed by a
   *  stale per-milestone `openedAt`. When omitted the gate booleans alone decide. */
  milestones?: MilestoneAvailabilityItem[]
  // Also accepts the lightweight shape from milestoneAvailability query if caller
  // only has key/openedAt without label/phase.
  milestoneAvailability?: { key: string; openedAt: string | Date | null }[]
  className?: string
}

function toRows(
  milestones?: MilestoneAvailabilityItem[],
  milestoneAvailability?: { key: string; openedAt: string | Date | null }[],
): { key: string; openedAt: Date | null }[] | null {
  if (milestones && milestones.length > 0) {
    return milestones.map((m) => ({
      key: m.key,
      openedAt: m.openedAt ? new Date(m.openedAt) : null,
    }))
  }
  if (milestoneAvailability && milestoneAvailability.length > 0) {
    return milestoneAvailability.map((r) => ({
      key: r.key,
      openedAt: r.openedAt ? new Date(r.openedAt as string) : null,
    }))
  }
  return null
}

/**
 * PhaseGatePills — Capstone 1 / Capstone 2 Open/Locked pills.
 *
 * Pure presentational component. No Prisma access, props only.
 * Derives open state from the section phase gates (capstone1OpenedAt /
 * capstone2OpenedAt) and, when milestone rows are provided, validates through
 * `resolveSectionAvailability` so a locked phase hard-gates every milestone in
 * that phase even if a stale per-milestone row says open.
 *
 * Reuses Section tabs / Milestone grid tokens: bg-white, border-[#eceef8],
 * rounded-[14px] shadow, dot indicator, font-sans tracking.
 */
export function PhaseGatePills({
  capstone1OpenedAt,
  capstone2OpenedAt,
  milestones,
  milestoneAvailability,
  className,
}: PhaseGatePillsProps) {
  const c1GateOpen = !!capstone1OpenedAt
  const c2GateOpen = !!capstone2OpenedAt

  const rows = toRows(milestones, milestoneAvailability)

  // When rows are provided, run through the hard-gate resolver so the pill
  // reflects the same availability the journey does. The pill itself remains
  // a phase gate indicator (not a per-milestone aggregate) — if the gate is
  // locked the whole phase is Locked regardless of row state.
  let c1Open = c1GateOpen
  let c2Open = c2GateOpen
  if (rows) {
    const availability = resolveSectionAvailability(c1GateOpen, c2GateOpen, rows)
    // Keep gate as source of truth for the pill label, but cross-check via
    // resolver to ensure a locked gate never shows Open even if a row is stale.
    // The resolver already enforces: if !gateOpen then every key in that phase is false.
    c1Open = c1GateOpen && CAPSTONE1_KEYS.some((k) => availability[k])
    c2Open = c2GateOpen && CAPSTONE2_KEYS.some((k) => availability[k])
    // Fallback: if gate is open but resolver says no keys are open (e.g. no
    // milestone rows exist yet), preserve the gate value so the pill doesn't
    // flicker Locked when the section was just unlocked.
    if (c1GateOpen && !c1Open) c1Open = true
    if (c2GateOpen && !c2Open) c2Open = true
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className ?? ''}`}>
      <PhasePill label="CAPSTONE 1" open={c1Open} />
      <PhasePill label="CAPSTONE 2" open={c2Open} />
    </div>
  )
}

function PhasePill({ label, open }: { label: string; open: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-[7px] h-[26px] px-[11px] rounded-full border font-sans text-[11px] leading-none tracking-[0.5px] uppercase transition-colors ${
        open
          ? 'bg-[rgba(34,197,94,0.08)] border-[rgba(34,197,94,0.22)] text-[#16a34a]'
          : 'bg-white border-[#eceef8] text-[#8a93b4]'
      }`}
      aria-label={`${label} ${open ? 'Open' : 'Locked'}`}
      title={`${label} is ${open ? 'Open' : 'Locked'}`}
    >
      <span
        className="size-[7px] rounded-full shrink-0"
        style={{ backgroundColor: open ? '#22c55e' : '#94a3b8' }}
        aria-hidden
      />
      <span className="font-bold">{label}</span>
      <span className="opacity-60">·</span>
      <span className={open ? 'font-bold' : 'font-semibold'}>{open ? 'Open' : 'Locked'}</span>
    </span>
  )
}

export default PhaseGatePills
