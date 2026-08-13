import AuthSplitLayout from '@/components/auth/AuthSplitLayout'
import FormSignup from '@/components/forms/FormSignup'

export default function Signup() {
  return (
    <AuthSplitLayout
      heading1="Start Your"
      heading2="Capstone Journey Today."
      subtext="Join ARCHIVE to collaborate seamlessly, track vital project milestones, and manage your academic submissions efficiently."
    >
      <FormSignup className="w-full" />
    </AuthSplitLayout>
  )
}
