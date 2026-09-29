import { Users } from 'lucide-react'
import type { FacultyCapacity } from '@/lib/actions/chair-dashboard'
import { ChairBar, ChairCard, ChairLabel, ChairStat } from '@/components/chair/ChairCard'

const ADVISERS = '/faculty/faculty-management/advisers'

const BUCKET_COLORS = {
  available: '#22c55e',
  loaded: '#f59e0b',
  fullLoad: '#ef4444',
} as const

/**
 * Faculty Capacity — how many advisers hold how many groups.
 *
 * Bars are sized against the adviser total, not the cap, matching the Figma
 * ("8 / 24"). Bucket thresholds come from ADVISER_CAP (8), not the mock's 5, so
 * the figures agree with the advisers table.
 */
export function ChairFacultyCapacityCard({
  data,
  message,
}: {
  data: FacultyCapacity | null
  message?: string
}) {
  const total = data?.totalAdvisers ?? 0

  return (
    <ChairCard icon={Users} title="Faculty Capacity Overview" href={ADVISERS}>
      {!data ? (
        <p className="px-[20px] pb-[18px] font-sans font-medium text-[11.5px] leading-[17px] text-[#9ea8c6]">
          {message ?? 'Capacity data unavailable.'}
        </p>
      ) : (
        <div className="grid grid-cols-[minmax(0,110px)_minmax(0,1fr)] gap-[16px] px-[20px] pb-[18px]">
          <ChairStat value={total} label="Total Advisers" href={ADVISERS} />

          <div className="flex flex-col gap-[9px] min-w-0">
            <ChairLabel>Capacity Distribution</ChairLabel>
            <ChairBar
              label="Available"
              count={data.available}
              total={total}
              color={BUCKET_COLORS.available}
              href={`${ADVISERS}?capacity=available`}
            />
            <ChairBar
              label="Loaded"
              count={data.loaded}
              total={total}
              color={BUCKET_COLORS.loaded}
              href={`${ADVISERS}?capacity=loaded`}
            />
            <ChairBar
              label="Full Load"
              count={data.fullLoad}
              total={total}
              color={BUCKET_COLORS.fullLoad}
              href={`${ADVISERS}?capacity=full`}
            />
          </div>
        </div>
      )}
    </ChairCard>
  )
}
