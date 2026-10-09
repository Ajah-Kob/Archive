'use client'

import { useCallback, useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { getIndicatorCounts, type IndicatorCounts } from '@/lib/actions/indicators'
import { useIndicators } from '@/store/useIndicators'

/**
 * Badge counts for the sidebar and tab bars.
 *
 * Re-fetches on mount, on every navigation (the Aside persists across route
 * changes within a layout, so mount-only would go stale), and whenever a
 * mutation bumps the indicators store. Signed-out visitors get null and
 * render no badges. Fetch failures are silent — a missing badge beats a
 * broken sidebar.
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

  return counts
}
