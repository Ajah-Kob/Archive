import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { roleHome } from '@/lib/helper'

export default async function EvaluationSubmissionLegacyRedirect({
  params,
}: {
  params: Promise<{ submissionId: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login')
  if (!session.user.isAdviser) redirect(roleHome(session.user.role))
  const { submissionId } = await params
  redirect(`/faculty/document-review/${submissionId}`)
}
