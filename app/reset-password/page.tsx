import AuthSplitLayout from '@/components/auth/AuthSplitLayout'
import FormResetPassword from '@/components/forms/FormResetPassword'

export default function ResetPassword() {
  return (
    <AuthSplitLayout
      footer={
        <div className="mt-2 text-center text-sm text-slate-500 font-medium">
          <a
            href="/login"
            className="font-medium text-indigo-400 hover:text-indigo-500 transition-colors"
          >
            Back to login
          </a>
        </div>
      }
    >
      <FormResetPassword className="w-full" />
    </AuthSplitLayout>
  )
}
