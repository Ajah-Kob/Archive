import AuthSplitLayout from '@/components/auth/AuthSplitLayout'
import { AuthCardFooter } from '@/components/auth/AuthCardFooter'
import FormSignup from '@/components/forms/FormSignup'

export default function Signup() {
  return (
    <AuthSplitLayout
      footer={
        <AuthCardFooter
          text="Already have an account?"
          linkLabel="Login"
          href="/login"
        />
      }
    >
      <FormSignup className="w-full" />
    </AuthSplitLayout>
  )
}
