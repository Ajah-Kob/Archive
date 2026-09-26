import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { PageLabel } from '@/components/globals/PageLabel'
import { getCalendarFeed } from '@/lib/actions/calendar'
import { CalendarClient } from '@/components/calendar/CalendarClient'

import '@fullcalendar/react/skeleton.css'
import '@fullcalendar/react/themes/classic/theme.css'
import '@fullcalendar/react/themes/classic/palette.css'
import './calendar.css'

export default async function CalendarPage() {
  const res = await getCalendarFeed()
  const events = res.success && res.payload ? res.payload : []
  // An empty message is the expected prerender path (the session read rejects
  // by design and the real payload streams per request) — only surface a
  // genuine failure so an outage is never mistaken for "no events".
  const loadError = !res.success && res.message ? res.message : null

  // Client-side UI gating only — /calendar is all-except-guest in proxy.ts,
  // enforcement lives in the server action's role scoping (plus
  // requireAdminOrProgramChair on mutations).
  const session = await getServerSession(authOptions)
  const role = session?.user?.role as string | undefined
  const canManage =
    role === 'SUPERADMIN' ||
    role === 'ADMIN' ||
    session?.user?.isProgramChair === true

  return (
    <section className="h-full flex flex-col">
      <PageLabel label="Calendar" />
      <CalendarClient events={events} canManage={canManage} loadError={loadError} />
    </section>
  )
}
