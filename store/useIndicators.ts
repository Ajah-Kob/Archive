import { create } from 'zustand'

type IndicatorsState = {
  /** Bumped after any mutation that can change indicator counts. */
  version: number
  bump: () => void
  /**
   * Per-badge baselines for seen-semantics: opening a section records the
   * count at open; the badge reappears only when the count rises above it.
   * In-memory only (never persisted) — persisting would desync SSR markup
   * from the hydrated client and trip hydration errors.
   */
  seen: Record<string, number>
  markSeen: (key: string, count: number) => void
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
  seen: {},
  // Returns the existing state untouched when the baseline is unchanged.
  // Without this, every markSeen call notifies subscribers even for an
  // identical value, and the re-baseline effects that run on every
  // seen-change re-fire forever (maximum update depth exceeded).
  markSeen: (key, count) =>
    set((state) =>
      state.seen[key] === count
        ? state
        : { seen: { ...state.seen, [key]: count } },
    ),
}))
