import { Flag } from 'lucide-react'
import type { SectionPhaseSpread } from '@/lib/actions/chair-dashboard'
import { ChairBar, ChairCard } from '@/components/chair/ChairCard'

const SECTION_MGMT = '/faculty/section-management'

const PHASE_COLORS = {
  capstone1: '#707dff',
  capstone2: '#22c55e',
} as const

/**
 * Section Phase Spread — how far the program has advanced.
 *
 * A section counts as Capstone 2 once its capstone2OpenedAt is set. Everything
 * else, including sections that have not started, is Capstone 1: the gate is
 * closed rather than absent, so there is no third bucket to invent.
 */
export function ChairSectionPhaseCard({
  data,
  message,
}: {
  data: SectionPhaseSpread | null
  message?: string
}) {
  const total = data?.total ?? 0

  return (
    <ChairCard icon={Flag} title="Section Phase Spread" href={SECTION_MGMT}>
      {!data ? (
        <p className="px-[20px] pb-[18px] font-sans font-medium text-[11.5px] leading-[17px] text-[#9ea8c6]">
          {message ?? 'Phase data unavailable.'}
        </p>
      ) : (
        <div className="flex flex-col gap-[9px] px-[20px] pb-[18px]">
          <ChairBar
            label="Capstone 1"
            count={data.capstone1}
            total={total}
            color={PHASE_COLORS.capstone1}
            href={`${SECTION_MGMT}?phase=capstone1`}
          />
          <ChairBar
            label="Capstone 2"
            count={data.capstone2}
            total={total}
            color={PHASE_COLORS.capstone2}
            href={`${SECTION_MGMT}?phase=capstone2`}
          />
        </div>
      )}
    </ChairCard>
  )
}
