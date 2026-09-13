import Authentication from '@/templates/Authentication'
import { AuthCardSkeleton } from '@/components/auth/AuthCardSkeleton'

export default function ResetPasswordLoading() {
  return (
    <Authentication>
      <AuthCardSkeleton fields={2} />
    </Authentication>
  )
}
