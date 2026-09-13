import Authentication from '@/templates/Authentication'
import { AuthCardSkeleton } from '@/components/auth/AuthCardSkeleton'

export default function ForgotPasswordLoading() {
  return (
    <Authentication>
      <AuthCardSkeleton fields={1} />
    </Authentication>
  )
}
