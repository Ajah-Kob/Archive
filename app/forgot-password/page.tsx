import AuthSplitLayout from '@/components/auth/AuthSplitLayout'
import FormForgotPassword from '@/components/forms/FormForgotPassword'

export default function ForgotPassword() {
  return (
    <AuthSplitLayout
      footer={
        <div className="mt-2 text-center text-sm text-slate-500 font-medium">
          Remembered it?{' '}
          <a
            href="/login"
            className="font-medium text-indigo-400 hover:text-indigo-500 transition-colors"
          >
            Sign in
          </a>
        </div>
      }
    >
      <FormForgotPassword className="w-full" />
    </AuthSplitLayout>
  )
}
