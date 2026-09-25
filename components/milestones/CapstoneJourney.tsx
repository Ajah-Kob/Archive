import Link from 'next/link'
import { Check, Clock, Lock, TriangleAlert } from 'lucide-react'
import type { JourneyRow } from '@/types/milestones'

const HEADER_ORDER: JourneyRow['header'][] = ['CAPSTONE 1', 'CAPSTONE 2']

export function RowIcon({
  state,
  isActive,
}: {
  state: JourneyRow['state']
  isActive: boolean
}) {
  if (isActive) {
    return (
      <div className="bg-[#707dff] rounded-[11px] size-[22px] flex items-center justify-center shrink-0 drop-shadow-[0px_1px_2px_rgba(112,125,255,0.4)]">
        <span className="size-[7px] rounded-full bg-white" />
      </div>
    )
  }

  if (state === 'LOCKED') {
    return (
      <div className="bg-[#f0f2fa] border border-[#e8ebf8] rounded-[11px] size-[22px] flex items-center justify-center shrink-0">
        <Lock className="size-[11px] text-[#b6bcd6]" strokeWidth={2.5} />
      </div>
    )
  }

  if (state === 'DEFAULT' || state === 'NO_VERDICT') {
    return (
      <div className="bg-[#f0f2fa] border border-[#e8ebf8] rounded-[11px] size-[22px] flex items-center justify-center shrink-0">
        <span className="size-[7px] rounded-full bg-[#c4cadf]" />
      </div>
    )
  }

  if (state === 'NEEDS_REVISION' || state === 'REDEFENSE') {
    return (
      <div className="bg-[#fef2f2] border border-[rgba(239,68,68,0.3)] rounded-[11px] size-[22px] flex items-center justify-center shrink-0">
        <TriangleAlert
          className="size-[12px] text-[#ef4444]"
          strokeWidth={2.25}
        />
      </div>
    )
  }

  if (state === 'SUBMITTED' || state === 'MINOR_REVISION') {
    return (
      <div className="bg-[rgba(245,158,11,0.07)] border border-[rgba(245,158,11,0.2)] rounded-[11px] size-[22px] flex items-center justify-center shrink-0">
        <Clock className="size-[12px] text-[#f59e0b]" strokeWidth={2.25} />
      </div>
    )
  }

  if (state === 'MAJOR_REVISION') {
    return (
      <div className="bg-[rgba(249,115,22,0.08)] border border-[rgba(249,115,22,0.25)] rounded-[11px] size-[22px] flex items-center justify-center shrink-0">
        <TriangleAlert
          className="size-[12px] text-[#f97316]"
          strokeWidth={2.25}
        />
      </div>
    )
  }

  return (
    <div className="bg-[#eefbf2] border border-[rgba(34,197,94,0.25)] rounded-[11px] size-[22px] flex items-center justify-center shrink-0">
      <Check className="size-[12px] text-[#22c55e]" strokeWidth={3} />
    </div>
  )
}

interface MilestoneRowProps {
  row: JourneyRow
  isActive: boolean
}

function MilestoneRow({ row, isActive }: MilestoneRowProps) {
  const locked = row.state === 'LOCKED'

  const sublabelColor: Record<JourneyRow['state'], string> = {
    APPROVED: 'text-[#22c55e]',
    NEEDS_REVISION: 'text-[#ef4444]',
    SUBMITTED: 'text-[#eab308]',
    DEFAULT: 'text-transparent',
    LOCKED: 'text-transparent',
    NO_VERDICT: 'text-transparent',
    MINOR_REVISION: 'text-[#eab308]',
    MAJOR_REVISION: 'text-[#f97316]',
    REDEFENSE: 'text-[#ef4444]',
  }

  const baseClasses =
    'relative flex items-center gap-[10px] px-[6px] py-[8px] rounded-[9px] h-[50px]'

  const rowClasses = locked
    ? `${baseClasses} border border-transparent cursor-not-allowed`
    : isActive
      ? `${baseClasses} bg-[#edf0ff] border border-[rgba(112,125,255,0.32)] cursor-pointer transition-colors`
      : `${baseClasses} border border-transparent cursor-pointer transition-colors hover:bg-[#f4f5ff]`

  const content = (
    <>
      <RowIcon state={row.state} isActive={isActive} />
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
        ) : null}
      </div>
    </>
  )

  if (locked) {
    return <div className={rowClasses}>{content}</div>
  }

  return (
    <Link href={`/student/milestone/${row.slug}`} className={rowClasses}>
      {content}
    </Link>
  )
}

export function CapstoneJourney({
  journey,
  activeSlug,
  phaseLocks,
}: {
  journey: JourneyRow[]
  activeSlug?: string
  phaseLocks?: Partial<Record<JourneyRow['header'], boolean>>
}) {
  const groups = HEADER_ORDER.map((header) => ({
    header,
    rows: journey.filter((row) => row.header === header),
  })).filter((group) => group.rows.length > 0)

  // When phaseLocks[header] === true, the phase is locked — show transparent
  // overlay covering its milestone rows, matching the coordinator's Milestones tab.
  const isPhaseLocked = (header: JourneyRow['header']) =>
    phaseLocks?.[header] === true

  return (
    <aside className="self-stretch bg-white shadow-[0px_2px_12px_0px_rgba(30,58,138,0.06),0px_1px_3px_0px_rgba(0,0,0,0.04)] w-[200px] shrink-0 flex flex-col gap-[12px] px-[13px] py-[26px] overflow-hidden">
      <p className="font-heading font-bold text-[12.5px] leading-[18.75px] text-[#1e3a8a] tracking-[-0.125px] px-[4px]">
        Capstone Journey
      </p>

      <div className="flex flex-col gap-[16px] flex-1 min-h-0 overflow-y-auto pr-[2px]">
        {groups.map((group, groupIndex) => {
          const locked = isPhaseLocked(group.header)
          return (
            <section
              key={group.header}
              className={groupIndex > 0 ? 'pt-[1px]' : ''}
            >
              <p className="font-sans font-extrabold text-[9.5px] leading-[14.25px] tracking-[0.95px] uppercase text-[#bbc0d8] px-[4px] pb-[7px]">
                {group.header}
              </p>
              <div className="relative">
                <div className="absolute left-[17px] top-[9px] bottom-[9px] w-[2px] rounded-full bg-gradient-to-b from-[#e0e3f0] to-[#f0f2fa]" />
                <div className="relative flex flex-col gap-[5px]">
                  {group.rows.map((row) => (
                    <MilestoneRow
                      key={row.slug}
                      row={row}
                      isActive={row.slug === activeSlug && !locked}
                    />
                  ))}
                </div>
                {locked && (
                  <div className="absolute inset-0 bg-white/75 backdrop-blur-[1.5px] rounded-[10px] border border-dashed border-[#d8ddf2] flex flex-col items-center justify-center gap-1.5 p-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-[#eceef8] shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
                      <Lock className="size-[10px] text-[#8a93b4]" />
                      <span className="font-sans font-bold text-[10px] leading-[15px] tracking-[0.3px] text-[#5a6382] whitespace-nowrap">
                        {group.header} locked
                      </span>
                    </span>
                  </div>
                )}
              </div>
            </section>
          )
        })}
      </div>
    </aside>
  )
}
