import Authentication from '@/templates/Authentication'
import { AuthCardSkeleton } from '@/components/auth/AuthCardSkeleton'

export default function SignupLoading() {
  return (
    <Authentication>
      <AuthCardSkeleton fields={4} />
    </Authentication>
  )
}
