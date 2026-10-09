import { create } from 'zustand'

type IndicatorsState = {
  /** Bumped after any mutation that can change indicator counts. */
  version: number
  bump: () => void
}

/**
 * Refresh trigger for indicator counts.
 *
 * Server-side revalidation (revalidateTag) busts the cached read, but the
 * sidebar and tab badges live in client components that only re-fetch when
 * told to — a busted cache nobody re-reads still shows stale numbers. Any
 * mutation that changes a count calls bump() alongside its revalidateTag so
 * live badges re-fetch on the next render. Pathname changes refresh
 * separately in the hook, so this covers in-place mutations only.
 */
export const useIndicators = create<IndicatorsState>()((set) => ({
  version: 0,
  bump: () => set((state) => ({ version: state.version + 1 })),
}))
