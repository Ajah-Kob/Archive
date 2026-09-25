import Link from 'next/link'
import { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { notFound } from 'next/navigation'
import { authOptions } from '@/lib/authOptions'
import { getMyWorkspace } from '@/lib/actions/groups'
import { RowIcon } from '@/components/milestones/CapstoneJourney'
import { JoinedToast } from '@/components/join-archive/JoinedToast'
import type { JourneyRow, JourneyState } from '@/types/milestones'

export const metadata: Metadata = {
  title: 'Milestones',
  description: 'Submit and track your capstone chapter progress',
}

const MILESTONE_DESCRIPTIONS: Record<string, string> = {
  'chapter-1':
    'Problem statement, objectives, scope, and background of your study.',
  'chapter-2':
    'Review of related literature and systems that ground your work.',
  'chapter-3':
    'Methodology — research design, requirements, and development approach.',
  'proposal-defense':
    'Present Chapters 1–3 to the panel for approval to proceed.',
  'chapter-4':
    'Results — system presentation, testing, and evaluation findings.',
  'chapter-5': 'Summary, conclusions, and recommendations.',
  'final-defense':
    'Present the completed system and Chapters 4–5 to the panel.',
  archiving: 'Submit the final manuscript for repository archiving.',
}

function statusPill(state: JourneyState): { label: string; className: string } {
  switch (state) {
    case 'APPROVED':
      return {
        label: 'Completed',
        className:
          'bg-[rgba(22,163,74,0.07)] border-[rgba(22,163,74,0.2)] text-[#16a34a]',
      }
    case 'NEEDS_REVISION':
    case 'REDEFENSE':
      return {
        label: 'Needs revision',
        className:
          'bg-[rgba(225,29,72,0.07)] border-[rgba(225,29,72,0.2)] text-[#e11d48]',
      }
    case 'MINOR_REVISION':
      return {
        label: 'Minor Revision',
        className:
          'bg-[rgba(245,158,11,0.07)] border-[rgba(245,158,11,0.2)] text-[#f59e0b]',
      }
    case 'MAJOR_REVISION':
      return {
        label: 'Major Revision',
        className:
          'bg-[rgba(225,104,29,0.07)] border-[rgba(225,104,29,0.2)] text-[#e1681d]',
      }
    case 'SUBMITTED':
    case 'NO_VERDICT':
      return {
        label: 'In review',
        className:
          'bg-[rgba(245,158,11,0.07)] border-[rgba(245,158,11,0.2)] text-[#f59e0b]',
      }
    case 'LOCKED':
      return {
        label: 'Locked',
        className: 'bg-[#f4f5fc] border-[#e8ebf8] text-[#9ea8c6]',
      }
    default:
      return {
        label: 'Open',
        className:
          'bg-[rgba(112,125,255,0.07)] border-[rgba(112,125,255,0.18)] text-[#707dff]',
      }
  }
}

function StatusDot({ row }: { row: JourneyRow }) {
  return (
    <span className="flex items-center justify-center">
      <RowIcon state={row.state} isActive={false} />
    </span>
  )
}

function MilestoneCard({ row }: { row: JourneyRow }) {
  const pill = statusPill(row.state)
  const locked = row.state === 'LOCKED'
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="font-heading font-bold text-[15px] leading-[22px] text-[#1e2145]">
          {row.label}
        </p>
        {row.state !== 'DEFAULT' && (
          <span
            className={`inline-flex items-center rounded-[7px] border px-[9px] py-[2px] text-[11px] font-bold leading-[16px] whitespace-nowrap shrink-0 ${pill.className}`}
          >
            {pill.label}
          </span>
        )}
      </div>
      <p className="font-sans font-medium text-[12.5px] leading-[19px] text-[#8a93b4]">
        {MILESTONE_DESCRIPTIONS[row.slug] ?? row.sublabel ?? ''}
      </p>
    </>
  )

  if (locked) {
    return (
      <div className="bg-white border border-[#eceef8] rounded-[14px] p-5 flex flex-col gap-2 opacity-70 cursor-not-allowed flex-1 min-w-0">
        {body}
      </div>
    )
  }

  return (
    <Link
      href={`/student/milestone/${row.slug}`}
      className="bg-white border border-[#eceef8] rounded-[14px] p-5 flex flex-col gap-2 flex-1 min-w-0 shadow-[0_2px_12px_rgba(30,58,138,0.06)] hover:border-[#707dff] hover:shadow-[0_8px_24px_rgba(112,125,255,0.16)] hover:-translate-y-0.5 transition-all"
    >
      {body}
    </Link>
  )
}

export default async function MilestonePage() {
  const session = await getServerSession(authOptions)

  const res = await getMyWorkspace(+session.user.id)
  const workspace = res.success && res.payload ? res.payload : null
  if (!workspace) notFound()

  const phases = (['CAPSTONE 1', 'CAPSTONE 2'] as const).map((header) => ({
    header,
    rows: workspace.journey.filter((r) => r.header === header),
  }))

  return (
    <section className="h-full flex min-h-0">
      <JoinedToast message="You've joined your section." />

      <div className="flex-1 min-w-0 flex flex-col min-h-0">
        <div className="flex-1 min-h-0 overflow-y-auto p-8">
          <div className="min-h-full">
            <div className="z-0 flex min-w-0 flex-col gap-4">
              <div className="relative flex min-w-0 flex-col gap-4">
                {/* One continuous progress line */}
                <div
                  aria-hidden
                  className="absolute left-0 top-0 bottom-0 w-[30px] rounded-full bg-white"
                />

                {phases.map(({ header, rows }) => (
                  <div key={header} className="flex flex-col gap-4">
                    {/* Capstone header — checkered finish-line treatment, aligned with the cards */}
                    <div className="flex w-full bg-[#eef0f6]">
                      <p className="flex items-center py-2 font-heading p-12 font-bold text-[15px] leading-[22px] text-[#1e2145]">
                        {header === 'CAPSTONE 1' ? 'Capstone 1' : 'Capstone 2'}
                      </p>
                    </div>

                    <div className="relative flex flex-col gap-4">
                      {rows.map((row) => (
                        <div
                          key={row.slug}
                          className="relative z-10 flex items-start gap-4"
                        >
                          {/* Icon column */}
                          <div className="flex w-[30px] shrink-0 justify-center pt-5">
                            <StatusDot row={row} />
                          </div>

                          {/* Card */}
                          <MilestoneCard row={row} />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
