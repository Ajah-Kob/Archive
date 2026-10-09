/**
 * Seen-semantics visibility rule, single-sourced for every badge consumer
 * (sidebar, tabs). A badge shows only while its count sits above the
 * baseline recorded when its section was last opened:
 *
 * - never visited (no baseline) → everything positive shows;
 * - opened (baseline = count at open) → hidden until the count rises;
 * - work resolved elsewhere (count drops at/below baseline) → re-baselined
 *   by the caller, stays hidden.
 *
 * Zero or negative never shows. Pure — unit-tested in indicators.test.ts.
 */
export function isBadgeVisible(count: number, seen: number | undefined): boolean {
  if (!count || count <= 0) return false
  return count > (seen ?? -1)
}
