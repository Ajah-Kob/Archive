import Link from 'next/link'
import Authentication from '@/templates/Authentication'
import FormForgotPassword from '@/components/forms/FormForgotPassword'

export default function ForgotPassword() {
  return (
    <Authentication>
      <main className="w-full max-w-[420px] flex flex-col gap-5 items-center relative z-10">
        <div className="w-full p-6 md:p-8 rounded-3xl bg-[#ffffff] shadow-[0px_4px_24px_0px_rgba(0,0,0,0.03),0px_20px_60px_-4px_rgba(112,125,255,0.16),0px_0px_0px_1px_rgba(112,125,255,0.06)] flex flex-col gap-5">
          <FormForgotPassword className="w-full" />
        </div>

        <div className="mt-2 text-center text-sm text-slate-500 font-medium">
          Remembered it?{' '}
          <Link
            href="/login"
            className="font-medium text-indigo-400 hover:text-indigo-500 transition-colors"
          >
            Sign in
          </Link>
        </div>
      </main>
    </Authentication>
  )
}
