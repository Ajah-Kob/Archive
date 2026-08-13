import AuthSplitLayout from '@/components/auth/AuthSplitLayout'
import FormLogin from '@/components/forms/FormLogin'

export default function Login() {
  return (
    <AuthSplitLayout
      heading1="Where Capstone"
      heading2="Work Comes Together."
      subtext="ARCHIVE unifies submission, review, and milestone tracking in one organized platform — for students and faculty alike."
    >
      <FormLogin className="w-full" />
    </AuthSplitLayout>
  )
}
