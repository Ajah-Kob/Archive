'use client'

import { useCallback, useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useRef } from 'react'
import { getIndicatorCounts, type IndicatorCounts } from '@/lib/actions/indicators'
import { isBadgeVisible } from '@/lib/indicators'
import { useIndicators } from '@/store/useIndicators'

/**
 * Badge counts for the sidebar and tab bars.
 *
 * Re-fetches on mount, on every navigation (the Aside persists across route
 * changes within a layout, so mount-only would go stale), when the tab
 * regains focus or visibility (cheap catch-all for mutations made in another
 * tab), and whenever a mutation bumps the indicators store. Signed-out
 * visitors get null and render no badges. Fetch failures are silent — a
 * missing badge beats a broken sidebar.
 */
export function useIndicatorCounts(): IndicatorCounts | null {
  const [counts, setCounts] = useState<IndicatorCounts | null>(null)
  const version = useIndicators((state) => state.version)
  const pathname = usePathname()

  const load = useCallback(async () => {
    const res = await getIndicatorCounts()
    if (res.success && res.payload) setCounts(res.payload)
  }, [])

  useEffect(() => {
    load()
  }, [load, pathname, version])

  useEffect(() => {
    const refresh = () => load()
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [load])

  return counts
}

/**
 * One badge's display count under seen-semantics. Call once per badge with
 * a stable key (sidebar count keys; schedule- or milestone-scoped `tab:*`
 * keys for tabs) and whether its section is currently open.
 *
 * - Opening (mount-open or switched-in) records the current count as the
 *   baseline, hiding the badge until the count rises above it.
 * - A count dropping at/below baseline re-baselines downward, so work
 *   resolved elsewhere never leaves a stale baseline behind.
 * - No key (scope unknown) falls back to the raw count.
 */
export function useSuppressedCount(
  key: string | undefined,
  count: number,
  active: boolean,
): number {
  const seen = useIndicators((state) => (key ? state.seen[key] : undefined))
  const markSeen = useIndicators((state) => state.markSeen)
  const wasActive = useRef(false)

  useEffect(() => {
    if (key != null && seen != null && count < seen) markSeen(key, count)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, count, seen])

  useEffect(() => {
    if (active && key != null && !wasActive.current) markSeen(key, count)
    wasActive.current = active
    // count intentionally excluded: a rise while viewing must show, not hide.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, key])

  if (key == null) return count
  return isBadgeVisible(count, seen) ? count : 0
}
