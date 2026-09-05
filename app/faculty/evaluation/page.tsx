import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { roleHome } from '@/lib/helper'

export default async function EvaluationLegacyRedirect() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login')
  // Preserve adviser guard for legacy path — non-advisers are bounced to home.
  if (!session.user.isAdviser) redirect(roleHome(session.user.role))
  redirect('/faculty/document-review')
}
