import { Check, Clock, Lock, TriangleAlert } from 'lucide-react'
import type { JourneyRow } from '@/types/milestones'

const HEADER_ORDER: JourneyRow['header'][] = [
  'INITIAL',
  'CAPSTONE 1',
  'CAPSTONE 2',
  'FINAL',
]

function RowIcon({ state }: { state: JourneyRow['state'] }) {
  if (state === 'LOCKED') {
    return (
      <div className="bg-[#f0f2fa] border border-[#e8ebf8] rounded-[11px] size-[22px] flex items-center justify-center shrink-0">
        <Lock className="size-[11px] text-[#b6bcd6]" strokeWidth={2.5} />
      </div>
    )
  }

  if (state === 'DEFAULT') {
    return (
      <div className="bg-[#707dff] rounded-[11px] size-[22px] flex items-center justify-center shrink-0 drop-shadow-[0px_1px_2px_rgba(112,125,255,0.4)]">
        <span className="size-[7px] rounded-full bg-white" />
      </div>
    )
  }

  if (state === 'NEEDS_REVISION') {
    return (
      <div className="bg-[rgba(245,158,11,0.1)] border border-[rgba(245,158,11,0.3)] rounded-[11px] size-[22px] flex items-center justify-center shrink-0">
        <TriangleAlert className="size-[12px] text-[#f59e0b]" strokeWidth={2.25} />
      </div>
    )
  }

  if (state === 'SUBMITTED') {
    return (
      <div className="bg-[rgba(112,125,255,0.1)] border border-[rgba(112,125,255,0.25)] rounded-[11px] size-[22px] flex items-center justify-center shrink-0">
        <Clock className="size-[12px] text-[#707dff]" strokeWidth={2.25} />
      </div>
    )
  }

  return (
    <div className="bg-[#eefbf2] border border-[rgba(34,197,94,0.25)] rounded-[11px] size-[22px] flex items-center justify-center shrink-0">
      <Check className="size-[12px] text-[#22c55e]" strokeWidth={3} />
    </div>
  )
}

function MilestoneRow({ row }: { row: JourneyRow }) {
  const locked = row.state === 'LOCKED'

  const sublabelColor: Record<JourneyRow['state'], string> = {
    APPROVED: 'text-[#22c55e]',
    NEEDS_REVISION: 'text-[#f59e0b]',
    SUBMITTED: 'text-[#707dff]',
    DEFAULT: 'text-transparent',
    LOCKED: 'text-transparent',
  }

  return (
    <div
      className={`relative flex items-center gap-[10px] px-[6px] py-[8px] rounded-[9px] h-[50px] ${
        row.state === 'DEFAULT'
          ? 'bg-[#f8f9ff] border border-[rgba(112,125,255,0.13)]'
          : 'border border-transparent'
      }`}
    >
      <RowIcon state={row.state} />
      <div className="flex-1 min-w-px">
        <p
          className={`truncate font-sans font-semibold text-[12px] leading-[15.6px] ${
            locked ? 'text-[#9ea8c6]' : 'text-[#4a5280]'
          }`}
        >
          {row.label}
        </p>
        {row.sublabel ? (
          <p
            className={`truncate font-sans font-medium text-[10px] leading-[15px] pt-px ${sublabelColor[row.state]}`}
          >
            {row.sublabel}
          </p>
        ) : (
          <div className="h-[16px]" />
        )}
      </div>
    </div>
  )
}

export function CapstoneJourney({ journey }: { journey: JourneyRow[] }) {
  const groups = HEADER_ORDER.map((header) => ({
    header,
    rows: journey.filter((row) => row.header === header),
  })).filter((group) => group.rows.length > 0)

  return (
    <aside className="h-full bg-white border border-[#e8ebf8] border-l-0 rounded-r-[12px] rounded-l-none shadow-[0px_2px_12px_0px_rgba(30,58,138,0.06),0px_1px_3px_0px_rgba(0,0,0,0.04)] w-[200px] shrink-0 flex flex-col gap-[12px] px-[13px] py-[26px] overflow-hidden">
      <p className="font-heading font-bold text-[12.5px] leading-[18.75px] text-[#1e3a8a] tracking-[-0.125px] px-[4px]">
        Capstone Journey
      </p>

      <div className="flex flex-col gap-[16px] flex-1 min-h-0 overflow-y-auto pr-[2px]">
        {groups.map((group, groupIndex) => (
          <section key={group.header} className={groupIndex > 0 ? 'pt-[1px]' : ''}>
            <p className="font-sans font-extrabold text-[9.5px] leading-[14.25px] tracking-[0.95px] uppercase text-[#bbc0d8] px-[4px] pb-[7px]">
              {group.header}
            </p>
            <div className="relative">
              <div className="absolute left-[17px] top-[9px] bottom-[9px] w-[2px] rounded-full bg-gradient-to-b from-[#e0e3f0] to-[#f0f2fa]" />
              <div className="relative flex flex-col gap-[5px]">
                {group.rows.map((row) => (
                  <MilestoneRow key={row.slug} row={row} />
                ))}
              </div>
            </div>
          </section>
        ))}
      </div>
    </aside>
  )
}
