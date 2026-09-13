import AuthSplitLayout from '@/components/auth/AuthSplitLayout'
import { AuthCardFooter } from '@/components/auth/AuthCardFooter'
import FormLogin from '@/components/forms/FormLogin'
import { RedirectIfAuthed } from '@/components/auth/RedirectIfAuthed'

export default function Login() {
  return (
    <AuthSplitLayout
      heading1="Where Capstone"
      heading2="Work Comes Together."
      subtext="ARCHIVE unifies submission, review, and milestone tracking in one organized platform — for students and faculty alike."
      footer={
        <AuthCardFooter
          text="Don't have an account?"
          linkLabel="Sign Up"
          href="/signup"
        />
      }
    >
      {/* Authenticated visitors are bounced back to their previous route. */}
      <RedirectIfAuthed />
      <FormLogin className="w-full" />
    </AuthSplitLayout>
  )
}
