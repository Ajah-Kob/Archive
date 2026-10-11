import { notFound, redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { getMyWorkspace } from '@/lib/actions/groups'
import { WORKSPACE_SLUGS } from '@/types/milestones'

interface MilestoneLayoutProps {
  children: React.ReactNode
  params: Promise<{ milestone: string }>
}

/**
 * Shared layout for /student/milestone/[milestone].
 * Passthrough — defense tabs have their own persistent layout via (defense)/layout.tsx
 * (CapstoneJourney + MilestoneDefenseHeader) so the workspace at [documentId] does not
 * get the journey. Non-defense pages render their own journey inside the page.
 *
 * Topic gate: a group without a topic cannot open any specific milestone —
 * send them back to the overview, which shows the dim + Set topic gate.
 */
export default async function MilestoneLayout({ children, params }: MilestoneLayoutProps) {
  const { milestone } = await params
  if (!WORKSPACE_SLUGS.includes(milestone)) notFound()

  const session = await getServerSession(authOptions)
  if (session?.user?.id) {
    const res = await getMyWorkspace(+session.user.id)
    const workspace = res.success && res.payload ? res.payload : null
    if (workspace && !(workspace as any).group?.finalTopic) {
      redirect('/student/milestone')
    }
  }

  return <>{children}</>
}
