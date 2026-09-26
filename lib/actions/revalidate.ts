import { revalidatePath, revalidateTag } from 'next/cache'

/**
 * Busts the calendar feed: the 'calendar' cacheTag covers the 'use cache'
 * readers in lib/actions/calendar.ts (defense + manual event sources), and
 * revalidatePath covers the /calendar route itself.
 *
 * Lives here — not in calendar.ts — so the invalidation graph has a single
 * owner. revalidateFeature('defense') calls it, which means every existing
 * defense write invalidates the calendar without touching those call sites.
 */
export function revalidateCalendarCache() {
  revalidateTag('calendar', 'max')
  revalidatePath('/calendar')
}

// Revalidates the paths that render a given feature. Sections and Templates
// are duplicated under both the /admin and /faculty role roots, so both
// canonical paths must be invalidated after a mutation.
export function revalidateFeature(feature: 'sections' | 'templates' | 'faculties' | 'users' | 'defense' | 'archiving' | 'archives' | 'calendar' | 'audit') {
  switch (feature) {
    case 'sections':
      revalidatePath('/admin/sections')
      revalidatePath('/faculty/section-management')
      break
    case 'templates':
      revalidatePath('/admin/templates')
      revalidatePath('/faculty/templates')
      break
    case 'faculties':
      revalidatePath('/faculty/faculty-management/members')
      revalidatePath('/faculty/faculty-management/advisers')
      revalidatePath('/faculty/faculty-management/coordinators')
      break
    case 'users':
      revalidatePath('/admin/users')
      break
    case 'defense':
      revalidatePath('/faculty/defense-scheduling')
      // The calendar feed merges DefenseSchedule rows through a 'use cache'
      // reader, so a schedule/reschedule/verdict write must also bust it —
      // otherwise /calendar serves the old schedule indefinitely.
      revalidateCalendarCache()
      break
    case 'archiving':
      revalidatePath('/student/milestone/archiving')
      revalidatePath('/faculty/archiving')
      revalidatePath('/repository')
      break
    case 'archives':
      revalidatePath('/repository')
      revalidatePath('/faculty/archiving')
      break
    case 'calendar':
      revalidateCalendarCache()
      break
    case 'audit':
      revalidatePath('/admin/audit')
      break
  }
}