import { notFound } from 'next/navigation'
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
 */
export default async function MilestoneLayout({ children, params }: MilestoneLayoutProps) {
  const { milestone } = await params
  if (!WORKSPACE_SLUGS.includes(milestone)) notFound()
  return <>{children}</>
}
