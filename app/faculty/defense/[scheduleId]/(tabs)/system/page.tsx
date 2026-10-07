import { notFound } from 'next/navigation'
import { DefenseSessionTabPanel } from '@/components/defense/DefenseSessionTabs'
import { SystemTabPanel } from '@/components/defense/system/SystemTabPanel'
import type { PanelistSystemComment } from '@/components/defense/system/SystemCommentsCard'
import { getSession } from '@/lib/actions/guard'
import {
  getSystemLinkComments,
  getSystemLinksForPanelist,
} from '@/lib/actions/system-links'

export default async function DefenseSystemTabPage({
  params,
}: {
  params: Promise<{ scheduleId: string }>
}) {
  const { scheduleId } = await params
  const id = parseInt(scheduleId, 10)
  if (!Number.isInteger(id)) notFound()

  // The action re-asserts panelist membership scoped to this schedule, so a
  // panelist on another defense cannot read these links by guessing the id.
  // notFound() rather than an error message: an unauthorized reader learns
  // nothing about whether the schedule exists.
  const linksRes = await getSystemLinksForPanelist(id)
  if (!linksRes.success) notFound()
  const links = linksRes.payload?.links ?? []

  // Drives which comments show a delete button. Read here rather than in the
  // action so the card can render the button without a second round trip.
  const session = await getSession()
  const currentUserId = session?.user?.id ? +session.user.id : 0

  // One thread query per link, in parallel. The thread query is tiny, and this
  // keeps the link payload free of nested comments nobody has opened yet.
  const threads = await Promise.all(
    links.map((link) => getSystemLinkComments(link.id)),
  )

  const commentsByLink: Record<number, PanelistSystemComment[]> = {}
  links.forEach((link, i) => {
    const res = threads[i]
    commentsByLink[link.id] = res.success
      ? ((res.payload?.comments ?? []) as unknown as PanelistSystemComment[])
      : []
  })

  return (
    <DefenseSessionTabPanel value="system">
      <SystemTabPanel
        links={links}
        commentsByLink={commentsByLink}
        currentUserId={currentUserId}
      />
    </DefenseSessionTabPanel>
  )
}